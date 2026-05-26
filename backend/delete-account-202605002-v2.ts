import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605002';
  const employeeId = 4;

  console.log('🗑️  开始删除工号 202605002 的所有账户...\n');

  // 1. 查询员工信息
  const employee = await prisma.employee.findUnique({
    where: { employeeNo },
    select: { id: true, employeeNo: true, name: true },
  });

  if (!employee) {
    console.log('❌ 员工不存在');
    return;
  }

  console.log('📋 员工信息:', employee);

  // 2. 查询该员工的所有账户
  const allAccounts = await prisma.laborAccount.findMany({
    where: { employeeId },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n💼 找到 ${allAccounts.length} 个账户:`);
  allAccounts.forEach((account: any, index: number) => {
    console.log(`\n账户 ${index + 1}:`);
    console.log(`  ID: ${account.id}`);
    console.log(`  编码: ${account.code}`);
    console.log(`  类型: ${account.type}`);
    console.log(`  状态: ${account.status}`);
  });

  // 3. 查询员工-账户关联记录
  const accountLinks = await prisma.employeeLaborAccount.findMany({
    where: { employeeNo },
  });

  console.log(`\n🔗 员工-账户关联记录: ${accountLinks.length} 条`);

  if (allAccounts.length === 0 && accountLinks.length === 0) {
    console.log('\n✅ 没有需要删除的账户');
    return;
  }

  // 4. 删除
  console.log('\n🔄 开始删除...\n');

  // 先删除员工-账户关联记录
  for (const link of accountLinks) {
    await prisma.employeeLaborAccount.delete({
      where: { id: link.id },
    });
    console.log(`✅ 已删除关联记录 ID: ${link.id} (账户ID: ${link.accountId})`);
  }

  // 删除所有账户
  for (const account of allAccounts) {
    await prisma.laborAccount.delete({
      where: { id: account.id },
    });
    console.log(`✅ 已删除账户 ID: ${account.id}, 编码: ${account.code}`);
  }

  console.log('\n✨ 删除完成！');
  console.log(`\n📊 删除统计:`);
  console.log(`  - 账户: ${allAccounts.length} 个`);
  console.log(`  - 关联记录: ${accountLinks.length} 条`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
