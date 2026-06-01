import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 为员工202605016重新生成主劳动力账户
 */
async function regenerateAccount() {
  const employeeNo = '202605016';

  console.log('=== 为员工202605016重新生成主账户 ===\n');

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

  console.log('最新WorkInfoHistory:');
  console.log(`  生效日期: ${latestWorkInfo.effectiveDate.toISOString().substring(0, 10)}`);
  console.log(`  职位: ${latestWorkInfo.position}`);
  console.log(`  职级: ${latestWorkInfo.jobLevel}`);
  console.log('');

  // 3. 恢复账户141为ACTIVE状态
  console.log('恢复账户141为ACTIVE状态...');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const updatedAccount = await prisma.laborAccount.update({
    where: { id: 141 },
    data: {
      status: 'ACTIVE',
      expiryDate: null, // 清除失效日期
    },
  });

  console.log('✅ 账户141已恢复为ACTIVE状态');
  console.log(`  账户ID: ${updatedAccount.id}`);
  console.log(`  状态: ${updatedAccount.status}`);
  console.log(`  失效日期: ${updatedAccount.expiryDate ? updatedAccount.expiryDate.toISOString().substring(0, 10) : 'NULL'}`);
  console.log('');

  // 4. 验证
  console.log('=== 验证结果 ===\n');

  const verifyAccount = await prisma.laborAccount.findFirst({
    where: {
      employeeId: employee.id,
      type: 'MAIN',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      status: true,
      path: true,
      namePath: true,
      effectiveDate: true,
      expiryDate: true,
    },
  });

  if (verifyAccount) {
    console.log('✅ 成功！现在有ACTIVE的主账户');
    console.log(`  账户ID: ${verifyAccount.id}`);
    console.log(`  状态: ${verifyAccount.status}`);
    console.log(`  路径: ${verifyAccount.path}`);
    console.log(`  名称路径: ${verifyAccount.namePath}`);
  } else {
    console.log('❌ 失败！没有找到ACTIVE的主账户');
  }

  await prisma.$disconnect();
}

regenerateAccount()
  .then(() => {
    console.log('\n操作完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('操作失败:', error);
    process.exit(1);
  });
