import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 测试排班查询 ===\n');

  const employeeId = 5;
  const targetDate = new Date('2026-05-12T00:00:00.000Z');

  console.log('1. 目标日期:');
  console.log(`   targetDate: ${targetDate.toISOString()}`);
  console.log(`   targetDate.getTime(): ${targetDate.getTime()}`);

  // 方法1：使用 targetDate 直接查询
  console.log('\n2. 方法1：使用 targetDate 直接查询');
  const schedule1 = await prisma.schedule.findFirst({
    where: {
      employeeId,
      scheduleDate: targetDate,
    },
  });
  console.log(`   找到: ${schedule1 ? '是' : '否'}`);

  // 方法2：使用 dayStart（设置时间为 00:00:00）
  console.log('\n3. 方法2：使用 dayStart（设置时间为 00:00:00）');
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  console.log(`   dayStart: ${dayStart.toISOString()}`);
  console.log(`   dayStart.getTime(): ${dayStart.getTime()}`);

  const schedule2 = await prisma.schedule.findFirst({
    where: {
      employeeId,
      scheduleDate: dayStart,
    },
  });
  console.log(`   找到: ${schedule2 ? '是' : '否'}`);

  // 方法3：使用时间戳比较
  console.log('\n4. 方法3：使用时间戳比较');
  const dayStartTime = dayStart.getTime();
  const nextDayStart = new Date(dayStart);
  nextDayStart.setDate(nextDayStart.getDate() + 1);
  const nextDayStartTime = nextDayStart.getTime();

  console.log(`   范围: ${dayStartTime} ~ ${nextDayStartTime}`);

  const schedules3 = await prisma.schedule.findMany({
    where: {
      employeeId,
      scheduleDate: {
        gte: new Date(dayStartTime),
        lt: new Date(nextDayStartTime),
      },
    },
  });
  console.log(`   找到: ${schedules3.length} 条`);
  schedules3.forEach((s) => {
    console.log(`     ID: ${s.id}, shiftId: ${s.shiftId}`);
  });

  // 方法4：不使用 shiftId 条件
  console.log('\n5. 方法4：不使用 shiftId 条件');
  const schedules4 = await prisma.schedule.findMany({
    where: {
      employeeId,
      scheduleDate: dayStart,
    },
  });
  console.log(`   找到: ${schedules4.length} 条`);
  schedules4.forEach((s) => {
    console.log(`     ID: ${s.id}, shiftId: ${s.shiftId}`);
  });

  // 方法5：使用 shiftId 条件
  console.log('\n6. 方法5：使用 shiftId 条件');
  const schedule5 = await prisma.schedule.findFirst({
    where: {
      employeeId,
      scheduleDate: dayStart,
      shiftId: 2,
    },
  });
  console.log(`   找到: ${schedule5 ? '是 (ID: ' + schedule5.id + ')' : '否'}`);

  // 输出所有排班记录
  console.log('\n7. 所有排班记录:');
  const allSchedules = await prisma.schedule.findMany({
    where: { employeeId },
    orderBy: { scheduleDate: 'asc' },
  });

  allSchedules.forEach((s) => {
    const date = new Date(s.scheduleDate);
    console.log(`   ID: ${s.id}, shiftId: ${s.shiftId}, scheduleDate: ${date.toISOString()}`);
  });
}

main()
  .then(() => console.log('\n测试完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
