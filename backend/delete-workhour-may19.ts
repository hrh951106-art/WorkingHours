import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 删除工时结果表中5月19日的所有工时数据
 */
async function deleteMay19WorkHours() {
  // 使用UTC时间避免时区问题
  const targetDate = new Date('2026-05-19T00:00:00.000Z');

  console.log('=== 删除5月19日工时数据 ===\n');
  console.log(`目标日期: 2026-05-19`);

  try {
    // 1. 查询该日期的所有工时记录
    const workHourResults = await prisma.workHourResult.findMany({
      where: {
        workDate: targetDate,
      },
      select: {
        id: true,
        employeeNo: true,
        workDate: true,
        workHours: true,
      },
    });

    console.log('');
    console.log(`找到 ${workHourResults.length} 条工时记录\n`);

    if (workHourResults.length === 0) {
      console.log('ℹ️ 该日期没有工时记录，无需删除');
      await prisma.$disconnect();
      return;
    }

    // 显示前10条记录
    console.log('部分记录预览（前10条）:');
    workHourResults.slice(0, 10).forEach((whr) => {
      console.log(`  ID ${whr.id}: ${whr.employeeNo}, ${whr.workHours}小时`);
    });

    if (workHourResults.length > 10) {
      console.log(`  ... 还有 ${workHourResults.length - 10} 条记录`);
    }

    console.log('');
    console.log('开始删除...\n');

    // 2. 删除这些记录
    const deleteResult = await prisma.workHourResult.deleteMany({
      where: {
        workDate: targetDate,
      },
    });

    console.log(`✅ 删除完成！`);
    console.log(`   删除了 ${deleteResult.count} 条工时记录`);
    console.log('');

    // 3. 验证删除结果
    const remaining = await prisma.workHourResult.count({
      where: {
        workDate: targetDate,
      },
    });

    console.log(`剩余记录数: ${remaining}`);

    if (remaining === 0) {
      console.log('✅ 验证成功：该日期的所有工时记录已删除');
    } else {
      console.log('⚠️ 警告：该日期仍有剩余记录');
    }

  } catch (error) {
    console.error('❌ 删除失败:', error);
    throw error;
  }

  await prisma.$disconnect();
}

deleteMay19WorkHours()
  .then(() => {
    console.log('\n操作完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('操作失败:', error);
    process.exit(1);
  });
