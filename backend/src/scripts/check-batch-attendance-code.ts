import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBatchAttendanceCode() {
  console.log('========================================');
  console.log('检查批次号使用的出勤代码');
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

    console.log('分摊结果信息:\n');
    console.log(`  源账户: ${result.sourceAccountName || 'Unknown'}`);
    console.log(`  源账户ID: ${result.sourceAccountId || 'Unknown'}`);
    console.log(`  记录日期: ${result.recordDate.toISOString().split('T')[0]}`);
    console.log(`  配置ID: ${result.configId}`);
    console.log(`  规则ID: ${result.ruleId}`);

    // 查询该日期该源账户的所有工时记录
    console.log('\n========================================');
    console.log('该源账户在该日期的所有工时记录');
    console.log('========================================\n');

    if (result.sourceAccountId) {
      const allRecords = await prisma.calcResult.findMany({
        where: {
          accountId: result.sourceAccountId,
          calcDate: result.recordDate,
        },
        include: {
          employee: true,
        },
      });

      console.log(`找到 ${allRecords.length} 条工时记录\n`);

      // 按出勤代码分组
      const attendanceStats: Record<number, { code: string; name: string; count: number; totalHours: number }> = {};
      for (const record of allRecords) {
        if (record.attendanceCodeId) {
          if (!attendanceStats[record.attendanceCodeId]) {
            const code = await prisma.attendanceCode.findUnique({
              where: { id: record.attendanceCodeId },
            });
            attendanceStats[record.attendanceCodeId] = {
              code: code?.code || 'Unknown',
              name: code?.name || 'Unknown',
              count: 0,
              totalHours: 0,
            };
          }
          attendanceStats[record.attendanceCodeId].count++;
          attendanceStats[record.attendanceCodeId].totalHours += record.actualHours;
        }
      }

      console.log('按出勤代码统计:\n');
      for (const [id, stats] of Object.entries(attendanceStats)) {
        console.log(`  ${stats.code} (${stats.name}): ${stats.count} 条记录, 总工时 ${stats.totalHours}`);
      }

      // 显示所有记录详情
      console.log('\n工时记录详情:\n');
      for (const record of allRecords) {
        const code = await prisma.attendanceCode.findUnique({
          where: { id: record.attendanceCodeId || 0 },
        });

        console.log(`  员工: ${record.employee?.name || 'Unknown'}`);
        console.log(`    出勤代码: ${code?.code || 'Unknown'} (${code?.name || 'Unknown'})`);
        console.log(`    实际工时: ${record.actualHours}`);
        console.log(`    账户: ${record.accountName || 'Unknown'}`);
        console.log();
      }
    }
  }

  console.log('========================================\n');
}

checkBatchAttendanceCode()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
