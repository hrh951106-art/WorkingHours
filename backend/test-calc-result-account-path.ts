import { PrismaService } from './src/database/prisma.service';
import { AttendanceWorkHourService } from './src/modules/calculate/attendance-work-hour.service';

async function test() {
  const prisma = new PrismaService();
  const attendanceWorkHourService = new AttendanceWorkHourService(prisma);

  try {
    console.log('计算员工202604003在2026-05-09的考勤工时...');

    const result = await attendanceWorkHourService.calculateAttendanceWorkHour({
      employeeNo: '202604003',
      date: '2026-05-09',
    });

    console.log('\n计算结果:');
    console.log(`  员工编号: ${result.employeeNo}`);
    console.log(`  日期: ${result.workDate}`);
    console.log(`  账户ID: ${result.accountId}`);
    console.log(`  账户名称: ${result.accountName || 'N/A'}`);
    console.log(`  账户路径: ${result.accountPath || 'N/A'}`);

    if (result.hierarchyValues) {
      try {
        const hv = JSON.parse(result.hierarchyValues);
        console.log(`\nHierarchyValues (${hv.length} 层级):`);
        hv.forEach((item: any) => {
          if (item.selectedValue) {
            const code = item.selectedValue.code || 'N/A';
            const name = item.selectedValue.name || 'N/A';
            console.log(`  Level ${item.level}: code=${code}, name=${name}`);
          } else {
            console.log(`  Level ${item.level}: null`);
          }
        });
      } catch (e) {
        console.log(`  HierarchyValues解析失败`);
      }
    }

  } catch (error) {
    console.error('计算失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
