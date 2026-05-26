import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixGeneralConfig() {
  console.log('🔧 修复通用配置\n');

  // 1. 查看当前配置
  const currentConfig = await prisma.allocationGeneralConfig.findFirst();

  if (!currentConfig) {
    console.log('❌ 未找到通用配置');
    return;
  }

  console.log('当前配置:');
  console.log(`  直接工时代码: ${currentConfig.actualHoursAllocationCode}`);
  console.log(`  间接工时代码: ${currentConfig.indirectHoursAllocationCode}`);

  // 2. 更新配置
  console.log('\n更新配置...');
  await prisma.allocationGeneralConfig.update({
    where: { id: currentConfig.id },
    data: {
      indirectHoursAllocationCode: 'A02_LINE', // 修改为A02_LINE
    },
  });

  console.log('✅ 配置已更新');
  console.log(`  间接工时代码: A02 → A02_LINE`);

  // 3. 验证更新
  const updatedConfig = await prisma.allocationGeneralConfig.findFirst();
  console.log('\n更新后的配置:');
  console.log(`  直接工时代码: ${updatedConfig.actualHoursAllocationCode}`);
  console.log(`  间接工时代码: ${updatedConfig.indirectHoursAllocationCode}`);

  await prisma.$disconnect();
}

fixGeneralConfig().catch(console.error);
