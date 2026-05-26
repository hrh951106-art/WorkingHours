import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPunchRulesAndExecution() {
  console.log('========================================');
  console.log('检查打卡规则配置和执行情况');
  console.log('========================================\n');

  // 1. 查看富阳摆卡规则配置
  console.log('【1️⃣ 富阳摆卡规则配置 (ID: 1)】');
  const leanRule = await prisma.punchRule.findUnique({
    where: { id: 1 },
  });

  if (leanRule) {
    console.log(`  编码: ${leanRule.code}`);
    console.log(`  名称: ${leanRule.name}`);
    console.log(`  类型: ${leanRule.ruleType}`);
    console.log(`  优先级: ${leanRule.priority}`);
    console.log(`  班前分钟: ${leanRule.beforeShiftMins}`);
    console.log(`  班后分钟: ${leanRule.afterShiftMins}`);
    console.log(`  状态: ${leanRule.status}`);
    console.log(`  scheduledConfig: ${leanRule.scheduledConfig || '-'}`);
    console.log(`  unscheduledConfig: ${leanRule.unscheduledConfig || '-'}`);
    console.log(`  configs: ${leanRule.configs || '-'}`);
  }

  // 2. 查看考勤打卡规则配置
  console.log('\n【2️⃣ 考勤打卡规则配置 (ID: 16)】');
  const attendanceRule = await prisma.punchRule.findUnique({
    where: { id: 16 },
  });

  if (attendanceRule) {
    console.log(`  编码: ${attendanceRule.code}`);
    console.log(`  名称: ${attendanceRule.name}`);
    console.log(`  类型: ${attendanceRule.ruleType}`);
    console.log(`  优先级: ${attendanceRule.priority}`);
    console.log(`  状态: ${attendanceRule.status}`);
    console.log(`  scheduledConfig: ${attendanceRule.scheduledConfig || '-'}`);
    console.log(`  unscheduledConfig: ${attendanceRule.unscheduledConfig || '-'}`);
  }

  // 3. 检查设备组配置
  console.log('\n【3️⃣ 设备组配置】');
  const deviceGroupIntervals = await prisma.punchRuleDeviceGroupInterval.findMany({
    where: {
      punchRuleId: 1,
    },
    include: {
      deviceGroup: true,
    },
  });

  console.log(`  找到 ${deviceGroupIntervals.length} 个设备组配置\n`);
  deviceGroupIntervals.forEach((dgi) => {
    console.log(`  设备组: ${dgi.deviceGroup.name} (ID: ${dgi.deviceGroupId})`);
    console.log(`    班前: ${dgi.beforeShiftMins}, 班后: ${dgi.afterShiftMins}`);
  });

  // 4. 检查设备绑定
  console.log('\n【4️⃣ 设备6和设备7的账户绑定】');
  const device6Accounts = await prisma.deviceAccount.findMany({
    where: {
      deviceId: 6,
    },
    include: {
      account: true,
    },
  });

  const device7Accounts = await prisma.deviceAccount.findMany({
    where: {
      deviceId: 7,
    },
    include: {
      account: true,
    },
  });

  console.log(`  设备6绑定账户数: ${device6Accounts.length}`);
  device6Accounts.forEach((da) => {
    console.log(`    账户: ${da.account.name} (${da.account.code})`);
  });

  console.log(`  设备7绑定账户数: ${device7Accounts.length}`);
  device7Accounts.forEach((da) => {
    console.log(`    账户: ${da.account.name} (${da.account.code})`);
  });

  // 5. 检查员工202604003的规则组
  console.log('\n【5️⃣ 员工202604003的出勤规则组】');
  const employee = await prisma.employee.findFirst({
    where: { employeeNo: '202604003' },
    select: { id: true, name: true },
  });

  if (employee) {
    const employeeRuleGroups = await prisma.employeeAttendanceRuleGroup.findMany({
      where: {
        employeeId: employee.id,
        isCurrent: true,
      },
      include: {
        ruleGroup: {
          include: {
            details: {
              where: {
                attendancePunchRuleId: { not: null },
              },
              include: {
                attendancePunchRule: true,
              },
            },
          },
        },
      },
      orderBy: { effectiveDate: 'desc' },
    });

    console.log(`  找到 ${employeeRuleGroups.length} 个当前规则组\n`);
    employeeRuleGroups.forEach((erg) => {
      console.log(`  规则组: ${erg.ruleGroup.name} (${erg.ruleGroup.code})`);
      console.log(`  生效日期: ${erg.effectiveDate.toISOString().split('T')[0]}`);
      console.log(`  打卡规则明细数: ${erg.ruleGroup.details.length}`);

      erg.ruleGroup.details.forEach((detail) => {
        console.log(`    - 打卡规则: ${detail.attendancePunchRule?.name} (ID: ${detail.attendancePunchRuleId})`);
      });
    });
  }

  // 6. 检查员工在2026-05-09前后的工时计算结果
  console.log('\n【6️⃣ 员工202604003在2026-05-08和2026-05-10的工时结果】');
  const may8Calc = await prisma.calcResult.findMany({
    where: {
      employeeNo: '202604003',
      calcDate: new Date('2026-05-08'),
    },
  });

  const may10Calc = await prisma.calcResult.findMany({
    where: {
      employeeNo: '202604003',
      calcDate: new Date('2026-05-10'),
    },
  });

  console.log(`  2026-05-08 工时结果数: ${may8Calc.length}`);
  may8Calc.forEach((r) => {
    console.log(`    ${r.calculationAttendanceCode?.name || r.attendanceCode?.name}: ${r.actualHours}h`);
  });

  console.log(`  2026-05-10 工时结果数: ${may10Calc.length}`);
  may10Calc.forEach((r) => {
    console.log(`    ${r.calculationAttendanceCode?.name || r.attendanceCode?.name}: ${r.actualHours}h`);
  });

  console.log('\n========================================');
}

checkPunchRulesAndExecution()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('错误:', err);
    process.exit(1);
  });
