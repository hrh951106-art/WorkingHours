import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verifyAllFixes() {
  console.log('=== 验证所有修复 ===\n');

  const criticalFields = [
    'position',      // 职位 - WorkInfoHistory 表字段
    'jobLevel',      // 职级 - WorkInfoHistory 表字段
    'employeeType',  // 员工类型 - WorkInfoHistory 表字段
    'nation',        // 民族 - Employee 表字段
    'educationLevel',// 学历层次 - EmployeeEducation 表字段
    'educationType', // 学历类型 - EmployeeEducation 表字段
    'gender',        // 性别 - Employee 表字段
    'maritalStatus', // 婚姻状况 - Employee 表字段
  ];

  console.log('关键字段类型验证:');
  console.log('========================================\n');

  let allCorrect = true;

  for (const fieldCode of criticalFields) {
    const field = await prisma.employeeInfoTabField.findFirst({
      where: { fieldCode },
      select: { fieldCode: true, fieldType: true, fieldName: true }
    });

    if (!field) {
      console.log(`⚠️  ${fieldCode}: 未找到配置`);
      allCorrect = false;
      continue;
    }

    const isCorrect = field.fieldType === 'SYSTEM';
    const status = isCorrect ? '✓' : '✗';

    console.log(`${status} ${field.fieldCode}: fieldType = "${field.fieldType}" (${field.fieldName})`);

    if (!isCorrect) {
      allCorrect = false;
    }
  }

  console.log('\n========================================');
  if (allCorrect) {
    console.log('✓ 所有关键字段的 fieldType 都已正确设置为 SYSTEM');
    console.log('\n修复效果:');
    console.log('1. 基本信息页签的数据将正确显示');
    console.log('2. 工作信息页签的数据将正确显示');
    console.log('3. 学历信息页签的数据将正确显示');
    console.log('4. 下拉字段将显示标签而不是原始值');
  } else {
    console.log('✗ 仍有部分字段需要修复');
  }

  await prisma.$disconnect();
}

verifyAllFixes().catch(console.error);
