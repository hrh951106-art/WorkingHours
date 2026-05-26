import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 检查金额政策详细信息和匹配条件
 */
async function checkAmountPolicyDetails() {
  console.log('========== 检查金额政策详细信息 ==========\n');

  try {
    const calcDate = new Date('2026-05-12');

    // 1. 查询所有金额政策（不过滤）
    console.log('1. 查询所有金额政策（包括未激活的）...');
    const allPolicies = await prisma.amountPolicy.findMany({
      where: { deletedAt: null },
    });

    console.log(`找到 ${allPolicies.length} 条政策:\n`);
    allPolicies.forEach((policy) => {
      const codes = JSON.parse(policy.attendanceCodes || '[]');
      console.log(`政策: ${policy.name} (${policy.code})`);
      console.log(`  ID: ${policy.id}`);
      console.log(`  状态: ${policy.status}`);
      console.log(`  类型: ${policy.policyType}`);
      console.log(`  倍数: ${policy.multiplier || 'N/A'}`);
      console.log(`  账户路径: ${policy.accountPath}`);
      console.log(`  匹配模式: ${policy.accountPathMatch}`);
      console.log(`  出勤代码: [${codes.join(', ')}]`);
      console.log(`  生效日期: ${policy.effectiveDate ? policy.effectiveDate.toISOString().split('T')[0] : '未设置'}`);
      console.log(`  过期日期: ${policy.expiryDate ? policy.expiryDate.toISOString().split('T')[0] : '未设置'}`);
      console.log(`  优先级: ${policy.priority || '未设置'}`);
      console.log(`  删除时间: ${policy.deletedAt || '未删除'}`);
      console.log('');
    });

    // 2. 测试匹配逻辑
    console.log('\n2. 测试匹配逻辑...');

    const testAccountPath = '大华富阳工厂/W1总装车间/W1总装车间L2产线/大桶/焊接/-/-';
    const testAttendanceCode = 'A02';

    // 查找A01政策
    const a01Policy = await prisma.amountPolicy.findFirst({
      where: { code: 'A01' },
    });

    if (!a01Policy) {
      console.log('❌ 未找到A01政策');
      return;
    }

    console.log(`测试账户: ${testAccountPath}`);
    console.log(`测试出勤代码: ${testAttendanceCode}`);
    console.log(`\nA01政策配置:`);
    console.log(`  账户路径: ${a01Policy.accountPath}`);
    console.log(`  匹配模式: ${a01Policy.accountPathMatch}`);
    console.log(`  出勤代码: ${JSON.parse(a01Policy.attendanceCodes || '[]')}`);
    console.log(`  生效日期: ${a01Policy.effectiveDate}`);
    console.log(`  过期日期: ${a01Policy.expiryDate}`);
    console.log(`  状态: ${a01Policy.status}`);

    // 检查日期有效性
    console.log(`\n日期有效性检查:`);
    console.log(`  当前日期: ${calcDate.toISOString().split('T')[0]}`);

    const hasEffectiveDate = a01Policy.effectiveDate !== null;
    const effectiveDateValid = !hasEffectiveDate || a01Policy.effectiveDate <= calcDate;
    console.log(`  生效日期检查: ${hasEffectiveDate ? a01Policy.effectiveDate.toISOString().split('T')[0] : '未设置'} ${effectiveDateValid ? '✅' : '❌'}`);

    const hasExpiryDate = a01Policy.expiryDate !== null;
    const expiryDateValid = !hasExpiryDate || a01Policy.expiryDate >= calcDate;
    console.log(`  过期日期检查: ${hasExpiryDate ? a01Policy.expiryDate.toISOString().split('T')[0] : '未设置'} ${expiryDateValid ? '✅' : '❌'}`);

    const statusActive = a01Policy.status === 'ACTIVE';
    console.log(`  状态检查: ${a01Policy.status} ${statusActive ? '✅' : '❌'}`);

    // 出勤代码匹配
    const policyCodes = JSON.parse(a01Policy.attendanceCodes || '[]');
    const codeMatch = policyCodes.includes(testAttendanceCode);
    console.log(`  出勤代码匹配: [${policyCodes.join(', ')}] 包含 ${testAttendanceCode}? ${codeMatch ? '✅' : '❌'}`);

    // 账户路径匹配
    let accountMatch = false;
    if (a01Policy.accountPathMatch === 'EXACT') {
      accountMatch = testAccountPath === a01Policy.accountPath;
      console.log(`  账户路径匹配 (精确): "${testAccountPath}" === "${a01Policy.accountPath}"? ${accountMatch ? '✅' : '❌'}`);
    } else if (a01Policy.accountPathMatch === 'PREFIX') {
      accountMatch = testAccountPath.startsWith(a01Policy.accountPath);
      console.log(`  账户路径匹配 (前缀): "${testAccountPath}".startsWith("${a01Policy.accountPath}")? ${accountMatch ? '✅' : '❌'}`);
    }

    // 总体匹配结果
    const allMatch = effectiveDateValid && expiryDateValid && statusActive && codeMatch && accountMatch;
    console.log(`\n总体匹配: ${allMatch ? '✅ 成功' : '❌ 失败'}`);

    if (!allMatch) {
      console.log(`\n失败原因:`);
      if (!effectiveDateValid) console.log('  - 生效日期未到');
      if (!expiryDateValid) console.log('  - 已过期');
      if (!statusActive) console.log('  - 状态未激活');
      if (!codeMatch) console.log('  - 出勤代码不匹配');
      if (!accountMatch) console.log('  - 账户路径不匹配');
    }

  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAmountPolicyDetails()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n检查失败:', error);
    process.exit(1);
  });
