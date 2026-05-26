import { PrismaService } from './src/database/prisma.service';

/**
 * 简单测试删除打卡记录
 */

async function testDeleteSimple() {
  const prisma = new PrismaService();

  try {
    console.log('=== 简单测试删除打卡记录 ===\n');

    // 1. 创建测试数据
    console.log('1. 创建测试数据...');
    const employee = await prisma.employee.findFirst();
    const device = await prisma.punchDevice.findFirst();

    if (!employee || !device) {
      console.error('没有找到员工或设备，无法创建测试数据');
      return;
    }

    const punchTime = new Date();
    const testRecord = await prisma.punchRecord.create({
      data: {
        employeeNo: employee.employeeNo,
        punchTime: punchTime,
        deviceId: device.id,
        punchType: 'IN',
        source: 'MANUAL',
      },
    });

    console.log('创建的测试记录:', {
      id: testRecord.id,
      employeeNo: testRecord.employeeNo,
      punchTime: testRecord.punchTime,
    });

    // 2. 模拟删除逻辑（与 deleteRecord 相同）
    console.log('\n2. 执行删除...');

    const recordId = testRecord.id;
    const employeeNo = testRecord.employeeNo;
    const punchDate = new Date(testRecord.punchTime);
    punchDate.setHours(0, 0, 0, 0);

    console.log(`[删除打卡记录] ID: ${recordId}, 员工: ${employeeNo}, 日期: ${punchDate.toISOString()}`);

    // 使用事务处理：先删除关联的摆卡记录，再删除打卡记录
    await prisma.$transaction(async (tx) => {
      try {
        // 1. 删除关联的精益摆卡记录（PunchPair）
        const deletePairsResult = await tx.punchPair.deleteMany({
          where: {
            OR: [
              { inPunchId: recordId },
              { outPunchId: recordId },
            ],
          },
        });

        console.log(`[删除打卡记录] 删除了 ${deletePairsResult.count} 条关联的摆卡记录`);

        // 2. 删除打卡记录
        await tx.punchRecord.delete({
          where: { id: recordId },
        });

        console.log(`[删除打卡记录] 删除打卡记录 ${recordId} 成功`);
      } catch (error: any) {
        console.error(`[删除打卡记录] 事务内错误:`, error);
        throw error;
      }
    });

    console.log('✓ 删除成功');

    // 3. 验证删除结果
    console.log('\n3. 验证删除结果...');
    const deletedRecord = await prisma.punchRecord.findUnique({
      where: { id: recordId },
    });

    if (deletedRecord) {
      console.error('✗ 记录仍然存在，删除失败！');
    } else {
      console.log('✓ 记录已成功删除');
    }

    const remainingPairs = await prisma.punchPair.findMany({
      where: {
        OR: [
          { inPunchId: recordId },
          { outPunchId: recordId },
        ],
      },
    });

    if (remainingPairs.length > 0) {
      console.error(`✗ 仍有 ${remainingPairs.length} 条关联的摆卡记录未删除`);
    } else {
      console.log('✓ 关联的摆卡记录已全部删除');
    }

    console.log('\n✓ 测试完成！');

  } catch (error) {
    console.error('\n✗ 测试失败:', error.message);
    console.error('错误详情:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDeleteSimple();
