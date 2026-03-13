import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixExistingRulesAllocationScope() {
  console.log('========================================');
  console.log('批量修复遗留规则的allocationScopeId');
  console.log('========================================\n');

  // 1. 查找所有未设置allocationScopeId的规则
  console.log('1. 查找需要修复的规则:');
  console.log('----------------------------------------');

  const rulesToUpdate = await prisma.allocationRuleConfig.findMany({
    where: {
      allocationScopeId: null,
      deletedAt: null,
    },
    include: {
      config: true,
    },
  });

  console.log(`找到 ${rulesToUpdate.length} 条需要修复的规则:\n`);

  for (const rule of rulesToUpdate) {
    console.log(`- ${rule.config.configCode} - ${rule.ruleName}`);
    console.log(`  规则ID: ${rule.id}`);
    console.log(`  分摊依据: ${rule.allocationBasis}`);
  }
  console.log();

  if (rulesToUpdate.length === 0) {
    console.log('没有需要修复的规则');
    await prisma.$disconnect();
    return;
  }

  // 2. 确定默认的分摊范围
  console.log('2. 确定默认分摊范围:');
  console.log('----------------------------------------');

  // 查找工厂级别的层级配置
  const factoryHierarchy = await prisma.accountHierarchyConfig.findFirst({
    where: {
      mappingType: 'ORG_TYPE',
      mappingValue: 'COMPANY',
      status: 'ACTIVE',
    },
    orderBy: {
      level: 'asc',
    },
  });

  if (!factoryHierarchy) {
    console.log('❌ 未找到工厂级别的层级配置');
    await prisma.$disconnect();
    return;
  }

  console.log(`✓ 使用默认分摊范围: ${factoryHierarchy.name} (ID: ${factoryHierarchy.id})`);
  console.log();

  // 3. 批量更新规则
  console.log('3. 批量更新规则:');
  console.log('----------------------------------------');

  let updateCount = 0;
  for (const rule of rulesToUpdate) {
    await prisma.allocationRuleConfig.update({
      where: { id: rule.id },
      data: {
        allocationScopeId: factoryHierarchy.id,
      },
    });

    console.log(`✓ 已更新: ${rule.config.configCode} - ${rule.ruleName}`);
    console.log(`  allocationScopeId: null → ${factoryHierarchy.id}`);
    updateCount++;
  }
  console.log();

  console.log(`总共更新了 ${updateCount} 条规则`);
  console.log();

  // 4. 验证更新结果
  console.log('========================================');
  console.log('验证更新结果');
  console.log('========================================\n');

  const allRules = await prisma.allocationRuleConfig.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      config: true,
    },
    orderBy: {
      config: {
        configCode: 'asc',
      },
    },
  });

  const rulesWithoutScope = allRules.filter(r => r.allocationScopeId === null);
  const rulesWithScope = allRules.filter(r => r.allocationScopeId !== null);

  console.log(`总规则数: ${allRules.length}`);
  console.log(`已设置allocationScopeId: ${rulesWithScope.length}`);
  console.log(`未设置allocationScopeId: ${rulesWithoutScope.length}`);
  console.log();

  if (rulesWithScope.length > 0) {
    console.log('已设置allocationScopeId的规则:\n');

    const scopeCountMap = new Map<number, number>();
    for (const rule of rulesWithScope) {
      const count = scopeCountMap.get(rule.allocationScopeId || 0) + 1;
      scopeCountMap.set(rule.allocationScopeId || 0, count);
    }

    for (const [scopeId, count] of scopeCountMap.entries()) {
      const hierarchyConfig = await prisma.accountHierarchyConfig.findUnique({
        where: { id: scopeId },
      });

      if (hierarchyConfig) {
        console.log(`  - ${hierarchyConfig.name}: ${count} 条规则`);
      }
    }
  }

  console.log('\n========================================');
  console.log('修复完成');
  console.log('========================================\n');

  console.log('✓ 所有遗留规则已设置allocationScopeId');
  console.log('✓ 新创建的规则将自动保存allocationScopeId');
  console.log('\n建议操作:');
  console.log('  在界面上重新执行分摊操作，验证分摊结果');
  console.log('========================================');
}

fixExistingRulesAllocationScope()
  .catch((e) => {
    console.error('修复失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
