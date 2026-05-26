const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkA03Direct() {
  console.log('🔍 直接检查ID=3的分摊配置\n');
  console.log('═'.repeat(80));

  // 1. 查看ID=3的配置
  console.log('\n1️⃣ 配置基本信息:');
  const configRaw = await prisma.$queryRaw`
    SELECT id, "configCode", "configName", description, status,
           "effectiveDate", "expiryDate", "createdAt"
    FROM "AllocationConfig"
    WHERE id = 3
  `;

  if (configRaw && configRaw.length > 0) {
    const config = configRaw[0];
    console.log(`  ID: ${config.id}`);
    console.log(`  编码: ${config.configCode}`);
    console.log(`  名称: ${config.configName}`);
    console.log(`  描述: ${config.description || '(无)'}`);
    console.log(`  状态: ${config.status}`);
    console.log(`  生效日期: ${config.effectiveDate}`);
    console.log(`  失效日期: ${config.expiryDate || '(未设置)'}`);
    console.log(`  创建时间: ${config.createdAt}`);
  }

  // 2. 获取sourceConfig
  console.log('\n2️⃣ 数据源配置 (sourceConfig):');
  const sourceConfigRaw = await prisma.$queryRaw`
    SELECT "sourceConfigId", "sourceType", "employeeFilter", "accountFilter", "attendanceCodes"
    FROM "AllocationSourceConfig"
    WHERE "configId" = 3
  `;

  if (sourceConfigRaw && sourceConfigRaw.length > 0) {
    const sourceConfig = sourceConfigRaw[0];
    console.log(`  sourceConfigId: ${sourceConfig.sourceConfigId}`);
    console.log(`  sourceType: ${sourceConfig.sourceType}`);

    if (sourceConfig.employeeFilter) {
      const employeeFilter = typeof sourceConfig.employeeFilter === 'string'
        ? JSON.parse(sourceConfig.employeeFilter)
        : sourceConfig.employeeFilter;
      console.log(`  员工筛选: ${JSON.stringify(employeeFilter, null, 2).slice(0, 200)}...`);
    }

    if (sourceConfig.accountFilter) {
      const accountFilter = typeof sourceConfig.accountFilter === 'string'
        ? JSON.parse(sourceConfig.accountFilter)
        : sourceConfig.accountFilter;
      console.log(`  账户筛选: ${JSON.stringify(accountFilter, null, 2).slice(0, 200)}...`);
    }

    if (sourceConfig.attendanceCodes) {
      const attendanceCodes = typeof sourceConfig.attendanceCodes === 'string'
        ? JSON.parse(sourceConfig.attendanceCodes)
        : sourceConfig.attendanceCodes;
      console.log(`  出勤代码: ${JSON.stringify(attendanceCodes)}`);
      console.log(`  出勤代码数量: ${attendanceCodes.length}`);
    }
  } else {
    console.log('  ❌ 未找到sourceConfig记录');
  }

  // 3. 获取分摊规则
  console.log('\n3️⃣ 分摊规则配置:');
  const rulesRaw = await prisma.$queryRaw`
    SELECT id, "ruleName", "ruleType", "allocationBasis",
           "allocationAttendanceCodes", "allocationHierarchyLevels",
           "allocationScopeId", "basisFilter", status
    FROM "AllocationRuleConfig"
    WHERE "configId" = 3 AND "deletedAt" IS NULL
  `;

  if (rulesRaw && rulesRaw.length > 0) {
    console.log(`  找到 ${rulesRaw.length} 条规则:\n`);
    rulesRaw.forEach((rule, idx) => {
      console.log(`  规则 ${idx + 1}:`);
      console.log(`    ID: ${rule.id}`);
      console.log(`    名称: ${rule.ruleName}`);
      console.log(`    类型: ${rule.ruleType}`);
      console.log(`    分摊依据: ${rule.allocationBasis}`);

      if (rule.allocationScopeId) {
        console.log(`    分摊范围ID: ${rule.allocationScopeId}`);
      } else {
        console.log(`    分摊范围ID: (未配置)`);
      }

      if (rule.allocationAttendanceCodes) {
        const codes = typeof rule.allocationAttendanceCodes === 'string'
          ? JSON.parse(rule.allocationAttendanceCodes)
          : rule.allocationAttendanceCodes;
        console.log(`    出勤代码过滤: ${JSON.stringify(codes)}`);
      }

      if (rule.allocationHierarchyLevels) {
        const levels = typeof rule.allocationHierarchyLevels === 'string'
          ? JSON.parse(rule.allocationHierarchyLevels)
          : rule.allocationHierarchyLevels;
        console.log(`    层级过滤: ${JSON.stringify(levels).slice(0, 150)}...`);
      }

      if (rule.basisFilter) {
        const filter = typeof rule.basisFilter === 'string'
          ? JSON.parse(rule.basisFilter)
          : rule.basisFilter;
        console.log(`    基础过滤: ${JSON.stringify(filter).slice(0, 150)}...`);
      }

      console.log(`    状态: ${rule.status}`);
      console.log('');
    });
  } else {
    console.log('  ❌ 未找到分摊规则');
  }

  // 4. 检查工时数据
  console.log('\n4️⃣ 工时数据检查:');

  if (sourceConfigRaw && sourceConfigRaw[0]) {
    const sourceConfig = sourceConfigRaw[0];
    const attendanceCodes = typeof sourceConfig.attendanceCodes === 'string'
      ? JSON.parse(sourceConfig.attendanceCodes)
      : sourceConfig.attendanceCodes;

    if (attendanceCodes && attendanceCodes.length > 0) {
      console.log(`  查询条件: definitionAttendanceCodeStr IN (${JSON.stringify(attendanceCodes)})`);

      const workHours = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "WorkHourResult"
        WHERE "definitionAttendanceCodeStr" IN (${attendanceCodes.join(',')})
          AND status IN ('DRAFT', 'CONFIRMED', 'LOCKED')
      `;

      console.log(`  符合条件的工时记录数: ${workHours[0].count}`);

      if (workHours[0].count > 0) {
        // 显示一些示例数据
        const samples = await prisma.$queryRaw`
          SELECT "calcDate", "employeeId", "definitionAttendanceCodeStr",
                 "workHours", "accountId", "accountName"
          FROM "WorkHourResult"
          WHERE "definitionAttendanceCodeStr" IN (${attendanceCodes.join(',')})
            AND status IN ('DRAFT', 'CONFIRMED', 'LOCKED')
          LIMIT 5
        `;

        console.log('\n  示例数据:');
        samples.forEach((sample, idx) => {
          console.log(`    ${idx + 1}. ${sample.calcDate.toISOString().split('T')[0]} | 员工ID=${sample.employeeId} | ${sample.definitionAttendanceCodeStr} | ${sample.workHours}h | 账户=${sample.accountName || '(无)'}`);
        });
      } else {
        console.log('  ❌ 没有符合条件的工时数据');
      }
    } else {
      console.log('  ⚠️  未配置出勤代码');
    }
  }

  // 5. 检查分摊目标（如果使用targets）
  console.log('\n5️⃣ 分摊目标配置:');

  if (rulesRaw && rulesRaw.length > 0) {
    const ruleId = rulesRaw[0].id;

    const targetsRaw = await prisma.$queryRaw`
      SELECT "allocationTargetId", "accountId", "accountName", "weight", "percentage"
      FROM "AllocationTarget"
      WHERE "ruleId" = ${ruleId}
    `;

    if (targetsRaw && targetsRaw.length > 0) {
      console.log(`  找到 ${targetsRaw.length} 个分摊目标:`);
      targetsRaw.forEach((target, idx) => {
        console.log(`    ${idx + 1}. 账户ID=${target.accountId}, 名称=${target.accountName || '(无)'}, 权重=${target.weight || 0}, 比例=${target.percentage || 0}%`);
      });
    } else {
      console.log('  ⚠️  未配置固定分摊目标（可能使用动态匹配）');
    }
  }

  // 6. 检查分摊结果
  console.log('\n6️⃣ 分摊结果检查:');

  const allocResults = await prisma.$queryRaw`
    SELECT "batchNo", "recordDate", "resultCount", "status", "createdAt"
    FROM "AllocationResult"
    WHERE "configId" = 3
    ORDER BY "createdAt" DESC
    LIMIT 5
  `;

  if (allocResults && allocResults.length > 0) {
    console.log(`  找到 ${allocResults.length} 条分摊结果:`);
    allocResults.forEach((r, idx) => {
      console.log(`    ${idx + 1}. 批次=${r.batchNo}, 日期=${r.recordDate.toISOString().split('T')[0]}, 结果数=${r.resultCount}, 状态=${r.status || '无'}, 创建=${r.createdAt.toISOString().split('T')[0]}`);
    });
  } else {
    console.log('  ❌ 没有分摊结果记录');
  }

  // 7. 问题诊断
  console.log('\n7️⃣ 问题诊断:');
  console.log('═'.repeat(80));

  const hasSourceConfig = sourceConfigRaw && sourceConfigRaw.length > 0;
  const hasAttendanceCodes = hasSourceConfig && sourceConfigRaw[0].attendanceCodes;
  const hasRules = rulesRaw && rulesRaw.length > 0;
  const hasResults = allocResults && allocResults.length > 0;

  if (!hasSourceConfig) {
    console.log('  ❌ 【问题1】没有配置数据源（sourceConfig）');
  }

  if (!hasAttendanceCodes) {
    console.log('  ❌ 【问题2】没有配置出勤代码');
    console.log('     影响：无法查询到待分摊的工时数据');
  }

  if (!hasRules) {
    console.log('  ❌ 【问题3】没有配置分摊规则');
  }

  if (!hasResults) {
    console.log('  ❌ 【结果】没有分摊结果记录');
    console.log('     说明：从未成功执行过分摊计算');
  }

  // 8. 检查开线计划数据
  console.log('\n8️⃣ 开线计划数据检查:');

  const lineShifts = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM "LineShift"
    WHERE "deletedAt" IS NULL
      AND status = 'ACTIVE'
  `;

  console.log(`  活跃的开线计划记录数: ${lineShifts[0].count}`);

  if (lineShifts[0].count > 0) {
    const recentShifts = await prisma.$queryRaw`
      SELECT "scheduleDate", "shiftName", "accountName", "orgName", "participateInAllocation"
      FROM "LineShift"
      WHERE "deletedAt" IS NULL
        AND status = 'ACTIVE'
      ORDER BY "scheduleDate" DESC
      LIMIT 3
    `;

    console.log('\n  最近的3条开线计划:');
    recentShifts.forEach((shift, idx) => {
      console.log(`    ${idx + 1}. ${shift.scheduleDate.toISOString().split('T')[0]} | ${shift.shiftName} | ${shift.accountName || '(无账户)'} | ${shift.orgName || '(无组织)'} | 参与分摊=${shift.participateInAllocation}`);
    });
  }

  await prisma.$disconnect();
}

checkA03Direct().catch(console.error);
