import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 检查层级配置 ==========\n');

  const configs = await prisma.accountHierarchyConfig.findMany({
    where: {
      status: 'ACTIVE'
    },
    orderBy: {
      level: 'asc'
    }
  });

  console.log('当前层级配置:');
  configs.forEach(config => {
    console.log(`层级${config.level}: ${config.name}`);
    console.log(`  映射类型: ${config.mappingType}`);
    console.log(`  映射值: ${config.mappingValue || '-'}`);
    console.log(`  数据源ID: ${config.dataSourceId || '-'}`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
