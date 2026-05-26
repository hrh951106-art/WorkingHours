import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkJobPostDataSource() {
  console.log('========== 查找 JOB_POST 数据源使用情况 ==========\n');

  // 1. 查找 JOB_POST 数据源
  const jobPostDataSource = await prisma.dataSource.findFirst({
    where: { code: 'JOB_POST' },
    include: { options: true },
  });

  if (jobPostDataSource) {
    console.log('1. JOB_POST 数据源信息:');
    console.log(`   ID: ${jobPostDataSource.id}`);
    console.log(`   名称: ${jobPostDataSource.name}`);
    console.log(`   代码: ${jobPostDataSource.code}`);
    console.log(`   选项数量: ${jobPostDataSource.options.length}`);
    console.log(`   选项列表:`);
    jobPostDataSource.options.forEach(opt => {
      console.log(`     - ${opt.label} (${opt.value})`);
    });
    console.log('');
  } else {
    console.log('1. 未找到 JOB_POST 数据源\n');
  }

  // 2. 在所有页签字段中查找使用 JOB_POST 数据源的字段
  console.log('2. 查找使用 JOB_POST 数据源的字段...\n');

  const allTabs = await prisma.employeeInfoTab.findMany({
    where: { status: 'ACTIVE' },
    include: {
      groups: {
        where: { status: 'ACTIVE' },
        include: {
          fields: {
            include: {
              dataSource: true,
            },
          },
        },
      },
      fields: {
        where: { groupId: null },
        include: {
          dataSource: true,
        },
      },
    },
  });

  let found = false;

  for (const tab of allTabs) {
    // 检查分组内的字段
    for (const group of tab.groups) {
      for (const field of group.fields) {
        if (field.dataSource && field.dataSource.code === 'JOB_POST') {
          console.log(`✓ 找到字段使用 JOB_POST 数据源:`);
          console.log(`  页签: ${tab.name} (${tab.code})`);
          console.log(`  分组: ${group.name}`);
          console.log(`  字段: ${field.fieldName} (${field.fieldCode})`);
          console.log(`  fieldType: ${field.fieldType}`);
          console.log(`  isSystem: ${field.isSystem}`);
          console.log(`  isRequired: ${field.isRequired}`);
          console.log(`  isHidden: ${field.isHidden}`);
          console.log('');
          found = true;
        }
      }
    }

    // 检查未分组的字段
    for (const field of tab.fields) {
      if (field.dataSource && field.dataSource.code === 'JOB_POST') {
        console.log(`✓ 找到未分组字段使用 JOB_POST 数据源:`);
        console.log(`  页签: ${tab.name} (${tab.code})`);
        console.log(`  字段: ${field.fieldName} (${field.fieldCode})`);
        console.log('');
        found = true;
      }
    }
  }

  if (!found) {
    console.log('⚠️  没有找到任何字段使用 JOB_POST 数据源');
    console.log('\nJOB_POST 数据源可能未被使用，或者需要关联到某个字段。');
  }

  // 3. 列出所有工作信息页签的字段，帮助用户了解哪些字段可以使用这个数据源
  console.log('\n3. 工作信息页签当前所有字段:\n');

  const workInfoTab = allTabs.find(t => t.code === 'work_info');
  if (workInfoTab) {
    console.log(`页签: ${workInfoTab.name}`);
    for (const group of workInfoTab.groups) {
      console.log(`\n分组: ${group.name}`);
      for (const field of group.fields) {
        const dataSourceInfo = field.dataSource
          ? `数据源: ${field.dataSource.name} (${field.dataSource.code})`
          : '无数据源';
        console.log(`  - ${field.fieldName} (${field.fieldCode})`);
        console.log(`    ${dataSourceInfo}`);
      }
    }
  }
}

checkJobPostDataSource()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
