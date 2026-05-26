import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202604003';
  
  // 查询员工
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
  console.log('当前组织ID:', employee.orgId);
  
  // 查询工作信息历史记录
  const workInfoHistory = await prisma.workInfoHistory.findMany({
    where: { employeeId: employee.id },
    orderBy: { effectiveDate: 'desc' },
    take: 10
  });
  
  console.log('\n=== 工作信息历史记录（最近10条） ===');
  workInfoHistory.forEach(record => {
    const customFields = typeof record.customFields === 'string' 
      ? JSON.parse(record.customFields) 
      : record.customFields;
    
    console.log({
      id: record.id,
      orgId: record.orgId,
      position: record.position,
      changeType: record.changeType,
      isCurrent: record.isCurrent,
      effectiveDate: record.effectiveDate.toISOString().split('T')[0],
      endDate: record.endDate ? record.endDate.toISOString().split('T')[0] : null,
      customFields: customFields
    });
  });
  
  // 查找5月12日前后的记录
  const may10Date = new Date('2025-05-10T00:00:00.000Z');
  const may15Date = new Date('2025-05-15T00:00:00.000Z');
  
  const may12Records = await prisma.workInfoHistory.findMany({
    where: {
      employeeId: employee.id,
      effectiveDate: {
        gte: may10Date,
        lt: may15Date
      }
    },
    orderBy: { effectiveDate: 'asc' }
  });
  
  console.log('\n=== 5月10日-15日之间的工作信息历史记录 ===');
  console.log(JSON.stringify(may12Records, null, 2));
}

main()
  .then(() => console.log('\n查询完成'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
