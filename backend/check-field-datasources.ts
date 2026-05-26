import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFieldDataSources() {
  const fieldCodes = ['educationLevel', 'nation', 'workLocation', 'position'];
  
  for (const fieldCode of fieldCodes) {
    const field = await prisma.employeeInfoTabField.findFirst({
      where: { fieldCode },
      include: { dataSource: true }
    });

    if (field) {
      console.log(`${fieldCode}:`);
      console.log(`  fieldType: ${field.fieldType}`);
      console.log(`  dataSource: ${field.dataSource?.name} (code: ${field.dataSource?.code})`);
    } else {
      console.log(`${fieldCode}: Not found`);
    }
  }
}

checkFieldDataSources()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
