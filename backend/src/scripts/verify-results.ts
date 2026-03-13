import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyResults() {
  console.log('========================================');
  console.log('验证分摊结果');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');

  // 查询分摊结果
  const results = await prisma.allocationResult.findMany({
    where: {
      recordDate: calcDate,
    },
    orderBy: [
      { sourceEmployeeNo: 'asc' },
      { targetName: 'asc' },
    ],
  });

  console.log(`分摊结果数量: ${results.length}\n`);

  if (results.length === 0) {
    console.log('❌ 没有分摊结果数据');
    return;
  }

  // 按员工汇总
  const byEmployee: Record<string, any[]> = {};
  results.forEach(r => {
    if (!byEmployee[r.sourceEmployeeNo]) {
      byEmployee[r.sourceEmployeeNo] = [];
    }
    byEmployee[r.sourceEmployeeNo].push(r);
  });

  console.log('========================================');
  console.log('分摊结果明细');
  console.log('========================================\n');

  Object.entries(byEmployee).forEach(([empNo, empResults]) => {
    const empName = empResults[0].sourceEmployeeName;
    const totalSource = empResults.reduce((sum, r) => sum + r.sourceHours, 0);
    const totalAllocated = empResults.reduce((sum, r) => sum + r.allocatedHours, 0);

    console.log(`员工: ${empNo} ${empName}`);
    console.log(`  源工时: ${totalSource}h`);
    console.log(`  分摊工时: ${totalAllocated.toFixed(2)}h`);
    console.log(`  分摊到 ${empResults.length} 个产线:`);

    empResults.forEach(r => {
      console.log(`    - ${r.targetName}: ${r.allocatedHours.toFixed(2)}h`);
      console.log(`      (分摊依据: ${(r.allocationRatio * 100).toFixed(1)}%, 基础值: ${r.basisValue}h)`);
    });
    console.log();
  });

  // 统计
  console.log('========================================');
  console.log('统计汇总');
  console.log('========================================\n');

  const totalSource = results.reduce((sum, r) => sum + r.sourceHours, 0);
  const totalAllocated = results.reduce((sum, r) => sum + r.allocatedHours, 0);
  const batches = [...new Set(results.map(r => r.batchNo))];

  console.log(`总源工时: ${totalSource}h`);
  console.log(`总分摊工时: ${totalAllocated.toFixed(2)}h`);
  console.log(`涉及批次: ${batches.length} 个`);
  console.log(`涉及员工: ${Object.keys(byEmployee).length} 人`);
  console.log(`涉及产线: ${[...new Set(results.map(r => r.targetName))].length} 个`);
}

verifyResults()
  .catch((e) => {
    console.error('验证失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
