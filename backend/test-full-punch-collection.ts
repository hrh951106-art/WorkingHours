import { PrismaClient } from '@prisma/client';
import { addMinutes, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { differenceInMinutes } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202604003';
  const punchDate = new Date('2026-05-12T00:00:00.000Z'); // Local time

  // 1. 获取打卡记录
  const dayStart = startOfDay(punchDate);
  const dayEnd = endOfDay(punchDate);

  console.log('Query range:');
  console.log('  dayStart (Local):', dayStart.toISOString());
  console.log('  dayEnd (Local):', dayEnd.toISOString());

  const punchRecords = await prisma.punchRecord.findMany({
    where: {
      employeeNo,
      punchTime: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    orderBy: { punchTime: 'asc' },
  });

  console.log('\n总打卡记录:', punchRecords.length);
  punchRecords.forEach(p => {
    const chinaTime = new Date(p.punchTime.getTime() + 8 * 60 * 60 * 1000);
    console.log('  ', chinaTime.toISOString().substring(11, 19), 'ID:' + p.id, p.punchType);
  });

  // 2. 获取排班
  const employee = await prisma.employee.findUnique({
    where: { employeeNo },
    select: { id: true },
  });

  const schedules = await prisma.schedule.findMany({
    where: {
      employeeId: employee.id,
      status: 'ACTIVE',
      scheduleDate: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    include: {
      shift: {
        include: {
          segments: true,
        },
      },
    },
  });

  console.log('\n排班数量:', schedules.length);

  // 3. 展开多段班次
  const normalSegments = schedules[0].shift.segments.filter((seg: any) => seg.type === 'NORMAL');
  console.log('班次段数:', normalSegments.length);

  const expanded = [];
  for (const segment of normalSegments) {
    const dateStr = schedules[0].scheduleDate.toISOString().split('T')[0];
    const segmentStart = new Date(`${dateStr}T${segment.startTime}`);
    const segmentEnd = new Date(`${dateStr}T${segment.endTime}`);

    const startChina = new Date(segmentStart.getTime() + 8 * 60 * 60 * 1000);
    const endChina = new Date(segmentEnd.getTime() + 8 * 60 * 60 * 1000);

    console.log(`\nSegment: ${segment.startTime}-${segment.endTime}`);
    console.log(`  workStartTime (Local): ${segmentStart.toISOString()}`);
    console.log(`  workStartTime (China): ${startChina.toISOString().substring(11, 19)}`);
    console.log(`  workEndTime (Local): ${segmentEnd.toISOString()}`);
    console.log(`  workEndTime (China): ${endChina.toISOString().substring(11, 19)}`);

    // 模拟collectWorkEndPunch
    const config = {
      earlyRange: 120,
      lateRange: 120,
      countType: 'LAST',
    };

    const shiftEnd = segmentEnd;
    const earlyStart = addMinutes(shiftEnd, -config.earlyRange);
    const lateEnd = addMinutes(shiftEnd, config.lateRange);

    const earlyChina = new Date(earlyStart.getTime() + 8 * 60 * 60 * 1000);
    const lateChina = new Date(lateEnd.getTime() + 8 * 60 * 60 * 1000);

    console.log(`\n  下班卡收卡范围:`);
    console.log(`    shiftEnd (China): ${endChina.toISOString().substring(11, 19)}`);
    console.log(`    earlyStart (China): ${earlyChina.toISOString().substring(11, 19)}`);
    console.log(`    lateEnd (China): ${lateChina.toISOString().substring(11, 19)}`);

    // 过滤时间范围内的打卡
    const rangePunches = punchRecords.filter((punch) => {
      return punch.punchTime >= earlyStart && punch.punchTime <= lateEnd;
    });

    console.log(`\n    范围内打卡数: ${rangePunches.length}`);
    rangePunches.forEach(p => {
      const chinaTime = new Date(p.punchTime.getTime() + 8 * 60 * 60 * 1000);
      console.log(`      ${chinaTime.toISOString().substring(11, 19)} ID:${p.id} ${p.punchType}`);
    });

    // 打卡间隔过滤
    const interval = 5;
    let filteredPunches = filterByPunchInterval(rangePunches, interval, 'last');

    console.log(`    打卡间隔过滤后: ${filteredPunches.length}`);
    filteredPunches.forEach(p => {
      const chinaTime = new Date(p.punchTime.getTime() + 8 * 60 * 60 * 1000);
      console.log(`      ${chinaTime.toISOString().substring(11, 19)} ID:${p.id} ${p.punchType}`);
    });

    // 选择最后一笔
    const selectedPunch = filteredPunches.length > 0 ? filteredPunches[filteredPunches.length - 1] : null;
    console.log(`\n    最终选择: ${selectedPunch ? `ID:${selectedPunch.id} ${new Date(selectedPunch.punchTime.getTime() + 8 * 60 * 60 * 1000).toISOString().substring(11, 19)} ${selectedPunch.punchType}` : 'null'}`);
  }

  await prisma.$disconnect();
}

function filterByPunchInterval(punches: any[], interval: number, keep: 'first' | 'last') {
  if (interval === 0 || punches.length === 0) {
    return punches;
  }

  const filtered: any[] = [];
  let lastKeepTime: Date | null = null;

  // 倒序遍历，从最后一笔开始
  for (let i = punches.length - 1; i >= 0; i--) {
    const punch = punches[i];

    if (!lastKeepTime) {
      // 第一笔（最后一笔）肯定保留
      filtered.push(punch);
      lastKeepTime = punch.punchTime;
    } else {
      // 计算与上次保留卡的时间差
      const diff = differenceInMinutes(lastKeepTime, punch.punchTime);
      if (diff >= interval) {
        filtered.push(punch);
        lastKeepTime = punch.punchTime;
      }
    }
  }

  return keep === 'first' ? filtered.reverse() : filtered;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
