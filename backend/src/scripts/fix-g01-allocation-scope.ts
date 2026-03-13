import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixG01AllocationScope() {
  console.log('========================================');
  console.log('修复G01配置的分摊范围');
  console.log('========================================\n');

  // 1. 查看当前配置
  console.log('1. 查看当前G01配置:');
  console.log('----------------------------------------');
  const g01Config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'G01',
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

  if (!g01Config) {
    console.log('未找到G01配置\n');
    await prisma.$disconnect();
    return;
  }

  console.log(`配置代码: ${g01Config.configCode}`);
  console.log(`配置名称: ${g01Config.configName}`);
  console.log(`配置ID: ${g01Config.id}\n`);

  for (const rule of g01Config.rules) {
    console.log(`规则ID: ${rule.id}`);
    console.log(`规则名称: ${rule.ruleName}`);
    console.log(`分摊依据: ${rule.allocationBasis}`);
    console.log(`当前分摊范围ID: ${rule.allocationScopeId || '未设置'}`);
    console.log();

    // 2. 更新分摊范围为工厂级别
    console.log('2. 更新分摊范围:');
    console.log('----------------------------------------');

    // 工厂层级的ID是28
    const factoryHierarchyId = 28;

    const updatedRule = await prisma.allocationRuleConfig.update({
      where: { id: rule.id },
      data: {
        allocationScopeId: factoryHierarchyId,
      },
    });

    console.log(`✓ 已更新规则 ${updatedRule.ruleName} 的分摊范围`);
    console.log(`  旧值: ${rule.allocationScopeId || '未设置'}`);
    console.log(`  新值: ${updatedRule.allocationScopeId} (工厂级别)`);

    // 3. 验证更新
    const hierarchyConfig = await prisma.accountHierarchyConfig.findUnique({
      where: { id: factoryHierarchyId },
    });

    console.log(`\n分摊范围详情:`);
    console.log(`  名称: ${hierarchyConfig?.name}`);
    console.log(`  映射值: ${hierarchyConfig?.mappingValue}`);
    console.log(`  级别: ${hierarchyConfig?.level}`);
    console.log();
  }

  // 4. 说明影响
  console.log('========================================');
  console.log('更新说明');
  console.log('========================================\n');

  console.log('✓ G01配置的分摊范围已设置为工厂级别\n');

  console.log('影响:');
  console.log('  系统现在会按照工厂汇总所有开线产线的产量，');
  console.log('  然后根据各产线所在工厂的产量占比进行分摊。\n');

  console.log('计算逻辑示例:');
  console.log('  假设3月11日有以下开线：');
  console.log('  - L1产线: 生产3000件，工厂=L1线体(ID:7)');
  console.log('  - L2产线: 生产2000件，工厂=L2线体(ID:8)');
  console.log('  - L3产线: 生产1000件，工厂=W2总装(ID:9)  【假设】');
  console.log('  ');
  console.log('  按工厂汇总产量:');
  console.log('  - L1线体工厂: 3000件');
  console.log('  - L2线体工厂: 2000件');
  console.log('  - W2总装工厂: 1000件');
  console.log('  - 工厂总计: 6000件');
  console.log('  ');
  console.log('  分摊比例（假设某人有8小时间接工时）:');
  console.log('  - L1产线: 8 × (3000/6000) = 4小时');
  console.log('  - L2产线: 8 × (2000/6000) = 2.67小时');
  console.log('  - L3产线: 8 × (1000/6000) = 1.33小时');
  console.log('  ');
  console.log('注意事项:');
  console.log('  ⚠️  当前系统中没有W2总装车间/L3线体的数据');
  console.log('  如果需要在分摊中包含L3，请先创建L3产线并在3月11日创建开线记录');
  console.log('========================================');
}

fixG01AllocationScope()
  .catch((e) => {
    console.error('修复失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
