import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeId = 4;
  const employeeNo = '202605002';

  console.log('🔍 检查员工账户显示问题...\n');

  // 1. 查询 laborAccount 表中该员工的主账户
  const laborAccounts = await prisma.laborAccount.findMany({
    where: {
      employeeId,
      type: 'MAIN',
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`1️⃣ LaborAccount 表中的主账户: ${laborAccounts.length} 个`);
  laborAccounts.forEach((account: any) => {
    console.log(`   - ID: ${account.id}, 编码: ${account.code}, 状态: ${account.status}`);
  });

  // 2. 查询 employeeLaborAccount 关联表
  const employeeLaborAccounts = await prisma.employeeLaborAccount.findMany({
    where: {
      employeeNo,
    },
    include: {
      account: true,
    },
  });

  console.log(`\n2️⃣ EmployeeLaborAccount 关联记录: ${employeeLaborAccounts.length} 条`);
  employeeLaborAccounts.forEach((link: any) => {
    console.log(`   - 关联ID: ${link.id}, 账户ID: ${link.accountId}, 状态: ${link.status}`);
    console.log(`     账户编码: ${link.account?.code}, 账户状态: ${link.account?.status}`);
  });

  // 3. 检查是否有活跃账户但缺少关联记录
  const activeAccounts = laborAccounts.filter((a: any) => a.status === 'ACTIVE');
  console.log(`\n3️⃣ 活跃的主账户: ${activeAccounts.length} 个`);

  if (activeAccounts.length > 0 && employeeLaborAccounts.length === 0) {
    console.log('⚠️  问题诊断：存在活跃主账户，但没有关联记录！');
    console.log('   这就是为什么页签不显示账户的原因。');
    console.log('\n💡 解决方案：为现有账户补创建关联记录\n');

    // 补创建关联记录
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, employeeNo: true, name: true },
    });

    for (const account of activeAccounts) {
      const link = await prisma.employeeLaborAccount.create({
        data: {
          employeeNo: employee!.employeeNo,
          employeeId: employeeId,
          accountId: account.id,
          effectiveDate: account.effectiveDate,
          isPrimary: true,
          status: 'ACTIVE',
        },
      });
      console.log(`✅ 已创建关联记录 - 关联ID: ${link.id}, 账户ID: ${account.id}`);
    }

    console.log('\n✨ 关联记录创建完成！请刷新浏览器页面。');
  } else if (employeeLaborAccounts.length > 0) {
    console.log('✅ 关联记录存在，应该可以正常显示');
    console.log('   如果页签仍不显示，请检查：');
    console.log('   1. 浏览器是否已刷新？');
    console.log('   2. 前端控制台是否有错误？');
  } else {
    console.log('❌ 没有找到任何账户，需要先生成账户');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
