import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDataSources() {
  console.log('开始初始化数据源...');

  // 创建组织类型数据源（内置）
  const orgTypeDataSource = await prisma.dataSource.upsert({
    where: { code: 'ORG_TYPE' },
    update: {},
    create: {
      code: 'ORG_TYPE',
      name: '组织类型',
      type: 'BUILTIN',
      description: '组织架构类型选项',
      isSystem: true,
      sort: 1,
      status: 'ACTIVE',
    },
  });

  console.log('创建组织类型数据源:', orgTypeDataSource.name);

  // 创建组织类型选项
  const orgTypes = [
    { label: '集团', value: 'GROUP', sort: 1 },
    { label: '公司', value: 'COMPANY', sort: 2 },
    { label: '部门', value: 'DEPARTMENT', sort: 3 },
    { label: '小组', value: 'TEAM', sort: 4 },
    { label: '岗位', value: 'POSITION', sort: 5 },
  ];

  for (const orgType of orgTypes) {
    await prisma.dataSourceOption.upsert({
      where: {
        dataSourceId_value: {
          dataSourceId: orgTypeDataSource.id,
          value: orgType.value,
        },
      },
      update: {},
      create: {
        dataSourceId: orgTypeDataSource.id,
        label: orgType.label,
        value: orgType.value,
        sort: orgType.sort,
        isActive: true,
      },
    });
  }

  console.log('创建组织类型选项完成');

  // 创建学历数据源（示例自定义数据源）
  const educationDataSource = await prisma.dataSource.upsert({
    where: { code: 'EDUCATION' },
    update: {},
    create: {
      code: 'EDUCATION',
      name: '学历',
      type: 'CUSTOM',
      description: '员工学历选项',
      isSystem: false,
      sort: 2,
      status: 'ACTIVE',
    },
  });

  const educations = [
    { label: '高中', value: 'HIGH_SCHOOL', sort: 1 },
    { label: '大专', value: 'COLLEGE', sort: 2 },
    { label: '本科', value: 'BACHELOR', sort: 3 },
    { label: '硕士', value: 'MASTER', sort: 4 },
    { label: '博士', value: 'DOCTOR', sort: 5 },
  ];

  for (const edu of educations) {
    await prisma.dataSourceOption.upsert({
      where: {
        dataSourceId_value: {
          dataSourceId: educationDataSource.id,
          value: edu.value,
        },
      },
      update: {},
      create: {
        dataSourceId: educationDataSource.id,
        label: edu.label,
        value: edu.value,
        sort: edu.sort,
        isActive: true,
      },
    });
  }

  console.log('创建学历数据源完成');

  // 创建工作状态数据源
  const workStatusDataSource = await prisma.dataSource.upsert({
    where: { code: 'WORK_STATUS' },
    update: {},
    create: {
      code: 'WORK_STATUS',
      name: '工作状态',
      type: 'CUSTOM',
      description: '员工工作状态',
      isSystem: false,
      sort: 3,
      status: 'ACTIVE',
    },
  });

  const workStatuses = [
    { label: '在职', value: 'ACTIVE', sort: 1 },
    { label: '试用期', value: 'PROBATION', sort: 2 },
    { label: '请假', value: 'LEAVE', sort: 3 },
    { label: '离职', value: 'RESIGNED', sort: 4 },
  ];

  for (const status of workStatuses) {
    await prisma.dataSourceOption.upsert({
      where: {
        dataSourceId_value: {
          dataSourceId: workStatusDataSource.id,
          value: status.value,
        },
      },
      update: {},
      create: {
        dataSourceId: workStatusDataSource.id,
        label: status.label,
        value: status.value,
        sort: status.sort,
        isActive: true,
      },
    });
  }

  console.log('创建工作状态数据源完成');

  console.log('数据源初始化完成！');
}

seedDataSources()
  .catch((e) => {
    console.error('初始化数据源失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
