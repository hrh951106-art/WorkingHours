import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseA05TestRule() {
  console.log('=== A05测试规则分摊计算问题诊断报告 ===\n');

  // 1. 查找A05配置
  console.log('1. 查找A05配置:');
  const a05Config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'A05',
      deletedAt: null
    },
    include: {
      rules: {
        include: {
          targets: true
        }
      },
      sourceConfig: true
    }
  });

  if (!a05Config) {
    console.log('  ❌ 没有找到代码为A05的配置');
    return;
  }

  console.log(`  ✅ 找到A05配置: ${a05Config.configName}`);
  console.log(`  配置ID: ${a05Config.id}`);
  console.log(`  配置代码: ${a05Config.configCode}`);
  console.log(`  配置状态: ${a05Config.status}`);
  console.log(`  组织ID: ${a05Config.orgId}`);
  console.log(`  规则数量: ${a05Config.rules.length}`);

  // 2. 检查规则详情
  console.log('\n2. 检查规则详情:');
  if (a05Config.rules.length === 0) {
    console.log('  ❌ 该配置没有规则');
    return;
  }

  const rule = a05Config.rules[0];
  console.log(`  规则ID: ${rule.id}`);
  console.log(`  规则名称: ${rule.ruleName || '未命名'}`);
  console.log(`  规则类型: ${rule.ruleType}`);
  console.log(`  分摊依据: ${rule.allocationBasis}`);
  console.log(`  考勤代码过滤: ${rule.allocationAttendanceCodes || '未配置'}`);
  console.log(`  归属层级: ${rule.allocationHierarchyLevels || '未配置'}`);
  console.log(`  分配范围ID: ${rule.allocationScopeId || '未配置'}`);
  console.log(`  状态: ${rule.status}`);

  // 3. 检查分配目标（关键）
  console.log('\n3. 检查分配目标配置:');
  if (!rule.targets || rule.targets.length === 0) {
    console.log('  ❌❌❌ 该规则没有配置任何分配目标！');
    console.log('  这是导致没有分摊结果的主要原因！');
    console.log('  分摊计算需要知道将工时分摊到哪里，没有目标就无法计算。');
  } else {
    console.log(`  ✅ 配置了 ${rule.targets.length} 个分配目标:`);
    rule.targets.forEach((target, index) => {
      console.log(`\n  目标 ${index + 1}:`);
      console.log(`    类型: ${target.targetType}`);
      console.log(`    目标ID: ${target.targetId}`);
      console.log(`    账户ID: ${target.accountId || '未设置'}`);
      console.log(`    固定工时: ${target.fixedHours || '未设置'}`);
    });
  }

  // 4. 检查源数据
  console.log('\n4. 检查源数据（计算结果）:');
  const attendanceCodeIds = JSON.parse(rule.allocationAttendanceCodes || '[]');

  let whereClause: any = {};
  if (attendanceCodeIds.length > 0) {
    // 查找对应的考勤代码
    const codes = await prisma.attendanceCode.findMany({
      where: { id: { in: attendanceCodeIds } }
    });
    console.log(`  该规则配置的考勤代码ID: ${attendanceCodeIds.join(', ')}`);
    console.log(`  对应的考勤代码: ${codes.map(c => c.code).join(', ') || '未找到'}`);

    if (codes.length > 0) {
      whereClause.attendanceCodeId = { in: codes.map(c => c.id) };
    }
  }

  const calcResults = await prisma.calcResult.findMany({
    where: whereClause,
    orderBy: { calcDate: 'desc' },
    take: 10,
    include: { employee: true }
  });

  console.log(`  找到 ${calcResults.length} 条符合规则的计算结果`);

  if (calcResults.length > 0) {
    console.log('\n  最近的3条:');
    calcResults.slice(0, 3).forEach((result, index) => {
      console.log(`\n  ${index + 1}. ${result.employeeNo} - ${result.employee.name}`);
      console.log(`     日期: ${result.calcDate.toISOString().split('T')[0]}`);
      console.log(`     工时: ${result.actualHours}`);
      console.log(`     账户: ${result.accountName || '未设置'}`);
      console.log(`     考勤代码ID: ${result.attendanceCodeId}`);
    });
  }

  // 5. 检查分摊结果
  console.log('\n5. 检查分摊结果:');
  const allocations = await prisma.allocationResult.findMany({
    where: { configId: a05Config.id },
    orderBy: { calcTime: 'desc' },
    take: 10
  });

  console.log(`  该配置的分摊结果: ${allocations.length} 条`);

  if (allocations.length === 0) {
    console.log('  ❌ 该配置没有产生任何分摊结果');
  } else {
    console.log('\n  最近的3条:');
    allocations.slice(0, 3).forEach((alloc, index) => {
      console.log(`\n  ${index + 1}. 批次: ${alloc.batchNo}`);
      console.log(`     日期: ${alloc.recordDate.toISOString().split('T')[0]}`);
      console.log(`     来源: ${alloc.sourceEmployeeNo}`);
      console.log(`     分摊工时: ${alloc.allocatedHours}`);
      console.log(`     目标: ${alloc.targetType} - ${alloc.targetName}`);
    });
  }

  // 6. 检查分配范围
  console.log('\n6. 检查分配范围:');
  if (rule.allocationScopeId) {
    try {
      const scope = await prisma.allocationScope.findUnique({
        where: { id: rule.allocationScopeId }
      });

      if (scope) {
        console.log(`  范围ID: ${scope.id}`);
        console.log(`  范围名称: ${scope.scopeName}`);
        console.log(`  范围类型: ${scope.scopeType}`);
        console.log(`  范围值: ${scope.scopeValue || '未设置'}`);
        console.log(`  状态: ${scope.status}`);
      } else {
        console.log(`  ⚠️  配置的范围ID ${rule.allocationScopeId} 不存在`);
      }
    } catch (e) {
      console.log(`  ⚠️  无法查询范围配置（模型可能不存在）`);
    }
  } else {
    console.log('  未配置分配范围');
  }

  // 7. 检查来源配置
  console.log('\n7. 检查来源配置:');
  if (a05Config.sourceConfig) {
    const sc = a05Config.sourceConfig;
    console.log(`  来源配置ID: ${sc.id}`);
    console.log(`  账户ID: ${sc.accountId || '未设置'}`);
    console.log(`  部门ID: ${sc.departmentId || '未设置'}`);
    console.log(`  员工号: ${sc.employeeNo || '未设置'}`);
    console.log(`  包含子部门: ${sc.includeChildDepartments ? '是' : '否'}`);

    // 如果配置了来源过滤，检查有多少计算结果符合
    if (sc.accountId || sc.departmentId || sc.employeeNo) {
      console.log('\n  应用来源过滤后的计算结果:');
      let sourceFilter: any = {};
      if (sc.accountId) sourceFilter.accountId = sc.accountId;
      if (sc.employeeNo) sourceFilter.employeeNo = sc.employeeNo;

      const filteredResults = await prisma.calcResult.count({
        where: { ...whereClause, ...sourceFilter }
      });
      console.log(`    符合来源过滤的计算结果: ${filteredResults} 条`);
    }
  } else {
    console.log('  未配置来源过滤（处理所有数据）');
  }

  // 8. 问题总结
  console.log('\n=== 问题总结 ===\n');

  const issues: string[] = [];
  const warnings: string[] = [];

  if (!rule.targets || rule.targets.length === 0) {
    issues.push('❌【主要问题】该规则没有配置分配目标（AllocationRuleTarget）');
    issues.push('   影响: 分摊计算无法确定将工时分摊到哪里，导致无法生成任何分摊结果');
    issues.push('   解决: 需要在规则中添加至少一个分配目标');
  }

  if (calcResults.length === 0) {
    issues.push('❌ 没有找到符合该规则的源数据（计算结果）');
    if (attendanceCodeIds.length > 0) {
      warnings.push('   可能原因: 规则配置的考勤代码过滤太严格，没有匹配的计算结果');
    } else {
      warnings.push('   可能原因: 系统中没有计算结果数据');
    }
  }

  if (allocations.length === 0) {
    if (issues.length === 0) {
      warnings.push('⚠️  配置正常但没有分摊结果');
      warnings.push('   可能原因1: 没有执行过分摊计算');
      warnings.push('   可能原因2: 分摊计算过程中出现错误');
      warnings.push('   可能原因3: 分配范围或来源过滤配置不当');
    }
  }

  if (a05Config.status !== 'ACTIVE') {
    issues.push(`❌ 配置状态不是激活: ${a05Config.status}`);
  }

  if (rule.status !== 'ACTIVE') {
    issues.push(`❌ 规则状态不是激活: ${rule.status}`);
  }

  if (rule.allocationScopeId) {
    warnings.push('⚠️  配置了分配范围，可能会过滤掉部分数据');
  }

  // 输出问题
  console.log('发现的问题:');
  if (issues.length === 0) {
    console.log('  ✅ 没有发现明显问题');
  } else {
    issues.forEach(issue => console.log(`  ${issue}`));
  }

  if (warnings.length > 0) {
    console.log('\n警告信息:');
    warnings.forEach(warning => console.log(`  ${warning}`));
  }

  // 9. 建议
  console.log('\n=== 建议 ===\n');

  if (!rule.targets || rule.targets.length === 0) {
    console.log('1. 【必须修复】添加分配目标');
    console.log('   - 在AllocationRuleTarget表中添加记录');
    console.log('   - 指定目标类型（LINE/WORKSHOP/FACTORY等）');
    console.log('   - 指定目标ID和对应的账户ID');
    console.log('   - 示例: targetType="LINE", targetId=123, accountId=456');
  }

  if (calcResults.length === 0 && attendanceCodeIds.length === 0) {
    console.log('2. 检查考勤代码配置');
    console.log('   - 当前未配置考勤代码过滤，应该处理所有计算结果');
    console.log('   - 但没有找到计算结果，请确认系统中是否有工时计算数据');
  }

  if (issues.length === 0 && calcResults.length > 0) {
    console.log('3. 执行分摊计算');
    console.log('   - 配置看起来正常');
    console.log('   - 有源数据可用');
    console.log('   - 调用分摊计算接口: /api/allocation/execute');
    console.log('   - 传入配置ID: ' + a05Config.id);
  }

  console.log('\n=== 诊断完成 ===');
}

diagnoseA05TestRule()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
