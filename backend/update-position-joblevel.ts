import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient;

async function updatePositionAndJobLevel() {
  console.log('========== 更新岗位和职级配置 ==========\n');

  // 1. 创建新的岗位数据源
  console.log('步骤 1: 创建岗位数据源...');

  // 先删除旧的 POSITION_TITLE 数据源（如果存在）
  const oldPositionDataSource = await prisma.dataSource.findFirst({
    where: { code: 'POSITION_TITLE' },
  });

  if (oldPositionDataSource) {
    console.log(`  - 删除旧数据源: ${oldPositionDataSource.name} (ID: ${oldPositionDataSource.id})`);
    await prisma.dataSourceOption.deleteMany({
      where: { dataSourceId: oldPositionDataSource.id },
    });
    await prisma.dataSource.delete({
      where: { id: oldPositionDataSource.id },
    });
  }

  // 创建新的岗位数据源
  const positionDataSource = await prisma.dataSource.create({
    data: {
      code: 'POSITION',
      name: '岗位',
      description: '员工岗位',
      type: 'CUSTOM',
      status: 'ACTIVE',
      isSystem: true,
    },
  });

  console.log(`  ✓ 创建数据源: ${positionDataSource.name} (ID: ${positionDataSource.id}, code: ${positionDataSource.code})`);

  // 创建岗位选项（代码按序生成：POST_001, POST_002...）
  const positionOptions = [
    { label: '线组长', value: 'POST_001' },
    { label: '工艺工程师', value: 'POST_002' },
    { label: '设备工程师', value: 'POST_003' },
    { label: '质量工程师', value: 'POST_004' },
    { label: '设备技术员', value: 'POST_005' },
    { label: '工艺技术员', value: 'POST_006' },
    { label: '维修技术员', value: 'POST_007' },
    { label: 'SMT操作员', value: 'POST_008' },
    { label: '装配工', value: 'POST_009' },
    { label: '质检员', value: 'POST_010' },
    { label: '仓管员', value: 'POST_011' },
  ];

  console.log(`  - 创建 ${positionOptions.length} 个岗位选项:`);
  for (let i = 0; i < positionOptions.length; i++) {
    const option = positionOptions[i];
    await prisma.dataSourceOption.create({
      data: {
        dataSourceId: positionDataSource.id,
        value: option.value,
        label: option.label,
        sort: i,
        isActive: true,
      },
    });
    console.log(`    ${i + 1}. ${option.label} (${option.value})`);
  }

  // 2. 更新职级数据源
  console.log('\n步骤 2: 更新职级数据源...');

  const jobLevelDataSource = await prisma.dataSource.findFirst({
    where: { code: 'JOB_LEVEL' },
  });

  if (jobLevelDataSource) {
    console.log(`  - 更新数据源: ${jobLevelDataSource.name} (ID: ${jobLevelDataSource.id})`);

    // 删除旧的选项
    await prisma.dataSourceOption.deleteMany({
      where: { dataSourceId: jobLevelDataSource.id },
    });

    // 创建新的职级选项
    const jobLevelOptions = [
      { label: '初级', value: 'LEVEL_001' },
      { label: '中级', value: 'LEVEL_002' },
      { label: '高级', value: 'LEVEL_003' },
      { label: '专家级', value: 'LEVEL_004' },
    ];

    console.log(`  - 创建 ${jobLevelOptions.length} 个职级选项:`);
    for (let i = 0; i < jobLevelOptions.length; i++) {
      const option = jobLevelOptions[i];
      await prisma.dataSourceOption.create({
        data: {
          dataSourceId: jobLevelDataSource.id,
          value: option.value,
          label: option.label,
          sort: i,
          isActive: true,
        },
      });
      console.log(`    ${i + 1}. ${option.label} (${option.value})`);
    }
  } else {
    console.log('  ⚠️  未找到职级数据源 (JOB_LEVEL)');
  }

  // 3. 更新职位字段为岗位
  console.log('\n步骤 3: 更新职位字段为岗位...');

  const workInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'work_info' },
  });

  if (workInfoTab) {
    // 查找职位字段
    const positionField = await prisma.employeeInfoTabField.findFirst({
      where: {
        tabId: workInfoTab.id,
        fieldCode: 'position',
      },
    });

    if (positionField) {
      await prisma.employeeInfoTabField.update({
        where: { id: positionField.id },
        data: {
          fieldName: '岗位',
          fieldCode: 'position', // 保持 fieldCode 不变
          fieldType: 'DATASOURCE',
          dataSourceId: positionDataSource.id,
        },
      });
      console.log(`  ✓ 更新字段: 职位 -> 岗位`);
      console.log(`    - fieldType: TEXT -> DATASOURCE`);
      console.log(`    - dataSourceId: ${positionDataSource.id} (POSITION)`);
    } else {
      console.log('  ⚠️  未找到职位字段');
    }
  }

  // 4. 验证结果
  console.log('\n========== 验证结果 ==========\n');

  // 验证岗位数据源
  const verifyPositionDataSource = await prisma.dataSource.findFirst({
    where: { code: 'POSITION' },
    include: { options: { orderBy: { sort: 'asc' } } },
  });

  console.log('岗位数据源:');
  console.log(`  名称: ${verifyPositionDataSource.name}`);
  console.log(`  代码: ${verifyPositionDataSource.code}`);
  console.log(`  选项数量: ${verifyPositionDataSource.options.length}`);
  console.log(`  选项列表:`);
  verifyPositionDataSource.options.forEach(opt => {
    console.log(`    ${opt.sort + 1}. ${opt.label} (${opt.value})`);
  });

  // 验证职级数据源
  const verifyJobLevelDataSource = await prisma.dataSource.findFirst({
    where: { code: 'JOB_LEVEL' },
    include: { options: { orderBy: { sort: 'asc' } } },
  });

  console.log(`\n职级数据源:`);
  console.log(`  名称: ${verifyJobLevelDataSource.name}`);
  console.log(`  代码: ${verifyJobLevelDataSource.code}`);
  console.log(`  选项数量: ${verifyJobLevelDataSource.options.length}`);
  console.log(`  选项列表:`);
  verifyJobLevelDataSource.options.forEach(opt => {
    console.log(`    ${opt.sort + 1}. ${opt.label} (${opt.value})`);
  });

  // 验证字段配置
  const updatedWorkInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'work_info' },
    include: {
      groups: {
        include: {
          fields: {
            where: {
              OR: [
                { fieldCode: 'position' },
                { fieldCode: 'jobLevel' },
              ],
            },
          },
        },
      },
    },
  });

  console.log(`\n工作信息页签字段配置:`);
  updatedWorkInfoTab.groups.forEach(group => {
    group.fields.forEach(field => {
      const dataSourceName = field.dataSourceId
        ? (field.fieldCode === 'position' ? 'POSITION' : 'JOB_LEVEL')
        : 'null';
      console.log(`  ${field.fieldName} (${field.fieldCode}):`);
      console.log(`    - fieldType: ${field.fieldType}`);
      console.log(`    - dataSource: ${dataSourceName}`);
    });
  });
}

updatePositionAndJobLevel()
  .then(() => {
    console.log('\n✓ 更新完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ 更新失败:', error);
    process.exit(1);
  });
