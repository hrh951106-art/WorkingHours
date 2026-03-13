import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testStandardHoursAllocation() {
  console.log('========================================');
  console.log('测试标准工时分摊功能');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');

  // 1. 检查产品标准工时
  console.log('1. 检查产品标准工时');
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
      standardHours: true,
      conversionFactor: true,
    },
  });

  console.log('找到 ' + products.length + ' 个产品:\n');
  products.forEach(p => {
    console.log('  ' + p.name + ' (' + p.code + ')');
    console.log('    标准工时: ' + p.standardHours + ' 小时/件');
    console.log('    转换系数: ' + p.conversionFactor);
  });
  console.log();

  // 2. 检查产量记录并计算标准工时
  console.log('2. 检查产量记录并计算标准工时');
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
          standardHours: true,
        },
      },
    },
  });

  console.log('找到 ' + productionRecords.length + ' 条产量记录:\n');

  // 按产线-班次汇总实际产量和标准工时
  const byLineAndShift: Record<string, { actualQty: number; standardHours: number }> = {};

  for (const record of productionRecords) {
    if (record.lineId && record.shiftId) {
      const key = record.lineId + '-' + record.shiftId;
      if (!byLineAndShift[key]) {
        byLineAndShift[key] = { actualQty: 0, standardHours: 0 };
      }

      const productStandardHours = record.product?.standardHours || 0;
      const actualQty = record.actualQty || 0;
      const standardHours = actualQty * productStandardHours;

      byLineAndShift[key].actualQty += actualQty;
      byLineAndShift[key].standardHours += standardHours;
    }
  }

  for (const key in byLineAndShift) {
    const [lineId, shiftId] = key.split('-');
    console.log('产线ID: ' + lineId + ', 班次ID: ' + shiftId);
    console.log('  实际产量: ' + byLineAndShift[key].actualQty + ' 件');
    console.log('  标准工时: ' + byLineAndShift[key].standardHours.toFixed(2) + ' 小时');
    console.log();
  }

  // 3. 计算分摊比例和预期结果
  console.log('3. 计算分摊比例和预期结果');
  console.log('========================================\n');

  const totalStandardHours = Object.values(byLineAndShift).reduce((sum, item) => sum + item.standardHours, 0);
  console.log('车间总标准工时: ' + totalStandardHours.toFixed(2) + ' 小时\n');

  const indirectHours = 8.5; // 假设李四有8.5h间接工时
  console.log('待分摊工时: ' + indirectHours + ' 小时\n');

  console.log('预期分摊结果:');
  for (const key in byLineAndShift) {
    const [lineId, shiftId] = key.split('-');
    const ratio = byLineAndShift[key].standardHours / totalStandardHours;
    const allocatedHours = indirectHours * ratio;
    console.log('  产线ID ' + lineId + ':');
    console.log('    标准工时: ' + byLineAndShift[key].standardHours.toFixed(2) + ' 小时');
    console.log('    分摊比例: ' + (ratio * 100).toFixed(2) + '%');
    console.log('    分摊工时: ' + allocatedHours.toFixed(3) + ' 小时');
    console.log();
  }

  // 4. 检查是否有按标准工时分摊的配置
  console.log('4. 检查按标准工时分摊的配置');
  console.log('========================================\n');

  const standardHoursConfigs = await prisma.allocationConfig.findMany({
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

  const standardHoursRules = standardHoursConfigs
    .flatMap(config => config.rules.map(rule => ({ config, rule })))
    .filter(({ rule }) => rule.allocationBasis === 'STANDARD_HOURS');

  if (standardHoursRules.length === 0) {
    console.log('❌ 没有找到按标准工时分摊的配置');
    console.log('\n需要创建一个配置，设置 allocationBasis = STANDARD_HOURS');
  } else {
    console.log('找到 ' + standardHoursRules.length + ' 个按标准工时分摊的规则:\n');
    standardHoursRules.forEach(({ config, rule }) => {
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

testStandardHoursAllocation()
  .catch((e) => {
    console.error('测试失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
