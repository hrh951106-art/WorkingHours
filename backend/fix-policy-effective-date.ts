import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 修复金额政策的生效日期
 *
 * 问题：effectiveDate 为 2026-05-12 18:05:53
 * 计算 calcDate 为 2026-05-12 00:00:00
 * 导致 effectiveDate > calcDate，匹配失败
 *
 * 解决方案：将 effectiveDate 设置为 2026-05-12 00:00:00
 */
async function fixPolicyEffectiveDate() {
  console.log('========== 修复金额政策生效日期 ==========\n');

  try {
    // 获取A01政策
    const policy = await prisma.amountPolicy.findFirst({
      where: { code: 'A01' },
    });

    if (!policy) {
      console.log('❌ 未找到A01政策');
      return;
    }

    console.log('当前A01政策信息:');
    console.log(`  ID: ${policy.id}`);
    console.log(`  名称: ${policy.name}`);
    console.log(`  生效日期: ${policy.effectiveDate}`);
    console.log(`  过期日期: ${policy.expiryDate || '未设置'}`);

    // 将生效日期设置为当天的00:00:00
    const newEffectiveDate = new Date('2026-05-12T00:00:00.000Z');

    console.log(`\n更新生效日期:`);
    console.log(`  原: ${policy.effectiveDate}`);
    console.log(`  新: ${newEffectiveDate}`);

    const updated = await prisma.amountPolicy.update({
      where: { id: policy.id },
      data: {
        effectiveDate: newEffectiveDate,
      },
    });

    console.log(`\n✅ 政策已更新`);
    console.log(`  新生效日期: ${updated.effectiveDate}`);

    // 验证匹配
    console.log(`\n验证匹配:`);
    const calcDate = new Date('2026-05-12T00:00:00.000Z');
    const isValid = updated.effectiveDate <= calcDate;
    console.log(`  计算日期: ${calcDate}`);
    console.log(`  生效日期: ${updated.effectiveDate}`);
    console.log(`  有效检查: ${updated.effectiveDate} <= ${calcDate} = ${isValid ? '✅ 通过' : '❌ 失败'}`);

    console.log('\n========== 修复完成 ==========');

  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPolicyEffectiveDate()
  .then(() => {
    console.log('\n脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n脚本执行失败:', error);
    process.exit(1);
  });
