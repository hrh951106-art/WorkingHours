import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkResults() {
  const calcDate = new Date('2026-03-11');

  const allResults = await prisma.allocationResult.findMany({
    where: {
      recordDate: calcDate,
    },
    orderBy: {
      calcTime: 'desc',
    },
    take: 20,
  });

  console.log('3月11日所有的分摊结果（前20条）:\n');
  console.log('总数: ' + allResults.length + '\n');

  // 按配置分组
  const byConfig: Record<number, any[]> = {};
  allResults.forEach(r => {
    if (!byConfig[r.configId]) {
      byConfig[r.configId] = [];
    }
    byConfig[r.configId].push(r);
  });

  for (const [configId, results] of Object.entries(byConfig)) {
    const cfg = await prisma.allocationConfig.findUnique({
      where: { id: +configId },
    });

    console.log('配置: ' + (cfg?.configName || 'N/A') + ' (' + (cfg?.configCode || 'N/A') + ')');
    console.log('  配置ID: ' + configId);
    console.log('  分摊依据: ' + results[0].allocationBasis);
    console.log('  记录数: ' + results.length);
    console.log('  最新计算时间: ' + results[0].calcTime);
    console.log();

    results.forEach((r, idx) => {
      console.log('  ' + (idx + 1) + '. ' + r.sourceEmployeeNo + ' ' + (r.sourceEmployeeName || ''));
      console.log('     批次: ' + r.batchNo);
      console.log('     源工时: ' + r.sourceHours + 'h');
      console.log('     目标: ' + r.targetName);
      console.log('     目标账户ID: ' + (r.targetAccountId || 'NULL'));
      console.log('     分摊工时: ' + r.allocatedHours + 'h');
      console.log();
    });
  }
}

checkResults()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
