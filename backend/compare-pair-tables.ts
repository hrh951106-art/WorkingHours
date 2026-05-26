import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 摆卡结果页签对比分析 ===\n');

  console.log('1️⃣ 考勤摆卡结果页签');
  console.log('   前端接口: GET /punch/attendance-punch/results');
  console.log('   后端服务: attendancePunchService.getAttendancePunchResults()');
  console.log('   对应表: AttendancePunchPair (考勤摆卡表)\n');

  const attendanceCount = await prisma.attendancePunchPair.count();
  console.log(`   当前数据量: ${attendanceCount}条`);

  const attendanceSample = await prisma.attendancePunchPair.findFirst({
    include: { employee: true },
  });
  if (attendanceSample) {
    console.log('   示例数据:');
    console.log(`   - ID: ${attendanceSample.id}`);
    console.log(`   - 员工: ${attendanceSample.employeeNo} (${attendanceSample.employee?.name})`);
    console.log(`   - 打卡日期: ${attendanceSample.punchDate.toISOString().split('T')[0]}`);
    console.log(`   - 规则ID: ${attendanceSample.ruleId}`);
    console.log(`   - 规则类型: ${attendanceSample.ruleType}`);
    console.log(`   - 规则名称: ${attendanceSample.ruleName}`);
    console.log(`   - 上班打卡: ${attendanceSample.workStartPunchTime}`);
    console.log(`   - 下班打卡: ${attendanceSample.workEndPunchTime}`);
    console.log(`   - 上班班次: ${attendanceSample.workStartShiftName}`);
    console.log(`   - 下班班次: ${attendanceSample.workEndShiftName}`);
    console.log(`   - 连续班次: ${attendanceSample.isContinuousShift}`);
  }

  console.log('\n   主要特点:');
  console.log('   - 基于打卡规则收卡（Rule-based）');
  console.log('   - 支持多班次（连续班次）');
  console.log('   - 有规则类型：scheduled(有排班) / unscheduled(无排班)');
  console.log('   - 存储上班卡和下班卡信息（支持多个班次）');

  console.log('\n2️⃣ 精益摆卡结果页签');
  console.log('   前端接口: GET /punch/pairing/results');
  console.log('   后端服务: pairingService.getPunchPairs()');
  console.log('   对应表: PunchPair (精益摆卡表)\n');

  const leanCount = await prisma.punchPair.count();
  console.log(`   当前数据量: ${leanCount}条`);

  const leanSample = await prisma.punchPair.findFirst({
    include: { employee: true },
  });
  if (leanSample) {
    console.log('   示例数据:');
    console.log(`   - ID: ${leanSample.id}`);
    console.log(`   - 员工: ${leanSample.employeeNo} (${leanSample.employee?.name})`);
    console.log(`   - 摆卡日期: ${leanSample.pairDate.toISOString().split('T')[0]}`);
    console.log(`   - 班次ID: ${leanSample.shiftId} (null表示未排班)`);
    console.log(`   - 班次名称: ${leanSample.shiftName}`);
    console.log(`   - 上班打卡: ${leanSample.inPunchTime}`);
    console.log(`   - 下班打卡: ${leanSample.outPunchTime}`);
    console.log(`   - 计算工时: ${leanSample.workHours}小时`);
    console.log(`   - 来源组ID: ${leanSample.sourceGroupId}`);
  }

  console.log('\n   主要特点:');
  console.log('   - 基于智能配对算法（Pairing algorithm）');
  console.log('   - 只支持单班次（每天只有一对上下班卡）');
  console.log('   - shiftId可为null（表示未排班/精益打卡）');
  console.log('   - 存储签入签出时间和计算工时');

  console.log('\n3️⃣ 两张表的核心区别：\n');
  console.log('   ❌ 不是同一张表！');
  console.log('   ┌─────────────────┬──────────────────────┬──────────────────────┐');
  console.log('   │     特性        │  AttendancePunchPair  │  PunchPair           │');
  console.log('   ├─────────────────┼──────────────────────┼──────────────────────┤');
  console.log('   │ 用途            │  考勤摆卡            │  精益摆卡            │');
  console.log('   │ 收卡逻辑        │  基于打卡规则        │  基于智能配对        │');
  console.log('   │ 支持班次        │  多班次（连续）      │  单班次              │');
  console.log('   │ 排班支持        │  scheduled/unscheduled│  有排班/未排班       │');
  console.log('   │ 字段名          │  punchDate           │  pairDate            │');
  console.log('   │ 打卡字段        │  workStartPunchTime  │  inPunchTime         │');
  console.log('   │                 │  workEndPunchTime    │  outPunchTime        │');
  console.log('   │ 工时计算        │  不存储工时          │  存储workHours       │');
  console.log('   └─────────────────┴──────────────────────┴──────────────────────┘');

  console.log('\n4️⃣ 计算结果对应关系：\n');
  console.log('   AttendancePunchPair → AttendanceWorkHour (考勤工时)');
  console.log('   PunchPair → CalcResult (精益工时)');

  console.log('\n5️⃣ 前端页签完整对应关系：\n');
  console.log('   ┌────────────────────────┬─────────────────────────┬──────────────┐');
  console.log('   │ 前端页签               │ 后端接口                │ 对应表       │');
  console.log('   ├────────────────────────┼─────────────────────────┼──────────────┤');
  console.log('   │ 考勤摆卡结果           │ /punch/attendance-punch  │ Attendance   │');
  console.log('   │                        │   /results              │ PunchPair    │');
  console.log('   │ 考勤工时结果           │ /calculate/work-hour    │ Attendance   │');
  console.log('   │                        │   -results              │ WorkHour     │');
  console.log('   │ 精益摆卡结果           │ /punch/pairing/results  │ PunchPair    │');
  console.log('   │ 精益工时结果           │ /calculate/results      │ CalcResult   │');
  console.log('   └────────────────────────┴─────────────────────────┴──────────────┘');

  console.log('\n6️⃣ 当前数据统计：\n');
  const leanShiftNull = await prisma.punchPair.count({
    where: { shiftId: null },
  });
  const leanShiftNotNull = await prisma.punchPair.count({
    where: { shiftId: { not: null } },
  });

  console.log(`   AttendancePunchPair: ${attendanceCount}条 (考勤摆卡)`);
  console.log(`   PunchPair总计: ${leanCount}条 (精益摆卡)`);
  console.log(`   - shiftId为null(未排班): ${leanShiftNull}条`);
  console.log(`   - shiftId不为null(有排班): ${leanShiftNotNull}条`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
