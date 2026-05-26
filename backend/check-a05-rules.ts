import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRules() {
  console.log('=== 检查所有分摊规则 ===\n');

  // 1. 列出所有分摊规则配置
  console.log('1. 所有分摊规则配置:');
  const allRules = await prisma.allocationRuleConfig.findMany({
    where: { deletedAt: null },
    include: { config: true },
    orderBy: { id: 'asc' }
  });

  console.log(`  总共找到 ${allRules.length} 条规则`);

  allRules.forEach((rule) => {
    console.log(`\n  规则ID: ${rule.id}`);
    console.log(`    规则名称: ${rule.ruleName || '未命名'}`);
    console.log(`    规则类型: ${rule.ruleType}`);
    console.log(`    分摊依据: ${rule.allocationBasis}`);
    console.log(`    考勤代码: ${rule.allocationAttendanceCodes}`);
    console.log(`    状态: ${rule.status}`);
    console.log(`    配置ID: ${rule.configId}`);
    console.log(`    ���置名称: ${rule.config?.configName || '未命名'}`);
  });

  // 2. 查找包含A05的规则
  console.log('\n2. 查找包含A05的规则:');
  const a05RelatedRules = allRules.filter(rule => {
    const attendanceCodes = JSON.parse(rule.allocationAttendanceCodes || '[]');
    return attendanceCodes.includes('A05') || rule.ruleName?.includes('A05');
  });

  if (a05RelatedRules.length === 0) {
    console.log('  ❌ 没有找到与A05相关的规则');
  } else {
    console.log(`  找到 ${a05RelatedRules.length} 条与A05相关的规则:`);
    a05RelatedRules.forEach(rule => {
      console.log(`\n  规则ID: ${rule.id}`);
      console.log(`    规则名称: ${rule.ruleName || '未命名'}`);
      console.log(`    规则类型: ${rule.ruleType}`);
      console.log(`    分摊依据: ${rule.allocationBasis}`);
      console.log(`    考勤代码: ${rule.allocationAttendanceCodes}`);
      console.log(`    状态: ${rule.status}`);
    });
  }

  console.log('\n=== 检查完成 ===');
}

checkRules()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
