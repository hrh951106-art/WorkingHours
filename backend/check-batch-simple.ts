import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBatchAllocation() {
  const batchNo = 'EHA-1780280539741-tf8qme';
  console.log(`=== 检查批次 ${batchNo} 的分摊情况 ===\n`);

  // 1. 查询分摊结果
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
    },
    orderBy: { sourceEmployeeNo: 'asc' },
  });

  if (results.length === 0) {
    console.log('未找到分摊结果');
    await prisma.$disconnect();
    return;
  }

  console.log(`1. 分摊结果统计：`);
  console.log(`  批次号: ${batchNo}`);
  console.log(`  计算日期: ${results[0].recordDate.toISOString().substring(0, 10)}`);
  console.log(`  配置ID: ${results[0].configId}`);
  console.log(`  分摊记录总数: ${results.length} 条`);

  const uniqueEmployees = [...new Set(results.map(r => r.sourceEmployeeNo))];
  console.log(`  分摊给员工数: ${uniqueEmployees.length} 人\n`);

  console.log('2. 分摊明细（按员工）：');
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

  // 3. 查询工时记录
  console.log('3. 查询计算日期的工时记录：');
  const workHourResults = await prisma.workHourResult.findMany({
    where: { workDate: results[0].recordDate },
    select: {
      id: true,
      employeeNo: true,
      accountId: true,
      accountName: true,
      workHours: true,
    },
    orderBy: { employeeNo: 'asc' },
  });

  const uniqueWorkHourEmployees = [...new Set(workHourResults.map(r => r.employeeNo))];
  console.log(`  工时记录数: ${workHourResults.length} 条`);
  console.log(`  有工时的员工数: ${uniqueWorkHourEmployees.length} 人\n`);

  // 4. 对比分析
  console.log('4. 对比分析：');
  const employeesWithWorkHour = new Set(uniqueWorkHourEmployees);
  const employeesWithAllocation = new Set(uniqueEmployees);
  const employeesWithoutAllocation = uniqueWorkHourEmployees.filter(
    empNo => !employeesWithAllocation.has(empNo)
  );

  console.log(`  有工时员工数: ${uniqueWorkHourEmployees.length} 人`);
  console.log(`  已分摊员工数: ${uniqueEmployees.length} 人`);
  console.log(`  未分摊员工数: ${employeesWithoutAllocation.length} 人\n`);

  if (employeesWithoutAllocation.length > 0) {
    console.log('5. ⚠️ 有工时但未分摊的员工详情：');
    employeesWithoutAllocation.forEach((empNo) => {
      const whRecords = workHourResults.filter(r => r.employeeNo === empNo);
      const totalHours = whRecords.reduce((sum, r) => sum + (r.workHours || 0), 0);
      console.log(`  员工 ${empNo}:`);
      console.log(`    总工时: ${totalHours}`);
      console.log(`    账户数: ${whRecords.length}`);
      whRecords.forEach((wh) => {
        console.log(`      - 账户 ${wh.accountId}: ${wh.accountName}, 工时: ${wh.workHours}`);
      });
    });
  } else {
    console.log('5. ✅ 所有有工时的员工都已分摊');
  }
  console.log('');

  // 6. 查询配置
  console.log('6. 查询分摊配置：');
  const config = await prisma.earnedHoursAllocationConfig.findFirst({
    where: { id: results[0].configId },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
    },
  });

  if (config) {
    console.log(`  配置名称: ${config.name}`);
    console.log(`  配置代码: ${config.code}`);
    console.log(`  状态: ${config.status}`);
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
