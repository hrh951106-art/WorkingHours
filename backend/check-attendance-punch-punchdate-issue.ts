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
  console.log('=== 检查 AttendancePunchPair 的 punchDate 字段问题 ===\n');

  const employeeNo = '202604003';

  // 1. 查询考勤摆卡记录
  const attendancePairs = await prisma.attendancePunchPair.findMany({
    where: {
      employeeNo,
    },
    orderBy: { punchDate: 'asc' },
  });

  console.log('考勤摆卡的 punchDate 与实际打卡日期对比:\n');

  attendancePairs.forEach((pair, idx) => {
    const punchDate = pair.punchDate.toISOString().split('T')[0];
    const actualStartDate = pair.workStartPunchTime?.toISOString().split('T')[0] || 'null';
    const actualEndDate = pair.workEndPunchTime?.toISOString().split('T')[0] || 'null';

    const match = punchDate === actualStartDate;
    const status = match ? '✓' : '❌';

    console.log(`${status} 记录${idx + 1} (ID: ${pair.id}):`);
    console.log(`   punchDate (排班日期):        ${punchDate}`);
    console.log(`   实际上班打卡日期:            ${actualStartDate}`);
    console.log(`   实际下班打卡日期:            ${actualEndDate}`);

    if (!match) {
      console.log(`   ⚠️  不匹配！punchDate 应该是 ${actualStartDate}`);
    }
    console.log('');
  });

  // 2. 查询对应的排班信息
  console.log('\n对应的排班信息 (Schedule 表):\n');

  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
  });

  if (employee) {
    const schedules = await prisma.schedule.findMany({
      where: {
        employeeId: employee.id,
        scheduleDate: {
          in: [
            new Date('2026-05-08T00:00:00.000Z'),
            new Date('2026-05-09T00:00:00.000Z'),
            new Date('2026-05-10T00:00:00.000Z'),
            new Date('2026-05-11T00:00:00.000Z'),
          ],
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
      orderBy: { scheduleDate: 'asc' },
    });

    schedules.forEach((schedule) => {
      const date = schedule.scheduleDate.toISOString().split('T')[0];
      console.log(`排班日期: ${date}`);
      console.log(`  班次: ${schedule.shift?.name}`);
      if (schedule.shift?.segments) {
        schedule.shift.segments.forEach((seg) => {
          console.log(`    段: ${seg.startDate} ${seg.startTime} ~ ${seg.endDate} ${seg.endTime}, 类型=${seg.type}`);
        });
      }
      console.log('');
    });
  }

  // 3. 对比精益摆卡的 pairDate
  console.log('\n对比精益摆卡 (PunchPair) 的 pairDate:\n');

  const leanPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo,
      pairDate: {
        in: [
          new Date('2026-05-08T00:00:00.000Z'),
          new Date('2026-05-09T00:00:00.000Z'),
          new Date('2026-05-10T00:00:00.000Z'),
          new Date('2026-05-11T00:00:00.000Z'),
        ],
      },
    },
    orderBy: { pairDate: 'asc' },
  });

  leanPairs.forEach((pair) => {
    const pairDate = pair.pairDate.toISOString().split('T')[0];
    const actualDate = pair.inPunchTime?.toISOString().split('T')[0] || 'null';
    const match = pairDate === actualDate;
    const status = match ? '✓' : '❌';

    console.log(`${status} ID=${pair.id}:`);
    console.log(`   pairDate: ${pairDate}`);
    console.log(`   实际打卡日期: ${actualDate}`);
  });
}

main()
  .then(() => console.log('\n检查完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
