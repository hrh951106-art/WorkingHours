import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202604003';
  
  // 1. 查询员工基本信息
  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
    include: { org: true }
  });
  
  console.log('=== 员工基本信息 ===');
  console.log(JSON.stringify(employee, null, 2));
  
  if (!employee) {
    console.log('员工不存在');
    return;
  }
  
  // 2. 查询异动变更记录
  const changeLogs = await prisma.employeeChangeLog.findMany({
    where: { employeeId: employee.id },
    orderBy: { effectiveDate: 'desc' },
    take: 10
  });
  
  console.log('\n=== 员工变更记录（最近10条） ===');
  console.log(JSON.stringify(changeLogs, null, 2));
  
  // 3. 查询账户转移记录
  const accountTransfers = await prisma.accountTransfer.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  
  console.log('\n=== 账户转移记录（最近10条） ===');
  console.log(JSON.stringify(accountTransfers, null, 2));
  
  // 4. 查询劳动力账户
  const accounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee.id },
    orderBy: { effectiveDate: 'desc' },
    take: 10
  });
  
  console.log('\n=== 劳动力账户（最近10条） ===');
  accounts.forEach(acc => {
    console.log({
      id: acc.id,
      code: acc.code,
      name: acc.name,
      path: acc.path,
      level: acc.level,
      effectiveDate: acc.effectiveDate,
      expiryDate: acc.expiryDate,
      status: acc.status
    });
  });
  
  // 5. 检查5月12日的相关记录
  const may12Date = new Date('2025-05-12T00:00:00.000Z');
  const may13Date = new Date('2025-05-13T00:00:00.000Z');
  
  const may12ChangeLogs = await prisma.employeeChangeLog.findMany({
    where: {
      employeeId: employee.id,
      effectiveDate: {
        gte: may12Date,
        lt: may13Date
      }
    }
  });
  
  console.log('\n=== 5月12日变更记录 ===');
  console.log(JSON.stringify(may12ChangeLogs, null, 2));
  
  const may12Accounts = await prisma.laborAccount.findMany({
    where: {
      employeeId: employee.id,
      effectiveDate: {
        gte: may12Date,
        lt: may13Date
      }
    }
  });
  
  console.log('\n=== 5月12日创建的劳动力账户 ===');
  console.log(JSON.stringify(may12Accounts, null, 2));
}

main()
  .then(() => console.log('\n查询完成'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
