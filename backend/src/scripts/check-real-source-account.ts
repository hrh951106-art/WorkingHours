import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRealSourceAccount() {
  console.log('========================================');
  console.log('检查批次号的源账户');
  console.log('========================================\n');

  const batchNo = 'ALC17733093471128370';

  // 查询分摊结果
  const allocationResults = await prisma.allocationResult.findMany({
    where: {
      batchNo: batchNo,
    },
  });

  if (allocationResults.length > 0) {
    const result = allocationResults[0];

    console.log('分摊结果中的源账户信息:\n');
    console.log(`  源账户ID: ${result.sourceAccountId}`);
    console.log(`  源账户名称: ${result.sourceAccountName || 'Unknown'}`);

    // 查询源账户详细信息
    if (result.sourceAccountId) {
      const sourceAccount = await prisma.laborAccount.findUnique({
        where: { id: result.sourceAccountId },
      });

      if (sourceAccount) {
        console.log('\n实际账户信息:\n');
        console.log(`  账户ID: ${sourceAccount.id}`);
        console.log(`  账户名称: ${sourceAccount.name}`);
        console.log(`  账户类型: ${sourceAccount.type}`);
        console.log(`  账户层级: ${sourceAccount.level}`);

        try {
          const hierarchyValues = JSON.parse(sourceAccount.hierarchyValues || '{}');
          console.log(`  层级信息:`);
          console.log(`    orgId: ${hierarchyValues.orgId || 'Unknown'}`);
          console.log(`    workshopId: ${hierarchyValues.workshopId || 'Unknown'}`);
          console.log(`    lineId: ${hierarchyValues.lineId || 'Unknown'}`);
        } catch (e) {
          console.log(`  层级信息: 解析失败`);
        }
      } else {
        console.log(`\n✗ 未找到ID为 ${result.sourceAccountId} 的账户`);
      }
    }

    // 查询该账户在2026-03-11的工时记录
    console.log('\n========================================');
    console.log('该账户在2026-03-11的工时记录');
    console.log('========================================\n');

    const targetDate = new Date('2026-03-11');
    const targetDateRecords = await prisma.calcResult.findMany({
      where: {
        accountId: result.sourceAccountId,
        calcDate: targetDate,
      },
      include: {
        employee: true,
      },
    });

    console.log(`找到 ${targetDateRecords.length} 条工时记录\n`);

    if (targetDateRecords.length > 0) {
      for (const record of targetDateRecords) {
        console.log(`  员工: ${record.employee?.name || 'Unknown'}`);
        console.log(`    出勤代码ID: ${record.attendanceCodeId || 'Unknown'}`);
        console.log(`    实际工时: ${record.actualHours}`);
        console.log();
      }
    }

    // 按出勤代码分组
    const attendanceStats: Record<number, number> = {};
    for (const record of targetDateRecords) {
      const codeId = record.attendanceCodeId || 0;
      attendanceStats[codeId] = (attendanceStats[codeId] || 0) + 1;
    }

    console.log('按出勤代码统计:\n');
    for (const [codeId, count] of Object.entries(attendanceStats)) {
      const code = await prisma.attendanceCode.findUnique({
        where: { id: Number(codeId) },
      });
      console.log(`  ${code?.code || 'Unknown'} (${code?.name || 'Unknown'}): ${count} 条`);
    }
  }

  console.log('\n========================================\n');
}

checkRealSourceAccount()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
