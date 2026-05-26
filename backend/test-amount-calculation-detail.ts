import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 测试金额计算逻辑
 */
async function testAmountCalculation() {
  console.log('========== 测试金额计算 ==========\n');

  try {
    const employeeNo = '202604003';
    const calcDate = new Date('2026-05-12');

    // 模拟数据
    const workHours = 3;
    const attendanceCode = 'A02';
    const accountPath = '大华富阳工厂/W1总装车间/W1总装车间L2产线/大桶/焊接/-/-';

    console.log('测试参数:');
    console.log(`  员工: ${employeeNo}`);
    console.log(`  日期: ${calcDate.toISOString().split('T')[0]}`);
    console.log(`  工时: ${workHours}`);
    console.log(`  出勤代码: ${attendanceCode}`);
    console.log(`  账户路径: ${accountPath}`);
    console.log(`\n`);

    // 1. 获取员工系数
    console.log('1. 获取员工系数...');
    const coefficientRecord = await prisma.employeeCoefficient.findFirst({
      where: {
        employeeNo,
        effectiveDate: { lte: calcDate },
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: calcDate } },
        ],
        status: 'ACTIVE',
      },
      orderBy: { effectiveDate: 'desc' },
    });

    if (!coefficientRecord) {
      console.log('❌ 未找到员工系数');
      return;
    }

    const baseCoefficient = coefficientRecord.coefficient;
    console.log(`✅ 员工系数: ${baseCoefficient}`);

    // 2. 检查出勤代码
    console.log('\n2. 检查出勤代码...');
    const attendanceCodeConfig = await prisma.calculationAttendanceCode.findUnique({
      where: { code: attendanceCode },
    });

    if (!attendanceCodeConfig) {
      console.log('❌ 出勤代码不存在');
      return;
    }

    console.log(`✅ 出勤代码: ${attendanceCodeConfig.name}`);
    console.log(`   计算金额: ${attendanceCodeConfig.calculateAmount}`);

    if (!attendanceCodeConfig.calculateAmount) {
      console.log('❌ 该出勤代码未启用金额计算');
      return;
    }

    // 3. 匹配金额政策
    console.log('\n3. 匹配金额政策...');
    const policies = await prisma.amountPolicy.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        effectiveDate: { lte: calcDate },
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: calcDate } },
        ],
      },
      orderBy: [{ priority: 'desc' }, { effectiveDate: 'desc' }],
    });

    console.log(`找到 ${policies.length} 条激活的政策`);

    let matchedPolicy = null;
    for (const policy of policies) {
      const policyCodes = JSON.parse(policy.attendanceCodes || '[]');

      // 检查出勤代码是否匹配
      if (!policyCodes.includes(attendanceCode)) {
        continue;
      }

      // 检查账户路径是否匹配
      const isExactMatch = policy.accountPathMatch === 'EXACT' && accountPath === policy.accountPath;
      const isPrefixMatch = policy.accountPathMatch === 'PREFIX' && accountPath.startsWith(policy.accountPath);

      if (isExactMatch || isPrefixMatch) {
        matchedPolicy = policy;
        break;
      }
    }

    if (matchedPolicy) {
      console.log(`✅ 匹配到金额政策: ${matchedPolicy.name}`);
      console.log(`   类型: ${matchedPolicy.policyType}, 倍数: ${matchedPolicy.multiplier}`);
      console.log(`   政策账户路径: ${matchedPolicy.accountPath}`);
    } else {
      console.log('❌ 没有匹配到金额政策');
      console.log('   原因: 账户路径不匹配或出勤代码不匹配');
    }

    // 4. 计算金额
    console.log('\n4. 计算金额...');
    let finalAmount = 0;

    if (!matchedPolicy) {
      // 没有匹配到金额规则，只使用人员系数
      finalAmount = workHours * baseCoefficient;
      console.log(`✅ 计算公式: ${workHours} × ${baseCoefficient} = ${finalAmount}`);
    } else {
      // 匹配到金额规则，结合人员系数和金额规则系数
      switch (matchedPolicy.policyType) {
        case 'ADD':
          finalAmount = workHours * (baseCoefficient + (matchedPolicy.fixedValue || 0));
          console.log(`✅ 计算公式: ${workHours} × (${baseCoefficient} + ${matchedPolicy.fixedValue || 0}) = ${finalAmount}`);
          break;

        case 'MULTIPLY':
          const multiplier = matchedPolicy.multiplier || 1;
          finalAmount = workHours * baseCoefficient * multiplier;
          console.log(`✅ 计算公式: ${workHours} × ${baseCoefficient} × ${multiplier} = ${finalAmount}`);
          break;

        case 'CUSTOM':
          finalAmount = workHours * (matchedPolicy.fixedValue || 0);
          console.log(`✅ 计算公式: ${workHours} × ${matchedPolicy.fixedValue || 0} = ${finalAmount}`);
          break;

        default:
          finalAmount = workHours * baseCoefficient;
          console.log(`✅ 计算公式: ${workHours} × ${baseCoefficient} = ${finalAmount} (默认)`);
      }
    }

    console.log('\n========== 最终结果 ==========');
    console.log(`金额: ¥${finalAmount.toFixed(2)}`);
    console.log(`预期金额: ¥${matchedPolicy ? (3 * 20 * 1.5).toFixed(2) : (3 * 20).toFixed(2)}`);

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAmountCalculation()
  .then(() => {
    console.log('\n测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n测试失败:', error);
    process.exit(1);
  });
