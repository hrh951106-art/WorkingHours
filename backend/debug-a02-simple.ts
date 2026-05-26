import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugA02Simple() {
  console.log('🔍 A02分摊规则调试分析\n');
  console.log('═'.repeat(80));

  // 1. 查看A02分摊配置
  console.log('\n1️⃣ 查找A02分摊配置:');
  const allConfigs = await prisma.allocationConfig.findMany({
    where: {
      status: 'ACTIVE',
    },
    select: {
      id: true,
      configName: true,
      description: true,
    },
  });

  console.log('  所有激活的分摊配置:');
  allConfigs.forEach(c => {
    const isA02 = c.configName.includes('A02') || c.configName.includes('间接');
    console.log(`    ${isA02 ? '👉' : '  '} ID=${c.id}, 名称=${c.configName}${c.description ? `, ${c.description}` : ''}`);
  });

  const a02Config = await prisma.allocationConfig.findFirst({
    where: {
      OR: [
        { configName: { contains: 'A02' } },
        { configName: { contains: '间接' } },
        { description: { contains: 'A02' } },
      ],
      status: 'ACTIVE',
    },
  });

  if (!a02Config) {
    console.log('\n  ❌ 未找到A02分摊配置');
    await prisma.$disconnect();
    return;
  }

  console.log(`\n  找到A02配置: ID=${a02Config.id}, 名称=${a02Config.configName}`);

  // 使用原始查询获取sourceConfig
  const configRaw: any = await prisma.$queryRaw`
    SELECT id, configName, "sourceConfig", status
    FROM "AllocationConfig"
    WHERE id = ${a02Config.id}
  `;

  if (configRaw && configRaw.length > 0) {
    const sourceConfig = configRaw[0].sourceConfig;
    console.log('\n2️⃣ 分摊源配置 (sourceConfig):');
    console.log(`  ${JSON.stringify(sourceConfig, null, 2)}`);
  }

  // 3. 检查WorkHourResult表中的数据
  console.log('\n3️⃣ WorkHourResult表数据检查:');

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
          employeeNo: true,
        },
      },
    },
  });

  console.log(`\n  最近的工时记录 (共${allWorkHours.length}条):`);
  const codeCounts = new Map<string, number>();

  allWorkHours.forEach((wh, index) => {
    const code = wh.definitionAttendanceCodeStr || '(无)';
    codeCounts.set(code, (codeCounts.get(code) || 0) + 1);

    if (index < 10) {
      console.log(`    ${index + 1}. ${wh.calcDate.toISOString().split('T')[0]} | ${wh.employee?.name || '(无)'} | ${code} | ${wh.workHours}h | ${wh.status}`);
    }
  });

  console.log('\n  出勤代码分布:');
  codeCounts.forEach((count, code) => {
    console.log(`    ${code}: ${count} 条`);
  });

  // 4. 检查SystemConfig
  console.log('\n4️⃣ SystemConfig配置:');
  const systemConfigs = await prisma.systemConfig.findMany({
    where: {
      configKey: {
        in: ['actualHoursAllocationCode', 'indirectHoursAllocationCode'],
      },
    },
  });

  const actualHoursConfig = systemConfigs.find(c => c.configKey === 'actualHoursAllocationCode');
  const indirectHoursConfig = systemConfigs.find(c => c.configKey === 'indirectHoursAllocationCode');

  console.log(`  AL1001（实际工时）: ${actualHoursConfig?.configValue || '未配置'}`);
  console.log(`  AL1002（间接工时）: ${indirectHoursConfig?.configValue || '未配置'}`);

  // 5. 检查最近的分摊结果
  console.log('\n5️⃣ 最近的分摊结果:');
  const recentAllocations = await prisma.$queryRaw`
    SELECT id, "batchNo", "configId", "createdAt", "recordDate"
    FROM "AllocationResult"
    ORDER BY "createdAt" DESC
    LIMIT 5
  `;

  if (recentAllocations && recentAllocations.length > 0) {
    console.log(`  找到 ${recentAllocations.length} 条分摊结果:`);
    recentAllocations.forEach((al: any, index: number) => {
      console.log(`    ${index + 1}. 批次=${al.batchNo}, 配置ID=${al.configId}, 日期=${al.recordDate}, 时间=${al.createdAt.toISOString()}`);
    });
  } else {
    console.log('  ❌ 未找到分摊结果');
  }

  // 6. 问题总结
  console.log('\n6️⃣ 问题总结:');
  console.log('═'.repeat(80));

  if (allWorkHours.length === 0) {
    console.log('  ❌ WorkHourResult表中没有数据');
  } else {
    console.log(`  ✅ WorkHourResult表中有 ${allWorkHours.length} 条数据`);
  }

  if (!actualHoursConfig?.configValue || !indirectHoursConfig?.configValue) {
    console.log('  ⚠️  SystemConfig配置可能不完整');
  } else {
    console.log(`  ✅ SystemConfig已配置: AL1001=${actualHoursConfig.configValue}, AL1002=${indirectHoursConfig.configValue}`);
  }

  if (recentAllocations && recentAllocations.length > 0) {
    console.log(`  ✅ 已有分摊结果记录`);
  } else {
    console.log(`  ⚠️  没有分摊结果记录`);
  }

  await prisma.$disconnect();
}

debugA02Simple().catch(console.error);
