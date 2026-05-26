import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 定义系统字段列表（根据字段的 fieldCode 判断）
const SYSTEM_FIELD_CODES = [
  // 基本信息 - 个人资料
  'employeeNo',
  'name',
  'gender',
  'idCard',
  'photo',

  // 基本信息 - 联系方式
  'phone',
  'email',
  'currentAddress',
  'emergencyContact',
  'emergencyPhone',
  'emergencyRelation',

  // 基本信息 - 个人详情
  'birthDate',
  'age',
  'maritalStatus',
  'nativePlace',
  'politicalStatus',
  'householdRegister',

  // 工作信息 - 当前职位
  'position',
  'jobLevel',
  'employeeType',
  'workLocation',
  'workAddress',

  // 工作信息 - 雇佣信息
  'entryDate',
  'hireDate',
  'probationStart',
  'probationEnd',
  'probationMonths',
  'regularDate',
  'workYears',
  'status',

  // 工作信息 - 组织信息
  'orgId',

  // 学历信息
  'educations',

  // 工作经历
  'workExperiences',

  // 家庭信息
  'familyMembers',
];

async function fixEmployeeInfoTabsFields() {
  console.log('========== 修复人事信息页签字段配置 ==========\n');

  // 1. 获取所有需要修复的字段
  const allFields = await prisma.employeeInfoTabField.findMany({
    where: {
      isSystem: false,
      fieldType: { not: 'CUSTOM' },
    },
  });

  console.log(`找到 ${allFields.length} 个需要修复的字段\n`);

  // 2. 分类并修复字段
  let fixedCount = 0;
  let customCount = 0;

  for (const field of allFields) {
    const isSystemField = SYSTEM_FIELD_CODES.includes(field.fieldCode);

    if (isSystemField) {
      // 修复系统字段
      await prisma.employeeInfoTabField.update({
        where: { id: field.id },
        data: {
          isSystem: true,
          fieldType: 'SYSTEM',
        },
      });
      fixedCount++;
      console.log(`✓ 修复系统字段: ${field.fieldName} (${field.fieldCode})`);
    } else {
      // 其他字段标记为自定义字段
      await prisma.employeeInfoTabField.update({
        where: { id: field.id },
        data: {
          fieldType: 'CUSTOM',
        },
      });
      customCount++;
      console.log(`✓ 标记自定义字段: ${field.fieldName} (${field.fieldCode})`);
    }
  }

  console.log(`\n修复完成:`);
  console.log(`- 系统字段: ${fixedCount} 个`);
  console.log(`- 自定义字段: ${customCount} 个`);

  // 3. 验证修复结果
  console.log('\n========== 验证修复结果 ==========\n');

  const tabs = await prisma.employeeInfoTab.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { sort: 'asc' },
    include: {
      groups: {
        orderBy: { sort: 'asc' },
        include: {
          fields: {
            orderBy: { sort: 'asc' },
          },
        },
      },
      fields: {
        where: { groupId: null },
        orderBy: { sort: 'asc' },
      },
    },
  });

  for (const tab of tabs) {
    console.log(`\n页签: ${tab.name}`);
    for (const group of tab.groups) {
      const systemFields = group.fields.filter((f) => f.isSystem && !f.isHidden);
      const customFields = group.fields.filter((f) => f.fieldType === 'CUSTOM' && !f.isHidden);

      if (systemFields.length > 0 || customFields.length > 0) {
        console.log(`  分组: ${group.name}`);
        console.log(`    - 系统字段: ${systemFields.length} 个`);
        console.log(`    - 自定义字段: ${customFields.length} 个`);
      }
    }
  }
}

fixEmployeeInfoTabsFields()
  .then(() => {
    console.log('\n✓ 所有字段已修复完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('修复失败:', error);
    process.exit(1);
  });
