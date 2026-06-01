import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 查询表单LABOR202606011241017902生成的工时结果表数据
 */
async function queryFormWorkHourResults() {
  const formNo = 'LABOR202606011241017902';

  console.log('=== 查询表单工时结果数据 ===\n');
  console.log(`表单号: ${formNo}\n`);

  try {
    // 1. 查找该表单生成的所有工时结果
    const workHourResults = await prisma.workHourResult.findMany({
      where: {
        sourceBatchId: formNo,
      },
      orderBy: [
        { employeeNo: 'asc' },
      ],
    });

    console.log(`找到 ${workHourResults.length} 条工时记录\n`);

    if (workHourResults.length === 0) {
      console.log('ℹ️ 该表单没有生成工时结果记录');

      // 尝试检查该表单号是否在其他地方
      console.log('\n检查表单是否存在...');

      // 可以添加其他检查逻辑
      await prisma.$disconnect();
      return;
    }

    // 2. 显示所有字段信息
    console.log('=== 工时结果记录（所有字段）===\n');

    workHourResults.forEach((whr, index) => {
      console.log(`记录 ${index + 1}:`);
      console.log(`  id: ${whr.id}`);
      console.log(`  employeeNo: ${whr.employeeNo}`);
      console.log(`  employeeId: ${whr.employeeId}`);
      console.log(`  workDate: ${whr.workDate?.toISOString().substring(0, 10) || 'NULL'}`);
      console.log(`  calcDate: ${whr.calcDate?.toISOString().substring(0, 10) || 'NULL'}`);
      console.log(`  shiftId: ${whr.shiftId || 'NULL'}`);
      console.log(`  shiftName: ${whr.shiftName || 'NULL'}`);
      console.log(`  attendanceCodeId: ${whr.attendanceCodeId || 'NULL'}`);
      console.log(`  attendanceCode: ${whr.attendanceCode || 'NULL'}`);
      console.log(`  calcAttendanceCode: ${whr.calcAttendanceCode || 'NULL'}`);
      console.log(`  attendanceCodeName: ${whr.attendanceCodeName || 'NULL'}`);
      console.log(`  workHours: ${whr.workHours}`);
      console.log(`  amount: ${whr.amount || 'NULL'}`);
      console.log(`  calculateAmount: ${whr.calculateAmount || 'NULL'}`);
      console.log(`  accountId: ${whr.accountId || 'NULL'}`);
      console.log(`  accountName: ${whr.accountName || 'NULL'}`);
      console.log(`  accountPath: ${whr.accountPath || 'NULL'}`);
      console.log(`  sourceType: ${whr.sourceType || 'NULL'}`);
      console.log(`  sourceId: ${whr.sourceId || 'NULL'}`);
      console.log(`  source: ${whr.source || 'NULL'}`);
      console.log(`  sourceBatchId: ${whr.sourceBatchId || 'NULL'}`);
      console.log(`  attendancePunchPair: ${whr.attendancePunchPair || 'NULL'}`);
      console.log(`  customFields: ${whr.customFields || 'NULL'}`);
      console.log(`  orgId: ${whr.orgId || 'NULL'}`);
      console.log(`  definitionAttendanceCodeId: ${whr.definitionAttendanceCodeId || 'NULL'}`);
      console.log(`  definitionAttendanceCodeStr: ${whr.definitionAttendanceCodeStr || 'NULL'}`);
      console.log(`  startTime: ${whr.startTime?.toISOString().substring(0, 19) || 'NULL'}`);
      console.log(`  endTime: ${whr.endTime?.toISOString().substring(0, 19) || 'NULL'}`);
      console.log(`  status: ${whr.status}`);
      console.log(`  createdAt: ${whr.createdAt.toISOString().substring(0, 19)}`);
      console.log(`  updatedAt: ${whr.updatedAt.toISOString().substring(0, 19)}`);
      console.log('');
    });

    // 3. 汇总信息
    console.log('=== 汇总信息 ===\n');
    console.log(`总记录数: ${workHourResults.length}`);
    console.log(`总工时: ${workHourResults.reduce((sum, whr) => sum + (whr.workHours || 0), 0)} 小时`);

    const employees = [...new Set(workHourResults.map(whr => whr.employeeNo))];
    console.log(`涉及员工数: ${employees.length}`);
    console.log(`员工列表: ${employees.join(', ')}`);

  } catch (error) {
    console.error('❌ 查询失败:', error);
    throw error;
  }

  await prisma.$disconnect();
}

queryFormWorkHourResults()
  .then(() => {
    console.log('\n查询完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('查询失败:', error);
    process.exit(1);
  });
