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
  
  // 查询所有工作信息历史记录
  const workInfoHistory = await prisma.workInfoHistory.findMany({
    where: { employeeId: employee.id },
    orderBy: { effectiveDate: 'asc' }
  });
  
  console.log('=== 工作信息历史记录（按生效日期排序） ===');
  workInfoHistory.forEach((record: any, idx: number) => {
    const customFields = typeof record.customFields === 'string' 
      ? JSON.parse(record.customFields) 
      : record.customFields;
    
    console.log('\n记录 ' + (idx + 1) + ':');
    console.log('  ID:', record.id);
    console.log('  组织ID:', record.orgId);
    console.log('  变更类型:', record.changeType);
    console.log('  是否当前:', record.isCurrent);
    console.log('  生效日期:', record.effectiveDate.toISOString().split('T')[0]);
    console.log('  失效日期:', record.endDate ? record.endDate.toISOString().split('T')[0] : '无');
    console.log('  自定义字段:', JSON.stringify(customFields, null, 2));
  });
  
  console.log('\n总计: ' + workInfoHistory.length + ' 条工作信息历史记录');
}

main()
  .then(() => console.log('\n查询完成'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
