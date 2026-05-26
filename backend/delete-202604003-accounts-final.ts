import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202604003';
  
  const employee = await prisma.employee.findFirst({
    where: { employeeNo }
  });
  
  if (!employee) {
    console.log('员工不存在');
    return;
  }
  
  console.log('=== 删除员工账户 ===');
  console.log('工号:', employee.employeeNo);
  console.log('姓名:', employee.name);
  
  const accounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee.id }
  });
  
  console.log('\n找到 ' + accounts.length + ' 个账户');
  
  const deleteResult = await prisma.laborAccount.deleteMany({
    where: { employeeId: employee.id }
  });
  
  console.log('已删除 ' + deleteResult.count + ' 个账户');
  console.log('✓ 删除成功');
}

main()
  .then(() => console.log('\n完成'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
