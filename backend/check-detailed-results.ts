import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const pairs = await prisma.attendancePunchPair.findMany({
    where: {
      employeeNo: '202604003',
      punchDate: new Date('2026-05-11T16:00:00.000Z'),
    },
    orderBy: { id: 'asc' },
  });

  console.log('=== 考勤摆卡结果详情 ===\n');

  // Get all punches
  const punches = await prisma.punchRecord.findMany({
    where: {
      employeeNo: '202604003',
      punchTime: {
        gte: new Date('2026-05-11T15:00:00.000Z'),
        lte: new Date('2026-05-12T16:00:00.000Z'),
      },
    },
    orderBy: { punchTime: 'asc' },
  });

  console.log('所有打卡记录 (中国时间):');
  punches.forEach(p => {
    const chinaTime = new Date(p.punchTime.getTime() + 8 * 60 * 60 * 1000);
    const timeStr = chinaTime.toISOString().substring(11, 19);
    const dateStr = chinaTime.toISOString().substring(0, 10);
    console.log(`  ${dateStr} ${timeStr} ID:${p.id} ${p.punchType.padEnd(3)}`);
  });

  console.log('\n考勤摆卡记录:');
  for (const pair of pairs) {
    const startChina = new Date(pair.workStartPunchTime.getTime() + 8 * 60 * 60 * 1000);
    const endChina = new Date(pair.workEndPunchTime.getTime() + 8 * 60 * 60 * 1000);
    const startTimeStr = startChina.toISOString().substring(11, 19);
    const endTimeStr = endChina.toISOString().substring(11, 19);

    console.log(`\n记录 ID: ${pair.id}`);
    console.log(`  上班卡: ID:${pair.workStartPunchId || 'null'} ${startTimeStr}`);
    console.log(`  下班卡: ID:${pair.workEndPunchId || 'null'} ${endTimeStr}`);
    console.log(`  连续班次: ${pair.isContinuousShift}`);

    // Check if workStartShiftId and workEndShiftId are set
    console.log(`  上班班次ID: ${pair.workStartShiftId || 'null'}`);
    console.log(`  下班班次ID: ${pair.workEndShiftId || 'null'}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
