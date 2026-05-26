import { PrismaService } from './src/database/prisma.service';

/**
 * 测试删除打卡记录功能
 */

async function testDelete() {
  const prisma = new PrismaService();

  try {
    console.log('=== 测试删除打卡���录功能 ===\n');

    // 1. 查询现有的打卡记录
    console.log('1. 查询现有打卡记录...');
    const records = await prisma.punchRecord.findMany({
      take: 1,
      include: {
        outPairs: true,
        inPairs: true,
      },
    });

    if (records.length === 0) {
      console.log('没有找到打卡记录，创建测试数据...');
      // 创建测试数据
      const employee = await prisma.employee.findFirst();
      const device = await prisma.punchDevice.findFirst();

      if (!employee || !device) {
        console.error('没有找到员工或设备，无法创建测试数据');
        return;
      }

      const newRecord = await prisma.punchRecord.create({
        data: {
          employeeNo: employee.employeeNo,
          punchTime: new Date(),
          deviceId: device.id,
          punchType: 'IN',
          source: 'MANUAL',
        },
      });

      console.log('创建的测试记录:', newRecord);
      return;
    }

    const record = records[0];
    console.log('找到打卡记录:', {
      id: record.id,
      employeeNo: record.employeeNo,
      punchTime: record.punchTime,
      outPairsCount: record.outPairs.length,
      inPairsCount: record.inPairs.length,
    });

    // 2. 查询相关的 PunchPair
    console.log('\n2. 查询相关的 PunchPair...');
    const relatedPairs = await prisma.punchPair.findMany({
      where: {
        OR: [
          { inPunchId: record.id },
          { outPunchId: record.id },
        ],
      },
    });

    console.log('找到相关的 PunchPair:', relatedPairs.length, '条');
    relatedPairs.forEach((pair) => {
      console.log(`  - ID: ${pair.id}, inPunchId: ${pair.inPunchId}, outPunchId: ${pair.outPunchId}`);
    });

    // 3. 尝试删除
    console.log('\n3. 尝试删除打卡记录...');

    // 使用事务删除
    await prisma.$transaction(async (tx) => {
      // 先删除 PunchPair
      const deletePairsResult = await tx.punchPair.deleteMany({
        where: {
          OR: [
            { inPunchId: record.id },
            { outPunchId: record.id },
          ],
        },
      });

      console.log('删除 PunchPair:', deletePairsResult.count, '条');

      // 再删除 PunchRecord
      await tx.punchRecord.delete({
        where: { id: record.id },
      });

      console.log('删除 PunchRecord 成功');
    });

    console.log('\n✓ 删除成功！');

  } catch (error) {
    console.error('\n✗ 删除失败:', error.message);
    console.error('错误详情:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDelete();
