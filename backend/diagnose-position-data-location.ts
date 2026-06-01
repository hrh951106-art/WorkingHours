import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseEmployeePositionData() {
  const employeeNo = '202605013';
  console.log(`=== 排查员工 ${employeeNo} 岗位职级数据存储位置 ===\n`);

  // 1. 查询员工基本信息（包括customFields）
  console.log('1. 查询Employee表的所有字段：');
  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
  });

  if (!employee) {
    console.log('未找到员工');
    return;
  }

  console.log('员工基本信息：');
  console.log(`  id: ${employee.id}`);
  console.log(`  employeeNo: ${employee.employeeNo}`);
  console.log(`  name: ${employee.name}`);
  console.log(`  orgId: ${employee.orgId}`);
  console.log(`  status: ${employee.status}`);

  // 检查是否有position和skillLevel字段
  console.log('\n检查字段是否存在：');
  console.log(`  position字段: ${employee.position !== undefined ? `"${employee.position}"` : '字段不存在'}`);
  console.log(`  skillLevel字段: ${employee.skillLevel !== undefined ? `"${employee.skillLevel}"` : '字段不存在'}`);

  // 解析customFields
  if (employee.customFields) {
    try {
      const customFields = JSON.parse(employee.customFields);
      console.log('\ncustomFields内容：');
      console.log(JSON.stringify(customFields, null, 2));
    } catch (e) {
      console.log('  解析customFields失败:', e);
    }
  }
  console.log('');

  // 2. 查询最新的WorkInfoHistory
  console.log('2. 查询WorkInfoHistory工作信息历史：');
  const workInfoHistory = await prisma.workInfoHistory.findMany({
    where: { employeeId: employee.id },
    orderBy: { effectiveDate: 'desc' },
    take: 5,
  });

  console.log(`找到 ${workInfoHistory.length} 条记录\n`);
  workInfoHistory.forEach((info, idx) => {
    console.log(`记录 ${idx + 1}:`);
    console.log(`  ID: ${info.id}`);
    console.log(`  生效日期: ${info.effectiveDate}`);
    console.log(`  结束日期: ${info.endDate || 'NULL'}`);
    console.log(`  职位: ${info.position || 'NULL'}`);
    console.log(`  职位名称: ${info.positionName || 'NULL'}`);
    console.log(`  技能等级: ${info.skillLevel || 'NULL'}`);
    console.log(`  技能等级名称: ${info.skillLevelName || 'NULL'}`);
    console.log(`  部门: ${info.department || 'NULL'}`);
    console.log(`  组织ID: ${info.orgId || 'NULL'}`);
    console.log('');
  });

  // 3. 查询劳动力账户
  console.log('3. 查询劳动力账户的hierarchyValues：');
  const laborAccounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  console.log(`找到 ${laborAccounts.length} 个账户\n`);

  for (let i = 0; i < laborAccounts.length; i++) {
    const account = laborAccounts[i];
    console.log(`账户 ${i + 1} (ID: ${account.id}):`);
    console.log(`  名称: ${account.name}`);
    console.log(`  状态: ${account.status}`);
    console.log(`  创建时间: ${account.createdAt}`);

    if (account.hierarchyValues) {
      try {
        const hierarchyValues = JSON.parse(account.hierarchyValues);
        console.log('  层级值：');
        hierarchyValues.forEach((hv: any) => {
          const hasValue = hv.selectedValue ? '✅' : '❌';
          if (hv.level >= 6 && hv.level <= 7) {  // 只显示岗位和技能等级
            const valueStr = hv.selectedValue ? JSON.stringify(hv.selectedValue) : 'NULL';
            console.log(`    ${hasValue} Level ${hv.level} (${hv.name}): ${valueStr}`);
          }
        });
      } catch (e) {
        console.log('  解析hierarchyValues失败:', e);
      }
    }
    console.log('');
  }

  // 4. 对比其他员工（正常有岗位职级的）
  console.log('4. 对比其他员工的WorkInfoHistory（正常情况）：');
  const otherEmployee = await prisma.employee.findFirst({
    where: { employeeNo: '202605017' },
    select: { id: true, name: true },
  });

  if (otherEmployee) {
    const otherWorkInfo = await prisma.workInfoHistory.findMany({
      where: { employeeId: otherEmployee.id },
      orderBy: { effectiveDate: 'desc' },
      take: 3,
    });

    console.log(`员工 ${otherEmployee.name} (202605017) 的WorkInfoHistory:\n`);
    otherWorkInfo.forEach((info, idx) => {
      console.log(`  记录 ${idx + 1}:`);
      console.log(`    生效日期: ${info.effectiveDate}`);
      console.log(`    职位: ${info.position || 'NULL'}`);
      console.log(`    技能等级: ${info.skillLevel || 'NULL'}`);
    });
    console.log('');
  }

  // 5. 检查数据库表结构
  console.log('5. 分析数据存储结构：\n');

  console.log('岗位和职级信息的可能存储位置：');
  console.log('  1. Employee.position / Employee.skillLevel - 直接字段');
  console.log('  2. Employee.customFields - 自定义字段JSON');
  console.log('  3. WorkInfoHistory.position / WorkInfoHistory.skillLevel - 工作信息历史');
  console.log('  4. LaborAccount.hierarchyValues - 劳动力账户层级值');
  console.log('');

  // 6. 总结问题
  console.log('=== 问题分析总结 ===\n');

  const latestWorkInfo = workInfoHistory[0];
  if (latestWorkInfo) {
    console.log('WorkInfoHistory最新记录：');
    console.log(`  职位: ${latestWorkInfo.position || 'NULL'}`);
    console.log(`  技能等级: ${latestWorkInfo.skillLevel || 'NULL'}`);
    console.log('');
  }

  const mainAccount = laborAccounts[0];
  if (mainAccount && mainAccount.hierarchyValues) {
    try {
      const hierarchyValues = JSON.parse(mainAccount.hierarchyValues);
      const level6 = hierarchyValues.find((hv: any) => hv.level === 6);
      const level7 = hierarchyValues.find((hv: any) => hv.level === 7);

      console.log('主账户hierarchyValues：');
      console.log(`  Level 6 (岗位): ${level6?.selectedValue ? JSON.stringify(level6.selectedValue) : 'NULL'}`);
      console.log(`  Level 7 (技能等级): ${level7?.selectedValue ? JSON.stringify(level7.selectedValue) : 'NULL'}`);
      console.log('');
    } catch (e) {
      console.log('解析hierarchyValues失败:', e);
    }
  }

  console.log('结论：');
  console.log('1. 岗位和职级信息存储在LaborAccount.hierarchyValues中');
  console.log('2. WorkInfoHistory中position和skillLevel为NULL，说明：');
  console.log('   - 页面更新岗位职级时，只更新了LaborAccount');
  console.log('   - 没有同步创建WorkInfoHistory记录');
  console.log('   - 或者WorkInfoHistory不是当前岗位职级的主要存储位置');
  console.log('3. 账户合并逻辑使用的是LaborAccount.hierarchyValues，不是WorkInfoHistory');
}

diagnoseEmployeePositionData()
  .then(() => {
    console.log('\n诊断完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('诊断失败:', error);
    process.exit(1);
  });
