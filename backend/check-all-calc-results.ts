import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查询所有工时计算结果
  const results = await prisma.calcResult.findMany({
    where: {
      employeeNo: '202604003',
    },
    include: {
      calculationAttendanceCode: true,
    },
    orderBy: {
      calcDate: 'desc',
    },
    take: 10,
  });

  console.log(`工号202604003的工时计算结果（最近10条）:`);
  console.log(`总数: ${results.length}`);
  console.log('');

  results.forEach(r => {
    console.log(`- 日期: ${r.calcDate.toISOString().split('T')[0]}`);
    console.log(`  出勤代码: ${r.calculationAttendanceCode?.name || '无'} (${r.calculationAttendanceCode?.type || '无类型'})`);
    console.log(`  实际工时: ${r.actualHours}小时`);
    console.log(`  标准工时: ${r.standardHours}小时`);
    console.log(`  shiftId: ${r.shiftId}`);
    console.log(`  shiftName: ${r.shiftName}`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
