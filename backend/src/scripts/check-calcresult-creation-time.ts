import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCalcResultCreationTime() {
  console.log('========================================');
  console.log('检查CalcResult记录的创建时间');
  console.log('========================================\n');

  // 1. 查询所有间接设备的CalcResult
  console.log('第一步：查询间接设备CalcResult的创建时间\n');

  const indirectCalcResults = await prisma.calcResult.findMany({
    where: {
      accountName: {
        endsWith: '间接设备',
      },
    },
    select: {
      id: true,
      accountName: true,
      employeeNo: true,
      actualHours: true,
      calcDate: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`间接设备CalcResult记录数: ${indirectCalcResults.length}\n`);

  for (const record of indirectCalcResults) {
    console.log(`账户: ${record.accountName}`);
    console.log(`  员工: ${record.employeeNo}, 工时: ${record.actualHours}`);
    console.log(`  计算日期: ${record.calcDate.toISOString().split('T')[0]}`);
    console.log(`  创建时间: ${record.createdAt.toISOString()}`);
    console.log(`  更新时间: ${record.updatedAt.toISOString()}`);
    console.log();
  }

  // 2. 查询最近的AllocationResult
  console.log('第二步：查询最近的AllocationResult记录\n');

  const recentAllocationResults = await prisma.allocationResult.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
    select: {
      id: true,
      batchNo: true,
      recordDate: true,
      configId: true,
      sourceAccountName: true,
      targetName: true,
      allocatedHours: true,
      createdAt: true,
    },
  });

  console.log(`最近的AllocationResult记录数: ${recentAllocationResults.length}\n`);

  if (recentAllocationResults.length > 0) {
    console.log('最近的AllocationResult记录:\n');

    for (const result of recentAllocationResults) {
      console.log(`批次号: ${result.batchNo}`);
      console.log(`  日期: ${result.recordDate.toISOString().split('T')[0]}`);
      console.log(`  配置ID: ${result.configId}`);
      console.log(`  创建时间: ${result.createdAt.toISOString()}`);
      console.log();
    }
  } else {
    console.log('✗ 没有找到任何AllocationResult记录');
  }

  // 3. 比较时间
  console.log('第三步：分析时间关系\n');

  if (indirectCalcResults.length > 0 && recentAllocationResults.length > 0) {
    const latestCalcResult = indirectCalcResults[0];
    const latestAllocationResult = recentAllocationResults[0];

    console.log(`最新CalcResult创建时间: ${latestCalcResult.createdAt.toISOString()}`);
    console.log(`最新AllocationResult创建时间: ${latestAllocationResult.createdAt.toISOString()}`);

    const timeDiff = latestCalcResult.createdAt.getTime() - latestAllocationResult.createdAt.getTime();
    console.log(`时间差: ${timeDiff}ms (${(timeDiff / 1000).toFixed(2)}s)`);

    if (timeDiff > 0) {
      console.log(`✓ CalcResult比AllocationResult晚创建 ${(timeDiff / 1000).toFixed(2)}秒`);
      console.log(`  这说明CalcResult不是通过分摊逻辑创建的，或者AllocationResult被删除了`);
    } else {
      console.log(`✓ AllocationResult比CalcResult晚创建 ${(-timeDiff / 1000).toFixed(2)}秒`);
    }
  }

  // 4. 检查是否有重复的CalcResult记录
  console.log('\n第四步：检查是否有重复的CalcResult\n');

  const duplicateCheck = await prisma.calcResult.groupBy({
    by: ['accountName', 'employeeNo', 'calcDate', 'attendanceCodeId'],
    where: {
      accountName: {
        endsWith: '间接设备',
      },
    },
    _count: {
      id: true,
    },
    having: {
      id: {
        _count: {
          gt: 1,
        },
      },
    },
  });

  if (duplicateCheck.length > 0) {
    console.log(`发现 ${duplicateCheck.length} 组重复的CalcResult记录:\n`);
    for (const dup of duplicateCheck) {
      console.log(`  账户: ${dup.accountName}, 员工: ${dup.employeeNo}, 日期: ${dup.calcDate.toISOString().split('T')[0]}`);
      console.log(`  重复次数: ${dup._count.id}`);
    }
  } else {
    console.log('✓ 没有发现重复的CalcResult记录');
  }

  console.log('\n========================================\n');
}

checkCalcResultCreationTime()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
