import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查时间格式 ===\n');

  const result = await prisma.workHourResult.findFirst({
    where: {
      definitionAttendanceCodeId: 2,
    },
    select: {
      id: true,
      calcDate: true,
      startTime: true,
      endTime: true,
      workHours: true,
      accountName: true,
    },
  });

  if (result) {
    console.log('原始数据:');
    console.log('  calcDate:', result.calcDate, '类型:', typeof result.calcDate);
    console.log('  startTime:', result.startTime, '类型:', typeof result.startTime);
    console.log('  endTime:', result.endTime, '类型:', typeof result.endTime);
    console.log('  workHours:', result.workHours);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
