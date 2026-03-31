import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Employee 表中的系统字段列表
const EMPLOYEE_SYSTEM_FIELDS = [
  'employeeNo',
  'name',
  'gender',
  'idCard',
  'phone',
  'email',
  'orgId',
  'entryDate',
  'status',
  'birthDate',
  'age',
  'maritalStatus',
  'nativePlace',
  'politicalStatus',
  'householdRegister',
  'currentAddress',
  'photo',
  'emergencyContact',
  'emergencyPhone',
  'emergencyRelation',
  'homeAddress',
  'homePhone',
];

async function fixSystemFieldTypes() {
  console.log('开始修复系统字段类型...\n');

  // 查找所有 isSystem = true 但 fieldType 不是 'SYSTEM' 的字段
  const incorrectFields = await prisma.employeeInfoTabField.findMany({
    where: {
      isSystem: true,
      NOT: {
        fieldType: 'SYSTEM',
      },
    },
  });

  console.log(`发现 ${incorrectFields.length} 个字段类型不正确：`);
  incorrectFields.forEach(f => {
    console.log(`  - ${f.fieldCode} (ID: ${f.id}, fieldType: ${f.fieldType})`);
  });
  console.log();

  // 修复字段类型
  let fixedCount = 0;
  for (const field of incorrectFields) {
    // 只修复 Employee 表中的系统字段
    if (EMPLOYEE_SYSTEM_FIELDS.includes(field.fieldCode)) {
      console.log(`  ✅ 修复字段 ${field.fieldCode} (ID: ${field.id}): ${field.fieldType} -> SYSTEM`);
      await prisma.employeeInfoTabField.update({
        where: { id: field.id },
        data: { fieldType: 'SYSTEM' },
      });
      fixedCount++;
    } else {
      console.log(`  ⚠️  跳过字段 ${field.fieldCode} (ID: ${field.id}): 不是 Employee 表字段`);
    }
  }

  console.log(`\n完成！修复了 ${fixedCount} 个字段`);

  // 验证修复结果
  console.log('\n验证修复结果：');

  const entryDateField = await prisma.employeeInfoTabField.findFirst({
    where: { fieldCode: 'entryDate' },
  });

  if (entryDateField) {
    console.log(`\n✅ entryDate 字段：`);
    console.log(`   - fieldType: ${entryDateField.fieldType}`);
    console.log(`   - isSystem: ${entryDateField.isSystem}`);
    console.log(`   - isRequired: ${entryDateField.isRequired}`);
  }

  // 统计各类型字段数量
  const stats = await prisma.employeeInfoTabField.groupBy({
    by: ['fieldType', 'isSystem'],
    _count: { id: true },
  });

  console.log('\n字段类型统计：');
  for (const stat of stats) {
    const systemLabel = stat.isSystem ? '系统' : '自定义';
    console.log(`  - ${stat.fieldType} (${systemLabel}): ${stat._count.id} 个`);
  }
}

fixSystemFieldTypes()
  .catch((error) => {
    console.error('执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
