import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查询 W1总装L1产线 和 W1总装L2产线 的组织信息
  const orgs = await prisma.organization.findMany({
    where: {
      name: {
        contains: 'W1总装',
      },
    },
    orderBy: { id: 'asc' }
  });

  console.log('=== W1总装相关组织 ===\n');
  orgs.forEach((org) => {
    console.log(`ID=${org.id}: ${org.name} (code: ${org.code}, type: ${org.type})`);
    console.log(`  父级ID: ${org.parentId}`);
    console.log('');
  });

  // 查询层级配置
  const hierarchyLevels = await prisma.hierarchyLevel.findMany({
    orderBy: { level: 'asc' }
  });

  console.log('=== 层级配置 ===\n');
  hierarchyLevels.forEach((level) => {
    console.log(`ID=${level.id}: Level ${level.level} - ${level.name}`);
    console.log(`  映射类型: ${level.mappingType}`);
    console.log(`  映射值: ${level.mappingValue}`);
    console.log('');
  });

  // 查询已创建的子劳动力账户
  const subAccounts = await prisma.laborAccount.findMany({
    where: {
      type: 'SUB',
      usageType: 'SHIFT',
      name: {
        contains: 'W1总装',
      },
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log('=== 已创建的子劳动力账户 ===\n');
  subAccounts.forEach((acc) => {
    const namePath = acc.namePath || 'N/A';
    const path = acc.path || 'N/A';
    console.log(`ID=${acc.id}: ${acc.name}`);
    console.log(`  namePath: ${namePath}`);
    console.log(`  path: ${path}`);
    console.log(`  层级: ${acc.level}`);
    console.log('');
  });

  // 查询 W1总装L1 和 L2 产线的 LineShift 记录
  const lineShifts = await prisma.lineShift.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: { id: 'asc' }
  });

  console.log('=== 产线班次记录 ===\n');
  lineShifts.forEach((ls) => {
    console.log(`ID=${ls.id}: ${ls.orgName}`);
    console.log(`  orgId: ${ls.orgId}`);
    console.log(`  accountId: ${ls.accountId}`);
    const accountName = ls.accountName || 'N/A';
    console.log(`  accountName: ${accountName}`);
    console.log('');
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
