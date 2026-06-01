import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLevelConfig() {
  console.log('=== 查询Level 6-7层级配置 ===\n');

  const config = await prisma.accountHierarchyConfig.findFirst({
    orderBy: { id: 'asc' },
  });

  if (!config) {
    console.log('未找到层级配置');
    return;
  }

  const levels = await prisma.accountHierarchyLevelDetail.findMany({
    where: {
      configId: config.id,
      level: { in: [6, 7] },
    },
    orderBy: { level: 'asc' },
  });

  console.log(`找到 ${levels.length} 个层级配置\n`);

  levels.forEach((level) => {
    console.log(`Level ${level.level} (${level.levelName}):`);
    console.log(`  ID: ${level.id}`);
    console.log(`  levelCode: ${level.levelCode || 'NULL'}`);
    console.log(`  mappingType: ${level.mappingType || 'NULL'}`);
    console.log(`  mappingValue: ${level.mappingValue || 'NULL'}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkLevelConfig()
  .then(() => {
    console.log('查询完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('查询失败:', error);
    process.exit(1);
  });
