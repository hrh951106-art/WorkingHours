import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 诊断为什么202605017的主劳动力账户只有前三层有值
 */
async function diagnoseHierarchyIssue() {
  const employeeNo = '202605017';

  console.log('=== 诊断202605017账户层级问题 ===\n');

  // 1. 查找员工
  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
    select: {
      id: true,
      name: true,
      customFields: true,
      org: true,
    },
  });

  if (!employee) {
    console.log('❌ 员工不存在');
    await prisma.$disconnect();
    return;
  }

  console.log(`员工: ${employee.name} (${employeeNo}), ID: ${employee.id}`);
  console.log(`组织: ${employee.org?.name} (ID: ${employee.org?.id})`);
  console.log(`自定义字段: ${JSON.stringify(employee.customFields)}`);
  console.log('');

  // 2. 获取WorkInfoHistory
  const workInfoHistory = await prisma.workInfoHistory.findFirst({
    where: {
      employeeId: employee.id,
      isCurrent: true,
    },
  });

  if (!workInfoHistory) {
    console.log('❌ 未找到WorkInfoHistory');
    await prisma.$disconnect();
    return;
  }

  console.log('WorkInfoHistory:');
  console.log(`  ID: ${workInfoHistory.id}`);
  console.log(`  生效日期: ${workInfoHistory.effectiveDate.toISOString().substring(0, 10)}`);
  console.log(`  职位: ${workInfoHistory.position || 'NULL'}`);
  console.log(`  职级: ${workInfoHistory.jobLevel || 'NULL'}`);
  console.log(`  员工类型: ${workInfoHistory.employeeType || 'NULL'}`);
  console.log(`  工作地点: ${workInfoHistory.workLocation || 'NULL'}`);
  console.log(`  成本中心: ${workInfoHistory.costCenter || 'NULL'}`);
  console.log(`  自定义字段: ${JSON.stringify(workInfoHistory.customFields)}`);
  console.log('');

  // 3. 获取层级配置
  const hierarchyConfigs = await prisma.accountHierarchyConfig.findMany({
    where: { status: 'ACTIVE' },
    orderBy: [{ level: 'asc' }, { sort: 'asc' }],
    select: {
      id: true,
      level: true,
      name: true,
      mappingType: true,
      mappingValue: true,
    },
  });

  console.log(`层级配置 (共${hierarchyConfigs.length}层):`);
  hierarchyConfigs.forEach((config) => {
    console.log(`  Level ${config.level}: ${config.name}`);
    console.log(`    映射类型: ${config.mappingType}`);
    console.log(`    映射值: ${config.mappingValue || 'NULL'}`);
  });
  console.log('');

  // 4. 分析每一层的数据来源
  console.log('层级值分析：\n');

  const customFields = typeof employee.customFields === 'string'
    ? JSON.parse(employee.customFields)
    : employee.customFields || {};

  // 合并WorkInfoHistory字段
  const mergedFields = { ...customFields };
  if (workInfoHistory.customFields) {
    const workInfoCustomFields = typeof workInfoHistory.customFields === 'string'
      ? JSON.parse(workInfoHistory.customFields)
      : workInfoHistory.customFields || {};
    Object.assign(mergedFields, workInfoCustomFields);
  }

  // 添加WorkInfoHistory的独立字段
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
    if (fieldValue && !mergedFields[fieldCode]) {
      mergedFields[fieldCode] = fieldValue;
    }
  }

  console.log('合并后的customFields:', JSON.stringify(mergedFields, null, 2));
  console.log('');

  // 5. 检查每一层应该取什么值
  for (const config of hierarchyConfigs) {
    console.log(`Level ${config.level} (${config.name}):`);
    console.log(`  映射类型: ${config.mappingType}`);

    const cleanMappingType = config.mappingType.replace(/\s+/g, '');

    if (cleanMappingType === 'ORG' || cleanMappingType === 'ORG_TYPE') {
      console.log(`  ✅ 组织映射 - 从员工组织树获取`);
    } else if (cleanMappingType.startsWith('FIELD_')) {
      const fieldCode = config.mappingType.replace('FIELD_', '');
      const fieldValue = mergedFields[fieldCode];
      console.log(`  字段: ${fieldCode}`);
      console.log(`  值: ${fieldValue || 'NULL'}`);

      if (!fieldValue) {
        console.log(`  ❌ 该字段在customFields或WorkInfoHistory中不存在或为空`);
      } else {
        console.log(`  ✅ 该字段有值`);
      }
    } else if (cleanMappingType === 'CONSTANT') {
      console.log(`  ✅ 常量映射 - 值: ${config.mappingValue}`);
    } else {
      console.log(`  ⚠️ 未知映射类型`);
    }
    console.log('');
  }

  // 6. 总结问题
  console.log('=== 问题总结 ===\n');
  console.log('当前路径: 苏州工厂/生产1车间/焊接班组/-/-/-/-');
  console.log('');
  console.log('只有前3层有值，后4层（Level 4-7）没有值的原因：');
  console.log('');

  hierarchyConfigs.forEach((config) => {
    if (config.level >= 4) {
      const cleanMappingType = config.mappingType.replace(/\s+/g, '');
      if (cleanMappingType.startsWith('FIELD_')) {
        const fieldCode = config.mappingType.replace('FIELD_', '');
        const fieldValue = mergedFields[fieldCode];
        console.log(`Level ${config.level} (${config.name}):`);
        console.log(`  映射字段: ${fieldCode}`);
        console.log(`  字段值: ${fieldValue || 'NULL'}`);
        console.log(`  原因: ${fieldValue ? '✅ 有值' : '❌ 字段为空或不存在'}`);
        console.log('');
      }
    }
  });

  await prisma.$disconnect();
}

diagnoseHierarchyIssue()
  .then(() => {
    console.log('\n诊断完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('诊断失败:', error);
    process.exit(1);
  });
