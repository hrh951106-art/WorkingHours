import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkI04AccountMapping() {
  console.log('========================================');
  console.log('检查I04工时记录的账户映射');
  console.log('========================================\n');

  // 1. 查询匹配的账户
  console.log('第一步：查询匹配的账户\n');

  const matchedAccount = await prisma.laborAccount.findFirst({
    where: {
      code: 'AUTO-1773208886474',
      status: 'ACTIVE',
    },
  });

  if (!matchedAccount) {
    console.log('✗ 未找到匹配的账户 AUTO-1773208886474');
    await prisma.$disconnect();
    return;
  }

  console.log('匹配的账户:');
  console.log(`  ID: ${matchedAccount.id}`);
  console.log(`  代码: ${matchedAccount.code}`);
  console.log(`  名称: ${matchedAccount.name}\n`);

  // 2. 查询该账户在2026-03-11的I04工时记录
  console.log('第二步：查询该账户的I04工时记录\n');

  const i04Code = await prisma.attendanceCode.findFirst({
    where: { code: 'I04' },
  });

  if (!i04Code) {
    console.log('✗ 未找到I04出勤代码');
    await prisma.$disconnect();
    return;
  }

  const calcDate = new Date('2026-03-11');
  calcDate.setHours(0, 0, 0, 0);

  const calcResults = await prisma.calcResult.findMany({
    where: {
      calcDate: calcDate,
      attendanceCodeId: i04Code.id,
      accountId: matchedAccount.id,
    },
    select: {
      id: true,
      accountName: true,
      employeeNo: true,
      actualHours: true,
      accountId: true,
    },
  });

  console.log(`该账户的I04工时记录数: ${calcResults.length}\n`);

  if (calcResults.length > 0) {
    for (const cr of calcResults) {
      console.log(`  员工: ${cr.employeeNo}, 工时: ${cr.actualHours}, accountId: ${cr.accountId}`);
    }
  } else {
    console.log('✗ 该账户没有I04工时记录');
  }

  // 3. 查询所有I04工时记录，不管accountId
  console.log('\n第三步：查询所有I04工时记录（不管accountId）\n');

  const allI04Records = await prisma.calcResult.findMany({
    where: {
      calcDate: calcDate,
      attendanceCodeId: i04Code.id,
    },
    select: {
      id: true,
      accountName: true,
      accountId: true,
      employeeNo: true,
      actualHours: true,
    },
  });

  console.log(`所有I04工时记录数: ${allI04Records.length}\n`);

  if (allI04Records.length > 0) {
    for (const cr of allI04Records) {
      console.log(`  员工: ${cr.employeeNo}, 工时: ${cr.actualHours}`);
      console.log(`    账户: ${cr.accountName}`);
      console.log(`    accountId: ${cr.accountId}`);
      console.log();
    }

    // 检查accountId是否与匹配账户的ID一致
    const matchAccountIds = allI04Records.filter(cr => cr.accountId === matchedAccount.id);
    console.log(`其中accountId=${matchedAccount.id}的记录数: ${matchAccountIds.length}`);

    if (matchAccountIds.length === 0) {
      console.log('\n✗ 问题所在：I04工时记录的accountId与匹配账户的ID不一致！');
      console.log(`  I04记录的accountId: ${allI04Records.map(cr => cr.accountId).join(', ')}`);
      console.log(`  匹配账户的ID: ${matchedAccount.id}`);
      console.log('\n建议：更新I04工时记录的accountId为匹配账户的ID');
    }
  }

  console.log('\n========================================\n');
}

checkI04AccountMapping()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
