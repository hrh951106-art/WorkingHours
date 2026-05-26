import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkWorkInfoData() {
  // 查找一个有工作信息的员工
  const employee = await prisma.employee.findFirst({
    where: {
      workInfoHistory: {
        some: {}
      }
    },
    include: {
      workInfoHistory: {
        take: 1,
        orderBy: { effectiveDate: 'desc' }
      }
    }
  });

  if (employee && employee.workInfoHistory.length > 0) {
    const workInfo = employee.workInfoHistory[0];
    console.log('=== WorkInfoHistory 数据 ===');
    console.log('id:', workInfo.id);
    console.log('employeeId:', workInfo.employeeId);
    console.log('effectiveDate:', workInfo.effectiveDate);
    console.log('orgId:', workInfo.orgId);
    console.log('position:', workInfo.position);
    console.log('jobLevel:', workInfo.jobLevel);
    console.log('employeeType:', workInfo.employeeType);
    console.log('workLocation:', workInfo.workLocation);
    console.log('workAddress:', workInfo.workAddress);
    console.log('hireDate:', workInfo.hireDate);
    console.log('probationStart:', workInfo.probationStart);
    console.log('probationEnd:', workInfo.probationEnd);
    console.log('probationMonths:', workInfo.probationMonths);
    console.log('regularDate:', workInfo.regularDate);
    console.log('resignationDate:', workInfo.resignationDate);
    console.log('resignationReason:', workInfo.resignationReason);
    console.log('workYears:', workInfo.workYears);
    console.log('changeType:', workInfo.changeType);
    
    // 检查 customFields
    console.log('\n=== customFields JSON ===');
    if (workInfo.customFields) {
      const customFields = typeof workInfo.customFields === 'string' 
        ? JSON.parse(workInfo.customFields) 
        : workInfo.customFields;
      console.log(JSON.stringify(customFields, null, 2));
      
      // 检查特定字段
      console.log('\n=== 检查特定字段 ===');
      console.log('entryType:', customFields.entryType);
      console.log('employmentRelation:', customFields.employmentRelation);
      console.log('jobPost:', customFields.jobPost);
      console.log('positionTitle:', customFields.positionTitle);
      console.log('costCenter:', customFields.costCenter);
      console.log('usageStartDate:', customFields.usageStartDate);
      console.log('serviceYearsStartDate:', customFields.serviceYearsStartDate);
      console.log('estimatedProbationEndDate:', customFields.estimatedProbationEndDate);
    }
  } else {
    console.log('没有找到有工作信息的员工');
  }
}

checkWorkInfoData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
