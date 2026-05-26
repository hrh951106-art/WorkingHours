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
    orderBy: { effectiveDate: 'asc' }
  });
  
  console.log('\n工作信息历史记录: ' + workInfoHistory.length + ' 条');
  
  // 3. 为每条记录生成账户（跳过同一天被其他记录替换的）
  let accountCount = 0;
  const sameDayGroups: any[][] = [];
  
  // 将同一天的分组
  let currentGroup: any[] = [];
  let currentDate = '';
  
  for (const record of workInfoHistory) {
    const dateStr = record.effectiveDate.toISOString().split('T')[0];
    if (dateStr !== currentDate) {
      if (currentGroup.length > 0) {
        sameDayGroups.push(currentGroup);
      }
      currentGroup = [record];
      currentDate = dateStr;
    } else {
      currentGroup.push(record);
    }
  }
  if (currentGroup.length > 0) {
    sameDayGroups.push(currentGroup);
  }
  
  console.log('\n同一天分组的记录数: ' + sameDayGroups.length);
  
  // 为每个分组生成账户（只生成该组最后一条记录）
  for (let i = 0; i < sameDayGroups.length; i++) {
    const group = sameDayGroups[i];
    const lastRecord = group[group.length - 1]; // 该组的最后一条记录
    
    const effectiveDate = lastRecord.effectiveDate;
    
    // 计算失效日期
    let expiryDate = null;
    if (i < sameDayGroups.length - 1) {
      const nextGroup = sameDayGroups[i + 1];
      const nextEffectiveDate = nextGroup[0].effectiveDate;
      expiryDate = new Date(nextEffectiveDate);
      expiryDate.setDate(expiryDate.getDate() - 1);
    }
    
    const status = (expiryDate === null) ? 'ACTIVE' : 'INACTIVE';
    
    console.log('\n--- 生成账户 ' + (accountCount + 1) + ' ---');
    console.log('工作信息ID:', lastRecord.id);
    console.log('生效日期:', effectiveDate.toISOString().split('T')[0]);
    console.log('失效日期:', expiryDate ? expiryDate.toISOString().split('T')[0] : '无');
    console.log('状态:', status);
    console.log('组织ID:', lastRecord.orgId);
    console.log('变更类型:', lastRecord.changeType);
    
    await prisma.laborAccount.create({
      data: {
        code: 'acc_' + lastRecord.id + '_' + Date.now() + '_' + accountCount,
        name: 'Account ' + lastRecord.changeType,
        type: 'MAIN',
        level: 7,
        path: 'generated/' + lastRecord.orgId + '/' + lastRecord.id,
        employeeId: employee.id,
        effectiveDate: effectiveDate,
        expiryDate: expiryDate,
        status: status
      }
    });
    
    accountCount++;
  }
  
  // 4. 验证结果
  const accounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee.id },
    orderBy: { effectiveDate: 'asc' }
  });
  
  console.log('\n=== 最终生成的账户 ===');
  console.log('总计: ' + accounts.length + ' 个账户\n');
  
  accounts.forEach(acc => {
    console.log('ID: ' + acc.id);
    console.log('  生效: ' + acc.effectiveDate.toISOString().split('T')[0] +
                ' 失效: ' + (acc.expiryDate ? acc.expiryDate.toISOString().split('T')[0] : '无') +
                ' 状态: ' + acc.status);
  });
}

main()
  .then(() => console.log('\n完成'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
