import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMissingDataSources() {
  const codes = ['EDUCATION_LEVEL', 'EDUCATION_TYPE', 'NATION', 'WORK_LOCATION', 'EMPLOYMENT_STATUS', 'POSITION'];
  
  for (const code of codes) {
    const dataSource = await prisma.dataSource.findFirst({
      where: { code },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { sort: 'asc' }
        }
      }
    });

    if (dataSource) {
      console.log(`✓ ${code}: ${dataSource.name}`);
      dataSource.options.slice(0, 3).forEach(opt => {
        console.log(`    - ${opt.value}: ${opt.label}`);
      });
    } else {
      console.log(`✗ ${code}: Not found`);
    }
  }
}

checkMissingDataSources()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
