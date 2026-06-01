import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 设置position和jobLevel字段的CustomField配置
 * 使getFieldLabel方法能够返回正确的显示名称
 */
async function setupCustomFields() {
  console.log('=== 设置CustomField配置 ===\n');

  try {
    // 1. 创建数据源：岗位数据源
    console.log('1. 创建岗位数据源...');
    const positionDataSource = await prisma.dataSource.upsert({
      where: { code: 'POSITION_DS' },
      update: {},
      create: {
        code: 'POSITION_DS',
        name: '岗位数据源',
        type: 'STATIC',
        status: 'ACTIVE',
        description: '用于存储岗位代码和显示名称的映射',
      },
    });
    console.log(`  ✅ 数据源ID: ${positionDataSource.id}`);

    // 2. 创建岗位字段
    console.log('2. 创��position字段...');
    const positionField = await prisma.customField.upsert({
      where: { code: 'position' },
      update: {
        dataSourceId: positionDataSource.id,
      },
      create: {
        code: 'position',
        name: '岗位',
        type: 'SELECT',
        status: 'ACTIVE',
        dataSourceId: positionDataSource.id,
      },
    });
    console.log(`  ✅ 字段ID: ${positionField.id}`);

    // 3. 添加岗位选项
    console.log('3. 添加岗位选项...');
    const positionOptions = [
      { value: 'POST_012', label: '焊接岗位', isActive: true },
      { value: 'POST_001', label: '管理岗位', isActive: true },
      { value: 'POST_002', label: '技术岗位', isActive: true },
    ];

    // 先删除现有选项
    await prisma.dataSourceOption.deleteMany({
      where: { dataSourceId: positionDataSource.id },
    });

    // 创建新选项
    for (const option of positionOptions) {
      await prisma.dataSourceOption.create({
        data: {
          dataSourceId: positionDataSource.id,
          value: option.value,
          label: option.label,
          isActive: option.isActive,
          sort: 0,
        },
      });
      console.log(`  ✅ ${option.value} -> ${option.label}`);
    }

    // 4. 创建数据源：职级数据源
    console.log('4. 创建职级数据源...');
    const jobLevelDataSource = await prisma.dataSource.upsert({
      where: { code: 'JOBLEVEL_DS' },
      update: {},
      create: {
        code: 'JOBLEVEL_DS',
        name: '职级数据源',
        type: 'STATIC',
        status: 'ACTIVE',
        description: '用于存储职级代码和显示名称的映射',
      },
    });
    console.log(`  ✅ 数据源ID: ${jobLevelDataSource.id}`);

    // 5. 创建职级字段
    console.log('5. 创建jobLevel字段...');
    const jobLevelField = await prisma.customField.upsert({
      where: { code: 'jobLevel' },
      update: {
        dataSourceId: jobLevelDataSource.id,
      },
      create: {
        code: 'jobLevel',
        name: '技能等级',
        type: 'SELECT',
        status: 'ACTIVE',
        dataSourceId: jobLevelDataSource.id,
      },
    });
    console.log(`  ✅ 字段ID: ${jobLevelField.id}`);

    // 6. 添加职级选项
    console.log('6. 添加职级选项...');
    const jobLevelOptions = [
      { value: 'LEVEL_008', label: '五类一级', isActive: true },
      { value: 'LEVEL_006', label: '五类二级', isActive: true },
      { value: 'LEVEL_007', label: '五类三级', isActive: true },
      { value: 'LEVEL_001', label: '一类一级', isActive: true },
      { value: 'LEVEL_002', label: '一类二级', isActive: true },
      { value: 'LEVEL_003', label: '二类一级', isActive: true },
      { value: 'LEVEL_004', label: '三类一级', isActive: true },
      { value: 'LEVEL_005', label: '四类一级', isActive: true },
    ];

    // 先删除现有选项
    await prisma.dataSourceOption.deleteMany({
      where: { dataSourceId: jobLevelDataSource.id },
    });

    // 创建新选项
    for (const option of jobLevelOptions) {
      await prisma.dataSourceOption.create({
        data: {
          dataSourceId: jobLevelDataSource.id,
          value: option.value,
          label: option.label,
          isActive: option.isActive,
          sort: 0,
        },
      });
      console.log(`  ✅ ${option.value} -> ${option.label}`);
    }

    console.log('');
    console.log('✅ 配置完成！');
    console.log('');
    console.log('现在getFieldLabel方法将返回：');
    console.log('  POST_012 -> 焊接岗位');
    console.log('  LEVEL_008 -> 五类一级');
    console.log('  LEVEL_006 -> 五类二级');

  } catch (error) {
    console.error('❌ 配置失败:', error);
    throw error;
  }

  await prisma.$disconnect();
}

setupCustomFields()
  .then(() => {
    console.log('\n操作完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('操作失败:', error);
    process.exit(1);
  });
