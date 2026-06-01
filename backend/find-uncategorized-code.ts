import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findUncategorizedCode() {
  console.log('=== 查找"未分类工时"对应的出勤代码 ===\n');

  try {
    // 1. 查询系统中所有出勤代码定义
    console.log('1. 查询所有出勤代码\n');

    const attendanceCodes = await prisma.$queryRaw`
      SELECT code, name, category
      FROM DefinitionAttendanceCode
      WHERE name LIKE '%未分类%' OR code LIKE '%UN%' OR category LIKE '%UNCATEGORIZED%'
    ` as any[];

    if (attendanceCodes.length > 0) {
      console.log(`找到 ${attendanceCodes.length} 个"未分类"相关的出勤代码：\n`);
      attendanceCodes.forEach((code) => {
        console.log(`  代码: ${code.code}, 名称: ${code.name}, 分类: ${code.category || 'N/A'}`);
      });
      console.log('');
    }

    // 2. 查询工时结果表中的所有唯一出勤代码
    console.log('2. 查询工时结果表中的所有出勤代码\n');

    const distinctCodes = await prisma.$queryRaw`
      SELECT DISTINCT attendanceCode, COUNT(*) as count
      FROM WorkHourResult
      GROUP BY attendanceCode
      ORDER BY count DESC
    ` as any[];

    console.log(`工时结果表中共有 ${distinctCodes.length} 个不同的出勤代码：\n`);
    distinctCodes.forEach((item) => {
      console.log(`  代码: ${item.attendanceCode}, 记录数: ${item.count}`);
    });
    console.log('');

    // 3. 查询员工202605001的工时结果，追溯sourceId
    console.log('3. 查询员工202605001的工时结果数据来源\n');

    const employeeResults = await prisma.$queryRaw`
      SELECT
        w.id,
        w.workDate,
        w.attendanceCode,
        w.sourceType,
        w.sourceId,
        w.source,
        e.employeeNo,
        e.name as employeeName
      FROM WorkHourResult w
      JOIN Employee e ON w.employeeId = e.id
      WHERE e.employeeNo = '202605001'
      ORDER BY w.workDate DESC
    ` as any[];

    console.log(`找到 ${employeeResults.length} 条工时结果记录：\n`);

    for (const result of employeeResults) {
      console.log(`记录ID: ${result.id}`);
      console.log(`  员工: ${result.employeeNo} - ${result.employeeName}`);
      console.log(`  工作日期: ${new Date(result.workDate).toISOString().substring(0, 10)}`);
      console.log(`  出勤代码: ${result.attendanceCode}`);
      console.log(`  来源类型: ${result.sourceType || 'NULL'}`);
      console.log(`  来源ID: ${result.sourceId}`);
      console.log(`  来源: ${result.source || 'NULL'}`);

      // 根据sourceType追溯数据源
      if (result.sourceType === 'PRODUCTION' || (!result.sourceType && result.sourceId)) {
        // 检查是否是Production记录
        const production = await prisma.$queryRaw`
          SELECT
            p.id,
            p.productionDate,
            p.productId,
            prod.name as productName,
            p.accountId,
            a.path as accountPath,
            p.attendanceCode
          FROM Production p
          LEFT JOIN Product prod ON p.productId = prod.id
          LEFT JOIN LaborAccount a ON p.accountId = a.id
          WHERE p.id = ${result.sourceId}
        ` as any[];

        if (production.length > 0) {
          console.log(`  ✅ 数据源: Production（产量记录）`);
          console.log(`     产量日期: ${new Date(production[0].productionDate).toISOString().substring(0, 10)}`);
          console.log(`     产品: ${production[0].productName || 'N/A'} (${production[0].productId})`);
          console.log(`     账户路径: ${production[0].accountPath || 'N/A'}`);
        }
      } else if (result.sourceType === 'WORK_HOUR_REPORT') {
        // 检查是否是工时汇报记录
        const report = await prisma.$queryRaw`
          SELECT
            r.id,
            r.reportDate,
            r.attendanceCode,
            r.hours,
            r.dataSourceId,
            ds.code as dataSourceCode,
            ds.name as dataSourceName
          FROM WorkHourReport r
          LEFT JOIN DataSource ds ON r.dataSourceId = ds.id
          WHERE r.id = ${result.sourceId}
        ` as any[];

        if (report.length > 0) {
          console.log(`  ✅ 数据源: WorkHourReport（工时汇报）`);
          console.log(`     汇报日期: ${new Date(report[0].reportDate).toISOString().substring(0, 10)}`);
          console.log(`     出勤代码: ${report[0].attendanceCode}`);
          console.log(`     工时: ${report[0].hours}`);
          console.log(`     数据源: ${report[0].dataSourceName || 'N/A'} (${report[0].dataSourceCode || 'N/A'})`);
        }
      } else if (result.sourceType === 'EARNED_HOURS_ALLOCATION') {
        console.log(`  ✅ 数据源: EarnedHoursAllocation（挣得工时分摊）`);
      }

      console.log('');
    }

    // 4. 查找所有可能被称为"未分类"的工时数据
    console.log('4. 查找所有包含"未分类"关键词的出勤代码及数据来源\n');

    const uncategorizedResults = await prisma.$queryRaw`
      SELECT DISTINCT
        w.attendanceCode,
        w.sourceType,
        MIN(w.sourceId) as sampleSourceId,
        COUNT(*) as count
      FROM WorkHourResult w
      WHERE w.attendanceCode LIKE '%UN%'
         OR w.attendanceCode LIKE '%A99%'
         OR w.attendanceCode LIKE '%未%'
      GROUP BY w.attendanceCode, w.sourceType
    ` as any[];

    if (uncategorizedResults.length > 0) {
      console.log(`找到 ${uncategorizedResults.length} 组可能的"未分类"工时记录：\n`);
      uncategorizedResults.forEach((item) => {
        console.log(`  出勤代码: ${item.attendanceCode}`);
        console.log(`  来源类型: ${item.sourceType || 'NULL'}`);
        console.log(`  示例ID: ${item.sampleSourceId}`);
        console.log(`  记录数: ${item.count}`);
        console.log('');
      });
    } else {
      console.log('未找到包含"未分类"关键词的记录\n');
    }

  } catch (error) {
    console.error('❌ 查询失败:', error);
    throw error;
  }

  await prisma.$disconnect();
}

findUncategorizedCode()
  .then(() => {
    console.log('\n查询完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('查询失败:', error);
    process.exit(1);
  });
