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
  
  console.log('\n=== 所有劳动力账户（删除前） ===');
  allAccounts.forEach(acc => {
    console.log({
      id: acc.id,
      code: acc.code,
      name: acc.name,
      level: acc.level,
      effectiveDate: acc.effectiveDate.toISOString().split('T')[0],
      expiryDate: acc.expiryDate ? acc.expiryDate.toISOString().split('T')[0] : null,
      status: acc.status
    });
  });
  
  // 3. 删除所有劳动力账户
  console.log('\n=== 开始删除劳动力账户 ===');
  
  const deleteResult = await prisma.laborAccount.deleteMany({
    where: { employeeId: employee.id }
  });
  
  console.log(`已删除 ${deleteResult.count} 个劳动力账户`);
  
  // 4. 验证删除结果
  const remainingAccounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee.id }
  });
  
  console.log('\n=== 删除后验证 ===');
  console.log('剩余账户数量:', remainingAccounts.length);
  
  if (remainingAccounts.length === 0) {
    console.log('✓ 所有劳动力账户已成功删除');
  } else {
    console.log('✗ 仍有账户未删除');
  }
}

main()
  .then(() => console.log('\n操作完成'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
