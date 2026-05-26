import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== WorkHourResult 表详细数据查询 ===\n');

  const totalCount = await prisma.workHourResult.count();
  console.log(`总记录数: ${totalCount}\n`);

  if (totalCount === 0) {
    console.log('WorkHourResult 表为空');
    return;
  }

  // 查询前20条记录，包含关联的 DefinitionAttendanceCode
  const results = await prisma.workHourResult.findMany({
    take: 20,
    orderBy: { workDate: 'desc' },
    include: {
      definitionAttendanceCode: {
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          color: true,
          calcAttendanceCode: true,
        },
      },
    },
  });

  console.log(`显示前 ${results.length} 条记录:\n`);

  results.forEach((r, i) => {
    console.log(`[${i + 1}] ID=${r.id}`);
    console.log(`  员工: ${r.employeeNo} (ID: ${r.employeeId})`);
    console.log(`  工作日期: ${r.workDate.toISOString().split('T')[0]}`);
    console.log(`  计算日期: ${r.calcDate ? r.calcDate.toISOString().split('T')[0] : 'N/A'}`);

    if (r.definitionAttendanceCode) {
      console.log(`  定义出勤代码: ${r.definitionAttendanceCode.name} (${r.definitionAttendanceCode.code})`);
      console.log(`    类型: ${r.definitionAttendanceCode.type}, 颜色: ${r.definitionAttendanceCode.color}`);
    } else {
      console.log(`  定义出勤代码: ${r.definitionAttendanceCodeStr || 'N/A'}`);
    }

    console.log(`  计算出勤代码: ${r.calcAttendanceCode || 'N/A'}`);
    console.log(`  工时: ${r.workHours}h`);
    console.log(`  金额: ${r.amount || 'N/A'}`);
    console.log(`  班次: ${r.shiftName || 'N/A'}`);
    console.log(`  劳动力账户: ${r.accountName || 'N/A'}`);
    console.log(`  来源: ${r.sourceType || 'N/A'} (sourceId: ${r.sourceId})`);
    console.log(`  状态: ${r.status}`);

    if (r.startTime && r.endTime) {
      console.log(`  时间: ${r.startTime.toISOString().split('T')[1].slice(0, 8)} ~ ${r.endTime.toISOString().split('T')[1].slice(0, 8)}`);
    }

    console.log('');
  });

  // 统计信息
  const employeeStats = await prisma.workHourResult.groupBy({
    by: ['employeeNo'],
    _count: { id: true },
    _sum: { workHours: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5,
  });

  console.log('\n工时记录最多的员工（Top 5）:');
  employeeStats.forEach((stat, i) => {
    console.log(`  ${i + 1}. ${stat.employeeNo}: ${stat._count.id} 条记录, ${stat._sum.workHours?.toFixed(2)}h`);
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
