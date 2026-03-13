import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSourceAccount() {
  console.log('========================================');
  console.log('检查源账户信息');
  console.log('========================================\n');

  const sourceAccountName = '富阳工厂/W1总装车间/////间接设备';

  // 查询源账户
  const sourceAccount = await prisma.laborAccount.findFirst({
    where: {
      name: sourceAccountName,
      status: 'ACTIVE',
    },
  });

  if (!sourceAccount) {
    console.log('✗ 未找到源账户');
    await prisma.$disconnect();
    return;
  }

  console.log('源账户信息:\n');
  console.log(`  账户ID: ${sourceAccount.id}`);
  console.log(`  账户名称: ${sourceAccount.name}`);
  console.log(`  账户类型: ${sourceAccount.type}`);
  console.log(`  账户层级: ${sourceAccount.level}`);
  console.log(`  父账户ID: ${sourceAccount.parentId || 'NULL'}`);

  try {
    const hierarchyValues = JSON.parse(sourceAccount.hierarchyValues || '{}');
    console.log(`  层级信息:`);
    console.log(`    orgId: ${hierarchyValues.orgId || 'Unknown'}`);
    console.log(`    orgName: ${hierarchyValues.orgName || 'Unknown'}`);
    console.log(`    workshopId: ${hierarchyValues.workshopId || 'Unknown'}`);
    console.log(`    workshopName: ${hierarchyValues.workshopName || 'Unknown'}`);
    console.log(`    lineId: ${hierarchyValues.lineId || 'Unknown'}`);
    console.log(`    lineCode: ${hierarchyValues.lineCode || 'Unknown'}`);
    console.log(`    lineName: ${hierarchyValues.lineName || 'Unknown'}`);
  } catch (e) {
    console.log(`  层级信息: 解析失败 (${e})`);
  }

  // 查询该账户的工时记录
  console.log('\n========================================');
  console.log('该账户的工时记录');
  console.log('========================================\n');

  const calcResults = await prisma.calcResult.findMany({
    where: {
      accountId: sourceAccount.id,
    },
    include: {
      employee: true,
    },
    orderBy: {
      calcDate: 'desc',
    },
    take: 20,
  });

  console.log(`找到最近的 ${calcResults.length} 条工时记录\n`);

  // 按日期分组
  const dateStats: Record<string, number> = {};
  for (const record of calcResults) {
    const date = record.calcDate.toISOString().split('T')[0];
    dateStats[date] = (dateStats[date] || 0) + 1;
  }

  console.log('按日期统计:\n');
  for (const [date, count] of Object.entries(dateStats)) {
    console.log(`  ${date}: ${count} 条`);
  }

  // 查询2026-03-11的工时记录
  console.log('\n2026-03-11的工时记录:\n');

  const targetDate = new Date('2026-03-11');
  const targetDateRecords = await prisma.calcResult.findMany({
    where: {
      accountId: sourceAccount.id,
      calcDate: targetDate,
    },
    include: {
      employee: true,
    },
  });

  console.log(`找到 ${targetDateRecords.length} 条工时记录\n`);

  if (targetDateRecords.length > 0) {
    for (const record of targetDateRecords) {
      console.log(`  员工: ${record.employee?.name || 'Unknown'}`);
      console.log(`    出勤代码ID: ${record.attendanceCodeId || 'Unknown'}`);
      console.log(`    实际工时: ${record.actualHours}`);
      console.log();
    }
  }

  console.log('========================================\n');
}

checkSourceAccount()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
