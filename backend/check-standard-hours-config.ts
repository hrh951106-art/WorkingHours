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
    console.log(`  组织ID: ${config.orgId || '(未指定)'}`);
    console.log(`  状态: ${config.status}`);
    console.log(`  生效开始时间: ${config.effectiveStartTime ? config.effectiveStartTime.toISOString().substring(0, 10) : '未设置'}`);
    console.log(`  生效结束时间: ${config.effectiveEndTime ? config.effectiveEndTime.toISOString().substring(0, 10) : '无限期'}`);
    console.log(`  标准件数: ${config.quantity}`);
    console.log(`  标准工时: ${config.standardHours}`);
    console.log(`  创建时间: ${config.createdAt.toISOString().substring(0, 10)}`);

    // 检查是否在5月19日生效
    const isEffective = (!config.effectiveStartTime || recordDate >= config.effectiveStartTime) &&
                        (!config.effectiveEndTime || recordDate <= config.effectiveEndTime);
    console.log(`  在5月19日生效: ${isEffective ? '✅ 是' : '❌ 否'}`);

    // 检查组织匹配
    if (config.orgId) {
      const orgMatch = config.orgId === productionRecord.orgId;
      console.log(`  组织匹配: ${orgMatch ? '✅ 是' : '❌ 否'} (配置orgId=${config.orgId}, 生产记录orgId=${productionRecord.orgId})`);
    } else {
      console.log(`  组织匹配: ✅ 是 (配置适用于所有组织)`);
    }

    console.log('');
  }

  // 3. 模拟findMatchingStandardHourConfig的逻辑
  console.log('【3. 匹配逻辑模拟】\n');

  // 按照代码的匹配逻辑：优先匹配orgId，其次匹配通配配置
  let matchingConfig = null;

  // 先尝试找到精确匹配orgId的配置
  const exactMatch = allConfigs.find(config =>
    config.orgId === productionRecord.orgId &&
    (!config.effectiveStartTime || recordDate >= config.effectiveStartTime) &&
    (!config.effectiveEndTime || recordDate <= config.effectiveEndTime)
  );

  if (exactMatch) {
    matchingConfig = exactMatch;
    console.log(`✅ 找到精确匹配的配置 (orgId=${productionRecord.orgId})`);
    console.log(`  配置ID: ${exactMatch.id}`);
    console.log(`  标准件数: ${exactMatch.quantity}`);
    console.log(`  标准工时: ${exactMatch.standardHours}`);
  } else {
    // 如果没有精确匹配，查找通用配置
    const genericMatch = allConfigs.find(config =>
      !config.orgId &&
      (!config.effectiveStartTime || recordDate >= config.effectiveStartTime) &&
      (!config.effectiveEndTime || recordDate <= config.effectiveEndTime)
    );

    if (genericMatch) {
      matchingConfig = genericMatch;
      console.log(`✅ 找到通用配置 (适用于所有组织)`);
      console.log(`  配置ID: ${genericMatch.id}`);
      console.log(`  标准件数: ${genericMatch.quantity}`);
      console.log(`  标准工时: ${genericMatch.standardHours}`);
    } else {
      console.log(`❌ 没有找到匹配的标准工时配置！`);
      console.log('   这就是导致没有分摊结果的根本原因！');
    }
  }

  // 4. 计算总得工时
  console.log('\n【4. 计算总得工时】\n');
  if (matchingConfig) {
    const quantity = matchingConfig.quantity || 1;
    const standardHours = matchingConfig.standardHours;
    const totalEarnedHours = (productionRecord.actualQty / quantity) * standardHours;

    console.log(`标准件数: ${quantity}`);
    console.log(`标准工时: ${standardHours}`);
    console.log(`实际产量: ${productionRecord.actualQty}`);
    console.log(`总得工时: ${totalEarnedHours.toFixed(2)} 小时`);

    if (totalEarnedHours <= 0) {
      console.log('\n❌ 总得工时为0或负数，无法进行分摊！');
    }
  }

  console.log('\n========== 分析完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
