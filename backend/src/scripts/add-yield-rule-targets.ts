import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addYieldRuleTargets() {
  console.log('========================================');
  console.log('为A02_COPY_1773285414740规则添加分摊目标');
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

  console.log('配置: ' + config.configName + ' (' + config.configCode + ')');
  console.log('规则数: ' + config.rules.length + '\n');

  if (config.rules.length === 0) {
    console.log('❌ 没有找到规则\n');
    return;
  }

  const rule = config.rules[0];
  console.log('规则: ' + rule.ruleName + ' (ID: ' + rule.id + ')\n');

  // 2. 获取间接设备账户
  const indirectAccounts = await prisma.laborAccount.findMany({
    where: {
      name: {
        endsWith: '//间接设备',
      },
    },
  });

  console.log('找到 ' + indirectAccounts.length + ' 个间接设备账户:\n');

  for (const acc of indirectAccounts) {
    console.log('- ID: ' + acc.id + ', 名称: ' + acc.name);
  }
  console.log();

  // 3. 删除所有已存在的目标
  const existingTargets = await prisma.allocationRuleTarget.findMany({
    where: {
      ruleId: rule.id,
    },
  });

  console.log('当前目标数: ' + existingTargets.length);
  if (existingTargets.length > 0) {
    console.log('已存在目标，先删除旧目标');
    // 删除旧目标
    await prisma.allocationRuleTarget.deleteMany({
      where: {
        ruleId: rule.id,
      },
    });
  }
  console.log();

  // 4. 添加新目标
  console.log('========================================');
  console.log('添加分摊目标');
  console.log('========================================\n');

  // 为L1和L2线体添加目标
  const targets = [
    { accountId: 143, name: '富阳工厂/W1总装车间/L1线体////间接设备' },
    { accountId: 144, name: '富阳工厂/W1总装车间/L2线体////间接设备' },
  ];

  for (const target of targets) {
    await prisma.allocationRuleTarget.create({
      data: {
        ruleId: rule.id,
        targetType: 'LABOR_ACCOUNT',
        targetId: target.accountId,
        targetName: target.name,
        weight: 0, // 按产量分摊，权重不重要
      },
    });
    console.log('✓ 已添加目标: ' + target.name);
  }

  console.log();
  console.log('========================================');
  console.log('验证结果');
  console.log('========================================\n');

  const newTargets = await prisma.allocationRuleTarget.findMany({
    where: {
      ruleId: rule.id,
    },
  });

  console.log('当前目标数: ' + newTargets.length + '\n');

  for (const t of newTargets) {
    console.log('- ' + t.targetName);
  }

  console.log('\n========================================');
  console.log('完成！现在可以在界面上重新执行分摊');
  console.log('========================================');
}

addYieldRuleTargets()
  .catch((e) => {
    console.error('添加失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
