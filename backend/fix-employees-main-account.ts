import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 修复员工主劳动力账户的层级值
 * 该脚本会重新生成指定员工的主账户，确保岗位和职级层级正确填充
 */

async function fixEmployeeMainAccount(employeeNo: string) {
  console.log(`\n========== 修复员工 ${employeeNo} 的主账户 ==========`);

  // 1. 获取员工信息
  const employee = await prisma.employee.findUnique({
    where: { employeeNo },
    include: { org: true }
  });

  if (!employee) {
    console.log(`❌ 员工 ${employeeNo} 不存在`);
    return;
  }

  console.log(`员工: ${employee.name} (${employee.employeeNo})`);
  console.log(`组织: ${employee.org?.name}`);

  // 2. 获取当前工作信息
  const workInfoHistory = await prisma.workInfoHistory.findFirst({
    where: {
      employeeId: employee.id,
      isCurrent: true
    }
  });

  if (!workInfoHistory) {
    console.log(`❌ 未找到当前工作信息`);
    return;
  }

  console.log(`\n当前工作信息:`);
  console.log(`  岗位: ${workInfoHistory.position || '-'}`);
  console.log(`  职级: ${workInfoHistory.jobLevel || '-'}`);

  // 3. 获取层级配置
  const hierarchyConfigs = await prisma.accountHierarchyConfig.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { level: 'asc' }
  });

  console.log(`\n找到 ${hierarchyConfigs.length} 个层级配置`);

  // 4. 构建customFields对象
  const customFields: any = {};

  // 合并Employee表的customFields
  if (employee.customFields) {
    try {
      const employeeCustomFields = typeof employee.customFields === 'string'
        ? JSON.parse(employee.customFields)
        : employee.customFields;
      Object.assign(customFields, employeeCustomFields);
    } catch (e) {
      console.error('解析员工customFields失败:', e);
    }
  }

  // 合并工作信息的customFields
  if (workInfoHistory.customFields) {
    try {
      const workInfoCustomFields = typeof workInfoHistory.customFields === 'string'
        ? JSON.parse(workInfoHistory.customFields)
        : workInfoHistory.customFields || {};
      Object.assign(customFields, workInfoCustomFields);
    } catch (e) {
      console.error('解析工作信息customFields失败:', e);
    }
  }

  // 合并WorkInfoHistory的独立字段（这是修复的关键！）
  const workInfoFields = {
    position: workInfoHistory.position,
    jobLevel: workInfoHistory.jobLevel,
    employeeType: workInfoHistory.employeeType,
    workLocation: workInfoHistory.workLocation,
    workAddress: workInfoHistory.workAddress,
    costCenter: workInfoHistory.costCenter,
    employmentRelation: workInfoHistory.employmentRelation,
  };

  for (const [fieldCode, fieldValue] of Object.entries(workInfoFields)) {
    if (fieldValue && !customFields[fieldCode]) {
      customFields[fieldCode] = fieldValue;
      console.log(`  合并字段: ${fieldCode} = ${fieldValue}`);
    }
  }

  // 5. 查找现有主账户
  const existingMainAccount = await prisma.laborAccount.findFirst({
    where: {
      employeeId: employee.id,
      type: 'MAIN'
    }
  });

  if (existingMainAccount) {
    console.log(`\n更新现有主账户: ${existingMainAccount.code} (${existingMainAccount.name})`);
  } else {
    console.log(`\n创建新主账户...`);
  }

  // 6. 生成新的主账户
  console.log(`\n开始生成新的主账户...`);

  const hierarchyValues: any[] = [];
  const pathParts: string[] = [];
  const namePathParts: string[] = [];

  for (const config of hierarchyConfigs) {
    let selectedValue = null;
    let accountCode = '-';
    let accountName = '-';

    const cleanMappingType = config.mappingType ? config.mappingType.replace(/\s+/g, '') : '';

    // 处理字段映射（包括岗位position和职级jobLevel）
    if (cleanMappingType.startsWith('FIELD_')) {
      const fieldCode = config.mappingType.replace('FIELD_', '');
      const customFieldValue = customFields[fieldCode];

      if (customFieldValue) {
        accountCode = customFieldValue;
        accountName = await getFieldLabel(prisma, fieldCode, customFieldValue);
        selectedValue = {
          name: accountName,
          code: accountCode,
          value: customFieldValue,
        };
        console.log(`层级${config.level} (${config.name}): ${accountName} (${accountCode})`);
      } else {
        console.log(`层级${config.level} (${config.name}): 无值`);
      }
    } else if (cleanMappingType === 'ORG' || cleanMappingType === 'ORG_TYPE') {
      // 处理组织映射
      if (config.mappingValue) {
        accountCode = await findOrgByType(prisma, employee.orgId, config.mappingValue);
        const org = await findOrgObjectByType(prisma, employee.orgId, config.mappingValue);
        if (org) {
          accountName = org.name;
          selectedValue = {
            id: org.id,
            name: org.name,
            code: org.code,
            type: org.type,
          };
        }
        console.log(`层级${config.level} (${config.name}): ${accountName} (${accountCode})`);
      }
    }

    pathParts.push(accountCode);
    namePathParts.push(accountName);

    hierarchyValues.push({
      level: config.level,
      selectedValue,
      selectedValueLabel: accountName,
    });
  }

  // 7. 更新或创建主账户
  const mainAccountCode = existingMainAccount?.code || `MAIN-${employeeNo}`;
  const mainAccountName = existingMainAccount?.name || `${employee.name}的主账户`;

  const accountData = {
    code: mainAccountCode,
    name: mainAccountName,
    type: 'MAIN',
    level: hierarchyConfigs.length,
    path: pathParts.join('/'),
    namePath: namePathParts.join('/'),
    hierarchyValues: JSON.stringify(hierarchyValues),
    usageType: 'SHIFT',
    employeeId: employee.id,
    effectiveDate: employee.entryDate || new Date(),
    status: 'ACTIVE',
  };

  let updatedAccount;

  if (existingMainAccount) {
    // 更新现有账户
    updatedAccount = await prisma.laborAccount.update({
      where: { id: existingMainAccount.id },
      data: accountData
    });
    console.log(`\n✅ 主账户更新成功:`);
  } else {
    // 创建新账户
    updatedAccount = await prisma.laborAccount.create({
      data: accountData
    });
    console.log(`\n✅ 主账户创建成功:`);
  }

  console.log(`  账户代码: ${updatedAccount.code}`);
  console.log(`  账户名称: ${updatedAccount.name}`);
  console.log(`  路径: ${updatedAccount.path}`);
  console.log(`  名称路径: ${updatedAccount.namePath}`);

  // 8. 显示层级详情
  console.log(`\n层级详情:`);
  hierarchyValues.forEach((hv: any) => {
    const value = hv.selectedValue?.name || hv.selectedValue?.code || '-';
    console.log(`  层级${hv.level}: ${hv.selectedValueLabel || '-'} (${value})`);
  });
}

// 辅助函数���获取字段标签
async function getFieldLabel(prisma: PrismaClient, fieldCode: string, value: string): Promise<string> {
  try {
    // 查找字段对应的数据源
    const field = await prisma.employeeInfoTabField.findFirst({
      where: {
        fieldCode: fieldCode
      },
      select: {
        dataSourceId: true
      }
    });

    if (!field || !field.dataSourceId) {
      return value;
    }

    // 查找数据源选项
    const option = await prisma.dataSourceOption.findFirst({
      where: {
        dataSourceId: field.dataSourceId,
        value: value,
        isActive: true
      }
    });

    return option?.label || value;
  } catch (e) {
    console.error(`获取字段标签失败 (${fieldCode}, ${value}):`, e);
    return value;
  }
}

// 辅助函数：根据组织类型查找组织
async function findOrgByType(prisma: PrismaClient, orgId: number, orgType: string): Promise<string> {
  const org = await findOrgObjectByType(prisma, orgId, orgType);
  return org?.code || '-';
}

async function findOrgObjectByType(prisma: PrismaClient, orgId: number, orgType: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId }
  });

  if (!org) return null;

  // 根据类型查找
  if (org.type === orgType) {
    return org;
  }

  // 向上查找父组织
  let currentOrg = org;
  while (currentOrg.parentId) {
    currentOrg = await prisma.organization.findUnique({
      where: { id: currentOrg.parentId }
    });
    if (!currentOrg) break;

    if (currentOrg.type === orgType) {
      return currentOrg;
    }
  }

  return null;
}

async function main() {
  console.log('========== 修复员工主账户脚本 ==========');
  console.log('该脚本会重新生成指定员工的主劳动力账户，确保岗位和职级层级正确填充\n');

  const employeeNos = ['202605014'];

  for (const employeeNo of employeeNos) {
    try {
      await fixEmployeeMainAccount(employeeNo);
    } catch (error: any) {
      console.error(`❌ 修复员工 ${employeeNo} 失败:`, error.message);
    }
  }

  console.log('\n========== 修复完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
