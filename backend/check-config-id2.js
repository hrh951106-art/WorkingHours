const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkConfigId2() {
  console.log('🔍 检查ID=2的分摊配置\n');
  console.log('═'.repeat(80));

  // 1. 获取配置详情
  const configRaw = await prisma.$queryRaw`
    SELECT id, "configName", "sourceConfig", status
    FROM "AllocationConfig"
    WHERE id = 2
  `;

  if (!configRaw || configRaw.length === 0) {
    console.log('❌ 未找到ID=2的配置');
    await prisma.$disconnect();
    return;
  }

  const config = configRaw[0];
  console.log('\n1️⃣ 配置基本信息:');
  console.log(`  ID: ${config.id}`);
  console.log(`  名称: ${config.configName}`);
  console.log(`  状态: ${config.status}`);

  const sourceConfig = typeof config.sourceConfig === 'string'
    ? JSON.parse(config.sourceConfig)
    : config.sourceConfig;

  console.log('\n2️⃣ 分摊源配置 (sourceConfig):');
  console.log(`  员工筛选: ${JSON.stringify(sourceConfig.employeeFilter || {})}`);
  console.log(`  账户筛选: ${JSON.stringify(sourceConfig.accountFilter || {})}`);
  console.log(`  出勤代码: ${JSON.stringify(sourceConfig.attendanceCodes || [])}`);

  const attendanceCodes = sourceConfig.attendanceCodes || [];

  // 3. 检查WorkHourResult数据
  console.log('\n3️⃣ WorkHourResult数据检查:');

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

  // 4. 检查分摊结果
  console.log('\n4️⃣ 分摊结果检查:');
  const allocResults = await prisma.$queryRaw`
    SELECT "batchNo", "recordDate", "createdAt", "updatedAt"
    FROM "AllocationResult"
    WHERE "configId" = 2
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

  // 5. 问题诊断
  console.log('\n5️⃣ 问题诊断:');
  console.log('═'.repeat(80));

  if (attendanceCodes.length === 0) {
    console.log('  ⚠️  【主要问题】出勤代码配置为空数组');
    console.log('     影响：无法查询到待分摊的工时数据');
    console.log('     建议：在分摊配置的"分摊源配置"中配置正确的出勤代码');
  }

  if (workHours.length === 0) {
    console.log('  ❌ 【主要问题】未找到符合条件的工时数据');
    console.log('     可能原因：');
    console.log('       1. 配置的出勤代码与WorkHourResult表中的数据不匹配');
    console.log('       2. 配置的员工筛选或账户筛选条件过于严格');
    console.log('       3. 指定日期范围内没有工时数据');
  }

  if (allocResults.length === 0) {
    console.log('  ⚠️  【结果】没有分摊结果记录');
    console.log('     说明：从未成功执行过分摊计算，或执行后没有生成结果');
  }

  console.log('\n6️⃣ 建议:');
  if (attendanceCodes.length === 0) {
    console.log('  1. 进入"成本分摊 > 分摊配置"页面');
    console.log('  2. 找到"车间分摊"配置（ID=2）');
    console.log('  3. 在"分摊源配置"中配置正确的出勤代码（例如：A04_WORKSHOP）');
    console.log('  4. 保存配置后重新执行分摊计算');
  }

  await prisma.$disconnect();
}

checkConfigId2().catch(console.error);
