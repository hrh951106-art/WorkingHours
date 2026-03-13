import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';

async function checkAllocationResults() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('=== 检查分摊结果数据 ===\n');

  // 统计总数
  const totalCount = await prisma.allocationResult.count();
  console.log(`分摊结果总数: ${totalCount}`);

  // 按日期分组统计
  const resultsByDate = await prisma.$queryRaw`
    SELECT
      DATE(recordDate) as date,
      COUNT(*) as count
    FROM AllocationResult
    GROUP BY DATE(recordDate)
    ORDER BY date DESC
    LIMIT 10
  ` as any[];
  console.log('\n按日期统计（最近10天）:');
  console.table(resultsByDate);

  // 按配置分组统计
  const resultsByConfig = await prisma.$queryRaw`
    SELECT
      configId,
      COUNT(*) as count
    FROM AllocationResult
    GROUP BY configId
    ORDER BY count DESC
  ` as any[];
  console.log('\n按配置统计:');
  console.table(resultsByConfig);

  // 最近添加的几条记录
  const recentResults = await prisma.allocationResult.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      batchNo: true,
      recordDate: true,
      configId: true,
      sourceAccountName: true,
      targetName: true,
      sourceHours: true,
      allocatedHours: true,
      createdAt: true,
    },
  });
  console.log('\n最近5条分摊结果:');
  console.table(recentResults);

  await app.close();
}

checkAllocationResults().catch(console.error);
