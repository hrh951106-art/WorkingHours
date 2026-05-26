import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function toLocalTime(date: Date | null): string {
  if (!date) return 'null';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function main() {
  const employeeNo = '202604003';
  console.log('=== 分析员工 202604003 在5月9日前后的摆卡情况 ===\n');

  // 1. 检查考勤摆卡 (AttendancePunchPair) 5月8-13日的情况
  console.log('1. 考勤摆卡 (AttendancePunchPair) 5月8-13日:');
  const attendancePairs = await prisma.attendancePunchPair.findMany({
    where: {
      employeeNo,
      punchDate: {
        gte: new Date('2026-05-08T00:00:00.000Z'),
        lte: new Date('2026-05-13T23:59:59.000Z'),
      },
    },
    orderBy: { punchDate: 'asc' },
  });

  attendancePairs.forEach((pair, idx) => {
    const date = pair.punchDate.toISOString().split('T')[0];
    const startTime = toLocalTime(pair.workStartPunchTime);
    const endTime = toLocalTime(pair.workEndPunchTime);
    console.log(`  ${idx + 1}. 日期=${date}, 上班=${startTime}, 下班=${endTime}, 规则=${pair.ruleName}, 连续=${pair.isContinuousShift}`);
  });

  console.log(`\n  共找到 ${attendancePairs.length} 条考勤摆卡记录`);
  console.log(`  ⚠️  缺少 2026-05-09 的考勤摆卡记录！`);

  // 2. 检查精益摆卡 (PunchPair) 5月9日的情况
  console.log('\n2. 精益摆卡 (PunchPair) 5月9日:');
  const leanPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo,
      pairDate: new Date('2026-05-09T00:00:00.000Z'),
    },
    include: { account: true },
    orderBy: { inPunchTime: 'asc' },
  });

  leanPairs.forEach((pair, idx) => {
    const inTime = toLocalTime(pair.inPunchTime);
    const outTime = toLocalTime(pair.outPunchTime);
    console.log(`  ${idx + 1}. ID=${pair.id}, 进=${inTime}, 出=${outTime}, 工时=${pair.workHours}h`);
  });

  console.log(`\n  共找到 ${leanPairs.length} 条精益摆卡记录`);

  // 3. 检查5月9日的排班信息
  console.log('\n3. 5月9日的排班信息:');
  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
  });

  if (employee) {
    const schedules = await prisma.schedule.findMany({
      where: {
        employeeId: employee.id,
        scheduleDate: new Date('2026-05-09T00:00:00.000Z'),
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

    if (schedules.length > 0) {
      schedules.forEach((schedule) => {
        console.log(`  班次: ${schedule.shift?.name}`);
        if (schedule.shift?.segments) {
          schedule.shift.segments.forEach((seg, idx) => {
            console.log(`    段${idx + 1}: ${seg.startDate} ${seg.startTime} ~ ${seg.endDate} ${seg.endTime}, 类型=${seg.type}`);
          });
        }
      });
    } else {
      console.log('  未找到排班信息');
    }
  }

  // 4. 检查考勤规则组配置
  console.log('\n4. 检查考勤规则组配置:');
  const employeeGroups = await prisma.employeeAttendanceRuleGroup.findMany({
    where: {
      employee: { employeeNo },
    },
    include: {
      ruleGroup: true,
    },
  });

  if (employeeGroups.length > 0) {
    console.log(`  找到 ${employeeGroups.length} 个考勤规则组关联:`);
    employeeGroups.forEach((eg) => {
      console.log(`    - ${eg.ruleGroup.name} (ID: ${eg.ruleGroupId})`);
      console.log(`      考勤打卡规则ID: ${eg.ruleGroup.attendancePunchRuleId}`);
      console.log(`      精益打卡规则ID: ${eg.ruleGroup.leanPunchRuleId}`);
      console.log(`      生效日期: ${eg.effectiveDate?.toISOString().split('T')[0]} ~ ${eg.expiryDate?.toISOString().split('T')[0] || '永久'}`);
    });
  } else {
    console.log('  未找到考勤规则组配置');
  }

  // 5. 检查考勤摆卡的时间交叉问题
  console.log('\n5. 考勤摆卡时间交叉检查:');

  const checkOverlap = (dateStr: string, idx1: number, idx2: number) => {
    const pair1 = attendancePairs[idx1];
    const pair2 = attendancePairs[idx2];

    if (!pair1.workEndPunchTime || !pair2.workStartPunchTime) return;

    const overlap = pair1.workEndPunchTime > pair2.workStartPunchTime;
    const gap = pair1.workEndPunchTime < pair2.workStartPunchTime;

    if (overlap) {
      const overlapMinutes = (pair1.workEndPunchTime.getTime() - pair2.workStartPunchTime.getTime()) / (1000 * 60);
      console.log(`  ❌ ${dateStr} 考勤摆卡时间交叉:`);
      console.log(`     记录1: ${toLocalTime(pair1.workStartPunchTime)} ~ ${toLocalTime(pair1.workEndPunchTime)}`);
      console.log(`     记录2: ${toLocalTime(pair2.workStartPunchTime)} ~ ${toLocalTime(pair2.workEndPunchTime)}`);
      console.log(`     交叉时间: ${overlapMinutes.toFixed(0)} 分钟`);
    }
  };

  // 检查5月8日的两条记录
  checkOverlap('2026-05-08', 0, 1);

  // 检查5月11日的两条记录
  checkOverlap('2026-05-11', 3, 4);

  // 6. 结论分析
  console.log('\n6. 结论分析:');
  console.log('  a) 精益摆卡 (PunchPair) 在 2026-05-09 有数据，结果是正确的：');
  console.log('     - 第一段: 08:00:00 ~ 12:00:00');
  console.log('     - 第二段: 13:00:00 ~ 18:00:00');
  console.log('');
  console.log('  b) 考勤摆卡 (AttendancePunchPair) 在 2026-05-09 没有数据');
  console.log('     可能原因：');
  console.log('     1. 考勤打卡收卡功能还没有执行过');
  console.log('     2. 考勤规则组配置问题（attendancePunchRuleId为空）');
  console.log('');
  console.log('  c) 发现时间交叉问题：');
  console.log('     - 5月8日的考勤摆卡有交叉：08:00~13:00 和 12:00~18:00（交叉1小时）');
  console.log('     - 5月11日的考勤摆卡有交叉：07:00~12:30 和 12:00~19:00（交叉30分钟）');
  console.log('');
  console.log('  d) 问题原因分析：');
  console.log('     考勤摆卡服务在处理多段班次时，为每个班段分别收卡，');
  console.log('     导致收卡时间范围重叠。例如：');
  console.log('     - 第一段收卡范围：08:00前后 → 收到08:00~13:00的卡');
  console.log('     - 第二段收卡范围：13:00前后 → 收到12:00~18:00的卡');
  console.log('     因为实际的下班卡12:00同时在两个收卡范围内。');
  console.log('');
  console.log('  e) 用户可能看到的是：');
  console.log('     - 5月9日的精益摆卡（正确，无交叉）');
  console.log('     - 或其他日期的考勤摆卡（有交叉，如5月8日和5月11日）');
}

main()
  .then(() => console.log('\n分析完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
