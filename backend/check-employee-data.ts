import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEmployeeData() {
  const employee = await prisma.employee.findFirst({
    where: { id: 3 }
  });

  if (employee) {
    console.log('=== Employee 数据 ===');
    console.log('id:', employee.id);
    console.log('employeeNo:', employee.employeeNo);
    console.log('name:', employee.name);
    console.log('gender:', employee.gender);
    console.log('entryDate:', employee.entryDate);
    console.log('status:', employee.status);
    
    console.log('\n=== Employee customFields ===');
    if (employee.customFields) {
      const customFields = typeof employee.customFields === 'string' 
        ? JSON.parse(employee.customFields) 
        : employee.customFields;
      console.log(JSON.stringify(customFields, null, 2));
      
      console.log('\n=== 检查特定字段 ===');
      console.log('entryType:', customFields.entryType);
      console.log('employmentRelation:', customFields.employmentRelation);
      console.log('jobPost:', customFields.jobPost);
      console.log('positionTitle:', customFields.positionTitle);
      console.log('costCenter:', customFields.costCenter);
    }
  }
}

checkEmployeeData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
