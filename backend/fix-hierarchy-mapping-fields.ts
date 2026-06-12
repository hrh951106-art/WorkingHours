import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixHierarchyMappingFields() {
  console.log('=== 修复劳动力账户层级映射字段配置 ===\n');

  // 字段与数据源的映射关系
  const fieldDataSourceMapping = [
    { fieldCode: 'gender', dataSourceCode: 'GENDER', fieldName: '性别' },
    { fieldCode: 'maritalStatus', dataSourceCode: 'MARITAL_STATUS', fieldName: '婚姻状况' },
    { fieldCode: 'politicalStatus', dataSourceCode: 'POLITICAL_STATUS', fieldName: '政治面貌' },
    { fieldCode: 'employeeType', dataSourceCode: 'EMPLOYEE_TYPE', fieldName: '员工类型' },
    { fieldCode: 'position', dataSourceCode: 'POSITION', fieldName: '岗位' },
    { fieldCode: 'jobLevel', dataSourceCode: 'JOB_LEVEL', fieldName: '职级' },
    { fieldCode: 'workStatus', dataSourceCode: 'WORK_STATUS', fieldName: '工作状态' },
    { fieldCode: 'emergencyRelation', dataSourceCode: 'EMERGENCY_CONTACT_RELATION', fieldName: '紧急联系人关系' },
  ];

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const mapping of fieldDataSourceMapping) {
    console.log(`处理字段: ${mapping.fieldCode} (${mapping.fieldName})`);

    try {
      // 1. 查找字段
      const field = await prisma.employeeInfoTabField.findFirst({
        where: { fieldCode: mapping.fieldCode },
        include: {
          tab: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      });

      if (!field) {
        console.log(`  ⚠️ 字段不存在于任何页签中，跳过`);
        skipCount++;
        console.log('');
        continue;
      }

      // 2. 检查是否已关联数据源
      if (field.dataSourceId) {
        const existingDataSource = await prisma.dataSource.findUnique({
          where: { id: field.dataSourceId },
          select: { code: true },
        });
        console.log(`  ✓ 已关联数据源: ${existingDataSource?.code}，跳过`);
        skipCount++;
        console.log('');
        continue;
      }

      // 3. 查找数据源
      const dataSource = await prisma.dataSource.findFirst({
        where: { code: mapping.dataSourceCode },
      });

      if (!dataSource) {
        console.log(`  ⚠️ 数据源 ${mapping.dataSourceCode} 不存在，跳过`);
        skipCount++;
        console.log('');
        continue;
      }

      // 4. 更新字段，关联数据源
      await prisma.employeeInfoTabField.update({
        where: { id: field.id },
        data: { dataSourceId: dataSource.id },
      });

      console.log(`  ✓ 成功关联数据源: ${dataSource.code} (${dataSource.name})`);
      console.log(`    页签: ${field.tab.name} (${field.tab.code})`);
      successCount++;
    } catch (error) {
      console.log(`  ✗ 关联失败:`, error);
      errorCount++;
    }
    console.log('');
  }

  console.log('=== 修复统计 ===');
  console.log(`成功: ${successCount} 个`);
  console.log(`跳过: ${skipCount} 个`);
  console.log(`失败: ${errorCount} 个`);
  console.log('');

  // 验证修复结果
  console.log('=== 验证修复结果 ===\n');

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

  const availableFields = tabFields.filter(
    (field) =>
      field.dataSource && field.dataSource.options && field.dataSource.options.length > 0,
  );

  console.log(`可用于层级映射的字段数: ${availableFields.length}\n`);

  if (availableFields.length > 0) {
    console.log('可用字段列表:');
    availableFields.forEach((field) => {
      console.log(`  ✓ ${field.fieldCode} (${field.fieldName})`);
      console.log(`    页签: ${field.tab.name}`);
      console.log(`    数据源: ${field.dataSource?.name}`);
      console.log(`    选项数: ${field.dataSource?.options.length}`);
      console.log('');
    });
  }

  // 检查缺失选项的数据源
  console.log('=== 检查缺失选项的数据源 ===\n');

  const dataSourcesWithoutOptions = await prisma.dataSource.findMany({
    where: {
      status: 'ACTIVE',
      code: {
        in: ['POLITICAL_STATUS', 'EMPLOYEE_TYPE'],
      },
    },
    include: {
      options: {
        where: { isActive: true },
      },
    },
  });

  for (const ds of dataSourcesWithoutOptions) {
    console.log(`数据源: ${ds.code} (${ds.name})`);
    console.log(`  激活选项数: ${ds.options.length}`);
    if (ds.options.length === 0) {
      console.log(`  ⚠️ 需要添加选项数据`);
      console.log(`  建议选项:`);

      if (ds.code === 'POLITICAL_STATUS') {
        console.log(`    1. 群众 (value: 1)`);
        console.log(`    2. 党员 (value: 2)`);
        console.log(`    3. 团员 (value: 3)`);
        console.log(`    4. 民主党派 (value: 4)`);
      } else if (ds.code === 'EMPLOYEE_TYPE') {
        console.log(`    1. 正式员工 (value: 1)`);
        console.log(`    2. 临时员工 (value: 2)`);
        console.log(`    3. 实习生 (value: 3)`);
        console.log(`    4. 劳务派遣 (value: 4)`);
      }
    }
    console.log('');
  }

  console.log('=== 修复完成 ===');

  if (availableFields.length === 0) {
    console.log('\n⚠️ 警告: 修复后仍然没有可用字段');
    console.log('可能需要:');
    console.log('  1. 为缺失选项的数据源添加选项数据');
    console.log('  2. 检查数据源选项的isActive字段是否为true');
  } else {
    console.log('\n✓ 修复成功！请重启后端服务并刷新前端页面验证。');
  }
}

fixHierarchyMappingFields()
  .then(() => {
    console.log('\n✓ 修复脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ 修复脚本执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
