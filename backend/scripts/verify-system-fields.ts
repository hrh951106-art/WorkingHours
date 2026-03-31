import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySystemFields() {
  console.log('='.repeat(60));
  console.log('系统内置字段验证报告');
  console.log('='.repeat(60));

  // 1. 验证所有 Employee 表字段是否正确设置为系统字段
  const EMPLOYEE_SYSTEM_FIELDS = [
    'employeeNo', 'name', 'gender', 'idCard', 'phone', 'email',
    'orgId', 'entryDate', 'status', 'birthDate', 'age', 'maritalStatus',
    'nativePlace', 'politicalStatus', 'householdRegister',
    'currentAddress', 'photo', 'emergencyContact', 'emergencyPhone',
    'emergencyRelation', 'homeAddress', 'homePhone',
  ];

  // 下划线命名版本
  const UNDERSCORE_VERSIONS = {
    employeeNo: 'employee_no',
    idCard: 'id_card',
    nativePlace: 'native_place',
    politicalStatus: 'political_status',
    householdRegister: 'household_register',
    currentAddress: 'current_address',
    emergencyContact: 'emergency_contact',
    emergencyPhone: 'emergency_phone',
    emergencyRelation: 'emergency_relation',
    homeAddress: 'home_address',
    homePhone: 'home_phone',
  };

  console.log('\n1. 检查 Employee 表系统字段：\n');

  const allFields = await prisma.employeeInfoTabField.findMany({
    where: {
      fieldCode: {
        in: [
          ...EMPLOYEE_SYSTEM_FIELDS,
          ...Object.values(UNDERSCORE_VERSIONS),
        ],
      },
    },
  });

  const issues: string[] = [];
  const correct: string[] = [];

  for (const fieldName of EMPLOYEE_SYSTEM_FIELDS) {
    const camelCode = fieldName;
    const underscoreCode = UNDERSCORE_VERSIONS[fieldName];

    const camelField = await prisma.employeeInfoTabField.findFirst({
      where: { fieldCode: camelCode },
    });
    const underscoreField = underscoreCode
      ? await prisma.employeeInfoTabField.findFirst({
          where: { fieldCode: underscoreCode },
        })
      : null;

    // 检查是否存在
    if (!camelField && !underscoreField) {
      issues.push(`❌ ${fieldName}: 字段不存在`);
      continue;
    }

    // 如果两个版本都存在，检查是否有重复
    if (camelField && underscoreField) {
      issues.push(
        `⚠️  ${fieldName}: 存在重复字段 (${camelCode} ID:${camelField.id}, ${underscoreCode} ID:${underscoreField.id})`
      );
      continue;
    }

    const field = camelField || underscoreField;

    // 检查 isSystem
    if (!field.isSystem) {
      issues.push(`❌ ${field.fieldCode}: isSystem = false，应为 true`);
      continue;
    }

    // 检查 fieldType
    if (field.fieldType !== 'SYSTEM') {
      issues.push(
        `⚠️  ${field.fieldCode}: fieldType = ${field.fieldType}，建议改为 SYSTEM`
      );
    }

    correct.push(`✅ ${field.fieldCode}: isSystem=${field.isSystem}, fieldType=${field.fieldType}`);
  }

  console.log('正确的字段：');
  correct.forEach(msg => console.log(`  ${msg}`));

  if (issues.length > 0) {
    console.log('\n发现的问题：');
    issues.forEach(msg => console.log(`  ${msg}`));
  } else {
    console.log('\n✅ 所有 Employee 系统字段配置正确！');
  }

  // 2. 统计 emergency_contact 分组
  console.log('\n' + '='.repeat(60));
  console.log('2. 紧急联系人分组统计：\n');

  const emergencyFields = await prisma.employeeInfoTabField.findMany({
    where: { groupId: 4 },
    orderBy: { sort: 'asc' },
  });

  const visibleFields = emergencyFields.filter(f => !f.isHidden);
  const hiddenFields = emergencyFields.filter(f => f.isHidden);

  console.log(`emergency_contact 分组字段总数: ${emergencyFields.length}`);
  console.log(`  - 可见字段: ${visibleFields.length}`);
  console.log(`  - 隐藏字段: ${hiddenFields.length}`);

  console.log('\n字段列表：');
  for (const field of emergencyFields) {
    const status = field.isHidden ? '(隐藏)' : '';
    console.log(
      `  ${field.sort}. ${field.fieldCode} (${field.fieldName}) ${status}`
    );
  }

  // 3. 检查是否有系统字段显示删除按钮的风险
  console.log('\n' + '='.repeat(60));
  console.log('3. 系统字段删除按钮风险检查：\n');

  const systemFieldsWithWrongType = await prisma.employeeInfoTabField.findMany({
    where: {
      isSystem: true,
      fieldType: { not: 'SYSTEM' },
    },
  });

  if (systemFieldsWithWrongType.length > 0) {
    console.log(
      `⚠️  发现 ${systemFieldsWithWrongType.length} 个系统字段 fieldType 不是 SYSTEM，可能导致前端误判：`
    );
    for (const field of systemFieldsWithWrongType) {
      console.log(
        `  - ${field.fieldCode} (fieldType: ${field.fieldType}, isSystem: ${field.isSystem})`
      );
    }
  } else {
    console.log('✅ 所有系统字段的 fieldType 都是 SYSTEM');
  }

  // 4. 最终统计
  console.log('\n' + '='.repeat(60));
  console.log('4. 最终统计：\n');

  const stats = await prisma.employeeInfoTabField.groupBy({
    by: ['fieldType', 'isSystem'],
    _count: { id: true },
  });

  console.log('字段类型分布：');
  for (const stat of stats) {
    const systemLabel = stat.isSystem ? '系统' : '自定义';
    console.log(
      `  - ${stat.fieldType} (${systemLabel}): ${stat._count.id} 个`
    );
  }

  console.log('\n' + '='.repeat(60));
}

verifySystemFields()
  .catch((error) => {
    console.error('执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
