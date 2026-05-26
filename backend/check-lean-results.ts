import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const allResults = await prisma.calcResult.findMany({
    include: {
      calculationAttendanceCode: true,
    },
    orderBy: {
      calcDate: 'desc',
    },
  });

  console.log('Total records:', allResults.length);

  const withShift = allResults.filter(r => r.shiftId !== null);
  const withoutShift = allResults.filter(r => r.shiftId === null);

  console.log('With shiftId:', withShift.length);
  console.log('Without shiftId (lean hours):', withoutShift.length);
  console.log('');

  // Group by attendance code type
  const byType: Record<string, number> = {};
  allResults.forEach(r => {
    const type = r.calculationAttendanceCode?.type || 'Unknown';
    byType[type] = (byType[type] || 0) + 1;
  });

  console.log('By attendance code type:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  console.log('');

  // Show all records without shiftId
  console.log('Records without shiftId (lean hours):');
  withoutShift.forEach(r => {
    const date = r.calcDate.toISOString().split('T')[0];
    const codeName = r.calculationAttendanceCode?.name || 'None';
    const codeType = r.calculationAttendanceCode?.type || 'None';
    console.log(`- ID: ${r.id}, Employee: ${r.employeeNo}, Date: ${date}, Code: ${codeName}, Type: ${codeType}, Hours: ${r.actualHours}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
