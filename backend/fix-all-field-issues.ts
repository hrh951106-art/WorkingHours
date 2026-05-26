import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAllIssues() {
  console.log('========== 修复所有问题 ==========\n');

  // 1. 删除 JOB_POST 数据源
  console.log('步骤 1: 删除 JOB_POST 数据源...\n');

  const jobPostDataSource = await prisma.dataSource.findFirst({
    where: { code: 'JOB_POST' },
  });

  if (jobPostDataSource) {
    console.log(`  - 删除数据源: ${jobPostDataSource.name} (ID: ${jobPostDataSource.id}, code: ${jobPostDataSource.code})`);
    await prisma.dataSourceOption.deleteMany({
      where: { dataSourceId: jobPostDataSource.id },
    });
    await prisma.dataSource.delete({
      where: { id: jobPostDataSource.id },
    });
    console.log('  ✓ JOB_POST 数据源已删除\n');
  } else {
    console.log('  ⚠️  未找到 JOB_POST 数据源\n');
  }

  // 2. 添加 costCenter 和 employmentRelation 字段到工作信息页签
  console.log('步骤 2: 添加成本中心和工作关系字段...\n');

  const workInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'work_info' },
    include: {
      groups: {
        orderBy: { sort: 'asc' },
      },
    },
  });

  if (!workInfoTab) {
    console.error('未找到工作信息页签');
    process.exit(1);
  }

  // 找到"雇佣信息"分组
  const employmentGroup = workInfoTab.groups.find(g => g.code === 'employment_info');

  if (!employmentGroup) {
    console.error('未找到雇佣信息分组');
    process.exit(1);
  }

  // 获取当前分组中的最大 sort 值
  const currentFields = await prisma.employeeInfoTabField.findMany({
    where: { groupId: employmentGroup.id },
    orderBy: { sort: 'desc' },
    take: 1,
  });

  const maxSort = currentFields.length > 0 ? currentFields[0].sort : 0;

  // 获取数据源ID
  const costCenterDS = await prisma.dataSource.findFirst({
    where: { code: 'COST_CENTER' },
  });

  const employmentRelationDS = await prisma.dataSource.findFirst({
    where: { code: 'EMPLOYMENT_RELATION' },
  });

  if (!costCenterDS || !employmentRelationDS) {
    console.error('未找到 COST_CENTER 或 EMPLOYMENT_RELATION 数据源');
    process.exit(1);
  }

  // 创建成本中心字段
  const costCenterField = await prisma.employeeInfoTabField.create({
    data: {
      tabId: workInfoTab.id,
      groupId: employmentGroup.id,
      fieldCode: 'costCenter',
      fieldName: '成本中心',
      fieldType: 'DATASOURCE',
      isRequired: false,
      isHidden: false,
      isSystem: true,
      sort: maxSort + 1,
      dataSourceId: costCenterDS.id,
    },
  });
  console.log(`  ✓ 创建字段: ${costCenterField.fieldName} (${costCenterField.fieldCode})`);
  console.log(`    - 数据源: ${costCenterDS.name} (${costCenterDS.code})`);
  console.log(`    - 排序: ${costCenterField.sort}\n`);

  // 创建工作关系字段
  const employmentRelationField = await prisma.employeeInfoTabField.create({
    data: {
      tabId: workInfoTab.id,
      groupId: employmentGroup.id,
      fieldCode: 'employmentRelation',
      fieldName: '工作关系',
      fieldType: 'DATASOURCE',
      isRequired: false,
      isHidden: false,
      isSystem: true,
      sort: maxSort + 2,
      dataSourceId: employmentRelationDS.id,
    },
  });
  console.log(`  ✓ 创建字段: ${employmentRelationField.fieldName} (${employmentRelationField.fieldCode})`);
  console.log(`    - 数据源: ${employmentRelationDS.name} (${employmentRelationDS.code})`);
  console.log(`    - 排序: ${employmentRelationField.sort}\n`);

  // 3. 验证结果
  console.log('步骤 3: 验证结果...\n');

  // 验证 JOB_POST 已删除
  const verifyJobPostDeleted = await prisma.dataSource.findFirst({
    where: { code: 'JOB_POST' },
  });

  console.log(`JOB_POST 数据源: ${verifyJobPostDeleted ? '✗ 仍存在' : '✓ 已删除'}`);

  // 验证新字段已创建
  const updatedWorkInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'work_info' },
    include: {
      groups: {
        include: {
          fields: {
            orderBy: { sort: 'asc' },
            include: {
              dataSource: true,
            },
          },
        },
      },
    },
  });

  console.log('\n工作信息页签 - 雇佣信息分组:');
  const employmentGroupUpdated = updatedWorkInfoTab.groups.find(g => g.code === 'employment_info');

  employmentGroupUpdated.fields.forEach(field => {
    const dataSourceName = field.dataSource ? `${field.dataSource.name} (${field.dataSource.code})` : '无数据源';
    console.log(`  ${field.sort}. ${field.fieldName} (${field.fieldCode})`);
    console.log(`      数据源: ${dataSourceName}`);
  });

  console.log('\n✓ 所有问题已修复！');

  // 4. 提示需要检查的初始化数据文件
  console.log('\n========== 需要检查的初始化数据文件 ==========\n');
  console.log('请检查以下文件，确保没有引用 JOB_POST：');
  console.log('  - prisma/seed-datasources.ts');
  console.log('  - 其他可能初始化查找项的文件');
}

fixAllIssues()
  .then(() => {
    console.log('\n✓ 修复完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ 修复失败:', error);
    process.exit(1);
  });
