import { PrismaService } from './src/database/prisma.service';

/**
 * 测试删除打卡记录后触发重新摆卡
 */

async function testDeleteAndPairing() {
  const prisma = new PrismaService();

  try {
    console.log('=== 测试删除打卡记录并触发重新摆卡 ===\n');

    // 1. 创建测试数据
    console.log('1. 创建测试数据...');
    const employee = await prisma.employee.findFirst();
    const device = await prisma.punchDevice.findFirst();

    if (!employee || !device) {
      console.error('没有找到员工或设备，无法创建测试数据');
      return;
    }

    const punchTime = new Date();

    // 创建两条打卡记录（签入和签出）
    const inRecord = await prisma.punchRecord.create({
      data: {
        employeeNo: employee.employeeNo,
        punchTime: punchTime,
        deviceId: device.id,
        punchType: 'IN',
        source: 'MANUAL',
      },
    });

    const outRecord = await prisma.punchRecord.create({
      data: {
        employeeNo: employee.employeeNo,
        punchTime: new Date(punchTime.getTime() + 8 * 60 * 60 * 1000), // 8小时后
        deviceId: device.id,
        punchType: 'OUT',
        source: 'MANUAL',
      },
    });

    console.log('创建的打卡记录:', {
      inRecord: { id: inRecord.id, punchTime: inRecord.punchTime },
      outRecord: { id: outRecord.id, punchTime: outRecord.punchTime },
    });

    // 2. 手动触发摆卡
    console.log('\n2. 触发摆卡...');
    // 注意：这里需要调用实际的摆卡服务，但为了测试，我们跳过这一步

    // 3. 删除其中一条记录
    console.log('\n3. 删除签入记录...');
    const employeeNo = inRecord.employeeNo;
    const punchDate = new Date(inRecord.punchTime);
    punchDate.setHours(0, 0, 0, 0);

    await prisma.$transaction(async (tx) => {
      // 删除关联的摆卡记录
      const deletePairsResult = await tx.punchPair.deleteMany({
        where: {
          OR: [
            { inPunchId: inRecord.id },
            { outPunchId: inRecord.id },
          ],
        },
      });

      console.log(`删除了 ${deletePairsResult.count} 条关联的摆卡记录`);

      // 删除打卡记录
      await tx.punchRecord.delete({
        where: { id: inRecord.id },
      });

      console.log('删除打卡记录成功');
    });

    // 4. 验证删除结果
    console.log('\n4. 验证删除结果...');
    const remainingRecords = await prisma.punchRecord.findMany({
      where: {
        employeeNo: employeeNo,
        punchTime: {
          gte: punchDate,
          lt: new Date(punchDate.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    console.log(`剩余的打卡记录: ${remainingRecords.length} 条`);

    const remainingPairs = await prisma.punchPair.findMany({
      where: {
        employeeNo: employeeNo,
        pairDate: punchDate,
      },
    });

    console.log(`剩余的摆卡记录: ${remainingPairs.length} 条`);

    // 5. 清理测试数据
    console.log('\n5. 清理测试数据...');
    await prisma.punchPair.deleteMany({
      where: {
        employeeNo: employeeNo,
        pairDate: punchDate,
      },
    });

    await prisma.punchRecord.deleteMany({
      where: {
        id: outRecord.id,
      },
    });

    console.log('✓ 测试完成！');

  } catch (error) {
    console.error('\n✗ 测试失败:', error.message);
    console.error('错误详情:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDeleteAndPairing();
