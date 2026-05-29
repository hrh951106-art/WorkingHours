import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('查询工时结果表中作业工时的数据...\n');

  // 查询所有包含"作业工时"的记录
  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      attendanceCodeName: {
        contains: '作业工时'
      }
    },
    orderBy: [
      { workDate: 'desc' },
      { employeeNo: 'asc' }
    ],
    take: 100 // 限制返回100条记录
  });

  console.log(`找到 ${workHourResults.length} 条作业工时记录\n`);

  if (workHourResults.length === 0) {
    console.log('未找到包含"作业工时"的记录，尝试查询其他可能的出勤代码...\n');

    // 查询所有不同的出勤代码
    const distinctCodes = await prisma.workHourResult.groupBy({
      by: ['attendanceCodeName'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 20
    });

    console.log('工时结果表中的出勤代码（前20种）:');
    distinctCodes.forEach((code, index) => {
      console.log(`  ${index + 1}. ${code.attendanceCodeName || '(空)'}: ${code._count.id} 条记录`);
    });
  } else {
    // 显示前20条记录的详细信息
    const displayCount = Math.min(workHourResults.length, 20);
    console.log(`显示前 ${displayCount} 条记录:\n`);

    for (let i = 0; i < displayCount; i++) {
      const result = workHourResults[i];
      const workDate = result.workDate.toISOString().substring(0, 10);
      const startTime = result.startTime ? result.startTime.toISOString().substring(11, 19) : 'N/A';
      const endTime = result.endTime ? result.endTime.toISOString().substring(11, 19) : 'N/A';

      console.log(`${i + 1}. 记录ID: ${result.id}`);
      console.log(`   员工编号: ${result.employeeNo}`);
      console.log(`   员工ID: ${result.employeeId || 'N/A'}`);
      console.log(`   工作日期: ${workDate}`);
      console.log(`   时间段: ${startTime} - ${endTime}`);
      console.log(`   出勤代码: ${result.attendanceCode || 'N/A'} (${result.attendanceCodeName || 'N/A'})`);
      console.log(`   工时: ${result.workHours}`);
      console.log(`   账户: ${result.accountName || 'N/A'} (${result.accountPath || 'N/A'})`);
      console.log(`   数据来源: ${result.sourceType || 'N/A'}`);
      console.log(`   来源ID: ${result.sourceId || 'N/A'}`);
      console.log(`   状态: ${result.status}`);
      console.log(`   创建时间: ${result.createdAt.toISOString().substring(0, 19).replace('T', ' ')}`);
      console.log('');
    }

    if (workHourResults.length > 20) {
      console.log(`... 还有 ${workHourResults.length - 20} 条记录未显示\n`);
    }

    // 统计信息
    const totalRecords = workHourResults.length;
    const totalEmployees = new Set(workHourResults.map(r => r.employeeNo)).size;
    const totalHours = workHourResults.reduce((sum, r) => sum + (r.workHours || 0), 0);
    const uniqueDates = new Set(workHourResults.map(r => r.workDate.toISOString().substring(0, 10))).size;

    console.log('统计信息:');
    console.log(`  总记录数: ${totalRecords}`);
    console.log(`  涉及员工数: ${totalEmployees}`);
    console.log(`  总工时: ${totalHours.toFixed(2)} 小时`);
    console.log(`  涉及日期数: ${uniqueDates}`);
  }
}

main()
  .catch((e) => {
    console.error('查询失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
