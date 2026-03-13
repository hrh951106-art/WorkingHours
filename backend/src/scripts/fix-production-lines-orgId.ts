import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixProductionLinesOrgId() {
  console.log('========================================');
  console.log('修复所有产线的orgId');
  console.log('========================================\n');

  // 1. 查找富阳工厂组织
  console.log('1. 查找富阳工厂组织:');
  console.log('----------------------------------------');
  const factoryOrg = await prisma.organization.findFirst({
    where: {
      code: 'A01',
      type: 'COMPANY',
    },
  });

  if (!factoryOrg) {
    console.log('未找到富阳工厂组织');
    await prisma.$disconnect();
    return;
  }

  console.log(`找到富阳工厂: ${factoryOrg.name} (ID: ${factoryOrg.id})`);
  console.log();

  // 2. 查看当前所有产线的orgId设置
  console.log('2. 当前产线的orgId设置:');
  console.log('----------------------------------------');
  const allLines = await prisma.productionLine.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: {
      id: 'asc',
    },
  });

  console.log(`找到 ${allLines.length} 条产线:\n`);

  for (const line of allLines) {
    console.log(`- ${line.name} (${line.code})`);
    console.log(`  当前orgId: ${line.orgId} (${line.orgName})`);
    console.log(`  应该设置为: ${factoryOrg.id} (${factoryOrg.name})`);
  }
  console.log();

  // 3. 更新所有产线的orgId
  console.log('3. 更新所有产线的orgId:');
  console.log('----------------------------------------');

  let updateCount = 0;
  for (const line of allLines) {
    if (line.orgId !== factoryOrg.id) {
      await prisma.productionLine.update({
        where: { id: line.id },
        data: {
          orgId: factoryOrg.id,
          orgName: factoryOrg.name,
        },
      });
      console.log(`✓ 已更新 ${line.name} (${line.code}): orgId ${line.orgId} → ${factoryOrg.id}`);
      updateCount++;
    } else {
      console.log(`- ${line.name} (${line.code}): orgId已正确`);
    }
  }
  console.log();

  console.log(`总共更新了 ${updateCount} 条产线记录`);
  console.log();

  // 4. 验证更新结果
  console.log('========================================');
  console.log('验证更新结果');
  console.log('========================================\n');

  const updatedLines = await prisma.productionLine.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: {
      id: 'asc',
    },
  });

  console.log('更新后的产线orgId:\n');
  for (const line of updatedLines) {
    console.log(`- ${line.name} (${line.code})`);
    console.log(`  orgId: ${line.orgId} (${line.orgName})`);
    console.log(`  workshopId: ${line.workshopId} (${line.workshopName || '未设置'})`);
  }
  console.log();

  // 5. 计算按工厂汇总后的分摊比例
  console.log('========================================');
  console.log('预期分摊结果（修复后）');
  console.log('========================================\n');

  console.log('当按工厂级别分摊时，所有产线都会汇总到富阳工厂下：\n');

  // 查询3月11日的产量数据
  const productionRecords = await prisma.productionRecord.findMany({
    where: {
      recordDate: new Date('2026-03-11'),
      deletedAt: null,
    },
    include: {
      line: true,
    },
  });

  const productionByLine = new Map<string, number>();
  for (const pr of productionRecords) {
    if (pr.line) {
      const key = pr.line.code;
      if (!productionByLine.has(key)) {
        productionByLine.set(key, 0);
      }
      productionByLine.set(key, productionByLine.get(key)! + (pr.actualQty || 0));
    }
  }

  let totalProduction = 0;
  for (const [, qty] of productionByLine.entries()) {
    totalProduction += qty;
  }

  console.log('各产线产量:');
  for (const [lineCode, qty] of productionByLine.entries()) {
    const ratio = (qty / totalProduction * 100).toFixed(2);
    console.log(`  - ${lineCode}: ${qty} 件 (占比: ${ratio}%)`);
  }
  console.log();
  console.log(`总产量: ${totalProduction} 件`);
  console.log();

  console.log('预期分摊结果（假设某人有8小时间接工时）:');
  for (const [lineCode, qty] of productionByLine.entries()) {
    const allocatedHours = (qty / totalProduction * 8).toFixed(2);
    console.log(`  - ${lineCode}: ${allocatedHours} 小时`);
  }
  console.log();

  console.log('========================================');
  console.log('修复完成');
  console.log('========================================\n');

  console.log('✓ 所有产线的orgId已更新为富阳工厂');
  console.log('✓ 现在可以重新执行G01配置的分摊操作');
  console.log('✓ 系统将正确按工厂汇总产量并计算分摊比例');
  console.log('========================================');
}

fixProductionLinesOrgId()
  .catch((e) => {
    console.error('修复失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
