import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkIndirectAllocationProblem() {
  console.log('=== 排查间接工时规则分摊问题 ===\n');

  // 1. 查找所有考勤代码
  console.log('1. 所有考勤代码:');
  const allCodes = await prisma.attendanceCode.findMany({
    orderBy: { code: 'asc' }
  });

  console.log(`  总共 ${allCodes.length} 个考勤代码:`);
  allCodes.forEach(code => {
    console.log(`    ${code.code} - ${code.name} (${code.type})`);
  });

  // 重点检查A04（通常间接工时是A04）
  const a04Code = allCodes.find(c => c.code === 'A04');
  console.log(`\n  A04考勤代码: ${a04Code ? `存在 - ${a04Code.name}` : '不存在'}`);

  // 2. 检查所有A04的计算结果
  console.log('\n2. A04考勤代码的计算结果:');
  const a04CodeId = a04Code?.id;

  let a04CalcResults: any[] = [];
  if (a04CodeId) {
    a04CalcResults = await prisma.calcResult.findMany({
      where: { attendanceCodeId: a04CodeId },
      orderBy: { calcDate: 'desc' },
      take: 10,
      include: { employee: true }
    });
  }

  console.log(`  找到 ${a04CalcResults.length} 条A04计算结果`);
  if (a04CalcResults.length > 0) {
    a04CalcResults.forEach((result, index) => {
      console.log(`\n  记录 ${index + 1}:`);
      console.log(`    员工: ${result.employeeNo} - ${result.employee.name}`);
      console.log(`    计算日期: ${result.calcDate.toISOString().split('T')[0]}`);
      console.log(`    班次: ${result.shiftName || '未知'} (ID: ${result.shiftId})`);
      console.log(`    实际工时: ${result.actualHours}`);
      console.log(`    账户: ${result.accountName} (ID: ${result.accountId})`);
      console.log(`    状态: ${result.status}`);
    });
  } else {
    console.log('  ❌ 没有A04的计算结果');
  }

  // 3. 检查分配规则配置
  console.log('\n3. 检查分配规则配置:');
  const allRules = await prisma.allocationRuleConfig.findMany({
    where: { deletedAt: null, status: 'ACTIVE' },
    include: { config: true }
  });

  console.log(`  找到 ${allRules.length} 条激活的分配规则`);
  allRules.forEach((rule, index) => {
    const attendanceCodes = JSON.parse(rule.allocationAttendanceCodes || '[]');
    console.log(`\n  规则 ${index + 1} (ID: ${rule.id}):`);
    console.log(`    名称: ${rule.ruleName || '未命名'}`);
    console.log(`    配置: ${rule.config?.configName || '未命名'}`);
    console.log(`    类型: ${rule.ruleType}`);
    console.log(`    分摊依据: ${rule.allocationBasis}`);
    console.log(`    考勤代码过滤: ${attendanceCodes.length > 0 ? attendanceCodes.join(', ') : '未配置（所有考勤代码）'}`);
    console.log(`    归属层级: ${rule.allocationHierarchyLevels}`);
    console.log(`    范围ID: ${rule.allocationScopeId || '未设置'}`);
    console.log(`    基础过滤器: ${rule.basisFilter}`);
  });

  // 4. 检查A04的分摊结果
  console.log('\n4. A04的分摊结果:');
  const a04Allocations = await prisma.allocationResult.findMany({
    where: { attendanceCode: 'A04' },
    orderBy: { calcTime: 'desc' },
    take: 10
  });

  console.log(`  找到 ${a04Allocations.length} 条A04分摊结果`);
  if (a04Allocations.length > 0) {
    a04Allocations.forEach((alloc, index) => {
      console.log(`\n  记录 ${index + 1}:`);
      console.log(`    批次号: ${alloc.batchNo}`);
      console.log(`    计算日期: ${alloc.recordDate.toISOString().split('T')[0]}`);
      console.log(`    来源员工: ${alloc.sourceEmployeeNo}`);
      console.log(`    来源工时: ${alloc.sourceHours}`);
      console.log(`    目标: ${alloc.targetType} - ${alloc.targetName}`);
      console.log(`    分摊工时: ${alloc.allocatedHours}`);
      console.log(`    规则ID: ${alloc.ruleId}`);
    });
  } else {
    console.log('  ❌ 没有A04的分摊结果');
  }

  // 5. 检查最近的分摊计算批次
  console.log('\n5. 最近的分摊计算:');
  const recentBatches = await prisma.allocationResult.findMany({
    distinct: ['batchNo'],
    orderBy: { calcTime: 'desc' },
    take: 5,
    select: {
      batchNo: true,
      recordDate: true,
      calcTime: true
    }
  });

  console.log(`  最近的 ${recentBatches.length} 个计算批次:`);
  recentBatches.forEach((batch, index) => {
    console.log(`\n  批次 ${index + 1}:`);
    console.log(`    批次号: ${batch.batchNo}`);
    console.log(`    计算日期: ${batch.recordDate.toISOString().split('T')[0]}`);
    console.log(`    创建时间: ${batch.calcTime.toLocaleString('zh-CN')}`);
  });

  // 6. 统计分析
  console.log('\n6. 统计分析:');
  console.log(`  A04考勤代码: ${a04Code ? '✅ 存在' : '❌ 不存在'}`);
  console.log(`  A04计算结果: ${a04CalcResults.length > 0 ? `✅ ${a04CalcResults.length} 条` : '❌ 0条'}`);
  console.log(`  分配规则数量: ${allRules.length} 条`);
  console.log(`  A04分摊结果: ${a04Allocations.length > 0 ? `✅ ${a04Allocations.length} 条` : '❌ 0条'}`);

  // 问题诊断
  console.log('\n=== 问题诊断 ===');
  if (!a04Code) {
    console.log('❌ A04考勤代码不存在，无法进行分摊计算');
  } else if (a04CalcResults.length === 0) {
    console.log('❌ 没有A04的计算结果，可能原因:');
    console.log('   - 工时计算没有生成A04的记录');
    console.log('   - 考勤规则配置问题');
    console.log('   - 员工没有产生A04类型的工时');
  } else if (a04Allocations.length === 0) {
    console.log('❌ 有A04计算结果但没有分摊结果，可能原因:');
    console.log('   - 分配规则没有包含A04考勤代码');
    console.log('   - 分配规则未激活');
    console.log('   - 分摊范围配置不正确');
    console.log('   - 没有执行过分摊计算');
    console.log('   - 分摊计算过程中出现错误');
  } else {
    console.log('✅ A04有分摊结果，分摊计算正常');
  }

  console.log('\n=== 检查完成 ===');
}

checkIndirectAllocationProblem()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
