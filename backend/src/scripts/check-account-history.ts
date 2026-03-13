import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAccountHistory() {
  console.log('========================================');
  console.log('检查账户历史记录');
  console.log('========================================\n');

  const accountId = 137;

  // 查询该账户的所有工时记录
  const allRecords = await prisma.calcResult.findMany({
    where: {
      accountId: accountId,
    },
    orderBy: {
      calcDate: 'desc',
    },
    take: 50,
  });

  console.log(`账户ID 137 的工时记录（最近50条）: ${allRecords.length} 条\n`);

  if (allRecords.length > 0) {
    // 按日期分组
    const dateStats: Record<string, number> = {};
    for (const record of allRecords) {
      const date = record.calcDate.toISOString().split('T')[0];
      dateStats[date] = (dateStats[date] || 0) + 1;
    }

    console.log('按日期统计:\n');
    for (const [date, count] of Object.entries(dateStats)) {
      console.log(`  ${date}: ${count} 条`);
    }

    // 按出勤代码分组
    const attendanceStats: Record<number, { code: string; name: string; count: number }> = {};
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
          };
        }
        attendanceStats[record.attendanceCodeId].count++;
      }
    }

    console.log('\n按出勤代码统计:\n');
    for (const [id, stats] of Object.entries(attendanceStats)) {
      console.log(`  ${stats.code} (${stats.name}): ${stats.count} 条`);
    }
  } else {
    console.log('该账户没有任何工时记录');
  }

  // 查询账户详情
  console.log('\n========================================');
  console.log('账户详情');
  console.log('========================================\n');

  const account = await prisma.laborAccount.findUnique({
    where: { id: accountId },
  });

  if (account) {
    console.log(`账户名称: ${account.name}`);
    console.log(`账户类型: ${account.type}`);
    console.log(`账户层级: ${account.level}`);
    console.log(`父账户ID: ${account.parentId || 'Unknown'}`);

    if (account.parentId) {
      const parentAccount = await prisma.laborAccount.findUnique({
        where: { id: account.parentId },
      });
      console.log(`父账户名称: ${parentAccount?.name || 'Unknown'}`);
    }
  }

  console.log('\n========================================\n');
}

checkAccountHistory()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
