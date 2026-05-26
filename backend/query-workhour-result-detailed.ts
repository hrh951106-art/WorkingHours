import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface QueryOptions {
  employeeNo?: string;
  startDate?: string;
  endDate?: string;
  attendanceCode?: string;
  limit?: number;
}

async function queryWorkHourResultDetailed(options: QueryOptions = {}) {
  console.log('开始查询 WorkHourResult 数据明细...\n');

  const where: any = {};

  // 添加过滤条件
  if (options.employeeNo) {
    where.employeeNo = options.employeeNo;
  }

  if (options.startDate || options.endDate) {
    where.calcDate = {};
    if (options.startDate) {
      where.calcDate.gte = new Date(options.startDate);
    }
    if (options.endDate) {
      where.calcDate.lte = new Date(options.endDate);
    }
  }

  if (options.attendanceCode) {
    where.OR = [
      { definitionAttendanceCodeStr: options.attendanceCode },
      { calcAttendanceCode: options.attendanceCode },
    ];
  }

  try {
    const workHourResults = await prisma.workHourResult.findMany({
      where,
      orderBy: [
        { calcDate: 'desc' },
        { employeeNo: 'asc' },
      ],
      take: options.limit,
    });

    console.log(`总共找到 ${workHourResults.length} 条记录\n`);

    if (workHourResults.length === 0) {
      console.log('没有找到符合条件的记录');
      return;
    }

    // 打印表头
    console.log('========================================================================================================================================================================');
    console.log('ID\t员工编号\t员工ID\t日期\t\t班次\t\t开始时间\t结束时间\t出勤代码\t\t工时\t\t金额\t\t账户');
    console.log('========================================================================================================================================================================');

    // 打印每条记录
    workHourResults.forEach((result) => {
      const dateStr = result.calcDate.toISOString().split('T')[0];
      const startTime = result.startTime
        ? new Date(result.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        : '未设置';
      const endTime = result.endTime
        ? new Date(result.endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        : '未设置';

      console.log(
        `${result.id}\t` +
        `${result.employeeNo}\t` +
        `${result.employeeId || 'N/A'}\t` +
        `${dateStr}\t` +
        `${result.shiftName || '无班次'}\t\t` +
        `${startTime}\t\t` +
        `${endTime}\t\t` +
        `${result.definitionAttendanceCodeStr || result.calcAttendanceCode || '无代码'}\t\t` +
        `${result.workHours.toFixed(2)}\t\t` +
        `${result.amount.toFixed(2)}\t\t` +
        `${result.accountName || '无账户'}`
      );
    });

    console.log('========================================================================================================================================================================\n');

    // 统计信息
    const totalHours = workHourResults.reduce((sum, r) => sum + r.workHours, 0);
    const totalAmount = workHourResults.reduce((sum, r) => sum + r.amount, 0);
    console.log(`总计工时: ${totalHours.toFixed(2)} 小时`);
    console.log(`总计金额: ${totalAmount.toFixed(2)} 元\n`);

    // 按出勤代码统计
    console.log('==================== 按出勤代码统计 ====================');
    const codeStats = new Map<string, { count: number; totalHours: number; totalAmount: number }>();

    workHourResults.forEach((result) => {
      const code = result.definitionAttendanceCodeStr || result.calcAttendanceCode || '未分类';
      const stats = codeStats.get(code) || { count: 0, totalHours: 0, totalAmount: 0 };
      stats.count++;
      stats.totalHours += result.workHours;
      stats.totalAmount += result.amount;
      codeStats.set(code, stats);
    });

    console.log('出勤代码\t\t\t记录数\t总工时\t\t总金额\t\t平均工时');
    console.log('----------------------------------------------------------------------------------------');
    codeStats.forEach((stats, code) => {
      const avgHours = stats.count > 0 ? stats.totalHours / stats.count : 0;
      console.log(`${code.padEnd(20)}\t${stats.count}\t${stats.totalHours.toFixed(2)}\t\t${stats.totalAmount.toFixed(2)}\t\t${avgHours.toFixed(2)}`);
    });

    // 按员工统计
    console.log('\n==================== 按员工统计 ====================');
    const employeeStats = new Map<string, { count: number; totalHours: number; totalAmount: number; employeeId: number }>();

    workHourResults.forEach((result) => {
      const stats = employeeStats.get(result.employeeNo) || { count: 0, totalHours: 0, totalAmount: 0, employeeId: result.employeeId || 0 };
      stats.count++;
      stats.totalHours += result.workHours;
      stats.totalAmount += result.amount;
      employeeStats.set(result.employeeNo, stats);
    });

    console.log('员工编号\t员工ID\t记录数\t总工时\t\t总金额\t\t平均工时');
    console.log('----------------------------------------------------------------------------------------');
    employeeStats.forEach((stats, employeeNo) => {
      const avgHours = stats.count > 0 ? stats.totalHours / stats.count : 0;
      console.log(`${employeeNo}\t\t${stats.employeeId}\t${stats.count}\t${stats.totalHours.toFixed(2)}\t\t${stats.totalAmount.toFixed(2)}\t\t${avgHours.toFixed(2)}`);
    });

    // 按班次统计
    console.log('\n==================== 按班次统计 ====================');
    const shiftStats = new Map<string, { count: number; totalHours: number; totalAmount: number }>();

    workHourResults.forEach((result) => {
      const shift = result.shiftName || '无班次';
      const stats = shiftStats.get(shift) || { count: 0, totalHours: 0, totalAmount: 0 };
      stats.count++;
      stats.totalHours += result.workHours;
      stats.totalAmount += result.amount;
      shiftStats.set(shift, stats);
    });

    console.log('班次\t\t记录数\t总工时\t\t总金额\t\t平均工时');
    console.log('----------------------------------------------------------------------------------------');
    shiftStats.forEach((stats, shift) => {
      const avgHours = stats.count > 0 ? stats.totalHours / stats.count : 0;
      console.log(`${shift.padEnd(12)}\t${stats.count}\t${stats.totalHours.toFixed(2)}\t\t${stats.totalAmount.toFixed(2)}\t\t${avgHours.toFixed(2)}`);
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

    console.log('日期\t\t\t记录数\t总工时\t\t总金额\t\t平均工时');
    console.log('----------------------------------------------------------------------------------------');
    dateStats.forEach((stats, dateStr) => {
      const avgHours = stats.count > 0 ? stats.totalHours / stats.count : 0;
      console.log(`${dateStr}\t${stats.count}\t${stats.totalHours.toFixed(2)}\t\t${stats.totalAmount.toFixed(2)}\t\t${avgHours.toFixed(2)}`);
    });

    // 按账户统计
    console.log('\n==================== 按账户统计 ====================');
    const accountStats = new Map<string, { count: number; totalHours: number; totalAmount: number }>();

    workHourResults.forEach((result) => {
      const account = result.accountName || '无账户';
      const stats = accountStats.get(account) || { count: 0, totalHours: 0, totalAmount: 0 };
      stats.count++;
      stats.totalHours += result.workHours;
      stats.totalAmount += result.amount;
      accountStats.set(account, stats);
    });

    console.log('账户\t\t\t\t\t\t\t记录数\t总工时\t\t总金额');
    console.log('----------------------------------------------------------------------------------------');
    accountStats.forEach((stats, account) => {
      console.log(`${account}\t${stats.count}\t${stats.totalHours.toFixed(2)}\t\t${stats.totalAmount.toFixed(2)}`);
    });

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 从命令行参数获取过滤条件
const args = process.argv.slice(2);
const options: QueryOptions = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--employee' && args[i + 1]) {
    options.employeeNo = args[++i];
  } else if (arg === '--start' && args[i + 1]) {
    options.startDate = args[++i];
  } else if (arg === '--end' && args[i + 1]) {
    options.endDate = args[++i];
  } else if (arg === '--code' && args[i + 1]) {
    options.attendanceCode = args[++i];
  } else if (arg === '--limit' && args[i + 1]) {
    options.limit = parseInt(args[++i]);
  }
}

console.log('查询参数:', JSON.stringify(options, null, 2));
console.log('');

// 执行查询
queryWorkHourResultDetailed(options);
