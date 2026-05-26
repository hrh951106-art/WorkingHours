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
  console.log('ID:', employee?.id);
  console.log('工号:', employee?.employeeNo);
  console.log('姓名:', employee?.name);
  console.log('当前组织:', employee?.org?.name);
  console.log('入职日期:', employee?.entryDate);
  console.log('自定义字段:', employee?.customFields);
  
  if (!employee) {
    console.log('员工不存在');
    return;
  }
  
  // 2. 查询员工变更记录
  const changeLogs = await prisma.employeeChangeLog.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  
  console.log('\n=== 员工变更记录（最近20条） ===');
  changeLogs.forEach(log => {
    console.log({
      id: log.id,
      fieldName: log.fieldName,
      oldValue: log.oldValue,
      newValue: log.newValue,
      operator: log.operatorName,
      createdAt: log.createdAt
    });
  });
  
  // 3. 查询劳动力账户
  const accounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee.id },
    orderBy: { effectiveDate: 'desc' },
    take: 15
  });
  
  console.log('\n=== 劳动力账户（最近15条，按生效日期排序） ===');
  accounts.forEach(acc => {
    console.log({
      id: acc.id,
      code: acc.code.substring(0, 50),  // 截断过长的code
      name: acc.name,
      path: acc.path,
      level: acc.level,
      effectiveDate: acc.effectiveDate.toISOString().split('T')[0],
      expiryDate: acc.expiryDate ? acc.expiryDate.toISOString().split('T')[0] : null,
      status: acc.status
    });
  });
  
  // 4. 查找5月12日前后的变更
  const may10Date = new Date('2025-05-10T00:00:00.000Z');
  const may15Date = new Date('2025-05-15T00:00:00.000Z');
  
  const recentChangeLogs = await prisma.employeeChangeLog.findMany({
    where: {
      employeeId: employee.id,
      createdAt: {
        gte: may10Date,
        lt: may15Date
      }
    },
    orderBy: { createdAt: 'asc' }
  });
  
  console.log('\n=== 5月10日-15日之间的变更记录 ===');
  recentChangeLogs.forEach(log => {
    console.log({
      fieldName: log.fieldName,
      oldValue: log.oldValue,
      newValue: log.newValue,
      createdAt: log.createdAt
    });
  });
  
  // 5. 检查是否有组织变更
  const orgChangeLogs = recentChangeLogs.filter(log => 
    log.fieldName.includes('org') || 
    log.fieldName.includes('组织') ||
    log.fieldName.includes('产线')
  );
  
  console.log('\n=== 组织相关的变更记录 ===');
  console.log(JSON.stringify(orgChangeLogs, null, 2));
}

main()
  .then(() => console.log('\n查询完成'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
