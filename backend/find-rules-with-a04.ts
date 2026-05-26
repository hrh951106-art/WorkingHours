import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findAllRulesWithA04() {
  console.log('=== 查找所有配置了A04的规则 ===\n');

  // 1. 查找所有A04考勤代码
  console.log('1. 查找A04考勤代码:');
  const a04Code = await prisma.attendanceCode.findFirst({
    where: { code: 'A04' }
  });

  if (!a04Code) {
    console.log('  ❌ 没有找到A04考勤代码');
    return;
  }

  console.log(`  ✅ 找到A04考勤代码`);
  console.log(`  ID: ${a04Code.id}`);
  console.log(`  代码: ${a04Code.code}`);
  console.log(`  名称: ${a04Code.name}`);

  // 2. 查找所有规则
  console.log('\n2. 查找所有分配规则:');
  const allRules = await prisma.allocationRuleConfig.findMany({
    where: { deletedAt: null },
    include: { config: true },
    orderBy: { id: 'asc' }
  });

  console.log(`  总共 ${allRules.length} 条规则\n`);

  // 3. 检查每条规则的考勤代码配置
  let rulesWithA04: any[] = [];

  for (const rule of allRules) {
    const attendanceCodes = JSON.parse(rule.allocationAttendanceCodes || '[]');
    const hasA04 = attendanceCodes.includes(a04Code.id);

    console.log(`规则 ${rule.id} (${rule.config?.configName}):`);
    console.log(`  考勤代码ID数组: ${attendanceCodes.length > 0 ? attendanceCodes.join(', ') : '空'}`);
    console.log(`  包含A04: ${hasA04 ? '✅ 是' : '❌ 否'}`);

    if (hasA04) {
      rulesWithA04.push(rule);
      console.log(`  >>> 这条规则配置了A04！`);
    }

    console.log('');
  }

  // 4. 如果找到配置了A04的规则
  if (rulesWithA04.length > 0) {
    console.log('=== 找到配置了A04的规则 ===\n');
    rulesWithA04.forEach((rule, index) => {
      console.log(`规则 ${index + 1}:`);
      console.log(`  规则ID: ${rule.id}`);
      console.log(`  配置名称: ${rule.config?.configName}`);
      console.log(`  配置代码: ${rule.config?.configCode}`);
      console.log(`  规则名称: ${rule.ruleName}`);
      console.log(`  规则类型: ${rule.ruleType}`);
      console.log(`  分配范围ID: ${rule.allocationScopeId}`);
      console.log(`  状态: ${rule.status}`);

      // 检查是否有分配目标
      prisma.allocationRuleTarget.count({
        where: { ruleId: rule.id }
      }).then(count => {
        console.log(`  分配目标数量: ${count}`);
      });
    });
  } else {
    console.log('❌ 没有任何规则配置A04考勤代码');
    console.log('\n可能的原因:');
    console.log('1. 前端显示配置了A04，但保存时没有写入数据库');
    console.log('2. 配置保存在其他地方（比如分配范围或层级中）');
    console.log('3. 用户看错了规则');
  }

  // 5. 搜索"A04"和"WORKSHOP"在数据库中的位置
  console.log('\n5. 搜索包含"A04"或"WORKSHOP"的配置:');

  // 搜索AllocationConfig表
  const configsWithA04 = await prisma.allocationConfig.findMany({
    where: {
      OR: [
        { configName: { contains: 'A04' } },
        { configName: { contains: 'WORKSHOP' } },
        { configCode: { contains: 'A04' } }
      ]
    }
  });

  if (configsWithA04.length > 0) {
    console.log(`  AllocationConfig表中找到 ${configsWithA04.length} 条:`);
    configsWithA04.forEach(config => {
      console.log(`    - ${config.configCode}: ${config.configName}`);
    });
  }

  console.log('\n=== 检查完成 ===');
}

findAllRulesWithA04()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
