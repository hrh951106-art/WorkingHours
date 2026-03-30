import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixGroupStatus() {
  console.log('🔍 开始检查分组状态...\n');

  // 1. 查询所有分组及其状态
  const allGroups = await prisma.employeeInfoTabGroup.findMany({
    include: {
      tab: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      _count: {
        select: {
          fields: true,
        },
      },
    },
    orderBy: {
      tabId: 'asc',
    },
  });

  console.log(`📊 找到 ${allGroups.length} 个分组\n`);

  // 2. 按页签分组显示
  const groupsByTab: Record<number, any[]> = {};
  allGroups.forEach((group) => {
    if (!groupsByTab[group.tabId]) {
      groupsByTab[group.tabId] = [];
    }
    groupsByTab[group.tabId].push(group);
  });

  // 3. 显示每个页签的分组状态
  for (const [tabId, groups] of Object.entries(groupsByTab)) {
    const tab = await prisma.employeeInfoTab.findUnique({
      where: { id: Number(tabId) },
    });

    console.log(`\n📁 页签: ${tab?.name} (ID: ${tabId}, 状态: ${tab?.status})`);
    console.log('─'.repeat(80));

    groups.forEach((group) => {
      const statusIcon = group.status === 'ACTIVE' ? '✅' : '❌';
      const statusText = group.status === 'ACTIVE' ? '启用' : '停用';
      console.log(
        `  ${statusIcon} ${group.name} (ID: ${group.id}, 状态: ${statusText}, 字段数: ${group._count.fields})`
      );
    });
  }

  // 4. 统计停用的分组
  const inactiveGroups = allGroups.filter((g) => g.status !== 'ACTIVE');
  console.log(`\n\n⚠️  发现 ${inactiveGroups.length} 个停用的分组`);

  if (inactiveGroups.length > 0) {
    console.log('\n停用的分组详情:');
    console.log('─'.repeat(80));
    inactiveGroups.forEach((group) => {
      console.log(
        `  - ID: ${group.id}, 名称: ${group.name}, 页签: ${group.tab.name}, 字段数: ${group._count.fields}`
      );
    });

    // 5. 询问是否修复
    console.log('\n\n🔧 是否将这些停用的分组全部启用？');
    console.log('   影响范围: ' + inactiveGroups.length + ' 个分组');

    // 这里可以根据需要自动修复或手动确认
    // 为了安全起见，这里只显示信息，不自动修改

    console.log('\n💡 如需修复，请使用以下 SQL 命令:');
    console.log('   UPDATE "EmployeeInfoTabGroup" SET "status" = \'ACTIVE\' WHERE "status" != \'ACTIVE\';');
  } else {
    console.log('\n✅ 所有分组状态正常，无需修复');
  }

  // 6. 显示启用的分组数量
  const activeGroups = allGroups.filter((g) => g.status === 'ACTIVE');
  console.log(`\n\n📈 统计信息:`);
  console.log(`  - 总分组数: ${allGroups.length}`);
  console.log(`  - 启用分组: ${activeGroups.length}`);
  console.log(`  - 停用分组: ${inactiveGroups.length}`);

  await prisma.$disconnect();
}

fixGroupStatus()
  .then(() => {
    console.log('\n✅ 检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 错误:', error);
    process.exit(1);
  });
