import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 重新检查jobLevel数据源的实际配置
 */
async function checkActualJobLevelData() {
  console.log('=== 重新检查职级数据源配置 ===\n');

  // 1. 直接查询DataSource和DataSourceOption
  const jobLevelDataSource = await prisma.dataSource.findFirst({
    where: { code: 'JOBLEVEL_DS' },
    include: {
      options: {
        where: { isActive: true },
        orderBy: { value: 'asc' },
      },
    },
  });

  if (!jobLevelDataSource) {
    console.log('❌ 未找到JOBLEVEL_DS数据源');
    await prisma.$disconnect();
    return;
  }

  console.log('数据源信息:');
  console.log(`  ID: ${jobLevelDataSource.id}`);
  console.log(`  代码: ${jobLevelDataSource.code}`);
  console.log(`  名称: ${jobLevelDataSource.name}`);
  console.log('');

  console.log(`选项数量: ${jobLevelDataSource.options.length}\n`);

  console.log('所有选项:');
  jobLevelDataSource.options.forEach((option, index) => {
    console.log(`  ${index + 1}. ${option.value} -> ${option.label}`);
  });

  console.log('');

  // 2. 特别检查LEVEL_008
  const level008Option = jobLevelDataSource.options.find(
    (opt: any) => opt.value === 'LEVEL_008'
  );

  console.log('=== LEVEL_008 实际配置 ===\n');

  if (level008Option) {
    console.log(`值: ${level008Option.value}`);
    console.log(`标签: ${level008Option.label}`);
    console.log(`是否激活: ${level008Option.isActive}`);
    console.log('');
    console.log('数据源显示: LEVEL_008 -> ' + level008Option.label);
  } else {
    console.log('❌ 未找到LEVEL_008的选项');
  }

  // 3. 查询所有以JOBLEVEL或LEVEL开头的数据源
  console.log('\n=== 检查其他可能的职级数据源 ===\n');

  const allLevelDataSources = await prisma.dataSource.findMany({
    where: {
      OR: [
        { code: { contains: 'JOBLEVEL' } },
        { code: { contains: 'LEVEL' } },
        { name: { contains: '职级' } },
      ],
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  console.log(`找到 ${allLevelDataSources.length} 个相关数据源:`);
  allLevelDataSources.forEach((ds) => {
    console.log(`  ${ds.code} - ${ds.name}`);
  });

  await prisma.$disconnect();
}

checkActualJobLevelData()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
