import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGenderDataSource() {
  // 查找 gender 字段关联的数据源
  const genderField = await prisma.employeeInfoTabField.findFirst({
    where: { fieldCode: 'gender' },
    include: { dataSource: true }
  });

  console.log('Gender field:');
  console.log('  fieldCode:', genderField?.fieldCode);
  console.log('  fieldType:', genderField?.fieldType);
  console.log('  isSystem:', genderField?.isSystem);
  console.log('  dataSource:', genderField?.dataSource?.name, 'code:', genderField?.dataSource?.code);

  if (genderField?.dataSource) {
    const options = await prisma.dataSourceOption.findMany({
      where: { 
        dataSourceId: genderField.dataSource.id,
        isActive: true
      },
      orderBy: { sort: 'asc' }
    });

    console.log('  Options:');
    options.forEach(opt => {
      console.log(`    - value: "${opt.value}", label: "${opt.label}"`);
    });
  }

  // 直接查找 GENDER 数据源
  const genderDataSource = await prisma.dataSource.findFirst({
    where: { code: 'GENDER' },
    include: {
      options: {
        where: { isActive: true },
        orderBy: { sort: 'asc' }
      }
    }
  });

  console.log('\nGENDER DataSource:');
  if (genderDataSource) {
    console.log('  name:', genderDataSource.name);
    console.log('  code:', genderDataSource.code);
    console.log('  Options:');
    genderDataSource.options.forEach(opt => {
      console.log(`    - value: "${opt.value}", label: "${opt.label}"`);
    });
  } else {
    console.log('  Not found');
  }
}

checkGenderDataSource()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
