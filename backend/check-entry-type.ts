import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  // 检查Employee表中是否有entryType字段
  const employee = await prisma.employee.findFirst({
    where: { id: 3 },
    select: { customFields: true }
  });

  console.log('=== Employee.customFields ===');
  const cf = JSON.parse(employee?.customFields || '{}');
  console.log('entryType:', cf.entryType);

  // 检查WorkInfoHistory表中是否有entryType字段
  const workInfo: any = await prisma.workInfoHistory.findFirst({
    where: { employeeId: 3 }
  });

  console.log('\n=== WorkInfoHistory ===');
  console.log('所有字段:', Object.keys(workInfo || {}));
  console.log('entryType字段:', workInfo?.entryType);
  if (workInfo?.customFields) {
    const wf = JSON.parse(workInfo.customFields);
    console.log('customFields.entryType:', wf.entryType);
  }

  // 检查页签配置
  const fields = await prisma.employeeInfoTabField.findMany({
    where: { fieldCode: 'entryType' },
    include: { tab: true }
  });

  console.log('\n=== 页签字段配置 ===');
  fields.forEach((f: any) => {
    console.log('  Tab:', f.tab.name, 'Field:', f.fieldName, '(' + f.fieldCode + ')');
  });

  // 检查ENTRY_TYPE数据源
  const ds = await prisma.dataSource.findFirst({
    where: { code: 'ENTRY_TYPE' }
  });

  console.log('\n=== ENTRY_TYPE 数据源 ===');
  if (ds) {
    console.log('存在:', ds.name);
  } else {
    console.log('不存在');
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
