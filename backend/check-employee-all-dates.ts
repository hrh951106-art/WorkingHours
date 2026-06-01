import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEmployeeAllDates() {
  const employeeNo = '202605001';
  console.log(`=== 查询员工 ${employeeNo} 所有工时结果的日期分布 ===\n`);

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

    // 2. 查询所有工时结果记录的日期
    const dateResults = await prisma.$queryRaw`
      SELECT
        DATE(w.workDate) as workDate,
        COUNT(*) as recordCount,
        SUM(w.workHours) as totalHours
      FROM WorkHourResult w
      WHERE w.employeeId = ${employee.id}
      GROUP BY DATE(w.workDate)
      ORDER BY DATE(w.workDate) DESC
    ` as any[];

    if (dateResults.length === 0) {
      console.log('❌ 该员工没有任何工时结果记录');
      await prisma.$disconnect();
      return;
    }

    console.log(`找到 ${dateResults.length} 个工作日期：\n`);

    dateResults.forEach((item) => {
      const dateStr = new Date(item.workDate).toISOString().substring(0, 10);
      console.log(`日期: ${dateStr}`);
      console.log(`  记录数: ${item.recordCount}`);
      console.log(`  总工时: ${item.totalHours || 0}`);
      console.log('');
    });

    // 3. 查询5月份的所有记录
    console.log('=== 查询5月份的所有工时结果记录 ===\n');

    const mayResults = await prisma.$queryRaw`
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
        w.accountPath
      FROM WorkHourResult w
      WHERE w.employeeId = ${employee.id}
        AND strftime('%Y-%m', w.workDate) = '2026-05'
      ORDER BY w.workDate DESC, w.attendanceCode
    ` as any[];

    if (mayResults.length === 0) {
      console.log('❌ 未找到5月份的工时结果记录');
    } else {
      console.log(`找到 ${mayResults.length} 条5月份的工时结果记录：\n`);

      // 按日期分组显示
      const resultsByDate: { [key: string]: any[] } = {};
      mayResults.forEach((result) => {
        const dateKey = new Date(result.workDate).toISOString().substring(0, 10);
        if (!resultsByDate[dateKey]) {
          resultsByDate[dateKey] = [];
        }
        resultsByDate[dateKey].push(result);
      });

      for (const dateKey in resultsByDate) {
        console.log(`--- ${dateKey} ---`);
        const dayResults = resultsByDate[dateKey];
        const totalHours = dayResults.reduce((sum, r) => sum + (r.workHours || 0), 0);

        dayResults.forEach((result) => {
          console.log(`  出勤代码: ${result.attendanceCode || 'NULL'}, ` +
                      `工时: ${result.workHours || 0}, ` +
                      `来源: ${result.sourceType || 'N/A'}`);
        });
        console.log(`  当日总工时: ${totalHours}`);
        console.log('');
      }
    }

    // 4. 查询5月10日和5月11日的原始工时汇报数据
    console.log('=== 查询5月10日和5月11日的工时汇报数据 ===\n');

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
      WHERE e.employeeNo = ${employeeNo}
        AND DATE(r.reportDate) IN ('2026-05-10', '2026-05-11')
      ORDER BY r.reportDate
    ` as any[];

    if (reports.length === 0) {
      console.log('❌ 未找到5月10日和5月11日的工时汇报记录');
    } else {
      console.log(`找到 ${reports.length} 条工时汇报记录：\n`);

      reports.forEach((report) => {
        const dateStr = new Date(report.reportDate).toISOString().substring(0, 10);
        console.log(`汇报日期: ${dateStr}`);
        console.log(`  员工: ${report.employeeName} (${report.employeeNo})`);
        console.log(`  出勤代码: ${report.attendanceCode || 'N/A'}`);
        console.log(`  工时: ${report.hours || 0}`);
        console.log(`  工时类型: ${report.workHourType || 'N/A'}`);
        console.log(`  数据源: ${report.dataSourceName || 'N/A'} (${report.dataSourceCode || 'N/A'})`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ 查询失败:', error);
    throw error;
  }

  await prisma.$disconnect();
}

checkEmployeeAllDates()
  .then(() => {
    console.log('\n查询完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('查询失败:', error);
    process.exit(1);
  });
