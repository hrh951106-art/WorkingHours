import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugA02Allocation() {
  console.log('🔍 A02分摊规则调试分析\n');
  console.log('═'.repeat(80));

  // 1. 查看A02分摊配置
  console.log('\n1️⃣ A02分摊规则配置:');
  const a02Config = await prisma.allocationConfig.findFirst({
    where: { configName: { contains: 'A02' } },
    include: {
      rules: true,
    },
  });

  if (a02Config) {
    console.log(`  配置ID: ${a02Config.id}`);
    console.log(`  配置名称: ${a02Config.configName}`);
    console.log(`  配置类型: ${a02Config.configType}`);
    console.log(`  状态: ${a02Config.status}`);
    console.log(`  规则数量: ${a02Config.rules.length}`);

    console.log('\n  分摊源配置 (sourceConfig):');
    const sourceConfig = a02Config.sourceConfig as any;
    console.log(`    员工筛选: ${JSON.stringify(sourceConfig?.employeeFilter || {})}`);
    console.log(`    账户筛选: ${JSON.stringify(sourceConfig?.accountFilter || {})}`);
    console.log(`    出勤代码: ${JSON.stringify(sourceConfig?.attendanceCodes || [])}`);

    console.log('\n  分摊规则:');
    a02Config.rules.forEach((rule, index) => {
      console.log(`    规则${index + 1}: ID=${rule.id}, 名称=${rule.ruleName}, 类型=${rule.ruleType}`);
      console.log(`      分摊源账户: ${JSON.stringify(rule.allocationSourceAccounts || [])}`);
      console.log(`      分摊目标账户: ${JSON.stringify(rule.allocationTargetAccounts || [])}`);
    });
  } else {
    console.log('  ❌ 未找到A02分摊配置');
    await prisma.$disconnect();
    return;
  }

  // 2. 检查SystemConfig配置
  console.log('\n2️⃣ SystemConfig配置（AL1001和AL1002）:');
  const systemConfigs = await prisma.systemConfig.findMany({
    where: {
      configKey: {
        in: ['actualHoursAllocationCode', 'indirectHoursAllocationCode'],
      },
    });

  const actualHoursConfig = systemConfigs.find(c => c.configKey === 'actualHoursAllocationCode');
  const indirectHoursConfig = systemConfigs.find(c => c.configKey === 'indirectHoursAllocationCode');

  console.log(`  AL1001（实际工时）: ${actualHoursConfig?.configValue || '未配置'}`);
  console.log(`  AL1002（间接工时）: ${indirectHoursConfig?.configValue || '未配置'}`);

  // 3. 检查WorkHourResult表中的数据
  console.log('\n3️⃣ WorkHourResult表数据检查:');

  const sourceConfig = a02Config.sourceConfig as any;
  const attendanceCodes = sourceConfig?.attendanceCodes || [];

  console.log(`  查询条件:`);
  console.log(`    出勤代码: ${JSON.stringify(attendanceCodes)}`);

  // 查询最近的工时数据
  const recentWorkHours = await prisma.workHourResult.findMany({
    where: {
      definitionAttendanceCodeStr: {
        in: attendanceCodes.length > 0 ? attendanceCodes : undefined,
      },
      status: { in: ['DRAFT', 'CONFIRMED', 'LOCKED'] },
    },
    orderBy: { calcDate: 'desc' },
    take: 10,
    include: {
      employee: {
        include: { org: true },
      },
    },
  });

  console.log(`\n  查询到 ${recentWorkHours.length} 条最近的工时记录:`);

  if (recentWorkHours.length > 0) {
    recentWorkHours.forEach((wh, index) => {
      console.log(`    ${index + 1}. 日期=${wh.calcDate.toISOString().split('T')[0]}, 员工=${wh.employee?.name || '(无)'}, 代码=${wh.definitionAttendanceCodeStr}, 工时=${wh.workHours}, 状态=${wh.status}`);
    });
  } else {
    console.log('    ❌ 未找到符合条件的工时记录');

    // 帮助诊断：查看所有工时记录
    const allWorkHours = await prisma.workHourResult.findMany({
      orderBy: { calcDate: 'desc' },
      take: 20,
      select: {
        calcDate: true,
        definitionAttendanceCodeStr: true,
        workHours: true,
        status: true,
      },
    });

    console.log('\n  📋 所有工时记录（最近20条）:');
    const codeCounts = new Map<string, number>();
    allWorkHours.forEach(wh => {
      const code = wh.definitionAttendanceCodeStr || '(无)';
      codeCounts.set(code, (codeCounts.get(code) || 0) + 1);
    });

    console.log('\n  出勤代码分布:');
    codeCounts.forEach((count, code) => {
      console.log(`    ${code}: ${count} 条`);
    });
  }

  // 4. 检查AllocationResult表
  console.log('\n4️⃣ AllocationResult分摊结果检查:');
  const recentAllocationResults = await prisma.allocationResult.findMany({
    where: {
      configId: a02Config.id,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log(`  最近 ${recentAllocationResults.length} 条分摊结果:`);
  if (recentAllocationResults.length > 0) {
    recentAllocationResults.forEach((ar, index) => {
      console.log(`    ${index + 1}. 批次号=${ar.batchNo}, 创建时间=${ar.createdAt.toISOString()}, 记录数=${ar.resultCount}`);
    });
  } else {
    console.log('    ❌ 未找到分摊结果');
  }

  // 5. 检查A02_LINE和A06代码
  console.log('\n5️⃣ DefinitionAttendanceCode代码验证:');
  const a02LineCode = await prisma.definitionAttendanceCode.findFirst({
    where: { code: 'A02_LINE' },
  });
  const a06Code = await prisma.definitionAttendanceCode.findFirst({
    where: { code: 'A06' },
  });

  console.log(`  A02_LINE: ${a02LineCode ? `✅ 存在 - ${a02LineCode.name} (ID=${a02LineCode.id})` : '❌ 不存在'}`);
  console.log(`  A06: ${a06Code ? `✅ 存在 - ${a06Code.name} (ID=${a06Code.id})` : '❌ 不存在'}`);

  // 6. 问题诊断
  console.log('\n6️⃣ 问题诊断:');
  console.log('═'.repeat(80));

  if (recentWorkHours.length === 0) {
    console.log('  ❌ 主要问题: 未找到待分摊的工时数据');
    console.log('\n  可能原因:');
    console.log('    1. WorkHourResult表中没有数据');
    console.log('    2. 配置的出勤代码与表中的数据不匹配');
    console.log(`    3. 当前配置的出勤代码: ${JSON.stringify(attendanceCodes)}`);

    if (attendanceCodes.length === 0) {
      console.log('    4. ⚠️  出勤代码配置为空数组，请检查A02分摊配置');
    }
  } else {
    console.log('  ✅ 找到了待分摊的工时数据');
    console.log(`     数据条数: ${recentWorkHours.length}`);
  }

  if (!actualHoursConfig?.configValue || !indirectHoursConfig?.configValue) {
    console.log('\n  ❌ 配置问题: SystemConfig中AL1001或AL1002未设置');
  }

  if (!a02LineCode || !a06Code) {
    console.log('\n  ❌ 代码问题: A02_LINE或A06在DefinitionAttendanceCode表中不存在');
  }

  console.log('\n7️⃣ 建议:');
  if (attendanceCodes.length === 0) {
    console.log('  ⚠️  请检查A02分摊配置的"分摊源配置"中的出勤代码是否正确配置');
  }
  if (recentWorkHours.length === 0) {
    console.log('  ⚠️  请确认WorkHourResult表中有符合配置条件的工时数据');
  }

  await prisma.$disconnect();
}

debugA02Allocation().catch(console.error);
