import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605002';

  // 1. 查询员工信息
  const employee = await prisma.employee.findUnique({
    where: { employeeNo },
    select: { id: true, employeeNo: true, name: true },
  });

  console.log('📋 员工信息:', employee);

  if (!employee) {
    console.log('❌ 员工不存在');
    return;
  }

  // 2. 查询该员工的主账户
  const mainAccounts = await prisma.laborAccount.findMany({
    where: {
      employeeId: employee.id,
      type: 'MAIN',
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n💼 找到 ${mainAccounts.length} 个主账户:`);
  mainAccounts.forEach((account: any, index: number) => {
    console.log(`\n账户 ${index + 1}:`);
    console.log(`  ID: ${account.id}`);
    console.log(`  编码: ${account.code}`);
    console.log(`  名称: ${account.name}`);
    console.log(`  路径: ${account.path}`);
    console.log(`  状态: ${account.status}`);
    console.log(`  生效日期: ${account.effectiveDate}`);
    console.log(`  失效日期: ${account.expiryDate}`);
  });

  // 3. 查询员工-账户关联记录
  const accountLinks = await prisma.employeeLaborAccount.findMany({
    where: { employeeNo },
    include: { account: true },
  });

  console.log(`\n🔗 员工-账户关联记录: ${accountLinks.length} 条`);
  accountLinks.forEach((link: any, index: number) => {
    console.log(`\n关联 ${index + 1}:`);
    console.log(`  ID: ${link.id}`);
    console.log(`  账户ID: ${link.accountId}`);
    console.log(`  账户名称: ${link.account?.name}`);
    console.log(`  生效日期: ${link.effectiveDate}`);
    console.log(`  是否主账户: ${link.isPrimary}`);
    console.log(`  状态: ${link.status}`);
  });

  // 4. 删除所有主账户和关联记录
  console.log('\n🗑️  开始删除...');

  // 先删除员工-账户关联记录
  for (const link of accountLinks) {
    await prisma.employeeLaborAccount.delete({
      where: { id: link.id },
    });
    console.log(`✅ 已删除关联记录 ID: ${link.id}`);
  }

  // 删除主账户
  for (const account of mainAccounts) {
    await prisma.laborAccount.delete({
      where: { id: account.id },
    });
    console.log(`✅ 已删除主账户 ID: ${account.id}, 编码: ${account.code}`);
  }

  console.log('\n✨ 删除完成！');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
