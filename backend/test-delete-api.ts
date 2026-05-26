import { PrismaService } from './src/database/prisma.service';
import { PunchService } from './src/modules/punch/punch.service';
import { PairingService } from './src/modules/punch/pairing.service';
import { AttendancePunchService } from './src/modules/punch/attendance-punch.service';
import { AttendanceWorkHourService } from './src/modules/calculate/attendance-work-hour.service';
import { AttendancePunchTriggerService } from './src/modules/punch/attendance-punch-trigger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 测试删除打卡记录 API
 */

async function testDeleteAPI() {
  const prisma = new PrismaService();

  // 创建依赖服务
  const eventEmitter = new EventEmitter2();
  const pairingService = new PairingService(prisma, null, null, null, null);
  const attendancePunchService = new AttendancePunchService(prisma, null);
  const attendanceWorkHourService = new AttendanceWorkHourService(prisma);
  const attendancePunchTriggerService = new AttendancePunchTriggerService(
    eventEmitter,
    attendancePunchService,
    attendanceWorkHourService,
    pairingService,
  );

  const punchService = new PunchService(
    prisma,
    pairingService,
    null,
    attendancePunchTriggerService,
  );

  try {
    console.log('=== 测试删除打卡记录 API ===\n');

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

    // 2. 调用删除 API
    console.log('\n2. 调用删除 API...');
    const result = await punchService.deleteRecord(testRecord.id);

    console.log('删除 API 返回结果:', result);

    // 3. 等待一段时间，让异步摆卡完成
    console.log('\n3. 等待异步摆卡完成...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. 验证删除结果
    console.log('\n4. 验证删除结果...');
    const deletedRecord = await prisma.punchRecord.findUnique({
      where: { id: testRecord.id },
    });

    if (deletedRecord) {
      console.error('✗ 记录仍然存在，删除失败！');
    } else {
      console.log('✓ 记录已成功删除');
    }

    console.log('\n✓ 测试完成！');

  } catch (error) {
    console.error('\n✗ 测试失败:', error.message);
    console.error('错误详情:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDeleteAPI();
