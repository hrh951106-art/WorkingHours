import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProductionLines() {
  console.log('========================================');
  console.log('检查 ProductionLine 表数据');
  console.log('========================================\n');

  // 检查所有产线
  const allLines = await prisma.productionLine.findMany({
    where: {
      deletedAt: null,
    },
  });

  console.log(`总产线数量: ${allLines.length}\n`);

  if (allLines.length === 0) {
    console.log('ProductionLine 表中没有任何产线数据！');
    console.log('\n需要先创建产线数据。');
    return;
  }

  console.log('所有产线列表:');
  allLines.forEach(line => {
    console.log(`ID: ${line.id}`);
    console.log(`  编码: ${line.code}`);
    console.log(`  名称: ${line.name}`);
    console.log(`  组织ID: ${line.orgId}`);
    console.log(`  组织名称: ${line.orgName}`);
    console.log(`  状态: ${line.status}`);
    console.log();
  });

  // 检查 orgId 为 7 和 8 的产线
  const targetOrgIds = [7, 8];
  console.log('========================================');
  console.log('检查组织ID 7, 8 对应的产线');
  console.log('========================================\n');

  for (const orgId of targetOrgIds) {
    const lines = await prisma.productionLine.findMany({
      where: {
        orgId,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    console.log(`组织ID ${orgId}:`);
    if (lines.length === 0) {
      console.log(`  没有找到对应的产线`);
    } else {
      lines.forEach(line => {
        console.log(`  产线ID: ${line.id}, 编码: ${line.code}, 名称: ${line.name}`);
      });
    }
    console.log();
  }

  // 检查开线计划
  console.log('========================================');
  console.log('检查 2026-03-11 的开线计划');
  console.log('========================================\n');

  const lineShifts = await prisma.lineShift.findMany({
    where: {
      scheduleDate: new Date('2026-03-11'),
      deletedAt: null,
    },
  });

  console.log(`开线记录数: ${lineShifts.length}\n`);

  for (const ls of lineShifts) {
    console.log(`记录ID: ${ls.id}`);
    console.log(`  组织ID: ${ls.orgId}, 组织名称: ${ls.orgName}`);
    console.log(`  产线ID: ${ls.lineId || 'NULL'}`);

    // 查找对应的产线
    const matchingLines = await prisma.productionLine.findMany({
      where: {
        orgId: ls.orgId,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    console.log(`  该组织对应的产线:`);
    if (matchingLines.length === 0) {
      console.log(`    未找到产线，需要先创建产线`);
    } else {
      matchingLines.forEach(line => {
        console.log(`    - 产线ID: ${line.id}, 编码: ${line.code}, 名称: ${line.name}`);
        if (ls.lineId === line.id) {
          console.log(`      已关联`);
        } else {
          console.log(`      未关联 (当前lineId为NULL)`);
        }
      });
    }
    console.log();
  }
}

checkProductionLines()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
