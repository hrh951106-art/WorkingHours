import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 查找工厂组织 ===\n');

  // 查找所有工厂类型的组织
  const factories = await prisma.organization.findMany({
    where: {
      type: 'COMPANY'
    }
  });

  console.log(`找到 ${factories.length} 个工厂组织:`);
  factories.forEach(factory => {
    console.log(`  ID: ${factory.id}, Code: ${factory.code}, Name: ${factory.name}`);
  });
  console.log('');

  // 查找"大华工厂"或类似的组织
  const dahuaFactory = await prisma.organization.findFirst({
    where: {
      OR: [
        { name: { contains: '大华' } },
        { name: { contains: 'DH' } },
        { code: { contains: 'DH' } }
      ]
    }
  });

  if (dahuaFactory) {
    console.log(`找到匹配的工厂组织:`);
    console.log(`  ID: ${dahuaFactory.id}`);
    console.log(`  Code: ${dahuaFactory.code}`);
    console.log(`  Name: ${dahuaFactory.name}`);
    console.log(`  Type: ${dahuaFactory.type}`);
  } else {
    console.log('未找到"大华工厂"组织');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
