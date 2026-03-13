import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProductionRecords() {
  console.log('========================================');
  console.log('检查3月11日产量记录详情');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');

  const productionRecords = await prisma.productionRecord.findMany({
    where: {
      recordDate: calcDate,
      deletedAt: null,
    },
    include: {
      line: true,
      product: true,
    },
  });

  console.log(`找到 ${productionRecords.length} 条产量记录:\n`);

  productionRecords.forEach((r, idx) => {
    console.log(`${idx + 1}. 产量记录详情:`);
    console.log(`   ID: ${r.id}`);
    console.log(`   产线ID: ${r.lineId || 'NULL'}`);
    console.log(`   产线名称: ${r.lineName || 'N/A'}`);
    console.log(`   班次ID: ${r.shiftId}`);
    console.log(`   班次名称: ${r.shiftName}`);
    console.log(`   产品ID: ${r.productId}`);
    console.log(`   产品名称: ${r.productName}`);
    console.log(`   计划产量: ${r.plannedQty}`);
    console.log(`   实际产量: ${r.actualQty}`);
    console.log(`   组织ID: ${r.orgId}`);
    console.log(`   组织名称: ${r.orgName}`);
    console.log();
  });

  console.log('========================================');
  console.log('问题分析:');
  console.log('========================================\n');

  const hasLineId = productionRecords.filter(r => r.lineId).length;
  const hasShiftId = productionRecords.filter(r => r.shiftId).length;

  console.log(`有产线ID的记录: ${hasLineId}/${productionRecords.length}`);
  console.log(`有班次ID的记录: ${hasShiftId}/${productionRecords.length}\n`);

  if (hasLineId === 0) {
    console.log('❌ 主要问题: 产量记录缺少产线ID (lineId)');
    console.log('   解决方案: 需要更新产量记录，关联正确的产线\n');
  }

  if (hasShiftId === 0) {
    console.log('❌ 主要问题: 产量记录缺少班次ID (shiftId)');
    console.log('   解决方案: 需要更新产量记录，关联正确的班次\n');
  }

  // 检查是否有产线数据可以关联
  console.log('========================================');
  console.log('可用的产线数据:');
  console.log('========================================\n');

  const lines = await prisma.productionLine.findMany({
    where: {
      deletedAt: null,
    },
  });

  lines.forEach(line => {
    console.log(`- ${line.name} (ID: ${line.id}, 组织: ${line.orgName})`);
  });

  console.log('\n========================================');
}

checkProductionRecords()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
