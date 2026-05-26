import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function queryWorkHourResultDetails() {
  console.log('开始查询 WorkHourResult 数据明细...\n');

  try {
    // 查询所有工时结果数据
    const workHourResults = await prisma.workHourResult.findMany({
      orderBy: [
        { calcDate: 'desc' },
        { employeeNo: 'asc' },
      ],
    });

    console.log(`总共找到 ${workHourResults.length} 条记录\n`);

    // 打印表头
    console.log('======================================================================================');
    console.log('ID\t\t员工编号\t员工姓名\t日期\t\t\t班次\t\t出勤代码\t\t工时\t\t金额\t\t账户\t\t\t来源\t\t状态');
    console.log('======================================================================================');

    // 打印每条记录
    workHourResults.forEach((result) => {
      const dateStr = result.calcDate.toISOString().split('T')[0];
      const timeRange = result.startTime && result.endTime
        ? `${new Date(result.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}-${new Date(result.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
        : '时间未知';

      console.log(
        `${result.id}\t` +
        `${result.employeeNo}\t\t` +
        `${result.employeeId || '未知'}\t\t` +
        `${dateStr}\t` +
        `${result.shiftName || '无班次'}\t` +
        `${result.definitionAttendanceCodeStr || result.calcAttendanceCode || '无代码'}\t\t` +
        `${result.workHours.toFixed(2)}\t\t` +
        `${result.amount.toFixed(2)}\t\t` +
        `${result.accountName || '无账户'}\t\t` +
        `${result.sourceType}\t` +
        `${result.status}`
      );
    });

    console.log('======================================================================================\n');

    // 按出勤代码统计
    console.log('\n==================== 按出勤代码统计 ====================');
    const codeStats = new Map<string, { count: number; totalHours: number; totalAmount: number }>();

    workHourResults.forEach((result) => {
      const code = result.definitionAttendanceCodeStr || result.calcAttendanceCode || '未分类';
      const stats = codeStats.get(code) || { count: 0, totalHours: 0, totalAmount: 0 };
      stats.count++;
      stats.totalHours += result.workHours;
      stats.totalAmount += result.amount;
      codeStats.set(code, stats);
    });

    console.log('出勤代码\t\t记录数\t总工时\t\t总金额');
    console.log('------------------------------------------------------');
    codeStats.forEach((stats, code) => {
      console.log(`${code}\t\t${stats.count}\t${stats.totalHours.toFixed(2)}\t\t${stats.totalAmount.toFixed(2)}`);
    });

    // 按员工统计
    console.log('\n==================== 按员工统计（前10名）====================');
    const employeeStats = new Map<string, { count: number; totalHours: number; totalAmount: number }>();

    workHourResults.forEach((result) => {
      const stats = employeeStats.get(result.employeeNo) || { count: 0, totalHours: 0, totalAmount: 0 };
      stats.count++;
      stats.totalHours += result.workHours;
      stats.totalAmount += result.amount;
      employeeStats.set(result.employeeNo, stats);
    });

    console.log('员工编号\t记录数\t总工时\t\t总金额');
    console.log('------------------------------------------------------');
    let count = 0;
    employeeStats.forEach((stats, employeeNo) => {
      if (count++ < 10) {
        console.log(`${employeeNo}\t\t${stats.count}\t${stats.totalHours.toFixed(2)}\t\t${stats.totalAmount.toFixed(2)}`);
      }
    });

    // 按日期统计
    console.log('\n==================== 按日期统计 ====================');
    const dateStats = new Map<string, { count: number; totalHours: number; totalAmount: number }>();

    workHourResults.forEach((result) => {
      const dateStr = result.calcDate.toISOString().split('T')[0];
      const stats = dateStats.get(dateStr) || { count: 0, totalHours: 0, totalAmount: 0 };
      stats.count++;
      stats.totalHours += result.workHours;
      stats.totalAmount += result.amount;
      dateStats.set(dateStr, stats);
    });

    console.log('日期\t\t\t记录数\t总工时\t\t总金额');
    console.log('------------------------------------------------------');
    dateStats.forEach((stats, dateStr) => {
      console.log(`${dateStr}\t${stats.count}\t${stats.totalHours.toFixed(2)}\t\t${stats.totalAmount.toFixed(2)}`);
    });

    // 详细数据（JSON格式，用于进一步分析）
    console.log('\n==================== 详细数据（JSON格式，前5条）====================');
    console.log(JSON.stringify(workHourResults.slice(0, 5), null, 2));

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行查询
queryWorkHourResultDetails();
