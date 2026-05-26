import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. 查询账户层级配置
  const hierarchyConfigs = await prisma.accountHierarchyConfig.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { level: 'asc' }
  });
  
  console.log('=== 账户层级配置 ===');
  hierarchyConfigs.forEach(config => {
    console.log({
      level: config.level,
      name: config.name,
      mappingType: config.mappingType,
      mappingValue: config.mappingValue
    });
  });
  
  // 2. 查询组织结构
  const orgs = await prisma.organization.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { level: 'asc' }
  });
  
  console.log('\n=== 组织结构 ===');
  orgs.forEach(org => {
    console.log({
      id: org.id,
      code: org.code,
      name: org.name,
      type: org.type,
      level: org.level,
      parentId: org.parentId
    });
  });
  
  // 3. 查询L1产线的组织树
  const l1Org = await prisma.organization.findFirst({
    where: { name: { contains: 'L1产线' } }
  });
  
  if (l1Org) {
    console.log('\n=== L1产线组织树 ===');
    const orgTree = [];
    let currentOrg = l1Org;
    
    while (currentOrg) {
      orgTree.unshift({
        id: currentOrg.id,
        name: currentOrg.name,
        type: currentOrg.type,
        level: currentOrg.level,
        parentId: currentOrg.parentId
      });
      
      if (currentOrg.parentId) {
        currentOrg = await prisma.organization.findUnique({
          where: { id: currentOrg.parentId }
        });
      } else {
        currentOrg = null;
      }
    }
    
    orgTree.forEach(org => console.log(org));
  }
}

main()
  .then(() => console.log('\n查询完成'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
