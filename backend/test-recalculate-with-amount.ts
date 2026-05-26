import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 测试精益工时重新计算后的金额
 */
async function testRecalculateWithAmount() {
  console.log('========== 测试精益工时重新计算金额 ==========\n');

  try {
    const employeeNo = '202604003';
    const calcDate = '2026-05-12';

    // 1. 获取摆卡结果
    console.log('1. 获取摆卡结果...');
    const punchPairs = await prisma.punchPair.findMany({
      where: {
        employeeNo,
        pairDate: new Date(calcDate),
      },
      include: {
        employee: true,
      },
    });

    console.log(`找到 ${punchPairs.length} 条摆卡结果\n`);

    if (punchPairs.length === 0) {
      console.log('❌ 没有摆卡结果，无法测试');
      return;
    }

    // 2. 模拟重新计算（调用后端 API）
    console.log('2. 模拟重新计算...');
    console.log('注意：此脚本会手动计算金额以验证逻辑\n');

    // 获取员工系数
    const coefficientRecord = await prisma.employeeCoefficient.findFirst({
      where: {
        employeeNo,
        effectiveDate: { lte: new Date(calcDate) },
        OR: [{ expiryDate: null }, { expiryDate: { gte: new Date(calcDate) } }],
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

    // 获取金额政策
    const policies = await prisma.amountPolicy.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        effectiveDate: { lte: new Date(calcDate) },
        OR: [{ expiryDate: null }, { expiryDate: { gte: new Date(calcDate) } }],
      },
      orderBy: [{ priority: 'desc' }, { effectiveDate: 'desc' }],
    });

    console.log(`找到 ${policies.length} 条激活的政策\n`);

    // 获取计算出勤代码
    const calcCode = await prisma.calculationAttendanceCode.findUnique({
      where: { code: 'A02' },
    });

    if (!calcCode) {
      console.log('❌ 未找到计算出勤代码 A02');
      return;
    }

    console.log(`计算出勤代码: ${calcCode.name} (${calcCode.code})`);
    console.log(`计算金额: ${calcCode.calculateAmount ? '✅ 是' : '❌ 否'}\n`);

    // 3. 查看当前 CalcResult
    console.log('3. 当前 CalcResult 状态（重新计算前）...');
    const currentResults = await prisma.calcResult.findMany({
      where: {
        employeeNo,
        calcDate: new Date(calcDate),
        calculationAttendanceCodeId: calcCode.id,
      },
    });

    console.log(`找到 ${currentResults.length} 条记录\n`);
    currentResults.forEach((cr) => {
      console.log(`  ID: ${cr.id}, 账户: ${cr.accountName}, 工时: ${cr.actualHours}, 金额: ${cr.amount || '未计算'}`);
    });

    // 4. 模拟金额计算（验证逻辑）
    console.log('\n4. 模拟金额计算（验证层级匹配逻辑）...');

    for (const cr of currentResults) {
      let amount = 0;
      let matchedPolicy = null;

      // 查找匹配的金额政策
      for (const policy of policies) {
        const policyCodes = JSON.parse(policy.attendanceCodes || '[]');
        if (!policyCodes.includes(calcCode.code)) {
          continue;
        }

        // 层级匹配
        const policyParts = policy.accountPath.split('/');
        const actualParts = (cr.accountName || '').split('/');

        let match = true;
        let requiredMatches = 0;
        const maxLevel = Math.max(policyParts.length, actualParts.length);

        for (let i = 0; i < maxLevel; i++) {
          const policyValue = policyParts[i] || '';
          const actualValue = actualParts[i] || '';

          if (!policyValue || policyValue === '-' || policyValue === '') {
            continue;
          }

          requiredMatches++;

          if (actualValue !== policyValue) {
            match = false;
            break;
          }
        }

        if (match && requiredMatches > 0) {
          matchedPolicy = policy;
          break;
        }
      }

      // 计算金额
      if (matchedPolicy && calcCode.calculateAmount) {
        const multiplier = matchedPolicy.multiplier || 1;
        amount = cr.actualHours * baseCoefficient * multiplier;
        console.log(`\n账户: ${cr.accountName}`);
        console.log(`  工时: ${cr.actualHours}`);
        console.log(`  ✅ 匹配政策: ${matchedPolicy.name} (${matchedPolicy.code})`);
        console.log(`  倍数: ${multiplier}`);
        console.log(`  计算公式: ${cr.actualHours} × ${baseCoefficient} × ${multiplier} = ${amount}`);
        console.log(`  预期金额: ¥${amount.toFixed(2)}`);
      } else if (calcCode.calculateAmount) {
        amount = cr.actualHours * baseCoefficient;
        console.log(`\n账户: ${cr.accountName}`);
        console.log(`  工时: ${cr.actualHours}`);
        console.log(`  ℹ️ 未匹配政策，使用基础系数`);
        console.log(`  计算公式: ${cr.actualHours} × ${baseCoefficient} = ${amount}`);
        console.log(`  预期金额: ¥${amount.toFixed(2)}`);
      } else {
        console.log(`\n账户: ${cr.accountName}`);
        console.log(`  ℹ️ 该出勤代码未启用金额计算`);
      }

      // 检查当前金额是否正确
      const currentAmount = cr.amount || 0;
      const expectedAmount = Math.round(amount * 100) / 100;
      const isCorrect = Math.abs(currentAmount - expectedAmount) < 0.01;

      if (cr.amount === null || cr.amount === 0) {
        console.log(`  当前金额: 未计算 ⚠️`);
      } else if (isCorrect) {
        console.log(`  当前金额: ¥${currentAmount.toFixed(2)} ✅ 正确`);
      } else {
        console.log(`  当前金额: ¥${currentAmount.toFixed(2)} ❌ 错误（应为 ¥${expectedAmount.toFixed(2)}）`);
      }
    }

    console.log('\n========== 测试说明 ==========');
    console.log('1. 如果显示"未计算"，说明需要重新触发计算');
    console.log('2. 修复后，重新计算应该会正确计算金额');
    console.log('3. 可以通过前端页面或以下方式触发重新计算：');
    console.log('   - 前端：计算管理 → 计算结果 → 点击"重新计算工时"');
    console.log('   - API: POST /calculate/calculate/batch');

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRecalculateWithAmount()
  .then(() => {
    console.log('\n测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n测试失败:', error);
    process.exit(1);
  });
