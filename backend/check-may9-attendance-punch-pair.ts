import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 格式化为本地时间字符串
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
  console.log('=== 检查 2026-05-09 的考勤摆卡结果 (AttendancePunchPair) ===\n');

  const employeeNo = '202604003';
  const targetDate = new Date('2026-05-09T00:00:00.000Z');

  // 1. 查询考勤摆卡记录
  console.log('考勤摆卡记录 (AttendancePunchPair):');
  const attendancePunchPairs = await prisma.attendancePunchPair.findMany({
    where: {
      employeeNo,
      punchDate: targetDate,
    },
    include: {
      employee: true,
      account: true,
    },
    orderBy: { workStartPunchTime: 'asc' },
  });

  console.log(`找到 ${attendancePunchPairs.length} 条考勤摆卡记录\n`);

  if (attendancePunchPairs.length === 0) {
    console.log('没有找到考勤摆卡记录');
    return;
  }

  attendancePunchPairs.forEach((pair, idx) => {
    const startTime = toLocalTime(pair.workStartPunchTime);
    const endTime = toLocalTime(pair.workEndPunchTime);
    const accountName = pair.account?.namePath || 'null';
    const ruleName = pair.ruleName || 'null';
    const isContinuous = pair.isContinuousShift;

    console.log(`考勤摆卡 ${idx + 1} (ID: ${pair.id}):`);
    console.log(`  上班卡: ${startTime}`);
    console.log(`  下班卡: ${endTime}`);
    console.log(`  规则: ${ruleName}`);
    console.log(`  考勤卡号: ${accountName}`);
    console.log(`  连续班次: ${isContinuous ? '是' : '否'}`);

    // 解析多班次信息
    if (pair.workStartPunches) {
      try {
        const startPunches = JSON.parse(pair.workStartPunches);
        if (startPunches.length > 1) {
          console.log(`  上班卡详情 (${startPunches.length}笔):`);
          startPunches.forEach((p: any, i: number) => {
            console.log(`    ${i + 1}. ID=${p.id}, 时间=${toLocalTime(new Date(p.punchTime))}, 班次=${p.shiftName || 'null'}`);
          });
        }
      } catch (e) {
        console.log(`  上班卡解析失败: ${e}`);
      }
    }

    if (pair.workEndPunches) {
      try {
        const endPunches = JSON.parse(pair.workEndPunches);
        if (endPunches.length > 1) {
          console.log(`  下班卡详情 (${endPunches.length}笔):`);
          endPunches.forEach((p: any, i: number) => {
            console.log(`    ${i + 1}. ID=${p.id}, 时间=${toLocalTime(new Date(p.punchTime))}, 班次=${p.shiftName || 'null'}`);
          });
        }
      } catch (e) {
        console.log(`  下班卡解析失败: ${e}`);
      }
    }

    console.log('');
  });

  // 2. 检查是否有时间交叉
  console.log('时间交叉检查:');
  let hasOverlap = false;
  for (let i = 0; i < attendancePunchPairs.length - 1; i++) {
    const current = attendancePunchPairs[i];
    const next = attendancePunchPairs[i + 1];

    if (current.workEndPunchTime && next.workStartPunchTime) {
      const overlap = current.workEndPunchTime > next.workStartPunchTime;
      const gap = current.workEndPunchTime < next.workStartPunchTime;
      const continuous = current.workEndPunchTime.getTime() === next.workStartPunchTime.getTime();

      console.log(`考勤摆卡${i + 1} (${toLocalTime(current.workStartPunchTime)}~${toLocalTime(current.workEndPunchTime)}) ` +
                 `与 考勤摆卡${i + 2} (${toLocalTime(next.workStartPunchTime)}~${toLocalTime(next.workEndPunchTime)}):`);

      if (overlap) {
        console.log(`  ❌ 时间交叉: ${toLocalTime(current.workEndPunchTime)} > ${toLocalTime(next.workStartPunchTime)}`);
        hasOverlap = true;
      } else if (continuous) {
        console.log(`  ✓ 时间连续: ${toLocalTime(current.workEndPunchTime)} = ${toLocalTime(next.workStartPunchTime)}`);
      } else if (gap) {
        const gapMinutes = (next.workStartPunchTime.getTime() - current.workEndPunchTime.getTime()) / (1000 * 60);
        console.log(`  ⚠️  时间间隔: ${gapMinutes.toFixed(0)} 分钟`);
      } else {
        console.log(`  ✓ 正常`);
      }
    }
  }

  if (!hasOverlap && attendancePunchPairs.length <= 1) {
    console.log('\n✓ 没有发现时间交叉');
  }

  // 3. 期望结果分析
  console.log('\n期望结果:');
  console.log('  第一段: 2026-05-09 08:00:00 ~ 2026-05-09 12:00:00');
  console.log('  第二段: 2026-05-09 13:00:00 ~ 2026-05-09 18:00:00');

  // 4. 对比分析
  console.log('\n实际结果对比:');
  if (attendancePunchPairs.length === 2) {
    const pair1 = attendancePunchPairs[0];
    const pair2 = attendancePunchPairs[1];

    const pair1Start = pair1.workStartPunchTime?.getHours();
    const pair1End = pair1.workEndPunchTime?.getHours();
    const pair2Start = pair2.workStartPunchTime?.getHours();
    const pair2End = pair2.workEndPunchTime?.getHours();

    const pair1Match = pair1Start === 8 && pair1End === 12;
    const pair2Match = pair2Start === 13 && pair2End === 18;

    if (pair1Match && pair2Match) {
      console.log('  ✓ 考勤摆卡结果正确！');
    } else {
      console.log('  ❌ 考勤摆卡结果与期望不符:');
      console.log(`     期望第一段: 08:00:00 ~ 12:00:00`);
      console.log(`     实际第一段: ${toLocalTime(pair1.workStartPunchTime)} ~ ${toLocalTime(pair1.workEndPunchTime)}`);
      console.log(`     期望第二段: 13:00:00 ~ 18:00:00`);
      console.log(`     实际第二段: ${toLocalTime(pair2.workStartPunchTime)} ~ ${toLocalTime(pair2.workEndPunchTime)}`);
    }
  } else if (attendancePunchPairs.length > 2) {
    console.log(`  ❌ 考勤摆卡数量异常: 期望 2 条, 实际 ${attendancePunchPairs.length} 条`);
  } else if (attendancePunchPairs.length === 1) {
    const pair1 = attendancePunchPairs[0];
    console.log(`  ⚠️  只有一条考勤摆卡记录: ${toLocalTime(pair1.workStartPunchTime)} ~ ${toLocalTime(pair1.workEndPunchTime)}`);
    console.log(`     这可能是因为系统认为两段班次是连续的，只收了首尾两笔卡`);
  } else {
    console.log(`  ❌ 没有找到考勤摆卡记录`);
  }
}

main()
  .then(() => console.log('\n检查完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
