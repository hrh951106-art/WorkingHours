import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAmountField() {
  const targetDate = new Date('2026-05-19T00:00:00.000Z');

  const results = await prisma.workHourResult.findMany({
    where: {
      workDate: targetDate,
    },
    select: {
      id: true,
      employeeNo: true,
      workHours: true,
      amount: true,
      calculateAmount: true,
    },
    orderBy: { employeeNo: 'asc' },
  });

  console.log('=== 检查5月19日工时金额字段 ===\n');

  if (results.length === 0) {
    console.log('没有工时记录');
  } else {
    console.log('找到 ' + results.length + ' 条记录:\n');

    results.forEach((r, index) => {
      console.log(`${index + 1}. 员工: ${r.employeeNo}`);
      console.log(`   工时: ${r.workHours} 小时`);
      console.log(`   amount: ${r.amount === null || r.amount === undefined ? 'NULL ❌' : r.amount}`);
      console.log(`   calculateAmount: ${r.calculateAmount === null || r.calculateAmount === undefined ? 'NULL ❌' : r.calculateAmount}`);
      console.log('');
    });

    // 统计
    const hasAmount = results.filter(r => r.amount !== null && r.amount !== undefined);
    const hasCalculateAmount = results.filter(r => r.calculateAmount !== null && r.calculateAmount !== undefined);

    console.log('=== 统计 ===');
    console.log(`总记录数: ${results.length}`);
    console.log(`amount字段有值: ${hasAmount.length} (${hasAmount.length > 0 ? '✅' : '❌'})`);
    console.log(`calculateAmount字段有值: ${hasCalculateAmount.length} (${hasCalculateAmount.length > 0 ? '✅' : '❌'})`);
  }

  await prisma.$disconnect();
}

checkAmountField()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
