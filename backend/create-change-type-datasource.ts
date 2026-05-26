import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createChangeTypeDataSource() {
  // 创建 CHANGE_TYPE 数据源
  const dataSource = await prisma.dataSource.upsert({
    where: { code: 'CHANGE_TYPE' },
    update: {},
    create: {
      code: 'CHANGE_TYPE',
      name: '异动类型',
      type: 'SYSTEM',
      status: 'ACTIVE',
      description: '员工工作信息异动类型（入职、调动、升职等）',
    }
  });

  console.log('数据源创建成功:', dataSource);

  // 删除旧的选项（如果存在）
  await prisma.dataSourceOption.deleteMany({
    where: { dataSourceId: dataSource.id }
  });

  // 创建选项
  const options = [
    { value: 'ENTRY', label: '入职', sort: 1 },
    { value: 'TRANSFER', label: '调动', sort: 2 },
    { value: 'PROMOTION', label: '升职', sort: 3 },
    { value: 'DEMOTION', label: '降职', sort: 4 },
    { value: 'RESIGNATION', label: '离职', sort: 5 },
    { value: 'SALARY_ADJUSTMENT', label: '调薪', sort: 6 },
    { value: 'OTHER', label: '其他', sort: 7 },
  ];

  for (const option of options) {
    await prisma.dataSourceOption.create({
      data: {
        dataSourceId: dataSource.id,
        value: option.value,
        label: option.label,
        sort: option.sort,
        isActive: true,
      }
    });
  }

  console.log('选项创建成功');

  // 验证结果
  const created = await prisma.dataSource.findFirst({
    where: { code: 'CHANGE_TYPE' },
    include: {
      options: {
        where: { isActive: true },
        orderBy: { sort: 'asc' }
      }
    }
  });

  console.log('\n=== 验证结果 ===');
  console.log('数据源:', created?.name, `(${created?.code})`);
  created?.options.forEach(opt => {
    console.log(`  - ${opt.label} (${opt.value})`);
  });
}

createChangeTypeDataSource()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
