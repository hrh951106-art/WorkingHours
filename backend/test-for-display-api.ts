import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testForDisplayApi() {
  console.log('========== 测试 for-display API 逻辑 ==========\n');

  const tabs = await prisma.employeeInfoTab.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { sort: 'asc' },
    include: {
      groups: {
        where: { status: 'ACTIVE' },
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

  // 获取所有自定义字段（包含 dataSource 信息）
  const customFields = await prisma.customField.findMany({
    include: {
      dataSource: {
        include: {
          options: {
            where: { isActive: true },
            orderBy: { sort: 'asc' },
          },
        },
      },
    },
  });

  // 模拟 enrichFieldWithType 方法
  const enrichFieldWithType = (field: any) => {
    if (field.isSystem) {
      return {
        ...field,
        type: field.fieldType,
        dataSource: field.dataSource || null,
      };
    }

    if (field.fieldType === 'CUSTOM') {
      const customField = customFields.find((cf) => cf.code === field.fieldCode);
      return {
        ...field,
        type: customField?.type || 'TEXT',
        dataSource: customField?.dataSource || null,
      };
    }

    return {
      ...field,
      type: field.fieldType,
    };
  };

  // 过滤逻辑（与 service 代码一致）
  const filteredTabs = tabs
    .filter((tab) => {
      const hasActiveGroupsWithFields = tab.groups.some(
        (group) => group.fields && group.fields.length > 0
      );
      const hasUngroupedFields = tab.fields && tab.fields.length > 0;
      return hasActiveGroupsWithFields || hasUngroupedFields;
    })
    .map((tab) => {
      const activeGroupsWithFields = tab.groups.filter(
        (group) => group.fields && group.fields.length > 0
      );

      const groupsWithFields = activeGroupsWithFields.map((group) => ({
        ...group,
        fields: group.fields.map((field) => enrichFieldWithType(field)),
      }));

      const ungroupedFields = tab.fields.map((field) => enrichFieldWithType(field));

      return {
        ...tab,
        groups: groupsWithFields,
        fields: ungroupedFields,
      };
    });

  console.log(`\nfor-display API 将返回 ${filteredTabs.length} 个页签:\n`);

  for (const tab of filteredTabs) {
    console.log(`\n${tab.name} (code: ${tab.code})`);
    console.log(`  分组数量: ${tab.groups.length}`);

    for (const group of tab.groups) {
      // 按前端过滤逻辑分类
      const systemFields = group.fields.filter((f: any) => f.isSystem && !f.isHidden);
      const customFields = group.fields.filter((f: any) => f.fieldType === 'CUSTOM' && !f.isHidden);

      console.log(`\n  分组: ${group.name}`);
      console.log(`    - 系统字段: ${systemFields.length} 个`);
      systemFields.forEach((f: any) => {
        console.log(`      * ${f.fieldName} (${f.fieldCode})`);
        console.log(`        - fieldType: ${f.fieldType}`);
        console.log(`        - type: ${f.type}`);
        console.log(`        - isSystem: ${f.isSystem}`);
        console.log(`        - isRequired: ${f.isRequired}`);
        console.log(`        - isHidden: ${f.isHidden}`);
      });
      console.log(`    - 自定义字段: ${customFields.length} 个`);
      customFields.forEach((f: any) => {
        console.log(`      * ${f.fieldName} (${f.fieldCode})`);
      });
    }

    if (tab.fields.length > 0) {
      console.log(`\n  未分组字段: ${tab.fields.length} 个`);
    }
  }

  console.log('\n========== 字段统计 ==========\n');

  let totalSystemFields = 0;
  let totalCustomFields = 0;

  filteredTabs.forEach((tab) => {
    tab.groups.forEach((group) => {
      const systemFields = group.fields.filter((f: any) => f.isSystem && !f.isHidden);
      const customFields = group.fields.filter((f: any) => f.fieldType === 'CUSTOM' && !f.isHidden);
      totalSystemFields += systemFields.length;
      totalCustomFields += customFields.length;
    });
  });

  console.log(`总系统字段: ${totalSystemFields} 个`);
  console.log(`总自定义字段: ${totalCustomFields} 个`);
  console.log(`总计: ${totalSystemFields + totalCustomFields} 个可见字段`);
}

testForDisplayApi()
  .then(() => {
    console.log('\n✓ 测试完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('测试失败:', error);
    process.exit(1);
  });
