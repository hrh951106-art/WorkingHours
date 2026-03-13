import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';
import { AllocationService } from '../modules/allocation/allocation.service';

async function testG02Execution() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const allocationService = app.get(AllocationService);

  console.log('=== 测试G02配置分摊计算 ===\n');

  // 1. 获取工厂实际产量配置
  const config = await prisma.allocationConfig.findFirst({
    where: {
      configName: '工厂实际产量',
      deletedAt: null,
    },
    include: {
      rules: {
        where: {
          deletedAt: null,
        },
      },
      sourceConfig: true,
    },
  });

  if (!config) {
    console.log('未找到"工厂实际产量"配置');
    await app.close();
    return;
  }

  console.log(`配置名称: ${config.configName}`);
  console.log(`配置ID: ${config.id}`);
  console.log(`状态: ${config.status}`);
  console.log(`分摊源出勤代码: ${config.sourceConfig?.attendanceCodes}`);

  // 2. 检查2026-03-11的工时记录
  const testDate = new Date('2026-03-11');
  console.log(`\n检查 ${testDate.toISOString().split('T')[0]} 的工时记录:`);

  // 获取I05出勤代码的ID
  const i05Code = await prisma.attendanceCode.findFirst({
    where: { code: 'I05' },
  });
  console.log(`I05出勤代码ID: ${i05Code?.id}`);

  if (!i05Code) {
    console.log('未找到I05出勤代码');
    await app.close();
    return;
  }

  const calcResults = await prisma.calcResult.findMany({
    where: {
      calcDate: testDate,
      attendanceCodeId: i05Code.id,
      status: { in: ['PENDING', 'APPROVED', 'COMPLETED'] },
    },
    include: {
      attendanceCode: true,
      employee: true,
    },
  });

  console.log(`找到 ${calcResults.length} 条工时记录`);
  for (const result of calcResults) {
    console.log(`- 员工: ${result.employee?.name}, 实际工时: ${result.actualHours}, 账户: ${result.accountName || 'N/A'} (ID: ${result.accountId})`);
  }

  // 3. 检查当天的产量记录
  console.log(`\n检查 ${testDate.toISOString().split('T')[0]} 的产量记录:`);
  const productionRecords = await prisma.productionRecord.findMany({
    where: {
      recordDate: testDate,
      deletedAt: null,
    },
    include: {
      product: true,
      line: true,
    },
  });

  console.log(`找到 ${productionRecords.length} 条产量记录`);
  for (const record of productionRecords) {
    console.log(`- 产线: ${record.line?.name || 'N/A'} (ID: ${record.lineId}), 产量: ${record.actualQty}`);
  }

  // 4. 检查当天的开线计划
  console.log(`\n检查 ${testDate.toISOString().split('T')[0]} 的开线计划:`);
  const lineShifts = await prisma.lineShift.findMany({
    where: {
      scheduleDate: testDate,
      status: 'ACTIVE',
      participateInAllocation: true,
      deletedAt: null,
    },
    include: {
      line: true,
    },
  });

  console.log(`找到 ${lineShifts.length} 条开线计划`);
  for (const lineShift of lineShifts) {
    console.log(`- 产线: ${lineShift.line?.name || 'N/A'} (ID: ${lineShift.lineId}), 工厂: ${lineShift.line?.orgName || 'N/A'}`);
  }

  // 5. 尝试执行分摊计算
  console.log(`\n尝试执行分摊计算...`);
  try {
    const result = await allocationService.calculateAllocation({
      configId: config.id,
      startDate: '2026-03-11',
      endDate: '2026-03-11',
    });
    console.log(`分摊计算结果:`, result);
  } catch (error: any) {
    console.error(`分摊计算失败: ${error.message}`);
    if (error.response) {
      console.error(`错误详情: ${JSON.stringify(error.response, null, 2)}`);
    }
  }

  console.log('\n=== 测试完成 ===');

  await app.close();
}

testG02Execution().catch(console.error);
