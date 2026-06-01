import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 检查产品ID=15的标准工时配置 ==========\n');

  // 1. 查询产品ID=15的信息
  console.log('【1. 产品信息】\n');
  const product = await prisma.product.findUnique({
    where: { id: 15 }
  });

  if (product) {
    console.log(`产品ID: ${product.id}`);
    console.log(`产品代码: ${product.code}`);
    console.log(`产品名称: ${product.name}`);
  } else {
    console.log('❌ 产品ID=15不存在');
    return;
  }

  // 2. 查询该产品的所有标准工时配置
  console.log('\n【2. 该产品的所有标准工时配置】\n');
  const allConfigs = await prisma.productStandardHours.findMany({
    where: {
      productId: 15
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

  // 3. 检查5月19日应该使用哪个配置
  console.log('【3. 检查5月19日匹配的配置】\n');
  const recordDate = new Date('2026-05-19');
  recordDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < allConfigs.length; i++) {
    const config = allConfigs[i];
    const isEffective = recordDate >= config.effectiveDate &&
                        (!config.expiryDate || recordDate <= config.expiryDate) &&
                        config.status === 'ACTIVE' &&
                        !config.deletedAt;

    console.log(`配置${i + 1} (ID=${config.id}): ${isEffective ? '✅ 匹配' : '❌ 不匹配'}`);
    if (!isEffective) {
      const reasons = [];
      if (recordDate < config.effectiveDate) reasons.push('日期早于生效日期');
      if (config.expiryDate && recordDate > config.expiryDate) reasons.push('日期晚于失效日期');
      if (config.status !== 'ACTIVE') reasons.push(`状态为${config.status}`);
      if (config.deletedAt) reasons.push('已删除');
      console.log(`  原因: ${reasons.join(', ')}`);
    }
  }

  // 4. 找到匹配的配置
  const matchingConfig = allConfigs.find(config =>
    recordDate >= config.effectiveDate &&
    (!config.expiryDate || recordDate <= config.expiryDate) &&
    config.status === 'ACTIVE' &&
    !config.deletedAt
  );

  console.log('\n【4. 结论】\n');
  if (matchingConfig) {
    console.log('✅ 找到匹配的配置:');
    console.log(`  配置ID: ${matchingConfig.id}`);
    console.log(`  标准工时: ${matchingConfig.standardHours}`);
    console.log(`  问题不在标准工时配置`);
  } else {
    console.log('❌ 没有找到在5月19日生效的ACTIVE配置');
    console.log('   这可能是问题所在');
  }

  console.log('\n========== 分析完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
