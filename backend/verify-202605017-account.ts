import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 验证202605017的账户层级值
 */
async function verifyAccount() {
  const employeeNo = '202605017';

  console.log('=== 验证202605017账户层级值 ===\n');

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

  // 2. 查找主账户
  const account = await prisma.laborAccount.findFirst({
    where: {
      employeeId: employee.id,
      type: 'MAIN',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      code: true,
      path: true,
      namePath: true,
      hierarchyValues: true,
      effectiveDate: true,
    },
  });

  if (!account) {
    console.log('❌ 未找到ACTIVE主账户');
    await prisma.$disconnect();
    return;
  }

  console.log('主账户信息:');
  console.log(`  账户ID: ${account.id}`);
  console.log(`  路径: ${account.path}`);
  console.log(`  名称路径: ${account.namePath}`);
  console.log(`  生效日期: ${account.effectiveDate?.toISOString().substring(0, 10)}`);
  console.log('');

  // 3. 显示层级值
  if (account.hierarchyValues) {
    try {
      const hv = JSON.parse(account.hierarchyValues);
      console.log('层级值:');
      hv.forEach((level: any) => {
        const hasValue = level.selectedValue ? '✅' : '❌';
        const code = level.selectedValue?.code || 'NULL';
        const name = level.selectedValue?.name || 'NULL';
        console.log(`  ${hasValue} Level ${level.level} (${level.name}): ${code} - ${name}`);
      });
    } catch (e) {
      console.log('  解析hierarchyValues失败:', e);
    }
  }

  console.log('');
  console.log('=== 验证结果 ===\n');

  const expectedPath = 'SZ/SU01/SZ0101/-/-/POST_012/LEVEL_008';
  const actualPath = account.path;

  if (actualPath === expectedPath) {
    console.log('✅ 账户路径正确！');
  } else {
    console.log('❌ 账户路径不正确');
    console.log(`  期望: ${expectedPath}`);
    console.log(`  实际: ${actualPath}`);
  }

  await prisma.$disconnect();
}

verifyAccount()
  .then(() => {
    console.log('\n验证完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('验证失败:', error);
    process.exit(1);
  });
