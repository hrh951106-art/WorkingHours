import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const config = await prisma.systemConfig.findUnique({
    where: { configKey: 'WH1001' }
  });

  if (config) {
    console.log('✅ 找到 WH1001 配置:');
    console.log(`  configKey: ${config.configKey}`);
    console.log(`  configValue: ${config.configValue}`);
    console.log(`  description: ${config.description}`);
  } else {
    console.log('❌ WH1001 配置不存在，需要创建');
    console.log('\n建议配置:');
    console.log('  configKey: WH1001');
    console.log('  configValue: 3 (表示第3层级-产���层级可选)');
    console.log('  description: 开线计划产线对应劳动力账户层级');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
