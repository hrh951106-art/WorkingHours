import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkWorkInfoTab() {
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

  if (!workInfoTab) {
    console.log('工作信息页签不存在');
    return;
  }

  console.log('=== 工作信息页签字段配置 ===');
  workInfoTab.groups.forEach(group => {
    console.log(`\n分组: ${group.name} (${group.code})`);
    group.fields.forEach(field => {
      console.log(`  ${field.fieldCode} (${field.fieldName}) - 系统:${field.isSystem} 必填:${field.isRequired}`);
    });
  });
}

checkWorkInfoTab()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
