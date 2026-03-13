import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixProductionRecords() {
  console.log('========================================');
  console.log('修复产量记录的产线关联');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');

  // 1. 获取所有产线
  const lines = await prisma.productionLine.findMany({
    where: {
      deletedAt: null,
    },
  });

  // 建立组织名称到产线的映射
  const orgNameToLine: Record<string, any> = {};
  lines.forEach(line => {
    orgNameToLine[line.orgName] = line;
  });

  console.log('组织名称到产线的映射:');
  Object.entries(orgNameToLine).forEach(([orgName, line]) => {
    console.log(`  "${orgName}" → ${line.name} (ID: ${line.id})`);
  });
  console.log();

  // 2. 获取3月11日的产量记录
  const productionRecords = await prisma.productionRecord.findMany({
    where: {
      recordDate: calcDate,
      deletedAt: null,
    },
  });

  console.log(`找到 ${productionRecords.length} 条产量记录需要修复\n`);

  // 3. 更新产量记录
  for (const record of productionRecords) {
    console.log(`处理记录 ID: ${record.id}`);
    console.log(`  组织名称: ${record.orgName}`);
    console.log(`  实际产量: ${record.actualQty}`);

    // 根据组织名称查找产线
    const line = orgNameToLine[record.orgName];

    if (!line) {
      console.log(`  ⚠️  未找到匹配的产线，跳过\n`);
      continue;
    }

    console.log(`  匹配到产线: ${line.name} (ID: ${line.id})`);

    // 更新记录
    await prisma.productionRecord.update({
      where: { id: record.id },
      data: {
        lineId: line.id,
        lineName: line.name,
      },
    });

    console.log(`  ✓ 已更新产线关联\n`);
  }

  // 4. 验证修复结果
  console.log('========================================');
  console.log('验证修复结果');
  console.log('========================================\n');

  const updatedRecords = await prisma.productionRecord.findMany({
    where: {
      recordDate: calcDate,
      deletedAt: null,
    },
    include: {
      line: true,
    },
  });

  console.log('修复后的产量记录:\n');

  // 按产线-班次汇总
  const byLineAndShift: Record<string, { qty: number; lineName: string; shiftName: string }> = {};

  updatedRecords.forEach(r => {
    if (r.lineId && r.shiftId) {
      const key = `${r.lineId}-${r.shiftId}`;
      if (!byLineAndShift[key]) {
        byLineAndShift[key] = {
          qty: 0,
          lineName: r.line?.name || `产线${r.lineId}`,
          shiftName: r.shiftName || `班次${r.shiftId}`,
        };
      }
      byLineAndShift[key].qty += r.actualQty;
    }
  });

  if (Object.keys(byLineAndShift).length === 0) {
    console.log('❌ 仍然没有有效的产量数据（lineId或shiftId为null）\n');
  } else {
    console.log('按产线-班次汇总的产量:\n');
    Object.entries(byLineAndShift).forEach(([key, data]) => {
      console.log(`  ${data.lineName} - ${data.shiftName}: ${data.qty}`);
    });
    console.log('\n✓ 产量数据已修复，可以重新执行按产量分摊');
  }

  console.log('\n========================================');
}

fixProductionRecords()
  .catch((e) => {
    console.error('修复失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
