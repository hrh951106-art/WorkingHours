import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeId = 4;
  const employeeNo = '202605002';

  console.log('🔍 诊断账户生成问题...\n');

  // 1. 检查员工信息
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, employeeNo: true, name: true },
  });

  console.log('📋 员工信息:', employee);

  // 2. 检查 laborAccount 表
  const laborAccounts = await prisma.laborAccount.findMany({
    where: { employeeId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log(`\n1️⃣ LaborAccount 表中的账户 (${laborAccounts.length} 个):`);
  laborAccounts.forEach((account: any, index: number) => {
    console.log(`   ${index + 1}. ID: ${account.id}, 编码: ${account.code}, 状态: ${account.status}, 类型: ${account.type}`);
  });

  // 3. 检查 employeeLaborAccount 关联表
  const accountLinks = await prisma.employeeLaborAccount.findMany({
    where: { employeeNo },
    include: { account: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log(`\n2️⃣ EmployeeLaborAccount 关联记录 (${accountLinks.length} 条):`);
  if (accountLinks.length > 0) {
    accountLinks.forEach((link: any, index: number) => {
      console.log(`   ${index + 1}. 关联ID: ${link.id}, 账户ID: ${link.accountId}`);
      console.log(`      账户编码: ${link.account?.code}, 状态: ${link.status}, 是否主账户: ${link.isPrimary}`);
    });
  } else {
    console.log('   ❌ 没有关联记录');
  }

  // 4. 模拟前端查询 - 检查 getEmployeeAccounts 方法会返回什么
  console.log(`\n3️⃣ 模拟前端查询结果:`);
  const queryResult = await prisma.employeeLaborAccount.findMany({
    where: { employeeNo },
    include: { account: true },
    orderBy: [
      { account: { level: 'asc' } },
      { effectiveDate: 'desc' },
    ],
  });

  const mappedResult = queryResult.map((link: any) => link.account);
  console.log(`   返回账户数量: ${mappedResult.length}`);
  mappedResult.forEach((account: any, index: number) => {
    console.log(`   ${index + 1}. ID: ${account.id}, 编码: ${account.code}, 名称: ${account.name}`);
  });

  // 5. 诊断
  console.log(`\n4️⃣ 问题诊断:`);

  if (laborAccounts.length > 0 && accountLinks.length === 0) {
    console.log('   ⚠️  laborAccount 表有账户，但 employeeLaborAccount 表没有关联记录');
    console.log('   💡 这是页签不显示的原因！');
    console.log('   🔧 代码已经修复，但这次生成的账户是在修复之前生成的');
  } else if (accountLinks.length > 0) {
    console.log('   ✅ 关联记录存在，应该能正常显示');
    console.log('   🔄 请尝试刷新浏览器（Cmd+Shift+R）');
  } else {
    console.log('   ❌ 没有找到任何账户');
  }

  // 6. 检查最近创建的账户
  console.log(`\n5️⃣ 最近创建的账户详情:`);
  if (laborAccounts.length > 0) {
    const latestAccount = laborAccounts[0];
    console.log(`   最新账户:`);
    console.log(`   - ID: ${latestAccount.id}`);
    console.log(`   - 编码: ${latestAccount.code}`);
    console.log(`   - 名称: ${latestAccount.name}`);
    console.log(`   - 路径: ${latestAccount.path}`);
    console.log(`   - 名称路径: ${latestAccount.namePath}`);
    console.log(`   - 层级值: ${latestAccount.hierarchyValues}`);
    console.log(`   - 生效日期: ${latestAccount.effectiveDate}`);
    console.log(`   - 创建时间: ${latestAccount.createdAt}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
