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

  // 1. 先回滚之前的修改（将 fieldType 为 'SYSTEM' 的改回去）
  console.log('步骤 1: 回滚之前的 fieldType 修改...\n');

  const systemTypeFields = await prisma.employeeInfoTabField.findMany({
    where: { fieldType: 'SYSTEM' },
  });

  console.log(`找到 ${systemTypeFields.length} 个需要回滚的字段`);

  // 根据 fieldCode 推断原始的 fieldType
  const fieldTypeMapping: Record<string, string> = {
    employeeNo: 'TEXT',
    name: 'TEXT',
    gender: 'DATASOURCE',
    idCard: 'TEXT',
    photo: 'IMAGE',
    phone: 'TEXT',
    email: 'TEXT',
    currentAddress: 'TEXT',
    emergencyContact: 'TEXT',
    emergencyPhone: 'TEXT',
    emergencyRelation: 'DATASOURCE',
    birthDate: 'DATE',
    age: 'NUMBER',
    maritalStatus: 'DATASOURCE',
    nativePlace: 'TEXT',
    politicalStatus: 'DATASOURCE',
    householdRegister: 'TEXT',
    position: 'TEXT',
    jobLevel: 'DATASOURCE',
    employeeType: 'DATASOURCE',
    workLocation: 'TEXT',
    workAddress: 'TEXT',
    entryDate: 'DATE',
    hireDate: 'DATE',
    probationStart: 'DATE',
    probationEnd: 'DATE',
    probationMonths: 'NUMBER',
    regularDate: 'DATE',
    workYears: 'NUMBER',
    status: 'SELECT',
    orgId: 'ORG_SELECT',
    educations: 'LIST',
    workExperiences: 'LIST',
    familyMembers: 'LIST',
  };

  for (const field of systemTypeFields) {
    const originalFieldType = fieldTypeMapping[field.fieldCode] || 'TEXT';

    await prisma.employeeInfoTabField.update({
      where: { id: field.id },
      data: {
        fieldType: originalFieldType,
      },
    });

    console.log(`✓ 回滚字段: ${field.fieldName} (${field.fieldCode}) -> ${originalFieldType}`);
  }

  console.log(`\n已回滚 ${systemTypeFields.length} 个字段\n`);

  // 2. 修复 isSystem 字段
  console.log('步骤 2: 修复 isSystem 字段...\n');

  const allFields = await prisma.employeeInfoTabField.findMany();

  let fixedCount = 0;
  let skippedCount = 0;

  for (const field of allFields) {
    const shouldBeSystem = SYSTEM_FIELD_CODES.includes(field.fieldCode);

    if (field.isSystem !== shouldBeSystem) {
      await prisma.employeeInfoTabField.update({
        where: { id: field.id },
        data: {
          isSystem: shouldBeSystem,
        },
      });
      fixedCount++;
      console.log(`${shouldBeSystem ? '✓' : '✗'} ${field.fieldName} (${field.fieldCode}): isSystem -> ${shouldBeSystem}`);
    } else {
      skippedCount++;
    }
  }

  console.log(`\n修复完成:`);
  console.log(`- 修改字段: ${fixedCount} 个`);
  console.log(`- 跳过字段: ${skippedCount} 个`);

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
    },
  });

  for (const tab of tabs) {
    console.log(`\n页签: ${tab.name}`);
    for (const group of tab.groups) {
      if (group.status === 'INACTIVE') continue;

      const systemFields = group.fields.filter((f) => f.isSystem && !f.isHidden);
      const customFields = group.fields.filter((f) => f.fieldType === 'CUSTOM' && !f.isHidden);

      if (systemFields.length > 0 || customFields.length > 0) {
        console.log(`  分组: ${group.name} (status: ${group.status})`);
        console.log(`    - 系统字段: ${systemFields.length} 个`);
        console.log(`    - 自定义字段: ${customFields.length} 个`);

        // 显示前3个系统字段作为示例
        if (systemFields.length > 0) {
          console.log(`    - 示例系统字段:`);
          systemFields.slice(0, 3).forEach((f) => {
            console.log(`      * ${f.fieldName} (fieldType: ${f.fieldType}, isSystem: ${f.isSystem})`);
          });
        }
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
