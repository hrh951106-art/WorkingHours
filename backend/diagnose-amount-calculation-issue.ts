import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 精益工时金额计算问题诊断脚本
 */

async function diagnoseAmountCalculation() {
  console.log('========== 精益工时金额计算诊断 ==========\n');

  try {
    const employeeNo = '202604003';
    const calcDate = '2026-05-12';

    // 1. 检查员工系数
    console.log('1. 检查员工系数...');
    const coefficients = await prisma.employeeCoefficient.findMany({
      where: {
        employeeNo,
        effectiveDate: { lte: new Date(calcDate) },
      },
      orderBy: { effectiveDate: 'desc' },
    });

    console.log(`找到 ${coefficients.length} 条系数记录`);
    coefficients.forEach((ec) => {
      const isExpired = ec.expiryDate && new Date(ec.expiryDate) < new Date(calcDate);
      console.log(`  - 系数: ${ec.coefficient}, 生效: ${ec.effectiveDate.toISOString().split('T')[0]}, 过期: ${ec.expiryDate ? ec.expiryDate.toISOString().split('T')[0] : '无'}, 是否有效: ${!isExpired ? '✅' : '❌'}`);
    });

    const validCoefficient = coefficients.find((ec) => {
      if (ec.expiryDate && new Date(ec.expiryDate) < new Date(calcDate)) {
        return false;
      }
      return true;
    });

    if (!validCoefficient) {
      console.log('❌ 没有有效的员工系数！');
      return;
    }

    console.log(`✅ 有效系数: ${validCoefficient.coefficient}`);

    // 2. 检查金额政策
    console.log('\n2. 检查金额政策...');
    const policies = await prisma.amountPolicy.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    console.log(`找到 ${policies.length} 条激活的金额政策`);
    policies.forEach((policy) => {
      const codes = JSON.parse(policy.attendanceCodes || '[]');
      console.log(`  - ${policy.name} (${policy.code})`);
      console.log(`    类型: ${policy.policyType}, 倍数: ${policy.multiplier || 'N/A'}, 固定值: ${policy.fixedValue || 'N/A'}`);
      console.log(`    账户路径: ${policy.accountPath}`);
      console.log(`    出勤代码: [${codes.join(', ')}]`);
    });

    // 3. 检查计算出勤代码
    console.log('\n3. 检查计算出勤代码...');
    const calcCodes = await prisma.calculationAttendanceCode.findMany({
      where: {
        calculateAmount: true,
      },
    });

    console.log(`找到 ${calcCodes.length} 条启用金额计算的出勤代码`);
    calcCodes.forEach((code) => {
      console.log(`  - ${code.name} (${code.code}), 类型: ${code.type}, 计算金额: ${code.calculateAmount}`);
    });

    // 4. 检查工时结果
    console.log('\n4. 检查工时结果...');
    const workHourResults = await prisma.workHourResult.findMany({
      where: {
        employeeNo,
        calcDate: new Date(calcDate),
        source: 1, // 精益工时
      },
      take: 10,
    });

    console.log(`找到 ${workHourResults.length} 条精益工时结果`);
    if (workHourResults.length > 0) {
      workHourResults.forEach((whr) => {
        console.log(`  - ${whr.calcAttendanceCode}, 工时: ${whr.workHours}, 金额: ${whr.amount}, 账户: ${whr.accountName}`);
      });
    } else {
      console.log('  ⚠️ 没有找到精益工时结果');
    }

    // 5. 检查计算结果
    console.log('\n5. 检查计算结果（CalcResult）...');
    const calcResults = await prisma.calcResult.findMany({
      where: {
        employeeNo,
        calcDate: new Date(calcDate),
      },
      take: 10,
    });

    console.log(`找到 ${calcResults.length} 条计算结果`);
    if (calcResults.length > 0) {
      calcResults.forEach((cr) => {
        console.log(`  - ID: ${cr.id}, 工时: ${cr.actualHours}, 金额: ${cr.amount}, 账户工时: ${cr.accountHours?.substring(0, 100)}...`);
      });
    } else {
      console.log('  ⚠️ 没有找到计算结果');
    }

    // 6. 模拟金额计算
    console.log('\n6. 模拟金额计算...');

    if (calcResults.length > 0) {
      const calcResult = calcResults[0];
      const accountHours = JSON.parse(calcResult.accountHours || '[]');

      console.log(`  账户工时数据:`);
      accountHours.forEach((ah: any) => {
        console.log(`    - 账户: ${ah.accountName}, 工时: ${ah.hours}`);

        // 测试匹配金额政策
        const matchedPolicy = policies.find((policy) => {
          const policyCodes = JSON.parse(policy.attendanceCodes || '[]');
          // 这里假设是A02代码
          if (!policyCodes.includes('A02')) return false;

          // 检查账户路径匹配
          if (policy.accountPathMatch === 'EXACT') {
            return ah.accountName === policy.accountPath;
          } else if (policy.accountPathMatch === 'PREFIX') {
            return ah.accountName.startsWith(policy.accountPath);
          }
          return false;
        });

        if (matchedPolicy) {
          console.log(`      ✅ 匹配到金额政策: ${matchedPolicy.name}`);
          const multiplier = matchedPolicy.multiplier || 1;
          const amount = ah.hours * validCoefficient.coefficient * multiplier;
          console.log(`      计算公式: ${ah.hours} × ${validCoefficient.coefficient} × ${multiplier} = ${amount}`);
        } else {
          console.log(`      ❌ 没有匹配到金额政策`);
          const amount = ah.hours * validCoefficient.coefficient;
          console.log(`      计算公式: ${ah.hours} × ${validCoefficient.coefficient} = ${amount} (仅基础系数)`);
        }
      });
    }

  } catch (error) {
    console.error('诊断失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseAmountCalculation()
  .then(() => {
    console.log('\n诊断完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n诊断失败:', error);
    process.exit(1);
  });
