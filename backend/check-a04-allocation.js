const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkA04Allocation() {
  console.log('🔍 A04分摊规则调试分析\n');
  console.log('═'.repeat(80));

  // 1. 查找A04分摊配置
  console.log('\n1️⃣ 查找A04分摊配置:');
  const allConfigs = await prisma.allocationConfig.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      configCode: true,
      configName: true,
      description: true,
    },
  });

  console.log('  所有激活的分摊配置:');
  allConfigs.forEach(c => {
    const isA04 = c.configCode?.includes('A04') ||
                  c.configName?.includes('A04') ||
                  c.description?.includes('A04');
    console.log(`    ${isA04 ? '👉' : '  '} ID=${c.id}, 编码=${c.configCode}, 名称=${c.configName}, 描述=${c.description || '(无)'}`);
  });

  const a04Config = allConfigs.find(c =>
    c.configCode?.includes('A04') ||
    c.configName?.includes('A04') ||
    c.description?.includes('A04')
  );

  if (!a04Config) {
    console.log('\n  ❌ 未找到A04分摊配置');
    await prisma.$disconnect();
    return;
  }

  console.log(`\n  ✅ 找到A04配置: ID=${a04Config.id}, 编码=${a04Config.configCode}, 名称=${a04Config.configName}`);

  // 2. 获取sourceConfig
  console.log('\n2️⃣ 数据源配置 (sourceConfig):');
  const sourceConfigRaw = await prisma.$queryRaw`
    SELECT "sourceConfigId", "sourceType", "employeeFilter", "accountFilter", "attendanceCodes"
    FROM "AllocationSourceConfig"
    WHERE "configId" = ${a04Config.id}
  `;

  if (sourceConfigRaw && sourceConfigRaw.length > 0) {
    const sourceConfig = sourceConfigRaw[0];
    console.log(`  sourceConfigId: ${sourceConfig.sourceConfigId}`);
    console.log(`  sourceType: ${sourceConfig.sourceType}`);

    let employeeFilter = null;
    let accountFilter = null;
    let attendanceCodes = [];

    if (sourceConfig.employeeFilter) {
      employeeFilter = typeof sourceConfig.employeeFilter === 'string'
        ? JSON.parse(sourceConfig.employeeFilter)
        : sourceConfig.employeeFilter;
      const groupCount = employeeFilter.fieldGroups?.length || 0;
      console.log(`  员工筛选: ${groupCount}个字段组`);
    }

    if (sourceConfig.accountFilter) {
      accountFilter = typeof sourceConfig.accountFilter === 'string'
        ? JSON.parse(sourceConfig.accountFilter)
        : sourceConfig.accountFilter;
      const selectionCount = accountFilter.hierarchySelections?.length || 0;
      console.log(`  账户筛选: ${selectionCount}个层级选择`);
      if (selectionCount > 0) {
        accountFilter.hierarchySelections.forEach(sel => {
          console.log(`    - level=${sel.level}, ${sel.levelName}, ${sel.valueIds.length}个值`);
        });
      }
    }

    if (sourceConfig.attendanceCodes) {
      attendanceCodes = typeof sourceConfig.attendanceCodes === 'string'
        ? JSON.parse(sourceConfig.attendanceCodes)
        : sourceConfig.attendanceCodes;
      console.log(`  出勤代码: ${JSON.stringify(attendanceCodes)}`);
      console.log(`  出勤代码数量: ${attendanceCodes.length}`);
    }

    // 3. 检查工时数据
    console.log('\n3️⃣ 工时数据检查:');

    if (attendanceCodes.length > 0) {
      console.log(`  查询条件: definitionAttendanceCodeStr IN (${JSON.stringify(attendanceCodes)})`);

      const workHoursCount = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "WorkHourResult"
        WHERE "definitionAttendanceCodeStr" IN (${attendanceCodes.join(',')})
          AND status IN ('DRAFT', 'CONFIRMED', 'LOCKED')
      `;

      console.log(`  符合条件的工时记录总数: ${workHoursCount[0].count}`);

      if (workHoursCount[0].count > 0) {
        // 显示一些示例数据
        const workHours = await prisma.$queryRaw`
          SELECT "calcDate", "employeeId", "definitionAttendanceCodeStr",
                 "workHours", "accountId", "accountName"
          FROM "WorkHourResult"
          WHERE "definitionAttendanceCodeStr" IN (${attendanceCodes.join(',')})
            AND status IN ('DRAFT', 'CONFIRMED', 'LOCKED')
          ORDER BY "calcDate" DESC
          LIMIT 10
        `;

        console.log('\n  示例数据（最近10条）:');
        workHours.forEach((wh, idx) => {
          const dateStr = wh.calcDate ? wh.calcDate.toISOString().split('T')[0] : '(无日期)';
          console.log(`    ${idx + 1}. ${dateStr} | 员工ID=${wh.employeeId} | ${wh.definitionAttendanceCodeStr} | ${wh.workHours}h | 账户=${wh.accountName || '(无)'}`);
        });

        // 统计日期分布
        const dateStats = {};
        workHours.forEach(wh => {
          if (wh.calcDate) {
            const dateStr = wh.calcDate.toISOString().split('T')[0];
            if (!dateStats[dateStr]) {
              dateStats[dateStr] = { count: 0, hours: 0 };
            }
            dateStats[dateStr].count++;
            dateStats[dateStr].hours += wh.workHours;
          }
        });

        console.log('\n  日期分布:');
        Object.entries(dateStats).forEach(([date, stats]) => {
          console.log(`    ${date}: ${stats.count}条, ${stats.hours}小时`);
        });
      } else {
        console.log('  ❌ 没有符合条件的工时数据');

        // 显示所有可用的出勤代码
        const allCodes = await prisma.$queryRaw`
          SELECT "definitionAttendanceCodeStr", COUNT(*) as count
          FROM "WorkHourResult"
          WHERE status IN ('DRAFT', 'CONFIRMED', 'LOCKED')
          GROUP BY "definitionAttendanceCodeStr"
          ORDER BY count DESC
        `;

        console.log('\n  所有可用的出勤代码:');
        allCodes.forEach(code => {
          console.log(`    ${code.definitionAttendanceCodeStr}: ${code.count}条`);
        });
      }
    } else {
      console.log('  ⚠️  未配置出勤代码');
    }
  } else {
    console.log('  ❌ 未找到sourceConfig记录');
  }

  // 4. 获取分摊规则
  console.log('\n4️⃣ 分摊规则配置:');
  const rulesRaw = await prisma.$queryRaw`
    SELECT id, "ruleName", "ruleType", "allocationBasis",
           "allocationAttendanceCodes", "allocationHierarchyLevels",
           "allocationScopeId", "basisFilter", status
    FROM "AllocationRuleConfig"
    WHERE "configId" = ${a04Config.id} AND "deletedAt" IS NULL
  `;

  if (rulesRaw && rulesRaw.length > 0) {
    console.log(`  找到 ${rulesRaw.length} 条规则:\n`);
    rulesRaw.forEach((rule, idx) => {
      console.log(`  规则 ${idx + 1}:`);
      console.log(`    ID: ${rule.id}`);
      console.log(`    名称: ${rule.ruleName}`);
      console.log(`    类型: ${rule.ruleType}`);
      console.log(`    分摊依据: ${rule.allocationBasis}`);
      console.log(`    分摊范围ID: ${rule.allocationScopeId || '(未配置)'}`);

      if (rule.allocationAttendanceCodes) {
        const codes = typeof rule.allocationAttendanceCodes === 'string'
          ? JSON.parse(rule.allocationAttendanceCodes)
          : rule.allocationAttendanceCodes;
        if (codes.length > 0) {
          console.log(`    出勤代码过滤: ${JSON.stringify(codes)}`);
        }
      }

      if (rule.allocationHierarchyLevels) {
        const levels = typeof rule.allocationHierarchyLevels === 'string'
          ? JSON.parse(rule.allocationHierarchyLevels)
          : rule.allocationHierarchyLevels;
        if (levels.length > 0) {
          console.log(`    层级过滤: ${levels.length}个层级配置`);
        }
      }

      if (rule.basisFilter) {
        const filter = typeof rule.basisFilter === 'string'
          ? JSON.parse(rule.basisFilter)
          : rule.basisFilter;
        if (Object.keys(filter).length > 0) {
          console.log(`    基础过滤: ${JSON.stringify(filter).slice(0, 100)}...`);
        }
      }

      console.log(`    状态: ${rule.status}`);
      console.log('');
    });
  } else {
    console.log('  ❌ 未找到分摊规则');
  }

  // 5. 检查分摊范围配置
  console.log('\n5️⃣ 分摊范围配置检查:');

  if (rulesRaw && rulesRaw.length > 0 && rulesRaw[0].allocationScopeId) {
    const scopeId = rulesRaw[0].allocationScopeId;

    const scopeConfig = await prisma.$queryRaw`
      SELECT id, level, name, "mappingType", "mappingValue", status
      FROM "AccountHierarchyConfig"
      WHERE id = ${scopeId}
    `;

    if (scopeConfig && scopeConfig.length > 0) {
      const scope = scopeConfig[0];
      console.log(`  分摊范围ID: ${scope.id}`);
      console.log(`  层级: ${scope.level}`);
      console.log(`  名称: ${scope.name}`);
      console.log(`  映射类型: ${scope.mappingType}`);
      console.log(`  映射值: ${scope.mappingValue || '(无)'}`);
      console.log(`  状态: ${scope.status}`);
    } else {
      console.log(`  ❌ 未找到分摊范围ID=${scopeId}的配置`);
    }
  } else {
    console.log('  ⚠️  未配置分摊范围');
  }

  // 6. 检查开线计划数据
  console.log('\n6️⃣ 开线计划数据检查:');

  const lineShifts = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM "LineShift"
    WHERE "deletedAt" IS NULL
      AND status = 'ACTIVE'
  `;

  console.log(`  活跃的开线计划记录总数: ${lineShifts[0].count}`);

  if (lineShifts[0].count > 0) {
    // 获取最近的计划和日期分布
    const recentShifts = await prisma.$queryRaw`
      SELECT "scheduleDate", "shiftName", "accountName", "orgName",
             "participateInAllocation"
      FROM "LineShift"
      WHERE "deletedAt" IS NULL
        AND status = 'ACTIVE'
      ORDER BY "scheduleDate" DESC
      LIMIT 5
    `;

    console.log('\n  最近的5条开线计划:');
    recentShifts.forEach((shift, idx) => {
      const dateStr = shift.scheduleDate ? shift.scheduleDate.toISOString().split('T')[0] : '(无日期)';
      console.log(`    ${idx + 1}. ${dateStr} | ${shift.shiftName} | ${shift.accountName || '(无账户)'} | ${shift.orgName || '(无组织)'} | 参与分摊=${shift.participateInAllocation}`);
    });

    // 获取日期分布
    const dateDist = await prisma.$queryRaw`
      SELECT "scheduleDate", COUNT(*) as count
      FROM "LineShift"
      WHERE "deletedAt" IS NULL
        AND status = 'ACTIVE'
      GROUP BY "scheduleDate"
      ORDER BY "scheduleDate" DESC
    `;

    console.log('\n  开线计划日期分布:');
    dateDist.forEach(d => {
      const dateStr = d.scheduleDate ? d.scheduleDate.toISOString().split('T')[0] : '(无日期)';
      console.log(`    ${dateStr}: ${d.count}条`);
    });
  }

  // 7. 检查分摊结果
  console.log('\n7️⃣ 分摊结果检查:');

  const allocResults = await prisma.$queryRaw`
    SELECT "batchNo", "recordDate", "resultCount", "createdAt"
    FROM "AllocationResult"
    WHERE "configId" = ${a04Config.id}
    ORDER BY "createdAt" DESC
    LIMIT 5
  `;

  if (allocResults && allocResults.length > 0) {
    console.log(`  找到 ${allocResults.length} 条分摊结果:`);
    allocResults.forEach((r, idx) => {
      const dateStr = r.recordDate ? r.recordDate.toISOString().split('T')[0] : '(无日期)';
      const createdStr = r.createdAt ? r.createdAt.toISOString().split('T')[0] : '(无日期)';
      console.log(`    ${idx + 1}. 批次=${r.batchNo}, 日期=${dateStr}, 结果数=${r.resultCount}, 创建=${createdStr}`);
    });
  } else {
    console.log('  ❌ 没有分摊结果记录');
  }

  // 8. 问题诊断
  console.log('\n8️⃣ 问题诊断:');
  console.log('═'.repeat(80));

  const issues = [];
  const warnings = [];

  if (!sourceConfigRaw || sourceConfigRaw.length === 0) {
    issues.push('❌ 【主要问题】没有配置数据源（sourceConfig）');
  } else {
    const sourceConfig = sourceConfigRaw[0];
    const attendanceCodes = typeof sourceConfig.attendanceCodes === 'string'
      ? JSON.parse(sourceConfig.attendanceCodes)
      : sourceConfig.attendanceCodes;

    if (!attendanceCodes || attendanceCodes.length === 0) {
      issues.push('❌ 【主要问题】没有配置出勤代码');
      issues.push('   影响：无法查询到待分摊的工时数据');
    }
  }

  if (!rulesRaw || rulesRaw.length === 0) {
    issues.push('❌ 【主要问题】没有配置分摊规则');
  } else {
    if (!rulesRaw[0].allocationScopeId) {
      warnings.push('⚠️  【警告】未配置分摊范围，可能影响分摊逻辑');
    }
  }

  if (lineShifts[0].count === 0) {
    issues.push('❌ 【主要问题】没有开线计划数据');
    issues.push('   影响：没有分摊目标，无法生成分摊结果');
  }

  if (!allocResults || allocResults.length === 0) {
    warnings.push('⚠️  【结果】没有分摊结果记录');
    warnings.push('   说明：从未成功执行过分摊计算，或执行后没有生成结果');
  }

  if (issues.length > 0) {
    console.log('  发现的问题:\n');
    issues.forEach(issue => console.log(`  ${issue}`));
  }

  if (warnings.length > 0) {
    console.log('\n  警告信息:\n');
    warnings.forEach(warning => console.log(`  ${warning}`));
  }

  if (issues.length === 0 && warnings.length === 0) {
    console.log('  ✅ 配置和数据都正常');
    console.log('  建议：检查后端日志查看具体的执行错误');
  }

  // 9. 解决方案建议
  if (issues.length > 0) {
    console.log('\n9️⃣ 解决方案建议:\n');

    if (issues.some(i => i.includes('出勤代码'))) {
      console.log('  1. 配置出勤代码：');
      console.log('     - 进入：成本分摊 → 分摊配置');
      console.log('     - 找到A04配置并编辑');
      console.log('     - 在"数据源配置"中选择要分摊的出勤代码');
    }

    if (issues.some(i => i.includes('开线计划'))) {
      console.log('\n  2. 创建开线计划：');
      console.log('     - 进入：生产管理 → 开线维护');
      console.log('     - 选择日期并添加产线计划');
      console.log('     - 确保标记为"参与分摊"');
    }

    if (issues.some(i => i.includes('分摊规则'))) {
      console.log('\n  3. 配置分摊规则：');
      console.log('     - 在A04配置中添加分摊规则');
      console.log('     - 选择分摊依据和分摊范围');
    }
  }

  await prisma.$disconnect();
}

checkA04Allocation().catch(console.error);
