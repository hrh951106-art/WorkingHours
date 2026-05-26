import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeId = 4;
  const employeeNo = '202605002';

  console.log('🔧 为现有账户补创建关联记录...\n');

  // 1. 获取员工信息
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, employeeNo: true, name: true },
  });

  if (!employee) {
    console.log('❌ 员工不存在');
    return;
  }

  // 2. 获取所有主账户
  const mainAccounts = await prisma.laborAccount.findMany({
    where: {
      employeeId,
      type: 'MAIN',
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`📋 找到 ${mainAccounts.length} 个活跃主账户\n`);

  if (mainAccounts.length === 0) {
    console.log('❌ 没有需要创建关联的主账户');
    return;
  }

  // 3. 检查是否已存在关联记录
  const existingLinks = await prisma.employeeLaborAccount.findMany({
    where: { employeeNo },
  });

  if (existingLinks.length > 0) {
    console.log('⚠️  已存在关联记录，跳过创建');
    console.log(`   现有关联记录数: ${existingLinks.length}`);
    return;
  }

  // 4. 为主账户创建关联记录
  for (const account of mainAccounts) {
    const link = await prisma.employeeLaborAccount.create({
      data: {
        employeeNo: employee.employeeNo,
        employeeId: employeeId,
        accountId: account.id,
        effectiveDate: account.effectiveDate,
        expiryDate: account.expiryDate,
        isPrimary: true,
        status: 'ACTIVE',
      },
    });

    console.log(`✅ 已创建关联记录:`);
    console.log(`   关联ID: ${link.id}`);
    console.log(`   账户ID: ${account.id}`);
    console.log(`   账户编码: ${account.code}`);
    console.log(`   生效日期: ${link.effectiveDate}\n`);
  }

  // 5. 验证创建结果
  const allLinks = await prisma.employeeLaborAccount.findMany({
    where: { employeeNo },
    include: { account: true },
  });

  console.log(`✨ 完成！共创建 ${allLinks.length} 条关联记录`);
  console.log(`\n📊 当前账户列表:`);
  allLinks.forEach((link: any, index: number) => {
    console.log(`${index + 1}. ${link.account?.name || '(未命名)'} (${link.account?.code})`);
  });

  console.log(`\n🔄 请刷新浏览器页面 (Cmd+Shift+R) 查看账户列表`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
