import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查询层级配置
  const hierarchyLevels = await prisma.accountHierarchyConfig.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { level: 'asc' }
  });

  console.log('=== 层级配置 ===\n');
  hierarchyLevels.forEach(level => {
    console.log(`Level ${level.level}: ${level.name} (${level.mappingType} -> ${level.mappingValue})`);
  });

  // 查询组织
  const orgs = await prisma.$queryRaw`
    SELECT id, name, code, type, parentId
    FROM Organization
    WHERE name IN ('杭州工厂', 'W1总装车间', 'W1总装L1产线')
    ORDER BY type
  `;

  console.log('\n=== 相关组织 ===\n');
  (orgs as any[]).forEach(org => {
    console.log(`${org.name}: ID=${org.id}, Type=${org.type}, ParentID=${org.parentId}`);
  });

  // 查找杭州工厂、W1总装车间、W1总装L1产线的组织ID
  const factoryOrg = await prisma.$queryRaw`SELECT id, name, type FROM Organization WHERE name = '杭州工厂' LIMIT 1`;
  const workshopOrg = await prisma.$queryRaw`SELECT id, name, type FROM Organization WHERE name = 'W1总装车间' LIMIT 1`;
  const lineOrg = await prisma.$queryRaw`SELECT id, name, type FROM Organization WHERE name = 'W1总装L1产线' LIMIT 1`;

  console.log('\n=== 准备创建账户 ===\n');
  console.log(`工厂: ${(factoryOrg as any)[0]?.name} (ID: ${(factoryOrg as any)[0]?.id})`);
  console.log(`车间: ${(workshopOrg as any)[0]?.name} (ID: ${(workshopOrg as any)[0]?.id})`);
  console.log(`产线: ${(lineOrg as any)[0]?.name} (ID: ${(lineOrg as any)[0]?.id})`);

  // 创建 hierarchyValues
  const hv = [
    {
      levelId: hierarchyLevels[0].id,
      level: 1,
      name: hierarchyLevels[0].name,
      mappingType: hierarchyLevels[0].mappingType,
      mappingValue: hierarchyLevels[0].mappingValue,
      selectedValue: (factoryOrg as any)[0] ? {
        id: (factoryOrg as any)[0].id,
        name: (factoryOrg as any)[0].name,
        code: (factoryOrg as any)[0].code,
        type: (factoryOrg as any)[0].type,
      } : null,
    },
    {
      levelId: hierarchyLevels[1].id,
      level: 2,
      name: hierarchyLevels[1].name,
      mappingType: hierarchyLevels[1].mappingType,
      mappingValue: hierarchyLevels[1].mappingValue,
      selectedValue: (workshopOrg as any)[0] ? {
        id: (workshopOrg as any)[0].id,
        name: (workshopOrg as any)[0].name,
        code: (workshopOrg as any)[0].code,
        type: (workshopOrg as any)[0].type,
      } : null,
    },
    {
      levelId: hierarchyLevels[2].id,
      level: 3,
      name: hierarchyLevels[2].name,
      mappingType: hierarchyLevels[2].mappingType,
      mappingValue: hierarchyLevels[2].mappingValue,
      selectedValue: (lineOrg as any)[0] ? {
        id: (lineOrg as any)[0].id,
        name: (lineOrg as any)[0].name,
        code: (lineOrg as any)[0].code,
        type: (lineOrg as any)[0].type,
      } : null,
    },
  ];

  // 检查是否已存在相同账户
  const existing = await prisma.laborAccount.findFirst({
    where: {
      type: 'SUB',
      usageType: 'SHIFT',
      name: '杭州工厂/W1总装车间/W1总装L1产线//',
    }
  });

  if (existing) {
    console.log('\n⚠️  账户已存在，ID:', existing.id);
    console.log('namePath:', existing.namePath);
    console.log('\n更新 LineShift 关联...');

    // 查找 W1总装L1产线 的 LineShift
    const lineShift = await prisma.lineShift.findFirst({
      where: {
        orgId: (lineOrg as any)[0].id,
        deletedAt: null,
      }
    });

    if (lineShift) {
      await prisma.lineShift.update({
        where: { id: lineShift.id },
        data: {
          accountId: existing.id,
          accountName: existing.namePath || existing.name,
        }
      });
      console.log('✅ 已更新 LineShift ID:', lineShift.id);
    }
  } else {
    console.log('\n创建新账户...');

    const account = await prisma.laborAccount.create({
      data: {
        code: 'LINE-' + Date.now(),
        name: '杭州工厂/W1总装车间/W1总装L1产线//',
        namePath: '杭州工厂/W1总装车间/W1总装L1产线//',
        path: 'HZ/W1/WL1//',
        type: 'SUB',
        level: 3,
        usageType: 'SHIFT',
        hierarchyValues: JSON.stringify(hv),
      }
    });

    console.log('✅ 账户创建成功，ID:', account.id);
    console.log('namePath:', account.namePath);

    // 查找并关联 LineShift
    const lineShift = await prisma.lineShift.findFirst({
      where: {
        orgId: (lineOrg as any)[0].id,
        deletedAt: null,
      }
    });

    if (lineShift) {
      await prisma.lineShift.update({
        where: { id: lineShift.id },
        data: {
          accountId: account.id,
          accountName: account.namePath || account.name,
        }
      });
      console.log('✅ 已关联 LineShift ID:', lineShift.id);
    }
  }

  // 验证结果
  console.log('\n=== 验证结果 ===\n');
  const lineShifts = await prisma.lineShift.findMany({
    where: { deletedAt: null },
    orderBy: { id: 'asc' }
  });

  lineShifts.forEach(ls => {
    console.log(`${ls.orgName}: accountId=${ls.accountId}, accountName=${ls.accountName || 'N/A'}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
