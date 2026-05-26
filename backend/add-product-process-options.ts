import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addProductAndProcessOptions() {
  console.log('开始为产品和工序数据源添加选项...');

  // 获取数据源
  const productDS = await prisma.dataSource.findUnique({
    where: { code: 'PRODUCT' }
  });

  const processDS = await prisma.dataSource.findUnique({
    where: { code: 'PROCESS' }
  });

  if (!productDS || !processDS) {
    console.error('未找到产品或工序数据源');
    return;
  }

  // 清空旧选项（如果有）
  await prisma.dataSourceOption.deleteMany({
    where: { dataSourceId: productDS.id }
  });

  await prisma.dataSourceOption.deleteMany({
    where: { dataSourceId: processDS.id }
  });

  // 添加产品选项（示例）
  const productOptions = [
    { value: 'ELECTRONICS', label: '电子产品', sort: 1 },
    { value: 'CLOTHING', label: '服装', sort: 2 },
    { value: 'FOOD', label: '食品', sort: 3 },
    { value: 'MACHINERY', label: '机械设备', sort: 4 },
    { value: 'CHEMICAL', label: '化工产品', sort: 5 },
    { value: 'AUTOMOTIVE', label: '汽车配件', sort: 6 },
  ];

  for (const option of productOptions) {
    await prisma.dataSourceOption.create({
      data: {
        dataSourceId: productDS.id,
        value: option.value,
        label: option.label,
        sort: option.sort,
        isActive: true,
      }
    });
  }

  console.log('✓ 产品数据源选项添加成功');

  // 添加工序选项（示例）
  const processOptions = [
    { value: 'ASSEMBLY', label: '组装', sort: 1 },
    { value: 'WELDING', label: '焊接', sort: 2 },
    { value: 'PAINTING', label: '喷涂', sort: 3 },
    { value: 'PACKING', label: '包装', sort: 4 },
    { value: 'TESTING', label: '测试', sort: 5 },
    { value: 'INSPECTION', label: '检验', sort: 6 },
  ];

  for (const option of processOptions) {
    await prisma.dataSourceOption.create({
      data: {
        dataSourceId: processDS.id,
        value: option.value,
        label: option.label,
        sort: option.sort,
        isActive: true,
      }
    });
  }

  console.log('✓ 工序数据源选项添加成功');

  // 验证结果
  const productWithOptions = await prisma.dataSource.findUnique({
    where: { code: 'PRODUCT' },
    include: {
      options: {
        where: { isActive: true },
        orderBy: { sort: 'asc' }
      }
    }
  });

  const processWithOptions = await prisma.dataSource.findUnique({
    where: { code: 'PROCESS' },
    include: {
      options: {
        where: { isActive: true },
        orderBy: { sort: 'asc' }
      }
    }
  });

  console.log('\n=== 验证结果 ===');
  console.log(`\n${productWithOptions?.name} (${productWithOptions?.code}):`);
  productWithOptions?.options.forEach(opt => {
    console.log(`  - ${opt.label} (${opt.value})`);
  });

  console.log(`\n${processWithOptions?.name} (${processWithOptions?.code}):`);
  processWithOptions?.options.forEach(opt => {
    console.log(`  - ${opt.label} (${opt.value})`);
  });

  console.log('\n数据源选项添加完成！');
}

addProductAndProcessOptions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
