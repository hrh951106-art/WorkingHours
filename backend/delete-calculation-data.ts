import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteCalculationData() {
  console.log('开始删除计算相关数据...');

  try {
    // 1. 删除计算结果表 (CalcResult)
    console.log('\n1. 删除计算结果表 (CalcResult)...');
    const calcResultDelete = await prisma.calcResult.deleteMany({});
    console.log(`   已删除 ${calcResultDelete.count} 条计算结果记录`);

    // 2. 删除工时结果表 (WorkHourResult)
    console.log('\n2. 删除工时结果表 (WorkHourResult)...');
    const workHourResultDelete = await prisma.workHourResult.deleteMany({});
    console.log(`   已删除 ${workHourResultDelete.count} 条工时结果记录`);

    // 3. 删除精益摆卡结果表 (PunchPair)
    console.log('\n3. 删除精益摆卡结果表 (PunchPair)...');
    const punchPairDelete = await prisma.punchPair.deleteMany({});
    console.log(`   已删除 ${punchPairDelete.count} 条精益摆卡结果记录`);

    // 4. 删除考勤摆卡结果表 (AttendancePunchPair)
    console.log('\n4. 删除考勤摆卡结果表 (AttendancePunchPair)...');
    const attendancePunchPairDelete = await prisma.attendancePunchPair.deleteMany({});
    console.log(`   已删除 ${attendancePunchPairDelete.count} 条考勤摆卡结果记录`);

    // 5. 删除打卡记录表 (PunchRecord)
    console.log('\n5. 删除打卡记录表 (PunchRecord)...');
    const punchRecordDelete = await prisma.punchRecord.deleteMany({});
    console.log(`   已删除 ${punchRecordDelete.count} 条打卡记录`);

    console.log('\n✅ 所有数据删除完成！');
    console.log('\n删除统计:');
    console.log(`   - CalcResult: ${calcResultDelete.count} 条`);
    console.log(`   - WorkHourResult: ${workHourResultDelete.count} 条`);
    console.log(`   - PunchPair: ${punchPairDelete.count} 条`);
    console.log(`   - AttendancePunchPair: ${attendancePunchPairDelete.count} 条`);
    console.log(`   - PunchRecord: ${punchRecordDelete.count} 条`);
    console.log(`   总计: ${calcResultDelete.count + workHourResultDelete.count + punchPairDelete.count + attendancePunchPairDelete.count + punchRecordDelete.count} 条`);

  } catch (error) {
    console.error('删除数据时发生错误:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行删除
deleteCalculationData()
  .then(() => {
    console.log('\n脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n脚本执行失败:', error);
    process.exit(1);
  });
