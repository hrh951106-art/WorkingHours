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
  
  // 1. 删除所有现有账户
  const deleteResult = await prisma.laborAccount.deleteMany({
    where: { employeeId: employee.id }
  });
  console.log('已删除 ' + deleteResult.count + ' 个账户');
  
  // 2. 查询工作信息历史记录
  const workInfoHistory = await prisma.workInfoHistory.findMany({
    where: { employeeId: employee.id },
    orderBy: [{ effectiveDate: 'asc' }, { id: 'asc' }]
  });
  
  console.log('\n工作信息历史记录: ' + workInfoHistory.length + ' 条');
  
  // 3. 为每条记录生成账户
  for (let i = 0; i < workInfoHistory.length; i++) {
    const workInfo = workInfoHistory[i];
    const effectiveDate = workInfo.effectiveDate;
    
    // 计算失效日期
    let expiryDate = null;
    
    // 如果不是当前记录（isCurrent=false），或者不是最后一条记录
    if (!workInfo.isCurrent || i < workInfoHistory.length - 1) {
      // 查找下一条不同日期的记录
      for (let j = i + 1; j < workInfoHistory.length; j++) {
        const nextRecord = workInfoHistory[j];
        const nextDate = nextRecord.effectiveDate.getTime();
        const currentDate = effectiveDate.getTime();
        
        if (nextDate > currentDate) {
          // 找到了下一条不同日期的记录
          expiryDate = new Date(nextRecord.effectiveDate);
          expiryDate.setDate(expiryDate.getDate() - 1);
          break;
        }
      }
      
      // 如果下一条记录是同一天的，失效日期就是当天
      if (expiryDate === null && i < workInfoHistory.length - 1) {
        const nextRecord = workInfoHistory[i + 1];
        if (nextRecord.effectiveDate.getTime() === effectiveDate.getTime()) {
          // 下一条记录是同一天的，失效日期就是当天
          expiryDate = new Date(effectiveDate);
        }
      }
    }
    
    const status = workInfo.isCurrent ? 'ACTIVE' : 'INACTIVE';
    
    console.log('\n--- 生成账户 ' + (i + 1) + ' ---');
    console.log('工作信息ID:', workInfo.id);
    console.log('生效日期:', effectiveDate.toISOString().split('T')[0]);
    console.log('失效日期:', expiryDate ? expiryDate.toISOString().split('T')[0] : '无');
    console.log('状态:', status);
    console.log('是否当前记录:', workInfo.isCurrent);
    console.log('组织ID:', workInfo.orgId);
    console.log('变更类型:', workInfo.changeType);
    
    await prisma.laborAccount.create({
      data: {
        code: 'acc_' + workInfo.id + '_' + Date.now() + '_' + i,
        name: 'Account ' + workInfo.changeType,
        type: 'MAIN',
        level: 7,
        path: 'generated/' + workInfo.orgId + '/' + workInfo.id,
        employeeId: employee.id,
        effectiveDate: effectiveDate,
        expiryDate: expiryDate,
        status: status
      }
    });
  }
  
  // 4. 验证结果
  const accounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee.id },
    orderBy: { effectiveDate: 'asc' }
  });
  
  console.log('\n=== 最终生成的账户 ===');
  console.log('总计: ' + accounts.length + ' 个账户\n');
  
  accounts.forEach(acc => {
    console.log('ID: ' + acc.id + ' | 工作信息ID: ' + acc.path.split('/')[2]);
    console.log('  生效: ' + acc.effectiveDate.toISOString().split('T')[0] +
                ' | 失效: ' + (acc.expiryDate ? acc.expiryDate.toISOString().split('T')[0] : '无') +
                ' | 状态: ' + acc.status);
  });
}

main()
  .then(() => console.log('\n完成'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
