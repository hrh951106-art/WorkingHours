import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查询最近创建的CalcResult数据
  const recentResults = await prisma.calcResult.findMany({
    where: {
      calculationAttendanceCode: {
        type: 'LEAN_HOURS',
      },
    },
    include: {
      calculationAttendanceCode: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 20,
  });

  console.log('最近创建的精益工时结果（按创建时间倒序）：');
  console.log(`总数: ${recentResults.length}`);
  console.log('');

  recentResults.forEach(r => {
    const calcDate = new Date(r.calcDate);
    const createdAt = new Date(r.createdAt);
    console.log(`- ID: ${r.id}, 员工: ${r.employeeNo}`);
    console.log(`  calcDate: ${calcDate.toISOString().split('T')[0]} (本地: ${calcDate.toLocaleDateString('zh-CN')})`);
    console.log(`  出勤代码: ${r.calculationAttendanceCode?.name} (${r.calculationAttendanceCode?.type})`);
    console.log(`  工时: ${r.actualHours}小时`);
    console.log(`  shiftId: ${r.shiftId}`);
    console.log(`  创建时间: ${createdAt.toLocaleString('zh-CN')}`);
    console.log('');
  });

  // 查询5月12日的数据
  const may12Results = await prisma.calcResult.findMany({
    where: {
      calcDate: {
        gte: new Date('2026-05-12T00:00:00'),
        lt: new Date('2026-05-13T00:00:00'),
      },
      calculationAttendanceCode: {
        type: 'LEAN_HOURS',
      },
    },
    include: {
      calculationAttendanceCode: true,
    },
  });

  console.log('\n5月12日的精益工时结果:');
  console.log(`总数: ${may12Results.length}`);
  console.log('');

  may12Results.forEach(r => {
    const calcDate = new Date(r.calcDate);
    console.log(`- ID: ${r.id}, 员工: ${r.employeeNo}`);
    console.log(`  calcDate: ${calcDate.toISOString().split('T')[0]} (本地: ${calcDate.toLocaleDateString('zh-CN')})`);
    console.log(`  出勤代码: ${r.calculationAttendanceCode?.name}`);
    console.log(`  工时: ${r.actualHours}小时`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
