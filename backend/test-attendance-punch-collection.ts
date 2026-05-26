import { PrismaClient } from '@prisma/client';
import { AttendancePunchService } from './src/modules/punch/attendance-punch.service';
import { AttendanceRuleGroupHelper } from './src/modules/attendance-rule-group/attendance-rule-group-helper.service';
import { PrismaService } from './src/database/prisma.service';

const prisma = new PrismaClient();
const prismaService = new PrismaService();
const attendanceRuleGroupHelper = new AttendanceRuleGroupHelper(prismaService);
const attendancePunchService = new AttendancePunchService(prismaService, attendanceRuleGroupHelper);

async function test() {
  try {
    console.log('开始测试考勤摆卡功能...');
    console.log('员工编号: 202604003');
    console.log('日期范围: 2026-05-12 到 2026-05-12');

    const result = await attendancePunchService.collectAttendancePunchBatch(
      ['202604003'],
      new Date('2026-05-12T00:00:00.000Z'),
      new Date('2026-05-12T23:59:59.999Z'),
    );

    console.log('\n结果:');
    console.log('成功处理员工数:', result.results.length);
    console.log('失败员工数:', result.errors.length);

    if (result.results.length > 0) {
      console.log('\n生成的考勤摆卡记录:');
      result.results.forEach((r: any, i: number) => {
        const punchDate = new Date(r.punchDate.getTime() + 8 * 60 * 60 * 1000);
        const workStart = r.workStartPunches && r.workStartPunches.length > 0
          ? new Date(r.workStartPunches[0].punchTime.getTime() + 8 * 60 * 60 * 1000)
          : null;
        const workEnd = r.workEndPunches && r.workEndPunches.length > 0
          ? new Date(r.workEndPunches[0].punchTime.getTime() + 8 * 60 * 60 * 1000)
          : null;

        console.log(`\n记录 ${i + 1}:`);
        console.log(`  日期: ${punchDate.toISOString().substring(0, 10)}`);
        console.log(`  上班卡: ${workStart ? workStart.toISOString().substring(11, 19) : '无'}`);
        console.log(`  下班卡: ${workEnd ? workEnd.toISOString().substring(11, 19) : '无'}`);
      });
    }

    if (result.errors.length > 0) {
      console.log('\n错误信息:');
      result.errors.forEach((err: any) => {
        console.log(`  ${err.employeeNo}: ${err.error}`);
      });
    }

    // 检查数据库中的记录
    const dbCount = await prisma.attendancePunchPair.count();
    const dbRecords = await prisma.attendancePunchPair.findMany({
      where: { employeeNo: '202604003' },
      orderBy: { id: 'desc' },
      take: 5,
    });

    console.log(`\n数据库中的考勤摆卡记录总数: ${dbCount}`);
    console.log('最近的记录:');
    dbRecords.forEach((r, i) => {
      const punchDate = new Date(r.punchDate.getTime() + 8 * 60 * 60 * 1000);
      const workStart = r.workStartPunchTime
        ? new Date(r.workStartPunchTime.getTime() + 8 * 60 * 60 * 1000)
        : null;
      const workEnd = r.workEndPunchTime
        ? new Date(r.workEndPunchTime.getTime() + 8 * 60 * 60 * 1000)
        : null;

      console.log(`  ${i + 1}. ${punchDate.toISOString().substring(0, 10)} 上班:${workStart ? workStart.toISOString().substring(11, 19) : '无'} 下班:${workEnd ? workEnd.toISOString().substring(11, 19) : '无'}`);
    });

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
