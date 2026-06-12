import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addMissingDataSourceOptions() {
  console.log('=== 补充缺失的数据源选项 ===\n');

  // 定义需要补充选项的数据源
  const dataSourceOptions = {
    POLITICAL_STATUS: [
      { label: '群众', value: '1', sort: 1 },
      { label: '党员', value: '2', sort: 2 },
      { label: '团员', value: '3', sort: 3 },
      { label: '民主党派', value: '4', sort: 4 },
      { label: '其他', value: '5', sort: 5 },
    ],
    EMPLOYEE_TYPE: [
      { label: '正式员工', value: '1', sort: 1 },
      { label: '临时员工', value: '2', sort: 2 },
      { label: '实习生', value: '3', sort: 3 },
      { label: '劳务派遣', value: '4', sort: 4 },
    ],
    EMERGENCY_CONTACT_RELATION: [
      { label: '父亲', value: '1', sort: 1 },
      { label: '母亲', value: '2', sort: 2 },
      { label: '配偶', value: '3', sort: 3 },
      { label: '子女', value: '4', sort: 4 },
      { label: '其他', value: '5', sort: 5 },
    ],
  };

  let totalAdded = 0;
  let totalSkipped = 0;

  for (const [dataSourceCode, options] of Object.entries(dataSourceOptions)) {
    console.log(`处理数据源: ${dataSourceCode}`);

    // 查找数据源
    const dataSource = await prisma.dataSource.findFirst({
      where: { code: dataSourceCode },
    });

    if (!dataSource) {
      console.log(`  ⚠️ 数据源不存在，跳过\n`);
      totalSkipped += options.length;
      continue;
    }

    console.log(`  数据源ID: ${dataSource.id}`);
    console.log(`  需要添加的选项数: ${options.length}`);

    let addedCount = 0;
    let skippedCount = 0;

    for (const option of options) {
      // 检查选项是否已存在
      const existing = await prisma.dataSourceOption.findFirst({
        where: {
          dataSourceId: dataSource.id,
          value: option.value,
        },
      });

      if (existing) {
        console.log(`    - 选项 "${option.label}" (${option.value}) 已存在，跳过`);
        skippedCount++;
        totalSkipped++;
        continue;
      }

      // 创建新选项
      await prisma.dataSourceOption.create({
        data: {
          dataSourceId: dataSource.id,
          label: option.label,
          value: option.value,
          sort: option.sort,
          isActive: true,
        },
      });

      console.log(`    ✓ 新增选项: "${option.label}" (${option.value})`);
      addedCount++;
      totalAdded++;
    }

    console.log(`  新增: ${addedCount} 个，跳过: ${skippedCount} 个\n`);
  }

  console.log('=== 统计 ===');
  console.log(`总共新增: ${totalAdded} 个选项`);
  console.log(`总共跳过: ${totalSkipped} 个选项`);
  console.log('');

  // 验证结果
  console.log('=== 验证数据源选项 ===\n');

  const dataSources = await prisma.dataSource.findMany({
    where: {
      status: 'ACTIVE',
      code: {
        in: Object.keys(dataSourceOptions),
      },
    },
    include: {
      options: {
        where: { isActive: true },
        orderBy: { sort: 'asc' },
      },
    },
  });

  for (const ds of dataSources) {
    console.log(`${ds.code} (${ds.name}):`);
    console.log(`  激活选项数: ${ds.options.length}`);
    if (ds.options.length > 0) {
      console.log(`  选项列表:`);
      ds.options.forEach(opt => {
        console.log(`    ${opt.sort}. ${opt.label} (${opt.value})`);
      });
    }
    console.log('');
  }

  console.log('=== 完成 ===');
  console.log(`✓ 选项补充完成！`);
}

addMissingDataSourceOptions()
  .then(() => {
    console.log('\n✓ 脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ 脚本执行失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
