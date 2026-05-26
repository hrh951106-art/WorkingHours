import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function finalVerification() {
  console.log('========== 最终验证 ==========\n');

  // 1. 验证 JOB_POST 已删除
  console.log('1. 验证 JOB_POST 数据源已删除...');
  const jobPostDS = await prisma.dataSource.findFirst({
    where: { code: 'JOB_POST' },
  });

  if (jobPostDS) {
    console.log('  ✗ JOB_POST 数据源仍然存在（ID: ' + jobPostDS.id + '）');
  } else {
    console.log('  ✓ JOB_POST 数据源已删除');
  }

  // 2. 验证 position 字段使用 POSITION 数据源
  console.log('\n2. 验证 position 字段使用 POSITION 数据源...');

  const positionField = await prisma.employeeInfoTabField.findFirst({
    where: { fieldCode: 'position' },
  });

  if (positionField && positionField.dataSourceId) {
    const dataSource = await prisma.dataSource.findUnique({
      where: { id: positionField.dataSourceId },
    });

    if (dataSource && dataSource.code === 'POSITION') {
      console.log('  ✓ position 字段正确使用 POSITION 数据源');
      console.log(`    数据源ID: ${dataSource.id}`);
      console.log(`    选项数量: ${await prisma.dataSourceOption.count({ where: { dataSourceId: dataSource.id } })}`);
    } else {
      console.log('  ✗ position 字段未使用 POSITION 数据源');
      console.log(`    使用的数据源: ${dataSource ? dataSource.code : 'null'}`);
    }
  } else {
    console.log('  ✗ position 字段未关联数据源');
  }

  // 3. 验证成本中心和工作关系字段已添加
  console.log('\n3. 验证成本中心和工作关系字段已添加...');

  const costCenterField = await prisma.employeeInfoTabField.findFirst({
    where: { fieldCode: 'costCenter' },
    include: { dataSource: true },
  });

  const employmentRelationField = await prisma.employeeInfoTabField.findFirst({
    where: { fieldCode: 'employmentRelation' },
    include: { dataSource: true },
  });

  if (costCenterField) {
    console.log('  ✓ 成本中心字段已添加');
    console.log(`    字段ID: ${costCenterField.id}`);
    console.log(`    字段名称: ${costCenterField.fieldName}`);
    console.log(`    数据源: ${costCenterField.dataSource ? costCenterField.dataSource.name : '未关联'}`);
    console.log(`    是否隐藏: ${costCenterField.isHidden}`);
  } else {
    console.log('  ✗ 成本中心字段未找到');
  }

  if (employmentRelationField) {
    console.log('  ✓ 工作关系字段已添加');
    console.log(`    字段ID: ${employmentRelationField.id}`);
    console.log(`    字段名称: ${employmentRelationField.fieldName}`);
    console.log(`    数据源: ${employmentRelationField.dataSource ? employmentRelationField.dataSource.name : '未关联'}`);
    console.log(`    是否隐藏: ${employmentRelationField.isHidden}`);
  } else {
    console.log('  ✗ 工作关系字段未找到');
  }

  // 4. 验证工作信息页签的字段配置
  console.log('\n4. 验证工作信息页签的字段配置...');

  const workInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'work_info' },
    include: {
      groups: {
        orderBy: { sort: 'asc' },
        include: {
          fields: {
            orderBy: { sort: 'asc' },
            include: { dataSource: true },
          },
        },
      },
    },
  });

  if (workInfoTab) {
    console.log(`  工作信息页签 (ID: ${workInfoTab.id})`);
    console.log(`  分组数量: ${workInfoTab.groups.length}\n`);

    for (const group of workInfoTab.groups) {
      console.log(`  分组: ${group.name}`);
      console.log(`    字段数量: ${group.fields.length}`);

      const visibleFields = group.fields.filter(f => !f.isHidden);

      if (visibleFields.length === 0) {
        console.log(`    ⚠️  警告：所有字段都是隐藏的`);
      } else {
        console.log(`    可见字段: ${visibleFields.length} 个`);
      }

      // 显示前5个字段作为示例
      visibleFields.slice(0, 5).forEach(field => {
        const dsInfo = field.dataSource ? field.dataSource.name : '无数据源';
        console.log(`      ${field.sort}. ${field.fieldName} (${dsInfo})`);
      });

      if (visibleFields.length > 5) {
        console.log(`      ... 还有 ${visibleFields.length - 5} 个字段`);
      }

      console.log('');
    }
  }

  // 5. 总结
  console.log('========== 总结 ==========\n');

  const allChecks = [
    { name: 'JOB_POST 数据源已删除', passed: !jobPostDS },
    { name: 'position 使用 POSITION 数据源', passed: positionField?.dataSourceId !== null },
    { name: '成本中心字段已添加', passed: costCenterField !== null },
    { name: '工作关系字段已添加', passed: employmentRelationField !== null },
  ];

  let allPassed = true;
  allChecks.forEach(check => {
    const status = check.passed ? '✓' : '✗';
    console.log(`${status} ${check.name}`);
    if (!check.passed) allPassed = false;
  });

  if (allPassed) {
    console.log('\n✓ 所有检查通过！');
    console.log('\n建议操作：');
    console.log('1. 刷新浏览器或重启前端应用');
    console.log('2. 进入新增人员页面验证字段显示');
    console.log('3. 检查岗位下拉框是否包含11个选项');
    console.log('4. 检查成本中心和工作关系字段是否显示');
  } else {
    console.log('\n✗ 部分检查未通过，请查看上述详情');
  }
}

finalVerification()
  .then(() => {
    console.log('\n验证完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('验证失败:', error);
    process.exit(1);
  });
