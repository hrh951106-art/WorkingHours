import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseA06Rule() {
  console.log('=== A06间接工时分摊规则问题诊断报告 ===\n');

  // 1. 查找A06配置
  console.log('1. 查找A06分配配置:');
  const a06Config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'A06',
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

  if (!a06Config) {
    console.log('  ❌ 没有找到代码为A06的配置');
    return;
  }

  console.log(`  ✅ 找到A06配置: ${a06Config.configName}`);
  console.log(`  配置ID: ${a06Config.id}`);
  console.log(`  配置代码: ${a06Config.configCode}`);
  console.log(`  配置状态: ${a06Config.status}`);
  console.log(`  组织ID: ${a06Config.orgId}`);
  console.log(`  规则数量: ${a06Config.rules.length}`);

  // 2. 检查规则详情
  console.log('\n2. 检查规则详情:');
  if (a06Config.rules.length === 0) {
    console.log('  ❌ 该配置没有规则');
    return;
  }

  a06Config.rules.forEach((rule, index) => {
    console.log(`\n  规则 ${index + 1}:`);
    console.log(`    规则ID: ${rule.id}`);
    console.log(`    规则名称: ${rule.ruleName || '未命名'}`);
    console.log(`    规则类型: ${rule.ruleType}`);
    console.log(`    分摊依据: ${rule.allocationBasis}`);
    console.log(`    考勤代码过滤: "${rule.allocationAttendanceCodes}"`);
    console.log(`    归属层级: "${rule.allocationHierarchyLevels}"`);
    console.log(`    分配范围ID: ${rule.allocationScopeId || '未配置'}`);
    console.log(`    状态: ${rule.status}`);
    console.log(`    分配目标数量: ${rule.targets ? rule.targets.length : 0}`);
  });

  const rule = a06Config.rules[0]; // 取第一条规则

  // 3. 检查分配目标配置
  console.log('\n3. 检查分配目标配置:');
  if (!rule.targets || rule.targets.length === 0) {
    console.log('  ❌❌❌ 该规则没有配置任何分配目标！');
    console.log('  这是导致无法分摊的主要原因之一');
  } else {
    console.log(`  ✅ 配置了 ${rule.targets.length} 个分配目标:`);
    rule.targets.forEach((target, index) => {
      console.log(`\n  目标 ${index + 1}:`);
      console.log(`    ID: ${target.id}`);
      console.log(`    目标类型: ${target.targetType}`);
      console.log(`    目标ID: ${target.targetId}`);
      console.log(`    账户ID: ${target.accountId || '未设置'}`);
      console.log(`    固定工时: ${target.fixedHours || '未设置'}`);
      console.log(`    排序: ${target.sortOrder}`);
    });
  }

  // 4. 检查考勤代码配置
  console.log('\n4. 检查考勤代码配置:');
  const attendanceCodeIds = JSON.parse(rule.allocationAttendanceCodes || '[]');
  console.log(`  allocationAttendanceCodes字段值: "${rule.allocationAttendanceCodes}"`);
  console.log(`  解析后的ID数组: [${attendanceCodeIds.join(', ')}]`);

  if (attendanceCodeIds.length === 0) {
    console.log('  ⚠️  考勤代码过滤为空，将处理所有DefinitionAttendanceCode');
  } else {
    console.log(`  ✅ 配置了 ${attendanceCodeIds.length} 个考勤代码ID`);

    // 查询对应的DefinitionAttendanceCode
    const defCodes = await prisma.definitionAttendanceCode.findMany({
      where: { id: { in: attendanceCodeIds } }
    });

    console.log('\n  配置的DefinitionAttendanceCode详情:');
    for (const id of attendanceCodeIds) {
      const defCode = defCodes.find(dc => dc.id === id);
      if (defCode) {
        console.log(`    [${id}] ${defCode.code} - ${defCode.name} (calc: ${defCode.calcAttendanceCode || 'N/A'})`);
      } else {
        console.log(`    [${id}] ❌ 不存在`);
      }
    }
  }

  // 5. 检查来源配置
  console.log('\n5. 检查分摊源配置:');
  if (a06Config.sourceConfig) {
    const sc = a06Config.sourceConfig;
    console.log(`  来源配置ID: ${sc.id}`);
    console.log(`  账户ID: ${sc.accountId || '未设置'}`);
    console.log(`  部门ID: ${sc.departmentId || '未设置'}`);
    console.log(`  员工号: ${sc.employeeNo || '未设置'}`);
    console.log(`  包含子部门: ${sc.includeChildDepartments ? '是' : '否'}`);

    // 解析考勤代码配置
    const sourceAttendanceCodes = JSON.parse(sc.attendanceCodes || '[]');
    console.log(`  出勤代码过滤: [${sourceAttendanceCodes.join(', ')}]`);

    const employeeFilter = JSON.parse(sc.employeeFilter || '{}');
    console.log(`  员工筛选: ${Object.keys(employeeFilter).length > 0 ? JSON.stringify(employeeFilter) : '无'}`);

    const accountFilter = JSON.parse(sc.accountFilter || '{}');
    console.log(`  账户筛选: ${Object.keys(accountFilter).length > 0 ? JSON.stringify(accountFilter) : '无'}`);
  } else {
    console.log('  ❌ 未配置分摊源（sourceConfig）');
  }

  // 6. 检查源数据（WorkHourResult）
  console.log('\n6. 检查源数据（WorkHourResult）:');

  let sourceQuery: any = {};
  let sourceDescription = [];

  // 应用来源配置的过滤
  if (a06Config.sourceConfig) {
    const sc = a06Config.sourceConfig;

    // 考勤代码过滤
    const sourceAttendanceCodes = JSON.parse(sc.attendanceCodes || '[]');
    if (sourceAttendanceCodes.length > 0) {
      // 查询DefinitionAttendanceCode获取ID
      const defCodes = await prisma.definitionAttendanceCode.findMany({
        where: { code: { in: sourceAttendanceCodes } }
      });
      const defCodeIds = defCodes.map(dc => dc.id);
      if (defCodeIds.length > 0) {
        sourceQuery.definitionAttendanceCodeId = { in: defCodeIds };
        sourceDescription.push(`考勤代码IDs: [${defCodeIds.join(', ')}]`);
      }
    }

    // 账户过滤
    const accountFilter = JSON.parse(sc.accountFilter || '{}');
    if (accountFilter.accountIds && accountFilter.accountIds.length > 0) {
      sourceQuery.accountId = { in: accountFilter.accountIds };
      sourceDescription.push(`账户IDs: [${accountFilter.accountIds.join(', ')}]`);
    }
  }

  // 如果规则也配置了考勤代码过滤，也应该应用
  if (attendanceCodeIds.length > 0) {
    sourceQuery.definitionAttendanceCodeId = { in: attendanceCodeIds };
    sourceDescription.push(`规则考勤代码IDs: [${attendanceCodeIds.join(', ')}]`);
  }

  console.log(`  查询条件: ${sourceDescription.length > 0 ? sourceDescription.join(', ') : '无（查询所有数据）'}`);

  const workHourResults = await prisma.workHourResult.findMany({
    where: sourceQuery,
    orderBy: { calcDate: 'desc' },
    take: 20,
    include: { employee: true }
  });

  console.log(`  找到 ${workHourResults.length} 条WorkHourResult记录`);

  if (workHourResults.length > 0) {
    console.log('\n  最近的5条记录:');
    workHourResults.slice(0, 5).forEach((result, index) => {
      console.log(`\n  [${index + 1}] ${result.employeeNo} - ${result.employee?.name}`);
      console.log(`     日期: ${result.calcDate.toISOString().split('T')[0]}`);
      console.log(`     考勤代码ID: ${result.definitionAttendanceCodeId}`);
      console.log(`     考勤代码: ${result.definitionAttendanceCodeStr}`);
      console.log(`     工时: ${result.workHours}`);
      console.log(`     账户ID: ${result.accountId}`);
      console.log(`     账户: ${result.accountName}`);
    });
  } else {
    console.log('  ❌❌❌ 没有找到符合条件的数据');
    console.log('  这是导致无法分摊的主要原因！');
  }

  // 7. 检查分摊结果
  console.log('\n7. 检查分摊结果（AllocationResult）:');
  const allocations = await prisma.allocationResult.findMany({
    where: { configId: a06Config.id },
    orderBy: { calcTime: 'desc' },
    take: 10
  });

  console.log(`  找到 ${allocations.length} 条分摊结果`);

  if (allocations.length > 0) {
    console.log('\n  最近的3条:');
    allocations.slice(0, 3).forEach((alloc, index) => {
      console.log(`\n  [${index + 1}] 批次: ${alloc.batchNo}`);
      console.log(`     日期: ${alloc.recordDate.toISOString().split('T')[0]}`);
      console.log(`     来源: ${alloc.sourceEmployeeNo}`);
      console.log(`     分摊工时: ${alloc.allocatedHours}`);
      console.log(`     目标: ${alloc.targetType} - ${alloc.targetName}`);
    });
  } else {
    console.log('  ❌ 该配置没有产生任何分摊结果');
  }

  // 8. 问题总结
  console.log('\n=== 问题总结 ===\n');

  const issues: string[] = [];
  const warnings: string[] = [];

  if (!rule.targets || rule.targets.length === 0) {
    issues.push('❌【主要问题1】该规则没有配置分配目标（AllocationRuleTarget）');
    issues.push('   影响: 分摊计算无法确定将工时分摊到哪里，导致无法生成任何分摊结果');
  }

  if (workHourResults.length === 0) {
    issues.push('❌【主要问题2】没有找到符合该规则的源数据（WorkHourResult）');
    if (attendanceCodeIds.length > 0) {
      warnings.push(`   规则配置的考勤代码IDs: [${attendanceCodeIds.join(', ')}]`);
    }
    if (a06Config.sourceConfig) {
      const sourceAttendanceCodes = JSON.parse(a06Config.sourceConfig.attendanceCodes || '[]');
      if (sourceAttendanceCodes.length > 0) {
        warnings.push(`   来源配置的考勤代码: [${sourceAttendanceCodes.join(', ')}]`);
      }
    }
  }

  if (allocations.length === 0) {
    if (issues.length === 0) {
      warnings.push('⚠️  配置正常但没有分摊结果');
      warnings.push('   可能原因: 没有执行过分摊计算，或分摊计算过程中出现错误');
    }
  }

  if (a06Config.status !== 'ACTIVE') {
    issues.push(`❌ 配置状态不是激活: ${a06Config.status}`);
  }

  if (rule.status !== 'ACTIVE') {
    issues.push(`❌ 规则状态不是激活: ${rule.status}`);
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

  // 9. 数据统计
  console.log('\n=== 数据统计 ===\n');

  const totalWorkHourResults = await prisma.workHourResult.count();
  console.log(`WorkHourResult总记录数: ${totalWorkHourResults}`);

  // 按考勤代码分组统计
  const workHourByCode = await prisma.$queryRawUnsafe<Array<{definitionAttendanceCodeId: number | null, count: number}>>`
    SELECT definitionAttendanceCodeId, COUNT(*) as count
    FROM WorkHourResult
    GROUP BY definitionAttendanceCodeId
    ORDER BY count DESC
  `;

  console.log('\n按考勤代码ID分组统计:');
  for (const stat of workHourByCode) {
    const codeId = stat.definitionAttendanceCodeId;
    if (codeId === null) {
      console.log(`  NULL: ${stat.count} 条`);
    } else {
      const defCode = await prisma.definitionAttendanceCode.findUnique({
        where: { id: Number(codeId) }
      });
      console.log(`  ID=${codeId} (${defCode?.code || 'N/A'}): ${stat.count} 条`);
    }
  }

  console.log('\n=== 诊断完成 ===');
}

diagnoseA06Rule()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
