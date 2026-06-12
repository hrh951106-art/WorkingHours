import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseProductionHierarchyMapping() {
  console.log('=== 生产环境层级映射问题诊断 ===\n');

  // 1. 检查激活的页签
  console.log('1. 检查激活的员工信息页签');
  const activeTabs = await prisma.employeeInfoTab.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { sort: 'asc' },
  });
  console.log(`激活的页签数量: ${activeTabs.length}`);
  if (activeTabs.length === 0) {
    console.log('  ⚠️ 没有激活的页签！这会导致所有字段都无法选择。');
  } else {
    activeTabs.forEach(tab => {
      console.log(`  ✓ ${tab.code} (${tab.name}) - 排序: ${tab.sort}`);
    });
  }
  console.log('');

  // 2. 检查基本信息和工作信息页签是否存在
  console.log('2. 检查基本信息和工作信息页签');
  const basicInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'basic_info' },
  });
  const workInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'work_info' },
  });

  if (!basicInfoTab) {
    console.log('  ⚠️ 未找到基本信息页签 (basic_info)');
  } else {
    console.log(`  ${basicInfoTab.status === 'ACTIVE' ? '✓' : '✗'} 基本信息: ${basicInfoTab.name} - 状态: ${basicInfoTab.status}`);
  }

  if (!workInfoTab) {
    console.log('  ⚠️ 未找到工作信息页签 (work_info)');
  } else {
    console.log(`  ${workInfoTab.status === 'ACTIVE' ? '✓' : '✗'} 工作信息: ${workInfoTab.name} - 状态: ${workInfoTab.status}`);
  }
  console.log('');

  // 3. 检查常见的系统内置下拉字段是否配置在页签中
  console.log('3. 检查常见系统内置下拉字段是否配置在页签中');
  const commonSystemFields = [
    'gender',        // 性别
    'maritalStatus',  // 婚姻状况
    'politicalStatus', // 政治面貌
    'employeeType',  // 员工类型
    'position',      // 岗位
    'jobLevel',      // 职级
    'workStatus',    // 工作状态
  ];

  for (const fieldCode of commonSystemFields) {
    const field = await prisma.employeeInfoTabField.findFirst({
      where: { fieldCode },
      include: {
        tab: {
          select: {
            code: true,
            name: true,
            status: true,
          },
        },
        dataSource: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });

    if (!field) {
      console.log(`  ✗ ${fieldCode}: 未配置在任何页签中`);
    } else {
      const hasActiveTab = field.tab.status === 'ACTIVE';
      const hasDataSource = field.dataSourceId !== null;
      console.log(`  ${hasActiveTab && hasDataSource ? '✓' : '✗'} ${fieldCode} (${field.fieldName})`);
      console.log(`      页签: ${field.tab.name} (${field.tab.code}) - 状态: ${field.tab.status}`);
      console.log(`      数据源: ${hasDataSource ? field.dataSource?.name : '未配置'}`);
      if (!hasActiveTab) {
        console.log(`      ⚠️ 问题：页签未激活`);
      }
      if (!hasDataSource) {
        console.log(`      ⚠️ 问题：未关联数据源`);
      }
    }
  }
  console.log('');

  // 4. 检查系统内置数据源是否存在且有选项
  console.log('4. 检查系统内置数据源');
  const systemDataSourceCodes = [
    'GENDER',
    'MARITAL_STATUS',
    'POLITICAL_STATUS',
    'EMPLOYEE_TYPE',
    'POSITION',
    'JOB_LEVEL',
    'WORK_STATUS',
  ];

  for (const dsCode of systemDataSourceCodes) {
    const dataSource = await prisma.dataSource.findFirst({
      where: { code: dsCode },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { sort: 'asc' },
        },
      },
    });

    if (!dataSource) {
      console.log(`  ✗ ${dsCode}: 数据源不存在`);
    } else {
      const hasActiveOptions = dataSource.options && dataSource.options.length > 0;
      console.log(`  ${dataSource.status === 'ACTIVE' && hasActiveOptions ? '✓' : '✗'} ${dsCode} (${dataSource.name})`);
      console.log(`      状态: ${dataSource.status}`);
      console.log(`      选项数: ${hasActiveOptions ? dataSource.options.length : 0}`);
      if (dataSource.status !== 'ACTIVE') {
        console.log(`      ⚠️ 问题：数据源未激活`);
      }
      if (!hasActiveOptions) {
        console.log(`      ⚠️ 问题：没有激活的选项`);
      }
    }
  }
  console.log('');

  // 5. 模拟 getEmployeeInfoConfigs 查询
  console.log('5. 模拟后端接口查询（getEmployeeInfoConfigs）');
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
      optionsCount: field.dataSource.options.length,
    }))
    .filter((config) => config.optionsCount > 0);

  console.log(`经过选项过滤后的最终字段数: ${tabFieldConfigs.length}`);

  if (tabFieldConfigs.length > 0) {
    console.log('\n可用于层级映射的字段:');
    tabFieldConfigs.forEach(config => {
      console.log(`  ✓ ${config.field} (${config.name}) [${config.isSystem ? '系统' : '自定义'}]`);
      console.log(`    页签: ${config.tabName} (${config.tabCode})`);
      console.log(`    选项数: ${config.optionsCount}`);
    });
  } else {
    console.log('\n  ❌ 没有找到可用于层级映射的字段！');
    console.log('  可能的问题:');
    console.log('    1. 系统内置字段没有添加到基本信息或工作信息页签');
    console.log('    2. 系统内置字段没有关联数据源');
    console.log('    3. 基本信息或工作信息页签未激活');
    console.log('    4. 数据源未激活或没有选项数据');
    console.log('    5. 数据源选项未激活（isActive=false）');
  }
  console.log('');

  // 6. 检查是否有配置自定义字段
  console.log('6. 检查自定义字段配置');
  const customFields = await prisma.customField.findMany({
    where: {
      status: 'ACTIVE',
      dataSourceId: { not: null },
    },
    include: {
      dataSource: {
        include: {
          options: {
            where: { isActive: true },
          },
        },
      },
    },
  });

  console.log(`自定义字段数量: ${customFields.length}`);
  if (customFields.length > 0) {
    customFields.forEach(field => {
      const hasActiveOptions = field.dataSource?.options && field.dataSource.options.length > 0;
      console.log(`  ${hasActiveOptions ? '✓' : '✗'} ${field.code} (${field.name})`);
      console.log(`      数据源: ${field.dataSource?.code || '未配置'}`);
      console.log(`      选项数: ${hasActiveOptions ? field.dataSource.options.length : 0}`);
    });
  }
  console.log('');

  // 7. 总结诊断结果
  console.log('=== 诊断总结 ===');
  const issues: string[] = [];

  if (activeTabs.length === 0) {
    issues.push('❌ 没有激活的页签');
  }

  if (!basicInfoTab || basicInfoTab.status !== 'ACTIVE') {
    issues.push('❌ 基本信息页签未激活或不存在');
  }

  if (!workInfoTab || workInfoTab.status !== 'ACTIVE') {
    issues.push('❌ 工作信息页签未激活或不存在');
  }

  if (tabFieldConfigs.length === 0) {
    issues.push('❌ 没有可用于层级映射的字段（可能需要初始化系统数据）');
  }

  if (issues.length === 0) {
    console.log('✓ 未发现明显问题，接口应该可以正常返回字段数据');
    console.log(`✓ 预期返回字段数: ${tabFieldConfigs.length} 个`);
  } else {
    console.log('发现以下问题:');
    issues.forEach(issue => console.log(`  ${issue}`));
    console.log('\n建议解决方案:');
    if (activeTabs.length === 0 || !basicInfoTab || !workInfoTab) {
      console.log('  1. 运行系统初始化脚本，创建基本信息和工作信息页签');
    }
    if (tabFieldConfigs.length === 0) {
      console.log('  2. 运行字段初始化脚本，将系统内置字段添加到页签中');
      console.log('  3. 运行数据源初始化脚本，创建系统内置数据源和选项');
      console.log('  4. 检查数据源选项的isActive字段是否为true');
    }
  }
  console.log('');

  console.log('=== 诊断完成 ===');
}

diagnoseProductionHierarchyMapping()
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
