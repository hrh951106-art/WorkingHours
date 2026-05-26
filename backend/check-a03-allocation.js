const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkA03Allocation() {
  console.log('🔍 A03分摊规则调试分析\n');
  console.log('═'.repeat(80));

  // 1. 查找A03分摊配置
  console.log('\n1️⃣ 查找A03分摊配置:');
  const allConfigs = await prisma.allocationConfig.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      configName: true,
      description: true,
    },
  });

  console.log('  所有激活的分摊配置:');
  allConfigs.forEach(c => {
    const isA03 = c.configName.includes('A03') || c.description?.includes('A03');
    console.log(`    ${isA03 ? '👉' : '  '} ID=${c.id}, 名称=${c.configName}, 描述=${c.description || '(无)'}`);
  });

  const a03Config = allConfigs.find(c =>
    c.configName.includes('A03') || c.description?.includes('A03')
  );

  if (!a03Config) {
    console.log('\n  ❌ 未找到A03分摊配置');
    await prisma.$disconnect();
    return;
  }

  console.log(`\n  找到A03配置: ID=${a03Config.id}, 名称=${a03Config.configName}`);

  // 2. 获取配置详情
  const configRaw = await prisma.$queryRaw`
    SELECT id, "configName", description, "sourceConfig", status
    FROM "AllocationConfig"
    WHERE id = ${a03Config.id}
  `;

  if (configRaw && configRaw.length > 0) {
    const config = configRaw[0];
    console.log('\n2️⃣ A03配置详情:');
    console.log(`  ID: ${config.id}`);
    console.log(`  名称: ${config.configName}`);
    console.log(`  描述: ${config.description || '(无)'}`);
    console.log(`  状态: ${config.status}`);

    if (config.sourceConfig) {
      const sourceConfig = typeof config.sourceConfig === 'string'
        ? JSON.parse(config.sourceConfig)
        : config.sourceConfig;

      console.log('\n3️⃣ 分摊源配置 (sourceConfig):');
      console.log(`  员工筛选: ${JSON.stringify(sourceConfig.employeeFilter || {})}`);
      console.log(`  账户筛选: ${JSON.stringify(sourceConfig.accountFilter || {})}`);
      console.log(`  出勤代码: ${JSON.stringify(sourceConfig.attendanceCodes || [])}`);

      const attendanceCodes = sourceConfig.attendanceCodes || [];

      // 4. 检查WorkHourResult数据
      console.log('\n4️⃣ WorkHourResult数据检查:');

      const whereClause = {
        status: { in: ['DRAFT', 'CONFIRMED', 'LOCKED'] },
      };

      if (attendanceCodes.length > 0) {
        whereClause.definitionAttendanceCodeStr = { in: attendanceCodes };
      }

      const workHours = await prisma.workHourResult.findMany({
        where: whereClause,
        orderBy: { calcDate: 'desc' },
        take: 10,
        select: {
          id: true,
          calcDate: true,
          definitionAttendanceCodeStr: true,
          workHours: true,
          status: true,
          employee: {
            select: {
              id: true,
              name: true,
              employeeNo: true,
            },
          },
        },
      });

      console.log(`  查询条件:`);
      console.log(`    出勤代码: ${JSON.stringify(attendanceCodes)}`);
      console.log(`    状态: DRAFT, CONFIRMED, LOCKED`);
      console.log(`\n  查询结果: ${workHours.length} 条`);

      if (workHours.length > 0) {
        console.log('\n  找到工时记录:');
        workHours.forEach((wh, idx) => {
          console.log(`    ${idx + 1}. ${wh.calcDate.toISOString().split('T')[0]} | 员工ID=${wh.employee?.id} | ${wh.employee?.name || '(无)'} | ${wh.definitionAttendanceCodeStr} | ${wh.workHours}h | ${wh.status}`);
        });
      } else {
        console.log('  ❌ 未找到符合条件的工时记录');

        // 显示所有可用的工时数据
        const allWorkHours = await prisma.workHourResult.findMany({
          orderBy: { calcDate: 'desc' },
          take: 20,
          select: {
            calcDate: true,
            definitionAttendanceCodeStr: true,
            workHours: true,
            status: true,
            employee: {
              select: {
                name: true,
              },
            },
          },
        });

        console.log('\n  📋 所有工时记录（最近20条）:');
        const codeCount = {};
        allWorkHours.forEach((wh, idx) => {
          const code = wh.definitionAttendanceCodeStr || '(无)';
          codeCount[code] = (codeCount[code] || 0) + 1;

          if (idx < 10) {
            console.log(`    ${idx + 1}. ${wh.calcDate.toISOString().split('T')[0]} | ${wh.employee?.name || '(无)'} | ${code} | ${wh.workHours}h | ${wh.status}`);
          }
        });

        console.log('\n  出勤代码分布:');
        Object.entries(codeCount).forEach(([code, count]) => {
          console.log(`    ${code}: ${count} 条`);
        });
      }
    } else {
      console.log('\n3️⃣ 分摊源配置 (sourceConfig):');
      console.log('  ❌ sourceConfig为空');
    }
  }

  // 5. 检查关联的分摊规则
  console.log('\n5️⃣ 关联的分摊规则:');
  const rules = await prisma.$queryRaw`
    SELECT id, "ruleName", "ruleType", status
    FROM "AllocationRuleConfig"
    WHERE "configId" = ${a03Config.id}
  `;

  if (rules && rules.length > 0) {
    rules.forEach((rule, idx) => {
      console.log(`  规则${idx + 1}:`);
      console.log(`    ID: ${rule.id}`);
      console.log(`    名称: ${rule.ruleName}`);
      console.log(`    类型: ${rule.ruleType}`);
      console.log(`    状态: ${rule.status}`);
    });
  } else {
    console.log('  ❌ 未找到关联的分摊规则');
  }

  // 6. 检查分摊结果
  console.log('\n6️⃣ 分摊结果检查:');
  const allocResults = await prisma.$queryRaw`
    SELECT "batchNo", "recordDate", "createdAt", "updatedAt"
    FROM "AllocationResult"
    WHERE "configId" = ${a03Config.id}
    ORDER BY "createdAt" DESC
    LIMIT 5
  `;

  if (allocResults && allocResults.length > 0) {
    console.log(`  找到 ${allocResults.length} 条分摊结果:`);
    allocResults.forEach((r, idx) => {
      console.log(`    ${idx + 1}. 批次=${r.batchNo}, 日期=${r.recordDate.toISOString().split('T')[0]}, 创建=${r.createdAt.toISOString().split('T')[0]}`);
    });
  } else {
    console.log('  ❌ 未找到A03的分摊结果');
  }

  // 7. 问题诊断
  console.log('\n7️⃣ 问题诊断:');
  console.log('═'.repeat(80));

  const sourceConfig = configRaw[0]?.sourceConfig
    ? (typeof configRaw[0].sourceConfig === 'string'
        ? JSON.parse(configRaw[0].sourceConfig)
        : configRaw[0].sourceConfig)
    : null;

  if (!sourceConfig) {
    console.log('  ❌ 【主要问题】sourceConfig字段为空');
    console.log('     影响：无法确定要分摊的数据来源');
  } else if (!sourceConfig.attendanceCodes || sourceConfig.attendanceCodes.length === 0) {
    console.log('  ❌ 【主要问题】出勤代码配置为空数组');
    console.log('     影响：无法查询到待分摊的工时数据');
  }

  if (allocResults.length === 0) {
    console.log('  ⚠️  【结果】没有分摊结果记录');
    console.log('     说明：从未成功执行过分摊计算，或执行后没有生成结果');
  }

  console.log('\n8️⃣ 建议:');
  if (!sourceConfig) {
    console.log('  1. 进入"成本分摊 > 分摊配置"页面');
    console.log('  2. 找到A03分摊配置');
    console.log('  3. 编辑并配置"分摊源配置"：');
    console.log('     - 员工筛选：选择要分摊的员工（或留空表示全部）');
    console.log('     - 账户筛选：选择要分摊的账户（或留空表示全部）');
    console.log('     - 出勤代码：选择要分摊的出勤代码（关键配置）');
    console.log('  4. 保存配置后重新执行分摊计算');
  }

  await prisma.$disconnect();
}

checkA03Allocation().catch(console.error);
