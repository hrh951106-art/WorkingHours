import { PrismaService } from './src/database/prisma.service';
import { AccountService } from './src/modules/account/account.service';

async function test() {
  const prisma = new PrismaService();
  const accountService = new AccountService(prisma);

  try {
    // 查找员工5的主账户
    const accounts = await prisma.laborAccount.findMany({
      where: {
        employeeId: 5,
        type: 'MAIN',
      },
      orderBy: {
        id: 'desc',
      },
    });

    console.log(`找到 ${accounts.length} 个主账���`);

    if (accounts.length > 0) {
      // 删除所有旧的主账户
      for (const account of accounts) {
        console.log(`删除主账户 ID=${account.id}, Code=${account.code}, Path=${account.path}`);
        await prisma.laborAccount.delete({
          where: { id: account.id },
        });
      }
    }

    console.log('\n重新生成主账户...');
    const result = await accountService.generateMainAccount({
      employeeId: 5,
    });

    console.log('\n✅ 生成的主账户信息:');
    console.log(`  ID: ${result.id}`);
    console.log(`  Code: ${result.code}`);
    console.log(`  Path (code路径): ${result.path}`);
    console.log(`  NamePath (name路径): ${result.namePath}`);

    if (result.hierarchyValues) {
      try {
        const hv = JSON.parse(result.hierarchyValues);
        console.log(`\nHierarchyValues (${hv.length} 层级):`);
        hv.forEach((item: any) => {
          if (item.selectedValue) {
            const code = item.selectedValue.code || 'N/A';
            const name = item.selectedValue.name || 'N/A';
            console.log(`  Level ${item.level} (${item.name}): code=${code}, name=${name}`);
          } else {
            console.log(`  Level ${item.level} (${item.name}): null`);
          }
        });
      } catch (e) {
        console.log(`  HierarchyValues解析失败: ${e}`);
      }
    }

  } catch (error) {
    console.error('操作失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
