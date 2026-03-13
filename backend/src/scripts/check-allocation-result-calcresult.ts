import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllocationResultCalcResult() {
  console.log('========================================');
  console.log('检查AllocationResult的calcResultId对应关系');
  console.log('========================================\n');

  // 1. 查询所有分摊结果
  console.log('第一步：查询所有分摊结果\n');

  const allocationResults = await prisma.allocationResult.findMany({
    orderBy: {
      recordDate: 'desc',
    },
  });

  console.log(`分摊结果记录总数: ${allocationResults.length}\n`);

  for (const result of allocationResults) {
    console.log(`批次号: ${result.batchNo}`);
    console.log(`日期: ${result.recordDate.toISOString().split('T')[0]}`);
    console.log(`源账户: ${result.sourceAccountName || 'Unknown'}`);
    console.log(`calcResultId: ${result.calcResultId || 'NULL'}`);

    // 检查这个calcResultId对应的记录是否还存在
    if (result.calcResultId) {
      const calcResult = await prisma.calcResult.findUnique({
        where: { id: result.calcResultId },
      });

      if (calcResult) {
        console.log(`✓ calcResult记录存在: 账户=${calcResult.accountName}, 员工=${calcResult.employeeNo}, 工时=${calcResult.actualHours}`);
      } else {
        console.log(`✗ calcResult记录不存在！(ID ${result.calcResultId})`);
      }
    }

    console.log();
  }

  // 2. 统计情况
  console.log('\n第二步：统计情况\n');

  let withCalcResultId = 0;
  let calcResultExists = 0;
  let calcResultMissing = 0;

  for (const result of allocationResults) {
    if (result.calcResultId) {
      withCalcResultId++;
      const calcResult = await prisma.calcResult.findUnique({
        where: { id: result.calcResultId },
      });

      if (calcResult) {
        calcResultExists++;
      } else {
        calcResultMissing++;
      }
    }
  }

  console.log(`有calcResultId的分摊结果: ${withCalcResultId}`);
  console.log(`calcResult记录存在的: ${calcResultExists}`);
  console.log(`calcResult记录丢失的: ${calcResultMissing}`);

  console.log('\n========================================\n');
}

checkAllocationResultCalcResult()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
