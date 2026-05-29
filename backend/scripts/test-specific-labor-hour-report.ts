/**
 * 测试工时申报单金额计算
 * 针对申报单 LABOR202605282354253068
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLaborHourReportAmount() {
  console.log('=== 测试工时申报单金额计算 ===\n');

  const requestNo = 'LABOR202605282354253068';

  try {
    // 1. 查询申报单信息
    const request = await prisma.laborHourReportRequest.findUnique({
      where: { requestNo },
    });

    if (!request) {
      console.error('❌ 申报单不存在:', requestNo);
      return;
    }

    console.log('✅ 找到申报单:');
    console.log('  ID:', request.id);
    console.log('  单号:', request.requestNo);
    console.log('  标题:', request.title);
    console.log('  工时类型:', request.hourType, '(', request.hourTypeName, ')');
    console.log('  工时数:', request.value);
    console.log('  状态:', request.status);
    console.log('  审批时间:', request.approvedAt);
    console.log('');

    // 2. 查询对应的工时结果记录
    const workHourResults = await prisma.workHourResult.findMany({
      where: {
        sourceType: 'LABOR_HOUR_REPORT',
        sourceId: request.id,
      },
    });

    console.log('✅ 找到', workHourResults.length, '条工时结果记录:');
    workHourResults.forEach(result => {
      console.log('  记录ID:', result.id);
      console.log('  员工:', result.employeeNo);
      console.log('  工时数:', result.workHours);
      console.log('  金额:', result.amount || '未计算');
      console.log('  计算金额:', result.calculateAmount || '未计算');
      console.log('  账户路径:', result.accountPath);
      console.log('');
    });

    // 3. 检查配置问题
    console.log('=== 检查配置 ===\n');

    // 检查定义出勤代码
    const definitionCode = await prisma.definitionAttendanceCode.findFirst({
      where: { code: request.hourType },
    });

    if (definitionCode) {
      console.log('定义出勤代码:', definitionCode.code, '-', definitionCode.name);
      console.log('  计算代码:', definitionCode.calcAttendanceCode || '(未配置)');
    } else {
      console.log('❌ 未找到定义出勤代码:', request.hourType);
    }
    console.log('');

    // 4. 模拟金额计算
    console.log('=== 模拟金额计算 ===\n');

    if (workHourResults.length > 0) {
      const result = workHourResults[0];

      // 获取员工系数
      const coefficient = await prisma.employeeCoefficient.findFirst({
        where: {
          employeeNo: result.employeeNo,
          effectiveDate: { lte: new Date() },
          OR: [
            { expiryDate: null },
            { expiryDate: { gte: new Date() } },
          ],
          status: 'ACTIVE',
        },
        orderBy: { effectiveDate: 'desc' },
      });

      if (coefficient) {
        console.log('员工系数:', coefficient.coefficient, '(', coefficient.coefficientType, ')');
      } else {
        console.log('❌ 未找到员工系数');
      }

      // 计算金额
      const calcCode = definitionCode?.calcAttendanceCode || definitionCode?.code || request.hourType;
      const baseAmount = coefficient ? coefficient.coefficient : 0;
      const workHours = result.workHours || 0;
      const calculatedAmount = baseAmount * workHours;

      console.log('');
      console.log('计算参数:');
      console.log('  计算代码:', calcCode);
      console.log('  工时数:', workHours);
      console.log('  员工系数:', baseAmount);
      console.log('');
      console.log('计算结果（基础公式）:');
      console.log('  金额 = 员工系数 × 工时数');
      console.log('  金额 =', baseAmount, '×', workHours, '=', calculatedAmount);
      console.log('');

      // 5. 结论
      console.log('=== 结论 ===\n');
      console.log('当前状态:');
      console.log('  - 申报单已审批，但金额字段为空');
      console.log('  - 原因：该申报单在金额计算功能添加之前审批');
      console.log('');
      console.log('建议解决方案:');
      console.log('  1. 配置定义出勤代码的计算代码（calcAttendanceCode）');
      console.log('  2. 重新创建并审批一个新的申报单进行测试');
      console.log('  3. 或者删除现有工时结果记录，重新审批该申报单');
    }

  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLaborHourReportAmount();
