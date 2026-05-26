// 测试修复后的 getScheduleWithTransfer 逻辑
// 复制修复后的逻辑

async function testGetScheduleWithTransfer(employeeNo: string, calcDate: Date, shiftId: number) {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  // 将 calcDate 转换为本地时间的 00:00:00
  const dayStart = new Date(calcDate.getFullYear(), calcDate.getMonth(), calcDate.getDate(), 0, 0, 0, 0);
  const nextDayStart = new Date(dayStart);
  nextDayStart.setDate(nextDayStart.getDate() + 1);

  console.log('输入参数:');
  console.log(`  employeeNo: ${employeeNo}`);
  console.log(`  calcDate: ${calcDate.toISOString()}`);
  console.log(`  shiftId: ${shiftId}`);
  console.log('');

  console.log('查询条件:');
  console.log(`  dayStart: ${dayStart.toISOString()}`);
  console.log(`  dayStart.getTime(): ${dayStart.getTime()}`);
  console.log(`  nextDayStart: ${nextDayStart.toISOString()}`);
  console.log(`  nextDayStart.getTime(): ${nextDayStart.getTime()}`);
  console.log('');

  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
  });

  if (!employee) {
    console.log('员工不存在');
    await prisma.$disconnect();
    return null;
  }

  console.log('员工信息:');
  console.log(`  员工ID: ${employee.id}`);
  console.log('');

  // 使用时间戳范围查询，避免时区问题
  const schedule = await prisma.schedule.findFirst({
    where: {
      employeeId: employee.id,
      scheduleDate: {
        gte: dayStart,
        lt: nextDayStart,
      },
      ...(shiftId && { shiftId }),
    },
    include: {
      shift: {
        include: {
          segments: {
            orderBy: { startTime: 'asc' },
          },
        },
      },
    },
  });

  console.log('查询结果:');
  if (schedule) {
    console.log(`  找到排班: ✓`);
    console.log(`  排班ID: ${schedule.id}`);
    console.log(`  班次ID: ${schedule.shiftId}`);
    console.log(`  scheduleDate: ${new Date(schedule.scheduleDate).toISOString()}`);

    if (schedule.adjustedSegments) {
      try {
        const adjustedSegments = JSON.parse(schedule.adjustedSegments);
        console.log(`  adjustedSegments:`);
        adjustedSegments.forEach((seg: any, idx: number) => {
          console.log(`    段${idx + 1}: ID=${seg.id}, 账户ID=${seg.accountId || 'null'}`);
        });
      } catch (e) {
        console.log('  解析 adjustedSegments 失败:', e);
      }
    } else {
      console.log(`  adjustedSegments: null`);
    }
  } else {
    console.log(`  找到排班: ✗`);
  }

  await prisma.$disconnect();
  return schedule;
}

async function main() {
  console.log('=== 测试修复后的 getScheduleWithTransfer ===\n');

  const result = await testGetScheduleWithTransfer(
    '202604003',
    new Date('2026-05-12T00:00:00.000Z'),
    2
  );

  console.log('\n测试完成');
}

main();
