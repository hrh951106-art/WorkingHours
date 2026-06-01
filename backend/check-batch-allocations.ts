import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBatchAllocation() {
  const batchNo = 'EHA-1780280539741-tf8qme';
  console.log(`=== 检查批次 ${batchNo} 的分摊情况 ===\n`);

  // 1. 先查询分摊结果来获取批次信息
  const results = await prisma.earnedHoursAllocationResult.findMany({
    where: { batchNo },
    select: {
      id: true,
      batchNo: true,
      recordDate: true,
      configId: true,
      sourceEmployeeNo: true,
      sourceEmployeeName: true,
      sourceAccountId: true,
      sourceAccountName: true,
      sourceHours: true,
      allocatedHours: true,
      productionRecordId: true,
    },
    orderBy: { sourceEmployeeNo: 'asc' },
  });

  if (results.length === 0) {
    console.log('未找到分摊结果');
    await prisma.$disconnect();
    return;
  }

  console.log(`1. 批次信息：`);
  console.log(`  批次号: ${batchNo}`);
  console.log(`  计算日期: ${results[0].recordDate.toISOString().substring(0, 10)}`);
  console.log(`  配置ID: ${results[0].configId}`);
  console.log('');

  console.log(`2. 分摊结果总数: ${results.length} 条\n`);

  // 统计唯一员工数
  const uniqueEmployees = [...new Set(results.map(r => r.sourceEmployeeNo))];
  console.log(`  分摊给员工数: ${uniqueEmployees.length} 人\n`);

  console.log('分摊明细：');
  const employeeSummary = new Map();
  results.forEach((result) => {
    if (!employeeSummary.has(result.sourceEmployeeNo)) {
      employeeSummary.set(result.sourceEmployeeNo, {
        employeeNo: result.sourceEmployeeNo,
        employeeName: result.sourceEmployeeName,
        recordCount: 0,
        totalSourceHours: 0,
        totalAllocatedHours: 0,
      });
    }
    const summary = employeeSummary.get(result.sourceEmployeeNo);
    summary.recordCount++;
    summary.totalSourceHours += result.sourceHours;
    summary.totalAllocatedHours += result.allocatedHours;
  });

  uniqueEmployees.forEach((employeeNo) => {
    const summary = employeeSummary.get(employeeNo);
    console.log(`  员工 ${employeeNo} (${summary.employeeName}):`);
    console.log(`    分摊记录数: ${summary.recordCount}`);
    console.log(`    源工时总计: ${summary.totalSourceHours}`);
    console.log(`    分摊工时总计: ${summary.totalAllocatedHours}`);
    console.log('');
  });

  // 3. 查询规则配置
  console.log('3. 规则配置：');
  const rule = await prisma.earnedHoursAllocationRule.findFirst({
    where: { id: batch.ruleId },
  });

  if (rule) {
    console.log(`  规则名称: ${rule.ruleName}`);
    console.log(`  分摊基础: ${rule.allocationBasis}`);
    console.log(`  状态: ${rule.status}`);

    try {
      const targets = JSON.parse(rule.targets || '[]');
      console.log(`  目标账户数量: ${targets.length}`);

      if (targets.length > 0) {
        console.log('\n  目标账户配置：');
        targets.forEach((target: any, idx: number) => {
          console.log(`    目标${idx + 1}: 账户ID=${target.accountId}, 分配比例=${target.allocationRatio || target.ratio || 'N/A'}`);
        });
      }
    } catch (e) {
      console.log('  解析targets失败:', e);
    }
  }
  console.log('');

  // 4. 查询计算日期的工时记录（看看应该有多少人）
  console.log('4. 查询计算日期的工时记录：');
  const workHourResults = await prisma.workHourResult.findMany({
    where: { workDate: batch.calcDate },
    select: {
      id: true,
      employeeNo: true,
      employeeName: true,
      accountId: true,
      accountName: true,
      reportedHours: true,
    },
    orderBy: { employeeNo: 'asc' },
  });

  const uniqueWorkHourEmployees = [...new Set(workHourResults.map(r => r.employeeNo))];
  console.log(`  工时记录数: ${workHourResults.length} 条`);
  console.log(`  有工时的员工数: ${uniqueWorkHourEmployees.length} 人\n`);

  // 5. 对比：哪些人有工时但没有分摊
  const employeesWithWorkHour = new Set(uniqueWorkHourEmployees);
  const employeesWithAllocation = new Set(uniqueEmployees);

  const employeesWithoutAllocation = uniqueWorkHourEmployees.filter(
    empNo => !employeesWithAllocation.has(empNo)
  );

  if (employeesWithoutAllocation.length > 0) {
    console.log('5. ⚠️ 有工时但未分摊的员工：');
    employeesWithoutAllocation.forEach((empNo) => {
      const whRecords = workHourResults.filter(r => r.employeeNo === empNo);
      const totalHours = whRecords.reduce((sum, r) => sum + (r.reportedHours || 0), 0);
      console.log(`  员工 ${empNo}:`);
      console.log(`    总工时: ${totalHours}`);
      console.log(`    账户数: ${whRecords.length}`);
      whRecords.forEach((wh) => {
        console.log(`      - 账户 ${wh.accountId}: ${wh.accountName}, 工时: ${wh.reportedHours}`);
      });
    });
  } else {
    console.log('5. ✅ 所有有工时的员工都已分摊');
  }
  console.log('');

  // 6. 检查生产记录
  console.log('6. 检查生产记录：');
  const productionRecords = await prisma.productionRecord.findMany({
    where: {
      productionDate: batch.calcDate,
      productId: 15, // A01产品
    },
    select: {
      id: true,
      productName: true,
      productOutput: true,
    },
    take: 5,
  });

  console.log(`  找到 ${productionRecords.length} 条生产记录`);
  if (productionRecords.length > 0) {
    productionRecords.forEach((pr) => {
      console.log(`    记录 ${pr.id}: ${pr.productName}, 产量: ${pr.productOutput}`);
    });
  }

  await prisma.$disconnect();
}

checkBatchAllocation()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
