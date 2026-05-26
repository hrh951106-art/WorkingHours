import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 检查配置是否��存在
  const existing = await prisma.systemConfig.findUnique({
    where: { configKey: 'WH1001' }
  });

  if (existing) {
    console.log('WH1001 配置已存在，更新配置值...');
    await prisma.systemConfig.update({
      where: { configKey: 'WH1001' },
      data: {
        configValue: '3', // 第3层级（产线）可选
        description: '开线计划产��对应劳动力账户层级（层级序号，多个用逗号分隔）',
      }
    });
    console.log('✅ WH1001 配置已更新');
  } else {
    console.log('创建 WH1001 配置...');
    await prisma.systemConfig.create({
      data: {
        configKey: 'WH1001',
        configValue: '3', // 第3层级（产线）可选
        description: '开线计划产线对应劳动力账户层级（层级序号，多个用逗号分隔）',
        category: 'WH_MANAGEMENT',
      }
    });
    console.log('✅ WH1001 配置已创建');
  }

  const config = await prisma.systemConfig.findUnique({
    where: { configKey: 'WH1001' }
  });

  console.log('\n📋 当前配置:');
  console.log(`  configKey: ${config.configKey}`);
  console.log(`  configValue: ${config.configValue}`);
  console.log(`  description: ${config.description}`);
  console.log('\n💡 说明:');
  console.log('  configValue = "3" 表示只允许选择第3层级（产线层级）');
  console.log('  configValue = "3,4" 表示允许选择第3和第4层级（产线和产品层级）');
  console.log('\n层级对应关系:');
  console.log('  1 - 工厂');
  console.log('  2 - 车间');
  console.log('  3 - 产线 ✅');
  console.log('  4 - 产品');
  console.log('  5 - 工序');
  console.log('  6 - 员工类型');
  console.log('  7 - 岗位');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
