import { PrismaService } from './src/database/prisma.service';
import { AccountService } from './src/modules/account/account.service';

async function test() {
  const prisma = new PrismaService();
  const accountService = new AccountService(prisma);

  try {
    console.log('=== 测试账户生成逻辑 ===\n');

    // 1. 检查WorkInfoHistory数据
    console.log('1. 查询WorkInfoHistory数据:');
    const workInfoHistory = await prisma.workInfoHistory.findFirst({
      where: {
        employeeId: 5,
        isCurrent: true,
      },
    });

    if (workInfoHistory) {
      console.log(`   ID: ${workInfoHistory.id}`);
      console.log(`   employeeType: ${workInfoHistory.employeeType || '(空)'}`);
      console.log(`   position: ${workInfoHistory.position || '(空)'}`);
      console.log(`   customFields: ${workInfoHistory.customFields}`);

      const customFields = typeof workInfoHistory.customFields === 'string'
        ? JSON.parse(workInfoHistory.customFields)
        : workInfoHistory.customFields || {};

      console.log(`   解析后的customFields:`, JSON.stringify(customFields, null, 2));
    } else {
      console.log('   未找到WorkInfoHistory数据');
    }

    // 2. 检查Employee.customFields
    console.log('\n2. 查询Employee.customFields:');
    const employee = await prisma.employee.findUnique({
      where: { id: 5 },
      select: { customFields: true },
    });

    if (employee) {
      const empCustomFields = typeof employee.customFields === 'string'
        ? JSON.parse(employee.customFields)
        : employee.customFields || {};
      console.log('   Employee.customFields:', JSON.stringify(empCustomFields, null, 2));
    }

    // 3. 删除所有主账户
    console.log('\n3. 删除所有主账户...');
    const deleteResult = await prisma.laborAccount.deleteMany({
      where: {
        employeeId: 5,
        type: 'MAIN',
      },
    });
    console.log(`   已删除 ${deleteResult.count} 条记录`);

    // 4. 生成新账户
    console.log('\n4. 生成新账户...');
    const accounts = await accountService.generateAccountsForEmployee(5);

    console.log(`   生成了 ${accounts.length} 个账户\n`);

    // 5. 查询并显示生成的账户
    console.log('5. 查询生成的账户:');
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
      console.log(`   ID: ${account.id}`);
      console.log(`   Code: ${account.code}`);
      console.log(`   Path: ${account.path}`);
      console.log(`   NamePath: ${account.namePath || '(空)'}`);

      if (account.hierarchyValues) {
        try {
          const hv = JSON.parse(account.hierarchyValues);
          console.log(`   HierarchyValues (${hv.length} 层级):`);
          hv.forEach((item: any) => {
            if (item.selectedValue) {
              const code = item.selectedValue.code || 'N/A';
              const name = item.selectedValue.name || 'N/A';
              console.log(`     Level ${item.level} (${item.name}): code=${code}, name=${name}`);
            } else {
              console.log(`     Level ${item.level} (${item.name}): null`);
            }
          });
        } catch (e) {
          console.log('   HierarchyValues解析失败');
        }
      } else {
        console.log('   HierarchyValues: 空');
      }
    }

    // 6. 验证结果
    console.log('\n6. 验证结果:');
    const expectedPath = 'DH/DH01/DH01001/A01/-/FULL_TIME/FINANCE';
    const actualPath = generatedAccounts[0]?.path || '';

    if (actualPath === expectedPath) {
      console.log('   ✅ Path正确！');
    } else {
      console.log(`   ❌ Path错误！`);
      console.log(`      期望: ${expectedPath}`);
      console.log(`      实际: ${actualPath}`);
    }

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
