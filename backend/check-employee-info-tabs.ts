import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEmployeeInfoTabs() {
  console.log('========== 检查人事信息页签配置 ==========\n');

  // 1. 获取所有页签
  const tabs = await prisma.employeeInfoTab.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { sort: 'asc' },
    include: {
      groups: {
        orderBy: { sort: 'asc' },
        include: {
          fields: {
            orderBy: { sort: 'asc' },
          },
        },
      },
      fields: {
        where: { groupId: null },
        orderBy: { sort: 'asc' },
      },
    },
  });

  console.log(`找到 ${tabs.length} 个启用的页签:\n`);

  for (const tab of tabs) {
    console.log(`\n页签: ${tab.name} (code: ${tab.code}, id: ${tab.id})`);
    console.log(`- 分组数量: ${tab.groups.length}`);
    console.log(`- 未分组字段数��: ${tab.fields.length}`);

    // 检查分组
    for (const group of tab.groups) {
      console.log(`\n  分组: ${group.name} (id: ${group.id}, status: ${group.status})`);
      console.log(`  - 字段数量: ${group.fields.length}`);

      // 显示字段详情
      if (group.fields.length > 0) {
        console.log(`  - 字段列表:`);
        for (const field of group.fields) {
          console.log(`    * ${field.fieldName} (${field.fieldCode})`);
          console.log(`      - fieldType: ${field.fieldType}`);
          console.log(`      - isSystem: ${field.isSystem}`);
          console.log(`      - isRequired: ${field.isRequired}`);
          console.log(`      - isHidden: ${field.isHidden}`);
        }
      } else {
        console.log(`  - ⚠️  该分组没有字段`);
      }
    }

    // 显示未分组字段
    if (tab.fields.length > 0) {
      console.log(`\n  未分组字段:`);
      for (const field of tab.fields) {
        console.log(`    * ${field.fieldName} (${field.fieldCode})`);
      }
    }
  }

  // 2. 测试 for-display API 的逻辑
  console.log('\n\n========== 测试 for-display 过滤逻辑 ==========\n');

  const tabsForDisplay = tabs
    .filter((tab) => {
      const hasActiveGroupsWithFields = tab.groups.some(
        (group) => group.fields && group.fields.length > 0
      );
      const hasUngroupedFields = tab.fields && tab.fields.length > 0;
      return hasActiveGroupsWithFields || hasUngroupedFields;
    })
    .map((tab) => ({
      ...tab,
      groups: tab.groups.filter((group) => group.fields && group.fields.length > 0),
    }));

  console.log(`for-display 将返回 ${tabsForDisplay.length} 个页签:`);
  for (const tab of tabsForDisplay) {
    console.log(`- ${tab.name} (${tab.groups.length} 个分组)`);
    for (const group of tab.groups) {
      // 过滤掉隐藏的字段
      const visibleFields = group.fields.filter((f) => !f.isHidden);
      const hiddenFields = group.fields.filter((f) => f.isHidden);
      console.log(`  - ${group.name}: ${visibleFields.length} 个可见字段, ${hiddenFields.length} 个隐藏字段`);
    }
  }

  // 3. 检查是否有所有字段都被隐藏的情况
  console.log('\n\n========== 检查所有字段都被隐藏的分组 ==========\n');

  for (const tab of tabs) {
    for (const group of tab.groups) {
      const allHidden = group.fields.every((f) => f.isHidden);
      if (group.fields.length > 0 && allHidden) {
        console.log(`⚠️  页签 "${tab.name}" 的分组 "${group.name}" 所有字段都被隐藏了`);
      }
    }
  }

  // 4. 检查是否有禁用的分组
  console.log('\n\n========== 检查禁用的分组 ==========\n');

  for (const tab of tabs) {
    const inactiveGroups = tab.groups.filter((g) => g.status === 'INACTIVE');
    if (inactiveGroups.length > 0) {
      console.log(`页签 "${tab.name}" 有 ${inactiveGroups.length} 个禁用的分组:`);
      for (const group of inactiveGroups) {
        console.log(`  - ${group.name} (${group.fields.length} 个字段)`);
      }
    }
  }
}

checkEmployeeInfoTabs()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
