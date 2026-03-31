import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Employee 表字段命名映射（下划线 -> 驼峰）
const EMPLOYEE_FIELD_MAPPINGS = {
  'current_address': 'currentAddress',
  'emergency_contact': 'emergencyContact',
  'emergency_phone': 'emergencyPhone',
  'emergency_relation': 'emergencyRelation',
  'home_address': 'homeAddress',
  'home_phone': 'homePhone',
  'household_register': 'householdRegister',
  'native_place': 'nativePlace',
  'id_card': 'idCard',
  'hire_date': 'hireDate',
  'probation_start': 'probationStart',
  'probation_end': 'probationEnd',
  'probation_months': 'probationMonths',
  'regular_date': 'regularDate',
  'resignation_date': 'resignationDate',
};

// Education 表字段命名映射
const EDUCATION_FIELD_MAPPINGS = {
  'degree_no': 'degreeNo',
  'diploma_no': 'diplomaNo',
  'graduate_school': 'graduateSchool',
  'graduation_date': 'graduationDate',
};

async function unifyFieldCodes() {
  console.log('开始统一字段代码命名...\n');

  const allMappings = {
    ...EMPLOYEE_FIELD_MAPPINGS,
    ...EDUCATION_FIELD_MAPPINGS,
  };

  let updatedCount = 0;
  const skipped: string[] = [];

  for (const [oldCode, newCode] of Object.entries(allMappings)) {
    // 检查新代码是否已存在
    const existingNewCode = await prisma.employeeInfoTabField.findFirst({
      where: { fieldCode: newCode },
    });

    // 检查旧代码
    const oldField = await prisma.employeeInfoTabField.findFirst({
      where: { fieldCode: oldCode },
    });

    if (!oldField) {
      console.log(`⚠️  ${oldCode}: 不存在，跳过`);
      continue;
    }

    if (existingNewCode) {
      console.log(`⚠️  ${newCode}: 已存在 (ID: ${existingNewCode.id})，无法将 ${oldCode} (ID: ${oldField.id}) 转换`);
      skipped.push(`${oldCode} -> ${newCode}`);
      continue;
    }

    // 更新字段代码
    await prisma.employeeInfoTabField.update({
      where: { id: oldField.id },
      data: { fieldCode: newCode },
    });

    console.log(`✅ ${oldCode} -> ${newCode} (ID: ${oldField.id})`);
    updatedCount++;
  }

  console.log(`\n完成！更新了 ${updatedCount} 个字段`);

  if (skipped.length > 0) {
    console.log(`\n跳过的字段：`);
    skipped.forEach(s => console.log(`  - ${s}`));
  }

  // 验证结果
  console.log('\n验证结果：');

  const remainingUnderscoreFields = await prisma.employeeInfoTabField.findMany({
    where: {
      isSystem: true,
      fieldCode: { contains: '_' },
    },
    orderBy: { fieldCode: 'asc' },
  });

  if (remainingUnderscoreFields.length > 0) {
    console.log(`\n仍有 ${remainingUnderscoreFields.length} 个下划线命名的系统字段：`);
    for (const field of remainingUnderscoreFields) {
      console.log(`  - ${field.fieldCode} (${field.fieldName})`);
    }
  } else {
    console.log('\n✅ 所有系统字段都已转换为驼峰命名！');
  }
}

unifyFieldCodes()
  .catch((error) => {
    console.error('执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
