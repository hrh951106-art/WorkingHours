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
  console.log('=== 查询员工 202604003 的所有考勤摆卡数据 (AttendancePunchPair) ===\n');

  const employeeNo = '202604003';

  // 查询所有考勤摆卡记录
  const allRecords = await prisma.attendancePunchPair.findMany({
    where: {
      employeeNo,
    },
    include: {
      employee: true,
      account: true,
    },
    orderBy: { punchDate: 'asc' },
  });

  console.log(`总共找到 ${allRecords.length} 条考勤摆卡记录\n`);

  if (allRecords.length === 0) {
    console.log('没有找到任何考勤摆卡记录');
    return;
  }

  // 按日期分组显示
  const recordsByDate = new Map<string, typeof allRecords>();
  allRecords.forEach((record) => {
    const dateStr = record.punchDate.toISOString().split('T')[0];
    if (!recordsByDate.has(dateStr)) {
      recordsByDate.set(dateStr, []);
    }
    recordsByDate.get(dateStr)!.push(record);
  });

  // 遍历每个日期
  for (const [dateStr, records] of recordsByDate.entries()) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`日期: ${dateStr} (${records.length} 条记录)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    records.forEach((record, idx) => {
      const startTime = toLocalTime(record.workStartPunchTime);
      const endTime = toLocalTime(record.workEndPunchTime);
      const accountName = record.account?.namePath || 'null';
      const ruleName = record.ruleName || 'null';
      const isContinuous = record.isContinuousShift;

      console.log(`\n  记录 ${idx + 1} (ID: ${record.id}):`);
      console.log(`    规则类型: ${record.ruleType} | 规则名称: ${ruleName}`);
      console.log(`    上班卡时间: ${startTime}`);
      console.log(`    下班卡时间: ${endTime}`);
      console.log(`    连续班次: ${isContinuous ? '是' : '否'}`);
      console.log(`    考勤卡号: ${accountName}`);

      // 解析多班次信息
      if (record.workStartPunches) {
        try {
          const startPunches = JSON.parse(record.workStartPunches);
          if (startPunches.length > 1) {
            console.log(`    上班卡详情 (${startPunches.length} 笔):`);
            startPunches.forEach((p: any, i: number) => {
              const time = toLocalTime(new Date(p.punchTime));
              console.log(`      ${i + 1}. ID=${p.id}, 时间=${time}, 班次=${p.shiftName || 'null'}`);
            });
          }
        } catch (e) {
          // ignore
        }
      }

      if (record.workEndPunches) {
        try {
          const endPunches = JSON.parse(record.workEndPunches);
          if (endPunches.length > 1) {
            console.log(`    下班卡详情 (${endPunches.length} 笔):`);
            endPunches.forEach((p: any, i: number) => {
              const time = toLocalTime(new Date(p.punchTime));
              console.log(`      ${i + 1}. ID=${p.id}, 时间=${time}, 班次=${p.shiftName || 'null'}`);
            });
          }
        } catch (e) {
          // ignore
        }
      }

      // 计算工时
      if (record.workStartPunchTime && record.workEndPunchTime) {
        const workHours = (record.workEndPunchTime.getTime() - record.workStartPunchTime.getTime()) / (1000 * 60 * 60);
        console.log(`    工时: ${workHours.toFixed(2)} 小时`);
      }
    });

    // 检查该日期是否有时间交叉
    if (records.length > 1) {
      console.log(`\n  ⚠️  时间交叉检查:`);
      for (let i = 0; i < records.length - 1; i++) {
        const current = records[i];
        const next = records[i + 1];

        if (current.workEndPunchTime && next.workStartPunchTime) {
          const overlap = current.workEndPunchTime > next.workStartPunchTime;
          const gap = current.workEndPunchTime < next.workStartPunchTime;

          if (overlap) {
            const overlapMinutes = (current.workEndPunchTime.getTime() - next.workStartPunchTime.getTime()) / (1000 * 60);
            console.log(`    ❌ 记录${i + 1}与记录${i + 2}交叉: ${overlapMinutes.toFixed(0)} 分钟`);
            console.log(`       记录${i + 1}: ${toLocalTime(current.workStartPunchTime)} ~ ${toLocalTime(current.workEndPunchTime)}`);
            console.log(`       记录${i + 2}: ${toLocalTime(next.workStartPunchTime)} ~ ${toLocalTime(next.workEndPunchTime)}`);
          } else if (gap) {
            const gapMinutes = (next.workStartPunchTime.getTime() - current.workEndPunchTime.getTime()) / (1000 * 60);
            console.log(`    ✓ 记录${i + 1}与记录${i + 2}间隔: ${gapMinutes.toFixed(0)} 分钟`);
          } else {
            console.log(`    ✓ 记录${i + 1}与记录${i + 2}连续`);
          }
        }
      }
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`查询完成`);
}

main()
  .then(() => console.log(''))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
