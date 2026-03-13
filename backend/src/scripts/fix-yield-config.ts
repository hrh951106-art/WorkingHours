import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixYieldConfig() {
  console.log('========================================');
  console.log('修复A02_COPY_1773285414740配置');
  console.log('========================================\n');

  // 1. 获取配置
  const config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'A02_COPY_1773285414740',
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
    console.log('❌ 未找到配置\n');
    return;
  }

  console.log(`配置: ${config.configName} (${config.configCode})\n`);

  // 2. 查看当前规则
  console.log('当前规则:');
  config.rules.forEach((rule, idx) => {
    console.log(`  规则${idx + 1}: ${rule.ruleName}`);
    const levels = JSON.parse(rule.allocationHierarchyLevels || '[]');
    console.log(`    分配归属层级: ${levels.length > 0 ? levels : '[]'} (空=全部层级)`);
  });
  console.log();

  // 3. 修复：将分配归属层级设置为空数组，表示分摊到所有层级
  console.log('========================================');
  console.log('修复配置：清空分配归属层级');
  console.log('========================================\n');

  if (config.rules.length > 0) {
    const rule = config.rules[0];

    await prisma.allocationRuleConfig.update({
      where: { id: rule.id },
      data: {
        allocationHierarchyLevels: '[]', // 空数组表示包含所有层级
      },
    });

    console.log('✓ 已将分配归属层级设置为空数组');
    console.log('  现在该规则会分摊到所有产线，不进行层级过滤\n');
  }

  // 4. 验证修复
  console.log('========================================');
  console.log('验证修复结果');
  console.log('========================================\n');

  const updatedConfig = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'A02_COPY_1773285414740',
    },
    include: {
      rules: {
        where: {
          deletedAt: null,
        },
      },
    },
  });

  updatedConfig?.rules.forEach((rule, idx) => {
    const levels = JSON.parse(rule.allocationHierarchyLevels || '[]');
    console.log(`规则${idx + 1}: ${rule.ruleName}`);
    console.log(`  分配归属层级: ${levels.length > 0 ? levels : '[] (空=全部层级)'}`);
  });

  console.log('\n========================================');
  console.log('后续步骤:');
  console.log('========================================\n');
  console.log('1. 配置已修复');
  console.log('2. 请在界面上重新执行 A02_COPY_1773285414740 的分摊操作');
  console.log('3. 应该会看到按实际产量分摊的结果：');
  console.log('   - L1产线 (3000产量): 5.1h');
  console.log('   - L2产线 (2000产量): 3.4h');
  console.log('\n========================================');
}

fixYieldConfig()
  .catch((e) => {
    console.error('修复失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
