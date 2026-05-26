import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查摆卡失败的原因 ===\n');

  // 1. 检查是否有员工没有配置考勤规则组
  console.log('1. 检查员工考勤规则组配置\n');

  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      employeeNo: true,
      name: true
    },
    take: 10
  });

  for (const emp of employees) {
    const ruleGroup = await prisma.employeeAttendanceRuleGroup.findFirst({
      where: {
        employeeNo: emp.employeeNo,
        isCurrent: true,
        status: 'ACTIVE'
      }
    });

    console.log(`员工: ${emp.employeeNo} - ${emp.name}`);
    console.log(`  考勤规则组: ${ruleGroup ? ruleGroup.ruleGroupName : '❌ 未找到生效的考勤规则组'}`);

    if (ruleGroup) {
      const ruleGroupDetail = await prisma.attendanceRuleGroupDetail.findFirst({
        where: {
          ruleGroupId: ruleGroup.ruleGroupId
        }
      });

      console.log(`  规则组明细: ${ruleGroupDetail ? '✅ 已配置' : '❌ 未配置明细'}`);
      console.log(`  精益打卡规则ID: ${ruleGroupDetail?.leanPunchRuleId || '❌ 未配置精益打卡规则'}`);
    }

    console.log('');
  }

  // 2. 检查摆卡数据是否有重复
  console.log('\n2. 检查摆卡数据重复情况\n');

  const duplicatePairs = await prisma.$queryRaw`
    SELECT employeeNo, pairDate, shiftId, accountId, COUNT(*) as count
    FROM PunchPair
    GROUP BY employeeNo, pairDate, shiftId, accountId
    HAVING count(*) > 1
  `;

  console.log(`发现 ${duplicatePairs.length} 组重复的摆卡数据:\n`);

  for (const dup of duplicatePairs as any[]) {
    console.log(`员工: ${dup.employeeNo}, 日期: ${dup.pairDate.toISOString().split('T')[0]}, 班次ID: ${dup.shiftId}, 账户ID: ${dup.accountId}`);
    console.log(`  重复次数: ${dup.count}`);
  }

  if (duplicatePairs.length === 0) {
    console.log('✅ 没有发现重复的摆卡数据');
  }

  // 3. 检查是否有摆卡数据但没有对应排班的
  console.log('\n3. 检查孤立摆卡数据（没有对应排班）\n');

  const allPairs = await prisma.punchPair.findMany({
    select: {
      id: true,
      employeeNo: true,
      pairDate: true,
      shiftId: true
    },
    take: 20
  });

  let orphanCount = 0;
  for (const pair of allPairs) {
    const schedule = await prisma.schedule.findFirst({
      where: {
        employeeNo: pair.employeeNo,
        scheduleDate: pair.pairDate,
        shiftId: pair.shiftId
      }
    });

    if (!schedule) {
      orphanCount++;
      if (orphanCount <= 5) {
        console.log(`员工: ${pair.employeeNo}, 日期: ${pair.pairDate.toISOString().split('T')[0]}, 班次ID: ${pair.shiftId}`);
        console.log(`  ❌ 没有找到对应的排班记录`);
      }
    }
  }

  if (orphanCount === 0) {
    console.log('✅ 所有摆卡数据都有对应的排班记录');
  } else if (orphanCount > 5) {
    console.log(`... 还有 ${orphanCount - 5} 条孤立数据`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
