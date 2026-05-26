const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugA02() {
  console.log('🔍 A02分摊规则调试分析\n');
  console.log('═'.repeat(80));

  // 1. 查看所有分摊配置
  console.log('\n1️⃣ 所有分摊配置:');
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
    const isA02 = c.configName.includes('A02') || c.configName.includes('间接');
    console.log(`    ${isA02 ? '👉' : '  '} ID=${c.id}, 名称=${c.configName}`);
  });

  // 2. 查看A02配置详情
  const a02Config = allConfigs.find(c =>
    c.configName.includes('A02') || c.configName.includes('间接')
  );

  if (!a02Config) {
    console.log('\n  ❌ 未找到A02分摊配置');
    await prisma.$disconnect();
    return;
  }

  console.log(`\n2️⃣ A02配置详情: ID=${a02Config.id}`);

  // 使用原始查询获取完整配置
  const configRaw = await prisma.$queryRaw`
    SELECT "configName", "sourceConfig", status
    FROM "AllocationConfig"
    WHERE id = ${a02Config.id}
  `;

  if (configRaw && configRaw.length > 0) {
    const sourceConfig = configRaw[0].sourceConfig;
    console.log('\n  分摊源配置 (sourceConfig):');
    const parsed = typeof sourceConfig === 'string' ? JSON.parse(sourceConfig) : sourceConfig;
    console.log(`    员工筛选: ${JSON.stringify(parsed.employeeFilter || {})}`);
    console.log(`    账户筛选: ${JSON.stringify(parsed.accountFilter || {})}`);
    console.log(`    出勤代码: ${JSON.stringify(parsed.attendanceCodes || [])}`);

    // 3. 检查WorkHourResult数据
    console.log('\n3️⃣ WorkHourResult表数据:');

    const attendanceCodes = parsed.attendanceCodes || [];

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
        calcDate: true,
        definitionAttendanceCodeStr: true,
        workHours: true,
        status: true,
        employee: {
          select: {
            name: true,
            employeeNo: true,
          },
        },
      },
    });

    console.log(`  查询条件: 出勤代码=${JSON.stringify(attendanceCodes)}`);
    console.log(`  查询结果: ${workHours.length} 条`);

    if (workHours.length > 0) {
      console.log('\n  工时记录:');
      workHours.forEach((wh, idx) => {
        console.log(`    ${idx + 1}. ${wh.calcDate.toISOString().split('T')[0]} | ${wh.employee?.name || '(无)'} | ${wh.definitionAttendanceCodeStr} | ${wh.workHours}h`);
      });
    } else {
      console.log('  ❌ 未找到符合条件的工时记录');

      // 显示所有可用的出勤代码
      const allWorkHours = await prisma.workHourResult.findMany({
        orderBy: { calcDate: 'desc' },
        take: 50,
        select: {
          definitionAttendanceCodeStr: true,
        },
      });

      const codeSet = new Set();
      allWorkHours.forEach(wh => {
        if (wh.definitionAttendanceCodeStr) {
          codeSet.add(wh.definitionAttendanceCodeStr);
        }
      });

      console.log('\n  📋 WorkHourResult表中可用的出勤代码:');
      codeSet.forEach(code => {
        console.log(`    - ${code}`);
      });
    }
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
  console.log('\n5️⃣ 最近的分摊结果:');
  const recentResults = await prisma.$queryRaw`
    SELECT "batchNo", "configId", "recordDate", "createdAt"
    FROM "AllocationResult"
    WHERE "configId" = ${a02Config.id}
    ORDER BY "createdAt" DESC
    LIMIT 3
  `;

  if (recentResults && recentResults.length > 0) {
    console.log(`  找到 ${recentResults.length} 条分摊结果:`);
    recentResults.forEach((r, idx) => {
      console.log(`    ${idx + 1}. 批次=${r.batchNo}, 日期=${r.recordDate.toISOString().split('T')[0]}, 创建时间=${r.createdAt.toISOString()}`);
    });
  } else {
    console.log('  ❌ 未找到A02的分摊结果');
  }

  // 6. 总结
  console.log('\n6️⃣ 问题诊断:');
  console.log('═'.repeat(80));

  if (attendanceCodes.length === 0) {
    console.log('  ⚠️  出勤代码配置为空 - 这是导致没有分摊结果的可能原因');
    console.log('     建议：检查A02分摊配置中的"分摊源配置"，确保配置了正确的出勤代码');
  }

  await prisma.$disconnect();
}

debugA02().catch(console.error);
