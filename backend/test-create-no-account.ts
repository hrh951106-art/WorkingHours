import { PrismaService } from './src/database/prisma.service';

/**
 * 测试创建打卡记录时不选择账户
 */

async function testCreateNoAccount() {
  const prisma = new PrismaService();

  try {
    console.log('=== 测试创建打卡记录时不选择账户 ===\n');

    // 获取测试数据
    const employee = await prisma.employee.findFirst();
    const device = await prisma.punchDevice.findFirst();

    if (!employee || !device) {
      console.error('没有找到员工或设备');
      return;
    }

    console.log('员工:', employee.employeeNo);
    console.log('设备:', device.name);
    console.log('');

    // 模拟前端提交的数据（不包含 accountId）
    const dto = {
      employeeNo: employee.employeeNo,
      punchTime: '2026-05-25 10:00:00',
      deviceId: device.id,
      punchType: 'IN',
      // 注意：没有 accountId 字段
    };

    console.log('提交的数据:', JSON.stringify(dto, null, 2));

    // 模拟后端处理
    const accountId = (dto as any).accountId && (dto as any).accountId !== '' ? (dto as any).accountId : null;

    console.log('\n处理后的 accountId:', accountId);

    // 创建记录
    const record = await prisma.punchRecord.create({
      data: {
        ...dto,
        accountId, // 明确设置为 null
        punchTime: dto.punchTime ? new Date(dto.punchTime) : undefined,
        source: 'MANUAL',
      },
    });

    console.log('\n创建的记录:');
    console.log('  ID:', record.id);
    console.log('  accountId:', record.accountId);
    console.log('  source:', record.source);

    // 验证结果
    if (record.accountId === null) {
      console.log('\n✓ 成功：accountId 为 null');
    } else {
      console.log(`\n✗ 失败：accountId 为 ${record.accountId}，应该是 null`);
    }

    // 清理测试数据
    await prisma.punchRecord.delete({
      where: { id: record.id },
    });

    console.log('\n测试数据已清理');

  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCreateNoAccount();
