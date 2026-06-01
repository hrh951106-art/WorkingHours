import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 检查生产记录的完整信息 ==========\n');

  const productionRecord = await prisma.productionRecord.findFirst({
    where: { recordDate: new Date('2026-05-19') }
  });

  if (!productionRecord) {
    console.log('❌ 未找到生产记录');
    return;
  }

  console.log('生产记录的所有字段:');
  console.log(JSON.stringify(productionRecord, null, 2));

  console.log('\n【关键字段】\n');
  console.log(`产品ID: ${productionRecord.productId}`);
  console.log(`产品代码: ${productionRecord.productCode}`);
  console.log(`产品名称: ${productionRecord.productName}`);
  console.log(`产量: ${productionRecord.actualQty}`);
  console.log(`组织ID: ${productionRecord.orgId}`);
  console.log(`组织名称: ${productionRecord.orgName}`);

  // 检查是否有标准工时相关字段
  console.log('\n【标准工时相关字段】\n');
  console.log(`标准工时: ${productionRecord.standardHours || '(无)'}`);
  console.log(`总标准工时: ${productionRecord.totalStdHours || '(无)'}`);
  console.log(`工作工时: ${productionRecord.workHours || '(无)'}`);

  // 如果有标准工时，可以计算得工时
  if (productionRecord.standardHours && productionRecord.actualQty) {
    const totalEarnedHours = productionRecord.actualQty * productionRecord.standardHours;
    console.log(`\n计算的得工时: ${totalEarnedHours.toFixed(2)} 小时`);
    console.log('  计算公式: 产量 × 标准工时');
  }

  console.log('\n========== 分析完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
