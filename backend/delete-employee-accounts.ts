import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteEmployeeAccounts() {
  const employeeNo = '202605013';
  console.log(`=== 删除员工 ${employeeNo} 的所有劳动力账户 ===\n`);

  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
    select: { id: true, name: true },
  });

  if (!employee) {
    console.log('未找到员工');
    return;
  }

  console.log(`员工: ${employee.name} (${employeeNo})`);

  // 查询所有账户
  const accounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee.id },
    select: {
      id: true,
      code: true,
      status: true,
      type: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log(`\n找到 ${accounts.length} 个账户`);
  accounts.forEach((account) => {
    console.log(`  账户 ${account.id}: ${account.code} (${account.type}, ${account.status})`);
  });

  // 删除所有账户
  console.log('\n开始删除账户...');

  for (const account of accounts) {
    await prisma.laborAccount.delete({
      where: { id: account.id },
    });
    console.log(`  ✅ 删除账户 ${account.id}: ${account.code}`);
  }

  console.log('\n✅ 所有账户已删除');

  await prisma.$disconnect();
}

deleteEmployeeAccounts()
  .then(() => {
    console.log('\n删除完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('删除失败:', error);
    process.exit(1);
  });
