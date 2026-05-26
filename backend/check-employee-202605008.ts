import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEmployee() {
  const employee = await prisma.employee.findUnique({
    where: { employeeNo: '202605008' },
  });

  if (!employee) {
    console.log('员工不存在');
    return;
  }

  console.log('=== 员工基本信息 ===');
  console.log('ID:', employee.id);
  console.log('工号:', employee.employeeNo);
  console.log('姓名:', employee.name);
  console.log('性别:', employee.gender);
  console.log('民族 (Employee表):', (employee as any).nation);
  console.log('岗位 (Employee表):', (employee as any).positionTitle);
  console.log('手机:', employee.phone);
  console.log('邮箱:', employee.email);
  console.log('婚姻状况:', employee.maritalStatus);
  console.log('政治面貌:', employee.politicalStatus);
  console.log('籍贯:', employee.nativePlace);

  console.log('\n=== Employee.customFields ===');
  let customFields = {};
  try {
    if (employee.customFields) {
      customFields = JSON.parse(employee.customFields);
    }
  } catch (e) {
    console.log('解析失败:', employee.customFields);
  }
  console.log(JSON.stringify(customFields, null, 2));

  console.log('\n=== WorkInfoHistory ===');
  const workInfoHistory = await prisma.workInfoHistory.findFirst({
    where: {
      employeeId: employee.id,
      isCurrent: true,
    },
  });

  if (workInfoHistory) {
    console.log('ID:', workInfoHistory.id);
    console.log('异动类型:', workInfoHistory.changeType);
    console.log('职级:', workInfoHistory.jobLevel);
    console.log('员工类型:', workInfoHistory.employeeType);
    console.log('成本中心:', workInfoHistory.costCenter);
    console.log('工作关系:', workInfoHistory.employmentRelation);
    console.log('岗位 (WorkInfoHistory表):', (workInfoHistory as any).jobPost);
    console.log('试用期周期:', (workInfoHistory as any).probationPeriod);

    console.log('\n=== WorkInfoHistory.customFields ===');
    let workInfoCustomFields = {};
    try {
      if (workInfoHistory.customFields) {
        workInfoCustomFields = JSON.parse(workInfoHistory.customFields);
      }
    } catch (e) {
      console.log('解析失败:', workInfoHistory.customFields);
    }
    console.log(JSON.stringify(workInfoCustomFields, null, 2));
  } else {
    console.log('没有找到工作信息历史记录');
  }
}

checkEmployee()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
