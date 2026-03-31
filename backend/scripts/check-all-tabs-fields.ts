import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAllTabsFields() {
  console.log('=== 检查所有页签的 SELECT 类型字段 ===\n');

  // 获取所有页签
  const allTabs = await prisma.employeeInfoTab.findMany({
    where: { status: 'ACTIVE' },
    include: {
      groups: {
        where: { status: 'ACTIVE' },
        include: {
          fields: {
            where: {
              isHidden: false,
              fieldType: 'SELECT',  // 只查询 SELECT 类型的字段
            },
          },
        },
      },
    },
  });

  let totalSelectFields = 0;
  let fieldsToFix: any[] = [];

  for (const tab of allTabs) {
    let hasSelectFields = false;

    for (const group of tab.groups || []) {
      if (!group.fields || group.fields.length === 0) continue;

      group.fields.forEach((field) => {
        hasSelectFields = true;
        totalSelectFields++;

        fieldsToFix.push({
          tabCode: tab.code,
          tabName: tab.name,
          groupCode: group.code,
          groupName: group.name,
          fieldCode: field.fieldCode,
          fieldName: field.fieldName,
          fieldType: field.fieldType,
        });
      });

      if (hasSelectFields) {
        console.log(`${tab.name} (${tab.code}):`);
        break;
      }
    }

    if (hasSelectFields) {
      for (const group of tab.groups || []) {
        if (!group.fields || group.fields.length === 0) continue;

        group.fields.forEach((field) => {
          if (field.fieldType === 'SELECT') {
            console.log(`  - ${group.name}: ${field.fieldCode} (${field.fieldName})`);
          }
        });
      }
      console.log();
    }
  }

  console.log('========================================');
  console.log(`总共发现 ${totalSelectFields} 个 fieldType=SELECT 的字段\n`);

  if (fieldsToFix.length > 0) {
    console.log('详细列表:');
    console.log('========================================');
    fieldsToFix.forEach(f => {
      console.log(`- ${f.tabName}/${f.groupName}: ${f.fieldCode} (${f.fieldName})`);
    });

    console.log('\n分析:');
    console.log('========================================');
    console.log('这些 SELECT 类型的字段可能是:');
    console.log('1. 自定义字段 (应该保持 SELECT 类型)');
    console.log('2. 系统下拉字段 (应该改为 SYSTEM 类型)');
    console.log('\n需要根据具体情况判断是否需要修复。');
  }

  await prisma.$disconnect();
}

checkAllTabsFields().catch(console.error);
