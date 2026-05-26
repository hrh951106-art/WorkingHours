import { PrismaService } from './src/database/prisma.service';
import { AccountService } from './src/modules/account/account.service';

async function test() {
  const prisma = new PrismaService();
  const accountService = new AccountService(prisma);

  try {
    console.log('=== 测试账户生成 ===\n');

    // 生成账户
    console.log('正在生成账户...');
    const accounts = await accountService.generateAccountsForEmployee(5);
    console.log(`生成了 ${accounts.length} 个账户\n`);

    // 查询生成的账户
    const generatedAccounts = await prisma.laborAccount.findMany({
      where: {
        employeeId: 5,
        type: 'MAIN',
      },
      orderBy: {
        id: 'desc',
      },
      take: 1,
    });

    if (generatedAccounts.length > 0) {
      const account = generatedAccounts[0];
      console.log('生成的账户:');
      console.log(`  ID: ${account.id}`);
      console.log(`  Code: ${account.code}`);
      console.log(`  Path: ${account.path}`);
      console.log(`  NamePath: ${account.namePath || '(空)'}`);

      const expectedPath = 'DH/DH01/DH01001/A01/-/FULL_TIME/FINANCE';
      const actualPath = account.path;

      console.log('\n验证结果:');
      if (actualPath === expectedPath) {
        console.log('  ✅ Path正确！');
      } else {
        console.log('  ❌ Path错误！');
        console.log(`     期望: ${expectedPath}`);
        console.log(`     实际: ${actualPath}`);
      }
    }

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
