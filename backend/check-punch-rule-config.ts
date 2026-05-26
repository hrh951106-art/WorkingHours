import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get the attendance punch rule (ID 16 from the previous result)
  const rule = await prisma.punchRule.findUnique({
    where: { id: 16 },
  });

  console.log('考勤打卡规则 (ID 16):');
  console.log('  名称:', rule?.name);
  console.log('  编码:', rule?.code);
  console.log('  状态:', rule?.status);
  console.log('  类型:', rule?.ruleType);
  console.log('\n配置信息:');

  if (rule?.scheduledConfig) {
    const scheduledConfig = JSON.parse(rule.scheduledConfig);
    console.log('\n排班配置 (scheduledConfig):');
    console.log(JSON.stringify(scheduledConfig, null, 2));
  }

  if (rule?.unscheduledConfig) {
    const unscheduledConfig = JSON.parse(rule.unscheduledConfig);
    console.log('\\n未排班配置 (unscheduledConfig):');
    console.log(JSON.stringify(unscheduledConfig, null, 2));
  }

  // Also check if there are any other rules
  const allRules = await prisma.punchRule.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      code: true,
      ruleType: true,
    },
  });

  console.log('\n\n所有活跃的打卡规则:');
  allRules.forEach(r => {
    console.log(`  ID: ${r.id}, 名称: ${r.name}, 类型: ${r.ruleType}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
