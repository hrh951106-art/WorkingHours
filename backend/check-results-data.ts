import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function toLocalTime(date: Date | null): string {
  if (!date) return 'null';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function main() {
  console.log('=== 查询 CalcResult 与 WorkHourResult 数据 ===\n');

  // 1. 查询 CalcResult ���据
  console.log('1. CalcResult（计算结果表）数据:');
  const calcResultCount = await prisma.calcResult.count();
  console.log(`  总记录数: ${calcResultCount}`);

  if (calcResultCount > 0) {
    const calcResults = await prisma.calcResult.findMany({
      include: {
        calculationAttendanceCode: {
          select: {
            code: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { calcDate: 'desc' },
      // 移除限制，查询所有数据
    });

    console.log(`  显示全部 ${calcResults.length} 条记录:\n`);
    calcResults.forEach((result, idx) => {
      const calcDate = toLocalTime(result.calcDate).split(' ')[0];
      const punchInTime = toLocalTime(result.punchInTime);
      const punchOutTime = toLocalTime(result.punchOutTime);

      console.log(`  记录${idx + 1} (ID: ${result.id}):`);
      console.log(`    员工: ${result.employeeNo}`);
      console.log(`    日期: ${calcDate}`);
      console.log(`    班次: ${result.shiftName || '-'}`);
      console.log(`    出勤代码: ${result.calculationAttendanceCode?.name || '-'} (${result.calculationAttendanceCode?.code || '-'}) [${result.calculationAttendanceCode?.type || '-'}]`);
      console.log(`    时间: ${punchInTime} ~ ${punchOutTime}`);
      console.log(`    标准工时: ${result.standardHours}h`);
      console.log(`    实际工时: ${result.actualHours}h`);
      console.log(`    加班工时: ${result.overtimeHours}h`);
      console.log(`    金额: ¥${result.amount.toFixed(2)}`);
      console.log(`    账户: ${result.accountName || '-'}`);
      console.log(`    状态: ${result.status}`);
      console.log('');
    });
  }

  // 2. 查询 WorkHourResult 数据
  console.log('2. WorkHourResult（工时结果表）数据:');
  const workHourResultCount = await prisma.workHourResult.count();
  console.log(`  总记录数: ${workHourResultCount}`);

  if (workHourResultCount > 0) {
    const workHourResults = await prisma.workHourResult.findMany({
      include: {
        definitionAttendanceCode: {
          select: {
            code: true,
            name: true,
          },
        },
      },
      orderBy: { calcDate: 'desc' },
      // 移除限制，查询所有数据
    });

    console.log(`  显示全部 ${workHourResults.length} 条记录:\n`);
    workHourResults.forEach((result, idx) => {
      const calcDate = toLocalTime(result.calcDate).split(' ')[0];
      const startTime = toLocalTime(result.startTime);
      const endTime = toLocalTime(result.endTime);

      console.log(`  记录${idx + 1} (ID: ${result.id}):`);
      console.log(`    员工: ${result.employeeNo}`);
      console.log(`    日期: ${calcDate}`);
      console.log(`    班次: ${result.shiftName || '-'}`);
      console.log(`    定义出勤代码: ${result.definitionAttendanceCode?.name || '-'} (${result.definitionAttendanceCode?.code || '-'})`);
      console.log(`    计算出勤代码: ${result.calcAttendanceCode || '-'}`);
      console.log(`    时间: ${startTime} ~ ${endTime}`);
      console.log(`    工时: ${result.workHours}h`);
      console.log(`    金额: ¥${result.amount.toFixed(2)}`);
      console.log(`    账户: ${result.accountName || '-'}`);
      console.log(`    来源: ${result.sourceType} (${result.source})`);
      console.log(`    状态: ${result.status}`);
      console.log(`    批次ID: ${result.sourceBatchId || '-'}`);
      console.log('');
    });
  }

  // 3. 统计汇总
  console.log('3. 数据汇总:');

  // 按日期统计 CalcResult
  if (calcResultCount > 0) {
    const calcByDate = await prisma.$queryRaw`
      SELECT
        DATE(calcDate) as date,
        COUNT(*) as count,
        SUM(actualHours) as totalHours,
        SUM(amount) as totalAmount
      FROM CalcResult
      GROUP BY DATE(calcDate)
      ORDER BY date DESC
    `;

    console.log('  CalcResult 按日期统计:');
    (calcByDate as any[]).forEach((stat) => {
      console.log(`    ${stat.date}: ${stat.count}条, ${stat.totalHours?.toFixed(2)}h, ¥${stat.totalAmount?.toFixed(2)}`);
    });
  }

  // 按日期统计 WorkHourResult
  if (workHourResultCount > 0) {
    const workHourByDate = await prisma.$queryRaw`
      SELECT
        DATE(calcDate) as date,
        COUNT(*) as count,
        SUM(workHours) as totalHours,
        SUM(amount) as totalAmount
      FROM WorkHourResult
      GROUP BY DATE(calcDate)
      ORDER BY date DESC
    `;

    console.log('\n  WorkHourResult 按日期统计:');
    (workHourByDate as any[]).forEach((stat) => {
      console.log(`    ${stat.date}: ${stat.count}条, ${stat.totalHours?.toFixed(2)}h, ¥${stat.totalAmount?.toFixed(2)}`);
    });
  }

  // 4. 按出勤代码统计
  console.log('\n4. 出勤代码统计:');

  if (calcResultCount > 0) {
    const calcByCode = await prisma.$queryRaw`
      SELECT
        c.code,
        c.name,
        c.type,
        COUNT(*) as count,
        SUM(cr.actualHours) as totalHours,
        SUM(cr.amount) as totalAmount
      FROM CalcResult cr
      LEFT JOIN CalculationAttendanceCode c ON cr.calculationAttendanceCodeId = c.id
      GROUP BY c.code, c.name, c.type
      ORDER BY count DESC
    `;

    console.log('  CalcResult 按计算出勤代码统计:');
    (calcByCode as any[]).forEach((stat) => {
      console.log(`    [${stat.type}] ${stat.name} (${stat.code}): ${stat.count}条, ${stat.totalHours?.toFixed(2)}h, ¥${stat.totalAmount?.toFixed(2)}`);
    });
  }

  if (workHourResultCount > 0) {
    const workHourByCode = await prisma.$queryRaw`
      SELECT
        d.code,
        d.name,
        COUNT(*) as count,
        SUM(wr.workHours) as totalHours,
        SUM(wr.amount) as totalAmount
      FROM WorkHourResult wr
      LEFT JOIN DefinitionAttendanceCode d ON wr.definitionAttendanceCodeId = d.id
      GROUP BY d.code, d.name
      ORDER BY count DESC
    `;

    console.log('\n  WorkHourResult 按定义出勤代码统计:');
    (workHourByCode as any[]).forEach((stat) => {
      console.log(`    ${stat.name} (${stat.code}): ${stat.count}条, ${stat.totalHours?.toFixed(2)}h, ¥${stat.totalAmount?.toFixed(2)}`);
    });
  }
}

main()
  .then(() => console.log('\n查询完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
