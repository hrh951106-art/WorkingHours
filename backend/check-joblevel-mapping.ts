import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 检查jobLevel数据源的映射配置
 */
async function checkJobLevelMapping() {
  console.log('=== 检查职级映射配置 ===\n');

  // 1. 获取jobLevel字段的配置
  const jobLevelField = await prisma.customField.findUnique({
    where: { code: 'jobLevel' },
    include: {
      dataSource: {
        include: {
          options: {
            where: { isActive: true },
            orderBy: { value: 'asc' },
          },
        },
      },
    },
  });

  if (!jobLevelField) {
    console.log('❌ jobLevel字段不存在');
    await prisma.$disconnect();
    return;
  }

  console.log('jobLevel字段配置:');
  console.log(`  字段ID: ${jobLevelField.id}`);
  console.log(`  字段名称: ${jobLevelField.name}`);
  console.log(`  数据源: ${jobLevelField.dataSource?.name || 'NULL'}`);
  console.log('');

  if (!jobLevelField.dataSource?.options) {
    console.log('❌ 数据源没有配置选项');
    await prisma.$disconnect();
    return;
  }

  console.log(`职级映射配置（共${jobLevelField.dataSource.options.length}个）:\n`);

  jobLevelField.dataSource.options.forEach((option) => {
    console.log(`  ${option.value} -> ${option.label}`);
  });

  console.log('');

  // 2. 检查LEVEL_008的配置
  const level008 = jobLevelField.dataSource.options.find(
    (opt: any) => opt.value === 'LEVEL_008'
  );

  console.log('=== LEVEL_008 配置检查 ===\n');

  if (level008) {
    console.log(`当前配置: LEVEL_008 -> ${level008.label}`);
    console.log('');
    console.log('您期望: LEVEL_008 -> 四类三级');
    console.log('');
    console.log('❌ 配置不匹配！');
    console.log('');
    console.log('需要修改数据源选项，将LEVEL_008的label从"五类一级"改为"四类三级"');
  } else {
    console.log('⚠️ 未找到LEVEL_008的配置');
    console.log('需要添加LEVEL_008的映射');
  }

  await prisma.$disconnect();
}

checkJobLevelMapping()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
