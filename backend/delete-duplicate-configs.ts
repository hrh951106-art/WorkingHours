import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteDuplicateConfigs() {
  console.log('=== 删除重复的层级配置 ===\n');

  // 删除ID 14和15（旧配置）
  await prisma.accountHierarchyConfig.delete({
    where: { id: 14 },
  });
  console.log('✅ 删除旧Level 6配置 (ID: 14)');

  await prisma.accountHierarchyConfig.delete({
    where: { id: 15 },
  });
  console.log('✅ 删除旧Level 7配置 (ID: 15)');

  // 验证结果
  const configs = await prisma.accountHierarchyConfig.findMany({
    where: { status: 'ACTIVE' },
    orderBy: [{ level: 'asc' }, { sort: 'asc' }],
  });

  console.log(`\n剩余配置数: ${configs.length}\n`);
  configs.forEach((config) => {
    console.log(`Level ${config.level}: ${config.name} (ID: ${config.id})`);
  });

  await prisma.$disconnect();
}

deleteDuplicateConfigs()
  .then(() => {
    console.log('\n删除完��');
    process.exit(0);
  })
  .catch((error) => {
    console.error('删除失败:', error);
    process.exit(1);
  });
