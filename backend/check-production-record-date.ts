import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 检查生产记录的recordDate ==========\n');

  const prodRecord = await prisma.productionRecord.findFirst({
    where: { recordDate: new Date('2026-05-19') }
  });

  if (!prodRecord) {
    console.log('❌ 未找到生产记录');
    return;
  }

  console.log(`生产记录ID: ${prodRecord.id}`);
  console.log(`recordDate原始值: ${prodRecord.recordDate.toISOString()}`);
  console.log(`recordDate.toDateString(): ${prodRecord.recordDate.toDateString()}`);
  console.log(`recordDate.toLocaleDateString(): ${prodRecord.recordDate.toLocaleDateString()}`);

  // 检查setHours后的值
  const testDate = new Date(prodRecord.recordDate);
  console.log(`\n复制后的日期: ${testDate.toISOString()}`);

  testDate.setHours(0, 0, 0, 0);
  console.log(`setHours(0,0,0,0)后: ${testDate.toISOString()}`);

  // 检查数据库中workDate的存储格式
  console.log('\n【检查工时结果的workDate】\n');
  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      attendanceCode: 'A06'
    },
    select: {
      workDate: true
    },
    distinct: ['workDate'],
    orderBy: {
      workDate: 'desc'
    },
    take: 5
  });

  for (const whr of workHourResults) {
    console.log(`  workDate: ${whr.workDate.toISOString()}`);
  }

  // 测试：使用生产记录的recordDate查询工时结果
  console.log('\n【使用生产记录的recordDate查询】\n');
  const testResults = await prisma.workHourResult.findMany({
    where: {
      workDate: prodRecord.recordDate,
      attendanceCode: 'A06',
      status: 'ACTIVE'
    }
  });

  console.log(`找到${testResults.length}条工时结果`);

  // 测试：使用setHours后的日期查询
  console.log('\n【使用setHours后的日期查询】\n');
  const testResults2 = await prisma.workHourResult.findMany({
    where: {
      workDate: testDate,
      attendanceCode: 'A06',
      status: 'ACTIVE'
    }
  });

  console.log(`找到${testResults2.length}条工时结果`);

  console.log('\n========== 分析完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
