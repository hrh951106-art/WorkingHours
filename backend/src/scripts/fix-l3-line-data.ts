import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixL3LineData() {
  console.log('========================================');
  console.log('创建L3产线并修复数据关联');
  console.log('========================================\n');

  // 1. 检查是否已存在W2或L3相关的组织
  console.log('1. 检查现有组织:');
  console.log('----------------------------------------');

  // 查找可能的W2组织
  const w2Orgs = await prisma.organization.findMany({
    where: {
      OR: [
        { name: { contains: 'W2' } },
        { name: { contains: '总装' } },
        { code: { contains: 'W2' } },
      ],
    },
  });

  let w2Org: any;

  if (w2Orgs.length > 0) {
    console.log(`找到 ${w2Orgs.length} 个W2相关组织:`);
    for (const org of w2Orgs) {
      console.log(`  - ${org.name} (${org.code}), ID: ${org.id}, 类型: ${org.type}`);
    }
    // 使用第一个找到的组织
    w2Org = w2Orgs[0];
    console.log(`\n使用组织: ${w2Org.name} (ID: ${w2Org.id})`);
  } else {
    console.log('未找到W2相关组织，创建W2总装车间组织...');

    // 先查找一个工厂级别的组织作为父级
    const factoryOrgs = await prisma.organization.findMany({
      where: {
        type: 'FACTORY',
      },
      take: 1,
    });

    const parentId = factoryOrgs.length > 0 ? factoryOrgs[0].id : null;

    // 创建W2总装车间组织
    w2Org = await prisma.organization.create({
      data: {
        name: 'W2总装车间',
        code: 'W2_WORKSHOP',
        type: 'WORKSHOP',
        parentId: parentId,
        level: 2,
        effectiveDate: new Date('2026-01-01'),
        expiryDate: new Date('2099-12-31'),
        status: 'ACTIVE',
        leaderName: '系统管理员',
      },
    });
    console.log(`✓ 已创建组织: ${w2Org.name} (ID: ${w2Org.id})`);
  }
  console.log();

  // 2. 创建L3产线
  console.log('2. 创建L3产线:');
  console.log('----------------------------------------');

  // 检查L3产线是否已存在
  const existingL3Line = await prisma.productionLine.findFirst({
    where: {
      OR: [
        { code: { contains: 'L3' } },
        { name: { contains: 'L3' } },
      ],
    },
  });

  let l3Line: any;

  if (existingL3Line) {
    console.log(`L3产线已存在: ${existingL3Line.name} (${existingL3Line.code}), ID: ${existingL3Line.id}`);
    l3Line = existingL3Line;
  } else {
    // 创建L3产线
    l3Line = await prisma.productionLine.create({
      data: {
        name: 'L3产线',
        code: 'LINE_L3',
        orgId: w2Org.id,
        orgName: w2Org.name,
        workshopId: w2Org.id,
        workshopName: w2Org.name,
        type: 'LINE',
        status: 'ACTIVE',
        capacity: 100,
        description: 'W2总装车间L3产线',
        createdById: 1,
        createdByName: '系统',
      },
    });

    console.log(`✓ 已创建L3产线:`);
    console.log(`  名称: ${l3Line.name}`);
    console.log(`  代码: ${l3Line.code}`);
    console.log(`  ID: ${l3Line.id}`);
    console.log(`  工厂: ${l3Line.orgName} (ID: ${l3Line.orgId})`);
    console.log(`  车间: ${l3Line.workshopName} (ID: ${l3Line.workshopId})`);
  }
  console.log();

  // 3. 更新开线记录
  console.log('3. 更新开线记录:');
  console.log('----------------------------------------');

  // 查找3月11日lineId为空的开线记录
  const orphanLineShifts = await prisma.lineShift.findMany({
    where: {
      scheduleDate: new Date('2026-03-11'),
      lineId: null,
    },
  });

  console.log(`找到 ${orphanLineShifts.length} 条未关联的开线记录`);

  if (orphanLineShifts.length > 0) {
    for (const ls of orphanLineShifts) {
      await prisma.lineShift.update({
        where: { id: ls.id },
        data: {
          lineId: l3Line.id,
          orgId: l3Line.orgId,
          orgName: l3Line.orgName,
        },
      });
      console.log(`  ✓ 已更新开线记录 ID ${ls.id}: 关联到 ${l3Line.name}`);
    }
  }
  console.log();

  // 4. 更新产量记录
  console.log('4. 更新产量记录:');
  console.log('----------------------------------------');

  // 查找3月11日lineId为空的产量记录
  const orphanProductionRecords = await prisma.productionRecord.findMany({
    where: {
      recordDate: new Date('2026-03-11'),
      lineId: null,
    },
  });

  console.log(`找到 ${orphanProductionRecords.length} 条未关联的产量记录`);

  if (orphanProductionRecords.length > 0) {
    for (const pr of orphanProductionRecords) {
      await prisma.productionRecord.update({
        where: { id: pr.id },
        data: {
          lineId: l3Line.id,
          lineName: l3Line.name,
        },
      });
      console.log(`  ✓ 已更新产量记录 ID ${pr.id}: 关联到 ${l3Line.name}, ${pr.actualQty}件`);
    }
  }
  console.log();

  // 5. 创建L3的间接设备账户（如果不存在）
  console.log('5. 检查L3的间接设备账户:');
  console.log('----------------------------------------');

  // 检查是否有间接设备账户（根据LaborAccount的schema结构）
  // 注意：LaborAccount没有orgId等字段，而是使用parentId来建立层级关系

  // 先查找一个线体级别的间接账户作为参考
  const existingLineIndirectAccounts = await prisma.laborAccount.findMany({
    where: {
      type: 'LINE',
      name: {
        endsWith: '//间接设备',
      },
    },
    take: 1,
  });

  if (existingLineIndirectAccounts.length === 0) {
    console.log('系统中暂无间接设备账户，跳过创建');
    console.log('（注意：分摊时需要间接设备账户才能接收工时）');
  } else {
    const refAccount = existingLineIndirectAccounts[0];
    console.log(`找到参考账户: ${refAccount.name} (ID: ${refAccount.id})`);

    // 检查L3的间接设备账户是否已存在
    const existingL3IndirectAccount = await prisma.laborAccount.findFirst({
      where: {
        name: {
          endsWith: 'L3产线////间接设备',
        },
      },
    });

    if (existingL3IndirectAccount) {
      console.log(`L3的间接设备账户已存在: ${existingL3IndirectAccount.name} (ID: ${existingL3IndirectAccount.id})`);
    } else {
      // 创建L3的间接设备账户
      const indirectAccount = await prisma.laborAccount.create({
        data: {
          name: `W2总装车间/L3产线////间接设备`,
          code: `W2_L3_INDIRECT_${l3Line.id}`,
          type: 'LINE',
          level: 4,
          path: `${refAccount.path}/${l3Line.id}`,
          namePath: `${refAccount.namePath}/W2总装车间/L3产线/间接设备`,
          parentId: refAccount.parentId,
          employeeId: null,
          effectiveDate: new Date('2026-01-01'),
          expiryDate: new Date('2099-12-31'),
          status: 'ACTIVE',
          usageType: 'SHIFT',
        },
      });

      console.log(`✓ 已创建间接设备账户:`);
      console.log(`  名称: ${indirectAccount.name}`);
      console.log(`  代码: ${indirectAccount.code}`);
      console.log(`  ID: ${indirectAccount.id}`);
    }
  }
  console.log();

  // 6. 验证修复结果
  console.log('========================================');
  console.log('验证修复结果');
  console.log('========================================\n');

  // 重新查询3月11日的数据
  const march11LineShifts = await prisma.lineShift.findMany({
    where: {
      scheduleDate: new Date('2026-03-11'),
    },
    include: {
      line: true,
    },
    orderBy: {
      lineId: 'asc',
    },
  });

  console.log('3月11日开线记录:');
  for (const ls of march11LineShifts) {
    if (ls.line) {
      console.log(`  - ${ls.line.name} (${ls.line.code}), 工厂: ${ls.line.orgName}`);
    } else {
      console.log(`  - 未关联产线 (ID: ${ls.id})`);
    }
  }
  console.log();

  // 查询3月11日的产量数据
  const march11Production = await prisma.productionRecord.findMany({
    where: {
      recordDate: new Date('2026-03-11'),
    },
    include: {
      line: true,
    },
  });

  console.log('3月11日产量数据:');
  const productionByLine = new Map<string, number>();
  for (const pr of march11Production) {
    if (pr.line) {
      const key = pr.line.code;
      if (!productionByLine.has(key)) {
        productionByLine.set(key, 0);
      }
      productionByLine.set(key, productionByLine.get(key)! + (pr.actualQty || 0));
    }
  }

  for (const [lineCode, qty] of productionByLine.entries()) {
    console.log(`  - ${lineCode}: ${qty} 件`);
  }
  console.log();

  // 按工厂汇总
  console.log('按工厂汇总:');
  const productionByFactory = new Map<string, number>();
  for (const pr of march11Production) {
    if (pr.line) {
      const key = pr.line.orgName;
      if (!productionByFactory.has(key)) {
        productionByFactory.set(key, 0);
      }
      productionByFactory.set(key, productionByFactory.get(key)! + (pr.actualQty || 0));
    }
  }

  for (const [factoryName, qty] of productionByFactory.entries()) {
    console.log(`  - ${factoryName}: ${qty} 件`);
  }
  console.log();

  // 计算分摊比例
  const totalProduction = Array.from(productionByFactory.values()).reduce((sum, qty) => sum + qty, 0);
  console.log('各工厂占比（用于分摊）:');
  for (const [factoryName, qty] of productionByFactory.entries()) {
    const ratio = (qty / totalProduction * 100).toFixed(2);
    console.log(`  - ${factoryName}: ${ratio}%`);
  }
  console.log();

  console.log('========================================');
  console.log('修复完成');
  console.log('========================================\n');

  console.log('✓ 已创建L3产线');
  console.log('✓ 已更新开线记录');
  console.log('✓ 已更新产量记录');
  console.log('\n现在可以重新执行G01配置的分摊操作，');
  console.log('系统将按照工厂级别进行分摊，L3产线将获得相应的工时。');
  console.log('\n预期分摊结果（假设某人有8小时间接工时）:');
  for (const [factoryName, qty] of productionByFactory.entries()) {
    const allocatedHours = (qty / totalProduction * 8).toFixed(2);
    console.log(`  - ${factoryName}: ${allocatedHours} 小时`);
  }
  console.log('========================================');
}

fixL3LineData()
  .catch((e) => {
    console.error('修复失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
