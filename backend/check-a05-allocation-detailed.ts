import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkA05Allocation() {
  console.log('=== 检查A05间接工时规则分摊计算问题 ===\n');

  // 1. 查找A05规则
  console.log('1. 查找A05规则配置:');
  const a05Rules = await prisma.allocationRuleConfig.findMany({
    where: { code: 'A05' },
    include: { config: true }
  });

  if (a05Rules.length === 0) {
    console.log('  ❌ 没有找到代码为A05的规则');
    return;
  }

  console.log(`  找到 ${a05Rules.length} 条A05规则`);
  a05Rules.forEach((rule, index) => {
    console.log(`\n  规则 ${index + 1}:`);
    console.log(`    ID: ${rule.id}`);
    console.log(`    名称: ${rule.name}`);
    console.log(`    配置ID: ${rule.configId}`);
    console.log(`    分摊依据: ${rule.allocationBasis}`);
    console.log(`    规则类型: ${rule.ruleType}`);
    console.log(`    状态: ${rule.isActive ? '激活' : '未激活'}`);
    console.log(`    分配归属层级: ${rule.allocationHierarchyLevels || '未设置'}`);
    console.log(`    分配范围类型: ${rule.allocationScopeType || '未设置'}`);
  });

  // 2. 检查最近的计算结果
  console.log('\n2. 检查最近的分摊结果:');
  const recentAllocations = await prisma.allocationResult.findMany({
    where: { ruleId: { in: a05Rules.map(r => r.id) } },
    orderBy: { createTime: 'desc' },
    take: 10
  });

  console.log(`  找到 ${recentAllocations.length} 条分摊结果记录`);
  if (recentAllocations.length > 0) {
    recentAllocations.forEach((alloc, index) => {
      console.log(`\n  记录 ${index + 1}:`);
      console.log(`    批次号: ${alloc.batchNo}`);
      console.log(`    日期: ${alloc.recordDate}`);
      console.log(`    来源员工: ${alloc.sourceEmployeeNo} - ${alloc.sourceEmployeeName}`);
      console.log(`    来源工时: ${alloc.sourceHours}`);
      console.log(`    目标: ${alloc.targetType} - ${alloc.targetName}`);
      console.log(`    分摊工时: ${alloc.allocatedHours}`);
      console.log(`    创建时间: ${alloc.createTime}`);
    });
  } else {
    console.log('  ❌ 没有找到任何分摊结果');
  }

  // 3. 检查计算结果中是否有A05相关的考勤代码
  console.log('\n3. 检查是否有可以分摊的A05考勤代码计算结果:');
  const calcResults = await prisma.calcResult.findMany({
    where: {
      attendanceCode: 'A05'
    },
    orderBy: { calcDate: 'desc' },
    take: 5,
    include: { employee: true }
  });

  console.log(`  找到 ${calcResults.length} 条A05考勤代码的计算结果`);
  if (calcResults.length > 0) {
    calcResults.forEach((result, index) => {
      console.log(`\n  记录 ${index + 1}:`);
      console.log(`    员工: ${result.employeeNo} - ${result.employee.name}`);
      console.log(`    日期: ${result.calcDate}`);
      console.log(`    实际工时: ${result.actualHours}`);
      console.log(`    账户: ${result.accountName} (ID: ${result.accountId})`);
    });
  } else {
    console.log('  ❌ 没有找到A05考勤代码的计算结果');
  }

  // 4. 检查A05规则的配置详情
  console.log('\n4. 检查A05规则的详细配置:');
  for (const rule of a05Rules) {
    console.log(`\n  规则ID ${rule.id} 的配置:`);
    console.log(`    分摊依据过滤器: ${rule.basisFilter || '未设置'}`);
    console.log(`    来源过滤器: ${rule.sourceFilter || '未设置'}`);
    console.log(`    目标过滤器: ${rule.targetFilter || '未设置'}`);
    console.log(`    考勤代码过滤: ${rule.attendanceCodeIds || '未设置'}`);

    // 检查配置的有效性
    const config = await prisma.allocationConfig.findUnique({
      where: { id: rule.configId },
      include: { rules: true }
    });

    if (config) {
      console.log(`    配置状态: ${config.isActive ? '激活' : '未激活'}`);
      console.log(`    配置版本: ${config.version}`);
      console.log(`    配置中的规则数量: ${config.rules.length}`);
    }
  }

  // 5. 检查最近的分摊计算任务
  console.log('\n5. 检查最近的分摊计算任务:');
  const recentTasks = await prisma.allocationResult.findMany({
    distinct: ['batchNo'],
    orderBy: { createTime: 'desc' },
    take: 5,
    select: {
      batchNo: true,
      recordDate: true,
      createTime: true
    }
  });

  console.log(`  最近的 ${recentTasks.length} 个计算批次:`);
  recentTasks.forEach((task, index) => {
    console.log(`\n  批次 ${index + 1}:`);
    console.log(`    批次号: ${task.batchNo}`);
    console.log(`    日期: ${task.recordDate}`);
    console.log(`    创建时间: ${task.createTime}`);
  });

  console.log('\n=== 检查完成 ===');
}

checkA05Allocation()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
