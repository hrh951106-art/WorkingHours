import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605002';
  const recordDate = '2026-05-07';

  console.log('========================================');
  console.log(`查询员工 ${employeeNo} 在 ${recordDate} 的产量记录`);
  console.log('========================================\n');

  // 1. 查询生产记录
  const productionRecord = await prisma.personalProductionRecord.findFirst({
    where: {
      recordDate: new Date(recordDate),
      employeeNo: employeeNo,
      deletedAt: null,
    },
  });

  if (!productionRecord) {
    console.log('❌ 未找到生产记录');
    await prisma.$disconnect();
    return;
  }

  console.log('=== 生产记录 ===');
  console.log(`ID: ${productionRecord.id}`);
  console.log(`日期: ${productionRecord.recordDate.toISOString().substring(0, 10)}`);
  console.log(`员工: ${productionRecord.employeeNo}`);
  console.log(`产品: ${productionRecord.productName} (ID: ${productionRecord.productId})`);
  console.log(`产线: ${productionRecord.lineName} (ID: ${productionRecord.lineId})`);
  console.log(`实际产量: ${productionRecord.actualQty}`);
  console.log('');

  // 2. 查询产品标准配置
  console.log('=== 查询产品标准配置 ===');
  const configs = await prisma.productStandardHourByLevel.findMany({
    where: {
      productId: productionRecord.productId,
      deletedAt: null,
      status: 'ACTIVE',
    },
    orderBy: { effectiveDate: 'desc' },
  });

  console.log(`找到 ${configs.length} 条配置\n`);

  configs.forEach((config, index) => {
    const effectiveDate = config.effectiveDate.toISOString().substring(0, 10);
    const expiryDate = config.expiryDate ? config.expiryDate.toISOString().substring(0, 10) : '永久';

    // 检查2026-05-07是否在这个配置的日期范围内
    const targetDate = new Date('2026-05-07');
    const isInRange = targetDate >= new Date(config.effectiveDate) &&
                      (!config.expiryDate || targetDate <= new Date(config.expiryDate));

    console.log(`配置 ${index + 1}:`);
    console.log(`  账户层级: ${config.accountLevel}`);
    console.log(`  账户路径: ${config.accountPath || '-'}`);
    console.log(`  生效日期: ${effectiveDate}`);
    console.log(`  失效日期: ${expiryDate}`);
    console.log(`  标准件数: ${config.quantity}`);
    console.log(`  标准工时: ${config.standardHours}`);
    console.log(`  2026-05-07 是否在范围内: ${isInRange ? '✓ 是' : '✗ 否'}`);
    console.log('');
  });

  // 3. 手动检查日期匹配逻辑
  console.log('=== 日期匹配分析 ===');
  const targetDate = new Date('2026-05-07');
  console.log(`目标日期: ${targetDate.toISOString().substring(0, 10)}`);
  console.log('');

  configs.forEach((config, index) => {
    const effective = new Date(config.effectiveDate);
    const expiry = config.expiryDate ? new Date(config.expiryDate) : null;

    console.log(`配置 ${index + 1}:`);
    console.log(`  生效日期: ${effective.toISOString().substring(0, 10)}`);
    console.log(`  失效日期: ${expiry ? expiry.toISOString().substring(0, 10) : '永久'}`);

    // 检查条件1: effectiveDate <= targetDate
    const condition1 = targetDate >= effective;
    console.log(`  条件1 (生效日期 <= 目标日期): ${condition1 ? '✓' : '✗'}`);

    // 检查条件2: expiryDate为null 或 targetDate <= expiryDate
    const condition2 = !expiry || targetDate <= expiry;
    console.log(`  条件2 (失效日期为null 或 目标日期 <= 失效日期): ${condition2 ? '✓' : '✗'}`);

    const matched = condition1 && condition2;
    console.log(`  匹配结果: ${matched ? '✓ 匹配' : '✗ 不匹配'}`);
    console.log('');
  });

  // 4. 如果找到了匹配的配置，计算挣得工时
  const matchedConfig = configs.find(config => {
    const effective = new Date(config.effectiveDate);
    const expiry = config.expiryDate ? new Date(config.expiryDate) : null;
    return targetDate >= effective && (!expiry || targetDate <= expiry);
  });

  if (matchedConfig) {
    const quantity = matchedConfig.quantity || 1;
    const standardHours = matchedConfig.standardHours;
    const earnedHours = (productionRecord.actualQty / quantity) * standardHours;

    console.log('=== 使用匹配的配置计算 ===');
    console.log(`配置: ${matchedConfig.quantity}件 = ${matchedConfig.standardHours}小时`);
    console.log(`产量: ${productionRecord.actualQty}件`);
    console.log(`计算: (${productionRecord.actualQty} / ${quantity}) × ${standardHours}`);
    console.log(`结果: ${earnedHours} 小时`);
    console.log('');
  } else {
    console.log('❌ 未找到匹配的配置');
  }

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('查询失败:', e);
    process.exit(1);
  });
