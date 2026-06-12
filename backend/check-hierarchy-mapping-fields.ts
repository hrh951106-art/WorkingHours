import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkHierarchyMappingFields() {
  console.log('=== 检查劳动力账户层级映射字段问题 ===\n');

  // 1. 检查激活的页签
  console.log('1. 检查激活的员工信息页签');
  const activeTabs = await prisma.employeeInfoTab.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { sort: 'asc' },
  });
  console.log(`激活的页签数量: ${activeTabs.length}`);
  activeTabs.forEach(tab => {
    console.log(`  - ${tab.code} (${tab.name})`);
  });
  console.log('');

  // 2. 检查基本信息页签的所有字段
  console.log('2. 检查基本信息页签的所有字段');
  const basicInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'basic_info' },
  });
  if (basicInfoTab) {
    const basicFields = await prisma.employeeInfoTabField.findMany({
      where: { tabId: basicInfoTab.id },
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
      orderBy: { sort: 'asc' },
    });
    console.log(`基本信息页签字段总数: ${basicFields.length}`);
    basicFields.forEach(field => {
      const hasDataSource = field.dataSourceId !== null;
      const hasOptions = field.dataSource?.options && field.dataSource.options.length > 0;
      console.log(`  - ${field.fieldCode} (${field.fieldName})`);
      console.log(`    系统字段: ${field.isSystem ? '是' : '否'}`);
      console.log(`    关联数据源: ${hasDataSource ? '是 (' + field.dataSource?.code + ')' : '否'}`);
      if (hasDataSource) {
        console.log(`    数据源选项数: ${hasOptions ? field.dataSource?.options.length : 0}`);
        if (hasOptions) {
          console.log(`    选项示例: ${field.dataSource?.options.slice(0, 2).map(o => o.label).join(', ')}...`);
        }
      }
    });
  } else {
    console.log('  ✗ 未找到基本信息页签');
  }
  console.log('');

  // 3. 检查工作信息页签的所有字段
  console.log('3. 检查工作信息页签的所有字段');
  const workInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'work_info' },
  });
  if (workInfoTab) {
    const workFields = await prisma.employeeInfoTabField.findMany({
      where: { tabId: workInfoTab.id },
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
      orderBy: { sort: 'asc' },
    });
    console.log(`工作信息页签字段总数: ${workFields.length}`);
    workFields.forEach(field => {
      const hasDataSource = field.dataSourceId !== null;
      const hasOptions = field.dataSource?.options && field.dataSource.options.length > 0;
      console.log(`  - ${field.fieldCode} (${field.fieldName})`);
      console.log(`    系统字段: ${field.isSystem ? '是' : '否'}`);
      console.log(`    关联数据源: ${hasDataSource ? '是 (' + field.dataSource?.code + ')' : '否'}`);
      if (hasDataSource) {
        console.log(`    数据源选项数: ${hasOptions ? field.dataSource?.options.length : 0}`);
        if (hasOptions) {
          console.log(`    选项示例: ${field.dataSource?.options.slice(0, 2).map(o => o.label).join(', ')}...`);
        }
      }
    });
  } else {
    console.log('  ✗ 未找到工作信息页签');
  }
  console.log('');

  // 4. 模拟 getEmployeeInfoConfigs 查询（后端接口逻辑）
  console.log('4. 模拟后端接口查询（getEmployeeInfoConfigs）');
  const tabFields = await prisma.employeeInfoTabField.findMany({
    where: {
      dataSourceId: { not: null },
      tab: {
        status: 'ACTIVE',
      },
    },
    include: {
      dataSource: {
        include: {
          options: {
            where: { isActive: true },
            orderBy: { sort: 'asc' },
          },
        },
      },
      tab: {
        select: {
          code: true,
          name: true,
        },
      },
    },
    orderBy: [{ tab: { sort: 'asc' } }, { sort: 'asc' }],
  });

  console.log(`满足条件（dataSourceId不为null且页签激活）的字段数: ${tabFields.length}`);

  const tabFieldConfigs = tabFields
    .filter(
      (field) =>
        field.dataSource && field.dataSource.options && field.dataSource.options.length > 0,
    )
    .map((field) => ({
      field: field.fieldCode,
      name: field.fieldName,
      tabCode: field.tab.code,
      tabName: field.tab.name,
      isSystem: field.isSystem,
      options: field.dataSource.options.map((opt) => ({
        id: opt.id,
        name: opt.label,
        label: opt.label,
        value: opt.value,
        code: opt.value,
      })),
    }))
    .filter((config) => config.options.length > 0);

  console.log(`经过选项过滤后的最终字段数: ${tabFieldConfigs.length}`);
  if (tabFieldConfigs.length > 0) {
    console.log('\n可用于层级映射的字段:');
    tabFieldConfigs.forEach(config => {
      console.log(`  - ${config.field} (${config.name}) [${config.isSystem ? '系统' : '自定义'}]`);
      console.log(`    页签: ${config.tabName} (${config.tabCode})`);
      console.log(`    选项数: ${config.options.length}`);
      console.log(`    选项示例: ${config.options.slice(0, 3).map(o => o.name).join(', ')}${config.options.length > 3 ? '...' : ''}`);
    });
  } else {
    console.log('\n  ⚠️ 没有找到可用于层级映射的字段！');
    console.log('  可能的原因:');
    console.log('    1. 系统内置下拉字段没有关联数据源');
    console.log('    2. 自定义字段没有关联数据源');
    console.log('    3. 字段没有添加到基本信息或工作信息页签');
    console.log('    4. 数据源没有配置选项数据');
  }
  console.log('');

  // 5. 检查所有系统内置下拉数据源
  console.log('5. 检查所有系统内置下拉数据源');
  const systemDataSources = await prisma.dataSource.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { code: 'GENDER' },
        { code: 'MARITAL_STATUS' },
        { code: 'POLITICAL_STATUS' },
        { code: 'EMERGENCY_CONTACT_RELATION' },
        { code: 'EMPLOYEE_TYPE' },
        { code: 'WORK_STATUS' },
        { code: 'POSITION' },
        { code: 'JOB_LEVEL' },
      ],
    },
    include: {
      options: {
        where: { isActive: true },
        orderBy: { sort: 'asc' },
      },
    },
  });
  console.log(`系统内置数据源数量: ${systemDataSources.length}`);
  systemDataSources.forEach(ds => {
    console.log(`  - ${ds.code} (${ds.name})`);
    console.log(`    状态: ${ds.status}`);
    console.log(`    选项数: ${ds.options.length}`);
  });
  console.log('');

  // 6. 检查所有自定义字段
  console.log('6. 检查所有自定义字段');
  const customFields = await prisma.customField.findMany({
    where: { status: 'ACTIVE' },
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
  console.log(`自定义字段数量: ${customFields.length}`);
  customFields.forEach(field => {
    const hasDataSource = field.dataSourceId !== null;
    const hasOptions = field.dataSource?.options && field.dataSource.options.length > 0;
    console.log(`  - ${field.code} (${field.name})`);
    console.log(`    字段类型: ${field.mappingType}`);
    console.log(`    关联数据源: ${hasDataSource ? '是 (' + field.dataSource?.code + ')' : '否'}`);
    if (hasDataSource) {
      console.log(`    数据源选项数: ${hasOptions ? field.dataSource?.options.length : 0}`);
    }
  });
  console.log('');

  console.log('=== 诊断完成 ===');
}

checkHierarchyMappingFields()
  .then(() => {
    console.log('\n✓ 诊断脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ 诊断脚本执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
