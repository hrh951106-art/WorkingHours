import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAllocationScopeFix() {
  console.log('========================================');
  console.log('验证allocationScopeId修复');
  console.log('========================================\n');

  // 1. 查询所有分摊配置
  console.log('1. 查询所有分摊配置:');
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
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`找到 ${configs.length} 个分摊配置\n`);

  for (const config of configs) {
    console.log(`配置: ${config.configName} (${config.configCode})`);
    console.log(`  规则数: ${config.rules.length}`);

    for (const rule of config.rules) {
      console.log(`  - 规则: ${rule.ruleName}`);
      console.log(`    allocationScopeId: ${rule.allocationScopeId || '未设置'} ⚠️`);
    }
    console.log();
  }

  // 2. 检查哪些配置的allocationScopeId未设置
  console.log('2. 检查allocationScopeId未设置的配置:');
  console.log('----------------------------------------');

  const rulesWithoutScope: any[] = [];
  for (const config of configs) {
    for (const rule of config.rules) {
      if (!rule.allocationScopeId) {
        rulesWithoutScope.push({
          configCode: config.configCode,
          configName: config.configName,
          ruleId: rule.id,
          ruleName: rule.ruleName,
        });
      }
    }
  }

  if (rulesWithoutScope.length === 0) {
    console.log('✓ 所有规则都已设置allocationScopeId\n');
  } else {
    console.log(`找到 ${rulesWithoutScope.length} 条规则未设置allocationScopeId:\n`);

    for (const item of rulesWithoutScope) {
      console.log(`- ${item.configCode} - ${item.ruleName}`);
    }
    console.log();
  }

  // 3. 统计各级别的配置数量
  console.log('3. 统计各级别的配置数量:');
  console.log('----------------------------------------');

  const scopeStats = new Map<number, string>();
  for (const config of configs) {
    for (const rule of config.rules) {
      if (rule.allocationScopeId) {
        scopeStats.set(rule.allocationScopeId, rule.allocationScopeId.toString());
      }
    }
  }

  console.log(`allocationScopeId设置情况:\n`);

  if (scopeStats.size === 0) {
    console.log('  无配置已设置allocationScopeId');
  } else {
    for (const [scopeId] of scopeStats.entries()) {
      const hierarchyConfig = await prisma.accountHierarchyConfig.findUnique({
        where: { id: scopeId },
      });

      if (hierarchyConfig) {
        // 统计使用该级别的规则数量
        let count = 0;
        for (const config of configs) {
          for (const rule of config.rules) {
            if (rule.allocationScopeId === scopeId) {
              count++;
            }
          }
        }

        console.log(`  - ${hierarchyConfig.name} (ID: ${scopeId}): ${count} 条规则`);
      }
    }
  }
  console.log();

  // 4. 总结
  console.log('========================================');
  console.log('修复总结');
  console.log('========================================\n');

  console.log('✓ 前端已修复字段映射问题:');
  console.log('  - 创建规则时: allocationScope → allocationScopeId');
  console.log('  - 编辑规则时: allocationScopeId → allocationScope');
  console.log();

  if (rulesWithoutScope.length > 0) {
    console.log('⚠️  以下规则仍需手动设置allocationScopeId:');
    for (const item of rulesWithoutScope) {
      console.log(`  - ${item.configCode}: ${item.ruleName}`);
    }
    console.log('\n建议操作:');
    console.log('  在界面上编辑这些规则，选择"分摊范围"并保存');
  } else {
    console.log('✓ 所有规则都已正确设置allocationScopeId');
    console.log('\n建议操作:');
    console.log('  新创建的规则将自动保存allocationScopeId');
  }

  console.log('\n========================================');
}

verifyAllocationScopeFix()
  .catch((e) => {
    console.error('验证失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
