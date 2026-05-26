import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605002';
  const startDate = new Date('2026-05-10T00:00:00Z');
  const endDate = new Date('2026-05-10T23:59:59Z');

  console.log(`查询员工 ${employeeNo} 在 2026-05-10 的工时结果`);

  const employee = await prisma.employee.findUnique({
    where: { employeeNo },
    select: { id: true, employeeNo: true, name: true }
  });

  if (!employee) {
    console.log('员工不存在');
    return;
  }

  console.log('员工信息:', employee);

  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      employeeId: employee.id,
      workDate: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  console.log(`\n找到 ${workHourResults.length} 条工时结果:\n`);

  workHourResults.forEach(result => {
    console.log(`出勤代码: ${result.calcAttendanceCode || result.attendanceCode || 'N/A'} (${result.attendanceCodeName || 'N/A'})`);
    console.log(`工时: ${result.workHours} 小时`);
    console.log(`金额: ${result.amount || 'N/A'}`);
    console.log(`账户: ${result.accountName || 'N/A'}`);
    console.log(`账户路径: ${result.accountPath || 'N/A'}`);
    console.log(`来源: ${result.source || 'N/A'}`);
    console.log(`班次: ${result.shiftName || 'N/A'}`);
    console.log('');
  });

  const calcResults = await prisma.calcResult.findMany({
    where: {
      employeeNo: employee.employeeNo,
      calcDate: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      attendanceCode: {
        select: { code: true, name: true }
      }
    }
  });

  console.log(`找到 ${calcResults.length} 条计算结果:\n`);

  calcResults.forEach(result => {
    console.log(`出勤代码: ${result.attendanceCode?.code || 'N/A'} (${result.attendanceCode?.name || 'N/A'})`);
    console.log(`标准工时: ${result.standardHours} 小时`);
    console.log(`实际工时: ${result.actualHours} 小时`);
    console.log(`加班工时: ${result.overtimeHours} 小时`);
    console.log(`请假工时: ${result.leaveHours} 小时`);
    console.log(`缺勤工时: ${result.absenceHours} 小时`);
    console.log(`账户工时: ${result.accountHours}`);
    console.log(`金额: ${result.amount || 'N/A'}`);
    console.log(`状态: ${result.status}`);
    console.log('');
  });

  console.log('查询当天的考勤记录:\n');

  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo: employee.employeeNo,
      pairDate: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  console.log(`找到 ${punchPairs.length} 条配对记录:\n`);

  punchPairs.forEach(pair => {
    console.log(`班次: ${pair.shiftName || 'N/A'}`);
    console.log(`开始时间: ${pair.inPunchTime}`);
    console.log(`结束时间: ${pair.outPunchTime}`);
    console.log(`工时: ${pair.workHours} 小时`);
    console.log(`账户: ${pair.accountName || 'N/A'}`);
    console.log('');
  });

  console.log('查询当天的排班信息:\n');

  const schedules = await prisma.employeeSchedule.findMany({
    where: {
      employeeNo: employee.employeeNo,
      scheduleDate: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      shift: {
        include: {
          properties: true
        }
      },
      shiftSegment: true
    }
  });

  console.log(`找到 ${schedules.length} 条排班记录:\n`);

  schedules.forEach(schedule => {
    console.log(`班次: ${schedule.shift?.code || 'N/A'} - ${schedule.shiftSegment?.code || 'N/A'}`);
    console.log(`开始时间: ${schedule.startTime}`);
    console.log(`结束时间: ${schedule.endTime}`);
    console.log(`是否工作日: ${schedule.isWorkDay}`);
    console.log('');
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
