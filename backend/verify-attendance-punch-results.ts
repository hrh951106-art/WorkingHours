import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get the attendance punch pairs
  const pairs = await prisma.attendancePunchPair.findMany({
    where: {
      employeeNo: '202604003',
      punchDate: new Date('2026-05-12'),
    },
    orderBy: { id: 'asc' },
  });

  console.log('=== 考勤摆卡结果验证 ===\n');
  console.log('班次段配置:');
  console.log('  段1: 08:00 - 12:00 (上班范围: 06:00-10:00, 下班范围: 10:00-14:00)');
  console.log('  段2: 14:00 - 19:00 (上班范围: 12:00-16:00, 下班范围: 17:00-21:00)');

  console.log('\n所有打卡记录 (中国时间):');
  const punches = await prisma.punchRecord.findMany({
    where: {
      employeeNo: '202604003',
      punchTime: {
        gte: new Date('2026-05-12T00:00:00.000Z'),
        lte: new Date('2026-05-12T23:59:59.999Z'),
      },
    },
    orderBy: { punchTime: 'asc' },
  });

  punches.forEach(p => {
    const chinaTime = new Date(p.punchTime.getTime() + 8 * 60 * 60 * 1000);
    const timeStr = chinaTime.toISOString().substring(11, 19);
    console.log(`  ID:${p.id} ${timeStr} ${p.punchType.padEnd(3)} (账户:${p.accountId})`);
  });

  console.log('\n考勤摆卡结果:');
  for (const pair of pairs) {
    const startChina = new Date(pair.workStartPunchTime.getTime() + 8 * 60 * 60 * 1000);
    const endChina = new Date(pair.workEndPunchTime.getTime() + 8 * 60 * 60 * 1000);
    const startTimeStr = startChina.toISOString().substring(11, 19);
    const endTimeStr = endChina.toISOString().substring(11, 19);

    console.log(`\n记录 ID: ${pair.id}`);
    console.log(`  上班卡: ID:${pair.workStartPunchId} ${startTimeStr}`);
    console.log(`  下班卡: ID:${pair.workEndPunchId} ${endTimeStr}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
