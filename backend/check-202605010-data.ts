import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEmployee() {
  const employee = await prisma.employee.findUnique({
    where: { employeeNo: '202605010' },
  });

  if (!employee) {
    console.log('员工不存在');
    return;
  }

  console.log('=== 员工基本信息 ===');
  console.log('工号:', employee.employeeNo);
  console.log('姓名:', employee.name);
  console.log('状态:', employee.status);

  console.log('\n=== WorkInfoHistory ===');
  const workInfoHistory = await prisma.workInfoHistory.findFirst({
    where: {
      employeeId: employee.id,
      isCurrent: true,
    },
  });

  if (workInfoHistory) {
    console.log('职级:', workInfoHistory.jobLevel);
    console.log('员工类型:', workInfoHistory.employeeType);
    console.log('成本中心:', workInfoHistory.costCenter);
    console.log('工作关系:', workInfoHistory.employmentRelation);
    console.log('工作地点:', workInfoHistory.workLocation);
    console.log('办公地址:', workInfoHistory.workAddress);
    console.log('岗位:', workInfoHistory.position);
  } else {
    console.log('没有找到工作信息历史记录');
  }
}

checkEmployee()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
