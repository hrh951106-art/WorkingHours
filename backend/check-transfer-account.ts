import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查转移账户读取逻辑 ===\n');

  const employeeNo = '202604003';
  const targetDate = new Date('2026-05-12T00:00:00.000Z');

  // 1. 查询员工信息
  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
  });

  console.log('1. 员工信息:');
  console.log(`   员工ID: ${employee?.id}`);
  console.log(`   员工工号: ${employee?.employeeNo}`);

  // 2. 查询排班信息
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);

  const schedule = await prisma.schedule.findFirst({
    where: {
      employeeId: employee?.id,
      scheduleDate: dayStart,
    },
  });

  console.log('\n2. 排班信息:');
  console.log(`   排班ID: ${schedule?.id}`);
  console.log(`   班次ID: ${schedule?.shiftId}`);

  if (schedule?.adjustedSegments) {
    console.log(`   adjustedSegments (原始JSON): ${schedule.adjustedSegments}`);

    try {
      const adjustedSegments = JSON.parse(schedule.adjustedSegments);
      console.log('\n   解析后的班段:');
      adjustedSegments.forEach((seg: any, idx: number) => {
        console.log(`     段${idx + 1}: ID=${seg.id}, 名称=${seg.name}, 账户ID=${seg.accountId || 'null'}`);
      });

      // 尝试读取段2的转移账户
      const seg2 = adjustedSegments.find((s: any) => s.id === 13);
      console.log(`\n   段2 (ID=13) 的转移账户ID: ${seg2?.accountId || 'null'}`);

      if (seg2?.accountId) {
        const transferAccount = await prisma.laborAccount.findUnique({
          where: { id: seg2.accountId },
        });
        console.log(`   转移账户: ${transferAccount?.namePath || 'null'}`);
      }
    } catch (e) {
      console.log('   解析失败:', e);
    }
  } else {
    console.log('   adjustedSegments: null');
  }

  // 3. 检查 calculateFromPunchPair 方法的调用情况
  console.log('\n3. 检查摆卡记录 193 的调用情况:');
  const punchPair = await prisma.punchPair.findUnique({
    where: { id: 193 },
  });

  console.log(`   摆卡时间: ${punchPair?.inPunchTime?.toISOString()} ~ ${punchPair?.outPunchTime?.toISOString()}`);
  console.log(`   班次ID: ${punchPair?.shiftId}`);

  // 模拟 calculateFromPunchPair 中的 getScheduleWithTransfer 调用
  const scheduleFromMethod = await prisma.schedule.findFirst({
    where: {
      employeeId: employee?.id,
      scheduleDate: dayStart,
      shiftId: punchPair?.shiftId, // 注意：这里使用了 shiftId 条件
    },
  });

  console.log('\n4. getScheduleWithTransfer 查询结果:');
  console.log(`   找到排班: ${scheduleFromMethod ? '是' : '否'}`);
  console.log(`   排班ID: ${scheduleFromMethod?.id}`);

  if (scheduleFromMethod?.adjustedSegments) {
    try {
      const adjustedSegments = JSON.parse(scheduleFromMethod.adjustedSegments);
      console.log('\n   解析后的班段:');
      adjustedSegments.forEach((seg: any, idx: number) => {
        console.log(`     段${idx + 1}: ID=${seg.id}, 账户ID=${seg.accountId || 'null'}`);
      });
    } catch (e) {
      console.log('   解析失败:', e);
    }
  }

  // 5. 查询所有摆卡记录
  console.log('\n5. 所有摆卡记录:');
  const allPunchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo,
      pairDate: targetDate,
    },
    include: {
      account: true,
    },
    orderBy: { inPunchTime: 'asc' },
  });

  allPunchPairs.forEach((pair, idx) => {
    console.log(`   摆卡${idx + 1} (ID=${pair.id}):`);
    console.log(`     时间: ${pair.inPunchTime?.toISOString()} ~ ${pair.outPunchTime?.toISOString()}`);
    console.log(`     班次ID: ${pair.shiftId}`);
    console.log(`     账户: ${pair.account?.namePath || 'null'}`);
  });

  // 6. 查询所有工时结果
  console.log('\n6. 所有工时结果:');
  const calcResults = await prisma.calcResult.findMany({
    where: {
      employeeNo,
      calcDate: targetDate,
    },
    include: {
      calculationAttendanceCode: true,
    },
    orderBy: { punchInTime: 'asc' },
  });

  calcResults.forEach((result, idx) => {
    console.log(`   结果${idx + 1}:`);
    console.log(`     时间: ${result.punchInTime?.toISOString()} ~ ${result.punchOutTime?.toISOString()}`);
    console.log(`     账户: ${result.accountName || 'null'}`);
    console.log(`     出勤代码: ${result.calculationAttendanceCode?.name || 'null'}`);
  });
}

main()
  .then(() => console.log('\n检查完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
