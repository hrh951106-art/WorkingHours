import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 查找名称错误的账户 ===\n');

  // 查找所有包含"间接设备"的账户
  const accounts = await prisma.laborAccount.findMany({
    where: {
      name: {
        contains: '间接设备',
      },
    },
  });

  console.log(`找到 ${accounts.length} 个包含"间接设备"的账户:\n`);

  for (const account of accounts) {
    console.log(`账户: ${account.name}`);
    console.log(`  ID: ${account.id}`);
    console.log(`  编码: ${account.code}`);
    console.log(`  名称路径: ${account.namePath}`);
    console.log(`  路径: ${account.path}`);

    // 解析层级值
    const hierarchyValues = JSON.parse(account.hierarchyValues || '[]');
    const workshop = hierarchyValues.find((hv: any) => hv.level === 2);
    const line = hierarchyValues.find((hv: any) => hv.level === 3);

    console.log(`  车间: ${workshop?.selectedValue?.name || '未配置'}`);
    console.log(`  线体: ${line?.selectedValue?.name || '未配置'}`);

    // 检查是否有A01车间的问题
    if (account.name.includes('A01车间') && account.name.includes('L2')) {
      console.log(`  ⚠️  发现问题账户！应该改为W1总装车间`);
    }

    console.log('');
  }

  // 查找W1总装车间的L2线体
  console.log('\n=== 查找W1总装车间的线体 ===');
  const l2Lines = await prisma.organization.findMany({
    where: {
      name: { contains: 'L2' },
      type: 'TEAM',
    },
  });

  console.log('找到L2相关线体:');
  l2Lines.forEach(line => {
    console.log(`  - ${line.name} (ID: ${line.id}, Code: ${line.code})`);
  });
}

main()
  .catch((e) => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
