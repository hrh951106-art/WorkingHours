import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const employee = await prisma.employee.findFirst({
    where: { employeeNo: '202604001' },
    include: {
      workInfoHistory: {
        orderBy: { effectiveDate: 'desc' }
      }
    }
  });

  if (employee) {
    console.log('=== 员工基本信息 ===');
    console.log('employeeNo:', employee.employeeNo);
    console.log('name:', employee.name);
    console.log('entryDate:', employee.entryDate);

    console.log('\n=== 工作信息历史记录 ===');
    console.log('总记录数:', employee.workInfoHistory.length);

    employee.workInfoHistory.forEach((info: any, i: number) => {
      console.log('\n记录 ' + (i + 1) + ':');
      console.log('  id:', info.id);
      console.log('  effectiveDate:', info.effectiveDate);
      console.log('  changeType:', info.changeType);
      console.log('  isCurrent:', info.isCurrent);
      console.log('  orgId:', info.orgId);
      console.log('  position:', info.position);
      console.log('  jobLevel:', info.jobLevel);
      console.log('  employeeType:', info.employeeType);
      console.log('  createdAt:', info.createdAt);
      console.log('  updatedAt:', info.updatedAt);
    });
  } else {
    console.log('未找到该员工');
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
