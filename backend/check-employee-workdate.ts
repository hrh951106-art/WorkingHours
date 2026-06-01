import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEmployeeWorkDate() {
  const employeeNo = '202605001';
  console.log(`=== 查询员工 ${employeeNo} 的工时数据 ===\n`);

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

    // 2. 查询工时结果表 - 使用原始SQL查看workDate的实际值
    console.log('=== 查询工时结果表（原始数据）===\n');

    const rawResults = await prisma.$queryRaw`
      SELECT
        id,
        workDate,
        attendanceCode,
        workHours,
        sourceType,
        sourceId,
        source
      FROM WorkHourResult
      WHERE employeeId = ${employee.id}
      LIMIT 10
    ` as any[];

    console.log(`找到 ${rawResults.length} 条记录：\n`);

    rawResults.forEach((result) => {
      console.log(`ID: ${result.id}`);
      console.log(`  workDate (原始): ${result.workDate}`);
      console.log(`  workDate (类型): ${typeof result.workDate}`);
      if (result.workDate) {
        const date = new Date(result.workDate);
        console.log(`  workDate (解析): ${date.toString()}`);
        console.log(`  workDate (ISO): ${date.toISOString()}`);
      }
      console.log(`  出勤代码: ${result.attendanceCode}`);
      console.log(`  工时: ${result.workHours}`);
      console.log(`  来源: ${result.sourceType} - ${result.source}`);
      console.log('');
    });

    // 3. 使用Prisma查询
    console.log('=== 使用Prisma查询 ===\n');

    const prismaResults = await prisma.workHourResult.findMany({
      where: {
        employeeId: employee.id,
      },
      orderBy: {
        workDate: 'desc',
      },
      take: 10,
    });

    console.log(`找到 ${prismaResults.length} 条记录：\n`);

    prismaResults.forEach((result) => {
      console.log(`ID: ${result.id}`);
      console.log(`  workDate: ${result.workDate}`);
      if (result.workDate) {
        console.log(`  workDate (ISO): ${result.workDate.toISOString()}`);
      }
      console.log(`  出勤代码: ${result.attendanceCode}`);
      console.log(`  工时: ${result.workHours}`);
      console.log(`  来源类型: ${result.sourceType}`);
      console.log(`  来源: ${result.source}`);
      console.log('');
    });

    // 4. 查询5月10日和5月11日的工时汇报请求数据
    console.log('=== 查询5月10日和5月11日的工时汇报请求 ===\n');

    const reportRequests = await prisma.$queryRaw`
      SELECT
        r.id,
        r.reportDate,
        r.workHourType,
        r.employeeId,
        e.employeeNo,
        e.name as employeeName,
        COUNT(re.employeeId) as employeeCount
      FROM LaborHourReportRequest r
      LEFT JOIN Employee e ON r.employeeId = e.id
      LEFT JOIN LaborHourReportEmployee re ON re.reportRequestId = r.id
      WHERE DATE(r.reportDate) IN ('2026-05-10', '2026-05-11')
        AND (e.employeeNo = ${employeeNo} OR re.employeeId = ${employee.id})
      GROUP BY r.id
      ORDER BY r.reportDate
    ` as any[];

    if (reportRequests.length === 0) {
      console.log('❌ 未找到5月10日和5月11日的工时汇报请求');
    } else {
      console.log(`找到 ${reportRequests.length} 条工时汇报请求：\n`);

      reportRequests.forEach((req) => {
        const dateStr = new Date(req.reportDate).toISOString().substring(0, 10);
        console.log(`汇报请求ID: ${req.id}`);
        console.log(`  汇报日期: ${dateStr}`);
        console.log(`  汇报员工: ${req.employeeName || 'N/A'} (${req.employeeNo || 'N/A'})`);
        console.log(`  工时类型: ${req.workHourType || 'N/A'}`);
        console.log(`  包含员工数: ${req.employeeCount}`);
        console.log('');
      });

      // 查询这些请求中包含的具体员工汇报记录
      console.log('=== 查询具体的员工汇报记录 ===\n');

      const reportEmployees = await prisma.$queryRaw`
        SELECT
          re.id,
          re.reportRequestId,
          re.employeeId,
          e.employeeNo,
          e.name as employeeName,
          re.attendanceCode,
          re.hours,
          re.dataSourceId,
          ds.code as dataSourceCode,
          ds.name as dataSourceName
        FROM LaborHourReportEmployee re
        LEFT JOIN Employee e ON re.employeeId = e.id
        LEFT JOIN DataSource ds ON re.dataSourceId = ds.id
        WHERE re.reportRequestId IN (${reportRequests.map((r) => r.id).join(',')})
          AND re.employeeId = ${employee.id}
        ORDER BY re.reportRequestId
      ` as any[];

      if (reportEmployees.length === 0) {
        console.log('❌ 未找到该员工在这些请求中的汇报记录');
      } else {
        console.log(`找到 ${reportEmployees.length} 条该员工的汇报记录：\n`);

        reportEmployees.forEach((record) => {
          console.log(`汇报ID: ${record.id}`);
          console.log(`  员工: ${record.employeeName} (${record.employeeNo})`);
          console.log(`  出勤代码: ${record.attendanceCode || 'N/A'}`);
          console.log(`  工时: ${record.hours || 0}`);
          console.log(`  数据源: ${record.dataSourceName || 'N/A'} (${record.dataSourceCode || 'N/A'})`);
          console.log('');
        });
      }
    }

  } catch (error) {
    console.error('❌ 查询失败:', error);
    throw error;
  }

  await prisma.$disconnect();
}

checkEmployeeWorkDate()
  .then(() => {
    console.log('\n查询完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('查询失败:', error);
    process.exit(1);
  });
