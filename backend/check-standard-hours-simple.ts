import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 检查产品标准工时配置 ==========\n');

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
  console.log(`组织ID: ${productionRecord.orgId}`);
  console.log(`组织名称: ${productionRecord.orgName}`);
  console.log(`记录日期: ${productionRecord.recordDate.toISOString().substring(0, 10)}`);

  // 2. 查找该产品的标准工时配置
  console.log('\n【2. 标准工时配置查询】\n');
  const recordDate = new Date(productionRecord.recordDate);
  recordDate.setHours(0, 0, 0, 0);

  // 查询所有该产品的标准工时配置
  const allConfigs = await prisma.productStandardHours.findMany({
    where: {
      productId: productionRecord.productId,
      status: 'ACTIVE',
      deletedAt: null
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`找到 ${allConfigs.length} 个标准工时配置\n`);

  if (allConfigs.length === 0) {
    console.log('❌ 没有找到该产品的任何标准工时配置！');
    console.log('   这就是导致没有分摊结果的根本原因！');
    console.log('\n建议:');
    console.log('  1. 为该产品创建标准工时配置');
    console.log('  2. 确保配置状态为ACTIVE');
    return;
  }

  // 显示所有配置
  for (let i = 0; i < allConfigs.length; i++) {
    const config = allConfigs[i];
    console.log(`配置${i + 1}:`);
    console.log(`  ID: ${config.id}`);
    console.log(`  产品ID: ${config.productId}`);
    console.log(`  工序ID: ${config.processId || '(未指定)'}`);
    console.log(`  工序名称: ${config.processName || '(未指定)'}`);
    console.log(`  状态: ${config.status}`);
    console.log(`  生效日期: ${config.effectiveDate.toISOString().substring(0, 10)}`);
    console.log(`  失效日期: ${config.expiryDate ? config.expiryDate.toISOString().substring(0, 10) : '无限期'}`);
    console.log(`  标准工时: ${config.standardHours}`);
    console.log(`  创建时间: ${config.createdAt.toISOString().substring(0, 10)}`);

    // 检查是否在5月19日生效
    const isEffective = recordDate >= config.effectiveDate &&
                        (!config.expiryDate || recordDate <= config.expiryDate);
    console.log(`  在5月19日生效: ${isEffective ? '✅ 是' : '❌ 否'}`);

    if (!isEffective) {
      if (recordDate < config.effectiveDate) {
        console.log(`    ❌ 生产记录日期早于生效日期`);
      }
      if (config.expiryDate && recordDate > config.expiryDate) {
        console.log(`    ❌ 生产记录日期晚于失效日期`);
      }
    }

    console.log('');
  }

  // 3. 模拟findMatchingStandardHourConfig的逻辑
  console.log('【3. 匹配逻辑模拟】\n');

  // 按照代码的匹配逻辑：找到在5月19日生效的配置
  const matchingConfig = allConfigs.find(config =>
    recordDate >= config.effectiveDate &&
    (!config.expiryDate || recordDate <= config.expiryDate)
  );

  if (matchingConfig) {
    console.log(`✅ 找到匹配的配置`);
    console.log(`  配置ID: ${matchingConfig.id}`);
    console.log(`  标准工时: ${matchingConfig.standardHours}`);
    console.log(`  工序: ${matchingConfig.processName || '(未指定)'}`);
  } else {
    console.log(`❌ 没有找到匹配的标准工时配置！`);
    console.log('   这就是导致没有分摊结果的根本原因！');
    return;
  }

  // 4. 计算总得工时
  console.log('\n【4. 计算总得工时】\n');
  const quantity = 1; // 默认标准件数为1
  const standardHours = matchingConfig.standardHours;
  const totalEarnedHours = (productionRecord.actualQty / quantity) * standardHours;

  console.log(`标准件数: ${quantity}`);
  console.log(`标准工时: ${standardHours}`);
  console.log(`实际产量: ${productionRecord.actualQty}`);
  console.log(`总得工时: ${totalEarnedHours.toFixed(2)} 小时`);

  if (totalEarnedHours <= 0) {
    console.log('\n❌ 总得工时为0或负数，无法进行分摊！');
    return;
  }

  // 5. 总结
  console.log('\n【5. 总结】\n');
  console.log('✅ 标准工时配置检查通过');
  console.log('   找到匹配的配置，可以计算总得工时');
  console.log('   问题不在标准工时配置');

  console.log('\n========== 分析完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
