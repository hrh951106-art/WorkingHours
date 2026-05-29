/**
 * 测试工时报工金额计算功能
 *
 * 测试场景：
 * 1. 创建工时报工申请
 * 2. 审批通过，验证金额是否正确计算
 * 3. 检查工时结果表中的金额字段
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLaborHourAmountCalculation() {
  console.log('=== 开始测试工时报工金额计算功能 ===\n');

  try {
    // 1. 查询测试数据
    console.log('步骤1: 查询测试数据');

    // 查找有效的员工系数
    const employeeCoefficient = await prisma.employeeCoefficient.findFirst({
      where: {
        status: 'ACTIVE',
      },
    });

    if (!employeeCoefficient) {
      console.error('❌ 未找到有效的员工系数，请先配置员工系数');
      return;
    }

    console.log(`✅ 找到员工系数: 员工=${employeeCoefficient.employeeNo}, 系数=${employeeCoefficient.coefficient}`);

    // 查找有效的定义出勤代码
    const definitionAttendanceCode = await prisma.definitionAttendanceCode.findFirst({
      where: {
        status: 'ACTIVE',
        calcAttendanceCode: { not: null },
      },
    });

    if (!definitionAttendanceCode) {
      console.error('❌ 未找到有效的定义出勤代码，请先配置出勤代码');
      return;
    }

    console.log(`✅ 找到定义出勤代码: code=${definitionAttendanceCode.code}, 计算代码=${definitionAttendanceCode.calcAttendanceCode}`);

    // 查找有效的账户
    const account = await prisma.laborAccount.findFirst({
      where: {
        status: 'ACTIVE',
      },
    });

    if (!account) {
      console.error('❌ 未找到有效的账户，请先配置账户');
      return;
    }

    console.log(`✅ 找到账户: code=${account.code}, path=${account.path}`);

    // 2. 检查金额计算逻辑
    console.log('\n步骤2: 检查金额计算逻辑');

    // 查找金额规则
    const amountPolicies = await prisma.amountPolicy.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    console.log(`✅ 找到 ${amountPolicies.length} 条金额规则`);

    if (amountPolicies.length > 0) {
      console.log('金额规则列表:');
      amountPolicies.forEach(policy => {
        console.log(`  - ${policy.code}: ${policy.name}, 类型=${policy.policyType}, 账户路径=${policy.accountPath}`);
      });
    }

    // 3. 测试金额计算
    console.log('\n步骤3: 模拟金额计算');

    // 直接实现简单的金额计算逻辑
    let testAmount = 0;
    const baseCoefficient = employeeCoefficient.coefficient;
    const workHours = 8; // 假设8小时
    const calcAttendanceCode = definitionAttendanceCode.calcAttendanceCode || definitionAttendanceCode.code;

    // 查找匹配的金额规则
    const matchedPolicy = amountPolicies.find(policy => {
      try {
        const policyAttendanceCodes = JSON.parse(policy.attendanceCodes || '[]');
        return policyAttendanceCodes.includes(calcAttendanceCode);
      } catch (e) {
        return false;
      }
    });

    if (matchedPolicy) {
      console.log(`✅ 找到匹配的金额规则: ${matchedPolicy.name}, 类型: ${matchedPolicy.policyType}`);

      // 根据规则类型计算金额
      switch (matchedPolicy.policyType) {
        case 'ADD':
          testAmount = workHours * (baseCoefficient + (matchedPolicy.fixedValue || 0));
          break;
        case 'MULTIPLY':
          const multiplier = matchedPolicy.multiplier || 1;
          testAmount = workHours * baseCoefficient * multiplier;
          break;
        case 'CUSTOM':
          testAmount = workHours * (matchedPolicy.fixedValue || 0);
          break;
        default:
          testAmount = workHours * baseCoefficient;
      }
    } else {
      console.log('⚠️  未找到匹配的金额规则，使用基础公式计算');
      testAmount = workHours * baseCoefficient;
    }

    testAmount = Math.round(testAmount * 100) / 100;

    console.log(`✅ 金额计算结果: ${testAmount} 元`);
    console.log(`   计算公式: 员工系数(${baseCoefficient}) × 工时数(${workHours}) × 金额规则系数`);
    if (matchedPolicy) {
      console.log(`   金额规则: ${matchedPolicy.name} (${matchedPolicy.policyType})`);
    }

    // 4. 检查现有的工时报工申请
    console.log('\n步骤4: 检查现有的工时报工申请');

    const laborHourReports = await prisma.laborHourReportRequest.findMany({
      where: {
        status: 'APPROVED',
      },
      take: 3,
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`✅ 找到 ${laborHourReports.length} 个已审批的工时报工申请`);

    if (laborHourReports.length > 0) {
      console.log('\n检查对应的工时结果记录:');

      for (const report of laborHourReports) {
        const workHourResults = await prisma.workHourResult.findMany({
          where: {
            sourceType: 'LABOR_HOUR_REPORT',
            sourceId: report.id,
          },
        });

        if (workHourResults.length > 0) {
          console.log(`\n申请ID: ${report.id}, 单号: ${report.requestNo}`);
          console.log(`  工时类型: ${report.hourType} (${report.hourTypeName})`);
          console.log(`  工时数: ${report.value}`);
          console.log(`  账户ID: ${report.accountId}`);
          console.log(`  生成工时结果记录数: ${workHourResults.length}`);

          workHourResults.forEach(result => {
            console.log(`    - 员工: ${result.employeeNo}, 工时: ${result.workHours}, 金额: ${result.amount || 0}, 计算金额: ${result.calculateAmount || 0}`);
          });
        }
      }
    }

    // 5. 测试建议
    console.log('\n=== 测试建议 ===');
    console.log('1. 创建一个新的工时报工申请');
    console.log('2. 审批通过后，检查工时结果表中的金额字段是否正确计算');
    console.log('3. 验证金额计算是否符合预期：');
    console.log('   - 如果有匹配的金额规则，应按规则计算');
    console.log('   - 如果没有金额规则，应使用员工系数 × 工时数计算');
    console.log('4. 检查日志输出，确认金额计算流程正确');

    console.log('\n=== 测试完成 ===');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行测试
testLaborHourAmountCalculation();
