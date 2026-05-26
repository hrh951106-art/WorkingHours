import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllDataSources() {
  const dataSources = await prisma.dataSource.findMany({
    where: { status: 'ACTIVE' },
    include: {
      options: {
        where: { isActive: true },
        orderBy: { sort: 'asc' },
        take: 3
      }
    }
  });

  console.log('All Active DataSources:');
  dataSources.forEach(ds => {
    console.log(`\n${ds.name} - code: "${ds.code}"`);
    if (ds.options.length > 0) {
      console.log('  Sample options:');
      ds.options.forEach(opt => {
        console.log(`    - value: "${opt.value}", label: "${opt.label}"`);
      });
    }
  });
}

checkAllDataSources()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
