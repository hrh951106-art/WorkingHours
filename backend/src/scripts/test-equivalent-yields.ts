import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testEquivalentYields() {
  console.log('========================================');
  console.log('测试同效产量分摊功能');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');

  // 1. 检查产品转换系数
  console.log('1. 检查产品转换系数');
  console.log('========================================\n');

  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
    },
    select: {
      id: true,
      code: true,
      name: true,
      conversionFactor: true,
    },
  });

  console.log('找到 ' + products.length + ' 个产品:\n');
  products.forEach(p => {
    console.log('  ' + p.name + ' (' + p.code + ')');
    console.log('    转换系数: ' + p.conversionFactor);
  });
  console.log();

  // 2. 检查产量记录
  console.log('2. 检查产量记录');
  console.log('========================================\n');

  const productionRecords = await prisma.productionRecord.findMany({
    where: {
      recordDate: calcDate,
      deletedAt: null,
    },
    include: {
      product: {
        select: {
          name: true,
          conversionFactor: true,
        },
      },
    },
  });

  console.log('找到 ' + productionRecords.length + ' 条产量记录:\n');

  // 按产线-班次汇总实际产量和标准产量
  const byLineAndShift: Record<string, { actualQty: number; equivalentQty: number }> = {};

  for (const record of productionRecords) {
    if (record.lineId && record.shiftId) {
      const key = record.lineId + '-' + record.shiftId;
      if (!byLineAndShift[key]) {
        byLineAndShift[key] = { actualQty: 0, equivalentQty: 0 };
      }

      const conversionFactor = record.product?.conversionFactor || 1.0;
      const actualQty = record.actualQty || 0;
      const equivalentQty = actualQty * conversionFactor;

      byLineAndShift[key].actualQty += actualQty;
      byLineAndShift[key].equivalentQty += equivalentQty;
    }
  }

  for (const key in byLineAndShift) {
    const [lineId, shiftId] = key.split('-');
    console.log('产线ID: ' + lineId + ', 班次ID: ' + shiftId);
    console.log('  实际产量: ' + byLineAndShift[key].actualQty);
    console.log('  标准产量: ' + byLineAndShift[key].equivalentQty);
    console.log();
  }

  // 3. 检查是否有按同效产量分摊的配置
  console.log('3. 检查按同效产量分摊的配置');
  console.log('========================================\n');

  const equivalentYieldConfigs = await prisma.allocationConfig.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
    },
    include: {
      rules: {
        where: {
          deletedAt: null,
        },
      },
    },
  });

  const equivalentYieldRules = equivalentYieldConfigs
    .flatMap(config => config.rules.map(rule => ({ config, rule })))
    .filter(({ rule }) => rule.allocationBasis === 'EQUIVALENT_YIELDS');

  if (equivalentYieldRules.length === 0) {
    console.log('❌ 没有找到按同效产量分摊的配置');
    console.log('\n需要创建一个配置，设置 allocationBasis = EQUIVALENT_YIELDS');
  } else {
    console.log('找到 ' + equivalentYieldRules.length + ' 个按同效产量分摊的规则:\n');
    equivalentYieldRules.forEach(({ config, rule }) => {
      console.log('  配置: ' + config.configName + ' (' + config.configCode + ')');
      console.log('  规则: ' + rule.ruleName);
      console.log('  状态: ' + rule.status);
      console.log();
    });
  }

  console.log('========================================');
  console.log('测试完成');
  console.log('========================================');
}

testEquivalentYields()
  .catch((e) => {
    console.error('测试失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
