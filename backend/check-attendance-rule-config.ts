import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 获取员工信息
  const employee = await prisma.employee.findUnique({
    where: { employeeNo: '202604003' },
    select: { id: true },
  });

  if (!employee) {
    console.log('员工不存在');
    return;
  }

  // 查看员工的考勤规则组
  const employeeRuleGroups = await prisma.employeeAttendanceRuleGroup.findMany({
    where: {
      employeeId: employee.id,
    },
  });

  console.log('员工202604003的考勤规则组配置:\n');
  console.log(`找到 ${employeeRuleGroups.length} 个关联:\n`);

  if (employeeRuleGroups.length === 0) {
    console.log('❌ 员工没有配置考勤规则组！');
    console.log('\n这是导致无法进行考勤摆卡的原因！');
    return;
  }

  for (const erg of employeeRuleGroups) {
    console.log(`规则组ID: ${erg.ruleGroupId}`);
    console.log(`规则组名称: ${erg.ruleGroupName}`);
    console.log(`生效日期: ${erg.effectiveDate?.toISOString().split('T')[0]}`);
    console.log(`失效日期: ${erg.expiryDate?.toISOString().split('T')[0] || '未设置'}`);
    console.log('');
  }

  // 获取规则组详情
  const ruleGroupIds = employeeRuleGroups.map(erg => erg.ruleGroupId);
  const ruleGroupDetails = await prisma.attendanceRuleGroupDetail.findMany({
    where: {
      ruleGroupId: { in: ruleGroupIds },
    },
  });

  console.log(`\n规则组详情 (${ruleGroupDetails.length}条):\n`);

  if (ruleGroupDetails.length === 0) {
    console.log('❌ 规则组没有配置打卡规则！');
    console.log('\n这是导致无法进行考勤摆卡的原因！');
    return;
  }

  for (const detail of ruleGroupDetails) {
    console.log(`规则组ID: ${detail.ruleGroupId}`);
    console.log(`  考勤打卡规则ID: ${detail.attendancePunchRuleId || '未设置'}`);
    console.log(`  精益打卡规则ID: ${detail.leanPunchRuleId || '未设置'}`);
  }

  // 检查打卡规则
  const punchRuleIds = ruleGroupDetails
    .map(d => d.attendancePunchRuleId)
    .filter(id => id !== null);

  const leanPunchRuleIds = ruleGroupDetails
    .map(d => d.leanPunchRuleId)
    .filter(id => id !== null);

  console.log(`\n考勤打卡规则IDs: ${punchRuleIds.join(', ') || '无'}`);
  console.log(`精益打卡规则IDs: ${leanPunchRuleIds.join(', ') || '无'}`);

  // 检查打卡规则详情
  if (leanPunchRuleIds.length > 0) {
    const leanRules = await prisma.punchRule.findMany({
      where: { id: { in: leanPunchRuleIds } },
    });

    console.log('\n精益打卡规则详情:');
    leanRules.forEach(rule => {
      console.log(`  ID: ${rule.id}, 名称: ${rule.name}, 类型: ${rule.ruleType}, 状态: ${rule.status}`);
      console.log(`    configs: ${rule.configs ? '已配置' : '未配置'}`);
      console.log(`    scheduledConfig: ${rule.scheduledConfig ? '已配置' : '未配置'}`);
      console.log(`    unscheduledConfig: ${rule.unscheduledConfig ? '已配置' : '未配置'}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
