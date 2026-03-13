import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanAllocationResults() {
  console.log('========================================');
  console.log('清理旧的分摊结果');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');

  // 删除该日期的所有分摊结果
  const deleted = await prisma.allocationResult.deleteMany({
    where: {
      recordDate: calcDate,
    },
  });

  console.log(`✓ 删除了 ${deleted.count} 条分摊结果`);
  console.log('\n现在可以重新执行分摊计算了');
}

cleanAllocationResults()
  .catch((e) => {
    console.error('清理失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
