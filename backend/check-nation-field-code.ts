import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFieldConfig() {
  // 查询基本信息页签
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

  if (!basicInfoTab) {
    console.log('基本信息页签不存在');
    return;
  }

  console.log('=== 基本信息页签字段配置 ===');
  basicInfoTab.groups.forEach(group => {
    console.log(`\n分组: ${group.name}`);
    group.fields.forEach(field => {
      if (field.fieldName.includes('民族') || field.fieldName.includes('岗位') ||
          field.fieldCode.includes('nation') || field.fieldCode.includes('position')) {
        console.log(`  字段代码: ${field.fieldCode}`);
        console.log(`  字段名称: ${field.fieldName}`);
        console.log(`  是否系统字段: ${field.isSystem}`);
        console.log(`  是否必填: ${field.isRequired}`);
      }
    });
  });

  // 列出所有字段
  console.log('\n=== 所有字段 ===');
  basicInfoTab.groups.forEach(group => {
    console.log(`\n分组: ${group.name}`);
    group.fields.forEach(field => {
      console.log(`  ${field.fieldCode} (${field.fieldName}) - 系统:${field.isSystem} 必填:${field.isRequired}`);
    });
  });
}

checkFieldConfig()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
