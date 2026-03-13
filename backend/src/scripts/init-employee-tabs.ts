import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function initEmployeeTabs() {
  console.log('开始初始化人事信息页签...');

  // 检查是否已存在基本信息页签
  const existingTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'basic_info' },
  });

  if (existingTab) {
    console.log('基本信息页签已存在，跳过创建');
    return;
  }

  // 创建基本信息页签
  const basicInfoTab = await prisma.employeeInfoTab.create({
    data: {
      code: 'basic_info',
      name: '基本信息',
      description: '员工基本信息系统字段',
      isSystem: true,
      sort: 0,
      status: 'ACTIVE',
    },
  });

  console.log('创建基本信息页签:', basicInfoTab.name);

  // 系统字段列表
  const systemFields = [
    { fieldCode: 'employeeNo', fieldName: '工号', sort: 0 },
    { fieldCode: 'name', fieldName: '姓名', sort: 1 },
    { fieldCode: 'gender', fieldName: '性别', sort: 2 },
    { fieldCode: 'idCard', fieldName: '身份证号', sort: 3 },
    { fieldCode: 'phone', fieldName: '手机号', sort: 4 },
    { fieldCode: 'email', fieldName: '邮箱', sort: 5 },
    { fieldCode: 'orgId', fieldName: '所属组织', sort: 6 },
    { fieldCode: 'entryDate', fieldName: '入职日期', sort: 7 },
    { fieldCode: 'status', fieldName: '状态', sort: 8 },
  ];

  // 批量添加字段
  for (const field of systemFields) {
    await prisma.employeeInfoTabField.create({
      data: {
        tabId: basicInfoTab.id,
        fieldCode: field.fieldCode,
        fieldName: field.fieldName,
        fieldType: 'SYSTEM',
        isRequired: field.fieldCode !== 'email', // 邮箱不是必填
        sort: field.sort,
      },
    });
    console.log('  添加字段:', field.fieldName);
  }

  console.log('人事信息页签初始化完成！');
}

initEmployeeTabs()
  .catch((e) => {
    console.error('初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
