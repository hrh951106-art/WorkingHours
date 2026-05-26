import { PrismaService } from './src/database/prisma.service';

/**
 * 删除所有打卡记录数据
 *
 * 注意：此脚本会删除以下数据：
 * 1. PunchPair - 精益摆卡记录
 * 2. AttendancePunchPair - 考勤摆卡记录
 * 3. PunchRecord - 原始打卡记录
 *
 * 执行顺序：先删除摆卡记录，再删除原始打卡记录（避免外键约束错误）
 */

async function deleteAllPunchRecords() {
  const prisma = new PrismaService();

  try {
    console.log('开始删除所有打卡记录数据...');

    // 1. 删除精益摆卡记录（PunchPair）
    console.log('正在删除精益摆卡记录（PunchPair）...');
    const punchPairCount = await prisma.punchPair.count();
    console.log(`找到 ${punchPairCount} 条精益摆卡记录`);
    if (punchPairCount > 0) {
      await prisma.punchPair.deleteMany({});
      console.log(`✓ 已删除 ${punchPairCount} 条精益摆卡记录`);
    } else {
      console.log('  没有精益摆卡记录需要删除');
    }

    // 2. 删除考勤摆卡记录（AttendancePunchPair）
    console.log('\n正在删除考勤摆卡记录（AttendancePunchPair）...');
    const attendancePunchPairCount = await prisma.attendancePunchPair.count();
    console.log(`找到 ${attendancePunchPairCount} 条考勤摆卡记录`);
    if (attendancePunchPairCount > 0) {
      await prisma.attendancePunchPair.deleteMany({});
      console.log(`✓ 已删除 ${attendancePunchPairCount} 条考勤摆卡记录`);
    } else {
      console.log('  没有考勤摆卡记录需要删除');
    }

    // 3. 删除原始打卡记录（PunchRecord）
    console.log('\n正在删除原始打卡记录（PunchRecord）...');
    const punchRecordCount = await prisma.punchRecord.count();
    console.log(`找到 ${punchRecordCount} 条原始打卡记录`);
    if (punchRecordCount > 0) {
      await prisma.punchRecord.deleteMany({});
      console.log(`✓ 已删除 ${punchRecordCount} 条原始打卡记录`);
    } else {
      console.log('  没有原始打卡记录需要删除');
    }

    console.log('\n========================================');
    console.log('删除完成！');
    console.log('========================================');
    console.log(`总计删除：`);
    console.log(`  - 精益摆卡记录: ${punchPairCount} 条`);
    console.log(`  - 考勤摆卡记录: ${attendancePunchPairCount} 条`);
    console.log(`  - 原始打卡记录: ${punchRecordCount} 条`);
  } catch (error) {
    console.error('删除数据时发生错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行删除
deleteAllPunchRecords()
  .then(() => {
    console.log('\n脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n脚本执行失败:', error);
    process.exit(1);
  });
