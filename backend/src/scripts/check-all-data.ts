import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllData() {
  console.log('========================================');
  console.log('检查所有工时数据');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');

  // 查询当天的所有工时记录
  const allCalcResults = await prisma.calcResult.findMany({
    where: {
      calcDate,
    },
    include: {
      employee: true,
    },
  });

  console.log(`${calcDate.toISOString().split('T')[0]} 的所有工时记录: ${allCalcResults.length} 条\n`);

  // 按出勤代码分组
  const attendanceStats: Record<number, { code: string; name: string; count: number }> = {};
  for (const record of allCalcResults) {
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

  console.log('按出勤代码统计:\n');
  for (const [id, stats] of Object.entries(attendanceStats)) {
    console.log(`  ${stats.code} (${stats.name}): ${stats.count} 条`);
  }

  // 查询所有产线的workshopName
  console.log('\n所有产线的workshopName:\n');

  const allLines = await prisma.productionLine.findMany({
    where: {
      deletedAt: null,
    },
  });

  for (const line of allLines) {
    console.log(`  ${line.name}: workshopId=${line.workshopId}, workshopName="${line.workshopName || 'NULL'}"`);
  }

  console.log('\n========================================\n');
}

checkAllData()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
