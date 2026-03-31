import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllocationConfig() {
  console.log('========================================');
  console.log('检查分摊配置详细信息');
  console.log('========================================\n');

  // 1. 检查所有分摊配置
  const configs = await prisma.allocationConfig.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
    },
    include: {
      sourceConfig: true,
      rules: {
        where: { deletedAt: null, status: 'ACTIVE' },
        include: {
          targets: true,
        },
        orderBy: [{ sortOrder: 'asc' }],
      },
    },
    orderBy: [{ id: 'asc' }],
  });

  console.log(`总共有 ${configs.length} 个活跃的分摊配置\n`);

  for (const config of configs) {
    console.log('========================================');
    console.log(`配置ID: ${config.id}`);
    console.log(`配置名称: ${config.configName}`);
    console.log(`版本: ${config.version}`);
    console.log(`状态: ${config.status}`);
    console.log('========================================\n');

    // 分摊源配置
    if (config.sourceConfig) {
      const sourceConfig = config.sourceConfig;
      console.log('【分摊源配置】');
      console.log(`  配置ID: ${sourceConfig.id}`);
      console.log(`  源类型: ${sourceConfig.sourceType}`);
      console.log(`  出勤代码: ${sourceConfig.attendanceCodes}`);

      const attendanceCodes = JSON.parse(sourceConfig.attendanceCodes || '[]');
      console.log(`  解析后的出勤代码: ${attendanceCodes.join(', ')}`);

      // 查询出勤代码详情
      const attendanceCodeList = await prisma.attendanceCode.findMany({
        where: { code: { in: attendanceCodes } },
      });

      console.log(`  出勤代码ID列表: ${attendanceCodeList.map(ac => `${ac.code}(ID:${ac.id})`).join(', ')}`);

      // 查询2026-03-11的待分摊工时数据
      if (attendanceCodeList.length > 0) {
        const calcResults = await prisma.calcResult.findMany({
          where: {
            calcDate: new Date('2026-03-11'),
            attendanceCodeId: { in: attendanceCodeList.map(ac => ac.id) },
          },
        });

        console.log(`  2026-03-11待分摊工时记录数: ${calcResults.length}`);
        if (calcResults.length > 0) {
          const totalHours = calcResults.reduce((sum, r) => sum + r.actualHours, 0);
          console.log(`  总待分摊工时: ${totalHours} 小时`);
        }
      }
      console.log();
    }

    // 分摊规则
    console.log('【分摊规则】');
    if (config.rules.length === 0) {
      console.log('  ❌ 没有配置分摊规则！');
    } else {
      for (const rule of config.rules) {
        console.log(`\n  规则ID: ${rule.id}`);
        console.log(`  规则名称: ${rule.ruleName || '未命名'}`);
        console.log(`  规则类型: ${rule.ruleType}`);
        console.log(`  分摊依据: ${rule.allocationBasis}`);

        const hierarchyLevels = JSON.parse(rule.allocationHierarchyLevels || '[]');
        console.log(`  分配归属层级: ${hierarchyLevels.length > 0 ? hierarchyLevels.join(', ') : '全部'}`);

        console.log(`  目标数量: ${rule.targets.length}`);

        if (rule.targets.length === 0) {
          console.log(`  ⚠️  警告: 该规则没有配置分摊目标`);
        } else {
          rule.targets.forEach((target, idx) => {
            console.log(`    目标${idx + 1}: ${target.targetType} - ID:${target.targetId}`);
          });
        }
      }
    }
    console.log();
  }

  // 2. 检查2026-03-11的数据准备情况
  console.log('========================================');
  console.log('2026-03-11 数据准备情况检查');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');

  // 开线计划
  const lineShifts = await prisma.lineShift.findMany({
    where: {
      scheduleDate: calcDate,
      status: 'ACTIVE',
      participateInAllocation: true,
      deletedAt: null,
    },
  });

  console.log(`✓ 开线计划: ${lineShifts.length} 条`);
  lineShifts.forEach(ls => {
    console.log(`  - ${ls.orgName || '未关联组织'} (班次: ${ls.shiftName}, 参与分摊: 是)`);
  });
  console.log();

  // 检查是否有分摊结果
  const allocationResults = await prisma.allocationResult.findMany({
    where: {
      recordDate: calcDate,
    },
  });

  console.log(`❌ 分摊结果: ${allocationResults.length} 条 (应该是0)`);
  console.log();

  // 3. 检查通用配置
  console.log('========================================');
  console.log('通用配置检查');
  console.log('========================================\n');

  const generalConfig = await prisma.allocationGeneralConfig.findFirst();

  if (!generalConfig) {
    console.log('❌ 未配置通用配置！');
  } else {
    console.log(`直接工时代码: ${generalConfig.actualHoursAllocationCode || '未配置'}`);
    console.log(`间接工时代码: ${generalConfig.indirectHoursAllocationCode || '未配置'}`);
  }
  console.log();

  // 4. 给出建议
  console.log('========================================');
  console.log('分摊执行建议');
  console.log('========================================\n');

  const hasValidConfig = configs.some(c =>
    c.sourceConfig &&
    c.rules.length > 0 &&
    c.rules.some(r => r.targets.length > 0)
  );

  if (!hasValidConfig) {
    console.log('❌ 没有完整的分摊配置！');
    console.log('\n需要检查：');
    console.log('1. 分摊源配置是否正确设置了出勤代码');
    console.log('2. 分摊规则是否存在');
    console.log('3. 分摊规则是否配置了目标');
  } else {
    console.log('✓ 配置看起来完整');
    console.log('\n可以尝试执行分摊计算，使用配置ID: ', configs.find(c =>
      c.sourceConfig &&
      c.rules.length > 0 &&
      c.rules.some(r => r.targets.length > 0)
    )?.id);
  }

  console.log('\n========================================');
}

checkAllocationConfig()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
