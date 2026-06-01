import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBatchTargets() {
  const batchNo = 'EHA-1780276636696-3llr2x';
  console.log(`=== 查询批次 ${batchNo} 的目标账户生成逻辑 ===\n`);

  // 1. 查询分摊结果
  console.log('1. 查询分摊结果：');
  const results = await prisma.earnedHoursAllocationResult.findMany({
    where: { batchNo },
    take: 10,
  });

  console.log(`找到 ${results.length} 条记录\n`);

  if (results.length === 0) {
    console.log('未找到分摊结果');
    return;
  }

  for (let i = 0; i < Math.min(results.length, 3); i++) {
    const result = results[i];
    console.log(`记录 ${i + 1}:`);
    console.log(`  ID: ${result.id}`);
    console.log(`  批次号: ${result.batchNo}`);
    console.log(`  员工: ${result.employeeNo}`);
    console.log(`  目标账户ID: ${result.targetAccountId}`);
    console.log(`  目标账户名称: ${result.targetAccountName}`);
    console.log(`  目标账户路径: ${result.targetAccountPath}`);
    console.log(`  分摊工时: ${result.allocatedHours}`);
    console.log(`  生产记录ID: ${result.productionRecordId}`);
    console.log('');
  }

  // 2. 查询批次信息
  console.log('2. 查询批次配置信息：');
  const batch = await prisma.earnedHoursAllocationBatch.findFirst({
    where: { batchNo },
    select: {
      id: true,
      batchNo: true,
      ruleId: true,
      ruleCode: true,
      calcDate: true,
      status: true,
    },
  });

  if (batch) {
    console.log(`  规则ID: ${batch.ruleId}`);
    console.log(`  规则代码: ${batch.ruleCode}`);
    console.log(`  计算日期: ${batch.calcDate}`);
    console.log(`  状态: ${batch.status}`);
    console.log('');
  }

  // 3. 查询规则配置
  if (batch) {
    console.log('3. 查询规则配置：');
    const rule = await prisma.earnedHoursAllocationRule.findFirst({
      where: { id: batch.ruleId },
    });

    if (rule) {
      console.log(`  规则名称: ${rule.ruleName}`);
      console.log(`  分摊基础: ${rule.allocationBasis}`);

      try {
        const targets = JSON.parse(rule.targets || '[]');
        console.log(`  目标账户数量: ${targets.length}`);

        if (targets.length > 0) {
          console.log('\n  目标账户配置详情：');
          targets.forEach((target: any, idx: number) => {
            console.log(`    目标${idx + 1}:`);
            console.log(`      账户ID: ${target.accountId}`);
            console.log(`      分配比例: ${target.allocationRatio || target.ratio || 'N/A'}`);
            console.log(`      优先级: ${target.priority || 'N/A'}`);
          });
        }
      } catch (e) {
        console.log('  解析targets失败:', e);
      }
    }
  }

  // 4. 查询目标账户信息
  console.log('\n4. 查询目标账户详情：');
  const targetAccountIds = [...new Set(results.map(r => r.targetAccountId).filter((id): id is number => id != null))];

  for (const accountId of targetAccountIds.slice(0, 3)) {
    const account = await prisma.laborAccount.findFirst({
      where: { id: accountId },
      select: {
        id: true,
        name: true,
        code: true,
        path: true,
        type: true,
      },
    });

    if (account) {
      console.log(`\n  账户 ID: ${account.id}`);
      console.log(`    名称: ${account.name}`);
      console.log(`    编码: ${account.code}`);
      console.log(`    类型: ${account.type}`);
      console.log(`    路径: ${account.path}`);
    }
  }

  // 5. 分析生成逻辑
  console.log('\n5. 分析目标账户生成逻辑：');

  // 查询工时账户
  console.log('\n  对比工时账户和目标账户：');
  const firstResult = results[0];

  // 查询对应的工时记录
  const workHourResult = await prisma.workHourResult.findFirst({
    where: {
      employeeNo: firstResult.employeeNo,
      workDate: batch?.calcDate,
    },
  });

  if (workHourResult) {
    console.log(`    工时账户ID: ${workHourResult.accountId}`);
    console.log(`    工时账户名称: ${workHourResult.accountName}`);

    const workHourAccount = await prisma.laborAccount.findFirst({
      where: { id: workHourResult.accountId },
      select: { id: true, name: true, code: true },
    });

    if (workHourAccount) {
      console.log(`    工时账户详情: ${workHourAccount.name} (${workHourAccount.code})`);
    }
  }

  console.log(`\n    目标账户ID: ${firstResult.targetAccountId}`);
  console.log(`    目标账户名称: ${firstResult.targetAccountName}`);

  // 查询生产记录
  console.log('\n  对比生产记录账户：');
  const productionRecord = await prisma.productionRecord.findFirst({
    where: { id: firstResult.productionRecordId },
  });

  if (productionRecord) {
    console.log(`    生产记录账户ID: ${productionRecord.orgId}`);
    console.log(`    生产记录账户名称: ${productionRecord.orgName}`);
    console.log(`    产品: ${productionRecord.productName} (ID: ${productionRecord.productId})`);
  }

  // 6. 总结
  console.log('\n=== 总结 ===');
  console.log('目标账户生成逻辑分析：');
  console.log('1. 从工时记录获取员工的工时账户');
  console.log('2. 从生产记录获取生产组织/账户');
  console.log('3. 根据规则配置的targets确定目标账户');
  console.log('4. 按分配比例将工时分摊到目标账户');
}

checkBatchTargets()
  .then(() => {
    console.log('\n查询完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('查询失败:', error);
    process.exit(1);
  });
