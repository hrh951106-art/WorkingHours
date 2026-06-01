import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseUncategorizedHours() {
  const employeeNo = '202605001';
  console.log(`=== 诊断员工 ${employeeNo} 的未分类工时数据来源 ===\n`);

  try {
    // 1. 查找员工信息
    console.log('1. 查���员工信息\n');
    const employee = await prisma.employee.findFirst({
      where: { employeeNo },
      select: { id: true, name: true, employeeNo: true },
    });

    if (!employee) {
      console.log('❌ 未找到该员工');
      await prisma.$disconnect();
      return;
    }

    console.log(`员工ID: ${employee.id}`);
    console.log(`员工编号: ${employee.employeeNo}`);
    console.log(`姓名: ${employee.name}`);
    console.log('');

    // 2. 查询工时结果表中的未分类工时记录
    console.log('2. 查询工时结果表中的记录\n');

    const workHourResults = await prisma.workHourResult.findMany({
      where: {
        employeeId: employee.id,
      },
      orderBy: {
        workDate: 'desc',
      },
      take: 20,
    });

    console.log(`找到 ${workHourResults.length} 条工时结果记录\n`);

    if (workHourResults.length === 0) {
      console.log('❌ 未找到工时结果记录');
      await prisma.$disconnect();
      return;
    }

    // 3. 查找"未分类工时"相关的记录
    console.log('3. 查找未分类工时记录\n');

    // 显示所有工时结果记录，让用户选择哪些是"未分类"的
    console.log('所有工时结果记录：\n');

    workHourResults.forEach((result, index) => {
      console.log(`记录 ${index + 1}:`);
      console.log(`  工作日期: ${result.workDate.toISOString().substring(0, 10)}`);
      console.log(`  出勤代码: ${result.attendanceCode}`);
      console.log(`  工时: ${result.hours}`);
      console.log(`  来源表: ${result.sourceTable || 'NULL'}`);
      console.log(`  来源ID: ${result.sourceId || 'NULL'}`);
      console.log('');
    });

    // 假设包含特定关键词的代码是未分类工时
    const uncategorizedResults = workHourResults.filter((result) =>
      result.attendanceCode.includes('UN') ||
      result.attendanceCode.includes('未') ||
      result.attendanceCode.includes('A99')
    );

    console.log(`可能的未分类工时记录: ${uncategorizedResults.length} 条\n`);

    if (uncategorizedResults.length === 0) {
      console.log('❌ 未找到明显的未分类工时记录');
      console.log('请在上方记录中查找，所有记录都已显示\n');
      await prisma.$disconnect();
      return;
    }

    // 4. 分析未分类工时的数据来源
    console.log('4. 未分类工时记录详情\n');

    uncategorizedResults.forEach((result, index) => {
      console.log(`记录 ${index + 1}:`);
      console.log(`  工作日期: ${result.workDate.toISOString().substring(0, 10)}`);
      console.log(`  出勤代码: ${result.attendanceCode}`);
      console.log(`  工时: ${result.hours}`);
      console.log(`  来源表: ${result.sourceTable || 'NULL'}`);
      console.log(`  来源ID: ${result.sourceId || 'NULL'}`);
      console.log(`  创建时间: ${result.createdAt.toISOString()}`);
      console.log('');
    });

    // 5. 追溯数据源
    console.log('5. 追溯数据源\n');

    for (const result of uncategorizedResults) {
      if (result.sourceTable && result.sourceId) {
        console.log(`来源: ${result.sourceTable}, ID: ${result.sourceId}`);

        if (result.sourceTable === 'Production') {
          const production = await prisma.production.findUnique({
            where: { id: result.sourceId },
            select: {
              id: true,
              productionDate: true,
              productId: true,
              accountId: true,
              attendanceCode: true,
            },
          });

          if (production) {
            console.log(`  这是从产量记录来的`);
            console.log(`  产量日期: ${production.productionDate.toISOString().substring(0, 10)}`);
            console.log(`  产品ID: ${production.productId}`);
            console.log(`  账户ID: ${production.accountId}`);
          }
        } else if (result.sourceTable === 'WorkHourReport') {
          const report = await prisma.workHourReport.findUnique({
            where: { id: result.sourceId },
            select: {
              id: true,
              reportDate: true,
              attendanceCode: true,
              hours: true,
              dataSourceId: true,
            },
          });

          if (report) {
            console.log(`  这是从工时汇报记录来的`);
            console.log(`  汇报日期: ${report.reportDate.toISOString().substring(0, 10)}`);
            console.log(`  出勤代码: ${report.attendanceCode}`);
            console.log(`  工时: ${report.hours}`);
            console.log(`  数据源ID: ${report.dataSourceId || 'N/A'}`);

            if (report.dataSourceId) {
              const dataSource = await prisma.dataSource.findUnique({
                where: { id: report.dataSourceId },
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              });

              if (dataSource) {
                console.log(`  数据源代码: ${dataSource.code}`);
                console.log(`  数据源名称: ${dataSource.name}`);
              }
            }
          }
        } else if (result.sourceTable === 'EarnedHoursAllocation') {
          const allocation = await prisma.earnedHoursAllocationResult.findUnique({
            where: { id: result.sourceId },
            select: {
              id: true,
              allocationDate: result.workDate,
              configId: true,
              sourceAttendanceCode: true,
              targetAttendanceCode: true,
              allocatedHours: true,
            },
          });

          if (allocation) {
            console.log(`  这是从挣得工时分摊结果来的`);
            console.log(`  分摊日期: ${allocation.allocationDate?.toISOString().substring(0, 10)}`);
            console.log(`  配置ID: ${allocation.configId}`);
            console.log(`  源工时代码: ${allocation.sourceAttendanceCode}`);
            console.log(`  目标工时代码: ${allocation.targetAttendanceCode}`);
          }
        }

        console.log('');
      } else {
        console.log('没有明确的来源信息\n');
      }
    }

  } catch (error) {
    console.error('❌ 诊断失败:', error);
    throw error;
  }

  await prisma.$disconnect();
}

diagnoseUncategorizedHours()
  .then(() => {
    console.log('\n诊断完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('诊断失败:', error);
    process.exit(1);
  });
