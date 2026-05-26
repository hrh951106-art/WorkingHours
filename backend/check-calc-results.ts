import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查询5月11日的工时计算结果
  const results = await prisma.calcResult.findMany({
    where: {
      calcDate: new Date('2026-05-11'),
      employeeNo: '202604003',
    },
    include: {
      calculationAttendanceCode: true,
    },
  });

  console.log('5月11日工时计算结果:');
  results.forEach(r => {
    console.log(`- ${r.calculationAttendanceCode?.name || '无出勤代码'}`);
    console.log(`  实际工时: ${r.actualHours}小时`);
    console.log(`  标准工时: ${r.standardHours}小时`);
    console.log(`  打卡时间: ${r.punchInTime} - ${r.punchOutTime}`);
    console.log(`  出勤代码ID: ${r.calculationAttendanceCodeId}`);
    console.log(`  出勤代码类型: ${r.calculationAttendanceCode?.type}`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
