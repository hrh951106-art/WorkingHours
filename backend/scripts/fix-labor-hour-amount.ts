/**
 * 修复工时申报单金额计算问题
 * 为申报单 LABOR202605282354253068 重新计算金额
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixLaborHourAmount() {
  console.log('=== 开始修复工时申报单金额计算 ===\n');

  const requestNo = 'LABOR202605282354253068';

  try {
    // 1. 查询申报单
    const request = await prisma.laborHourReportRequest.findUnique({
      where: { requestNo },
    });

    if (!request) {
      console.error('❌ 申报单不存在:', requestNo);
      return;
    }

    console.log('✅ 找到申报单:', request.requestNo);
    console.log('  工时类型:', request.hourType);
    console.log('  工时数:', request.value);
    console.log('');

    // 2. 删除现有的工时结果记录
    const deletedResults = await prisma.workHourResult.deleteMany({
      where: {
        sourceType: 'LABOR_HOUR_REPORT',
        sourceId: request.id,
      },
    });

    console.log('✅ 删除了', deletedResults.count, '条旧的工时结果记录');
    console.log('');

    // 3. 重新提交审批（模拟）
    // 注意：实际操作需要通过 API 进行
    console.log('下一步操作：');
    console.log('  1. 通过前端界面重新审批该申报单');
    console.log('  2. 或者使用以下 API 进行审批：');
    console.log('');
    console.log('  API 端点: PUT /api/labor-hour-report/requests/:id/approve');
    console.log('  参数: { "approverId": 1, "approverName": "admin", "approvalComment": "重新审批以计算金额" }');
    console.log('  其中 :id =', request.id);
    console.log('');

    // 4. 显示预期结果
    console.log('预期金额计算结果:');
    console.log('  员工: 202605005');
    console.log('  工时数:', request.value);
    console.log('  员工系数: 20');
    console.log('  预计金额: 20 ×', request.value, '=', 20 * Number(request.value), '元');
    console.log('');

  } catch (error) {
    console.error('❌ 操作失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLaborHourAmount();
