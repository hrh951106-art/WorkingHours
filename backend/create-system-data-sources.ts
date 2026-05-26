import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSystemDataSources() {
  console.log('开始创建系统数据源...');

  // 创建岗位数据源
  const positionDataSource = await prisma.dataSource.upsert({
    where: { code: 'POSITION' },
    update: {},
    create: {
      code: 'POSITION',
      name: '岗位',
      type: 'BUILTIN',
      status: 'ACTIVE',
      description: '员工岗位（系统内置）',
    }
  });

  // 删除岗位的旧选项
  await prisma.dataSourceOption.deleteMany({
    where: { dataSourceId: positionDataSource.id }
  });

  // 创建岗位选项
  const positionOptions = [
    { value: 'MANAGER', label: '经理', sort: 1 },
    { value: 'SUPERVISOR', label: '主管', sort: 2 },
    { value: 'SPECIALIST', label: '专员', sort: 3 },
    { value: 'ASSISTANT', label: '助理', sort: 4 },
    { value: 'DIRECTOR', label: '总监', sort: 5 },
    { value: 'VICE_PRESIDENT', label: '副总裁', sort: 6 },
    { value: 'PRESIDENT', label: '总裁', sort: 7 },
    { value: 'CEO', label: '首席执行官', sort: 8 },
    { value: 'CTO', label: '首席技术官', sort: 9 },
    { value: 'CFO', label: '首席财务官', sort: 10 },
    { value: 'COO', label: '首席运营官', sort: 11 },
  ];

  for (const option of positionOptions) {
    await prisma.dataSourceOption.create({
      data: {
        dataSourceId: positionDataSource.id,
        value: option.value,
        label: option.label,
        sort: option.sort,
        isActive: true,
      }
    });
  }

  console.log('✓ 岗位数据源创建成功');

  // 创建工作地点数据源
  const workLocationDataSource = await prisma.dataSource.upsert({
    where: { code: 'WORK_LOCATION' },
    update: {},
    create: {
      code: 'WORK_LOCATION',
      name: '工作地点',
      type: 'BUILTIN',
      status: 'ACTIVE',
      description: '员工工作地点（系统内置）',
    }
  });

  // 删除工作地点的旧选项
  await prisma.dataSourceOption.deleteMany({
    where: { dataSourceId: workLocationDataSource.id }
  });

  // 创建工作地点选项
  const workLocationOptions = [
    { value: 'HEADQUARTERS', label: '总部', sort: 1 },
    { value: 'BRANCH', label: '分公司', sort: 2 },
    { value: 'FACTORY', label: '工厂', sort: 3 },
    { value: 'OFFICE', label: '办公室', sort: 4 },
    { value: 'REMOTE', label: '远程', sort: 5 },
    { value: 'ON_SITE', label: '现场', sort: 6 },
  ];

  for (const option of workLocationOptions) {
    await prisma.dataSourceOption.create({
      data: {
        dataSourceId: workLocationDataSource.id,
        value: option.value,
        label: option.label,
        sort: option.sort,
        isActive: true,
      }
    });
  }

  console.log('✓ 工作地点数据源创建成功');

  // 验证结果
  const dataSources = await prisma.dataSource.findMany({
    where: {
      code: {
        in: ['POSITION', 'JOB_LEVEL', 'EMPLOYEE_TYPE', 'WORK_LOCATION']
      }
    },
    include: {
      options: {
        where: { isActive: true },
        orderBy: { sort: 'asc' }
      }
    }
  });

  console.log('\n=== 验证结果 ===');
  dataSources.forEach(ds => {
    console.log(`\n${ds.name} (${ds.code}):`);
    ds.options.forEach(opt => {
      console.log(`  - ${opt.label} (${opt.value})`);
    });
  });

  console.log('\n系统数据源创建完成！');
}

createSystemDataSources()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
