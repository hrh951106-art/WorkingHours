import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';

async function verifyG02Results() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('=== 验证G02分摊结果 ===\n');

  // 查询最新的分摊结果
  const results = await prisma.allocationResult.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    where: {
      configId: 15, // G02配置ID
    },
  });

  console.log(`找到 ${results.length} 条G02分摊结果:\n`);

  for (const result of results) {
    console.log(`结果ID: ${result.id}`);
    console.log(`  批次号: ${result.batchNo}`);
    console.log(`  记录日期: ${result.recordDate.toISOString().split('T')[0]}`);
    console.log(`  配置ID: ${result.configId}`);
    console.log(`  规则ID: ${result.ruleId}`);
    console.log(`  源账户: ${result.sourceAccountName}`);
    console.log(`  源工时: ${result.sourceHours}`);
    console.log(`  目标: ${result.targetName} (${result.targetType})`);
    console.log(`  分摊基础: ${result.allocationBasis}`);
    console.log(`  基础值: ${result.basisValue}`);
    console.log(`  权重: ${result.weightValue}`);
    console.log(`  分摊比例: ${(result.allocationRatio * 100).toFixed(2)}%`);
    console.log(`  分摊工时: ${result.allocatedHours}`);
    console.log('');
  }

  // 统计
  const totalCount = await prisma.allocationResult.count({
    where: { configId: 15 },
  });
  console.log(`G02分摊结果总数: ${totalCount}`);

  // 按批次统计
  const batchResults = await prisma.allocationResult.groupBy({
    by: ['batchNo'],
    where: { configId: 15 },
    _count: true,
    _sum: {
      allocatedHours: true,
    },
  });
  console.log('\n按批次统计:');
  for (const batch of batchResults) {
    console.log(`  批次: ${batch.batchNo}`);
    console.log(`    记录数: ${batch._count}`);
    console.log(`    总分摊工时: ${batch._sum.allocatedHours?.toFixed(2) || 0}`);
  }

  await app.close();
}

verifyG02Results().catch(console.error);
