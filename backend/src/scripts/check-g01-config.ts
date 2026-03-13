import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkG01Config() {
  console.log('========================================');
  console.log('检查G01配置详情');
  console.log('========================================\n');

  // 1. 获取G01配置
  console.log('1. G01配置信息:');
  console.log('----------------------------------------');
  const g01Config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'G01',
      deletedAt: null,
    },
    include: {
      rules: {
        where: {
          deletedAt: null,
        },
      },
    },
  });

  if (!g01Config) {
    console.log('未找到G01配置\n');
    await prisma.$disconnect();
    return;
  }

  console.log(`配置代码: ${g01Config.configCode}`);
  console.log(`配置名称: ${g01Config.configName}`);
  console.log(`配置ID: ${g01Config.id}`);
  console.log(`规则数: ${g01Config.rules.length}\n`);

  // 2. 查看规则详情
  for (const rule of g01Config.rules) {
    console.log('规则信息:');
    console.log(`  规则ID: ${rule.id}`);
    console.log(`  规则名称: ${rule.ruleName}`);
    console.log(`  规则类型: ${rule.ruleType}`);
    console.log(`  分摊依据: ${rule.allocationBasis}`);
    console.log(`  分摊范围ID: ${rule.allocationScopeId || '未设置'}`);

    // 解析层级配置
    const hierarchyLevels = JSON.parse(rule.allocationHierarchyLevels || '[]');
    console.log(`  层级配置: ${JSON.stringify(hierarchyLevels)}`);

    // 解析考勤代码
    const attendanceCodes = JSON.parse(rule.allocationAttendanceCodes || '[]');
    console.log(`  考勤代码: ${JSON.stringify(attendanceCodes)}`);

    // 解析基础筛选
    const basisFilter = JSON.parse(rule.basisFilter || '{}');
    console.log(`  基础筛选: ${JSON.stringify(basisFilter)}`);
    console.log();

    // 3. 如果设置了分摊范围，查看层级配置
    if (rule.allocationScopeId) {
      console.log('  分摊范围配置:');
      const hierarchyConfig = await prisma.accountHierarchyConfig.findUnique({
        where: { id: rule.allocationScopeId },
      });
      if (hierarchyConfig) {
        console.log(`    名称: ${hierarchyConfig.name}`);
        console.log(`    映射类型: ${hierarchyConfig.mappingType}`);
        console.log(`    映射值: ${hierarchyConfig.mappingValue}`);
        console.log(`    级别: ${hierarchyConfig.level}`);
      }
      console.log();
    }
  }

  // 4. 查看层级配置列表
  console.log('2. 系统中的层级配置:');
  console.log('----------------------------------------');
  const hierarchyConfigs = await prisma.accountHierarchyConfig.findMany({
    where: {
      status: 'ACTIVE',
      mappingType: 'ORG_TYPE',
    },
    orderBy: {
      level: 'asc',
    },
  });

  for (const config of hierarchyConfigs) {
    console.log(`- ${config.name} (ID: ${config.id})`);
    console.log(`  映射值: ${config.mappingValue}, 级别: ${config.level}`);
  }
  console.log();

  // 5. 分析问题
  console.log('========================================');
  console.log('问题分析');
  console.log('========================================\n');

  const rule = g01Config.rules[0];

  console.log('当前配置:');
  console.log(`- 分摊依据: ${rule.allocationBasis}`);
  console.log(`- 分摊范围ID: ${rule.allocationScopeId || '未设置'}`);
  console.log(`- 层级配置: ${rule.allocationHierarchyLevels}`);

  if (!rule.allocationScopeId) {
    console.log('\n⚠️  问题: 分摊范围ID未设置！');
    console.log('\n影响:');
    console.log('  当分摊范围未设置时，系统无法确定按哪个层级进行分摊。');
    console.log('  这可能导致分摊逻辑使用默认的车间级别，而不是工厂级别。');
    console.log('\n建议:');
    console.log('  需要设置 allocationScopeId 为 28 (工厂级别)');
    console.log('  这样系统会按照工厂汇总产量，然后计算分摊比例。');
  } else {
    const hierarchyConfig = await prisma.accountHierarchyConfig.findUnique({
      where: { id: rule.allocationScopeId },
    });
    console.log(`\n分摊范围: ${hierarchyConfig?.name} (${hierarchyConfig?.mappingValue})`);
    console.log('\n说明:');
    console.log('  系统会按此层级汇总所有开线产线的产量/工时，');
    console.log('  然后根据各产线占该层级的比例进行分摊。');
  }

  console.log('\n========================================');
}

checkG01Config()
  .catch((e) => {
    console.error('查询失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
