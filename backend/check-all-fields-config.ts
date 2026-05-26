import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllFields() {
  // 查询工作信息页签
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

  console.log('=== 工作信息页签所有字段 ===');
  const allFields = [];
  workInfoTab.groups.forEach(group => {
    group.fields.forEach(field => {
      allFields.push({
        fieldCode: field.fieldCode,
        fieldName: field.fieldName,
        isSystem: field.isSystem,
        isRequired: field.isRequired,
        group: group.name,
      });
    });
  });

  // 检查特定字段
  const targetFields = ['workLocation', 'workAddress', 'costCenter', 'employmentRelation', 'status', 'position'];
  console.log('\n=== 检查目标字段 ===');
  targetFields.forEach(target => {
    const found = allFields.find(f => f.fieldCode === target);
    if (found) {
      console.log(`✓ ${target}: ${found.fieldName} (必填: ${found.isRequired})`);
    } else {
      console.log(`✗ ${target}: 未配置`);
    }
  });
}

checkAllFields()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
