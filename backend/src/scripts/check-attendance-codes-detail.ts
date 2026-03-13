import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAttendanceCodesDetail() {
  console.log('========================================');
  console.log('检查各出勤代码的详细记录');
  console.log('========================================\n');

  const startDate = new Date('2026-03-01');
  const endDate = new Date('2026-03-12');
  endDate.setHours(23, 59, 59, 999);

  // 1. 查询所有出勤代码
  console.log('第一步：查询所有出勤代码\n');

  const allCodes = await prisma.attendanceCode.findMany({
    orderBy: { id: 'asc' },
  });

  console.log('所有出勤代码:');
  for (const code of allCodes) {
    console.log(`  ID ${code.id}: ${code.code} - ${code.name}`);
  }

  // 2. 查询每个出勤代码的记录
  console.log('\n第二步：查询每个出勤代码的工时记录\n');

  for (const code of allCodes) {
    const records = await prisma.calcResult.findMany({
      where: {
        calcDate: {
          gte: startDate,
          lte: endDate,
        },
        attendanceCodeId: code.id,
      },
      take: 5,
    });

    if (records.length > 0) {
      console.log(`\n${code.code} (${code.name}) - 共 ${records.length} 条记录 (显示前5条):`);

      for (const record of records) {
        console.log(`  账户: ${record.accountName}`);
        console.log(`  员工: ${record.employeeNo}, 工时: ${record.actualHours}, 日期: ${record.calcDate.toISOString().split('T')[0]}`);
        console.log();
      }
    }
  }

  console.log('========================================\n');
}

checkAttendanceCodesDetail()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
