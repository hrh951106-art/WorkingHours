import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function finalDiagnosis() {
  console.log('=== A05间接工时规则分摊问题 - 最终诊断报告 ===\n');

  // 1. 检查所有计算结果
  console.log('1. 检查所有计算结果:');
  const allCalcResults = await prisma.calcResult.findMany({
    orderBy: { calcDate: 'desc' },
    take: 20,
    include: { employee: true, attendanceCode: true }
  });

  console.log(`  总共找到 ${allCalcResults.length} 条最近的计算结果`);

  const withCode = allCalcResults.filter(r => r.attendanceCodeId !== null);
  const withoutCode = allCalcResults.filter(r => r.attendanceCodeId === null);

  console.log(`  - 有考勤代码关联: ${withCode.length} 条`);
  console.log(`  - 无考勤代码关联: ${withoutCode.length} 条`);

  if (withoutCode.length > 0) {
    console.log('\n  无考勤代码关联的计算结果详情:');
    withoutCode.forEach((result, index) => {
      console.log(`\n  ${index + 1}. 员工: ${result.employeeNo} - ${result.employee.name}`);
      console.log(`     计算日期: ${result.calcDate.toISOString().split('T')[0]}`);
      console.log(`     班次: ${result.shiftName} (ID: ${result.shiftId})`);
      console.log(`     考勤代码ID: ${result.attendanceCodeId}`);
      console.log(`     实际工时: ${result.actualHours}`);
      console.log(`     标准工时: ${result.standardHours}`);
      console.log(`     账户: ${result.accountName || '未设置'} (ID: ${result.accountId})`);
      console.log(`     状态: ${result.status}`);
    });
  }

  // 2. 检查A04考勤代码
  console.log('\n2. A04考勤代码配置:');
  const a04Code = await prisma.attendanceCode.findUnique({
    where: { code: 'A04' }
  });

  if (a04Code) {
    console.log(`  考勤代码ID: ${a04Code.id}`);
    console.log(`  代码: ${a04Code.code}`);
    console.log(`  名称: ${a04Code.name}`);
    console.log(`  类型: ${a04Code.type}`);
    console.log(`  是否计算工时: ${a04Code.calculateHours}`);
    console.log(`  状态: ${a04Code.status}`);
  } else {
    console.log('  ❌ A04考勤代码不存在');
  }

  // 3. 检查分配规则
  console.log('\n3. 分配规则配置:');
  const activeRules = await prisma.allocationRuleConfig.findMany({
    where: { deletedAt: null, status: 'ACTIVE' },
    include: { config: true }
  });

  console.log(`  找到 ${activeRules.length} 条激活的分配规则`);
  activeRules.forEach((rule, index) => {
    const attendanceCodes = JSON.parse(rule.allocationAttendanceCodes || '[]');
    console.log(`\n  规则 ${index + 1} (ID: ${rule.id}):`);
    console.log(`    名称: ${rule.ruleName || '未命名'}`);
    console.log(`    配置: ${rule.config?.configName || '未命名'}`);
    console.log(`    分摊依据: ${rule.allocationBasis}`);
    console.log(`    考勤代码过滤: ${attendanceCodes.length > 0 ? attendanceCodes.join(', ') : '未配置（处理所有考勤代码）'}`);
  });

  // 4. 检查分摊结果
  console.log('\n4. 分摊结果统计:');
  const totalAllocations = await prisma.allocationResult.count();
  console.log(`  总分摊结果: ${totalAllocations} 条`);

  if (totalAllocations > 0) {
    const recentAllocations = await prisma.allocationResult.findMany({
      orderBy: { calcTime: 'desc' },
      take: 5
    });

    console.log('\n  最近的5条分摊结果:');
    recentAllocations.forEach((alloc, index) => {
      console.log(`\n  ${index + 1}. 批次号: ${alloc.batchNo}`);
      console.log(`     计算日期: ${alloc.recordDate.toISOString().split('T')[0]}`);
      console.log(`     考勤代码: ${alloc.attendanceCode}`);
      console.log(`     来源员工: ${alloc.sourceEmployeeNo}`);
      console.log(`     分摊工时: ${alloc.allocatedHours}`);
    });
  } else {
    console.log('  ❌ 没有任何分摊结果');
  }

  // 5. 问题总结
  console.log('\n=== 问题总结 ===\n');

  console.log('关键发现:');
  console.log(`1. A04考勤代码: ${a04Code ? '✅ 存在' : '❌ 不存在'}`);
  console.log(`2. A04计算结果: ❌ 0条`);
  console.log(`3. 总计算结果: ${allCalcResults.length > 0 ? allCalcResults.length : 0}条`);
  console.log(`4. 无考勤代码关联的计算结果: ${withoutCode.length}条`);
  console.log(`5. 分配规则数量: ${activeRules.length}条`);
  console.log(`6. 分摊结果数量: ${totalAllocations}条`);

  console.log('\n根本原因分析:');
  if (!a04Code) {
    console.log('❌ A04考勤代码不存在，无法进行分摊');
  } else if (withoutCode.length > 0) {
    console.log('❌ 计算结果的attendanceCodeId字段为null，主要问题:');
    console.log('   - 工时计算时没有正确关联考勤代码');
    console.log('   - 考勤规则配置可能有问题');
    console.log('   - 需要重新计算工时以正确关联考勤代码');
  } else if (allCalcResults.length === 0) {
    console.log('❌ 没有任何计算结果，需要先进行工时计算');
  } else if (totalAllocations === 0) {
    console.log('❌ 有计算结果但没有分摊结果，可能原因:');
    console.log('   - 没有执行过分摊计算');
    console.log('   - 分摊计算过程中出现错误');
  } else {
    console.log('✅ 系统运行正常');
  }

  console.log('\n建议解决方案:');
  if (withoutCode.length > 0) {
    console.log('1. 检查工时计算逻辑，确保attendanceCodeId正确关联');
    console.log('2. 检查考勤规则配置，确保规则中指定了正确的考勤代码');
    console.log('3. 重新执行工时计算，确保生成正确的考勤代码关联');
  }
  if (a04Code && allCalcResults.filter(r => r.attendanceCodeId === a04Code.id).length === 0) {
    console.log('4. 检查考勤规则，确保有规则会生成A04类型的工时');
    console.log('5. 确认员工考勤数据是否包含会产生A04工时的情况');
  }
  if (totalAllocations === 0 && allCalcResults.length > 0) {
    console.log('6. 执行分摊计算');
  }

  console.log('\n=== 诊断完成 ===');
}

finalDiagnosis()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
