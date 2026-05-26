import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDataSources() {
  console.log('========== 检查当前数据源配置 ==========\n');

  // 1. 查找职位和职级的数据源
  const positionDataSource = await prisma.dataSource.findFirst({
    where: { code: 'POSITION_TITLE' },
    include: { options: true },
  });

  const jobLevelDataSource = await prisma.dataSource.findFirst({
    where: { code: 'JOB_LEVEL' },
    include: { options: true },
  });

  console.log('1. 当前职位数据源 (POSITION_TITLE):');
  if (positionDataSource) {
    console.log(`   ID: ${positionDataSource.id}`);
    console.log(`   名称: ${positionDataSource.name}`);
    console.log(`   选项数量: ${positionDataSource.options.length}`);
    console.log(`   选项列表:`);
    positionDataSource.options.forEach(opt => {
      console.log(`     - ${opt.label} (${opt.value})`);
    });
  } else {
    console.log('   未找到');
  }

  console.log('\n2. 当前职级数据源 (JOB_LEVEL):');
  if (jobLevelDataSource) {
    console.log(`   ID: ${jobLevelDataSource.id}`);
    console.log(`   名称: ${jobLevelDataSource.name}`);
    console.log(`   选项数量: ${jobLevelDataSource.options.length}`);
    console.log(`   选项列表:`);
    jobLevelDataSource.options.forEach(opt => {
      console.log(`     - ${opt.label} (${opt.value})`);
    });
  } else {
    console.log('   未找到');
  }

  // 3. 检查字段配置
  console.log('\n3. 检查工作信息页签中的职位和职级字段...');

  const workInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'work_info' },
    include: {
      groups: {
        include: {
          fields: {
            where: {
              OR: [
                { fieldCode: 'position' },
                { fieldCode: 'jobLevel' },
              ],
            },
          },
        },
      },
    },
  });

  if (workInfoTab) {
    workInfoTab.groups.forEach(group => {
      group.fields.forEach(field => {
        console.log(`\n   ${field.fieldName} (${field.fieldCode}):`);
        console.log(`   - ID: ${field.id}`);
        console.log(`   - fieldType: ${field.fieldType}`);
        console.log(`   - isSystem: ${field.isSystem}`);
        console.log(`   - dataSourceId: ${field.dataSourceId}`);
      });
    });
  }
}

checkDataSources()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
