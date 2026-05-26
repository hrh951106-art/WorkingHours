const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkId2Full() {
  console.log('🔍 检查ID=2的分摊配置（完整信息）\n');
  console.log('═'.repeat(80));

  // 1. 获取配置详情
  const configRaw = await prisma.$queryRaw`
    SELECT *
    FROM "AllocationConfig"
    WHERE id = 2
  `;

  if (!configRaw || configRaw.length === 0) {
    console.log('❌ 未找到ID=2的配置');
    await prisma.$disconnect();
    return;
  }

  const config = configRaw[0];
  console.log('\n1️⃣ 配置完整信息:');
  console.log(`  ID: ${config.id}`);
  console.log(`  配置名称: ${config.configName}`);
  console.log(`  描述: ${config.description || '(无)'}`);
  console.log(`  状态: ${config.status}`);
  console.log(`  sourceConfig: ${JSON.stringify(config.sourceConfig, null, 2)}`);

  // 2. 检查规则
  console.log('\n2️⃣ 关联的分摊规则:');
  const rules = await prisma.$queryRaw`
    SELECT id, "ruleName", "ruleType", status
    FROM "AllocationRuleConfig"
    WHERE "configId" = 2
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
    console.log('  ❌ 未找到关联规则');
  }

  // 3. 检查WorkHourResult数据
  console.log('\n3️⃣ WorkHourResult数据情况:');

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
          id: true,
          name: true,
        },
      },
    },
  });

  console.log(`  总共 ${allWorkHours.length} 条工时记录`);

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
      console.log(`    ${idx + 1}. ${wh.calcDate.toISOString().split('T')[0]} | ${wh.employee?.name || '(无)'} | ${wh.definitionAttendanceCodeStr} | ${wh.workHours}h`);
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

  // 5. 问题诊断
  console.log('\n5️⃣ 问题诊断:');
  console.log('═'.repeat(80));

  if (!config.sourceConfig) {
    console.log('  ❌ 【主要问题】sourceConfig字段为空');
    console.log('     影响：无法确定要分摊的数据来源（员工、账户、出勤代码）');
    console.log('     说明：这是导致没有分摊结果的根本原因');
  }

  console.log('\n6️⃣ 解决方案:');
  console.log('  1. 进入前端页面：成本分摊 → 分摊配置');
  console.log('  2. 找到"车间分摊"配置（ID=2）');
  console.log('  3. 点击编辑，配置"分摊源配置"：');
  console.log('     - 员工筛选：选择要分摊的员工（或留空表示全部）');
  console.log('     - 账户筛选：选择要分摊的账户（或留空表示全部）');
  console.log('     - 出勤代码：选择要分摊的出勤代码（例如：A04_WORKSHOP）');
  console.log('  4. 配置"分摊规则"：设置分摊目标和分摊方式');
  console.log('  5. 保存配置后，重新执行分摊计算');

  await prisma.$disconnect();
}

checkId2Full().catch(console.error);
