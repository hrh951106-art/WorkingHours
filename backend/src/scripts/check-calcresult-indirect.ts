import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCalcResultIndirect() {
  console.log('========================================');
  console.log('查询CalcResult中的间接设备记录');
  console.log('========================================\n');

  // 1. 查询所有间接设备的工时记录
  const indirectCalcResults = await prisma.calcResult.findMany({
    where: {
      accountName: {
        contains: '间接设备',
      },
    },
    select: {
      id: true,
      accountName: true,
      accountId: true,
      attendanceCodeId: true,
      employeeNo: true,
      actualHours: true,
      calcDate: true,
    },
    orderBy: {
      calcDate: 'desc',
    },
  });

  console.log(`找到 ${indirectCalcResults.length} 条间接设备工时记录\n`);

  // 2. 按账户分组
  const accountGroups: Record<string, any[]> = {};
  for (const record of indirectCalcResults) {
    if (!accountGroups[record.accountName]) {
      accountGroups[record.accountName] = [];
    }
    accountGroups[record.accountName].push(record);
  }

  console.log('按账户分组统计：\n');

  for (const [accountName, records] of Object.entries(accountGroups)) {
    const totalHours = records.reduce((sum, r) => sum + (r.actualHours || 0), 0);
    console.log(`账户: ${accountName}`);
    console.log(`  工时记录数: ${records.length}`);
    console.log(`  总工时: ${totalHours.toFixed(2)}`);
    console.log(`  accountId: ${records[0].accountId || 'NULL'}`);
    console.log();
  }

  // 3. 检查这些账户是否在LaborAccount表中存在
  console.log('========================================');
  console.log('检查账户是否在LaborAccount表中存在');
  console.log('========================================\n');

  for (const accountName of Object.keys(accountGroups)) {
    const account = await prisma.laborAccount.findFirst({
      where: {
        name: accountName,
        status: 'ACTIVE',
      },
    });

    if (account) {
      console.log(`✓ 账户存在: ${accountName}`);
      console.log(`  ID: ${account.id}`);
      console.log(`  hierarchyValues: ${account.hierarchyValues || 'NULL'}`);
    } else {
      console.log(`✗ 账户不存在: ${accountName}`);
      console.log(`  需要创建此账户`);
    }
    console.log();
  }

  await prisma.$disconnect();
}

checkCalcResultIndirect()
  .catch((e) => {
    console.error('查询失败:', e);
    process.exit(1);
  });
