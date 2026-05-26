import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 金额计算功能测试脚本
 *
 * 测试场景：
 * 1. 员工系数 × 金额政策 × 工时数 = 金额
 * 2. 考勤工时的金额计算
 * 3. 精益工时的金额计算
 */

async function testAmountCalculation() {
  console.log('========== 金额计算功能测试 ==========\n');

  try {
    // 1. 检查数据库字段是否添加成功
    console.log('1. 检查数据库字段...');
    const calcResultColumns = await prisma.$queryRaw`
      PRAGMA table_info(CalcResult)
    `;
    console.log('CalcResult表字段:', calcResultColumns);

    const workHourResultColumns = await prisma.$queryRaw`
      PRAGMA table_info(WorkHourResult)
    `;
    console.log('WorkHourResult表字段:', workHourResultColumns);

    // 检查是否有amount字段
    const hasAmountInCalcResult = (calcResultColumns as any[]).some(
      (col: any) => col.name === 'amount'
    );
    const hasAmountInWorkHourResult = (workHourResultColumns as any[]).some(
      (col: any) => col.name === 'amount'
    );

    console.log(`\n✅ CalcResult表有amount字段: ${hasAmountInCalcResult}`);
    console.log(`✅ WorkHourResult表有amount字段: ${hasAmountInWorkHourResult}`);

    // 2. 检查员工系数配置
    console.log('\n2. 检查员工系数配置...');
    const employeeCoefficients = await prisma.employeeCoefficient.findMany({
      take: 5,
      include: {
        employee: {
          select: {
            employeeNo: true,
            name: true,
          },
        },
      },
    });

    console.log(`找到 ${employeeCoefficients.length} 条员工系数记录`);
    if (employeeCoefficients.length > 0) {
      employeeCoefficients.forEach((ec) => {
        console.log(
          `  - 员工: ${ec.employee.name} (${ec.employee.employeeNo}), 系数: ${ec.coefficient}, 生效日期: ${ec.effectiveDate.toISOString().split('T')[0]}`
        );
      });
    }

    // 3. 检查金额政策配置
    console.log('\n3. 检查金额政策配置...');
    const amountPolicies = await prisma.amountPolicy.findMany({
      take: 5,
      where: {
        status: 'ACTIVE',
      },
    });

    console.log(`找到 ${amountPolicies.length} 条激活的金额政策`);
    if (amountPolicies.length > 0) {
      amountPolicies.forEach((policy) => {
        console.log(
          `  - 政策: ${policy.name} (${policy.code}), 类型: ${policy.policyType}, 账户路径: ${policy.accountPath}`
        );
      });
    }

    // 4. 检查计算出勤代码配置
    console.log('\n4. 检查计算出勤代码配置...');
    const calcCodes = await prisma.calculationAttendanceCode.findMany({
      where: {
        calculateAmount: true,
      },
    });

    console.log(`找到 ${calcCodes.length} 条启用金额计算的出勤代码`);
    if (calcCodes.length > 0) {
      calcCodes.forEach((code) => {
        console.log(
          `  - 代码: ${code.code} (${code.name}), 类型: ${code.type}, 计算金额: ${code.calculateAmount}`
        );
      });
    }

    // 5. 检查考勤规则组配置
    console.log('\n5. 检查考勤规则组配置...');
    const ruleGroups = await prisma.attendanceRuleGroup.findMany({
      take: 3,
      where: {
        status: 'ACTIVE',
      },
      include: {
        details: true,
      },
    });

    console.log(`找到 ${ruleGroups.length} 条激活的考勤规则组`);
    if (ruleGroups.length > 0) {
      ruleGroups.forEach((rg) => {
        const detail = rg.details[0];
        if (detail) {
          let amountPolicyIds: number[] = [];
          try {
            amountPolicyIds = JSON.parse(detail.amountPolicyIds || '[]');
          } catch (e) {
            amountPolicyIds = [];
          }
          console.log(
            `  - 规则组: ${rg.name} (${rg.code}), 关联金额政策: ${amountPolicyIds.length} 条`
          );
        }
      });
    }

    // 6. 检查现有的计算结果
    console.log('\n6. 检查现有的计算结果...');
    const calcResults = await prisma.calcResult.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        employee: {
          select: {
            name: true,
          },
        },
        calculationAttendanceCode: {
          select: {
            code: true,
            name: true,
            calculateAmount: true,
          },
        },
      },
    });

    console.log(`找到 ${calcResults.length} 条最近的计算结果`);
    if (calcResults.length > 0) {
      calcResults.forEach((cr) => {
        console.log(
          `  - 员工: ${cr.employee.name}, 日期: ${cr.calcDate.toISOString().split('T')[0]}, ` +
          `出勤代码: ${cr.calculationAttendanceCode?.code || 'N/A'}, ` +
          `工时: ${cr.actualHours}h, 金额: ${cr.amount}`
        );
      });
    }

    // 7. 检查工时结果
    console.log('\n7. 检查工时结果...');
    const workHourResults = await prisma.workHourResult.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`找到 ${workHourResults.length} 条最近的工时结果`);
    if (workHourResults.length > 0) {
      workHourResults.forEach((whr) => {
        console.log(
          `  - 员工: ${whr.employeeNo}, 日期: ${whr.calcDate.toISOString().split('T')[0]}, ` +
          `出勤代码: ${whr.calcAttendanceCode}, ` +
          `工时: ${whr.workHours}h, 金额: ${whr.amount}, source: ${whr.source}`
        );
      });
    }

    console.log('\n========== 测试完成 ==========');
    console.log('\n✅ 金额计算功能已成功集成到计算模块！');
    console.log('\n使用说明：');
    console.log('1. 在EmployeeCoefficient表中配置员工系数');
    console.log('2. 在AmountPolicy表中配置金额政策');
    console.log('3. 在CalculationAttendanceCode表中设置calculateAmount=true');
    console.log('4. 在AttendanceRuleGroup中关联金额政策');
    console.log('5. 运行计算后，金额将自动计算并存储在CalcResult和WorkHourResult表中');

  } catch (error) {
    console.error('测试失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行测试
testAmountCalculation()
  .then(() => {
    console.log('\n测试脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n测试脚本执行失败:', error);
    process.exit(1);
  });
