import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 层级匹配函数（与后端服务中的逻辑一致）
 */
function matchAccountPathByLevel(policyPath: string, actualPath: string): boolean {
  const policyParts = policyPath.split('/');
  const actualParts = actualPath.split('/');

  const hasValidPolicyValue = policyParts.some(p => p && p !== '-');
  if (!hasValidPolicyValue) {
    return true;
  }

  let matchCount = 0;
  let requiredMatches = 0;
  const maxLevel = Math.max(policyParts.length, actualParts.length);

  for (let i = 0; i < maxLevel; i++) {
    const policyValue = policyParts[i] || '';
    const actualValue = actualParts[i] || '';

    if (!policyValue || policyValue === '-' || policyValue === '') {
      continue;
    }

    requiredMatches++;

    if (actualValue === policyValue) {
      matchCount++;
    } else {
      return false;
    }
  }

  return matchCount === requiredMatches && requiredMatches > 0;
}

/**
 * 测试完整的金额计算流程（使用层级匹配）
 */
async function testFullAmountCalculation() {
  console.log('========== 测试完整金额计算（层级匹配） ==========\n');

  try {
    const employeeNo = '202604003';
    const calcDate = new Date('2026-05-12');

    // 1. 获取员工系数
    const coefficientRecord = await prisma.employeeCoefficient.findFirst({
      where: {
        employeeNo,
        effectiveDate: { lte: calcDate },
        OR: [{ expiryDate: null }, { expiryDate: { gte: calcDate } }],
        status: 'ACTIVE',
      },
      orderBy: { effectiveDate: 'desc' },
    });

    if (!coefficientRecord) {
      console.log('❌ 未找到员工系数');
      return;
    }

    const baseCoefficient = coefficientRecord.coefficient;
    console.log(`1. 员工系数: ${baseCoefficient}\n`);

    // 2. 获取金额政策
    const policies = await prisma.amountPolicy.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        effectiveDate: { lte: calcDate },
        OR: [{ expiryDate: null }, { expiryDate: { gte: calcDate } }],
      },
      orderBy: [{ priority: 'desc' }, { effectiveDate: 'desc' }],
    });

    console.log(`2. 找到 ${policies.length} 条激活的政策\n`);

    // 3. 获取实际的工时结果
    const workHourResults = await prisma.workHourResult.findMany({
      where: {
        employeeNo,
        calcDate,
        source: 1, // 精益工时
      },
    });

    console.log(`3. 找到 ${workHourResults.length} 条精益工时结果\n`);

    // 4. 计算每条工时的金额
    console.log('========== 金额计算详情 ==========\n');

    let totalAmount = 0;

    workHourResults.forEach((whr) => {
      console.log(`账户: ${whr.accountName}`);
      console.log(`  出勤代码: ${whr.calcAttendanceCode}`);
      console.log(`  工时: ${whr.workHours}`);

      // 查找匹配的金额政策
      let matchedPolicy = null;
      for (const policy of policies) {
        const policyCodes = JSON.parse(policy.attendanceCodes || '[]');

        if (!policyCodes.includes(whr.calcAttendanceCode)) {
          continue;
        }

        // 使用层级匹配
        const accountMatch = matchAccountPathByLevel(policy.accountPath, whr.accountName);

        if (accountMatch) {
          matchedPolicy = policy;
          break;
        }
      }

      // 计算金额
      let amount = 0;
      if (matchedPolicy) {
        console.log(`  ✅ 匹配政策: ${matchedPolicy.name} (${matchedPolicy.code})`);
        console.log(`     政策路径: ${matchedPolicy.accountPath}`);
        console.log(`     匹配模式: ${matchedPolicy.accountPathMatch}`);
        console.log(`     倍数: ${matchedPolicy.multiplier}`);

        const multiplier = matchedPolicy.multiplier || 1;
        amount = whr.workHours * baseCoefficient * multiplier;
        console.log(`     计算公式: ${whr.workHours} × ${baseCoefficient} × ${multiplier} = ${amount}`);
      } else {
        console.log(`  ℹ️ 未匹配政策，使用基础系数`);
        amount = whr.workHours * baseCoefficient;
        console.log(`     计算公式: ${whr.workHours} × ${baseCoefficient} = ${amount}`);
      }

      console.log(`  金额: ¥${amount.toFixed(2)}\n`);

      totalAmount += amount;
    });

    console.log('========== 计算结果汇总 ==========');
    console.log(`总金额: ¥${totalAmount.toFixed(2)}`);
    console.log('\n预期结果:');
    console.log('  - 焊接工时（3小时）: 3 × 20 × 1.5 = 90');
    console.log('  - 包装工时（2小时）: 2 × 20 = 40');
    console.log('  - 其他工时: ...');
    console.log(`  预期总计: ¥130 + 其他工时金额`);
    console.log('\n下一步: 通过前端页面重新计算以更新数据库');

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFullAmountCalculation()
  .then(() => {
    console.log('\n测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n测试失败:', error);
    process.exit(1);
  });
