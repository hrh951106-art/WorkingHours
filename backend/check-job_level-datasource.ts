import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 检查JOB_LEVEL数据源的配置
 */
async function checkJobLevelDataSource() {
  console.log('=== 检查JOB_LEVEL数据源配置 ===\n');

  // 1. 查询JOB_LEVEL数据源
  const jobLevelDataSource = await prisma.dataSource.findFirst({
    where: { code: 'JOB_LEVEL' },
    include: {
      options: {
        where: { isActive: true },
        orderBy: { value: 'asc' },
      },
    },
  });

  if (!jobLevelDataSource) {
    console.log('❌ 未找到JOB_LEVEL数据源');
    await prisma.$disconnect();
    return;
  }

  console.log('JOB_LEVEL数据源:');
  console.log(`  ID: ${jobLevelDataSource.id}`);
  console.log(`  代码: ${jobLevelDataSource.code}`);
  console.log(`  名称: ${jobLevelDataSource.name}`);
  console.log(`  状态: ${jobLevelDataSource.status}`);
  console.log('');

  console.log(`选项数量: ${jobLevelDataSource.options.length}\n`);

  console.log('所有选项:');
  jobLevelDataSource.options.forEach((option, index) => {
    console.log(`  ${index + 1}. ${option.value} -> ${option.label}`);
  });

  console.log('');

  // 2. 检查LEVEL_008
  const level008Option = jobLevelDataSource.options.find(
    (opt: any) => opt.value === 'LEVEL_008'
  );

  console.log('=== LEVEL_008 在JOB_LEVEL中的配置 ===\n');

  if (level008Option) {
    console.log(`✅ 找到LEVEL_008`);
    console.log(`   值: ${level008Option.value}`);
    console.log(`   标签: ${level008Option.label}`);
    console.log('');
    console.log('JOB_LEVEL数据源显示: LEVEL_008 -> ' + level008Option.label);
  } else {
    console.log('❌ JOB_LEVEL中未找到LEVEL_008');
  }

  // 3. 检查jobLevel字段实际使用哪个数据源
  console.log('\n=== 检查jobLevel字段配置 ===\n');

  const jobLevelField = await prisma.customField.findUnique({
    where: { code: 'jobLevel' },
    select: {
      id: true,
      name: true,
      dataSourceId: true,
    },
  });

  if (jobLevelField) {
    console.log(`jobLevel字段使用的数据源ID: ${jobLevelField.dataSourceId}`);

    const actualDataSource = await prisma.dataSource.findUnique({
      where: { id: jobLevelField.dataSourceId },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    if (actualDataSource) {
      console.log(`实际数据源: ${actualDataSource.code} - ${actualDataSource.name}`);
    }
  }

  await prisma.$disconnect();
}

checkJobLevelDataSource()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
