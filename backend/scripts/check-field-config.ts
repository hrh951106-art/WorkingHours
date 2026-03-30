import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFieldConfig() {
  console.log('=== 检查字段配置 ===\n');

  // 获取所有页签
  const tabs = await prisma.employeeInfoTab.findMany({
    where: { status: 'ACTIVE' },
    include: {
      groups: {
        where: { status: 'ACTIVE' },
        include: {
          fields: true,
        },
      },
    },
  }) as any[];

  tabs.forEach(tab => {
    console.log(`页签: ${tab.name} (${tab.code})`);
    if (tab.groups && tab.groups.length > 0) {
      tab.groups.forEach((group: any) => {
        console.log(`  分组: ${group.name} (${group.code})`);
        if (group.fields && group.fields.length > 0) {
          group.fields.forEach((field: any) => {
            console.log(`    字段: ${field.fieldName} (${field.fieldCode}), 类型: ${field.fieldType}, 隐藏: ${field.isHidden ? '是' : '否'}`);
          });
        } else {
          console.log(`    (无字段)`);
        }
      });
    } else {
      console.log(`  (无分组)`);
    }
    console.log();
  });

  await prisma.$disconnect();
}

checkFieldConfig().catch(console.error);
