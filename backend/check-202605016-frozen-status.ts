import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 检查员工202605016的主劳动力账户为什么是冻结状态
 */
async function checkFrozenAccount() {
  const employeeNo = '202605016';

  console.log('=== 检查员工账户冻结原因 ===\n');

  // 1. 查找员工
  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
    select: {
      id: true,
      name: true,
      status: true,
    },
  });

  if (!employee) {
    console.log('❌ 员工不存在');
    await prisma.$disconnect();
    return;
  }

  console.log(`员工: ${employee.name} (${employeeNo})`);
  console.log(`员工状态: ${employee.status}`);
  console.log(`员工ID: ${employee.id}\n`);

  // 2. 查找主账户
  const accounts = await prisma.laborAccount.findMany({
    where: {
      employeeId: employee.id,
      type: 'MAIN',
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      code: true,
      status: true,
      effectiveDate: true,
      expiryDate: true,
      createdAt: true,
      updatedAt: true,
      path: true,
    },
  });

  if (accounts.length === 0) {
    console.log('ℹ️ 该员工没有主劳动力账户');
    await prisma.$disconnect();
    return;
  }

  console.log(`找到 ${accounts.length} 个主账户:\n`);

  accounts.forEach((acc, index) => {
    console.log(`账户${acc.id}:`);
    console.log(`  状态: ${acc.status}`);
    console.log(`  生效日期: ${acc.effectiveDate?.toISOString().substring(0, 10) || 'NULL'}`);
    console.log(`  失效日期: ${acc.expiryDate ? acc.expiryDate.toISOString().substring(0, 10) : 'NULL'}`);
    console.log(`  创建时间: ${acc.createdAt.toISOString().substring(0, 19)}`);
    console.log(`  更新时间: ${acc.updatedAt.toISOString().substring(0, 19)}`);
    console.log(`  路径: ${acc.path}`);
    console.log('');

    if (acc.status === 'FROZEN') {
      console.log('⚠️ 该账户状态为FROZEN（冻结）');
      console.log('');
      console.log('可能的原因：');
      console.log('1. 员工状态为inactive/离职');
      console.log('2. 账户过期（expiryDate早于今天）');
      console.log('3. 手动设置为冻结状态');
      console.log('4. 系统逻辑自动冻结');
    }
  });

  // 3. 检查员工状态
  console.log('\n=== 状态分析 ===\n');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log(`员工状态: ${employee.status}`);
  console.log(`是否离职: ${employee.status !== 'ACTIVE' ? '是 ❌' : '否 ✅'}`);
  console.log('');

  // 4. 检查账户过期情况
  const latestAccount = accounts[0];
  if (latestAccount.expiryDate) {
    const expiryDate = new Date(latestAccount.expiryDate);
    expiryDate.setHours(0, 0, 0, 0);
    const isExpired = expiryDate < today;

    console.log(`最新账户失效日期: ${latestAccount.expiryDate.toISOString().substring(0, 10)}`);
    console.log(`是否过期: ${isExpired ? '是 ❌' : '否 ✅'}`);
  } else {
    console.log(`最新账户没有设置失效日期`);
  }

  console.log('');

  // 5. 检查任职记录
  const workInfoHistory = await prisma.workInfoHistory.findMany({
    where: { employeeId: employee.id },
    orderBy: { effectiveDate: 'desc' },
    select: {
      id: true,
      effectiveDate: true,
      endDate: true,
      isCurrent: true,
      position: true,
      jobLevel: true,
    },
  });

  console.log(`任职记录数: ${workInfoHistory.length}`);
  workInfoHistory.forEach((wh) => {
    console.log(`  记录${wh.id}: ${wh.effectiveDate.toISOString().substring(0, 10)} 生效, ${wh.endDate ? wh.endDate.toISOString().substring(0, 10) : '至今'} 结束, isCurrent=${wh.isCurrent}`);
  });

  console.log('');

  // 6. 分析冻结原因
  console.log('=== 冻结原因分析 ===\n');

  if (employee.status !== 'ACTIVE') {
    console.log('✅ 原因1: 员工状态不是ACTIVE');
    console.log(`   当前状态: ${employee.status}`);
  }

  if (latestAccount.status === 'FROZEN' && latestAccount.expiryDate) {
    const expiryDate = new Date(latestAccount.expiryDate);
    expiryDate.setHours(0, 0, 0, 0);
    if (expiryDate < today) {
      console.log('✅ 原因2: 账户已过期');
      console.log(`   失效日期: ${latestAccount.expiryDate.toISOString().substring(0, 10)}`);
    }
  }

  if (latestAccount.status === 'FROZEN' && employee.status === 'ACTIVE' && (!latestAccount.expiryDate || new Date(latestAccount.expiryDate) >= today)) {
    console.log('✅ 原因3: 账户被手动冻结或系统逻辑冻结');
    console.log('   员工状态正常且账户未过期，但状态为FROZEN');
    console.log('   建议检查账户创建/更新的业务逻辑');
  }

  await prisma.$disconnect();
}

checkFrozenAccount()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
