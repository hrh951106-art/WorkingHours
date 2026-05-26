import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyWorkInfoTab() {
  console.log('========== 验证工作信息页签配置 ==========\n');

  const workInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'work_info' },
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
    },
  });

  if (!workInfoTab) {
    console.error('未找到工作信息页签');
    return;
  }

  console.log(`页签: ${workInfoTab.name}`);
  console.log(`编码: ${workInfoTab.code}`);
  console.log(`状态: ${workInfoTab.status}`);
  console.log(`分组数量: ${workInfoTab.groups.length}\n`);

  for (const group of workInfoTab.groups) {
    console.log(`分组: ${group.name}`);
    console.log(`  编码: ${group.code}`);
    console.log(`  排序: ${group.sort}`);
    console.log(`  状态: ${group.status}`);
    console.log(`  字段数量: ${group.fields.length}\n`);

    console.log('  字段列表:');
    for (const field of group.fields) {
      const status = field.isHidden ? '隐藏' : '可见';
      const required = field.isRequired ? '必填' : '可选';
      const type = field.fieldType;
      console.log(`    ${field.sort}. ${field.fieldName} (${field.fieldCode})`);
      console.log(`       类型: ${type} | 状态: ${status} | ${required}`);
    }
    console.log('');
  }

  // 检查是否所有字段都已正确分配
  const expectedFields = [
    'employeeType',
    'workLocation',
    'workAddress',
    'entryDate',
    'status',
    'orgId',
    'position',
    'jobLevel',
    'probationStart',
    'probationEnd',
    'probationMonths',
    'regularDate',
    'hireDate',
    'workYears',
  ];

  const allFields = workInfoTab.groups.flatMap(g => g.fields.map(f => f.fieldCode));
  const missingFields = expectedFields.filter(code => !allFields.includes(code));
  const extraFields = allFields.filter(code => !expectedFields.includes(code));

  console.log('========== 字段完整性检查 ==========\n');
  console.log(`预期字段数量: ${expectedFields.length}`);
  console.log(`实际字段数量: ${allFields.length}`);

  if (missingFields.length > 0) {
    console.log(`\n⚠️  缺失字段: ${missingFields.join(', ')}`);
  }

  if (extraFields.length > 0) {
    console.log(`\n⚠️  额外字段: ${extraFields.join(', ')}`);
  }

  if (missingFields.length === 0 && extraFields.length === 0) {
    console.log('\n✓ 所有字段都已正确分配！');
  }

  // 测试前端渲染逻辑
  console.log('\n========== 前端渲染测试 ==========\n');

  const systemFields = workInfoTab.groups.flatMap(g =>
    g.fields.filter(f => f.isSystem && !f.isHidden)
  );

  const customFields = workInfoTab.groups.flatMap(g =>
    g.fields.filter(f => f.fieldType === 'CUSTOM' && !f.isHidden)
  );

  console.log(`系统字段: ${systemFields.length} 个`);
  console.log(`自定义字段: ${customFields.length} 个`);
  console.log(`总计可见字段: ${systemFields.length + customFields.length} 个`);

  if (systemFields.length + customFields.length === 0) {
    console.log('\n⚠️  警告：没有可见字段，前端将无法显示任何内容！');
  } else {
    console.log('\n✓ 前端应该能够正确显示这些字段');
  }
}

verifyWorkInfoTab()
  .then(() => {
    console.log('\n✓ 验证完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('验证失败:', error);
    process.exit(1);
  });
