import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLeanCalculation() {
  const employeeNo = '202604003';
  const targetDate = '2026-05-09';

  console.log('========================================');
  console.log(`排查员工 ${employeeNo} 在 ${targetDate} 的精益工时计算问题`);
  console.log('========================================\n');

  // 1. 查询精益摆卡结果
  console.log('【1️⃣ 查询精益摆卡结果】');
  const attendancePunchPairs = await prisma.attendancePunchPair.findMany({
    where: {
      employeeNo,
      punchDate: new Date(targetDate),
    },
    orderBy: { ruleId: 'asc' },
  });

  console.log(`找到 ${attendancePunchPairs.length} 组精益摆卡数据\n`);

  if (attendancePunchPairs.length === 0) {
    console.log('❌ 没有找到精益摆卡数据');
    return;
  }

  attendancePunchPairs.forEach((pair, index) => {
    console.log(`--- 摆卡组 ${index + 1} ---`);
    console.log(`  规则ID: ${pair.ruleId}`);
    console.log(`  规则类型: ${pair.ruleType}`);
    console.log(`  规则名称: ${pair.ruleName || '-'}`);
    console.log(`  上班打卡: ${pair.workStartPunchTime ? pair.workStartPunchTime.toISOString() : '-'}`);
    console.log(`  下班打卡: ${pair.workEndPunchTime ? pair.workEndPunchTime.toISOString() : '-'}`);
    console.log(`  上班班次ID: ${pair.workStartShiftId || '-'}`);
    console.log(`  下班班次ID: ${pair.workEndShiftId || '-'}`);
    console.log(`  账户ID: ${pair.accountId || '-'}`);
    console.log('');
  });

  // 2. 查询该员工的排班信息
  console.log('【2️⃣ 查询排班信息】');
  const schedules = await prisma.schedule.findMany({
    where: {
      employeeNo,
      scheduleDate: new Date(targetDate),
    },
    include: {
      shift: true,
    },
  });

  console.log(`找到 ${schedules.length} 条排班记录\n`);

  if (schedules.length > 0) {
    schedules.forEach((schedule) => {
      console.log(`--- 排班信息 ---`);
      console.log(`  班次ID: ${schedule.shiftId}`);
      console.log(`  班次名称: ${schedule.shift?.name || '-'}`);
      console.log(`  班次类型: ${schedule.shift?.type || '-'}`);
      console.log(`  标准工时: ${schedule.shift?.standardHours || '-'}`);
      console.log(`  调整开始: ${schedule.adjustedStart?.toISOString() || '-'}`);
      console.log(`  调整结束: ${schedule.adjustedEnd?.toISOString() || '-'}`);
      console.log('');
    });
  }

  // 3. 查询工时计算结果
  console.log('【3️⃣ 查询工时计算结果】');
  const calcResults = await prisma.calcResult.findMany({
    where: {
      employeeNo,
      calcDate: new Date(targetDate),
    },
    include: {
      calculationAttendanceCode: true,
    },
  });

  console.log(`找到 ${calcResults.length} 条工时计算结果\n`);

  if (calcResults.length === 0) {
    console.log('❌ 没有找到工时计算结果');
  } else {
    calcResults.forEach((result) => {
      console.log(`--- 工时结果 ---`);
      console.log(`  出勤代码: ${result.calculationAttendanceCode?.name || '-'}`);
      console.log(`  标准工时: ${result.standardHours}`);
      console.log(`  实际工时: ${result.actualHours}`);
      console.log(`  加班工时: ${result.overtimeHours}`);
      console.log(`  状态: ${result.status}`);
      console.log('');
    });
  }

  // 4. 查询打卡规则配置
  console.log('【4️⃣ 查询打卡规则配置】');
  const punchRuleIds = attendancePunchPairs.map(p => p.ruleId);
  const uniqueRuleIds = [...new Set(punchRuleIds)];

  const punchRules = await prisma.punchRule.findMany({
    where: {
      id: { in: uniqueRuleIds },
    },
  });

  console.log(`找到 ${punchRules.length} 条打卡规则\n`);

  punchRules.forEach((rule) => {
    console.log(`--- 打卡规则 ---`);
    console.log(`  ID: ${rule.id}`);
    console.log(`  编码: ${rule.code}`);
    console.log(`  名称: ${rule.name}`);
    console.log(`  类型: ${rule.ruleType}`);
    console.log(`  优先级: ${rule.priority}`);
    console.log(`  状态: ${rule.status}`);
    console.log('');
  });

  // 5. 检查是否有出勤规则组配置
  console.log('【5️⃣ 查询出勤规则组】');
  const employeeRuleGroups = await prisma.employeeAttendanceRuleGroup.findMany({
    where: {
      employeeNo,
      isCurrent: true,
    },
    include: {
      ruleGroup: {
        include: {
          details: {
            include: {
              attendancePunchRule: true,
              leanPunchRule: true,
            },
          },
        },
      },
    },
  });

  console.log(`找到 ${employeeRuleGroups.length} 条当前有效的规则组\n`);

  if (employeeRuleGroups.length > 0) {
    employeeRuleGroups.forEach((erg) => {
      console.log(`--- 规则组 ---`);
      console.log(`  编码: ${erg.ruleGroup.code}`);
      console.log(`  名称: ${erg.ruleGroup.name}`);
      console.log(`  生效日期: ${erg.effectiveDate.toISOString()}`);
      console.log(`  明细数量: ${erg.ruleGroup.details.length}`);
      console.log('');
    });
  }

  console.log('========================================');
  console.log('排查完成');
  console.log('========================================');
}

checkLeanCalculation()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('错误:', err);
    process.exit(1);
  });
