import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addChangeTypeDataSource() {
  console.log('🔧 开始添加"异动类型"数据源...\n');

  // 1. 创建数据源
  const dataSource = await prisma.dataSource.upsert({
    where: { code: 'change_type' },
    update: {},
    create: {
      code: 'change_type',
      name: '异动类型',
      description: '员工工作信息异动类型，包括入职、调岗、晋升、降职、离职等',
      type: 'SELECT_SINGLE',
      status: 'ACTIVE',
    },
  });

  console.log(`✅ 数据源创建成功: ${dataSource.name} (ID: ${dataSource.id})\n`);

  // 2. 定义异动类型选项
  const changeTypeOptions = [
    { label: '入职', value: 'ENTRY', sort: 1 },
    { label: '调岗', value: 'TRANSFER', sort: 2 },
    { label: '晋升', value: 'PROMOTION', sort: 3 },
    { label: '降职', value: 'DEMOTION', sort: 4 },
    { label: '离职', value: 'RESIGNATION', sort: 5 },
    { label: '复职', value: 'REINSTATEMENT', sort: 6 },
    { label: '停薪留职', value: 'UNPAID_LEAVE', sort: 7 },
    { label: '长期病假', value: 'LONG_TERM_SICK_LEAVE', sort: 8 },
  ];

  // 3. 添加选项
  console.log('添加数据源选项:');
  for (const option of changeTypeOptions) {
    const existingOption = await prisma.dataSourceOption.findFirst({
      where: {
        dataSourceId: dataSource.id,
        value: option.value,
      },
    });

    if (!existingOption) {
      await prisma.dataSourceOption.create({
        data: {
          dataSourceId: dataSource.id,
          label: option.label,
          value: option.value,
          sort: option.sort,
          isActive: true,
        },
      });
      console.log(`  ✅ ${option.label} (${option.value})`);
    } else {
      console.log(`  ⚠️  ${option.label} (${option.value}) - 已存在`);
    }
  }

  // 4. 验证结果
  const finalOptions = await prisma.dataSourceOption.findMany({
    where: { dataSourceId: dataSource.id },
    orderBy: { sort: 'asc' },
  });

  console.log(`\n✅ 完成！共创建 ${finalOptions.length} 个异动类型选项:\n`);
  finalOptions.forEach((opt) => {
    console.log(`  - ${opt.label} (${opt.value})`);
  });

  await prisma.$disconnect();
}

addChangeTypeDataSource()
  .then(() => {
    console.log('\n✅ 数据源初始化完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 错误:', error);
    process.exit(1);
  });
