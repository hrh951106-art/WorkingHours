import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAllocationScope() {
  console.log('========================================');
  console.log('批量修改分摊规则的allocationScopeId');
  console.log('========================================\n');

  // 1. 查找车间和工厂级别的层级配置
  console.log('1. 查找层级配置:');
  console.log('----------------------------------------');

  const workshopHierarchy = await prisma.accountHierarchyConfig.findFirst({
    where: {
      mappingType: 'ORG_TYPE',
      mappingValue: 'DEPARTMENT',
      status: 'ACTIVE',
    },
  });

  const factoryHierarchy = await prisma.accountHierarchyConfig.findFirst({
    where: {
      mappingType: 'ORG_TYPE',
      mappingValue: 'COMPANY',
      status: 'ACTIVE',
    },
  });

  if (!workshopHierarchy || !factoryHierarchy) {
    console.log('❌ 未找到必要的层级配置');
    await prisma.$disconnect();
    return;
  }

  console.log(`车间级别: ${workshopHierarchy.name} (ID: ${workshopHierarchy.id})`);
  console.log(`工厂级别: ${factoryHierarchy.name} (ID: ${factoryHierarchy.id})`);
  console.log();

  // 2. 定义需要修改的规则
  console.log('2. 修改规则配置:');
  console.log('----------------------------------------');

  const updates = [
    // 改为车间级别
    { configCode: 'L01', scopeId: workshopHierarchy.id, scopeName: workshopHierarchy.name },
    { configCode: 'L02', scopeId: workshopHierarchy.id, scopeName: workshopHierarchy.name },
    { configCode: 'L03', scopeId: workshopHierarchy.id, scopeName: workshopHierarchy.name },
    { configCode: 'L04', scopeId: workshopHierarchy.id, scopeName: workshopHierarchy.name },
    // 改为工厂级别
    { configCode: 'G01', scopeId: factoryHierarchy.id, scopeName: factoryHierarchy.name },
    { configCode: 'G02', scopeId: factoryHierarchy.id, scopeName: factoryHierarchy.name },
    { configCode: 'G01_COPY_1773296830745', scopeId: factoryHierarchy.id, scopeName: factoryHierarchy.name },
  ];

  let updateCount = 0;

  for (const update of updates) {
    // 查找配置
    const config = await prisma.allocationConfig.findFirst({
      where: {
        configCode: update.configCode,
        deletedAt: null,
      },
      include: {
        rules: {
          where: {
            deletedAt: null,
          },
        },
      },
    });

    if (!config) {
      console.log(`⚠️  未找到配置: ${update.configCode}`);
      continue;
    }

    // 更新规则
    for (const rule of config.rules) {
      await prisma.allocationRuleConfig.update({
        where: { id: rule.id },
        data: {
          allocationScopeId: update.scopeId,
        },
      });

      console.log(`✓ ${update.configCode} - ${rule.ruleName}`);
      console.log(`  allocationScopeId: ${rule.allocationScopeId} → ${update.scopeId} (${update.scopeName})`);
      updateCount++;
    }
  }

  console.log();
  console.log(`总共更新了 ${updateCount} 条规则`);
  console.log();

  // 3. 验证修改结果
  console.log('========================================');
  console.log('验证修改结果');
  console.log('========================================\n');

  const allConfigs = await prisma.allocationConfig.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      rules: {
        where: {
          deletedAt: null,
        },
      },
    },
    orderBy: {
      configCode: 'asc',
    },
  });

  console.log('所有规则的分摊范围:\n');

  for (const config of allConfigs) {
    for (const rule of config.rules) {
      let scopeName = '未设置';
      let scopeInfo = '';

      if (rule.allocationScopeId) {
        const hierarchyConfig = await prisma.accountHierarchyConfig.findUnique({
          where: { id: rule.allocationScopeId },
        });
        if (hierarchyConfig) {
          scopeName = hierarchyConfig.name;
          scopeInfo = ` (ID: ${rule.allocationScopeId})`;
        }
      }

      const mark = (rule.allocationScopeId === workshopHierarchy.id) ? '🏭 ' :
                   (rule.allocationScopeId === factoryHierarchy.id) ? '🏭 ' : '⚠️ ';

      console.log(`${mark}${config.configCode} - ${rule.ruleName}`);
      console.log(`  分摊范围: ${scopeName}${scopeInfo}`);
    }
    console.log();
  }

  // 4. 统计
  console.log('========================================');
  console.log('统计汇总');
  console.log('========================================\n');

  let workshopCount = 0;
  let factoryCount = 0;
  let nullCount = 0;

  for (const config of allConfigs) {
    for (const rule of config.rules) {
      if (rule.allocationScopeId === workshopHierarchy.id) {
        workshopCount++;
      } else if (rule.allocationScopeId === factoryHierarchy.id) {
        factoryCount++;
      } else if (!rule.allocationScopeId) {
        nullCount++;
      }
    }
  }

  console.log(`车间级别规则: ${workshopCount} 条`);
  console.log(`工厂级别规则: ${factoryCount} 条`);
  console.log(`未设置分摊范围: ${nullCount} 条`);
  console.log();

  console.log('========================================');
  console.log('修复完成');
  console.log('========================================\n');

  console.log('✓ L01、L02、L03、L04 已设置为车间级别');
  console.log('✓ G01、G02、G01_COPY 已设置为工厂级别');
  console.log('\n建议操作:');
  console.log('  重新执行分摊操作，验证分摊结果是否符合预期');
  console.log('========================================');
}

updateAllocationScope()
  .catch((e) => {
    console.error('修改失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
