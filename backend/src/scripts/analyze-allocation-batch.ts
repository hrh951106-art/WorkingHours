import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeAllocationBatch() {
  console.log('========================================');
  console.log('分析批次号 ALC17733093471128370 的分摊结果');
  console.log('========================================\n');

  const batchNo = 'ALC17733093471128370';

  // 1. 查询分摊结果
  const allocationResults = await prisma.allocationResult.findMany({
    where: {
      batchNo: batchNo,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.log(`找到 ${allocationResults.length} 条分摊记录\n`);

  // 按源账户分组
  const sourceGroups: Record<string, any[]> = {};
  for (const result of allocationResults) {
    const source = result.sourceAccountName || 'Unknown';
    if (!sourceGroups[source]) {
      sourceGroups[source] = [];
    }
    sourceGroups[source].push(result);
  }

  console.log('按源账户分组:\n');

  for (const [sourceAccount, results] of Object.entries(sourceGroups)) {
    console.log(`----------------------------------------`);
    console.log(`源账户: ${sourceAccount}`);
    console.log(`分摊记录数: ${results.length}`);
    console.log(`----------------------------------------`);

    for (const result of results) {
      console.log(`  目标账户: ${result.targetName || 'Unknown'}`);
      console.log(`  分摊工时: ${result.allocatedHours} 小时`);
      console.log(`  出勤代码: ${result.attendanceCode || 'Unknown'}`);
      console.log(`  记录日期: ${result.recordDate.toISOString().split('T')[0]}`);
      console.log();
    }
  }

  // 2. 分析问题
  console.log('========================================');
  console.log('问题分析');
  console.log('========================================\n');

  // 检查是否有跨车间分摊
  let crossWorkshopFound = false;
  for (const result of allocationResults) {
    const sourceAccount = result.sourceAccountName || '';
    const targetAccount = result.targetName || '';

    // 检查源账户和目标账户的车间
    const sourceWorkshop = sourceAccount.includes('W1总装车间') ? 'W1总装车间' :
                          sourceAccount.includes('W2总装车间') ? 'W2总装车间' : 'Unknown';
    const targetWorkshop = targetAccount.includes('W1总装车间') ? 'W1总装车间' :
                          targetAccount.includes('W2总装车间') ? 'W2总装车间' : 'Unknown';

    if (sourceWorkshop !== 'Unknown' && targetWorkshop !== 'Unknown' && sourceWorkshop !== targetWorkshop) {
      if (!crossWorkshopFound) {
        console.log('✗ 发现跨车间分摊:');
        crossWorkshopFound = true;
      }
      console.log(`  源: ${sourceAccount} (${sourceWorkshop})`);
      console.log(`  目标: ${targetAccount} (${targetWorkshop})`);
      console.log(`  工时: ${result.allocatedHours}`);
      console.log();
    }
  }

  if (!crossWorkshopFound) {
    console.log('✓ 没有发现跨车间分摊');
  }

  // 检查是否分摊到了W1车间的产线
  console.log('\n检查W1车间产线的分摊情况:\n');

  const w1LineAccounts = [
    '富阳工厂/W1总装车间/L1产线////间接设备',
    '富阳工厂/W1总装车间/L2产线////间接设备',
  ];

  for (const lineAccount of w1LineAccounts) {
    const results = allocationResults.filter(r => (r.targetName || '') === lineAccount);

    if (results.length > 0) {
      const totalHours = results.reduce((sum, r) => sum + r.allocatedHours, 0);
      console.log(`✓ ${lineAccount}: ${results.length} 条记录, 总计 ${totalHours} 小时`);
    } else {
      console.log(`✗ ${lineAccount}: 没有分摊记录`);
    }
  }

  // 3. 查询L01规则配置
  console.log('\n========================================');
  console.log('L01规则配置');
  console.log('========================================\n');

  const l01Config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'L01',
      deletedAt: null,
    },
    include: {
      sourceConfig: true,
    },
  });

  if (l01Config) {
    console.log(`配置名称: ${l01Config.configName}`);
    console.log(`状态: ${l01Config.status}`);

    const ruleConfigs = await prisma.allocationRuleConfig.findMany({
      where: {
        configId: l01Config.id,
        deletedAt: null,
      },
    });

    for (const ruleConfig of ruleConfigs) {
      console.log(`\n分摊规则: ${ruleConfig.ruleName || '无'}`);
      console.log(`  分摊依据: ${ruleConfig.allocationBasis}`);
      console.log(`  分摊范围ID: ${ruleConfig.allocationScopeId || '无'}`);
      console.log(`  分摊归属层级: ${ruleConfig.allocationHierarchyLevels || '无'}`);

      // 查询分摊范围配置
      if (ruleConfig.allocationScopeId) {
        const scopeConfig = await prisma.accountHierarchyConfig.findUnique({
          where: { id: ruleConfig.allocationScopeId },
        });

        if (scopeConfig) {
          console.log(`\n  分摊范围详情:`);
          console.log(`    名称: ${scopeConfig.name}`);
          console.log(`    层级: ${scopeConfig.level}`);
          console.log(`    映射类型: ${scopeConfig.mappingType}`);
          console.log(`    映射值: ${scopeConfig.mappingValue || '无'}`);
        }
      }
    }
  }

  console.log('\n========================================\n');
}

analyzeAllocationBatch()
  .catch((e) => {
    console.error('分析失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
