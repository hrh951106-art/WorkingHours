import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseA05AllocationRule() {
  console.log('=== A05测试规则分摊计算诊断报告 ===\n');

  // 1. 查找A05分配规则
  console.log('1. 查找代码为A05的分配规则:');
  const a05Rules = await prisma.allocationRuleConfig.findMany({
    where: {
      deletedAt: null
    },
    include: {
      config: true,
      targets: true
    }
  });

  // 筛选名称包含"测试"的规则
  const testRules = a05Rules.filter(r => r.config?.configName?.includes('测试'));

  if (testRules.length === 0) {
    console.log('  ❌ 没有找到名称包含"测试"的规则');
    console.log(`  所有规则名称: ${a05Rules.map(r => r.config?.configName).join(', ')}`);
    return;
  }

  console.log(`  找到 ${testRules.length} 条名称包含"测试"的规则:\n`);

  const targetRule = testRules[testRules.length - 1]; // 取最后一条（可能是最新的）

  console.log(`  详细信息（规则ID: ${targetRule.id}）:`);
  console.log(`    规则名称: ${targetRule.ruleName || '未命名'}`);
  console.log(`    配置名称: ${targetRule.config?.configName || '未命名'}`);
  console.log(`    配置ID: ${targetRule.configId}`);
  console.log(`    规则类型: ${targetRule.ruleType}`);
  console.log(`    分摊依据: ${targetRule.allocationBasis}`);
  console.log(`    考勤代码过滤: ${targetRule.allocationAttendanceCodes}`);
  console.log(`    归属层级: ${targetRule.allocationHierarchyLevels}`);
  console.log(`    分配范围ID: ${targetRule.allocationScopeId || '未设置'}`);
  console.log(`    基础过滤器: ${targetRule.basisFilter}`);
  console.log(`    状态: ${targetRule.status}`);
  console.log(`    有效期: ${targetRule.effectiveStartTime || '未设置'} ~ ${targetRule.effectiveEndTime || '未设置'}`);
  console.log(`    排序: ${targetRule.sortOrder}`);

  // 2. 检查目标配置
  console.log('\n2. 分配目标配置:');
  if (targetRule.targets && targetRule.targets.length > 0) {
    console.log(`  找到 ${targetRule.targets.length} 个目标:`);
    targetRule.targets.forEach((target, index) => {
      console.log(`\n  目标 ${index + 1} (ID: ${target.id}):`);
      console.log(`    目标类型: ${target.targetType}`);
      console.log(`    目标ID: ${target.targetId}`);
      console.log(`    账户ID: ${target.accountId || '未设置'}`);
      console.log(`    固定工时: ${target.fixedHours || '未设置'}`);
      console.log(`    排序: ${target.sortOrder}`);
    });
  } else {
    console.log('  ❌ 该规则没有配置分配目标');
  }

  // 3. 检查配置状态
  console.log('\n3. 分配配置状态:');
  const config = await prisma.allocationConfig.findUnique({
    where: { id: targetRule.configId },
    include: {
      rules: true,
      sourceConfig: true
    }
  });

  if (config) {
    console.log(`  配置ID: ${config.id}`);
    console.log(`  配置代码: ${config.configCode}`);
    console.log(`  配置名称: ${config.configName}`);
    console.log(`  组织ID: ${config.orgId}`);
    console.log(`  配置状态: ${config.status}`);
    console.log(`  规则数量: ${config.rules.length}`);
    console.log(`  来源配置: ${config.sourceConfig ? '已配置' : '未配置'}`);

    if (config.sourceConfig) {
      console.log(`    来源配置ID: ${config.sourceConfig.id}`);
      console.log(`    来源账户ID: ${config.sourceConfig.accountId}`);
      console.log(`    来源部门ID: ${config.sourceConfig.departmentId || '未设置'}`);
      console.log(`    来源员工号: ${config.sourceConfig.employeeNo || '未设置'}`);
    }
  }

  // 4. 检查计算结果数据
  console.log('\n4. 检查可用的计算结果数据:');

  // 解析考勤代码过滤
  const attendanceCodesFilter = JSON.parse(targetRule.allocationAttendanceCodes || '[]');
  console.log(`  该规则过滤的考勤代码: ${attendanceCodesFilter.length > 0 ? attendanceCodesFilter.join(', ') : '未配置（处理所有）'}`);

  // 检查最近的计算结果
  let calcResultsQuery: any = {
    orderBy: { calcDate: 'desc' },
    take: 20,
    include: { employee: true }
  };

  // 如果配置了考勤代码过滤，查询对应的考勤代码ID
  let attendanceCodeIds: number[] = [];
  if (attendanceCodesFilter.length > 0) {
    const codes = await prisma.attendanceCode.findMany({
      where: { code: { in: attendanceCodesFilter } }
    });
    attendanceCodeIds = codes.map(c => c.id);
    console.log(`  对应的考勤代码ID: ${attendanceCodeIds.join(', ')}`);

    if (attendanceCodeIds.length > 0) {
      calcResultsQuery.where = {
        attendanceCodeId: { in: attendanceCodeIds }
      };
    }
  }

  const calcResults = await prisma.calcResult.findMany(calcResultsQuery);

  console.log(`  找到 ${calcResults.length} 条计算结果`);

  if (calcResults.length > 0) {
    console.log('\n  最近的5条计算结果:');
    calcResults.slice(0, 5).forEach((result, index) => {
      console.log(`\n  ${index + 1}. 员工: ${result.employeeNo} - ${result.employee.name}`);
      console.log(`     计算日期: ${result.calcDate.toISOString().split('T')[0]}`);
      console.log(`     班次: ${result.shiftName} (ID: ${result.shiftId})`);
      console.log(`     考勤代码ID: ${result.attendanceCodeId}`);
      console.log(`     实际工时: ${result.actualHours}`);
      console.log(`     标准工时: ${result.standardHours}`);
      console.log(`     账户: ${result.accountName || '未设置'}`);
      console.log(`     账户ID: ${result.accountId}`);
    });
  } else {
    console.log('  ❌ 没有找到符合该规则的计算结果数据');
  }

  // 5. 检查该规则的分摊结果
  console.log('\n5. 检查该规则的分摊结果:');
  const allocations = await prisma.allocationResult.findMany({
    where: { ruleId: targetRule.id },
    orderBy: { calcTime: 'desc' },
    take: 10
  });

  console.log(`  找到 ${allocations.length} 条分摊结果`);

  if (allocations.length > 0) {
    console.log('\n  最近的分摊结果:');
    allocations.forEach((alloc, index) => {
      console.log(`\n  ${index + 1}. 批次号: ${alloc.batchNo}`);
      console.log(`     计算日期: ${alloc.recordDate.toISOString().split('T')[0]}`);
      console.log(`     来源员工: ${alloc.sourceEmployeeNo}`);
      console.log(`     来源工时: ${alloc.sourceHours}`);
      console.log(`     目标: ${alloc.targetType} - ${alloc.targetName}`);
      console.log(`     分摊工时: ${alloc.allocatedHours}`);
      console.log(`     计算时间: ${alloc.calcTime.toLocaleString('zh-CN')}`);
    });
  } else {
    console.log('  ❌ 该规则没有产生任何分摊结果');
  }

  // 6. 检查分配范围
  console.log('\n6. 检查分配范围配置:');
  if (targetRule.allocationScopeId) {
    try {
      const scope = await prisma.allocationScope.findUnique({
        where: { id: targetRule.allocationScopeId }
      });

    if (scope) {
      console.log(`  范围ID: ${scope.id}`);
      console.log(`  范围名称: ${scope.scopeName}`);
      console.log(`  范围类型: ${scope.scopeType}`);
      console.log(`  范围值: ${scope.scopeValue || '未设置'}`);
      console.log(`  状态: ${scope.status}`);
    } else {
      console.log(`  ❌ 配置的范围ID ${targetRule.allocationScopeId} 不存在`);
    }
  } else {
    console.log('  未配置分配范围');
  }

  // 7. 检查来源配置
  console.log('\n7. 检查来源配置:');
  const sourceConfigs = config?.sourceConfigs || [];
  if (sourceConfigs.length > 0) {
    console.log(`  找到 ${sourceConfigs.length} 个来源配置:`);
    sourceConfigs.forEach((sc, index) => {
      console.log(`\n  来源 ${index + 1}:`);
      console.log(`    账户ID: ${sc.accountId}`);
      console.log(`    部门ID: ${sc.departmentId || '未设置'}`);
      console.log(`    员工号: ${sc.employeeNo || '未设置'}`);
    });
  } else {
    console.log('  未配置来源过滤');
  }

  // 8. 问题分析
  console.log('\n=== 问题分析 ===\n');

  const issues: string[] = [];
  const warnings: string[] = [];

  if (!config || !config.isActive) {
    issues.push('❌ 配置未激活或不存在');
  }

  if (targetRule.status !== 'ACTIVE') {
    issues.push(`❌ 规则状态不是激活: ${targetRule.status}`);
  }

  if (!targetRule.targets || targetRule.targets.length === 0) {
    issues.push('❌ 该规则没有配置分配目标，无法进行分摊');
  }

  if (calcResults.length === 0) {
    issues.push('❌ 没有找到符合该规则的源数据（计算结果）');
    if (attendanceCodesFilter.length > 0) {
      warnings.push(`  - 规则配置了考勤代码过滤: ${attendanceCodesFilter.join(', ')}`);
      warnings.push(`  - 但系统中没有这些考勤代码的计算结果`);
    } else {
      warnings.push('  - 系统中可能没有计算结果数据');
    }
  }

  if (allocations.length === 0 && calcResults.length > 0) {
    issues.push('❌ 有源数据但没有分摊结果，可能原因:');
    issues.push('   - 没有执行过分摊计算');
    issues.push('   - 分摊计算过程中出现错误');
    issues.push('   - 分配范围配置不正确，过滤掉了所有数据');
    issues.push('   - 目标配置不正确（如目标账户不存在）');
  }

  if (targetRule.allocationScopeId) {
    const scope = await prisma.allocationScope.findUnique({
      where: { id: targetRule.allocationScopeId }
    });
    if (!scope || scope.status !== 'ACTIVE') {
      warnings.push(`⚠️  配置的分配范围不存在或未激活`);
    }
  }

  // 输出问题
  if (issues.length > 0) {
    console.log('发现的问题:');
    issues.forEach(issue => console.log(issue));
  }

  if (warnings.length > 0) {
    console.log('\n警告信息:');
    warnings.forEach(warning => console.log(warning));
  }

  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ 配置看起来正常，建议检查:');
    console.log('   1. 是否执行过分摊计算（调用/allocation/execute接口）');
    console.log('   2. 查看后端日志中是否有计算错误');
    console.log('   3. 检查分摊计算逻辑代码');
  }

  console.log('\n=== 诊断完成 ===');
}

diagnoseA05AllocationRule()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
