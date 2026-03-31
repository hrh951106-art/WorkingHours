import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixProductionLines() {
  console.log('========================================');
  console.log('创建缺失的产线记录');
  console.log('========================================\n');

  // 定义需要创建的产线
  const linesToCreate = [
    {
      code: 'LINE_L1',
      name: 'L1产线',
      orgId: 7,
      orgName: 'L1线体',
      type: '装配线',
      capacity: 100.0,
      createdById: 1,
      createdByName: 'System',
    },
    {
      code: 'LINE_L2',
      name: 'L2产线',
      orgId: 8,
      orgName: 'L2线体',
      type: '装配线',
      capacity: 100.0,
      createdById: 1,
      createdByName: 'System',
    },
  ];

  for (const lineData of linesToCreate) {
    // 检查是否已存在
    const existing = await prisma.productionLine.findFirst({
      where: {
        orgId: lineData.orgId,
        deletedAt: null,
      },
    });

    if (existing) {
      console.log(`产线已存在: ${existing.code} - ${existing.name} (组织ID: ${lineData.orgId})`);
    } else {
      const created = await prisma.productionLine.create({
        data: lineData,
      });
      console.log(`✓ 创建产线: ${created.code} - ${created.name} (ID: ${created.id})`);
    }
  }

  console.log('\n========================================');
  console.log('更新开线记录的产线关联');
  console.log('========================================\n');

  // 获取2026-03-11的开线记录
  const lineShifts = await prisma.lineShift.findMany({
    where: {
      scheduleDate: new Date('2026-03-11'),
      deletedAt: null,
    },
  });

  for (const ls of lineShifts) {
    // 查找对应的产线
    const line = await prisma.productionLine.findFirst({
      where: {
        orgId: ls.orgId,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    if (line) {
      console.log(`✓ 开线记录 ${ls.id} 已关联组织 ${ls.orgName} (产线: ${line.code})`);
    } else {
      console.log(`❌ 开线记录 ${ls.id}: 未找到对应的产线 (组织ID: ${ls.orgId})`);
    }
  }

  console.log('\n========================================');
  console.log('修复完成！');
  console.log('========================================\n');

  console.log('现在可以重新执行分摊计算了。');
}

fixProductionLines()
  .catch((e) => {
    console.error('修复失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
