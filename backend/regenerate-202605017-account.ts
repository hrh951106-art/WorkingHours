import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 获取字段值的显示标签
 */
async function getFieldLabel(prisma: PrismaClient, fieldCode: string, value: string): Promise<string> {
  try {
    const customField = await prisma.customField.findUnique({
      where: { code: fieldCode },
      include: {
        dataSource: {
          include: {
            options: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!customField || !customField.dataSource) {
      return value;
    }

    const option = customField.dataSource.options.find((opt: any) => opt.value === value);
    return option?.label || value;
  } catch (error) {
    console.error(`获取字段标签失败: ${fieldCode} = ${value}`, error);
    return value;
  }
}

/**
 * 为202605017重新生成主劳动力账户
 * 验证Level 6-7是否正确显示
 */
async function regenerateAccount() {
  const employeeNo = '202605017';

  console.log('=== 为202605017重新生成主劳动力账户 ===\n');

  // 1. 查找员工
  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
    select: { id: true, name: true },
  });

  if (!employee) {
    console.log('❌ 员工不存在');
    await prisma.$disconnect();
    return;
  }

  console.log(`员工: ${employee.name} (${employeeNo}), ID: ${employee.id}\n`);

  // 2. 获取最新WorkInfoHistory
  const latestWorkInfo = await prisma.workInfoHistory.findFirst({
    where: {
      employeeId: employee.id,
      isCurrent: true,
    },
    select: {
      id: true,
      effectiveDate: true,
      position: true,
      jobLevel: true,
    },
  });

  if (!latestWorkInfo) {
    console.log('❌ 未找到WorkInfoHistory');
    await prisma.$disconnect();
    return;
  }

  console.log('最新WorkInfoHistory:');
  console.log(`  生效日期: ${latestWorkInfo.effectiveDate.toISOString().substring(0, 10)}`);
  console.log(`  职位: ${latestWorkInfo.position}`);
  console.log(`  职级: ${latestWorkInfo.jobLevel}`);
  console.log('');

  // 3. 检查是否已有匹配effectiveDate的账户
  const existingAccount = await prisma.laborAccount.findFirst({
    where: {
      employeeId: employee.id,
      type: 'MAIN',
      effectiveDate: latestWorkInfo.effectiveDate,
    },
  });

  if (existingAccount) {
    console.log('⚠️ 已存在匹配的账户:');
    console.log(`  账户ID: ${existingAccount.id}`);
    console.log(`  状态: ${existingAccount.status}`);
    console.log(`  路径: ${existingAccount.path}`);
    console.log('');

    // 显示层级值
    if (existingAccount.hierarchyValues) {
      try {
        const hv = JSON.parse(existingAccount.hierarchyValues);
        console.log('层级值:');
        hv.forEach((level: any) => {
          const hasValue = level.selectedValue ? '✅' : '❌';
          const code = level.selectedValue?.code || 'NULL';
          console.log(`  ${hasValue} Level ${level.level}: ${code}`);
        });
      } catch (e) {
        console.log('  解析hierarchyValues失败');
      }
    }

    console.log('');
    console.log('更新该账户的层级值...');

    // 解析员工自定义字段
    const emp = await prisma.employee.findUnique({
      where: { id: employee.id },
      select: { customFields: true },
    });

    const customFields = typeof emp?.customFields === 'string'
      ? JSON.parse(emp.customFields)
      : emp?.customFields || {};

    // 合并WorkInfoHistory字段
    if (latestWorkInfo.position && !customFields.position) {
      customFields.position = latestWorkInfo.position;
    }
    if (latestWorkInfo.jobLevel && !customFields.jobLevel) {
      customFields.jobLevel = latestWorkInfo.jobLevel;
    }

    console.log('合并后的customFields:', customFields);

    // 获取层级配置
    const hierarchyConfigs = await prisma.accountHierarchyConfig.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ level: 'asc' }, { sort: 'asc' }],
    });

    // 构建层级值和路径
    const hierarchyValues: any[] = [];
    const pathParts: string[] = [];
    const namePathParts: string[] = [];

    for (const config of hierarchyConfigs) {
      const cleanMappingType = config.mappingType.replace(/\s+/g, '');
      let accountCode: string;
      let accountName: string;

      if (cleanMappingType === 'ORG' || cleanMappingType === 'ORG_TYPE') {
        // 组织映射，从原路径获取
        const pathSegments = existingAccount.path.split('/');
        accountCode = pathSegments[config.level - 1] || '-';
        const nameSegments = existingAccount.namePath?.split('/') || [];
        accountName = nameSegments[config.level - 1] || '-';
      } else if (cleanMappingType.startsWith('FIELD_')) {
        // 字段映射
        const fieldCode = config.mappingType.replace('FIELD_', '');
        const customFieldValue = customFields[fieldCode];

        if (customFieldValue) {
          accountCode = customFieldValue;
          // 调用getFieldLabel获取显示名称
          accountName = await getFieldLabel(prisma, fieldCode, customFieldValue);
        } else {
          accountCode = '-';
          accountName = '-';
        }
      } else {
        accountCode = '-';
        accountName = '-';
      }

      pathParts.push(accountCode);
      namePathParts.push(accountName);

      const levelValue = {
        level: config.level,
        name: config.name,
        selectedValue: accountCode !== '-' ? {
          code: accountCode,
          name: accountName,
          value: accountCode,
        } : null,
        selectedValueLabel: accountName !== '-' ? accountName : null,
      };
      hierarchyValues.push(levelValue);
    }

    const newPath = pathParts.join('/');
    const newNamePath = namePathParts.join('/');

    console.log('新路径:', newPath);
    console.log('新名称路径:', newNamePath);

    // 更新账户
    const updated = await prisma.laborAccount.update({
      where: { id: existingAccount.id },
      data: {
        path: newPath,
        namePath: newNamePath,
        hierarchyValues: JSON.stringify(hierarchyValues),
        status: 'ACTIVE',
        expiryDate: null,
      },
    });

    console.log('✅ 账户已更新');
    console.log(`  账户ID: ${updated.id}`);
    console.log(`  状态: ${updated.status}`);
  } else {
    console.log('ℹ️ 未找到匹配的账户，需要重新生成');
    console.log('');
    console.log('请使用以下API重新生成账户:');
    console.log(`POST /api/accounts/regenerate/${employee.id}`);
  }

  await prisma.$disconnect();
}

regenerateAccount()
  .then(() => {
    console.log('\n操作完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('操作失败:', error);
    process.exit(1);
  });
