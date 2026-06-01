import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 验证日期时区问题 ==========\n');

  // 模拟API调用
  const startDate = '2026-05-17';
  const endDate = '2026-05-20';

  console.log(`输入的日期范围: ${startDate} ~ ${endDate}\n`);

  // 1. 模拟代码中的处理
  console.log('【代码中的处理】\n');
  const start = new Date(startDate);
  console.log(`new Date('${startDate}'): ${start.toISOString()}`);

  start.setHours(0, 0, 0, 0);
  console.log(`setHours(0,0,0,0)后: ${start.toISOString()}`);

  const end = new Date(endDate);
  console.log(`\nnew Date('${endDate}'): ${end.toISOString()}`);

  end.setHours(23, 59, 59, 999);
  console.log(`setHours(23,59,59,999)后: ${end.toISOString()}`);

  // 2. 用这个范围查询生产记录
  console.log('\n【用处理后的日期范围查询生产记录】\n');
  const productionRecords = await prisma.productionRecord.findMany({
    where: {
      recordDate: { gte: start, lte: end },
      deletedAt: null,
    },
    select: {
      id: true,
      recordDate: true,
      productName: true,
      actualQty: true
    }
  });

  console.log(`找到 ${productionRecords.length} 条生产记录\n`);
  for (const r of productionRecords) {
    console.log(`  ID=${r.id}: ${r.recordDate.toISOString().substring(0, 10)} - ${r.productName}, ${r.actualQty}件`);
  }

  // 3. 用正确的方式查询（不设置时分秒）
  console.log('\n【用正确的UTC日期范围查询】\n');
  const startUTC = new Date(`${startDate}T00:00:00.000Z`);
  const endUTC = new Date(`${endDate}T23:59:59.999Z`);

  console.log(`UTC开始: ${startUTC.toISOString()}`);
  console.log(`UTC结束: ${endUTC.toISOString()}`);

  const productionRecords2 = await prisma.productionRecord.findMany({
    where: {
      recordDate: { gte: startUTC, lte: endUTC },
      deletedAt: null,
    },
    select: {
      id: true,
      recordDate: true,
      productName: true,
      actualQty: true
    }
  });

  console.log(`\n找到 ${productionRecords2.length} 条生产记录\n`);
  for (const r of productionRecords2) {
    console.log(`  ID=${r.id}: ${r.recordDate.toISOString().substring(0, 10)} - ${r.productName}, ${r.actualQty}件`);
  }

  // 4. 结论
  console.log('\n【结论】\n');
  console.log(`使用setHours方式查询: ${productionRecords.length}条`);
  console.log(`使用UTC方式查询: ${productionRecords2.length}条`);

  if (productionRecords.length !== productionRecords2.length) {
    console.log('\n❌ 时区问题导致查询结果不一致！');
    console.log('   这就是分摊计算找不到生产记录的原因！');
  }

  console.log('\n========== 分析完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
