import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 模拟修复后的账户重新生成逻辑
 * 用于验证基于effectiveDate匹配的方案
 */
async function testFixedLogic() {
  const employeeId = 16; // 202605014
  console.log('=== 测试修复后的账户重新生成逻辑 ===\n');

  // 1. 获取最新WorkInfoHistory
  const latestWorkInfo = await prisma.workInfoHistory.findFirst({
    where: {
      employeeId,
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

  // 2. 查找匹配effectiveDate的现有账户
  const existingAccount = await prisma.laborAccount.findFirst({
    where: {
      employeeId,
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
    console.log('   修复方案：');
    console.log('   ✅ 直接更新账户127的path、namePath、hierarchyValues');
    console.log('   ✅ 保持账户127为ACTIVE状态');
    console.log('   ❌ 不创建账户212');
  } else {
    console.log(`   ❌ 未找到匹配账户`);
    console.log('');
    console.log('   修复方案：');
    console.log('   ✅ 创建新的主账户（对应新的任职记录）');
  }

  console.log('');
  console.log('3. 当前所有账户对比：');

  const allAccounts = await prisma.laborAccount.findMany({
    where: { employeeId, type: 'MAIN' },
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
  console.log('=== 修复总结 ===\n');

  console.log('当前问题：');
  console.log('- 账户127和212都对应同一条任职记录（effectiveDate=2025-01-01）');
  console.log('- 不应该创建账户212，应该更新账户127');

  console.log('\n修复后的逻辑：');
  console.log('1. 获取最新WorkInfoHistory的effectiveDate');
  console.log('2. 查找匹配该effectiveDate的现有账户');
  console.log('3. 如果找到 → 更新该账户的hierarchyValues（不创建新账户）');
  console.log('4. 如果没找到 → 创建新账户（对应新任职记录）');

  console.log('\n预期结果：');
  console.log('- 账户127保持ACTIVE状态');
  console.log('- 账户127的Level 7从Level_006更新为LEVEL_008');
  console.log('- 删除账户212');

  await prisma.$disconnect();
}

testFixedLogic()
  .then(() => {
    console.log('\n测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('测试失败:', error);
    process.exit(1);
  });
