import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========================================');
  console.log('测试根据记录日期匹配标准配置');
  console.log('========================================\n');

  // 测试场景1：2026-05-07应该匹配配置1（100件=1小时）
  console.log('场景1：2026-05-07的记录');
  const targetDate1 = new Date('2026-05-07');
  targetDate1.setHours(0, 0, 0, 0);

  const config1 = await prisma.productStandardHourByLevel.findFirst({
    where: {
      productId: 15,
      deletedAt: null,
      status: 'ACTIVE',
      effectiveDate: { lte: targetDate1 },
      expiryDate: { gte: targetDate1 },
    },
  });

  if (config1) {
    const effective = config1.effectiveDate.toISOString().substring(0, 10);
    const expiry = config1.expiryDate ? config1.expiryDate.toISOString().substring(0, 10) : '永久';
    console.log(`✓ 找到配置: ${config1.quantity}件=${config1.standardHours}小时 (${effective} - ${expiry})`);
    const earnedHours = (300 / config1.quantity) * config1.standardHours;
    console.log(`✓ 计算结果: 300件 = ${earnedHours}小时\n`);
  } else {
    console.log('✗ 未找到配置\n');
  }

  // 测试场景2：2026-05-15应该匹配配置2（100件=1.5小时）
  console.log('场景2：2026-05-15的记录');
  const targetDate2 = new Date('2026-05-15');
  targetDate2.setHours(0, 0, 0, 0);

  const config2 = await prisma.productStandardHourByLevel.findFirst({
    where: {
      productId: 15,
      deletedAt: null,
      status: 'ACTIVE',
      effectiveDate: { lte: targetDate2 },
      expiryDate: { gte: targetDate2 },
    },
  });

  if (config2) {
    const effective = config2.effectiveDate.toISOString().substring(0, 10);
    const expiry = config2.expiryDate ? config2.expiryDate.toISOString().substring(0, 10) : '永久';
    console.log(`✓ 找到配置: ${config2.quantity}件=${config2.standardHours}小时 (${effective} - ${expiry})`);
    const earnedHours = (300 / config2.quantity) * config2.standardHours;
    console.log(`✓ 计算结果: 300件 = ${earnedHours}小时\n`);
  } else {
    console.log('✗ 未找到配置，尝试查询永久配置');

    const permanentConfig = await prisma.productStandardHourByLevel.findFirst({
      where: {
        productId: 15,
        deletedAt: null,
        status: 'ACTIVE',
        effectiveDate: { lte: targetDate2 },
        expiryDate: null,
      },
    });

    if (permanentConfig) {
      const effective = permanentConfig.effectiveDate.toISOString().substring(0, 10);
      console.log(`✓ 找到永久配置: ${permanentConfig.quantity}件=${permanentConfig.standardHours}小时 (${effective} - 永久)`);
      const earnedHours = (300 / permanentConfig.quantity) * permanentConfig.standardHours;
      console.log(`✓ 计算结果: 300件 = ${earnedHours}小时\n`);
    }
  }

  console.log('========================================');
  console.log('测试完成');
  console.log('========================================');

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('测试失败:', e);
    process.exit(1);
  });
