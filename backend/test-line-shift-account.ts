import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. 查询现有的产线班次记录
  const lineShifts = await prisma.lineShift.findMany({
    where: { deletedAt: null },
    take: 3,
    orderBy: { scheduleDate: 'desc' }
  });

  console.log('=== 当前产线班次记录 ===\n');
  lineShifts.forEach((ls, i) => {
    console.log(`[${i + 1}] ID=${ls.id}`);
    console.log(`  组织: ${ls.orgName} (ID: ${ls.orgId})`);
    console.log(`  班次: ${ls.shiftName} (ID: ${ls.shiftId})`);
    console.log(`  日期: ${ls.scheduleDate.toISOString().split('T')[0]}`);
    console.log(`  劳动力账户ID: ${ls.accountId}`);
    console.log(`  劳动力账户名称: ${ls.accountName || 'N/A'}`);
    console.log('');
  });

  // 2. 查询可用的子劳动力账户
  const subAccounts = await prisma.laborAccount.findMany({
    where: {
      type: 'SUB',
      usageType: 'SHIFT',
    },
    take: 5,
    orderBy: { createdAt: 'desc' }
  });

  console.log('\n=== 可用的子劳动力账户 ===\n');
  subAccounts.forEach((acc, i) => {
    console.log(`[${i + 1}] ID=${acc.id}`);
    console.log(`  代码: ${acc.code}`);
    console.log(`  名称: ${acc.name}`);
    console.log(`  名称路径: ${acc.namePath || 'N/A'}`);
    console.log(`  类型: ${acc.type}, 用途: ${acc.usageType}`);
    console.log('');
  });

  // 3. 如果有产线班次和子账户，尝试关联
  if (lineShifts.length > 0 && subAccounts.length > 0) {
    const firstShift = lineShifts[0];
    const firstAccount = subAccounts[0];

    console.log('=== 尝试关联劳动力账户 ===\n');
    console.log(`产线班次: ${firstShift.orgName} - ${firstShift.shiftName}`);
    console.log(`劳动力账户: ${firstAccount.namePath || firstAccount.name}`);
    console.log('\n更新中...');

    const updated = await prisma.lineShift.update({
      where: { id: firstShift.id },
      data: {
        accountId: firstAccount.id,
        accountName: firstAccount.namePath || firstAccount.name,
      }
    });

    console.log(`✅ 已将产线班次 ID=${firstShift.id} 关联到劳动力账户 ID=${firstAccount.id}`);
    console.log(`账户名称: ${updated.accountName}`);
  } else {
    console.log('❌ 没有可用的产线班次或子劳动力账户');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
