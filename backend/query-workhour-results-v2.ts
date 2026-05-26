import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 查询工时结果表数据 ===\n');

  try {
    // 查询工时结果表总数
    const totalCount = await prisma.workHourResult.count();
    console.log(`工时结果表总记录数: ${totalCount}`);
    console.log('');

    if (totalCount === 0) {
      console.log('工时结果表为空，没有数据');
      return;
    }

    // 查询所有工时结果
    const workHourResults = await prisma.workHourResult.findMany({
      orderBy: {
        workDate: 'desc'
      },
      take: 100 // 限制最多返回100条
    });

    console.log(`找到 ${workHourResults.length} 条工时结果记录（前100条）\n`);

    // 按员工分组统计
    const employeeGroups = new Map<string, any[]>();
    workHourResults.forEach(result => {
      const key = result.employeeNo || 'Unknown';
      if (!employeeGroups.has(key)) {
        employeeGroups.set(key, []);
      }
      employeeGroups.get(key)!.push(result);
    });

    console.log('=== 按员工分组统计 ===\n');
    employeeGroups.forEach((results, employeeNo) => {
      const totalHours = results.reduce((sum, r) => sum + (r.workHours || 0), 0);
      const totalAmount = results.reduce((sum, r) => sum + (r.amount || 0), 0);
      console.log(`员工 ${employeeNo}:`);
      console.log(`  记录数: ${results.length}`);
      console.log(`  总工时: ${totalHours} 小时`);
      console.log(`  总金额: ${totalAmount}`);
      console.log('');
    });

    // 显示前10条详细记录
    console.log('=== 详细记录（前10条）===\n');
    workHourResults.slice(0, 10).forEach((result, index) => {
      console.log(`[${index + 1}] 记录ID: ${result.id}`);
      console.log(`  员工编号: ${result.employeeNo || 'N/A'}`);
      console.log(`  工作日期: ${result.workDate ? result.workDate.toISOString().split('T')[0] : 'N/A'}`);
      console.log(`  计算日期: ${result.calcDate ? result.calcDate.toISOString().split('T')[0] : 'N/A'}`);
      console.log(`  出勤代码: ${result.calcAttendanceCode || result.attendanceCode || 'N/A'} (${result.attendanceCodeName || 'N/A'})`);
      console.log(`  工时: ${result.workHours || 0} 小时`);
      console.log(`  金额: ${result.amount || 0}`);
      console.log(`  班次: ${result.shiftName || 'N/A'}`);
      console.log(`  账户: ${result.accountName || 'N/A'}`);
      console.log(`  来源: ${result.source || 'N/A'}`);
      console.log(`  状态: ${result.status || 'N/A'}`);
      console.log('');
    });

  } catch (error: any) {
    console.error('\n❌ 查询数据时出错:', error.message);
    throw error;
  }
}

main()
  .then(() => {
    console.log('\n查询完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('查询失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
