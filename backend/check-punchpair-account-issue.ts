import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605002';
  const targetDate = new Date('2026-05-10');

  console.log('========================================');
  console.log('诊断员工 202605002 在 2026-05-10 的账户问题');
  console.log('========================================\n');

  // 1. 查询PunchPair记录
  console.log('1. PunchPair记录（2026-05-10）：');
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo,
      pairDate: targetDate,
    },
  });
  console.log(`   找到 ${punchPairs.length} 条记录`);
  if (punchPairs.length > 0) {
    punchPairs.forEach(p => {
      console.log(`   - ID: ${p.id}, accountId: ${p.accountId}, accountName: ${p.accountName}`);
    });
  } else {
    console.log('   ❌ 没有找到PunchPair记录');
  }

  // 2. 查询PunchRecord原始打卡
  console.log('\n2. PunchRecord原始打卡记录（2026-05-10）：');
  const punchRecords = await prisma.punchRecord.findMany({
    where: {
      employeeNo,
      punchTime: {
        gte: new Date('2026-05-10T00:00:00'),
        lte: new Date('2026-05-10T23:59:59'),
      },
    },
    include: {
      device: true,
    },
    orderBy: { punchTime: 'asc' },
  });
  console.log(`   找到 ${punchRecords.length} 条打卡记录`);
  punchRecords.forEach(r => {
    console.log(`   - ID: ${r.id}, Time: ${r.punchTime.toISOString()}, Device: ${r.device.name} (ID:${r.deviceId}), accountId: ${r.accountId}`);
  });

  // 3. 查询设备账户绑定
  console.log('\n3. 设备账户绑定：');
  const deviceIds = punchRecords.map(r => r.deviceId);
  const deviceBindings = await prisma.deviceAccount.findMany({
    where: {
      deviceId: { in: deviceIds },
    },
    include: {
      device: true,
      account: true,
    },
  });
  console.log(`   找到 ${deviceBindings.length} 条绑定记录`);
  deviceBindings.forEach(b => {
    console.log(`   - 设备: ${b.device.name} (ID:${b.deviceId}) → 账户: ${b.account.name} (ID:${b.accountId}, path:${b.account.path})`);
  });

  // 4. 查询员工绑定的劳动力账户
  console.log('\n4. 员工劳动力账户绑定：');
  const employee = await prisma.employee.findUnique({
    where: { employeeNo },
    include: {
      laborAccounts: {
        where: { status: 'ACTIVE' },
        include: { account: true },
        orderBy: { isPrimary: 'desc' },
      },
    },
  });
  if (employee && employee.laborAccounts.length > 0) {
    employee.laborAccounts.forEach(la => {
      console.log(`   - 账户: ${la.account.name} (ID:${la.accountId}, isPrimary:${la.isPrimary})`);
    });
  } else {
    console.log('   ❌ 员工没有绑定的劳动力账户');
  }

  // 5. 检查排班信息
  console.log('\n5. 排班信息（2026-05-10）：');
  const schedules = await prisma.schedule.findMany({
    where: {
      employee: { employeeNo },
      scheduleDate: targetDate,
    },
    include: { shift: true },
  });
  console.log(`   找到 ${schedules.length} 条排班记录`);
  schedules.forEach(s => {
    console.log(`   - 班次: ${s.shift.name} (ID:${s.shiftId})`);
  });

  // 6. 检查考勤规则组配置
  console.log('\n6. 考勤规则组配置：');
  const ruleGroup = await prisma.employeeAttendanceRuleGroup.findFirst({
    where: {
      employeeNo,
      isCurrent: true,
      status: 'ACTIVE',
    },
    include: {
      ruleGroup: {
        include: {
          details: true,
        },
      },
    },
  });
  if (ruleGroup) {
    console.log(`   规则组: ${ruleGroup.ruleGroupName}`);
    console.log(`   精益打卡规则ID: ${ruleGroup.ruleGroup.details[0]?.leanPunchRuleId}`);
    console.log(`   考勤打卡规则ID: ${ruleGroup.ruleGroup.details[0]?.attendancePunchRuleId}`);
  } else {
    console.log('   ❌ 员工没有配置考勤规则组');
  }

  // 7. 模拟账户合并逻辑
  console.log('\n7. 模拟账户合并逻辑：');
  for (const record of punchRecords) {
    // 获取打卡记录的账户路径
    let punchAccountPath = null;
    if (record.accountId) {
      const account = await prisma.laborAccount.findUnique({
        where: { id: record.accountId },
        select: { namePath: true },
      });
      punchAccountPath = account?.namePath || null;
    }

    // 获取设备绑定的账户路径
    const deviceBinding = deviceBindings.find(b => b.deviceId === record.deviceId);
    let deviceAccountPath = null;
    if (deviceBinding) {
      const account = await prisma.laborAccount.findUnique({
        where: { id: deviceBinding.accountId },
        select: { namePath: true },
      });
      deviceAccountPath = account?.namePath || null;
    }

    // 合并逻辑：打卡优先，设备兜底
    const mergedPath = punchAccountPath || deviceAccountPath;

    console.log(`   打卡 ${record.id}:`);
    console.log(`     - 打卡账户: ${punchAccountPath || '(空)'}`);
    console.log(`     - 设备${record.deviceId}账户: ${deviceAccountPath || '(空)'}`);
    console.log(`     - 合并结果: ${mergedPath || '(空)'}`);
  }

  console.log('\n========================================');
  console.log('诊断完成');
  console.log('========================================');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
