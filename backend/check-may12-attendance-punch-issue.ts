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
  console.log('=== 检查 5月12日 考勤摆卡问题 ===\n');

  const employeeNo = '202604003';
  const targetDate = new Date('2026-05-12T00:00:00.000Z');

  // 1. 查询排班信息
  console.log('1. 排班信息:');
  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
  });

  if (!employee) {
    console.log('员工不存在');
    return;
  }

  const schedules = await prisma.schedule.findMany({
    where: {
      employeeId: employee.id,
      scheduleDate: targetDate,
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
    orderBy: { shiftId: 'asc' },
  });

  if (schedules.length === 0) {
    console.log('没有排班信息');
    return;
  }

  console.log(`  找到 ${schedules.length} 个排班:\n`);
  schedules.forEach((schedule, idx) => {
    console.log(`  排班${idx + 1} (ID: ${schedule.id}):`);
    console.log(`    班次名称: ${schedule.shift?.name}`);
    if (schedule.shift?.segments) {
      schedule.shift.segments.forEach((seg, segIdx) => {
        const segStart = toLocalTime(new Date(`${targetDate.toISOString().split('T')[0]}T${seg.startTime}`));
        const segEnd = toLocalTime(new Date(`${targetDate.toISOString().split('T')[0]}T${seg.endTime}`));
        console.log(`    段${segIdx + 1}: ${segStart} ~ ${segEnd}, 类型=${seg.type}`);
      });
    }
    console.log('');
  });

  // 2. 分析段之间的连续性
  console.log('2. 段连续性分析:');
  const allSegments = schedules.flatMap(s => s.shift?.segments || []);

  if (allSegments.length > 1) {
    for (let i = 0; i < allSegments.length - 1; i++) {
      const currentEnd = allSegments[i].endTime;
      const nextStart = allSegments[i + 1].startTime;

      const [currentEndHour, currentEndMinute] = currentEnd.split(':').map(Number);
      const [nextStartHour, nextStartMinute] = nextStart.split(':').map(Number);
      const currentEndTotalMinutes = currentEndHour * 60 + currentEndMinute;
      const nextStartTotalMinutes = nextStartHour * 60 + nextStartMinute;
      const gap = nextStartTotalMinutes - currentEndTotalMinutes;

      const continuous = gap >= -1 && gap <= 1;
      const status = continuous ? '✓ 连续' : '❌ 不连续';

      console.log(`  ${status} 段${i + 1}结束 ${currentEnd} vs 段${i + 2}开始 ${nextStart}: 间隔 ${gap}分钟`);
    }

    console.log('');
    console.log('  结论: 如果有段不连续（间隔>1分钟），需要拆分为多个班次分别收卡');
  }

  // 3. 查询打卡记录
  console.log('\n3. 实际打卡记录:');
  const punchRecords = await prisma.punchRecord.findMany({
    where: {
      employeeNo,
      punchTime: {
        gte: targetDate,
        lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { punchTime: 'asc' },
  });

  punchRecords.forEach((punch) => {
    const time = toLocalTime(punch.punchTime);
    console.log(`  ${time} ${punch.punchType} (ID: ${punch.id})`);
  });

  // 4. 查询考勤摆卡结果
  console.log('\n4. 考勤摆卡结果:');
  const attendancePairs = await prisma.attendancePunchPair.findMany({
    where: {
      employeeNo,
      punchDate: targetDate,
    },
    orderBy: { workStartPunchTime: 'asc' },
  });

  if (attendancePairs.length === 0) {
    console.log('  没有考勤摆卡记录（可能还没有执行收卡）');
  } else {
    console.log(`  找到 ${attendancePairs.length} 条记录:\n`);

    attendancePairs.forEach((record, idx) => {
      const startTime = toLocalTime(record.workStartPunchTime);
      const endTime = toLocalTime(record.workEndPunchTime);
      const workHours = record.workStartPunchTime && record.workEndPunchTime
        ? ((record.workEndPunchTime.getTime() - record.workStartPunchTime.getTime()) / (1000 * 60 * 60)).toFixed(2)
        : '0';

      console.log(`  记录${idx + 1} (ID: ${record.id}):`);
      console.log(`    时间: ${startTime} ~ ${endTime}`);
      console.log(`    工时: ${workHours}h`);
      console.log(`    连续班次: ${record.isContinuousShift ? '是' : '否'}`);

      // 显示使用的打卡卡
      if (record.workStartPunches) {
        try {
          const startPunches = JSON.parse(record.workStartPunches);
          console.log(`    上班卡 (${startPunches.length}张):`);
          startPunches.forEach((p: any) => {
            const time = toLocalTime(new Date(p.punchTime));
            console.log(`      ${time} ${p.punchType} (ID: ${p.id})`);
          });
        } catch (e) {
          console.log(`    上班卡: ${record.workStartPunches}`);
        }
      } else {
        console.log(`    上班卡: 无`);
      }

      if (record.workEndPunches) {
        try {
          const endPunches = JSON.parse(record.workEndPunches);
          console.log(`    下班卡 (${endPunches.length}张):`);
          endPunches.forEach((p: any) => {
            const time = toLocalTime(new Date(p.punchTime));
            console.log(`      ${time} ${p.punchType} (ID: ${p.id})`);
          });
        } catch (e) {
          console.log(`    下班卡: ${record.workEndPunches}`);
        }
      } else {
        console.log(`    下班卡: 无`);
      }

      console.log('');
    });
  }

  // 5. 问题分析
  console.log('5. 问题分析:');
  console.log('  用户描述的问题:');
  console.log('    - 12:00:00 和 12:30:00 同时在第一段班的下班卡收卡范围内');
  console.log('    - 12:00:00 和 12:30:00 也在第二段班的上班卡收卡范围内');
  console.log('    - 下班卡取最后一笔 → 12:30');
  console.log('    - 上班卡取第一笔 → 12:00');
  console.log('    - 导致时间交叉: 第一段下班12:30 > 第二段上班12:00');
  console.log('');
  console.log('  正确逻辑:');
  console.log('    - 如果第二段的上班卡时间 < 第一段的下班卡时间');
  console.log('    - 则认为第二段缺上班卡');
  console.log('    - 避免时间交叉');
}

main()
  .then(() => console.log('\n检查完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
