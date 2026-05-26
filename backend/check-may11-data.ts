import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dayStart = new Date('2026-05-11T00:00:00.000Z');
  const dayEnd = new Date('2026-05-11T23:59:59.999Z');

  // 检查5月11日的打卡数据
  const punches = await prisma.punchRecord.findMany({
    where: {
      employeeNo: '202604003',
      punchTime: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    orderBy: {
      punchTime: 'asc',
    },
  });

  console.log('5月11日打卡数据:', punches.length);
  punches.forEach(p => {
    console.log('  -', p.punchTime.toISOString(), '账户:', p.accountId, '类型:', p.punchType);
  });

  // 获取员工ID
  const employee = await prisma.employee.findUnique({
    where: { employeeNo: '202604003' },
    select: { id: true },
  });

  if (!employee) {
    console.log('员工不存在');
    return;
  }

  // 检查5月10日的排班
  const schedule10 = await prisma.schedule.findFirst({
    where: {
      employeeId: employee.id,
      scheduleDate: new Date('2026-05-10'),
    },
    include: {
      shift: true,
    },
  });

  console.log('\n5月10日排班:', schedule10 ? '有' : '无');
  if (schedule10) {
    console.log('  班次:', schedule10.shift?.name, '开始:', schedule10.shift?.startTime, '结束:', schedule10.shift?.endTime);
  }

  // 检查5月12日的排班
  const schedule12 = await prisma.schedule.findFirst({
    where: {
      employeeId: employee.id,
      scheduleDate: new Date('2026-05-12'),
    },
    include: {
      shift: true,
    },
  });

  console.log('\n5月12日排班:', schedule12 ? '有' : '无');
  if (schedule12) {
    console.log('  班次:', schedule12.shift?.name, '开始:', schedule12.shift?.startTime, '结束:', schedule12.shift?.endTime);
  }

  // 检查5月10日和12日的班次详细时间
  if (schedule10?.shift) {
    const shift10Start = new Date(`2026-05-10T${schedule10.shift.startTime}:00`);
    const shift10End = new Date(`2026-05-10T${schedule10.shift.endTime}:00`);
    console.log('\n5月10日班次时间:', shift10Start.toISOString(), '-', shift10End.toISOString());
  }

  if (schedule12?.shift) {
    const shift12Start = new Date(`2026-05-12T${schedule12.shift.startTime}:00`);
    const shift12End = new Date(`2026-05-12T${schedule12.shift.endTime}:00`);
    console.log('5月12日班次时间:', shift12Start.toISOString(), '-', shift12End.toISOString());
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
