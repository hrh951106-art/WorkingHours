import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dayStart = new Date('2026-05-12T00:00:00.000Z');
  const dayEnd = new Date('2026-05-12T23:59:59.999Z');

  // Check schedules - need to get employee first
  const employee = await prisma.employee.findUnique({
    where: { employeeNo: '202604003' },
    select: { id: true },
  });

  if (!employee) {
    console.log('员工不存在');
    return;
  }

  const schedules = await prisma.schedule.findMany({
    where: {
      employeeId: employee.id,
      scheduleDate: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    include: {
      shift: {
        include: {
          segments: true,
        },
      },
    },
    orderBy: { scheduleDate: 'asc' },
  });

  console.log('找到', schedules.length, '个排班:');
  schedules.forEach((s, i) => {
    console.log(`\n排班 ${i+1}:`);
    console.log(`  排班日期: ${s.scheduleDate.toISOString()}`);
    console.log(`  班次名称: ${s.shift?.name || 'null'}`);
    if (s.shift?.segments) {
      s.shift.segments.forEach((seg, j) => {
        console.log(`  段 ${j+1}: ${seg.startTime} - ${seg.endTime}`);
      });
    }
  });

  // Check punch records
  const punches = await prisma.punchRecord.findMany({
    where: {
      employeeNo: '202604003',
      punchTime: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    orderBy: { punchTime: 'asc' },
  });

  console.log('\n\n找到', punches.length, '条打卡记录:');
  punches.forEach((p, i) => {
    const chinaTime = new Date(p.punchTime.getTime() + 8 * 60 * 60 * 1000);
    console.log(`${i+1}. ${chinaTime.toISOString().replace('T', ' ').substring(0, 19)} (类型: ${p.punchType})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
