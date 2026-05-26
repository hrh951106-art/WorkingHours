import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseEmployeeCreateIssue() {
  console.log('========== 诊断员工创建字段保存问题 ==========\n');

  // 1. 检查后端定义的字段列表
  console.log('1. 后端定义的字段列表:\n');

  const employeeFields = [
    'employeeNo', 'name', 'gender', 'idCard', 'phone', 'email', 'orgId', 'entryDate',
    'status', 'birthDate', 'age', 'maritalStatus', 'nativePlace', 'politicalStatus',
    'householdRegister', 'currentAddress', 'photo', 'emergencyContact',
    'emergencyPhone', 'emergencyRelation', 'homeAddress', 'homePhone'
  ];

  const workInfoFields = [
    'changeType', 'position', 'jobLevel', 'employeeType', 'workLocation', 'workAddress',
    'hireDate', 'probationStart', 'probationEnd', 'probationMonths',
    'regularDate', 'resignationDate', 'resignationReason', 'workYears',
    'orgId', 'effectiveDate', 'isCurrent', 'reason'
  ];

  console.log('Employee 表字段（基本信息）:');
  employeeFields.forEach(field => console.log(`  - ${field}`));
  console.log(`\n总计: ${employeeFields.length} 个字段\n`);

  console.log('WorkInfoHistory 表字段（工作信息）:');
  workInfoFields.forEach(field => console.log(`  - ${field}`));
  console.log(`\n总计: ${workInfoFields.length} 个字段\n`);

  // 2. 检查数据库中实际配置的字段
  console.log('2. 数据库中配置的字段:\n');

  const basicInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'basic_info' },
    include: {
      groups: {
        where: { status: 'ACTIVE' },
        include: {
          fields: {
            orderBy: { sort: 'asc' },
          },
        },
      },
    },
  });

  const workInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'work_info' },
    include: {
      groups: {
        where: { status: 'ACTIVE' },
        include: {
          fields: {
            orderBy: { sort: 'asc' },
          },
        },
      },
    },
  });

  console.log('基本信息页签字段:');
  const basicInfoConfiguredFields: string[] = [];
  basicInfoTab?.groups.forEach(group => {
    group.fields.forEach(field => {
      if (!field.isHidden) {
        basicInfoConfiguredFields.push(field.fieldCode);
        console.log(`  - ${field.fieldName} (${field.fieldCode}) - isRequired: ${field.isRequired}`);
      }
    });
  });

  console.log(`\n总计: ${basicInfoConfiguredFields.length} 个可见字段\n`);

  console.log('工作信息页签字段:');
  const workInfoConfiguredFields: string[] = [];
  workInfoTab?.groups.forEach(group => {
    group.fields.forEach(field => {
      if (!field.isHidden) {
        workInfoConfiguredFields.push(field.fieldCode);
        console.log(`  - ${field.fieldName} (${field.fieldCode}) - isRequired: ${field.isRequired}`);
      }
    });
  });

  console.log(`\n总计: ${workInfoConfiguredFields.length} 个可见字段\n`);

  // 3. 对比分析：找出缺失的字段
  console.log('3. 问题分析:\n');

  console.log('A. 基本信息页签 - 后端支持但未在 employeeFields 中的字段:');
  const missingInEmployeeFields = basicInfoConfiguredFields.filter(
    field => !employeeFields.includes(field)
  );
  if (missingInEmployeeFields.length > 0) {
    missingInEmployeeFields.forEach(field => console.log(`  ⚠️  ${field} - 不会被保存到 Employee 表`));
  } else {
    console.log('  ✓ 所有字段都已定义');
  }

  console.log('\nB. 工作信息页签 - 后端支持但未在 workInfoFields 中的字段:');
  const missingInWorkInfoFields = workInfoConfiguredFields.filter(
    field => !workInfoFields.includes(field)
  );
  if (missingInWorkInfoFields.length > 0) {
    missingInWorkInfoFields.forEach(field => console.log(`  ⚠️  ${field} - 不会被保存到 WorkInfoHistory 表`));
  } else {
    console.log('  ✓ 所有字段都已定义');
  }

  // 4. 检查特定字段
  console.log('\n4. 特定字段检查:\n');

  const checkFields = ['birthDate', 'maritalStatus', 'politicalStatus', 'position', 'costCenter', 'employmentRelation'];

  checkFields.forEach(fieldCode => {
    const inEmployeeFields = employeeFields.includes(fieldCode);
    const inWorkInfoFields = workInfoFields.includes(fieldCode);
    const inBasicInfo = basicInfoConfiguredFields.includes(fieldCode);
    const inWorkInfo = workInfoConfiguredFields.includes(fieldCode);

    console.log(`${fieldCode}:`);
    console.log(`  - 在 employeeFields 中: ${inEmployeeFields ? '✓' : '✗'}`);
    console.log(`  - 在 workInfoFields 中: ${inWorkInfoFields ? '✓' : '✗'}`);
    console.log(`  - 在 basicInfo 配置中: ${inBasicInfo ? '✓' : '✗'}`);
    console.log(`  - 在 workInfo 配置中: ${inWorkInfo ? '✓' : '✗'}`);

    if (!inEmployeeFields && !inWorkInfoFields) {
      console.log(`  ⚠️  问题：该字段未在后端字段列表中定义，不会被保存！`);
    }
    console.log('');
  });

  // 5. 总结
  console.log('========== 问题总结 ==========\n');

  console.log('发现的问题:');
  console.log('1. 后端 hr.service.ts 中定义的 employeeFields 和 workInfoFields 列表');
  console.log('2. 如果字段不在这两个列表中，会被放入 customFields 中');
  console.log('3. customFields 会被保存为 JSON 字符串，但查询时需要特殊处理');
  console.log('4. 前端查询员工详情时，可能没有正确解析 customFields 中的数据');

  console.log('\n建议的解决方案:');
  console.log('1. 将缺失的字段添加到 employeeFields 或 workInfoFields 列表中');
  console.log('2. 或者确保前端和后端都正确处理 customFields');
}

diagnoseEmployeeCreateIssue()
  .then(() => {
    console.log('\n诊断完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('诊断失败:', error);
    process.exit(1);
  });
