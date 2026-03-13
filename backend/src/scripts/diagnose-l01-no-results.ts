import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseL01NoResults() {
  console.log('========================================');
  console.log('诊断L01分摊结果页面无数据问题');
  console.log('========================================\n');

  // 1. 查询L01配置
  console.log('第一步：查询L01配置\n');

  const l01Config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'L01',
      deletedAt: null,
    },
  });

  if (!l01Config) {
    console.log('✗ 未找到L01配置');
    await prisma.$disconnect();
    return;
  }

  console.log(`L01配置ID: ${l01Config.id}`);
  console.log(`配置名称: ${l01Config.configName}`);
  console.log(`配置状态: ${l01Config.status}`);

  // 2. 查询所有AllocationResult记录
  console.log('\n第二步：查询所有AllocationResult记录\n');

  const allAllocationResults = await prisma.allocationResult.findMany({
    orderBy: {
      recordDate: 'desc',
    },
    take: 20,
  });

  console.log(`AllocationResult记录总数（最近20条）: ${allAllocationResults.length}\n`);

  if (allAllocationResults.length === 0) {
    console.log('✗ 没有任何AllocationResult记录');
  } else {
    for (const result of allAllocationResults) {
      console.log(`批次号: ${result.batchNo}`);
      console.log(`  日期: ${result.recordDate.toISOString().split('T')[0]}`);
      console.log(`  配置ID: ${result.configId}`);
      console.log(`  源账户: ${result.sourceAccountName || 'Unknown'}`);
      console.log(`  目标: ${result.targetName || 'Unknown'}`);
      console.log(`  分摊工时: ${result.allocatedHours || 0}`);
      console.log();
    }
  }

  // 3. 查询L01的AllocationResult
  console.log('\n第三步：查询L01的AllocationResult记录\n');

  const l01Results = await prisma.allocationResult.findMany({
    where: {
      configId: l01Config.id,
    },
  });

  console.log(`L01的AllocationResult记录数: ${l01Results.length}\n`);

  if (l01Results.length === 0) {
    console.log('✗ L01没有分摊结果记录（AllocationResult）');
    console.log('可能原因：');
    console.log('  1. 分摊逻辑没有创建AllocationResult');
    console.log('  2. AllocationResult被清理逻辑删除了');
    console.log('  3. 创建AllocationResult时出错但没有抛出异常');
  }

  // 4. 查询间接设备的CalcResult记录
  console.log('\n第四步：查询间接设备的CalcResult记录\n');

  const indirectCalcResults = await prisma.calcResult.findMany({
    where: {
      accountName: {
        endsWith: '间接设备',
      },
    },
    orderBy: {
      calcDate: 'desc',
    },
    take: 20,
  });

  console.log(`间接设备CalcResult记录数: ${indirectCalcResults.length}\n`);

  if (indirectCalcResults.length > 0) {
    console.log('间接设备工时记录详情：\n');

    // 按账户分组
    const accountGroups: Record<string, any[]> = {};
    for (const record of indirectCalcResults) {
      if (!accountGroups[record.accountName]) {
        accountGroups[record.accountName] = [];
      }
      accountGroups[record.accountName].push(record);
    }

    for (const [accountName, records] of Object.entries(accountGroups)) {
      const totalHours = records.reduce((sum, r) => sum + (r.actualHours || 0), 0);
      console.log(`账户: ${accountName}`);
      console.log(`  记录数: ${records.length}, 总工时: ${totalHours.toFixed(2)}`);

      // 检查这些记录是否有对应的AllocationResult
      const hasAllocationResult = await prisma.allocationResult.findFirst({
        where: {
          sourceAccountName: accountName,
        },
      });

      if (hasAllocationResult) {
        console.log(`  ✓ 有对应的AllocationResult`);
      } else {
        console.log(`  ✗ 没有对应的AllocationResult（这是问题所在！）`);
      }
      console.log();
    }
  }

  // 5. 检查后端日志中的关键信息
  console.log('第五步：分析问题\n');

  console.log('可能的问题：');
  console.log('1. AllocationResult被清理逻辑删除了');
  console.log('2. 创建AllocationResult的代码没有执行');
  console.log('3. 创建AllocationResult后又被事务回滚了');
  console.log('4. 查询页面的过滤条件有问题');

  console.log('\n建议检查：');
  console.log('- allocation.service.ts 中的清理逻辑');
  console.log('- 创建AllocationResult和CalcResult的顺序');
  console.log('- 是否使用了事务但回滚了');
  console.log('- 前端查询接口的过滤条件');

  console.log('\n========================================\n');
}

diagnoseL01NoResults()
  .catch((e) => {
    console.error('诊断失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
