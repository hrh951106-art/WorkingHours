import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLiSiAllocation() {
  console.log('========================================');
  console.log('检查李四3月11日的工时分摊结果');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');

  // 1. 查询李四的工时计算结果
  console.log('========================================');
  console.log('李四的工时计算记录');
  console.log('========================================\n');

  const lisiResults = await prisma.calcResult.findMany({
    where: {
      calcDate,
      employeeNo: 'A02',
    },
    include: {
      employee: true,
      attendanceCode: true,
    },
    orderBy: {
      attendanceCodeId: 'asc',
    },
  });

  console.log(`找到 ${lisiResults.length} 条工时记录:\n`);

  lisiResults.forEach((r, idx) => {
    console.log(`${idx + 1}. ${r.attendanceCode?.code || 'N/A'} - ${r.attendanceCode?.name || 'N/A'}`);
    console.log(`   工时: ${r.actualHours}h`);
    console.log(`   账户ID: ${r.accountId || 'NULL'}`);
    console.log(`   账户名称: ${r.accountName || 'N/A'}`);
    console.log(`   班次: ${r.shiftName || `班次${r.shiftId}`}`);
    console.log();
  });

  // 2. 查询李四的分摊结果
  console.log('========================================');
  console.log('李四的分摊结果');
  console.log('========================================\n');

  const allocationResults = await prisma.allocationResult.findMany({
    where: {
      recordDate: calcDate,
      sourceEmployeeNo: 'A02',
    },
    include: {
      config: true,
    },
    orderBy: {
      calcTime: 'desc',
    },
  });

  console.log(`找到 ${allocationResults.length} 条分摊结果:\n`);

  allocationResults.forEach((r, idx) => {
    console.log(`${idx + 1}. 批次号: ${r.batchNo}`);
    console.log(`   源工时: ${r.sourceHours}h`);
    console.log(`   源出勤代码: ${r.attendanceCode || 'N/A'}`);
    console.log(`   源账户: ${r.sourceAccountName || 'N/A'}`);
    console.log(`   分摊目标: ${r.targetType} - ${r.targetName}`);
    console.log(`   分摊工时: ${r.allocatedHours}h`);
    console.log(`   目标账户ID: ${r.targetAccountId || 'NULL'}`);
    console.log(`   计算时间: ${r.calcTime}`);
    console.log();
  });

  console.log('========================================');
}

checkLiSiAllocation()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
