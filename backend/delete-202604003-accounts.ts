import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202604003';
  
  // 1. 查询员工信息
  const employee = await prisma.employee.findFirst({
    where: { employeeNo }
  });
  
  if (!employee) {
    console.log('员工不存在');
    return;
  }
  
  console.log('=== 员工基本信息 ===');
  console.log('ID:', employee.id);
  console.log('工号:', employee.employeeNo);
  console.log('姓名:', employee.name);
  
  // 2. 查询所有劳动力账户
  const allAccounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee.id },
    orderBy: { effectiveDate: 'desc' }
  });
  
  console.log('\n=== 删除前的账户 ===');
  console.log('账户数量:', allAccounts.length);
  allAccounts.forEach(acc => {
    console.log('- ID:', acc.id, '| 生效:', acc.effectiveDate.toISOString().split('T')[0], '| 状态:', acc.status);
  });
  
  // 3. 删除所有劳动力账户
  const deleteResult = await prisma.laborAccount.deleteMany({
    where: { employeeId: employee.id }
  });
  
  console.log('\n已删除 ' + deleteResult.count + ' 个劳动力账户');
  
  // 4. 验证删除结果
  const remainingAccounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee.id }
  });
  
  if (remainingAccounts.length === 0) {
    console.log('✓ 所有账户已成功删除');
  } else {
    console.log('✗ 仍有 ' + remainingAccounts.length + ' 个账户未删除');
  }
}

main()
  .then(() => console.log('\n操作完成'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
