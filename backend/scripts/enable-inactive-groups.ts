import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enableInactiveGroups() {
  console.log('🔧 开始修复停用的分组...\n');

  // 1. 查找所有停用的分组
  const inactiveGroups = await prisma.employeeInfoTabGroup.findMany({
    where: {
      status: {
        not: 'ACTIVE',
      },
    },
    include: {
      tab: {
        select: {
          name: true,
        },
      },
    },
  });

  console.log(`⚠️  找到 ${inactiveGroups.length} 个停用的分组:\n`);

  inactiveGroups.forEach((group) => {
    console.log(`  - ${group.name} (${group.tab.name})`);
  });

  // 2. 启用这些分组
  console.log(`\n🔄 正在启用这些分组...\n`);

  for (const group of inactiveGroups) {
    await prisma.employeeInfoTabGroup.update({
      where: { id: group.id },
      data: { status: 'ACTIVE' },
    });
    console.log(`  ✅ 已启用: ${group.name}`);
  }

  // 3. 验证修复结果
  const allGroups = await prisma.employeeInfoTabGroup.findMany();
  const activeCount = allGroups.filter((g) => g.status === 'ACTIVE').length;

  console.log(`\n✅ 修复完成!`);
  console.log(`   - 总分组数: ${allGroups.length}`);
  console.log(`   - 启用分组: ${activeCount}`);
  console.log(`   - 停用分组: ${allGroups.length - activeCount}`);

  await prisma.$disconnect();
}

enableInactiveGroups()
  .then(() => {
    console.log('\n✅ 所有操作完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 错误:', error);
    process.exit(1);
  });
