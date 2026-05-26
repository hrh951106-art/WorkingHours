import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605002';
  const date = '2026-05-10';

  console.log(`=== 查询员工 ${employeeNo} 在 ${date} 的计算结果详情 ===\n`);

  // 查询计算结果
  const calcResults = await prisma.calcResult.findMany({
    where: {
      employeeNo: employeeNo,
      calcDate: {
        gte: new Date(`${date}T00:00:00Z`),
        lte: new Date(`${date}T23:59:59Z`)
      }
    },
    include: {
      calculationAttendanceCode: true,
      attendanceCode: true
    },
    orderBy: { id: 'asc' }
  });

  console.log(`找到 ${calcResults.length} 条计算结果\n`);

  // 按计算出勤代码分组统计
  const codeGroups = new Map<string, any[]>();
  calcResults.forEach(result => {
    const code = result.calculationAttendanceCode?.code || 'N/A';
    const name = result.calculationAttendanceCode?.name || 'N/A';
    const type = result.calculationAttendanceCode?.type || 'N/A';
    const key = `${code} (${name}) [${type}]`;

    if (!codeGroups.has(key)) {
      codeGroups.set(key, []);
    }
    codeGroups.get(key)!.push(result);
  });

  console.log('=== 按计算出��代码分组统计 ===\n');

  codeGroups.forEach((results, key) => {
    const totalHours = results.reduce((sum, r) => sum + r.actualHours, 0);
    const totalAmount = results.reduce((sum, r) => sum + (r.amount || 0), 0);
    console.log(`${key}`);
    console.log(`  记录数: ${results.length}`);
    console.log(`  总工时: ${totalHours} 小时`);
    console.log(`  总金额: ${totalAmount}`);
    console.log('');
  });

  console.log('\n=== 详细记录（前10条）===\n');

  calcResults.slice(0, 10).forEach((result, index) => {
    console.log(`--- 记录 ${index + 1} (ID: ${result.id}) ---`);
    console.log(`计算出勤代码: ${result.calculationAttendanceCode?.code || 'N/A'} (${result.calculationAttendanceCode?.name || 'N/A'})`);
    console.log(`类型: ${result.calculationAttendanceCode?.type || 'N/A'}`);
    console.log(`出勤代码ID: ${result.attendanceCodeId || 'N/A'}`);
    console.log(`计算出勤代码ID: ${result.calculationAttendanceCodeId || 'N/A'}`);
    console.log(`标准工时: ${result.standardHours} 小时`);
    console.log(`实际工时: ${result.actualHours} 小时`);
    console.log(`加班工时: ${result.overtimeHours} 小时`);
    console.log(`请假工时: ${result.leaveHours} 小时`);
    console.log(`缺勤工时: ${result.absenceHours} 小时`);
    console.log(`账户工时: ${result.accountHours}`);
    console.log(`班次: ${result.shiftName || 'N/A'}`);
    console.log(`金额: ${result.amount || 'N/A'}`);
    console.log(`状态: ${result.status}`);
    console.log('');
  });

  // 检查是否有未关联计算出勤代码的记录
  const noCodeResults = calcResults.filter(r => !r.calculationAttendanceCodeId);
  if (noCodeResults.length > 0) {
    console.log(`\n⚠️ 发现 ${noCodeResults.length} 条未关联计算出勤代码的记录！\n`);
  }

  // 检查账户工时字段
  const withAccountHours = calcResults.filter(r => {
    try {
      const hours = JSON.parse(r.accountHours || '[]');
      return hours.length > 0;
    } catch {
      return false;
    }
  });

  console.log(`\n有账户工时明细的记录: ${withAccountHours.length} 条\n`);

  if (withAccountHours.length > 0) {
    withAccountHours.slice(0, 3).forEach((result, index) => {
      console.log(`--- 记录 ${index + 1} ---`);
      console.log(`计算出勤代码: ${result.calculationAttendanceCode?.code || 'N/A'}`);
      console.log(`账户工时: ${result.accountHours}`);
      console.log('');
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
