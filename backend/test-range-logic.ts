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

  // 创建5月10日的排班，班次结束时间为23:00
  // afterShiftMins=300（5小时），延伸到5月11日04:00
  const shift10 = await prisma.shift.findFirst({
    where: { code: 'A00001' },
  });

  if (shift10) {
    // 创建5月10日排班
    await prisma.schedule.create({
      data: {
        employeeId: employee.id,
        shiftId: shift10.id,
        scheduleDate: new Date('2026-05-10'),
        status: 'ACTIVE',
      },
    });
    console.log('已创建5月10日排班');
  }

  // 修改班次段，让班次结束时间为23:00
  await prisma.shiftSegment.updateMany({
    where: { shiftId: shift10!.id },
    data: {
      startTime: '19:00',
      endTime: '23:00',
    },
  });
  console.log('已修改班次时间为19:00-23:00');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
