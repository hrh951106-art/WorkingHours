import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';

async function verifyDeletion() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('=== 验证删除结果 ===\n');

  // 1. 检查分摊结果
  const allocationResultsCount = await prisma.allocationResult.count();
  console.log(`分摊结果数量: ${allocationResultsCount}`);

  // 2. 检查间接工时记录
  const indirectResultsCount = await prisma.calcResult.count({
    where: {
      attendanceCode: {
        code: 'I06',
      },
    },
  });
  console.log(`间接工时记录数量 (I06): ${indirectResultsCount}`);

  // 3. 检查所有工时记录
  const allResultsCount = await prisma.calcResult.count();
  console.log(`所有工时记录数量: ${allResultsCount}`);

  if (allocationResultsCount === 0 && indirectResultsCount === 0) {
    console.log('\n✓ 所有分摊结果数据已成功删除');
  } else {
    console.log('\n⚠ 还有部分数据未删除');
  }

  await app.close();
}

verifyDeletion().catch(console.error);
