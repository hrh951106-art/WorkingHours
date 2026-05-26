import { PrismaService } from './src/database/prisma.service';
import { AccountService } from './src/modules/account/account.service';

async function test() {
  const prisma = new PrismaService();
  const accountService = new AccountService(prisma);

  try {
    console.log('为员工5重新生成主账户...');

    const result = await accountService.generateMainAccount({
      employeeId: 5,
    });

    console.log('\n生成的主账户信息:');
    console.log(`  ID: ${result.id}`);
    console.log(`  Code: ${result.code}`);
    console.log(`  Name: ${result.name}`);
    console.log(`  Type: ${result.type}`);
    console.log(`  Level: ${result.level}`);
    console.log(`  Path: ${result.path}`);
    console.log(`  NamePath: ${result.namePath}`);

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
        console.log(`  HierarchyValues: ${result.hierarchyValues.substring(0, 200)}...`);
      }
    } else {
      console.log('  HierarchyValues: 空');
    }

  } catch (error) {
    console.error('生成主账户失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
