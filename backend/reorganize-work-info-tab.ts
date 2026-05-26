import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function reorganizeWorkInfoTab() {
  console.log('========== 重新组织工作信息页签字段分组 ==========\n');

  // 1. 获取工作信息页签
  const workInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'work_info' },
    include: {
      groups: {
        include: {
          fields: true,
        },
      },
    },
  });

  if (!workInfoTab) {
    console.error('未找到工作信息页签');
    process.exit(1);
  }

  console.log(`找到工作信息页签: ${workInfoTab.name} (id: ${workInfoTab.id})`);
  console.log(`现有分组数量: ${workInfoTab.groups.length}\n`);

  // 2. 删除现有的所有分组（这将自动把字段的 groupId 设为 null）
  console.log('步骤 1: 删除现有分组...');

  for (const group of workInfoTab.groups) {
    console.log(`  - 删除分组: ${group.name}`);
    await prisma.employeeInfoTabGroup.delete({
      where: { id: group.id },
    });
  }

  console.log('✓ 已删除所有现有分组\n');

  // 3. 创建新的分组
  console.log('步骤 2: 创建新分组...');

  // 分组1: 雇佣信息
  const employmentGroup = await prisma.employeeInfoTabGroup.create({
    data: {
      tabId: workInfoTab.id,
      code: 'employment_info',
      name: '雇佣信息',
      description: '员工雇佣相关信息',
      sort: 1,
      status: 'ACTIVE',
      collapsed: false,
    },
  });
  console.log(`✓ 创建分组: ${employmentGroup.name} (id: ${employmentGroup.id})`);

  // 分组2: 试用与转正
  const probationGroup = await prisma.employeeInfoTabGroup.create({
    data: {
      tabId: workInfoTab.id,
      code: 'probation_info',
      name: '试用与转正',
      description: '试用期与转正相关信息',
      sort: 2,
      status: 'ACTIVE',
      collapsed: false,
    },
  });
  console.log(`✓ 创建分组: ${probationGroup.name} (id: ${probationGroup.id})\n`);

  // 4. 定义字段分配
  console.log('步骤 3: 重新分配字段...\n');

  // 分组1的字段：雇佣信息
  const employmentFields = [
    { code: 'employeeType', name: '员工类型', required: false, sort: 1 },
    { code: 'workLocation', name: '工作地点', required: false, sort: 2 },
    { code: 'workAddress', name: '办公地址', required: false, sort: 3 },
    { code: 'entryDate', name: '入职日期', required: true, sort: 4 },
    { code: 'status', name: '员工状态', required: true, sort: 5 },
    { code: 'orgId', name: '所属组织', required: true, sort: 6 },
    { code: 'position', name: '职位', required: false, sort: 7 },
    { code: 'jobLevel', name: '职级', required: false, sort: 8 },
  ];

  // 分组2的字段：试用与转正
  const probationFields = [
    { code: 'probationStart', name: '试用期开始', required: false, sort: 1 },
    { code: 'probationEnd', name: '试用期结束', required: false, sort: 2 },
    { code: 'probationMonths', name: '试用期月数', required: false, sort: 3 },
    { code: 'regularDate', name: '转正日期', required: false, sort: 4 },
    { code: 'hireDate', name: '受雇日期', required: false, sort: 5 },
    { code: 'workYears', name: '工作年限', required: false, sort: 6 },
  ];

  // 5. 更新字段到新的分组
  console.log('分组1: 雇佣信息');
  for (const field of employmentFields) {
    await prisma.employeeInfoTabField.updateMany({
      where: {
        tabId: workInfoTab.id,
        fieldCode: field.code,
      },
      data: {
        groupId: employmentGroup.id,
        sort: field.sort,
        isRequired: field.required,
      },
    });
    console.log(`  ✓ ${field.name} (${field.code}) - ${field.required ? '必填' : '可选'}`);
  }

  console.log('\n分组2: 试用与转正');
  for (const field of probationFields) {
    await prisma.employeeInfoTabField.updateMany({
      where: {
        tabId: workInfoTab.id,
        fieldCode: field.code,
      },
      data: {
        groupId: probationGroup.id,
        sort: field.sort,
        isRequired: field.required,
      },
    });
    console.log(`  ✓ ${field.name} (${field.code}) - ${field.required ? '必填' : '可选'}`);
  }

  // 6. 验证结果
  console.log('\n========== 验证结果 ==========\n');

  const updatedTab = await prisma.employeeInfoTab.findUnique({
    where: { id: workInfoTab.id },
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

  console.log(`${updatedTab.name} (code: ${updatedTab.code})`);
  console.log(`分组数量: ${updatedTab.groups.length}\n`);

  for (const group of updatedTab.groups) {
    console.log(`${group.sort}. ${group.name} (code: ${group.code})`);
    console.log(`   字段数量: ${group.fields.length}`);
    for (const field of group.fields) {
      const required = field.isRequired ? '必填' : '可选';
      const system = field.isSystem ? '系统' : '自定义';
      console.log(`   ${field.sort}. ${field.fieldName} (${field.fieldCode}) [${required}] [${system}]`);
    }
    console.log('');
  }

  console.log('✓ 工作信息页签重新组织完成！');
}

reorganizeWorkInfoTab()
  .then(() => {
    console.log('\n✓ 所有操作已成功完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ 操作失败:', error);
    process.exit(1);
  });
