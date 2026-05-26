import { PrismaClient } from '@prisma/client';
import { addMinutes } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  // 模拟segment 2的数据
  const schedule = {
    scheduleDate: new Date('2026-05-12T00:00:00.000Z'),
  };

  const segment2 = {
    startTime: '14:00',
    endTime: '19:00',
  };

  // 模拟expandMultiSegmentShifts的逻辑
  const dateStr = schedule.scheduleDate.toISOString().split('T')[0]; // "2026-05-12"
  const workStartTime = new Date(`${dateStr}T${segment2.startTime}`); // "2026-05-12T14:00"
  const workEndTime = new Date(`${dateStr}T${segment2.endTime}`); // "2026-05-12T19:00"

  console.log('Segment 2工作时间:');
  console.log('  scheduleDate:', schedule.scheduleDate.toISOString());
  console.log('  dateStr:', dateStr);
  console.log('  workStartTime:', workStartTime.toISOString());
  console.log('  workEndTime:', workEndTime.toISOString());

  // 转换为中国时间显示
  const workStartTimeChina = new Date(workStartTime.getTime() + 8 * 60 * 60 * 1000);
  const workEndTimeChina = new Date(workEndTime.getTime() + 8 * 60 * 60 * 1000);
  console.log('  workStartTime (China):', workStartTimeChina.toISOString().substring(11, 19));
  console.log('  workEndTime (China):', workEndTimeChina.toISOString().substring(11, 19));

  // 模拟collectWorkEndPunch的逻辑
  const config = {
    earlyRange: 120, // minutes
    lateRange: 120, // minutes
  };

  const shiftEnd = workEndTime;
  const earlyStart = addMinutes(shiftEnd, -config.earlyRange);
  const lateEnd = addMinutes(shiftEnd, config.lateRange);

  console.log('\n下班卡收卡范围:');
  console.log('  shiftEnd:', shiftEnd.toISOString());
  console.log('  earlyStart:', earlyStart.toISOString());
  console.log('  lateEnd:', lateEnd.toISOString());

  const earlyStartChina = new Date(earlyStart.getTime() + 8 * 60 * 60 * 1000);
  const lateEndChina = new Date(lateEnd.getTime() + 8 * 60 * 60 * 1000);
  console.log('  earlyStart (China):', earlyStartChina.toISOString().substring(11, 19));
  console.log('  lateEnd (China):', lateEndChina.toISOString().substring(11, 19));

  // 获取所有打卡记录
  const punches = await prisma.punchRecord.findMany({
    where: {
      employeeNo: '202604003',
      punchTime: {
        gte: new Date('2026-05-11T15:00:00.000Z'),
        lte: new Date('2026-05-12T16:00:00.000Z'),
      },
    },
    orderBy: { punchTime: 'asc' },
  });

  console.log('\n所有打卡记录:');
  punches.forEach(p => {
    const chinaTime = new Date(p.punchTime.getTime() + 8 * 60 * 60 * 1000);
    const timeStr = chinaTime.toISOString().substring(11, 19);
    const inRange = p.punchTime >= earlyStart && p.punchTime <= lateEnd;
    console.log(`  ID:${p.id} ${timeStr} ${p.punchType.padEnd(3)} ${inRange ? '✓在范围内' : '✗不在范围'}`);
  });

  // 过滤时间范围内的打卡
  const rangePunches = punches.filter(punch => {
    return punch.punchTime >= earlyStart && punch.punchTime <= lateEnd;
  });

  console.log('\n时间范围内的打卡:', rangePunches.length);
  rangePunches.forEach(p => {
    const chinaTime = new Date(p.punchTime.getTime() + 8 * 60 * 60 * 1000);
    console.log(`  ID:${p.id} ${chinaTime.toISOString().substring(11, 19)} ${p.punchType}`);
  });

  // 过滤OUT类型的打卡
  const outPunches = rangePunches.filter(punch => punch.punchType === 'OUT');

  console.log('\nOUT类型的打卡:', outPunches.length);
  outPunches.forEach(p => {
    const chinaTime = new Date(p.punchTime.getTime() + 8 * 60 * 60 * 1000);
    console.log(`  ID:${p.id} ${chinaTime.toISOString().substring(11, 19)}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
