import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查询 WH1001 配置
  const wh1001 = await prisma.systemConfig.findUnique({
    where: { configKey: 'WH1001' }
  });

  console.log('=== WH1001 配置 ===\n');
  if (wh1001) {
    console.log(`configValue: ${wh1001.configValue}`);
    console.log(`description: ${wh1001.description}`);
  } else {
    console.log('WH1001 配置不存在');
  }

  // 查询 AccountHierarchyConfig 和层级明细
  const configs = await prisma.accountHierarchyConfig.findMany({
    include: {
      details: true
    }
  });

  console.log('\n=== 层级配置 ===\n');
  configs.forEach(config => {
    console.log(`配置: ${config.code} - ${config.name}`);
    config.details.forEach(detail => {
      console.log(`  Level ${detail.level}: ${detail.levelName} (ID: ${detail.id})`);
      console.log(`    parentLevelId: ${detail.parentLevelId}`);
      console.log(`    status: ${detail.status}`);
    });
    console.log('');
  });

  // 查询 W1总装L1 和 L2 产线组织
  const orgs = await prisma.$queryRaw`
    SELECT id, name, code, type, parentId 
    FROM Organization 
    WHERE name LIKE '%W1总装%'
    ORDER BY id
  `;

  console.log('\n=== W1总装相关组织 ===\n');
  (orgs as any[]).forEach(org => {
    console.log(`ID=${org.id}: ${org.name} (type: ${org.type})`);
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
