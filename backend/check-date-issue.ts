import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 检查日期查询问题 ==========\n');

  // 1. 检查原始日期
  const recordDate = new Date('2026-05-19');
  console.log(`原始日期: ${recordDate.toISOString()}`);

  recordDate.setHours(0, 0, 0, 0);
  console.log(`设置时分秒后: ${recordDate.toISOString()}`);

  // 2. 查询数据库中工时结果的实际日期
  console.log('\n【查询工时结果的实际日期】\n');
  const results = await prisma.workHourResult.findMany({
    where: {
      attendanceCode: 'A06'
    },
    select: {
      id: true,
      workDate: true,
      attendanceCode: true,
      workHours: true
    },
    orderBy: {
      workDate: 'desc'
    },
    take: 10
  });

  console.log(`找到${results.length}条最近的工时结果\n`);
  for (const r of results) {
    console.log(`  ID=${r.id}: workDate=${r.workDate?.toISOString()}, 考勤=${r.attendanceCode}, 工时=${r.workHours}`);
  }

  // 3. 测试不同的日期查询方式
  console.log('\n【测试不同的日期查询方式】\n');

  // 方式1：使用new Date('2026-05-19')
  const test1 = await prisma.workHourResult.count({
    where: {
      workDate: new Date('2026-05-19'),
      attendanceCode: 'A06'
    }
  });
  console.log(`方式1 - new Date('2026-05-19'): ${test1}条`);

  // 方式2：使用带时分秒的日期
  const date2 = new Date('2026-05-19T00:00:00.000Z');
  const test2 = await prisma.workHourResult.count({
    where: {
      workDate: date2,
      attendanceCode: 'A06'
    }
  });
  console.log(`方式2 - new Date('2026-05-19T00:00:00.000Z'): ${test2}条`);

  // 方式3：使用日期范围
  const startDate = new Date('2026-05-19T00:00:00.000Z');
  const endDate = new Date('2026-05-19T23:59:59.999Z');
  const test3 = await prisma.workHourResult.count({
    where: {
      workDate: {
        gte: startDate,
        lte: endDate
      },
      attendanceCode: 'A06'
    }
  });
  console.log(`方式3 - 日期范围(gte/lte): ${test3}条`);

  // 4. 检查数据库中实际存储的workDate
  console.log('\n【检查5月19日的工时结果详情】\n');
  const may19Results = await prisma.workHourResult.findMany({
    where: {
      workDate: {
        gte: new Date('2026-05-19T00:00:00.000Z'),
        lte: new Date('2026-05-19T23:59:59.999Z')
      },
      attendanceCode: 'A06'
    },
    select: {
      id: true,
      workDate: true,
      attendanceCode: true,
      status: true
    }
  });

  console.log(`找到${may19Results.length}条记录\n`);
  for (const r of may19Results) {
    console.log(`  ID=${r.id}: workDate=${r.workDate?.toISOString()}, status=${r.status}`);
  }

  console.log('\n========== 分析完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
