import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 修复金额政策的账户路径匹配问题
 *
 * 问题：金额政策的accountPath为 "A01/WELDING"
 * 但实际账户路径为 "大华富阳工厂/W1总装车间/W1总装车间L2产线/大桶/焊接/-/-"
 * 导致无法匹配，1.5倍系数无法应用
 *
 * 解决方案：更新金额政策的accountPath为正确的路径，并使用PREFIX匹配模式
 */
async function fixAmountPolicyAccountPath() {
  console.log('========== 修复金额政策账户路径 ==========\n');

  try {
    // 1. 查看当前的金额政策
    console.log('1. 查看当前金额政策...');
    const policies = await prisma.amountPolicy.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    console.log(`找到 ${policies.length} 条激活的金额政策:\n`);
    policies.forEach((policy) => {
      const codes = JSON.parse(policy.attendanceCodes || '[]');
      console.log(`政策: ${policy.name} (${policy.code})`);
      console.log(`  类型: ${policy.policyType}`);
      console.log(`  倍数: ${policy.multiplier || 'N/A'}`);
      console.log(`  账户路径: ${policy.accountPath}`);
      console.log(`  匹配模式: ${policy.accountPathMatch}`);
      console.log(`  出勤代码: [${codes.join(', ')}]`);
      console.log('');
    });

    // 2. 查看实际的账户路径
    console.log('\n2. 查看实际账户路径（从WorkHourResult）...');
    const workHourResults = await prisma.workHourResult.findMany({
      where: {
        employeeNo: '202604003',
        calcDate: new Date('2026-05-12'),
        source: 1, // 精益工时
      },
      select: {
        accountName: true,
        calcAttendanceCode: true,
      },
      distinct: ['accountName'],
    });

    console.log(`找到 ${workHourResults.length} 个不同的账户路径:\n`);
    workHourResults.forEach((whr) => {
      console.log(`  - ${whr.accountName} (出勤代码: ${whr.calcAttendanceCode})`);
    });

    // 3. 更新金额政策的账户路径
    console.log('\n3. 更新金额政策A01...');

    // 用户提到配置的是 "///大桶/焊接//"
    // 实际路径是 "大华富阳工厂/W1总装车间/W1总装车间L2产线/大桶/焊接/-/-"
    // 我们可以使用 PREFIX 匹配，使用共同的部分

    const policy = await prisma.amountPolicy.findFirst({
      where: { code: 'A01' },
    });

    if (!policy) {
      console.log('❌ 未找到政策A01');
      return;
    }

    // 方案1: 使用完整路径作为前缀（精确匹配特定账户）
    // 方案2: 使用部分路径作为前缀（匹配所有包含"大桶/焊接"的账户）

    // 这里使用部分路径前缀，这样可以匹配到所有大桶/焊接相关的账户
    const newAccountPath = '大华富阳工厂/W1总装车间/W1总装车间L2产线/大桶/焊接';

    console.log(`原账户路径: ${policy.accountPath}`);
    console.log(`新账户路径: ${newAccountPath}`);
    console.log(`匹配模式: PREFIX`);

    const updated = await prisma.amountPolicy.update({
      where: { id: policy.id },
      data: {
        accountPath: newAccountPath,
        accountPathMatch: 'PREFIX', // 使用前缀匹配
      },
    });

    console.log(`✅ 政策已更新: ${updated.name}`);
    console.log(`   新账户路径: ${updated.accountPath}`);
    console.log(`   新匹配模式: ${updated.accountPathMatch}`);

    // 4. 验证更新后的匹配结果
    console.log('\n4. 验证匹配结果...');

    const testAccountPath = '大华富阳工厂/W1总装车间/W1总装车间L2产线/大桶/焊接/-/-';
    const isMatch =
      updated.accountPathMatch === 'PREFIX'
        ? testAccountPath.startsWith(updated.accountPath)
        : testAccountPath === updated.accountPath;

    console.log(`测试账户: ${testAccountPath}`);
    console.log(`政策路径: ${updated.accountPath}`);
    console.log(`匹配模式: ${updated.accountPathMatch}`);
    console.log(`匹配结果: ${isMatch ? '✅ 成功' : '❌ 失败'}`);

    console.log('\n========== 修复完成 ==========');
    console.log('\n下一步:');
    console.log('1. 重新计算202604003员工在2026-05-12的工时');
    console.log('2. 验证金额是否正确计算（3小时 × 20 × 1.5 = 90）');
    console.log('\n修复建议:');
    console.log('- 如果账户路径经常变化，考虑使用更通用的前缀');
    console.log('- 例如: "大桶/焊接" 可以匹配所有包含此路径的账户');

  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAmountPolicyAccountPath()
  .then(() => {
    console.log('\n脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n脚本执行失败:', error);
    process.exit(1);
  });
