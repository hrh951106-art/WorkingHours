import { PrismaService } from './src/database/prisma.service';
import { AccountService } from './src/modules/account/account.service';

async function regenerate() {
  const prisma = new PrismaService();
  const accountService = new AccountService(prisma);

  try {
    console.log('=== 重新生成主账户 ===\n');

    // 1. 删除旧的主账户
    console.log('1. 删除员工5的旧主账户...');
    await prisma.laborAccount.deleteMany({
      where: {
        employeeId: 5,
        type: 'MAIN',
      },
    });
    console.log('   ✅ 已删除\n');

    // 2. 生成新的主账户
    console.log('2. 生成新的主账户...');
    const accounts = await accountService.generateAccountsForEmployee(5);
    console.log(`   ✅ 已生成 ${accounts.length} 个账户\n`);

    // 3. 查询新生成的主账户
    const newMainAccount = await prisma.laborAccount.findFirst({
      where: {
        employeeId: 5,
        type: 'MAIN',
      },
      orderBy: {
        id: 'desc',
      },
    });

    if (newMainAccount) {
      console.log('3. 新主账户信息:');
      console.log(`   ID: ${newMainAccount.id}`);
      console.log(`   Code: ${newMainAccount.code}`);
      console.log(`   Path: ${newMainAccount.path}`);
      console.log(`   NamePath: ${newMainAccount.namePath || '(空)'}`);

      if (newMainAccount.hierarchyValues) {
        try {
          const hv = JSON.parse(newMainAccount.hierarchyValues);
          console.log(`   HierarchyValues (${hv.length} 层):`);
          hv.forEach((item: any) => {
            if (item.selectedValue) {
              const code = item.selectedValue.code || 'N/A';
              const name = item.selectedValue.name || 'N/A';
              const label = item.selectedValueLabel || 'N/A';
              console.log(`     Level ${item.level}: code=${code}, name=${name}, label=${label}`);
            } else {
              console.log(`     Level ${item.level}: null`);
            }
          });
        } catch (e) {
          console.log('   HierarchyValues解析失败');
        }
      }

      // 验证
      console.log('\n4. 验证结果:');
      const expectedPath = 'DH/DH01/DH01001/A01/-/FULL_TIME/FINANCE';
      const actualPath = newMainAccount.path;

      if (actualPath === expectedPath) {
        console.log('   ✅ Path正确！');
      } else {
        console.log('   ❌ Path错误！');
        console.log(`      期望: ${expectedPath}`);
        console.log(`      实际: ${actualPath}`);
      }

      if (newMainAccount.namePath && newMainAccount.namePath.length > 0) {
        console.log('   ✅ NamePath已生成！');
      } else {
        console.log('   ❌ NamePath为空！');
      }
    }

  } catch (error) {
    console.error('操作失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

regenerate();
