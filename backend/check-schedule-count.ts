import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employee = await prisma.employee.findUnique({
    where: { employeeNo: '202604003' },
    select: { id: true },
  });

  if (!employee) {
    console.log('员工不存在');
    return;
  }

  const dayStart = new Date('2026-05-12T00:00:00.000Z');
  const dayEnd = new Date('2026-05-12T23:59:59.999Z');

  const schedules = await prisma.schedule.findMany({
    where: {
      employeeId: employee.id,
      status: 'ACTIVE',
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
  });

  console.log('找到', schedules.length, '个排班记录');

  // For each schedule, calculate work start and end times
  for (const schedule of schedules) {
    console.log('\n排班记录:');
    console.log('  排班日期:', schedule.scheduleDate.toISOString());
    console.log('  班次名称:', schedule.shift?.name);
    console.log('  班次段数:', schedule.shift?.segments?.length || 0);

    let workStartTime: Date;
    let workEndTime: Date;

    if (schedule.adjustedStart && schedule.adjustedEnd) {
      workStartTime = schedule.adjustedStart;
      workEndTime = schedule.adjustedEnd;
    } else {
      const workSegments = schedule.shift?.segments?.filter((seg: any) => seg.type === 'WORK') || [];
      if (workSegments.length > 0) {
        const dateStr = schedule.scheduleDate.toISOString().split('T')[0];
        workStartTime = new Date(`${dateStr}T${workSegments[0].startTime}`);
        const lastSegment = workSegments[workSegments.length - 1];
        workEndTime = new Date(`${dateStr}T${lastSegment.endTime}`);
      } else {
        workStartTime = new Date(schedule.scheduleDate);
        workEndTime = new Date(schedule.scheduleDate);
      }
    }

    console.log('  工作开始时间:', workStartTime.toISOString());
    console.log('  工作结束时间:', workEndTime.toISOString());
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
