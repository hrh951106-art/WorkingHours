import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkYieldConfig() {
  console.log('========================================');
  console.log('检查A02_COPY_1773285414740配置详情');
  console.log('========================================\n');

  const config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'A02_COPY_1773285414740',
      deletedAt: null,
    },
    include: {
      sourceConfig: true,
      rules: {
        where: { deletedAt: null },
        include: {
          targets: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!config) {
    console.log('❌ 未找到配置\n');
    return;
  }

  console.log('配置信息:');
  console.log(`  配置名称: ${config.configName}`);
  console.log(`  配置编码: ${config.configCode}`);
  console.log(`  状态: ${config.status}`);
  console.log(`  生效时间: ${config.effectiveStartTime} ~ ${config.effectiveEndTime || '永久'}`);
  console.log();

  console.log('分摊源配置:');
  if (config.sourceConfig) {
    const attendanceCodes = JSON.parse(config.sourceConfig.attendanceCodes || '[]');
    const employeeFilter = JSON.parse(config.sourceConfig.employeeFilter || '{}');
    console.log(`  出勤代码: ${attendanceCodes.join(', ') || '全部'}`);
    console.log(`  员工过滤: ${Object.keys(employeeFilter).length > 0 ? '有设置' : '无'}`);
  } else {
    console.log('  ❌ 未配置分摊源');
  }
  console.log();

  console.log('分摊规则:');
  config.rules.forEach((rule, idx) => {
    console.log(`  规则${idx + 1}: ${rule.ruleName || '未命名'}`);
    console.log(`    规则类型: ${rule.ruleType}`);
    console.log(`    分摊依据: ${rule.allocationBasis}`);
    console.log(`    状态: ${rule.status}`);

    const allocationAttendanceCodes = JSON.parse(rule.allocationAttendanceCodes || '[]');
    const allocationHierarchyLevels = JSON.parse(rule.allocationHierarchyLevels || '[]');

    console.log(`    分配后出勤代码: ${allocationAttendanceCodes.length > 0 ? allocationAttendanceCodes.join(', ') : '未设置'}`);
    console.log(`    分配归属层级: ${allocationHierarchyLevels.length > 0 ? allocationHierarchyLevels.join(', ') : '全部'}`);
    console.log(`    目标数量: ${rule.targets.length}`);

    if (rule.targets.length > 0) {
      console.log('    目标列表:');
      rule.targets.forEach((target, tIdx) => {
        console.log(`      ${tIdx + 1}. ${target.targetType} - ${target.targetName} (权重: ${target.weight || 0})`);
      });
    } else {
      console.log('    ⚠️  未设置分摊目标！按实际产量分摊时，需要设置分摊目标');
    }

    console.log();
  });

  console.log('========================================');
  console.log('问题诊断:');
  console.log('========================================\n');

  if (config.status !== 'ACTIVE') {
    console.log('❌ 配置状态不是ACTIVE，无法执行分摊');
    console.log(`   当前状态: ${config.status}\n`);
  }

  if (config.rules.length === 0) {
    console.log('❌ 没有分摊规则\n');
  } else {
    const activeRules = config.rules.filter(r => r.status === 'ACTIVE');
    if (activeRules.length === 0) {
      console.log('❌ 没有启用的分摊规则\n');
    }
  }

  // 检查是否有按产量分摊的规则
  const yieldRules = config.rules.filter(r => r.allocationBasis === 'ACTUAL_YIELDS');
  if (yieldRules.length === 0) {
    console.log('❌ 没有按实际产量分摊的规则');
    console.log('   请检查配置中是否有 allocationBasis = ACTUAL_YIELDS 的规则\n');
  } else {
    console.log('✓ 有按实际产量分摊的规则\n');
  }

  console.log('========================================');
}

checkYieldConfig()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
