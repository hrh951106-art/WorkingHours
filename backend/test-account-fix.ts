import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 测试修复后的账户重新生成逻辑
 * 模拟调用regenerateAccountsForEmployee方法
 */
async function testAccountFix() {
  const employeeNo = '202605014';

  console.log('=== 测试修复后的账户重新生成逻辑 ===\n');

  // 1. 查找员工
  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
    select: { id: true, name: true },
  });

  if (!employee) {
    console.log('❌ 员工不存在');
    await prisma.$disconnect();
    return;
  }

  console.log(`员工: ${employee.name} (${employeeNo}), ID: ${employee.id}\n`);

  // 2. 获取最新WorkInfoHistory
  const latestWorkInfo = await prisma.workInfoHistory.findFirst({
    where: {
      employeeId: employee.id,
      isCurrent: true,
    },
    select: {
      id: true,
      effectiveDate: true,
      position: true,
      jobLevel: true,
    },
  });

  if (!latestWorkInfo) {
    console.log('❌ 未找到WorkInfoHistory');
    await prisma.$disconnect();
    return;
  }

  console.log('1. 最新WorkInfoHistory:');
  console.log(`   ID: ${latestWorkInfo.id}`);
  console.log(`   生效日期: ${latestWorkInfo.effectiveDate.toISOString().substring(0, 10)}`);
  console.log(`   职位: ${latestWorkInfo.position}`);
  console.log(`   职级: ${latestWorkInfo.jobLevel}`);
  console.log('');

  // 3. 查找匹配effectiveDate的现有账户
  const existingAccount = await prisma.laborAccount.findFirst({
    where: {
      employeeId: employee.id,
      type: 'MAIN',
      effectiveDate: latestWorkInfo.effectiveDate,
    },
    select: {
      id: true,
      code: true,
      status: true,
      effectiveDate: true,
      hierarchyValues: true,
      path: true,
      namePath: true,
    },
  });

  console.log('2. 查找匹配effectiveDate的账户:');
  console.log(`   effectiveDate: ${latestWorkInfo.effectiveDate.toISOString().substring(0, 10)}`);

  if (existingAccount) {
    console.log(`   ✅ 找到匹配账户: ${existingAccount.id}`);
    console.log(`   状态: ${existingAccount.status}`);
    console.log(`   当前路径: ${existingAccount.path}`);
    console.log(`   当前namePath: ${existingAccount.namePath}`);
    console.log('');

    // 显示层级值详情
    if (existingAccount.hierarchyValues) {
      try {
        const hv = JSON.parse(existingAccount.hierarchyValues);
        console.log('   当前层级值:');
        hv.forEach((level: any) => {
          const hasValue = level.selectedValue ? '✅' : '❌';
          const code = level.selectedValue?.code || 'NULL';
          console.log(`     ${hasValue} Level ${level.level}: ${code}`);
        });
      } catch (e) {
        console.log('   解析hierarchyValues失败');
      }
    }

    console.log('');
    console.log('   ✅ 修复逻辑：');
    console.log('   ✅ 应该更新账户127的path、namePath、hierarchyValues');
    console.log('   ✅ 保持账户127为ACTIVE状态');
    console.log('   ❌ 不创建新账户');
  } else {
    console.log(`   ❌ 未找到匹配账户`);
    console.log('');
    console.log('   ⚠️ 如果没有匹配账户，应该创建新账户');
  }

  console.log('');
  console.log('3. 当前所有账户状态：');

  const allAccounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee.id, type: 'MAIN' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      code: true,
      status: true,
      effectiveDate: true,
      createdAt: true,
    },
  });

  allAccounts.forEach((acc) => {
    const match = acc.effectiveDate?.toISOString().substring(0, 10) === latestWorkInfo.effectiveDate.toISOString().substring(0, 10);
    console.log(`   账户${acc.id}: ${acc.status}, effectiveDate=${acc.effectiveDate?.toISOString().substring(0, 10) || 'NULL'} ${match ? '✅匹配' : ''}`);
  });

  console.log('');
  console.log('=== 修复验证 ===\n');

  console.log('修复后的逻辑流程：');
  console.log('1. 获取最新WorkInfoHistory的effectiveDate');
  console.log('2. 查找匹配该effectiveDate的现有账户');
  console.log('3. 如果找到 → 更新该账户的hierarchyValues（不创建新账户）');
  console.log('4. 如果没找到 → 创建新账户（对应新任职记录）');

  console.log('\n预期结果：');
  console.log('- 账户127应该被更新（path、namePath、hierarchyValues）');
  console.log('- 账户127保持ACTIVE状态');
  console.log('- 不应该创建新账户');
  console.log('- 账户212应该被清理（手动删除）');

  await prisma.$disconnect();
}

testAccountFix()
  .then(() => {
    console.log('\n测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('测试失败:', error);
    process.exit(1);
  });
