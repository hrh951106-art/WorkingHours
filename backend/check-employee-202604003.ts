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
  
  // 2. 查询工作信息历史记录
  const workInfoHistory = await prisma.employeeWorkInfo.findMany({
    where: { employeeId: employee?.id },
    orderBy: { effectiveDate: 'desc' },
    take: 5
  });
  
  console.log('\n=== 工作信息历史记录（最近5条） ===');
  console.log(JSON.stringify(workInfoHistory, null, 2));
  
  // 3. 查询异动记录
  const transfers = await prisma.employeeTransfer.findMany({
    where: { employeeId: employee?.id },
    orderBy: { effectiveDate: 'desc' },
    take: 5
  });
  
  console.log('\n=== 异动记录（最近5条） ===');
  console.log(JSON.stringify(transfers, null, 2));
  
  // 4. 查询劳动力账户
  const accounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee?.id },
    orderBy: { effectiveDate: 'desc' },
    take: 10
  });
  
  console.log('\n=== 劳动力账户（最近10条） ===');
  console.log(JSON.stringify(accounts, null, 2));
  
  // 5. 检查5月12日的相关记录
  const may12Date = new Date('2025-05-12');
  const nextDay = new Date('2025-05-13');
  
  const may12WorkInfo = await prisma.employeeWorkInfo.findFirst({
    where: {
      employeeId: employee?.id,
      effectiveDate: {
        gte: may12Date,
        lt: nextDay
      }
    }
  });
  
  console.log('\n=== 5月12日工作信息记录 ===');
  console.log(JSON.stringify(may12WorkInfo, null, 2));
  
  const may12Transfer = await prisma.employeeTransfer.findFirst({
    where: {
      employeeId: employee?.id,
      effectiveDate: {
        gte: may12Date,
        lt: nextDay
      }
    }
  });
  
  console.log('\n=== 5月12日异动记录 ===');
  console.log(JSON.stringify(may12Transfer, null, 2));
}

main()
  .then(() => console.log('\n查询完成'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
