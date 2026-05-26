import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMay12Data() {
  const employeeNo = '202604003';
  const calcDate = '2026-05-12';

  console.log('=== Check May 12 Data ===\n');

  // 1. Get punch pairs
  const punchPairs = await prisma.attendancePunchPair.findMany({
    where: {
      employeeNo,
      punchDate: {
        gte: new Date('2026-05-12T00:00:00.000Z'),
        lte: new Date('2026-05-12T23:59:59.999Z'),
      },
    },
    orderBy: { punchDate: 'asc' },
  });

  console.log('Punch pairs found: ' + punchPairs.length + '\n');
  
  punchPairs.forEach((pair, idx) => {
    console.log('Pair ' + (idx + 1) + ' (ID: ' + pair.id + '):');
    console.log('  Start: ' + pair.workStartPunchTime);
    console.log('  End: ' + pair.workEndPunchTime);
    console.log('  Start Shift: ' + (pair.workStartShiftName || 'None') + ' (ID: ' + (pair.workStartShiftId || 'N/A') + ')');
    console.log('  End Shift: ' + (pair.workEndShiftName || 'None') + ' (ID: ' + (pair.workEndShiftId || 'N/A') + ')');
    
    const startPunches = JSON.parse(pair.workStartPunches || '[]');
    if (startPunches.length > 0) {
      console.log('  Start Punch Account ID: ' + startPunches[0].accountId);
    }
    console.log('');
  });

  // 2. Get schedule
  const employee = await prisma.employee.findUnique({
    where: { employeeNo },
    select: { id: true },
  });

  if (employee) {
    const schedules = await prisma.schedule.findMany({
      where: {
        employeeId: employee.id,
        scheduleDate: {
          gte: new Date('2026-05-12T00:00:00.000Z'),
          lt: new Date('2026-05-12T23:59:59.999Z'),
        },
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

    console.log('\nSchedules found: ' + schedules.length + '\n');

    for (const schedule of schedules) {
      console.log('Schedule ID: ' + schedule.id);
      console.log('  Shift: ' + (schedule.shift?.name || 'N/A') + ' (ID: ' + schedule.shiftId + ')');
      console.log('  Shift Type: ' + (schedule.shift?.type || 'N/A'));

      if (schedule.shift?.segments) {
        console.log('  Segments count: ' + schedule.shift.segments.length);
        console.log('  Segments details:');
        schedule.shift.segments.forEach((seg, i) => {
          console.log('    ' + (i + 1) + '. ' + seg.type + ' - ' + seg.startTime + '-' + seg.endTime + ' (' + seg.startDate + ' -> ' + seg.endDate + ')');
          console.log('       Account ID: ' + (seg.accountId || 'Not configured'));
        });
      }
      console.log('');
    }
  }

  // 3. Check attendance codes
  const attendanceCodes = await prisma.calculationAttendanceCode.findMany({
    where: {
      type: 'ATTENDANCE_HOURS',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      code: true,
      name: true,
      includeOutside: true,
      calculateHours: true,
    },
  });

  console.log('\nAttendance codes: ' + attendanceCodes.length + '\n');
  attendanceCodes.forEach(code => {
    console.log('  ' + code.code + ' - ' + code.name);
    console.log('    Include outside: ' + (code.includeOutside ? 'Yes' : 'No'));
    console.log('    Calculate hours: ' + (code.calculateHours ? 'Yes' : 'No'));
  });

  // 4. Analysis
  console.log('\n=== Expected Results Analysis ===\n');
  
  if (punchPairs.length > 0 && schedules.length > 0) {
    const shift = schedules[0].shift;
    if (shift && shift.segments) {
      const workSegments = shift.segments.filter(s => s.type !== 'REST');
      
      console.log('Work segments in shift: ' + workSegments.length);
      
      const includeOutside = attendanceCodes.some(c => c.includeOutside);
      
      if (includeOutside) {
        console.log('Attendance codes INCLUDE outside hours');
        console.log('Expected: Before-shift + In-shift(segments) + After-shift = 3+ segments');
      } else {
        console.log('Attendance codes DO NOT include outside hours');
        console.log('Expected: Only in-shift hours');
      }
    }
  }

  await prisma.$disconnect();
}

checkMay12Data()
  .then(() => {
    console.log('\n=== Analysis Complete ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
