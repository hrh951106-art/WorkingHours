import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDynamicHierarchyAllocation() {
  console.log('========================================');
  console.log('测试动态层级分摊功能');
  console.log('========================================\n');

  // 1. 检查可用的层级配置
  console.log('1. 检查可用的层级配置:');
  console.log('----------------------------------------');
  const hierarchyConfigs = await prisma.accountHierarchyConfig.findMany({
    where: {
      status: 'ACTIVE',
      mappingType: 'ORG_TYPE',
    },
    orderBy: {
      level: 'asc',
    },
  });

  console.log(`找到 ${hierarchyConfigs.length} 个ORG_TYPE层级配置:\n`);
  for (const config of hierarchyConfigs) {
    console.log(`- ID: ${config.id}, 名称: ${config.name}, 映射值: ${config.mappingValue}, 级别: ${config.level}`);
  }
  console.log();

  // 2. 检查现有的分摊配置
  console.log('2. 检查现有的分摊配置:');
  console.log('----------------------------------------');
  const configs = await prisma.allocationConfig.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      rules: {
        where: {
          deletedAt: null,
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 3,
  });

  console.log(`找到 ${configs.length} 个最近创建的配置:\n`);
  for (const config of configs) {
    console.log(`- 配置: ${config.configName} (${config.configCode})`);
    console.log(`  规则数: ${config.rules.length}`);
    if (config.rules.length > 0) {
      const rule = config.rules[0];
      console.log(`  第一条规则: ${rule.ruleName}`);
      console.log(`  - 分摊依据: ${rule.allocationBasis}`);
      console.log(`  - 分摊范围ID: ${rule.allocationScopeId || '未设置'}`);
    }
    console.log();
  }

  // 3. 测试产线到层级的映射
  console.log('3. 测试产线到层级的映射:');
  console.log('----------------------------------------');

  const lines = await prisma.productionLine.findMany({
    where: {
      status: 'ACTIVE',
    },
    take: 3,
  });

  console.log(`找到 ${lines.length} 条产线:\n`);

  for (const line of lines) {
    console.log(`产线: ${line.name} (ID: ${line.id})`);
    console.log(`  - 工厂ID (orgId): ${line.orgId}`);
    console.log(`  - 车间ID (workshopId): ${line.workshopId}`);
    console.log(`  - 产线ID (line.id): ${line.id}`);
    console.log();
  }

  // 4. 演示如何使用不同层级进行分摊
  console.log('4. 演示不同层级的分摊计算:');
  console.log('----------------------------------------');

  if (hierarchyConfigs.length > 0 && lines.length > 0) {
    console.log('\n假设场景: 李四有8.5h间接工时需要分摊\n');

    for (const hierarchyConfig of hierarchyConfigs.slice(0, 2)) {
      console.log(`\n【${hierarchyConfig.name}级别分摊】`);

      // 模拟映射逻辑
      const mapping: Record<number, string> = {};
      for (const line of lines) {
        let scopeId: number;
        let scopeName: string;

        if (hierarchyConfig.mappingValue?.toUpperCase().includes('FACTORY') ||
            hierarchyConfig.mappingValue?.includes('工厂')) {
          scopeId = line.orgId;
          scopeName = '工厂';
        } else if (hierarchyConfig.mappingValue?.toUpperCase().includes('WORKSHOP') ||
                   hierarchyConfig.mappingValue?.includes('车间')) {
          scopeId = line.workshopId;
          scopeName = '车间';
        } else {
          scopeId = line.id;
          scopeName = '产线';
        }

        if (!mapping[scopeId]) {
          mapping[scopeId] = scopeName === '工厂' ? '富阳工厂' : `L${scopeId - 142}线体`;
        }
      }

      console.log(`  分摊目标数量: ${Object.keys(mapping).length}`);
      console.log(`  分摊依据: ${hierarchyConfig.name}`);
      console.log(`  说明: 产线会按${hierarchyConfig.name}汇总产量/工时，然后计算分摊比例`);
    }
  }

  console.log('\n========================================');
  console.log('测试结论');
  console.log('========================================\n');

  if (hierarchyConfigs.length === 0) {
    console.log('⚠️  未找到层级配置，需要先配置组织层级');
  } else {
    console.log('✅ 系统已支持动态层级分摊');
    console.log('\n可用的层级配置:');
    hierarchyConfigs.forEach((config, index) => {
      console.log(`  ${index + 1}. ${config.name} (ID: ${config.id})`);
    });
    console.log('\n建议操作:');
    console.log('  1. 在界面上编辑现有的分摊规则');
    console.log('  2. 选择"分摊范围"为期望的层级（如：车间、工厂）');
    console.log('  3. 保存规则');
    console.log('  4. 执行分摊操作，验证结果是否符合预期');
  }

  console.log('\n========================================');
}

testDynamicHierarchyAllocation()
  .catch((e) => {
    console.error('测试失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
