import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseG02Issue() {
  console.log('========================================');
  console.log('G02规则未找到待分摊工时记录 - 诊断');
  console.log('========================================\n');

  // 1. 查询G02规则配置
  console.log('第一步：查询G02规则配置\n');

  const g02Config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'G02',
      deletedAt: null,
    },
    include: {
      sourceConfig: true,
    },
  });

  if (!g02Config) {
    console.log('✗ 未找到G02配置');
    await prisma.$disconnect();
    return;
  }

  console.log(`G02配置ID: ${g02Config.id}`);
  console.log(`配置代码: ${g02Config.configCode}`);
  console.log(`配置名称: ${g02Config.configName}`);
  console.log(`状态: ${g02Config.status}`);
  console.log(`说明: ${g02Config.description || '无'}\n`);

  // 2. 查询G02的分摊规则
  const rules = await prisma.allocationRuleConfig.findMany({
    where: {
      configId: g02Config.id,
      deletedAt: null,
    },
  });

  console.log(`找到 ${rules.length} 条分摊规则:\n`);

  for (const rule of rules) {
    console.log(`----------------------------------------`);
    console.log(`规则ID: ${rule.id}`);
    console.log(`规则名称: ${rule.ruleName || '无'}`);
    console.log(`规则类型: ${rule.ruleType}`);
    console.log(`分摊依据: ${rule.allocationBasis}`);
    console.log(`分摊出勤代码: ${rule.allocationAttendanceCodes || '无'}`);
    console.log(`分摊归属层级: ${rule.allocationHierarchyLevels || '无'}`);
    console.log(`分摊范围ID: ${rule.allocationScopeId || '无'}`);
    console.log(`状态: ${rule.status}`);
    console.log(`----------------------------------------\n`);
  }

  // 3. 检查日期范围内的工时记录
  console.log('\n第二步：检查日期范围内的工时记录\n');

  const startDate = new Date('2026-03-01');
  const endDate = new Date('2026-03-12');
  endDate.setHours(23, 59, 59, 999);

  console.log(`日期范围: ${startDate.toISOString().split('T')[0]} ~ ${endDate.toISOString().split('T')[0]}\n`);

  // 查询所有工时记录
  const allCalcResults = await prisma.calcResult.findMany({
    where: {
      calcDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      employee: true,
    },
  });

  console.log(`该日期范围内共有 ${allCalcResults.length} 条工时记录\n`);

  if (allCalcResults.length === 0) {
    console.log('✗ 该日期范围内没有任何工时记录');
    console.log('请先生成工时记录后再执行分摊操作');
  } else {
    // 按出勤代码ID分组统计
    const attendanceStats: Record<string, number> = {};
    for (const record of allCalcResults) {
      const code = record.attendanceCodeId ? record.attendanceCodeId.toString() : 'NULL';
      attendanceStats[code] = (attendanceStats[code] || 0) + 1;
    }

    console.log('按出勤代码ID统计:');
    for (const [code, count] of Object.entries(attendanceStats)) {
      console.log(`  ${code}: ${count} 条`);
    }

    // 按账户统计
    const accountStats: Record<string, number> = {};
    for (const record of allCalcResults) {
      const account = record.accountName || 'NULL';
      accountStats[account] = (accountStats[account] || 0) + 1;
    }

    console.log('\n按账户统计 (前10个):');
    const sortedAccounts = Object.entries(accountStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    for (const [account, count] of sortedAccounts) {
      console.log(`  ${account}: ${count} 条`);
    }

    // 按日期统计
    const dateStats: Record<string, number> = {};
    for (const record of allCalcResults) {
      const date = record.calcDate.toISOString().split('T')[0];
      dateStats[date] = (dateStats[date] || 0) + 1;
    }

    console.log('\n按日期统计:');
    const sortedDates = Object.keys(dateStats).sort();
    for (const date of sortedDates) {
      console.log(`  ${date}: ${dateStats[date]} 条`);
    }
  }

  // 4. 检查G02规则配置的出勤代码
  console.log('\n第三步：验证G02规则的出勤代码配置\n');

  for (const rule of rules) {
    console.log(`规则: ${rule.ruleName || '无'} (类型: ${rule.ruleType})`);
    console.log(`----------------------------------------`);

    // 解析出勤代码配置
    const attendanceCodes = JSON.parse(rule.allocationAttendanceCodes || '[]');
    console.log(`配置的出勤代码ID: ${attendanceCodes.length > 0 ? attendanceCodes.join(', ') : '无'}`);

    if (attendanceCodes.length > 0) {
      // 查询这些出勤代码的工时记录数量
      for (const codeId of attendanceCodes) {
        const count = await prisma.calcResult.count({
          where: {
            calcDate: {
              gte: startDate,
              lte: endDate,
            },
            attendanceCodeId: codeId,
          },
        });
        console.log(`  出勤代码ID ${codeId}: ${count} 条记录`);
      }
    } else {
      console.log('\n⚠ 未配置出勤代码（可能会使用所有出勤代码）');
    }

    // 检查basisFilter中的账户筛选条件
    const basisFilter = JSON.parse(rule.basisFilter || '{}');
    if (basisFilter.accountIds && basisFilter.accountIds.length > 0) {
      console.log(`\n配置的账户ID: ${basisFilter.accountIds.join(', ')}`);

      for (const accountId of basisFilter.accountIds) {
        const account = await prisma.laborAccount.findUnique({
          where: { id: accountId },
        });
        console.log(`  ID ${accountId}: ${account?.name || '未找到'}`);

        const count = await prisma.calcResult.count({
          where: {
            calcDate: {
              gte: startDate,
              lte: endDate,
            },
            accountId: accountId,
          },
        });
        console.log(`    该账户的工时记录数: ${count}`);
      }
    } else {
      console.log('\n未配置账户筛选（使用所有账户）');
    }

    console.log();
  }

  console.log('========================================');
  console.log('诊断完成');
  console.log('========================================\n');

  // 5. 问题总结
  console.log('可能的问题原因:\n');

  if (allCalcResults.length === 0) {
    console.log('1. ✗ 该日期范围内没有任何工时记录');
    console.log('   解决方案：先执行工时计算，生成工时记录');
  } else {
    console.log('1. ✓ 该日期范围内有工时记录');
  }

  // 检查出勤代码匹配
  for (const rule of rules) {
    const attendanceCodes = JSON.parse(rule.allocationAttendanceCodes || '[]');
    if (attendanceCodes.length > 0) {
      let matchingCount = 0;
      for (const codeId of attendanceCodes) {
        const count = await prisma.calcResult.count({
          where: {
            calcDate: {
              gte: startDate,
              lte: endDate,
            },
            attendanceCodeId: codeId,
          },
        });
        matchingCount += count;
      }

      if (matchingCount === 0) {
        console.log(`2. ✗ G02规则配置的出勤代码在指定日期范围内没有工时记录`);
        console.log(`   解决方案：检查出勤代码配置，或修改日期范围`);
      } else {
        console.log(`2. ✓ G02规则配置的出勤代码有 ${matchingCount} 条工时记录`);
      }
    }
  }

  console.log('\n========================================\n');
}

diagnoseG02Issue()
  .catch((e) => {
    console.error('诊断失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
