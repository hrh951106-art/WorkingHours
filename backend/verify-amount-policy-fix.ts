import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 验证金额政策修复后的计算结果
 */
async function verifyAmountPolicyFix() {
  console.log('========== 验证金额政策修复 ==========\n');

  try {
    const employeeNo = '202604003';
    const calcDate = new Date('2026-05-12');

    // 测试场景
    const testCases = [
      {
        name: '焊接工时（应有1.5倍）',
        workHours: 3,
        attendanceCode: 'A02',
        accountPath: '大华富阳工厂/W1总装车间/W1总装车间L2产线/大桶/焊接/-/-',
        expectedAmount: 90, // 3 × 20 × 1.5
      },
      {
        name: '包装工时（无倍数）',
        workHours: 1.92,
        attendanceCode: 'A02',
        accountPath: '大华富阳工厂/W1总装车间/W1总装车间L1产线/大桶/包装/-/-',
        expectedAmount: 38.4, // 1.92 × 20
      },
    ];

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
    console.log(`员工系数: ${baseCoefficient}\n`);

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

    console.log(`找到 ${policies.length} 条激活的政策\n`);

    // 3. 测试每个场景
    for (const testCase of testCases) {
      console.log(`测试: ${testCase.name}`);
      console.log(`  工时: ${testCase.workHours}`);
      console.log(`  出勤代码: ${testCase.attendanceCode}`);
      console.log(`  账户路径: ${testCase.accountPath}`);

      // 匹配金额政策
      let matchedPolicy = null;
      for (const policy of policies) {
        const policyCodes = JSON.parse(policy.attendanceCodes || '[]');

        if (!policyCodes.includes(testCase.attendanceCode)) {
          continue;
        }

        const isExactMatch =
          policy.accountPathMatch === 'EXACT' && testCase.accountPath === policy.accountPath;
        const isPrefixMatch =
          policy.accountPathMatch === 'PREFIX' && testCase.accountPath.startsWith(policy.accountPath);

        if (isExactMatch || isPrefixMatch) {
          matchedPolicy = policy;
          break;
        }
      }

      // 计算金额
      let calculatedAmount = 0;
      if (matchedPolicy) {
        console.log(`  ✅ 匹配到政策: ${matchedPolicy.name}`);
        console.log(`     政策账户: ${matchedPolicy.accountPath}`);
        console.log(`     匹配模式: ${matchedPolicy.accountPathMatch}`);
        console.log(`     倍数: ${matchedPolicy.multiplier}`);

        const multiplier = matchedPolicy.multiplier || 1;
        calculatedAmount = testCase.workHours * baseCoefficient * multiplier;
        console.log(`  计算公式: ${testCase.workHours} × ${baseCoefficient} × ${multiplier} = ${calculatedAmount}`);
      } else {
        console.log(`  ℹ️ 未匹配到政策，使用基础系数`);
        calculatedAmount = testCase.workHours * baseCoefficient;
        console.log(`  计算公式: ${testCase.workHours} × ${baseCoefficient} = ${calculatedAmount}`);
      }

      // 验证结果
      const isCorrect = Math.abs(calculatedAmount - testCase.expectedAmount) < 0.01;
      console.log(`  预期金额: ¥${testCase.expectedAmount.toFixed(2)}`);
      console.log(`  计算金额: ¥${calculatedAmount.toFixed(2)}`);
      console.log(`  结果: ${isCorrect ? '✅ 正确' : '❌ 错误'}`);
      console.log('');
    }

    console.log('========== 验证完成 ==========');
    console.log('\n下一步:');
    console.log('运行实际重新计算以更新数据库中的金额');
    console.log('可以通过前端页面或API触发生效');

  } catch (error) {
    console.error('验证失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAmountPolicyFix()
  .then(() => {
    console.log('\n验证完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n验证失败:', error);
    process.exit(1);
  });
