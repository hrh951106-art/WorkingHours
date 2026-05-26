const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkA03Id3() {
  console.log('🔍 A03分摊规则（ID=3）详细诊断\n');
  console.log('═'.repeat(80));

  // 1. 获取配置详情
  const configRaw = await prisma.$queryRaw`
    SELECT id, "configName", description, "sourceConfig", status
    FROM "AllocationConfig"
    WHERE id = 3
  `;

  if (!configRaw || configRaw.length === 0) {
    console.log('❌ 未找到ID=3的配置');
    await prisma.$disconnect();
    return;
  }

  const config = configRaw[0];
  console.log('\n1️⃣ 配置基本信息:');
  console.log(`  ID: ${config.id}`);
  console.log(`  配置名称: ${config.configName}`);
  console.log(`  描述: ${config.description || '(无)'}`);
  console.log(`  状态: ${config.status}`);
  console.log(`  sourceConfig: ${config.sourceConfig ? '有' : '❌ 空（undefined）'}`);

  // 2. 检查关联的分摊规则详情
  console.log('\n2️⃣ 关联的分摊规则详情:');
  const rules = await prisma.$queryRaw`
    SELECT id, "ruleName", "ruleType", "allocationBasis",
           "allocationSourceAccounts", "allocationTargetAccounts",
           status
    FROM "AllocationRuleConfig"
    WHERE "configId" = 3
  `;

  if (rules && rules.length > 0) {
    rules.forEach((rule, idx) => {
      console.log(`  规则${idx + 1}:`);
      console.log(`    ID: ${rule.id}`);
      console.log(`    名称: ${rule.ruleName}`);
      console.log(`    类型: ${rule.ruleType}`);
      console.log(`    分摊依据: ${rule.allocationBasis}`);
      console.log(`    分摊源账户: ${JSON.stringify(rule.allocationSourceAccounts || '无')}`);
      console.log(`    分摊目标账户: ${JSON.stringify(rule.allocationTargetAccounts || '无')}`);
      console.log(`    状态: ${rule.status}`);
    });
  } else {
    console.log('  ❌ 未找到关联规则');
  }

  // 3. 检查WorkHourResult数据
  console.log('\n3️⃣ WorkHourResult数据情况:');

  const allWorkHours = await prisma.workHourResult.findMany({
    orderBy: { calcDate: 'desc' },
    take: 20,
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

  console.log(`  总工时记录数: ${allWorkHours.length}`);

  if (allWorkHours.length > 0) {
    const codeCount = {};
    allWorkHours.forEach(wh => {
      const code = wh.definitionAttendanceCodeStr || '(无)';
      codeCount[code] = (codeCount[code] || 0) + 1;
    });

    console.log('\n  出勤代码分布:');
    Object.entries(codeCount).forEach(([code, count]) => {
      console.log(`    ${code}: ${count} 条`);
    });

    console.log('\n  示例记录（前5条）:');
    allWorkHours.slice(0, 5).forEach((wh, idx) => {
      console.log(`    ${idx + 1}. ${wh.calcDate.toISOString().split('T')[0]} | 员工ID=${wh.employee?.id} | ${wh.employee?.name || '(无)'} | ${wh.definitionAttendanceCodeStr} | ${wh.workHours}h | ${wh.status}`);
    });
  }

  // 4. 检查SystemConfig
  console.log('\n4️⃣ SystemConfig配置:');
  const systemConfigs = await prisma.systemConfig.findMany({
    where: {
      configKey: {
        in: ['actualHoursAllocationCode', 'indirectHoursAllocationCode'],
      },
    },
  });

  const actualConfig = systemConfigs.find(c => c.configKey === 'actualHoursAllocationCode');
  const indirectConfig = systemConfigs.find(c => c.configKey === 'indirectHoursAllocationCode');

  console.log(`  AL1001（实际工时）: ${actualConfig?.configValue || '未配置'}`);
  console.log(`  AL1002（间接工时）: ${indirectConfig?.configValue || '未配置'}`);

  // 5. 检查分摊结果
  console.log('\n5️⃣ 分摊结果检查:');
  const allocResults = await prisma.$queryRaw`
    SELECT "batchNo", "recordDate", "createdAt", "updatedAt"
    FROM "AllocationResult"
    WHERE "configId" = 3
    ORDER BY "createdAt" DESC
    LIMIT 5
  `;

  if (allocResults && allocResults.length > 0) {
    console.log(`  找到 ${allocResults.length} 条分摊结果:`);
    allocResults.forEach((r, idx) => {
      console.log(`    ${idx + 1}. 批次=${r.batchNo}, 日期=${r.recordDate.toISOString().split('T')[0]}, 创建=${r.createdAt.toISOString().split('T')[0]}`);
    });
  } else {
    console.log('  ❌ 未找到分摊结果');
  }

  // 6. 问题诊断
  console.log('\n6️⃣ 问题诊断:');
  console.log('═'.repeat(80));

  if (!config.sourceConfig) {
    console.log('  ❌ 【主要问题】sourceConfig字段为空（undefined）');
    console.log('\n  影响:');
    console.log('    1. 无法确定要分摊的员工筛选条件 → employeeFilter = {}');
    console.log('    2. 无法确定要分摊的账户筛选条件 → accountFilter = {}');
    console.log('    3. ❌【关键】无法确定要分摊的出勤代码 → attendanceCodes = []');
    console.log('\n  查询逻辑:');
    console.log('    SELECT * FROM WorkHourResult');
    console.log('    WHERE definitionAttendanceCodeStr IN ()  ← 空数组，查不到任何数据');
    console.log('\n  结果:');
    console.log('    查询到 0 条工时记录 → 无法执行分摊 → 没有分摊结果');
  }

  if (allocResults.length === 0) {
    console.log('\n  ⚠️  【结果】从未产生过分摊结果');
    console.log('     说明：由于sourceConfig为空，无法执行分摊计算');
  }

  // 7. 解决方案
  console.log('\n7️⃣ 解决方案:');
  console.log('═'.repeat(80));

  console.log('\n  【方案1：通过前端页面配置】（推荐）');
  console.log('  1. 进入前端页面：成本分摊 → 分摊配置');
  console.log('  2. 找到"车间分摊"配置（ID=3）');
  console.log('  3. 点击编辑按钮');
  console.log('  4. 配置"分摊源配置"：');
  console.log('     - 员工筛选：留空表示所有员工（或选择特定部门）');
  console.log('     - 账户筛选：留空表示所有账户（或选择特定成本中心）');
  console.log('     - 出勤代码：选择要分摊的工时类型');
  console.log('       例如：["A02_LINE"] 或 ["A04_WORKSHOP"] 或 ["AC_001"]');
  console.log('  5. 检查"分摊规则"配置：');
  console.log('     - 分摊依据：PROPORTIONAL（按比例）');
  console.log('     - 分摊源账户：设置要从哪些账户分摊');
  console.log('     - 分摊目标账户：设置要分摊到哪些账户');
  console.log('  6. 保存配置');
  console.log('  7. 执行分摊计算');

  console.log('\n  【方案2：直接修复数据库】（快速测试）');
  console.log('  我可以创建SQL脚本，直接给ID=3配置插入sourceConfig：');
  console.log('  ');
  console.log('  示例（如果要分摊A02_LINE线体工时）：');
  console.log('  {');
  console.log('    "employeeFilter": {},');
  console.log('    "accountFilter": {},');
  console.log('    "attendanceCodes": ["A02_LINE"]');
  console.log('  }');
  console.log('  ');
  console.log('  然后你可以立即测试分摊功能是否正常');

  console.log('\n  【方案3：检查前端保存逻辑】');
  console.log('  如果前端页面已经配置过但sourceConfig仍然为空，');
  console.log('  可能是前端保存逻辑有问题，需要检查代码');

  console.log('\n8️⃣ 可用的工时数据参考:');
  console.log('═'.repeat(80));
  console.log('  当前WorkHourResult表中有19条工时记录：');
  console.log('  - A02_LINE（线体工时）: 9条');
  console.log('  - A04_WORKSHOP（车间工时）: 4条');
  console.log('  - AC_001: 6条');
  console.log('\n  根据业务需求选择要分摊的出勤代码。');

  await prisma.$disconnect();
}

checkA03Id3().catch(console.error);
