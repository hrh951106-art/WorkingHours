import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 检查A01规则生效时间 ==========\n');

  // 1. 获取A01配置
  console.log('【1. A01配置信息】\n');
  const a01Config = await prisma.earnedHoursAllocationConfig.findFirst({
    where: { code: 'A01' }
  });

  if (!a01Config) {
    console.log('❌ 未找到A01配置');
    return;
  }

  console.log(`配置ID: ${a01Config.id}`);
  console.log(`配置代码: ${a01Config.code}`);
  console.log(`配置名称: ${a01Config.name}`);
  console.log(`配置状态: ${a01Config.status}`);
  console.log(`配置生效开始时间: ${a01Config.effectiveStartTime}`);
  console.log(`配置生效结束时间: ${a01Config.effectiveEndTime || '无限期'}`);

  // 2. 解析规则
  console.log('\n【2. 分摊规则详情】\n');
  const rules = JSON.parse(a01Config.rules || '[]');

  console.log(`规则数量: ${rules.length}\n`);

  if (rules.length === 0) {
    console.log('❌ A01配置中没有规则！');
    return;
  }

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    console.log(`规则${i + 1}: ${rule.ruleName}`);
    console.log(`  规则名称: ${rule.ruleName}`);
    console.log(`  分摊方式: ${rule.allocationBasis}`);
    console.log(`  规则状态: ${rule.status}`);
    console.log(`  规则生效开始时间: ${rule.effectiveStartTime || '未设置'}`);
    console.log(`  规则生效结束时间: ${rule.effectiveEndTime || '无限期'}`);
    console.log('');
  }

  // 3. 检查5月19日的生产记录
  console.log('【3. 5月19日生产记录】\n');
  const productionRecord = await prisma.productionRecord.findFirst({
    where: { recordDate: new Date('2026-05-19') }
  });

  if (productionRecord) {
    console.log(`生产记录日期: ${productionRecord.recordDate.toISOString().substring(0, 10)}`);
    console.log(`产品: ${productionRecord.productName}`);
    console.log(`组织: ${productionRecord.orgName} (orgId=${productionRecord.orgId})`);

    // 4. 检查哪个规则在5月19日生效
    console.log('\n【4. 规则生效性检查】\n');
    const recordDate = new Date(productionRecord.recordDate);

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const startTime = rule.effectiveStartTime ? new Date(rule.effectiveStartTime) : null;
      const endTime = rule.effectiveEndTime ? new Date(rule.effectiveEndTime) : null;

      const isEffective = (!startTime || recordDate >= startTime) && (!endTime || recordDate <= endTime);

      console.log(`规则${i + 1}: ${rule.ruleName}`);
      console.log(`  生产记录日期: ${recordDate.toISOString().substring(0, 10)}`);
      console.log(`  规则开始时间: ${startTime ? startTime.toISOString().substring(0, 10) : '无限制'}`);
      console.log(`  规则结束时间: ${endTime ? endTime.toISOString().substring(0, 10) : '无限制'}`);
      console.log(`  是否生效: ${isEffective ? '✅ 是' : '❌ 否'}`);

      if (!isEffective) {
        if (startTime && recordDate < startTime) {
          console.log(`    ❌ 生产记录日期早于规则开始时间`);
        }
        if (endTime && recordDate > endTime) {
          console.log(`    ❌ 生产记录日期晚于规则结束时间`);
        }
      }
      console.log('');
    }

    // 5. 总结
    console.log('【5. 问题分析】\n');

    const effectiveRule = rules.find((r) => {
      const startTime = r.effectiveStartTime ? new Date(r.effectiveStartTime) : null;
      const endTime = r.effectiveEndTime ? new Date(r.effectiveEndTime) : null;
      return (!startTime || recordDate >= startTime) && (!endTime || recordDate <= endTime);
    });

    if (effectiveRule) {
      console.log(`✅ 找到生效规则: ${effectiveRule.ruleName}`);
      console.log('   分摊计算应该能够正常执行');
    } else {
      console.log('❌ 没有找到在5月19日生效的规则！');
      console.log('   这就是导致没有分摊结果的根本原因！');
      console.log('\n建议:');
      console.log('  1. 修改规则的生效时间，使其包含5月19日');
      console.log('  2. 或者重新执行分摊计算时使用更近的日期');
    }
  }

  console.log('\n========== 分析完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
