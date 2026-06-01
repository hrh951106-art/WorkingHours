import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllLevels() {
  const config = await prisma.accountHierarchyConfig.findFirst({
    orderBy: { id: 'asc' },
  });

  if (!config) {
    console.log('未找到层级配置');
    await prisma.$disconnect();
    return;
  }

  const levels = await prisma.accountHierarchyLevelDetail.findMany({
    where: { configId: config.id },
    orderBy: { level: 'asc' },
  });

  console.log(`找到 ${levels.length} 个层级配置\n`);
  console.log('所有层级配置：');
  levels.forEach((level) => {
    console.log(`Level ${level.level}: ${level.levelName}`);
    console.log(`  mappingType: ${level.mappingType || 'NULL'}`);
    console.log(`  mappingValue: ${level.mappingValue || 'NULL'}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkAllLevels().catch((error) => {
  console.error(error);
  process.exit(1);
});
