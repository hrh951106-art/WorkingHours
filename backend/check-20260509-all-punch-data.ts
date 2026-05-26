import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllPunchData() {
  const employeeNo = '202604003';
  const targetDate = new Date('2026-05-09T00:00:00');
  const nextDate = new Date('2026-05-10T00:00:00');

  console.log('========================================');
  console.log(`检查 ${employeeNo} 在 2026-05-09 的所有打卡相关数据`);
  console.log('========================================\n');

  // 1. 检查原始打卡记录
  console.log('【1️⃣ 原始打卡记录 (PunchRecord)】');
  const punchRecords = await prisma.punchRecord.findMany({
    where: {
      employeeNo,
      punchTime: {
        gte: targetDate,
        lt: nextDate,
      },
    },
    orderBy: { punchTime: 'asc' },
  });

  console.log(`找到 ${punchRecords.length} 条打卡记录\n`);
  punchRecords.forEach((record) => {
    console.log(`  ${record.punchTime.toISOString()} - 设备${record.deviceId} - ${record.punchType}`);
  });

  // 2. 检查旧版摆卡数据 (PunchPair)
  console.log('\n【2️⃣ 旧版摆卡数据 (PunchPair)】');
  const oldPunchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo,
      pairDate: targetDate,
    },
    include: {
      inPunch: true,
      outPunch: true,
      account: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log(`找到 ${oldPunchPairs.length} 条旧版摆卡数据\n`);
  oldPunchPairs.forEach((pair, index) => {
    console.log(`--- 摆卡 ${index + 1} ---`);
    console.log(`  上班卡: ${pair.inPunchTime?.toISOString() || '-'}`);
    console.log(`  下班卡: ${pair.outPunchTime?.toISOString() || '-'}`);
    console.log(`  工时: ${pair.workHours}`);
    console.log(`  班次ID: ${pair.shiftId || '-'}`);
    console.log(`  账户: ${pair.account?.name || '-'}`);
  });

  // 3. 检查精益摆卡数据 (AttendancePunchPair)
  console.log('\n【3️⃣ 精益摆卡数据 (AttendancePunchPair)】');
  const attendancePunchPairs = await prisma.attendancePunchPair.findMany({
    where: {
      employeeNo,
      punchDate: targetDate,
    },
    orderBy: { ruleId: 'asc' },
  });

  console.log(`找到 ${attendancePunchPairs.length} 条精益摆卡数据\n`);
  attendancePunchPairs.forEach((pair, index) => {
    console.log(`--- 精益摆卡 ${index + 1} ---`);
    console.log(`  规则ID: ${pair.ruleId}`);
    console.log(`  规则类型: ${pair.ruleType}`);
    console.log(`  规则名称: ${pair.ruleName || '-'}`);
    console.log(`  上班卡: ${pair.workStartPunchTime?.toISOString() || '-'}`);
    console.log(`  下班卡: ${pair.workEndPunchTime?.toISOString() || '-'}`);
    console.log(`  账户ID: ${pair.accountId || '-'}`);
  });

  // 4. 检查工时计算结果 (CalcResult)
  console.log('\n【4️⃣ 工时计算结果 (CalcResult)】');
  const calcResults = await prisma.calcResult.findMany({
    where: {
      employeeNo,
      calcDate: targetDate,
    },
    include: {
      calculationAttendanceCode: true,
      attendanceCode: true,
    },
  });

  console.log(`找到 ${calcResults.length} 条工时计算结果\n`);
  calcResults.forEach((result) => {
    console.log(`--- 工时结果 ---`);
    console.log(`  新出勤代码: ${result.calculationAttendanceCode?.name || '-'}`);
    console.log(`  旧出勤代码: ${result.attendanceCode?.name || '-'}`);
    console.log(`  标准工时: ${result.standardHours}`);
    console.log(`  实际工时: ${result.actualHours}`);
    console.log(`  状态: ${result.status}`);
  });

  // 5. 检查排班信息
  console.log('\n【5️⃣ 排班信息 (Schedule)】');
  const schedules = await prisma.schedule.findMany({
    where: {
      employeeId: (await prisma.employee.findFirst({
        where: { employeeNo },
        select: { id: true },
      }))?.id,
      scheduleDate: targetDate,
    },
    include: {
      shift: true,
    },
  });

  console.log(`找到 ${schedules.length} 条排班记录\n`);
  if (schedules.length > 0) {
    schedules.forEach((schedule) => {
      console.log(`  班次: ${schedule.shift?.name || '-'} (${schedule.shift?.code || '-'})`);
      console.log(`  类型: ${schedule.shift?.type || '-'}`);
      console.log(`  标准工时: ${schedule.shift?.standardHours || '-'}`);
    });
  }

  // 6. 检查打卡规则
  console.log('\n【6️⃣ 打卡规则配置 (PunchRule)】');
  const punchRules = await prisma.punchRule.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: { priority: 'desc' },
  });

  console.log(`找到 ${punchRules.length} 条活跃的打卡规则\n`);
  punchRules.forEach((rule) => {
    console.log(`  ${rule.name} (ID: ${rule.id}, 类型: ${rule.ruleType}, 优先级: ${rule.priority})`);
  });

  console.log('\n========================================');
}

checkAllPunchData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('错误:', err);
    process.exit(1);
  });
