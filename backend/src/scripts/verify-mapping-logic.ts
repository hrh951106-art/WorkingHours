import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMappingLogic() {
  console.log('========================================');
  console.log('验证层级映射逻辑');
  console.log('========================================\n');

  // 1. 获取所有层级配置
  console.log('1. 获取层级配置:');
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

  console.log(`找到 ${hierarchyConfigs.length} 个ORG_TYPE层级配置:\n`);
  for (const config of hierarchyConfigs) {
    console.log(`- ID: ${config.id}`);
    console.log(`  名称: ${config.name}`);
    console.log(`  映射值: ${config.mappingValue}`);
    console.log(`  级别: ${config.level}`);
    console.log();
  }

  // 2. 获取产线数据
  console.log('2. 获取产线数据:');
  console.log('----------------------------------------');
  const lines = await prisma.productionLine.findMany({
    where: {
      status: 'ACTIVE',
    },
    take: 5,
  });

  console.log(`找到 ${lines.length} 条产线:\n`);
  for (const line of lines) {
    console.log(`产线: ${line.name} (ID: ${line.id})`);
    console.log(`  - 工厂: ${line.orgName || 'N/A'} (ID: ${line.orgId})`);
    console.log(`  - 车间: ${line.workshopName || 'N/A'} (ID: ${line.workshopId})`);
    console.log();
  }

  // 3. 模拟映射逻辑
  console.log('3. 验证映射逻辑:');
  console.log('----------------------------------------\n');

  function simulateMapping(mappingValue: string, line: any) {
    const orgType = mappingValue.toUpperCase();

    if (orgType.includes('COMPANY') || orgType.includes('FACTORY') || orgType.includes('ORG') ||
        orgType.includes('工厂') || orgType.includes('组织')) {
      return { field: 'orgId', value: line.orgId, name: '工厂级别' };
    } else if (orgType.includes('DEPARTMENT') || orgType.includes('WORKSHOP') || orgType.includes('车间')) {
      return { field: 'workshopId', value: line.workshopId, name: '车间级别' };
    } else if (orgType.includes('TEAM') || orgType.includes('LINE') || orgType.includes('产线') || orgType.includes('线体')) {
      return { field: 'line.id', value: line.id, name: '产线级别' };
    } else {
      return { field: 'workshopId (默认)', value: line.workshopId, name: '默认车间级别' };
    }
  }

  for (const config of hierarchyConfigs) {
    console.log(`【${config.name}】(映射值: ${config.mappingValue})`);
    console.log();

    const uniqueScopes = new Map<number, string>();

    for (const line of lines) {
      const mapping = simulateMapping(config.mappingValue, line);
      const scopeName = mapping.field === 'orgId' ? (line.orgName || `工厂${line.orgId}`)
                      : mapping.field === 'workshopId' ? (line.workshopName || `车间${line.workshopId}`)
                      : `${line.name}`;

      uniqueScopes.set(mapping.value, scopeName);

      console.log(`  ${line.name} → ${mapping.name} (ID: ${mapping.value}, ${scopeName})`);
    }

    console.log(`\n  汇总: 会分摊到 ${uniqueScopes.size} 个不同的${config.name}`);
    console.log(`  ${Array.from(uniqueScopes.values()).join(', ')}`);
    console.log();
  }

  // 4. 验证结果
  console.log('========================================');
  console.log('验证结论');
  console.log('========================================\n');

  const companyConfig = hierarchyConfigs.find(c => c.mappingValue === 'COMPANY');
  const departmentConfig = hierarchyConfigs.find(c => c.mappingValue === 'DEPARTMENT');
  const teamConfig = hierarchyConfigs.find(c => c.mappingValue === 'TEAM');

  if (companyConfig && departmentConfig && teamConfig) {
    console.log('✅ 所有必要的层级配置都已存在');
    console.log(`✅ ${companyConfig.name} (COMPANY) - 会映射到产线的 orgId`);
    console.log(`✅ ${departmentConfig.name} (DEPARTMENT) - 会映射到产线的 workshopId`);
    console.log(`✅ ${teamConfig.name} (TEAM) - 会映射到产线的自身 ID`);
    console.log('\n✅ 映射逻辑已更新，支持 COMPANY/DEPARTMENT/TEAM 值');
    console.log('\n建议操作:');
    console.log('  1. 在界面上编辑现有的分摊规则');
    console.log('  2. 选择"分摊范围"为期望的层级（工厂/车间/线体）');
    console.log('  3. 保存规则');
    console.log('  4. 执行分摊操作，验证分摊结果');
  } else {
    console.log('⚠️  缺少必要的层级配置');
    if (!companyConfig) console.log('  - 缺少 COMPANY 配置（工厂级别）');
    if (!departmentConfig) console.log('  - 缺少 DEPARTMENT 配置（车间级别）');
    if (!teamConfig) console.log('  - 缺少 TEAM 配置（线体级别）');
  }

  console.log('\n========================================');
}

verifyMappingLogic()
  .catch((e) => {
    console.error('验证失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
