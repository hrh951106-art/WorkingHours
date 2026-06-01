import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 重新确认生产记录信息 ==========\n');

  // 1. 获取5月19日的生产记录
  console.log('【1. 生产记录信息】\n');
  const productionRecord = await prisma.productionRecord.findFirst({
    where: { recordDate: new Date('2026-05-19') }
  });

  if (!productionRecord) {
    console.log('❌ 未找到生产记录');
    return;
  }

  console.log(`产品ID: ${productionRecord.productId}`);
  console.log(`产品代码: ${productionRecord.productCode}`);
  console.log(`产品名称: ${productionRecord.productName}`);
  console.log(`产量: ${productionRecord.actualQty}`);

  // 2. 查询该产品是否存在
  console.log('\n【2. 检查产品是否存在】\n');
  const product = await prisma.product.findUnique({
    where: { id: productionRecord.productId }
  });

  if (product) {
    console.log(`✅ 产品存在: ${product.name} (${product.code})`);
  } else {
    console.log(`❌ 产品ID=${productionRecord.productId} 不存在`);
  }

  // 3. 查询该产品的所有标准工时配置
  console.log('\n【3. 该产品的所有标准工时配置】\n');
  const allConfigs = await prisma.productStandardHours.findMany({
    where: {
      productId: productionRecord.productId
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`找到 ${allConfigs.length} 个配置\n`);

  if (allConfigs.length === 0) {
    console.log('❌ 没有找到任何标准工时配置');
    return;
  }

  for (let i = 0; i < allConfigs.length; i++) {
    const config = allConfigs[i];
    console.log(`配置${i + 1}:`);
    console.log(`  ID: ${config.id}`);
    console.log(`  标准工时: ${config.standardHours}`);
    console.log(`  工序名称: ${config.processName || '(无)'}`);
    console.log(`  生效日期: ${config.effectiveDate.toISOString().substring(0, 10)}`);
    console.log(`  失效日期: ${config.expiryDate ? config.expiryDate.toISOString().substring(0, 10) : '无限期'}`);
    console.log(`  状态: ${config.status}`);
    console.log(`  删除时间: ${config.deletedAt ? config.deletedAt.toISOString().substring(0, 10) : '(未删除)'}`);
    console.log('');
  }

  // 4. 检查5月19日应该使用哪个配置
  console.log('【4. 检查5月19日匹配的配置】\n');
  const recordDate = new Date('2026-05-19');
  recordDate.setHours(0, 0, 0, 0);

  const matchingConfigs = [];
  for (let i = 0; i < allConfigs.length; i++) {
    const config = allConfigs[i];
    const isEffective = recordDate >= config.effectiveDate &&
                        (!config.expiryDate || recordDate <= config.expiryDate) &&
                        config.status === 'ACTIVE' &&
                        !config.deletedAt;

    if (isEffective) {
      matchingConfigs.push(config);
    }

    console.log(`配置${i + 1} (ID=${config.id}): ${isEffective ? '✅ 匹配' : '❌ 不匹配'}`);
    if (!isEffective) {
      const reasons = [];
      if (recordDate < config.effectiveDate) reasons.push('日期早于生效日期');
      if (config.expiryDate && recordDate > config.expiryDate) reasons.push('日期晚于失效日期');
      if (config.status !== 'ACTIVE') reasons.push(`状态为${config.status}`);
      if (config.deletedAt) reasons.push('已删除');
      if (reasons.length > 0) console.log(`  原因: ${reasons.join(', ')}`);
    }
  }

  // 5. 结论
  console.log('\n【5. 结论】\n');
  if (matchingConfigs.length > 0) {
    console.log(`✅ 找到 ${matchingConfigs.length} 个匹配的配置`);
    for (const config of matchingConfigs) {
      console.log(`  配置ID: ${config.id}, 标准工时: ${config.standardHours}`);
    }
    console.log('\n  问题不在标准工时配置');
  } else {
    console.log('❌ 没有找到在5月19日生效的ACTIVE配置');
  }

  console.log('\n========== 分析完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
