import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEmployeeMayDates() {
  const employeeNo = '202605001';
  console.log(`=== 查询员工 ${employeeNo} 在5月10日和5月11日的工时结果数据 ===\n`);

  try {
    // 1. 查询员工信息
    const employee = await prisma.employee.findFirst({
      where: { employeeNo },
      select: { id: true, name: true, employeeNo: true },
    });

    if (!employee) {
      console.log('❌ 未找到该员工');
      await prisma.$disconnect();
      return;
    }

    console.log(`员工: ${employee.name} (${employee.employeeNo})`);
    console.log('');

    // 2. 查询5月10日和5月11日的工时结果
    console.log('查询日期: 2026-05-10 和 2026-05-11\n');

    const workHourResults = await prisma.$queryRaw`
      SELECT
        w.id,
        w.workDate,
        w.attendanceCode,
        w.calcAttendanceCode,
        w.attendanceCodeName,
        w.workHours,
        w.amount,
        w.sourceType,
        w.sourceId,
        w.source,
        w.sourceBatchId,
        w.accountId,
        w.accountPath,
        w.shiftId,
        w.shiftName,
        w.startTime,
        w.endTime
      FROM WorkHourResult w
      WHERE w.employeeId = ${employee.id}
        AND DATE(w.workDate) IN ('2026-05-10', '2026-05-11')
      ORDER BY w.workDate, w.attendanceCode
    ` as any[];

    if (workHourResults.length === 0) {
      console.log('❌ 未找到5月10日和5月11日的工时结果记录');
      await prisma.$disconnect();
      return;
    }

    console.log(`找到 ${workHourResults.length} 条工时结果记录：\n`);

    // 按日期分组
    const resultsByDate: { [key: string]: any[] } = {};
    workHourResults.forEach((result) => {
      const dateKey = new Date(result.workDate).toISOString().substring(0, 10);
      if (!resultsByDate[dateKey]) {
        resultsByDate[dateKey] = [];
      }
      resultsByDate[dateKey].push(result);
    });

    // 显示每日记录
    for (const dateKey in resultsByDate) {
      console.log(`=== ${dateKey} ===`);
      console.log('');

      const dayResults = resultsByDate[dateKey];
      let totalHours = 0;

      dayResults.forEach((result, index) => {
        console.log(`记录 ${index + 1}:`);
        console.log(`  ID: ${result.id}`);
        console.log(`  工作日期: ${new Date(result.workDate).toISOString().substring(0, 10)}`);
        console.log(`  出勤代码: ${result.attendanceCode || 'NULL'}`);
        console.log(`  计算代码: ${result.calcAttendanceCode || 'NULL'}`);
        console.log(`  代码名称: ${result.attendanceCodeName || 'N/A'}`);
        console.log(`  工时: ${result.workHours || 0}`);
        console.log(`  金额: ${result.amount || 0}`);
        console.log(`  来源类型: ${result.sourceType || 'NULL'}`);
        console.log(`  来源ID: ${result.sourceId || 'NULL'}`);
        console.log(`  来源: ${result.source || 'N/A'}`);
        console.log(`  批次ID: ${result.sourceBatchId || 'N/A'}`);
        console.log(`  账户路径: ${result.accountPath || 'N/A'}`);
        console.log(`  班次: ${result.shiftName || 'N/A'}`);
        console.log(`  开始时间: ${result.startTime ? new Date(result.startTime).toISOString().substring(11, 19) : 'N/A'}`);
        console.log(`  结束时间: ${result.endTime ? new Date(result.endTime).toISOString().substring(11, 19) : 'N/A'}`);

        totalHours += result.workHours || 0;
        console.log('');
      });

      console.log(`当日总工时: ${totalHours}`);
      console.log('');
    }

    // 3. 追溯数据来源详情
    console.log('=== 追溯数据来源详情 ===\n');

    for (const result of workHourResults) {
      if (result.sourceType && result.sourceId) {
        console.log(`记录ID: ${result.id}, 日期: ${new Date(result.workDate).toISOString().substring(0, 10)}`);
        console.log(`来源类型: ${result.sourceType}, 来源ID: ${result.sourceId}`);

        if (result.sourceType === 'LABOR_HOUR_REPORT') {
          // 查询工时报表申请详情
          const reports = await prisma.$queryRaw`
            SELECT
              r.id,
              r.reportDate,
              r.employeeId,
              e.employeeNo,
              e.name as employeeName,
              r.attendanceCode,
              r.hours,
              r.workHourType,
              r.dataSourceId,
              ds.code as dataSourceCode,
              ds.name as dataSourceName
            FROM WorkHourReport r
            LEFT JOIN Employee e ON r.employeeId = e.id
            LEFT JOIN DataSource ds ON r.dataSourceId = ds.id
            WHERE r.id = ${result.sourceId}
          ` as any[];

          if (reports.length > 0) {
            const report = reports[0];
            console.log(`  ✅ 数据源: WorkHourReport（工时汇报）`);
            console.log(`     汇报员工: ${report.employeeName} (${report.employeeNo})`);
            console.log(`     汇报日期: ${new Date(report.reportDate).toISOString().substring(0, 10)}`);
            console.log(`     出勤代码: ${report.attendanceCode || 'N/A'}`);
            console.log(`     工时: ${report.hours || 0}`);
            console.log(`     工时类型: ${report.workHourType || 'N/A'}`);
            console.log(`     数据源: ${report.dataSourceName || 'N/A'} (${report.dataSourceCode || 'N/A'})`);
          }
        } else if (result.sourceType === 'PRODUCTION') {
          // 查询产量记录详情
          const productions = await prisma.$queryRaw`
            SELECT
              p.id,
              p.productionDate,
              p.productId,
              prod.name as productName,
              p.accountId,
              a.path as accountPath,
              a.namePath as accountNamePath,
              p.quantity,
              p.standardHours,
              p.attendanceCode
            FROM Production p
            LEFT JOIN Product prod ON p.productId = prod.id
            LEFT JOIN LaborAccount a ON p.accountId = a.id
            WHERE p.id = ${result.sourceId}
          ` as any[];

          if (productions.length > 0) {
            const prod = productions[0];
            console.log(`  ✅ 数据源: Production（产量记录）`);
            console.log(`     产量日期: ${new Date(prod.productionDate).toISOString().substring(0, 10)}`);
            console.log(`     产品: ${prod.productName || 'N/A'} (${prod.productId})`);
            console.log(`     账户: ${prod.accountNamePath || 'N/A'}`);
            console.log(`     数量: ${prod.quantity || 0}`);
            console.log(`     标准工时: ${prod.standardHours || 0}`);
          }
        } else if (result.sourceType === 'EARNED_HOURS_ALLOCATION') {
          // 查询挣得工时分摊结果
          const allocations = await prisma.$queryRaw`
            SELECT
              r.id,
              r.allocationDate,
              r.configId,
              cfg.name as configName,
              r.sourceAttendanceCode,
              r.targetAttendanceCode,
              r.allocatedHours,
              r.productionId
            FROM EarnedHoursAllocationResult r
            LEFT JOIN EarnedHoursAllocationConfig cfg ON r.configId = cfg.id
            WHERE r.id = ${result.sourceId}
          ` as any[];

          if (allocations.length > 0) {
            const alloc = allocations[0];
            console.log(`  ✅ 数据源: EarnedHoursAllocation（挣得工时分摊）`);
            console.log(`     分摊日期: ${new Date(alloc.allocationDate).toISOString().substring(0, 10)}`);
            console.log(`     配置: ${alloc.configName || 'N/A'} (${alloc.configId})`);
            console.log(`     源代码: ${alloc.sourceAttendanceCode}`);
            console.log(`     目标代码: ${alloc.targetAttendanceCode}`);
            console.log(`     分摊工时: ${alloc.allocatedHours || 0}`);
          }
        } else {
          console.log(`  ⚠️ 未知来源类型: ${result.sourceType}`);
        }

        console.log('');
      }
    }

  } catch (error) {
    console.error('❌ 查询失败:', error);
    throw error;
  }

  await prisma.$disconnect();
}

checkEmployeeMayDates()
  .then(() => {
    console.log('\n查询完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('查询失败:', error);
    process.exit(1);
  });
