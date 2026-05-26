import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllIssues() {
  console.log('========== 检查所有问题 ==========\n');

  // 1. 检查 position 字段的配置
  console.log('1. 检查 position 字段配置:\n');

  const positionField = await prisma.employeeInfoTabField.findFirst({
    where: { fieldCode: 'position' },
  });

  if (positionField) {
    console.log(`字段: ${positionField.fieldName} (${positionField.fieldCode})`);
    console.log(`  - fieldType: ${positionField.fieldType}`);
    console.log(`  - isSystem: ${positionField.isSystem}`);
    console.log(`  - dataSourceId: ${positionField.dataSourceId}`);

    if (positionField.dataSourceId) {
      const dataSource = await prisma.dataSource.findUnique({
        where: { id: positionField.dataSourceId },
        include: { options: true },
      });
      if (dataSource) {
        console.log(`  - dataSource.name: ${dataSource.name}`);
        console.log(`  - dataSource.code: ${dataSource.code}`);
        console.log(`  - dataSource.id: ${dataSource.id}`);
        console.log(`  - 选项数量: ${dataSource.options?.length || 0}`);
        if (dataSource.options && dataSource.options.length > 0) {
          console.log(`  - 选项列表:`);
          dataSource.options.forEach(opt => {
            console.log(`    * ${opt.label} (${opt.value})`);
          });
        }
      }
    } else {
      console.log(`  - dataSource: null (问题！字段未关联数据源)`);
    }
  }

  // 2. 检查所有 POSITION 相关数据源
  console.log('\n2. 检查所有 POSITION 相关数据源:\n');

  const positionDataSources = await prisma.dataSource.findMany({
    where: {
      OR: [
        { code: 'POSITION' },
        { code: 'POSITION_TITLE' },
        { code: 'JOB_POST' },
      ],
    },
    include: { options: true },
  });

  positionDataSources.forEach(ds => {
    console.log(`数据源: ${ds.name} (${ds.code})`);
    console.log(`  ID: ${ds.id}`);
    console.log(`  选项数量: ${ds.options.length}`);
    console.log('');
  });

  // 3. 检查 COST_CENTER 和 EMPLOYMENT_RELATION 数据源
  console.log('3. 检查 COST_CENTER 和 EMPLOYMENT_RELATION 数据源:\n');

  const costCenterDS = await prisma.dataSource.findFirst({
    where: { code: 'COST_CENTER' },
    include: { options: true },
  });

  const employmentRelationDS = await prisma.dataSource.findFirst({
    where: { code: 'EMPLOYMENT_RELATION' },
    include: { options: true },
  });

  console.log(`COST_CENTER 数据源:`);
  if (costCenterDS) {
    console.log(`  名称: ${costCenterDS.name}`);
    console.log(`  ID: ${costCenterDS.id}`);
    console.log(`  选项数量: ${costCenterDS.options.length}`);
    if (costCenterDS.options.length > 0) {
      console.log(`  选项列表:`);
      costCenterDS.options.forEach(opt => {
        console.log(`    - ${opt.label} (${opt.value})`);
      });
    }
  } else {
    console.log(`  未找到`);
  }

  console.log(`\nEMPLOYMENT_RELATION 数据源:`);
  if (employmentRelationDS) {
    console.log(`  名称: ${employmentRelationDS.name}`);
    console.log(`  ID: ${employmentRelationDS.id}`);
    console.log(`  选项数量: ${employmentRelationDS.options.length}`);
    if (employmentRelationDS.options.length > 0) {
      console.log(`  选项列表:`);
      employmentRelationDS.options.forEach(opt => {
        console.log(`    - ${opt.label} (${opt.value})`);
      });
    }
  } else {
    console.log(`  未找到`);
  }

  // 4. 检查所有字段中是否有 costCenter 和 employmentRelation
  console.log('\n4. 检查所有页签中是否有 costCenter 和 employmentRelation 字段:\n');

  const allTabs = await prisma.employeeInfoTab.findMany({
    where: { status: 'ACTIVE' },
    include: {
      groups: {
        include: {
          fields: true,
        },
      },
      fields: true,
    },
  });

  let foundCostCenter = false;
  let foundEmploymentRelation = false;

  for (const tab of allTabs) {
    // 检查分组内的字段
    for (const group of tab.groups) {
      for (const field of group.fields) {
        if (field.fieldCode === 'costCenter') {
          console.log(`✓ 找到 costCenter 字段:`);
          console.log(`  页签: ${tab.name} (${tab.code})`);
          console.log(`  分组: ${group.name}`);
          console.log(`  字段: ${field.fieldName} (${field.fieldCode})`);
          console.log(`  fieldType: ${field.fieldType}`);
          console.log(`  dataSourceId: ${field.dataSourceId}`);
          console.log(`  isHidden: ${field.isHidden}`);
          console.log('');
          foundCostCenter = true;
        }
        if (field.fieldCode === 'employmentRelation') {
          console.log(`✓ 找到 employmentRelation 字段:`);
          console.log(`  页签: ${tab.name} (${tab.code})`);
          console.log(`  分组: ${group.name}`);
          console.log(`  字段: ${field.fieldName} (${field.fieldCode})`);
          console.log(`  fieldType: ${field.fieldType}`);
          console.log(`  dataSourceId: ${field.dataSourceId}`);
          console.log(`  isHidden: ${field.isHidden}`);
          console.log('');
          foundEmploymentRelation = true;
        }
      }
    }

    // 检查未分组的字段
    for (const field of tab.fields) {
      if (field.fieldCode === 'costCenter' && !foundCostCenter) {
        console.log(`✓ 找到未分组的 costCenter 字段:`);
        console.log(`  页签: ${tab.name} (${tab.code})`);
        console.log(`  字段: ${field.fieldName} (${field.fieldCode})`);
        console.log('');
        foundCostCenter = true;
      }
      if (field.fieldCode === 'employmentRelation' && !foundEmploymentRelation) {
        console.log(`✓ 找到未分组的 employmentRelation 字段:`);
        console.log(`  页签: ${tab.name} (${tab.code})`);
        console.log(`  字段: ${field.fieldName} (${field.fieldCode})`);
        console.log('');
        foundEmploymentRelation = true;
      }
    }
  }

  if (!foundCostCenter) {
    console.log(`⚠️  未找到 costCenter 字段`);
  }
  if (!foundEmploymentRelation) {
    console.log(`⚠️  未找到 employmentRelation 字段`);
  }
}

checkAllIssues()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
