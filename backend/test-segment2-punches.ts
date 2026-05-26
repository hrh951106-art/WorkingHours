import { PrismaClient } from '@prisma/client';
import { addMinutes, isAfter, isBefore } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  // Get segment 2 work times
  const segment2Start = new Date('2026-05-12T14:00:00'); // 14:00 China time
  const segment2End = new Date('2026-05-12T19:00:00'); // 19:00 China time

  // Convert to UTC (subtract 8 hours)
  const segment2StartUTC = new Date(segment2Start.getTime() - 8 * 60 * 60 * 1000);
  const segment2EndUTC = new Date(segment2End.getTime() - 8 * 60 * 60 * 1000);

  console.log('Segment 2 (China time): 14:00 - 19:00');
  console.log('Segment 2 (UTC):', segment2StartUTC.toISOString(), '-', segment2EndUTC.toISOString());

  // Calculate work end punch range
  const earlyRange = 120; // minutes
  const lateRange = 120; // minutes

  const earlyStart = addMinutes(segment2EndUTC, -earlyRange);
  const lateEnd = addMinutes(segment2EndUTC, lateRange);

  console.log('\nWork end punch collection:');
  console.log('  shiftEnd (UTC):', segment2EndUTC.toISOString());
  console.log('  earlyStart (UTC):', earlyStart.toISOString());
  console.log('  lateEnd (UTC):', lateEnd.toISOString());

  // Get all punch records for the day
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

  console.log('\nAll punches:');
  punches.forEach(p => {
    const chinaTime = new Date(p.punchTime.getTime() + 8 * 60 * 60 * 1000);
    console.log(`  ID:${p.id} UTC:${p.punchTime.toISOString()} China:${chinaTime.toISOString().substring(11, 19)} ${p.punchType}`);
  });

  // Filter by time range
  const rangePunches = punches.filter(punch => {
    return isAfter(punch.punchTime, earlyStart) && isBefore(punch.punchTime, lateEnd);
  });

  console.log('\nPunches in time range (', earlyStart.toISOString(), '-', lateEnd.toISOString(), '):');
  rangePunches.forEach(p => {
    const chinaTime = new Date(p.punchTime.getTime() + 8 * 60 * 60 * 1000);
    console.log(`  ID:${p.id} UTC:${p.punchTime.toISOString()} China:${chinaTime.toISOString().substring(11, 19)} ${p.punchType}`);
  });

  // Filter by OUT type
  const outPunches = rangePunches.filter(p => p.punchType === 'OUT');

  console.log('\nOUT punches in range:');
  outPunches.forEach(p => {
    const chinaTime = new Date(p.punchTime.getTime() + 8 * 60 * 60 * 1000);
    console.log(`  ID:${p.id} UTC:${p.punchTime.toISOString()} China:${chinaTime.toISOString().substring(11, 19)} ${p.punchType}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
