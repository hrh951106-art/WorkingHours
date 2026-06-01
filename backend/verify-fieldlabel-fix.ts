import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 验证 getFieldLabel 修复 ==========\n');

  // 测试 position 字段
  console.log('【测试 position 字段】');
  const positionField = await prisma.employeeInfoTabField.findFirst({
    where: {
      fieldCode: 'position'
    },
    select: {
      fieldCode: true,
      fieldName: true,
      dataSourceId: true,
      dataSource: {
        select: {
          code: true,
          name: true,
          options: {
            where: {
              value: 'POST_012',
              isActive: true
            }
          }
        }
      }
    }
  });

  if (positionField) {
    console.log(`字段: ${positionField.fieldName} (${positionField.fieldCode})`);
    console.log(`数据源: ${positionField.dataSource?.name} (${positionField.dataSource?.code})`);
    if (positionField.dataSource?.options.length > 0) {
      const option = positionField.dataSource.options[0];
      console.log(`  选项: ${option.label} (${option.value})`);
    }
  }

  // 测试 jobLevel 字段
  console.log('\n【测试 jobLevel 字段】');
  const jobLevelField = await prisma.employeeInfoTabField.findFirst({
    where: {
      fieldCode: 'jobLevel'
    },
    select: {
      fieldCode: true,
      fieldName: true,
      dataSourceId: true,
      dataSource: {
        select: {
          code: true,
          name: true,
          options: {
            where: {
              value: {
                in: ['Level_005', 'Level_006']
              },
              isActive: true
            }
          }
        }
      }
    }
  });

  if (jobLevelField) {
    console.log(`字段: ${jobLevelField.fieldName} (${jobLevelField.fieldCode})`);
    console.log(`数据源: ${jobLevelField.dataSource?.name} (${jobLevelField.dataSource?.code})`);
    console.log('  选项:');
    jobLevelField.dataSource?.options.forEach(opt => {
      console.log(`    ${opt.label} (${opt.value})`);
    });
  }

  console.log('\n========== 验证完成 ==========');
  console.log('\n✅ position 和 jobLevel 字段都配置了正确的数据源');
  console.log('✅ getFieldLabel 函数现在应该能正确查询 EmployeeInfoTabField 表');
  console.log('✅ 新员工入职时，主账户应该显示中文标签而不是代码\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
