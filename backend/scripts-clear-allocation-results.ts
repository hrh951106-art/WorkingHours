import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllocationResults() {
  try {
    console.log('开始清理分摊结果数据...');

    // 删除所有分摊结果
    const resultDeleteCount = await prisma.allocationResult.deleteMany({});

    console.log(`✓ 已删除 ${resultDeleteCount.count} 条分摊结果记录`);

    console.log('清理完成！');
  } catch (error) {
    console.error('清理失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearAllocationResults();
