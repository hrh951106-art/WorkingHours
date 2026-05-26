import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyApiData() {
  console.log('========== 验证前端API数据格式 ==========\n');

  // 模拟 getTabsForDisplay 的逻辑
  const workInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'work_info' },
    include: {
      groups: {
        where: { status: 'ACTIVE' },
        orderBy: { sort: 'asc' },
        include: {
          fields: {
            orderBy: { sort: 'asc' },
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
          },
        },
      },
    },
  });

  if (!workInfoTab) {
    console.error('未找到工作信息页签');
    return;
  }

  console.log('工作信息页签字段详情:\n');

  for (const group of workInfoTab.groups) {
    const positionField = group.fields.find(f => f.fieldCode === 'position');
    const jobLevelField = group.fields.find(f => f.fieldCode === 'jobLevel');

    if (positionField || jobLevelField) {
      console.log(`分组: ${group.name}`);

      if (positionField) {
        console.log(`  字段: ${positionField.fieldName} (${positionField.fieldCode})`);
        console.log(`    - fieldType: ${positionField.fieldType}`);
        console.log(`    - isSystem: ${positionField.isSystem}`);
        console.log(`    - isRequired: ${positionField.isRequired}`);
        console.log(`    - isHidden: ${positionField.isHidden}`);
        console.log(`    - dataSource: ${positionField.dataSource?.name || 'null'}`);

        if (positionField.dataSource) {
          console.log(`    - 选项数量: ${positionField.dataSource.options.length}`);
          console.log(`    - 选项列表:`);
          positionField.dataSource.options.forEach(opt => {
            console.log(`      ${opt.sort + 1}. ${opt.label} (${opt.value})`);
          });
        }
        console.log('');
      }

      if (jobLevelField) {
        console.log(`  字段: ${jobLevelField.fieldName} (${jobLevelField.fieldCode})`);
        console.log(`    - fieldType: ${jobLevelField.fieldType}`);
        console.log(`    - isSystem: ${jobLevelField.isSystem}`);
        console.log(`    - isRequired: ${jobLevelField.isRequired}`);
        console.log(`    - isHidden: ${jobLevelField.isHidden}`);
        console.log(`    - dataSource: ${jobLevelField.dataSource?.name || 'null'}`);

        if (jobLevelField.dataSource) {
          console.log(`    - 选项数量: ${jobLevelField.dataSource.options.length}`);
          console.log(`    - 选项列表:`);
          jobLevelField.dataSource.options.forEach(opt => {
            console.log(`      ${opt.sort + 1}. ${opt.label} (${opt.value})`);
          });
        }
        console.log('');
      }
    }
  }

  // 验证前端渲染逻辑
  console.log('========== 前端渲染测试 ==========\n');

  const allFields = workInfoTab.groups.flatMap(g => g.fields);
  const positionField = allFields.find(f => f.fieldCode === 'position');
  const jobLevelField = allFields.find(f => f.fieldCode === 'jobLevel');

  console.log('岗位字段:');
  console.log(`  - isSystem: ${positionField.isSystem}`);
  console.log(`  - isHidden: ${positionField.isHidden}`);
  console.log(`  - 前端会渲染: ${positionField.isSystem && !positionField.isHidden ? '✓ 是' : '✗ 否'}`);

  console.log('\n职级字段:');
  console.log(`  - isSystem: ${jobLevelField.isSystem}`);
  console.log(`  - isHidden: ${jobLevelField.isHidden}`);
  console.log(`  - 前端会渲染: ${jobLevelField.isSystem && !jobLevelField.isHidden ? '✓ 是' : '✗ 否'}`);

  console.log('\n✓ 验证完成！');
}

verifyApiData()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('验证失败:', error);
    process.exit(1);
  });
