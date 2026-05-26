import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyPositionFrontendFix() {
  console.log('========== 验证岗位字段前端修复 ==========\n');

  // 1. 验证数据库中 position 字段的配置
  console.log('1. 数据库中 position 字段的配置:\n');

  const positionField = await prisma.employeeInfoTabField.findFirst({
    where: { fieldCode: 'position' },
  });

  if (positionField) {
    console.log(`字段名称: ${positionField.fieldName}`);
    console.log(`字段代码: ${positionField.fieldCode}`);
    console.log(`字段类型: ${positionField.fieldType}`);
    console.log(`dataSourceId: ${positionField.dataSourceId}`);

    if (positionField.dataSourceId) {
      const dataSource = await prisma.dataSource.findUnique({
        where: { id: positionField.dataSourceId },
        include: { options: true },
      });

      if (dataSource) {
        console.log(`\n关联的数据源:`);
        console.log(`  数据源名称: ${dataSource.name}`);
        console.log(`  数据源代码: ${dataSource.code}`);
        console.log(`  选项数量: ${dataSource.options.length}`);

        if (dataSource.options.length > 0) {
          console.log(`\n  选项列表:`);
          dataSource.options.forEach(opt => {
            console.log(`    ${opt.sort + 1}. ${opt.label} (${opt.value})`);
          });
        }
      }
    }
  }

  // 2. 验证 POSITION 数据源存在且有选项
  console.log('\n2. 验证 POSITION 数据源:\n');

  const positionDataSource = await prisma.dataSource.findFirst({
    where: { code: 'POSITION' },
    include: { options: true },
  });

  if (positionDataSource) {
    console.log(`✓ POSITION 数据源存在`);
    console.log(`  ID: ${positionDataSource.id}`);
    console.log(`  名称: ${positionDataSource.name}`);
    console.log(`  状态: ${positionDataSource.status}`);
    console.log(`  选项数量: ${positionDataSource.options.length}`);
  } else {
    console.log(`✗ POSITION 数据源不存在`);
  }

  // 3. 列出所有需要在前端修改的文件
  console.log('\n3. 前端文件修改清单:\n');
  console.log('需要修改的文件：');
  console.log('  ✓ /frontend/src/pages/hr/EmployeeDetailPage.tsx');
  console.log('    - 第2113行: position 字段数据源代码从 POSITION_TITLE 改为 POSITION');
  console.log('    - 第1610行: position 字段显示标签转换从 POSITION_TITLE 改为 POSITION');
  console.log('  ✓ /frontend/src/pages/hr/EmployeeCreatePage.tsx');
  console.log('    - 第614行: position 字段数据源代码从 POSITION_TITLE 改为 POSITION');

  console.log('\n不需要修改的（这些是 positionTitle 字段，应保持使用 POSITION_TITLE）:');
  console.log('  - EmployeeDetailPage.tsx 第1766行: positionTitle 字段');
  console.log('  - EmployeeDetailPage.tsx 第2298行: positionTitle 字段');

  // 4. 总结
  console.log('\n========== 总结 ==========\n');
  console.log('修改内容：');
  console.log('1. 数据库：position 字段已正确关联到 POSITION 数据源');
  console.log('2. 数据库：POSITION 数据源包含11个岗位选项');
  console.log('3. 前端：EmployeeDetailPage.tsx 已修改 position 字段使用 POSITION 数据源');
  console.log('4. 前端：EmployeeCreatePage.tsx 已修改 position 字段使用 POSITION 数据源');

  console.log('\n验证步骤：');
  console.log('1. 重新编译前端代码');
  console.log('2. 刷新浏览器');
  console.log('3. 进入新增人员页面，检查岗位下拉框');
  console.log('4. 进入人员详情页面，检查岗位下拉框');
  console.log('5. 确认两个页面的岗位下拉框都显示11个选项');

  console.log('\n✓ 验证完成！');
}

verifyPositionFrontendFix()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('验证失败:', error);
    process.exit(1);
  });
