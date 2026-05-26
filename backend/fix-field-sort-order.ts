import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixFieldSortOrder() {
  console.log('========== 修正字段排序 ==========\n');

  const workInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'work_info' },
    include: {
      groups: {
        include: {
          fields: {
            orderBy: { sort: 'asc' },
          },
        },
      },
    },
  });

  if (!workInfoTab) {
    console.error('未找到工作信息页签');
    return;
  }

  // 定义期望的字段顺序（雇佣信息分组）
  const expectedEmploymentFields = [
    { code: 'employeeType', name: '员工类型' },
    { code: 'workLocation', name: '工作地点' },
    { code: 'workAddress', name: '办公地址' },
    { code: 'entryDate', name: '入职日期' },
    { code: 'status', name: '员工状态' },
    { code: 'orgId', name: '所属组织' },
    { code: 'position', name: '岗位' },
    { code: 'jobLevel', name: '职级' },
    { code: 'costCenter', name: '成本中心' },
    { code: 'employmentRelation', name: '工作关系' },
  ];

  // 定义期望的字段顺序（试用与转正分组）
  const expectedProbationFields = [
    { code: 'probationStart', name: '试用期开始' },
    { code: 'probationEnd', name: '试用期结束' },
    { code: 'probationMonths', name: '试用期月数' },
    { code: 'regularDate', name: '转正日期' },
    { code: 'hireDate', name: '受雇日期' },
    { code: 'workYears', name: '工作年限' },
  ];

  console.log('修正前：\n');

  for (const group of workInfoTab.groups) {
    console.log(`分组: ${group.name}`);
    console.log(`字段数量: ${group.fields.length}\n`);
    for (const field of group.fields) {
      console.log(`  ${field.sort}. ${field.fieldName} (${field.fieldCode})`);
    }
    console.log('');
  }

  // 修正雇佣信息分组
  console.log('========== 修正雇佣信息分组排序 ==========\n');

  const employmentGroup = workInfoTab.groups.find(g => g.code === 'employment_info');

  if (employmentGroup) {
    for (let i = 0; i < expectedEmploymentFields.length; i++) {
      const expected = expectedEmploymentFields[i];
      const field = employmentGroup.fields.find(f => f.fieldCode === expected.code);

      if (field && field.sort !== i) {
        await prisma.employeeInfoTabField.update({
          where: { id: field.id },
          data: { sort: i },
        });
        console.log(`✓ 更新排序: ${field.fieldName} (${field.sort} -> ${i})`);
      }
    }
  }

  // 修正试用与转正分组
  console.log('\n========== 修正试用与转正分组排序 ==========\n');

  const probationGroup = workInfoTab.groups.find(g => g.code === 'probation_info');

  if (probationGroup) {
    for (let i = 0; i < expectedProbationFields.length; i++) {
      const expected = expectedProbationFields[i];
      const field = probationGroup.fields.find(f => f.fieldCode === expected.code);

      if (field && field.sort !== i) {
        await prisma.employeeInfoTabField.update({
          where: { id: field.id },
          data: { sort: i },
        });
        console.log(`✓ 更新排序: ${field.fieldName} (${field.sort} -> ${i})`);
      }
    }
  }

  // 验证修正结果
  console.log('\n========== 验证修正结果 ==========\n');

  const updatedTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'work_info' },
    include: {
      groups: {
        orderBy: { sort: 'asc' },
        include: {
          fields: {
            orderBy: { sort: 'asc' },
            include: { dataSource: true },
          },
        },
      },
    },
  });

  console.log('修正后：\n');

  for (const group of updatedTab.groups) {
    console.log(`${group.sort}. ${group.name} (${group.code})`);
    console.log(`字段数量: ${group.fields.length}\n`);
    for (const field of group.fields) {
      const dsInfo = field.dataSource ? `${field.dataSource.name}` : '无数据源';
      const required = field.isRequired ? '必填' : '可选';
      console.log(`  ${field.sort}. ${field.fieldName} (${field.fieldCode})`);
      console.log(`      数据源: ${dsInfo} | ${required}`);
    }
    console.log('');
  }

  console.log('✓ 排序修正完成！');
}

fixFieldSortOrder()
  .then(() => {
    console.log('\n✓ 所有操作已完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ 操作失败:', error);
    process.exit(1);
  });
