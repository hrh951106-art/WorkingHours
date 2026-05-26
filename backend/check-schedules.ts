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

  // 查找5月11日之前的所有排班
  const previousSchedules = await prisma.schedule.findMany({
    where: {
      employeeId: employee.id,
      scheduleDate: {
        lt: new Date('2026-05-11'),
      },
    },
    include: {
      shift: {
        include: {
          segments: true,
        },
      },
    },
    orderBy: {
      scheduleDate: 'desc',
    },
    take: 5,
  });

  console.log('5月11日之前的排班（最近5条）:');
  previousSchedules.forEach(s => {
    console.log('  -', s.scheduleDate.toISOString().split('T')[0], '班次:', s.shift?.name);
  });

  // 查找5月11日之后的所有排班
  const nextSchedules = await prisma.schedule.findMany({
    where: {
      employeeId: employee.id,
      scheduleDate: {
        gt: new Date('2026-05-11'),
      },
    },
    include: {
      shift: {
        include: {
          segments: true,
        },
      },
    },
    orderBy: {
      scheduleDate: 'asc',
    },
    take: 5,
  });

  console.log('\n5月11日之后的排班（最近5条）:');
  nextSchedules.forEach(s => {
    console.log('  -', s.scheduleDate.toISOString().split('T')[0], '班次:', s.shift?.name);
  });

  // 计算如果找到4月17日排班的收卡范围
  if (previousSchedules.length > 0) {
    const latestPrevious = previousSchedules[0];
    console.log('\n最近的前排班:', latestPrevious.scheduleDate.toISOString().split('T')[0]);

    const shift = latestPrevious.shift;
    if (shift && shift.segments && shift.segments.length > 0) {
      const lastSegment = shift.segments[shift.segments.length - 1];
      const scheduleDate = new Date(latestPrevious.scheduleDate);

      // 计算班次结束时间
      let shiftEnd = new Date(scheduleDate);
      if (lastSegment.endDate === '+0') {
        const [hours, minutes] = lastSegment.endTime.split(':').map(Number);
        shiftEnd.setHours(hours, minutes, 0, 0);
      } else {
        shiftEnd.setDate(shiftEnd.getDate() + 1);
        const [hours, minutes] = lastSegment.endTime.split(':').map(Number);
        shiftEnd.setHours(hours, minutes, 0, 0);
      }

      // 假设afterShiftMins = 120（2小时）
      const afterShiftMins = 120;
      const rangeEnd = new Date(shiftEnd.getTime() + afterShiftMins * 60 * 1000);

      console.log('  班次结束时间:', shiftEnd.toISOString());
      console.log('  收卡范围结束时间（+2小时）:', rangeEnd.toISOString());
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
