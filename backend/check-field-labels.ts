import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 检查position和jobLevel字段的标签配置
 */
async function checkFieldLabels() {
  console.log('=== 检查字段标签配置 ===\n');

  // 1. 检查position字段
  console.log('1. 检查position字段:');
  const positionField = await prisma.customField.findUnique({
    where: { code: 'position' },
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

  if (!positionField) {
    console.log('  ❌ position字段不存在于CustomField表中');
  } else {
    console.log(`  ✅ position字段存在`);
    console.log(`  名称: ${positionField.name}`);
    console.log(`  数据源: ${positionField.dataSource?.name || 'NULL'}`);

    if (positionField.dataSource?.options) {
      console.log(`  选项数量: ${positionField.dataSource.options.length}`);
      const post012Option = positionField.dataSource.options.find(
        (opt: any) => opt.value === 'POST_012'
      );
      if (post012Option) {
        console.log(`  POST_012的标签: ${post012Option.label}`);
      } else {
        console.log(`  ⚠️ 未找到POST_012的选项`);
      }
    } else {
      console.log(`  ⚠️ 没有配置选项`);
    }
  }

  console.log('');

  // 2. 检查jobLevel字段
  console.log('2. 检查jobLevel字段:');
  const jobLevelField = await prisma.customField.findUnique({
    where: { code: 'jobLevel' },
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

  if (!jobLevelField) {
    console.log('  ❌ jobLevel字段不存在于CustomField表中');
  } else {
    console.log(`  ✅ jobLevel字段存在`);
    console.log(`  名称: ${jobLevelField.name}`);
    console.log(`  数据源: ${jobLevelField.dataSource?.name || 'NULL'}`);

    if (jobLevelField.dataSource?.options) {
      console.log(`  选项数量: ${jobLevelField.dataSource.options.length}`);
      const level008Option = jobLevelField.dataSource.options.find(
        (opt: any) => opt.value === 'LEVEL_008'
      );
      if (level008Option) {
        console.log(`  LEVEL_008的标签: ${level008Option.label}`);
      } else {
        console.log(`  ⚠️ 未找到LEVEL_008的选项`);
      }
    } else {
      console.log(`  ⚠️ 没有配置选项`);
    }
  }

  console.log('');
  console.log('=== 问题分析 ===\n');

  if (!positionField || !positionField.dataSource?.options) {
    console.log('position字段问题:');
    if (!positionField) {
      console.log('  ❌ 字段不存在，需要在CustomField表中创建');
      console.log('  建议：创建position字段并配置数据源选项');
    } else {
      console.log('  ⚠️ 字段存在但没有配置数据源选项');
      console.log('  建议：为position字段配置数据源和选项（如POST_012 -> 焊接岗位）');
    }
  }

  if (!jobLevelField || !jobLevelField.dataSource?.options) {
    console.log('jobLevel字段问题:');
    if (!jobLevelField) {
      console.log('  ❌ 字段不存在，需要在CustomField表中创建');
      console.log('  建议：创建jobLevel字段并配置数据源选项');
    } else {
      console.log('  ⚠️ 字段存在但没有配置数据源选项');
      console.log('  建议：为jobLevel字段配置数据源和选项（如LEVEL_008 -> 五类一级）');
    }
  }

  console.log('');
  console.log('=== 解决方案 ===\n');
  console.log('方案1：在CustomField表中配置position和jobLevel字段');
  console.log('  - 创建字段：position (岗位)');
  console.log('  - 创建字段：jobLevel (技能等级)');
  console.log('  - 配置数据源选项：');
  console.log('    * POST_012 -> 焊接岗位');
  console.log('    * LEVEL_008 -> 五类一级');
  console.log('    * LEVEL_006 -> 五类二级');
  console.log('');
  console.log('方案2：使用字段映射表（如果有专门的职位表和职级表）');
  console.log('  - 如果有Position表和JobLevel表');
  console.log('  - 可以修改getFieldLabel方法，从这些表查询显示名称');

  await prisma.$disconnect();
}

checkFieldLabels()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
