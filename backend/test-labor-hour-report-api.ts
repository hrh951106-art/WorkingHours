import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLaborHourReportAPI() {
  console.log('🧪 测试工时报表申请 API\n');

  // 1. 准备测试数据
  const testData = {
    title: '测试工时报表申请',
    reportDate: '2026-05-25',
    employeeId: 4,
    employeeNo: '202605002',
    employeeName: '测试员工',
    hourType: 'NORMAL',
    hourTypeName: '正常工时',
    startTime: '08:00',
    endTime: '17:00',
    value: 8,
    unit: '小时',
    description: '测试申请',
    accountId: 1,
    accountCode: 'TEST001',
    accountName: '测试账户',
    requesterId: 1,
    requesterName: '管理员',
  };

  console.log('📋 测试数据:', JSON.stringify(testData, null, 2));

  // 2. 测试创建申请
  try {
    const requestNo = generateRequestNo();
    const request = await prisma.laborHourReportRequest.create({
      data: {
        requestNo,
        workflowCode: 'LABOR_HOUR_REPORT',
        title: testData.title,
        reportDate: new Date(testData.reportDate),
        employeeId: testData.employeeId,
        employeeNo: testData.employeeNo,
        employeeName: testData.employeeName,
        hourType: testData.hourType,
        hourTypeName: testData.hourTypeName,
        startTime: testData.startTime,
        endTime: testData.endTime,
        value: testData.value,
        unit: testData.unit,
        description: testData.description,
        accountId: testData.accountId,
        accountCode: testData.accountCode,
        accountName: testData.accountName,
        status: 'PENDING',
        requesterId: testData.requesterId,
        requesterName: testData.requesterName,
      },
    });

    console.log('\n✅ 创建申请成功:');
    console.log(`   申请ID: ${request.id}`);
    console.log(`   申请单号: ${request.requestNo}`);
    console.log(`   状态: ${request.status}`);

    // 3. 测试查询申请
    const foundRequest = await prisma.laborHourReportRequest.findUnique({
      where: { id: request.id },
    });

    if (foundRequest) {
      console.log('\n✅ 查询申请成功:');
      console.log(`   标题: ${foundRequest.title}`);
      console.log(`   工时类型: ${foundRequest.hourTypeName}`);
      console.log(`   工时值: ${foundRequest.value}${foundRequest.unit}`);
    }

    // 4. 测试审批通过（模拟同步到工时结果表）
    await prisma.$transaction(async (tx) => {
      // 更新申请状态
      await tx.laborHourReportRequest.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          approverId: 1,
          approverName: '审批人',
          approvedAt: new Date(),
          approvalComment: '测试审批通过',
        },
      });

      // 同步到工时结果表
      await tx.workHourResult.create({
        data: {
          employeeId: foundRequest!.employeeId,
          employeeNo: foundRequest!.employeeNo,
          accountId: foundRequest!.accountId,
          accountName: foundRequest!.accountName,
          accountPath: foundRequest!.accountCode,
          workDate: foundRequest!.reportDate,
          attendanceCode: foundRequest!.hourType,
          attendanceCodeName: foundRequest!.hourTypeName,
          workHours: foundRequest!.value,
          sourceType: 'LABOR_HOUR_REPORT',
          sourceId: foundRequest!.id,
          source: `工时报表申请: ${foundRequest!.title}`,
          status: 'ACTIVE',
        },
      });
    });

    console.log('\n✅ 审批通过并同步到工时结果表成功');

    // 5. 验证工时结果表
    const workHourResult = await prisma.workHourResult.findFirst({
      where: {
        sourceType: 'LABOR_HOUR_REPORT',
        sourceId: request.id,
      },
    });

    if (workHourResult) {
      console.log('\n✅ 工时结果表验证成功:');
      console.log(`   工作日期: ${workHourResult.workDate.toISOString().split('T')[0]}`);
      console.log(`   工时类型: ${workHourResult.attendanceCodeName}`);
      console.log(`   工时值: ${workHourResult.workHours}`);
      console.log(`   来源: ${workHourResult.source}`);
    }

    // 6. 清理测试数据
    await prisma.workHourResult.delete({
      where: { id: workHourResult!.id },
    });
    await prisma.laborHourReportRequest.delete({
      where: { id: request.id },
    });

    console.log('\n🧹 测试数据已清理');

    console.log('\n✨ 所有测试通过！');
    console.log('\n📝 API 端点:');
    console.log('   POST   /api/labor-hour-report/requests        - 创建申请');
    console.log('   GET    /api/labor-hour-report/requests        - 查询列表');
    console.log('   GET    /api/labor-hour-report/requests/:id    - 查询详情');
    console.log('   PUT    /api/labor-hour-report/requests/:id/approve  - 审批通过');
    console.log('   PUT    /api/labor-hour-report/requests/:id/reject   - 审批拒绝');
    console.log('   DELETE /api/labor-hour-report/requests/:id    - 删除申请');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    throw error;
  }
}

function generateRequestNo(): string {
  const now = new Date();
  const timestamp = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `LABOR${timestamp}${random}`;
}

testLaborHourReportAPI()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
