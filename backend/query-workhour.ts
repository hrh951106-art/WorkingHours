import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== WorkHourResult 数据查询 ===\n');

  const totalCount = await prisma.workHourResult.count();
  console.log(`总记���数: ${totalCount}\n`);

  if (totalCount === 0) {
    console.log('WorkHourResult 表为空');
    return;
  }

  const results = await prisma.workHourResult.findMany({
    orderBy: { workDate: 'desc' },
    take: 50
  });

  console.log(`显示前 ${results.length} 条记录:\n`);

  results.forEach((r, i) => {
    console.log(`[${i + 1}] ID=${r.id}, 员工=${r.employeeNo}, 日期=${r.workDate.toISOString().split('T')[0]}, 代码=${r.definitionAttendanceCodeStr || r.attendanceCode}, 工时=${r.workHours}h, 金额=${r.amount}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}
