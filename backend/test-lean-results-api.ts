import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 模拟 getResults 方法的查询
  const where: any = {
    calculationAttendanceCode: {
      type: 'LEAN_HOURS',
    },
  };

  const items = await prisma.calcResult.findMany({
    where,
    include: {
      calculationAttendanceCode: true,
      employee: {
        include: {
          org: true,
        },
      },
    },
    orderBy: { calcDate: 'desc' },
    take: 10,
  });

  const total = await prisma.calcResult.count({ where });

  console.log('精益工时结果查询结果:');
  console.log(`总数: ${total}`);
  console.log('');

  if (items.length === 0) {
    console.log('✅ 确认：精益工时结果页签中没有数据（所有 LEAN_HOURS 类型数据已删除）');
  } else {
    console.log('前10条数据:');
    items.forEach(item => {
      const date = item.calcDate.toISOString().split('T')[0];
      const codeName = item.calculationAttendanceCode?.name || 'None';
      const codeType = item.calculationAttendanceCode?.type || 'None';
      console.log(`- ID: ${item.id}, Employee: ${item.employeeNo}, Date: ${date}, Code: ${codeName}, Type: ${codeType}, Hours: ${item.actualHours}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
