import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkIssues() {
  console.log('========== 检查问题 ==========\n');

  // 1. 检查 position 字段的配置
  console.log('1. 检查 position 字段配置:\n');

  const positionField = await prisma.employeeInfoTabField.findFirst({
    where: { fieldCode: 'position' },
    include: { dataSource: true },
  });

  if (positionField) {
    console.log(`字段: ${positionField.fieldName} (${positionField.fieldCode})`);
    console.log(`  - fieldType: ${positionField.fieldType}`);
    console.log(`  - isSystem: ${positionField.isSystem}`);
    console.log(`  - dataSourceId: ${positionField.dataSourceId}`);
    if (positionField.dataSource) {
      console.log(`  - dataSource.name: ${positionField.dataSource.name}`);
      console.log(`  - dataSource.code: ${positionField.dataSource.code}`);
      console.log(`  - dataSource.id: ${positionField.dataSource.id}`);
      console.log(`  - 选项数量: ${positionField.dataSource.options?.length || 0}`);
    } else {
      console.log(`  - dataSource: null (这就是问题所在！)`);
    }
  }

  // 2. 检查所有 POSITION 数据源
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

  // 4. 检查所有工作信息页签的字段
  console.log('\n4. 检查工作信息页签所有字段:\n');

  const workInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'work_info' },
    include: {
      groups: {
        include: {
          fields: {
            include: { dataSource: true },
          },
        },
      },
    },
  });

  if (workInfoTab) {
    console.log(`页签: ${workInfoTab.name}`);
    workInfoTab.groups.forEach(group => {
      console.log(`\n  分组: ${group.name}`);
      group.fields.forEach(field => {
        const dsInfo = field.dataSource
          ? `${field.dataSource.name} (${field.dataSource.code}, ID: ${field.dataSource.id})`
          : '无数据源';
        console.log(`    - ${field.fieldName} (${field.fieldCode})`);
        console.log(`      fieldType: ${field.fieldType}`);
        console.log(`      dataSource: ${dsInfo}`);
      });
    });
  }

  // 5. 检查基本信息页签是否有这两个字段
  console.log('\n5. 检查基本信息页签是否有相关字段:\n');

  const basicInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'basic_info' },
    include: {
      groups: {
        include: {
          fields: {
            include: { dataSource: true },
          },
        },
      },
    },
  });

  if (basicInfoTab) {
    console.log(`页签: ${basicInfoTab.name}`);
    basicInfoTab.groups.forEach(group => {
      const hasRelatedFields = group.fields.some(f =>
        f.fieldCode === 'costCenter' || f.fieldCode === 'employmentRelation'
      );
      if (hasRelatedFields) {
        console.log(`\n  分组: ${group.name}`);
        group.fields.forEach(field => {
          if (field.fieldCode === 'costCenter' || field.fieldCode === 'employmentRelation') {
            const dsInfo = field.dataSource
              ? `${field.dataSource.name} (${field.dataSource.code}, ID: ${field.dataSource.id})`
              : '无数据源';
            console.log(`    - ${field.fieldName} (${field.fieldCode})`);
            console.log(`      fieldType: ${field.fieldType}`);
            console.log(`      dataSource: ${dsInfo}`);
          }
        });
      }
    });
  }
}

checkIssues()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
