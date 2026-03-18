import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkHierarchyConfig() {
  try {
    console.log('=== 检查层级配置 ===\n');

    // 检查车间层级配置
    console.log('1. 检查层级ID=29 (车间) 的配置:');
    const hierarchyConfig = await prisma.accountHierarchyConfig.findUnique({
      where: { id: 29 },
    });

    if (hierarchyConfig) {
      console.log(`   ID: ${hierarchyConfig.id}`);
      console.log(`   Level: ${hierarchyConfig.level}`);
      console.log(`   Name: ${hierarchyConfig.name}`);
      console.log(`   MappingType: ${hierarchyConfig.mappingType || 'N/A'}`);
      console.log(`   MappingValue: ${hierarchyConfig.mappingValue || 'N/A'}`);
    } else {
      console.log('   未找到配置');
    }
    console.log();

    // 检查所有层级配置
    console.log('2. 所有层级配置:');
    const allConfigs = await prisma.accountHierarchyConfig.findMany({
      orderBy: { level: 'asc' },
    });

    allConfigs.forEach((config: any) => {
      console.log(`   - ID: ${config.id}, Level: ${config.level}, Name: ${config.name}, MappingType: ${config.mappingType || 'N/A'}, MappingValue: ${config.mappingValue || 'N/A'}`);
    });

  } catch (error) {
    console.error('检查失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkHierarchyConfig();
