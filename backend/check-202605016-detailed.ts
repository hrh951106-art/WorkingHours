import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 详细检查员工202605016的所有账户状态
 */
async function checkDetailedStatus() {
  const employeeNo = '202605016';

  console.log('=== 详细账户状态检查 ===\n');

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
  console.log(`员工ID: ${employee.id}`);
  console.log(`员工状态: ${employee.status}\n`);

  // 2. 查找所有类型的账户
  const allAccounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      code: true,
      type: true,
      status: true,
      effectiveDate: true,
      expiryDate: true,
      createdAt: true,
      path: true,
    },
  });

  console.log(`所有账户（共${allAccounts.length}个）:\n`);

  allAccounts.forEach((acc) => {
    const statusIcon = acc.status === 'ACTIVE' ? '✅' : acc.status === 'INACTIVE' ? '❌' : acc.status === 'FROZEN' ? '❄️' : '⚠️';
    console.log(`${statusIcon} 账户${acc.id} (${acc.type}):`);
    console.log(`   状态: ${acc.status}`);
    console.log(`   生效日期: ${acc.effectiveDate?.toISOString().substring(0, 10) || 'NULL'}`);
    console.log(`   失效日期: ${acc.expiryDate ? acc.expiryDate.toISOString().substring(0, 10) : 'NULL'}`);
    console.log(`   路径: ${acc.path}`);
    console.log('');
  });

  // 3. 查找员工与账户的关联记录
  const employeeLaborAccounts = await prisma.employeeLaborAccount.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      accountId: true,
      status: true,
      effectiveDate: true,
      isPrimary: true,
      createdAt: true,
    },
  });

  console.log(`员工与账户关联记录（共${employeeLaborAccounts.length}条）:\n`);

  employeeLaborAccounts.forEach((ela) => {
    const statusIcon = ela.status === 'ACTIVE' ? '✅' : ela.status === 'INACTIVE' ? '❌' : '⚠️';
    console.log(`${statusIcon} 关联记录${ela.id}:`);
    console.log(`   账户ID: ${ela.accountId}`);
    console.log(`   状态: ${ela.status}`);
    console.log(`   是否主账户: ${ela.isPrimary ? '是' : '否'}`);
    console.log(`   生效日期: ${ela.effectiveDate?.toISOString().substring(0, 10) || 'NULL'}`);
    console.log('');
  });

  // 4. 分析状态
  console.log('=== 状态分析 ===\n');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeMainAccounts = allAccounts.filter(acc => acc.type === 'MAIN' && acc.status === 'ACTIVE');

  if (activeMainAccounts.length === 0) {
    console.log('⚠️ 当前没有ACTIVE状态的主账户！');
    console.log('');
    console.log('原因分析：');

    const inactiveMainAccounts = allAccounts.filter(acc => acc.type === 'MAIN' && acc.status === 'INACTIVE');

    if (inactiveMainAccounts.length > 0) {
      console.log(`  有${inactiveMainAccounts.length}个INACTIVE的主账户:`);

      inactiveMainAccounts.forEach((acc) => {
        console.log(`    账户${acc.id}:`);
        console.log(`      生效日期: ${acc.effectiveDate?.toISOString().substring(0, 10)}`);
        console.log(`      失效日期: ${acc.expiryDate ? acc.expiryDate.toISOString().substring(0, 10) : '未设置'}`);

        if (acc.expiryDate) {
          const expiryDate = new Date(acc.expiryDate);
          expiryDate.setHours(0, 0, 0, 0);
          if (expiryDate < today) {
            console.log(`      状态: 已过期 ❌`);
          }
        }
        console.log('');
      });
    }

    console.log('可能的原因:');
    console.log('1. 账户重新生成时，旧账户被标记为INACTIVE');
    console.log('2. 账户过期后系统自动设置为INACTIVE');
    console.log('3. 需要重新生成账户来创建新的ACTIVE账户');
  } else {
    console.log(`✅ 有${activeMainAccounts.length}个ACTIVE的主账户`);
  }

  await prisma.$disconnect();
}

checkDetailedStatus()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
