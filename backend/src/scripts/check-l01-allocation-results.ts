import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkL01AllocationResults() {
  console.log('========================================');
  console.log('检查L01分摊结果数据');
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
  console.log(`配置代码: ${l01Config.configCode}`);

  // 2. 查询L01的分摊结果
  console.log('\n第二步：查询L01的分摊结果\n');

  const allocationResults = await prisma.allocationResult.findMany({
    where: {
      configId: l01Config.id,
    },
    orderBy: {
      recordDate: 'desc',
    },
  });

  console.log(`L01分摊结果总数: ${allocationResults.length}\n`);

  if (allocationResults.length === 0) {
    console.log('✗ 没有找到L01的分摊结果');
    console.log('可能原因：');
    console.log('  1. L01规则没有执行过');
    console.log('  2. 执行时没有找到符合条件的工时记录');
    console.log('  3. 分摊结果被删除了');
  } else {
    // 按日期分组显示
    const dateGroups: Record<string, any[]> = {};
    for (const result of allocationResults) {
      const date = result.recordDate.toISOString().split('T')[0];
      if (!dateGroups[date]) {
        dateGroups[date] = [];
      }
      dateGroups[date].push(result);
    }

    console.log('分摊结果详情：\n');

    for (const [date, results] of Object.entries(dateGroups)) {
      console.log(`日期: ${date}`);
      console.log(`  分摊记录数: ${results.length}`);

      // 统计总工时
      const totalHours = results.reduce((sum, r) => sum + (r.allocatedHours || 0), 0);
      console.log(`  总分摊工时: ${totalHours.toFixed(2)}`);

      // 显示批次号
      const batchNos = [...new Set(results.map(r => r.batchNo))];
      console.log(`  批次号: ${batchNos.join(', ')}`);

      // 显示前几条记录详情
      console.log('  前5条记录:');
      for (const result of results.slice(0, 5)) {
        console.log(`    - 源账户: ${result.sourceAccountName || 'Unknown'}`);
        console.log(`      目标: ${result.targetName || 'Unknown'}`);
        console.log(`      分摊工时: ${result.allocatedHours?.toFixed(2) || 0}`);
        console.log(`      规则ID: ${result.ruleId}`);
      }
      console.log();
    }
  }

  // 3. 检查分摊产生的工时记录（CalcResult）
  console.log('第三步：检查分摊产生的工时记录\n');

  // 查询间接设备的工时记录
  const indirectRecords = await prisma.calcResult.findMany({
    where: {
      accountName: {
        endsWith: '间接设备',
      },
    },
    orderBy: {
      calcDate: 'desc',
    },
  });

  console.log(`间接设备工时记录总数: ${indirectRecords.length}\n`);

  if (indirectRecords.length > 0) {
    console.log('间接设备工时记录详情（显示前10条）：\n');

    for (const record of indirectRecords.slice(0, 10)) {
      const code = await prisma.attendanceCode.findUnique({
        where: { id: record.attendanceCodeId || 0 },
      });

      console.log(`  账户: ${record.accountName}`);
      console.log(`  出勤代码: ${code?.code || 'NULL'} (${code?.name || 'Unknown'})`);
      console.log(`  员工: ${record.employeeNo}, 工时: ${record.actualHours}`);
      console.log(`  日期: ${record.calcDate.toISOString().split('T')[0]}`);
      console.log();
    }
  } else {
    console.log('✗ 没有找到间接设备的工时记录');
    console.log('这表明分摊虽然创建了AllocationResult，但没有创建对应的CalcResult');
  }

  // 4. 检查L01规则的配置
  console.log('\n第四步：检查L01规则配置\n');

  const ruleConfigs = await prisma.allocationRuleConfig.findMany({
    where: {
      configId: l01Config.id,
      deletedAt: null,
    },
  });

  console.log(`L01规则配置数量: ${ruleConfigs.length}\n`);

  for (const ruleConfig of ruleConfigs) {
    console.log(`规则ID: ${ruleConfig.id}`);
    console.log(`  规则名称: ${ruleConfig.ruleName || '无'}`);
    console.log(`  分摊依据: ${ruleConfig.allocationBasis}`);
    console.log(`  出勤代码IDs: ${ruleConfig.allocationAttendanceCodes || '无'}`);
    console.log(`  分摊范围ID: ${ruleConfig.allocationScopeId || '无'}`);
    console.log(`  分摊归属层级: ${ruleConfig.allocationHierarchyLevels || '无'}`);
    console.log();
  }

  console.log('========================================\n');
}

checkL01AllocationResults()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
