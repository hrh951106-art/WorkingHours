import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAllTabFields() {
  console.log('=== 检查所有页签字段类型 ===\n');

  // 获取基本信息页签
  const basicInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'basic_info' },
    include: {
      groups: {
        where: { status: 'ACTIVE' },
        include: {
          fields: {
            where: { isHidden: false },
          },
        },
      },
    },
  });

  // 获取工作信息页签
  const workInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'work_info' },
    include: {
      groups: {
        where: { status: 'ACTIVE' },
        include: {
          fields: {
            where: { isHidden: false },
          },
        },
      },
    },
  });

  const tabs = [basicInfoTab, workInfoTab].filter(t => t !== null);

  let totalSelectFields = 0;
  let fieldsToFix: any[] = [];

  for (const tab of tabs) {
    if (!tab) continue;

    console.log(`\n${tab.name} (${tab.code}):`);
    console.log('========================================');

    for (const group of tab.groups || []) {
      if (!group.fields || group.fields.length === 0) continue;

      group.fields.forEach((field) => {
        const isSelect = field.fieldType === 'SELECT';
        const isSystem = field.fieldType === 'SYSTEM';

        if (isSelect) {
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
        }

        const status = isSelect ? '⚠️  SELECT' : (isSystem ? '✓ SYSTEM' : field.fieldType);
        console.log(`  ${status} ${field.fieldCode}: ${field.fieldName}`);
      });
    }
  }

  console.log('\n========================================');
  console.log(`发现 ${totalSelectFields} 个 fieldType=SELECT 的字段`);
  console.log('\n这些字段应该改为 SYSTEM 类型\n');

  if (fieldsToFix.length > 0) {
    console.log('需要修复的字段列表:');
    console.log('========================================');
    fieldsToFix.forEach(f => {
      console.log(`- ${f.tabName}/${f.groupName}: ${f.fieldCode} (${f.fieldName})`);
    });
  }

  await prisma.$disconnect();
}

checkAllTabFields().catch(console.error);
