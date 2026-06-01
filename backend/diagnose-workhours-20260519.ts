import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('=== 深入诊断：为什么2026-05-19没有工时结果 ===\n');

  const targetDate = new Date('2026-05-19');
  targetDate.setHours(0, 0, 0, 0);

  // 1. 检查AttendanceWorkHourResult表（考勤工时结果）
  console.log('1. 检查考勤工时结果表 (AttendanceWorkHourResult):');
  const attendanceResults = await prisma.attendanceWorkHourResult.findMany({
    where: {
      workDate: targetDate,
    },
  });

  console.log(`   找到 ${attendanceResults.length} 条考勤工时结果`);

  if (attendanceResults.length > 0) {
    for (const result of attendanceResults.slice(0, 5)) {
      console.log(`   - 员工: ${result.employeeNo}, 工时: ${result.workHours}, 账户: ${result.accountName}`);
    }
  }

  // 2. 检查打卡记录
  console.log('\n2. 检查打卡记录 (PunchRecord):');
  const punchRecords = await prisma.punchRecord.findMany({
    where: {
      recordDate: targetDate,
    },
    take: 5,
  });

  console.log(`   找到 ${punchRecords.length} 条打卡记录`);

  if (punchRecords.length > 0) {
    for (const record of punchRecords) {
      console.log(`   - 员工: ${record.employeeNo}, 状态: ${record.status}`);
    }
  }

  // 3. 检查配对结果
  console.log('\n3. 检查配对结果 (PunchPair):');
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      workDate: targetDate,
    },
    take: 5,
  });

  console.log(`   找到 ${punchPairs.length} 条配对结果`);

  if (punchPairs.length > 0) {
    for (const pair of punchPairs) {
      console.log(`   - 员工: ${pair.employeeNo}, 上班: ${pair.punchInTime}, 下班: ${pair.punchOutTime}`);
    }
  }

  // 4. 检查出勤计算结果
  console.log('\n4. 检查出勤计算结果 (AttendanceCalcResult):');
  const attendanceCalcResults = await prisma.attendanceCalcResult.findMany({
    where: {
      workDate: targetDate,
    },
    take: 5,
  });

  console.log(`   找到 ${attendanceCalcResults.length} 条出勤计算结果`);

  if (attendanceCalcResults.length > 0) {
    for (const result of attendanceCalcResults) {
      console.log(`   - 员工: ${result.employeeNo}, 出勤代码: ${result.attendanceCode}, 工时: ${result.workHours}`);
    }
  }

  // 5. 检查排班记录
  console.log('\n5. 检查排班记录 (ShiftSchedule):');
  const shiftSchedules = await prisma.shiftSchedule.findMany({
    where: {
      scheduleDate: targetDate,
    },
    take: 5,
  });

  console.log(`   找到 ${shiftSchedules.length} 条排班记录`);

  if (shiftSchedules.length > 0) {
    for (const schedule of shiftSchedules) {
      console.log(`   - 员工ID: ${schedule.employeeId}, 班次ID: ${schedule.shiftId}`);
    }
  }

  // 6. 检查其他日期的工时结果（对比）
  console.log('\n6. 对比：检查其他日期的工时结果:');
  const otherDateWorkResults = await prisma.workHourResult.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      workDate: 'desc',
    },
    take: 5,
  });

  console.log(`   最近的工时结果:`);
  for (const result of otherDateWorkResults) {
    console.log(`   - 日期: ${result.workDate.toISOString().substring(0, 10)}, 员工: ${result.employeeNo}, 工时: ${result.workHours}, 出勤代码: ${result.attendanceCode}`);
  }

  // 7. 检查是否需要执行工时推送
  console.log('\n7. 检查工时推送记录:');
  const pushResults = await prisma.workHourPushResult.findMany({
    where: {
      workDate: targetDate,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  });

  console.log(`   找到 ${pushResults.length} 条工时推送记录`);

  if (pushResults.length > 0) {
    for (const result of pushResults) {
      console.log(`   - 批次号: ${result.batchNo}, 状态: ${result.status}, 创建时间: ${result.createdAt}`);
    }
  } else {
    console.log(`   ❌ 没有工时推送记录，说明可能没有执行工时推送或推送失败`);
  }

  // 8. 总结
  console.log('\n=== 诊断总结 ===');
  console.log('关键发现:');
  console.log(`1. 考勤工时结果表记录数: ${attendanceResults.length}`);
  console.log(`2. 打卡记录数: ${punchRecords.length}`);
  console.log(`3. 配对结果数: ${punchPairs.length}`);
  console.log(`4. 出勤计算结果数: ${attendanceCalcResults.length}`);
  console.log(`5. 排班记录数: ${shiftSchedules.length}`);
  console.log(`6. 工时推送记录数: ${pushResults.length}`);

  if (attendanceResults.length === 0) {
    console.log('\n❌ 根本原因：2026-05-19没有考勤工时结果，导致WorkHourResult表中没有数据');
    console.log('   可能的原因：');
    console.log('   1. 没有执行考勤工时计算');
    console.log('   2. 考勤工时计算失败');
    console.log('   3. 没有执行工时推送到WorkHourResult表');
  }
}

diagnose()
  .then(() => {
    console.log('\n诊断完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('诊断失败:', error);
    process.exit(1);
  });
