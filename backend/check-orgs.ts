import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查询所有W1总装车间相关的组织
  const orgs = await prisma.organization.findMany({
    where: {
      name: { contains: 'W1总装车间' }
    },
    orderBy: { name: 'asc' }
  });
  
  console.log('=== W1总装车间相关组织 ===');
  orgs.forEach(org => {
    console.log({
      id: org.id,
      code: org.code,
      name: org.name,
      type: org.type,
      parentId: org.parentId
    });
  });
  
  // 查询L2产线
  const l2Org = await prisma.organization.findFirst({
    where: { name: { contains: 'L2产线' } }
  });
  
  console.log('\n=== L2产线信息 ===');
  console.log(JSON.stringify(l2Org, null, 2));
}

main()
  .then(() => console.log('\n查询完成'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
