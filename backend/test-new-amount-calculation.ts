import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 新金额计算逻辑测试脚本
 *
 * 测试场景：
 * 1. 人员系数 = 20
 * 2. 金额规则：A01出勤代码 + A账户 + 1.5倍
 * 3. 计算结果：
 *    - A01：3小时 × 20 × 1.5 = 90元
 *    - A02：4小时 × 20 × 1.0 = 80元（没有匹配到规则）
 */

async function testNewAmountCalculation() {
  console.log('========== 新金额计算逻辑测试 ==========\n');

  try {
    // 1. 准备测试数据
    console.log('1. 准备测试数据...');

    // 查找或创建测试员工
    let employee = await prisma.employee.findFirst({
      where: { employeeNo: 'TEST001' },
    });

    if (!employee) {
      console.log('  创建测试员工: TEST001');
      employee = await prisma.employee.create({
        data: {
          employeeNo: 'TEST001',
          name: '测试员工',
          orgId: 1,
          entryDate: new Date(),
          status: 'ACTIVE',
        },
      });
    }

    console.log(`  员工: ${employee.name} (${employee.employeeNo}), ID: ${employee.id}`);

    // 配置员工系数
    const existingCoefficient = await prisma.employeeCoefficient.findFirst({
      where: {
        employeeId: employee.id,
        status: 'ACTIVE',
      },
    });

    if (!existingCoefficient) {
      console.log('  配置员工系数: 20');
      await prisma.employeeCoefficient.create({
        data: {
          employeeId: employee.id,
          employeeNo: employee.employeeNo,
          employeeName: employee.name || '',
          coefficient: 20,
          effectiveDate: new Date('2026-01-01'),
          status: 'ACTIVE',
          createdById: 1,
          createdByName: 'system',
        },
      });
    } else {
      console.log(`  员工系数已存在: ${existingCoefficient.coefficient}`);
    }

    // 创建或更新金额政策
    let policy = await prisma.amountPolicy.findFirst({
      where: { code: 'TEST_POLICY_001' },
    });

    if (!policy) {
      console.log('  创建金额政策: A01出勤代码 + 1.5倍');
      policy = await prisma.amountPolicy.create({
        data: {
          code: 'TEST_POLICY_001',
          name: '测试金额政策',
          description: '用于测试新的金额计算逻辑',
          policyType: 'MULTIPLY',
          multiplier: 1.5,
          accountPath: 'A',
          accountPathMatch: 'EXACT',
          attendanceCodes: JSON.stringify(['A01']),
          priority: 10,
          status: 'ACTIVE',
          effectiveDate: new Date('2026-01-01'),
          createdById: 1,
          createdByName: 'system',
        },
      });
    } else {
      console.log(`  金额政策已存在: ${policy.name} (${policy.policyType})`);
    }

    // 确保出勤代码启用金额计算
    const codeA01 = await prisma.calculationAttendanceCode.findUnique({
      where: { code: 'A01' },
    });

    if (codeA01 && !codeA01.calculateAmount) {
      console.log('  启用A01出勤代码的金额计算');
      await prisma.calculationAttendanceCode.update({
        where: { code: 'A01' },
        data: { calculateAmount: true },
      });
    } else if (codeA01) {
      console.log(`  A01出勤代码已启用金额计算: ${codeA01.calculateAmount}`);
    }

    const codeA02 = await prisma.calculationAttendanceCode.findUnique({
      where: { code: 'A02' },
    });

    if (codeA02 && !codeA02.calculateAmount) {
      console.log('  启用A02出勤代码的金额计算');
      await prisma.calculationAttendanceCode.update({
        where: { code: 'A02' },
        data: { calculateAmount: true },
      });
    } else if (codeA02) {
      console.log(`  A02出勤代码已启用金额计算: ${codeA02.calculateAmount}`);
    }

    // 2. 测试场景1：A01出勤代码 + A账户（匹配金额规则）
    console.log('\n2. 测试场景1：A01出勤代码 + A账户（匹配金额规则）');
    console.log('  预期结果：3小时 × 20 × 1.5 = 90元');

    const amountA01 = await calculateAmountByNo({
      employeeNo: employee.employeeNo,
      workHours: 3,
      attendanceCode: 'A01',
      accountPath: 'A',
      calcDate: new Date('2026-05-15'),
    });

    console.log(`  实际结果：${amountA01}元`);
    console.log(`  测试${amountA01 === 90 ? '✅ 通过' : '❌ 失败'}`);

    // 3. 测试场景2：A02出勤代码 + A账户（不匹配金额规则）
    console.log('\n3. 测试场景2：A02出勤代码 + A账户（不匹配金额规则）');
    console.log('  预期结果：4小时 × 20 × 1.0 = 80元');

    const amountA02 = await calculateAmountByNo({
      employeeNo: employee.employeeNo,
      workHours: 4,
      attendanceCode: 'A02',
      accountPath: 'A',
      calcDate: new Date('2026-05-15'),
    });

    console.log(`  实际结果：${amountA02}元`);
    console.log(`  测试${amountA02 === 80 ? '✅ 通过' : '❌ 失败'}`);

    // 4. 测试场景3：多账户计算
    console.log('\n4. 测试场景3：多账户计算');
    console.log('  预期结果：A(3h) + B(4h) = 90 + 80 = 170元');

    const accountHours = [
      { accountId: 1, accountName: 'A', hours: 3 },
      { accountId: 2, accountName: 'B', hours: 4 },
    ];

    const totalAmountA01 = await calculateAmountForAccountByNo({
      employeeNo: employee.employeeNo,
      attendanceCode: 'A01',
      accountHours,
      calcDate: new Date('2026-05-15'),
    });

    console.log(`  A01多账户实际结果：${totalAmountA01}元`);
    console.log(`  A01多账户测试${totalAmountA01 === 170 ? '✅ 通过' : '❌ 失败'}`);

    const totalAmountA02 = await calculateAmountForAccountByNo({
      employeeNo: employee.employeeNo,
      attendanceCode: 'A02',
      accountHours,
      calcDate: new Date('2026-05-15'),
    });

    console.log(`  A02多账户实际结果：${totalAmountA02}元`);
    console.log(`  A02多账户测试${totalAmountA02 === 140 ? '✅ 通过' : '❌ 失败'}`);

    // 5. 总结
    console.log('\n========== 测试总结 ==========');
    const allTestsPassed =
      amountA01 === 90 &&
      amountA02 === 80 &&
      totalAmountA01 === 170 &&
      totalAmountA02 === 140;

    if (allTestsPassed) {
      console.log('✅ 所有测试通过！');
    } else {
      console.log('❌ 部分测试失败，请检查计算逻辑');
    }

    console.log('\n计算逻辑说明：');
    console.log('1. 如果没有匹配到金额规则：金额 = 人员系数 × 工时数');
    console.log('2. 如果匹配到金额规则（MULTIPLY）：金额 = 人员系数 × 倍数 × 工时数');
    console.log('3. 多账户计算时，分别计算每个账户的金额并累加');

  } catch (error) {
    console.error('测试失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 辅助函数：模拟AmountCalculateService.calculateAmountByNo
 */
async function calculateAmountByNo(params: {
  employeeNo: string;
  workHours: number;
  attendanceCode: string;
  accountPath: string;
  calcDate: Date;
}): Promise<number> {
  const { employeeNo, workHours, attendanceCode, accountPath, calcDate } = params;

  // 1. 获取员工系数
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
    return 0;
  }

  const baseCoefficient = coefficientRecord.coefficient;

  // 2. 检查出勤代码是否启用金额计算
  const attendanceCodeConfig = await prisma.calculationAttendanceCode.findUnique({
    where: { code: attendanceCode },
  });

  if (!attendanceCodeConfig || !attendanceCodeConfig.calculateAmount) {
    return 0;
  }

  // 3. 尝试匹配金额政策
  const policy = await matchPolicy(accountPath, attendanceCode, calcDate);

  let finalAmount = 0;

  if (!policy) {
    // 没有匹配到金额规则，只使用人员系数
    finalAmount = workHours * baseCoefficient;
  } else {
    // 匹配到金额规则，结合人员系数和金额规则系数
    switch (policy.policyType) {
      case 'ADD':
        finalAmount = workHours * (baseCoefficient + (policy.fixedValue || 0));
        break;

      case 'MULTIPLY':
        const multiplier = policy.multiplier || 1;
        finalAmount = workHours * baseCoefficient * multiplier;
        break;

      case 'CUSTOM':
        finalAmount = workHours * (policy.fixedValue || 0);
        break;

      default:
        finalAmount = workHours * baseCoefficient;
    }
  }

  return Math.round(finalAmount * 100) / 100;
}

/**
 * 辅助函数：模拟AmountCalculateService.calculateAmountForAccountsByNo
 */
async function calculateAmountForAccountByNo(params: {
  employeeNo: string;
  attendanceCode: string;
  accountHours: Array<{
    accountId: number;
    accountName: string;
    hours: number;
  }>;
  calcDate: Date;
}): Promise<number> {
  const { employeeNo, attendanceCode, accountHours, calcDate } = params;

  let totalAmount = 0;

  for (const account of accountHours) {
    const amount = await calculateAmountByNo({
      employeeNo,
      workHours: account.hours,
      attendanceCode,
      accountPath: account.accountName,
      calcDate,
    });
    totalAmount += amount;
  }

  return Math.round(totalAmount * 100) / 100;
}

/**
 * 辅助函数：匹配金额政策
 */
async function matchPolicy(
  accountPath: string,
  attendanceCode: string,
  calcDate: Date,
) {
  const policies = await prisma.amountPolicy.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      effectiveDate: { lte: calcDate },
      OR: [
        { expiryDate: null },
        { expiryDate: { gt: calcDate } },
      ],
      AND: [
        {
          OR: [
            {
              accountPathMatch: 'EXACT',
              accountPath: accountPath,
            },
            {
              accountPathMatch: 'PREFIX',
              accountPath: {
                startsWith: accountPath,
              },
            },
          ],
        },
      ],
    },
    orderBy: [
      { priority: 'desc' },
      { effectiveDate: 'desc' },
    ],
  });

  const matchedPolicies = policies.filter(policy => {
    const codes = JSON.parse(policy.attendanceCodes || '[]');
    return codes.includes(attendanceCode);
  });

  return matchedPolicies[0] || null;
}

// 运行测试
testNewAmountCalculation()
  .then(() => {
    console.log('\n测试脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n测试脚本执行失败:', error);
    process.exit(1);
  });
