import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyClearResults() {
  try {
    // 检查分摊结果数量
    const resultCount = await prisma.allocationResult.count({
      where: { deletedAt: null },
    });

    console.log(`分摊结果记录数: ${resultCount}`);

    // 检查配置数量
    const configCount = await prisma.allocationConfig.count({
      where: { deletedAt: null },
    });

    console.log(`分摊配置数量: ${configCount}`);

    if (resultCount === 0) {
      console.log('✓ 分摊结果数据已成功清空');
    } else {
      console.log(`✗ 仍有 ${resultCount} 条分摊结果记录`);
    }

  } catch (error) {
    console.error('验证失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyClearResults();
