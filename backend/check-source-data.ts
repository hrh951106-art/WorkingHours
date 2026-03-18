import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSourceData() {
  try {
    console.log('=== 检查源数据 ===\n');

    // 1. 检查工时结果数据
    console.log('1. 检查工时计算结果 (CalcResult):');
    const calcResults = await prisma.calcResult.findMany({
      take: 5,
      orderBy: { calcDate: 'desc' },
      include: {
        employee: true,
        attendanceCode: true,
      },
    });

    console.log(`   总记录数: ${await prisma.calcResult.count()}`);
    if (calcResults.length > 0) {
      console.log('   最新5条记录:');
      calcResults.forEach((r: any) => {
        console.log(`   - 日期: ${r.calcDate.toISOString().split('T')[0]} | 员工: ${r.employee?.name || 'N/A'} (${r.employeeNo}) | 出勤代码: ${r.attendanceCode?.code || 'N/A'} | 实际工时: ${r.actualHours} | 科目: ${r.accountName || 'N/A'}`);
      });
    }
    console.log();

    // 2. 检查出勤代码I04的数据
    console.log('2. 检查出勤代码I04的工时数据:');
    const i04Results = await prisma.calcResult.findMany({
      where: {
        attendanceCode: { code: 'I04' },
      },
      take: 3,
      orderBy: { calcDate: 'desc' },
      include: {
        employee: true,
      },
    });

    console.log(`   I04记录数: ${i04Results.length}`);
    if (i04Results.length > 0) {
      console.log('   I04示例记录:');
      i04Results.forEach((r: any) => {
        console.log(`   - ${r.calcDate.toISOString().split('T')[0]} | ${r.employee?.name} | 实际工时: ${r.actualHours} | 科目: ${r.accountName || 'N/A'}`);
      });
    }
    console.log();

    // 3. 检查开线计划
    console.log('3. 检查开线计划数据 (Schedule):');
    const schedules = await prisma.schedule.findMany({
      take: 5,
      orderBy: { scheduleDate: 'desc' },
      include: {
        employee: true,
      },
    });

    console.log(`   计划记录数: ${await prisma.schedule.count()}`);
    if (schedules.length > 0) {
      console.log('   最新5条计划:');
      schedules.forEach((s: any) => {
        console.log(`   - ${s.scheduleDate.toISOString().split('T')[0]} | 员工: ${s.employee?.name} (${s.employee?.employeeNo}) | 班次ID: ${s.shiftId} | 状态: ${s.status}`);
      });
    }
    console.log();

    // 4. 检查员工组织信息
    console.log('4. 检查员工在指定产线的数据:');
    const employees = await prisma.employee.findMany({
      where: {
        orgId: { in: [1, 5, 2, 6, 9, 7, 8, 10, 11] },
      },
      take: 5,
    });

    console.log(`   指定产线员工数: ${await prisma.employee.count({
      where: {
        orgId: { in: [1, 5, 2, 6, 9, 7, 8, 10, 11] },
      },
    })}`);
    if (employees.length > 0) {
      console.log('   示例员工:');
      employees.forEach((e: any) => {
        console.log(`   - ${e.name} (${e.employeeNo}) | 组织ID: ${e.orgId}`);
      });
    }

  } catch (error) {
    console.error('检查失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkSourceData();
