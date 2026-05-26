import { PrismaClient } from '@prisma/client';
import { calculateFromPunchPair } from './src/modules/calculate/attendance-code.service';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 重新计算 2026-05-12 的工时 ===\n');

  const employeeNo = '202604003';
  const calcDate = new Date('2026-05-12T00:00:00.000Z');

  // 1. 删除旧的工时结果
  console.log('1. 删除旧工时结果:');
  const deleteResult = await prisma.calcResult.deleteMany({
    where: {
      employeeNo,
      calcDate: calcDate,
    },
  });
  console.log(`   删除了 ${deleteResult.count} 条旧工时结果`);

  // 2. 重新计算所有摆卡的工时
  console.log('\n2. 重新计算摆卡工时:');

  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo,
      pairDate: calcDate,
    },
    orderBy: { inPunchTime: 'asc' },
  });

  console.log(`   找到 ${punchPairs.length} 条摆卡记录`);

  // 导入 AttendanceCodeService
  const { AttendanceCodeService } = await import('./src/modules/calculate/attendance-code.service');
  const attendanceCodeService = new AttendanceCodeService(prisma, null);

  let totalResults = 0;
  for (const punchPair of punchPairs) {
    console.log(`\n   计算摆卡 ${punchPair.id} (${punchPair.inPunchTime?.toISOString()} ~ ${punchPair.outPunchTime?.toISOString() || 'null'})`);

    try {
      const results = await attendanceCodeService.calculateFromPunchPair(punchPair.id);
      console.log(`     生成了 ${results.length} 条工时结果`);
      totalResults += results.length;

      results.forEach((r, idx) => {
        console.log(`       结果${idx + 1}: ${r.punchInTime?.toISOString() || 'null'} ~ ${r.punchOutTime?.toISOString() || 'null'}, 工时: ${r.actualHours}h, 账户: ${r.accountName || 'null'}, 代码: ${r.attendanceCodeName || 'null'}`);
      });
    } catch (error: any) {
      console.error(`     计算失败: ${error.message}`);
    }
  }

  console.log(`\n   总共生成了 ${totalResults} 条工时结果`);

  // 3. 查询最终结果
  console.log('\n3. 最终工时结果:');
  const finalResults = await prisma.calcResult.findMany({
    where: {
      employeeNo,
      calcDate: calcDate,
    },
    include: {
      calculationAttendanceCode: true,
    },
    orderBy: { punchInTime: 'asc' },
  });

  finalResults.forEach((result, idx) => {
    console.log(`   结果${idx + 1}:`);
    console.log(`     时间: ${result.punchInTime?.toISOString()} ~ ${result.punchOutTime?.toISOString()}`);
    console.log(`     工时: ${result.actualHours}h`);
    console.log(`     账户: ${result.accountName || 'null'}`);
    console.log(`     出勤代码: ${result.calculationAttendanceCode?.name || 'null'}`);
  });
}

main()
  .then(() => console.log('\n重新计算完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
