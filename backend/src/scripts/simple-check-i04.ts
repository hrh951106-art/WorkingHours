import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const i04Code = await prisma.attendanceCode.findFirst({ where: { code: 'I04' } });
  if (!i04Code) {
    console.log('No I04 code');
    process.exit(1);
  }

  const startDate = new Date('2026-03-11');
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date('2026-03-11');
  endDate.setHours(23, 59, 59, 999);

  const records = await prisma.calcResult.findMany({
    where: {
      attendanceCodeId: i04Code.id,
      calcDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      accountName: true,
      employeeNo: true,
      actualHours: true,
      calcDate: true,
    },
  });

  console.log('I04 records on 2026-03-11:', records.length);
  for (const r of records) {
    console.log('  Account:', r.accountName);
    console.log('  Employee:', r.employeeNo);
    console.log('  Hours:', r.actualHours);
    console.log();
  }

  await prisma.$disconnect();
}

check().catch(e => console.error(e));
