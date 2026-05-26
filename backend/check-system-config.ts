import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSystemConfig() {
  console.log('🔍 查询SystemConfig表中的AL1001与AL1002参数值\n');

  // 查询SystemConfig表
  console.log('1️⃣ SystemConfig表数据:');
  const systemConfigs = await prisma.systemConfig.findMany({
    where: {
      configKey: {
        in: ['actualHoursAllocationCode', 'indirectHoursAllocationCode'],
      },
    },
  });

  if (systemConfigs.length === 0) {
    console.log('❌ SystemConfig表中未找到AL1001和AL1002配置');
  } else {
    for (const config of systemConfigs) {
      console.log(`\n${config.configKey}:`);
      console.log(`  存储值: "${config.configValue}"`);
      console.log(`  分类: ${config.category}`);
      console.log(`  描述: ${config.description || '(无)'}`);
      console.log(`  最后更新: ${config.updatedAt}`);
    }
  }

  // 对比AllocationGeneralConfig表
  console.log('\n\n2️⃣ AllocationGeneralConfig表数据:');
  const generalConfig = await prisma.allocationGeneralConfig.findFirst();

  if (generalConfig) {
    console.log(`\nactualHoursAllocationCode: "${generalConfig.actualHoursAllocationCode}"`);
    console.log(`indirectHoursAllocationCode: "${generalConfig.indirectHoursAllocationCode}"`);
    console.log(`最后更新: ${generalConfig.updatedAt}`);
  } else {
    console.log('❌ AllocationGeneralConfig表中未找到配置');
  }

  // 对比分析
  console.log('\n\n3️⃣ 对比分析:');
  console.log('═'.repeat(70));

  const systemActualCode = systemConfigs.find(c => c.configKey === 'actualHoursAllocationCode');
  const systemIndirectCode = systemConfigs.find(c => c.configKey === 'indirectHoursAllocationCode');

  console.log('\nAL1001 (实际工时代码):');
  console.log(`  SystemConfig表: "${systemActualCode?.configValue || '未配置'}"`);
  console.log(`  AllocationGeneralConfig表: "${generalConfig?.actualHoursAllocationCode || '未配置'}"`);
  if (systemActualCode?.configValue !== generalConfig?.actualHoursAllocationCode) {
    console.log(`  ⚠️ 两个表中的值不一致！`);
  }

  console.log('\nAL1002 (间接工时代码):');
  console.log(`  SystemConfig表: "${systemIndirectCode?.configValue || '未配置'}"`);
  console.log(`  AllocationGeneralConfig表: "${generalConfig?.indirectHoursAllocationCode || '未配置'}"`);
  if (systemIndirectCode?.configValue !== generalConfig?.indirectHoursAllocationCode) {
    console.log(`  ⚠️ 两个表中的值不一致！`);
  }

  console.log('\n结论:');
  console.log(`  前端页面使用的是: SystemConfig表 (/hr/system-configs API)`);
  console.log(`  后端分摊计算使用的是: AllocationGeneralConfig表`);

  await prisma.$disconnect();
}

checkSystemConfig().catch(console.error);
