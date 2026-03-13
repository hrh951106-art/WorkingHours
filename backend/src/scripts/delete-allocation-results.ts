import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';

async function deleteAllAllocationResults() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('=== 删除所有分摊结果数据 ===\n');

  try {
    // 1. 查询并显示当前的分摊结果数量
    const allocationResultsCount = await prisma.allocationResult.count();
    console.log(`当前分摊结果数量: ${allocationResultsCount}`);

    if (allocationResultsCount === 0) {
      console.log('没有分摊结果需要删除');
      await app.close();
      return;
    }

    // 2. 删除所有分摊结果
    console.log('\n开始删除分摊结果...');
    const deleteResult = await prisma.allocationResult.deleteMany({});
    console.log(`✓ 删除了 ${deleteResult.count} 条分摊结果`);

    // 3. 查询并显示分摊后生成的工时记录（I06 - 间接工时）
    // 这些记录通常在分摊后生成，也可以选择删除
    const indirectResultsCount = await prisma.calcResult.count({
      where: {
        attendanceCode: {
          code: 'I06', // 间接工时
        },
      },
    });
    console.log(`\n间接工时记录数量 (I06): ${indirectResultsCount}`);

    // 4. 询问是否删除分摊后生成的工时记录
    if (indirectResultsCount > 0) {
      console.log('\n是否同时删除分摊后生成的间接工时记录？');
      console.log('注意：这些记录是分摊计算时自动生成的工时记录');

      // 自动删除间接工时记录（因为它们是分摊计算生成的）
      console.log('\n开始删除间接工时记录...');
      const deleteCalcResult = await prisma.calcResult.deleteMany({
        where: {
          attendanceCode: {
            code: 'I06',
          },
        },
      });
      console.log(`✓ 删除了 ${deleteCalcResult.count} 条间接工时记录`);
    }

    console.log('\n=== 删除完成 ===');
    console.log('所有分摊结果数据已成功删除');

  } catch (error: any) {
    console.error('删除失败:', error.message);
    throw error;
  } finally {
    await app.close();
  }
}

deleteAllAllocationResults().catch(console.error);
