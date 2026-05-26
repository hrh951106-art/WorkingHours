import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function toLocalTime(date: Date | null): string {
  if (!date) return 'null';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

async function main() {
  console.log('=== 测试所有段连续性检查 ===\n');

  const employeeNo = '202604003';
  const targetDate = new Date('2026-05-09T00:00:00.000Z');

  // 1. 查询班次信息
  console.log('1. 班次配置:');
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
  });

  if (schedules.length === 0) {
    console.log('没有排班信息');
    return;
  }

  const schedule = schedules[0];
  if (schedule.shift?.segments) {
    schedule.shift.segments.forEach((seg, idx) => {
      const segStart = toLocalTime(new Date(`${targetDate.toISOString().split('T')[0]}T${seg.startTime}`));
      const segEnd = toLocalTime(new Date(`${targetDate.toISOString().split('T')[0]}T${seg.endTime}`));
      console.log(`  段${idx + 1}: ${segStart} ~ ${segEnd}, 类型=${seg.type}`);
    });
  }

  // 2. 手动检查连续性
  console.log('\n2. 检查连续性:');
  const segments = schedule.shift?.segments || [];

  if (segments.length > 1) {
    let allContinuous = true;

    for (let i = 0; i < segments.length - 1; i++) {
      const currentEnd = segments[i].endTime;
      const nextStart = segments[i + 1].startTime;

      const [currentEndHour, currentEndMinute] = currentEnd.split(':').map(Number);
      const [nextStartHour, nextStartMinute] = nextStart.split(':').map(Number);
      const currentEndTotalMinutes = currentEndHour * 60 + currentEndMinute;
      const nextStartTotalMinutes = nextStartHour * 60 + nextStartMinute;
      const gap = nextStartTotalMinutes - currentEndTotalMinutes;

      const continuous = gap >= -1 && gap <= 1;
      const status = continuous ? '✓' : '❌';

      console.log(`  ${status} 段${i + 1}结束 ${currentEnd} vs 段${i + 2}开始 ${nextStart}: 间隔 ${gap}分钟`);

      if (!continuous) {
        allContinuous = false;
      }
    }

    console.log(`\n  结论: ${allContinuous ? '✓ 所有段连续，当1个班处理' : '❌ 段不连续，需要拆分'}`);
  }

  // 3. 预期收卡结果
  console.log('\n3. 预期收卡结果:');
  if (segments.length >= 2) {
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];

    const [firstStartHour, firstStartMinute] = firstSegment.startTime.split(':').map(Number);
    const [lastEndHour, lastEndMinute] = lastSegment.endTime.split(':').map(Number);

    const firstStart = `${String(firstStartHour).padStart(2, '0')}:${String(firstStartMinute).padStart(2, '0')}`;
    const lastEnd = `${String(lastEndHour).padStart(2, '0')}:${String(lastEndMinute).padStart(2, '0')}`;

    console.log(`  上班卡收卡范围: ${firstStart} 前后一段时间（根据配置）`);
    console.log(`  下班卡收卡范围: ${lastEnd} 前后一段时间（根据配置）`);
    console.log(`  预期收卡: ${firstStart} ~ ${lastEnd}`);
  }

  // 4. 实际打卡记录
  console.log('\n4. 实际打卡记录:');
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

  console.log('\n  预期匹配:');
  console.log(`    上班卡: 08:00 IN (ID: 20)`);
  console.log(`    下班卡: 17:30 附近的卡，实际是 18:00 OUT (ID: 24)`);
  console.log(`    收卡结果: 08:00 ~ 18:00`);
}

main()
  .then(() => console.log('\n测试完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
