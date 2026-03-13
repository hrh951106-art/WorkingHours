import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testL01Allocation() {
  console.log('========================================');
  console.log('测试L01分摊创建AllocationResult');
  console.log('========================================\n');

  // 1. 查询L01配置
  const l01Config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'L01',
      deletedAt: null,
    },
  });

  if (!l01Config) {
    console.log('✗ 未找到L01配置');
    await prisma.$disconnect();
    return;
  }

  console.log(`L01配置ID: ${l01Config.id}`);
  console.log(`配置名称: ${l01Config.configName}`);
  console.log(`配置状态: ${l01Config.status}\n`);

  // 2. 查询L01的工时记录
  const startDate = new Date('2026-03-11');
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date('2026-03-11');
  endDate.setHours(23, 59, 59, 999);

  // 查询I04出勤代码
  const i04Code = await prisma.attendanceCode.findFirst({
    where: {
      code: 'I04',
    },
  });

  if (!i04Code) {
    console.log('✗ 未找到I04出勤代码');
    await prisma.$disconnect();
    return;
  }

  console.log(`I04出勤代码ID: ${i04Code.id}\n`);

  // 查询I04工时记录
  const calcResults = await prisma.calcResult.findMany({
    where: {
      calcDate: startDate,
      attendanceCodeId: i04Code.id,
    },
    include: {
      employee: true,
    },
  });

  console.log(`找到 ${calcResults.length} 条I04工时记录\n`);

  if (calcResults.length === 0) {
    console.log('✗ 没有I04工时记录，无法分摊');
    await prisma.$disconnect();
    return;
  }

  for (const cr of calcResults) {
    console.log(`  员工: ${cr.employee.name}, 账户: ${cr.accountName}, 工时: ${cr.actualHours}`);
  }

  // 3. 检查是否有产线可以直接工时
  console.log('\n检查产线直接工时:\n');

  // 查询I01出勤代码
  const i01Code = await prisma.attendanceCode.findFirst({
    where: {
      code: 'I01',
    },
  });

  if (i01Code) {
    const directHoursResults = await prisma.calcResult.findMany({
      where: {
        calcDate: startDate,
        attendanceCodeId: i01Code.id,
        accountName: {
          contains: 'W1总装车间',
        },
      },
    });

    console.log(`找到 ${directHoursResults.length} 条I01直接工时记录（W1车间）`);

    // 按产线分组
    const lineGroups: Record<string, number> = {};
    for (const cr of directHoursResults) {
      // 从账户名称中提取产线名称
      // 富阳工厂/W1总装车间/L1产线////直接设备
      const match = cr.accountName.match(/\/([^/]+产线)\/{5}直接设备/);
      if (match) {
        const lineName = match[1];
        lineGroups[lineName] = (lineGroups[lineName] || 0) + cr.actualHours;
      }
    }

    console.log('\n各产线直接工时:');
    for (const [lineName, hours] of Object.entries(lineGroups)) {
      console.log(`  ${lineName}: ${hours}`);
    }

    const totalDirectHours = Object.values(lineGroups).reduce((sum, h) => sum + h, 0);
    console.log(`\n总直接工时: ${totalDirectHours}`);

    if (totalDirectHours === 0) {
      console.log('\n✗ W1车间没有直接工时，无法进行L01分摊');
      console.log('这就是为什么L01没有创建AllocationResult的原因！');
      await prisma.$disconnect();
      return;
    }
  }

  // 4. 尝试手动创建一个AllocationResult来测试
  console.log('\n尝试手动创建AllocationResult:\n');

  if (calcResults.length > 0) {
    const sourceCalcResult = calcResults[0];

    try {
      // 创建测试AllocationResult
      const testAllocationResult = await prisma.allocationResult.create({
        data: {
          batchNo: 'TEST_' + Date.now(),
          recordDate: startDate,
          calcResultId: sourceCalcResult.id,
          configId: l01Config.id,
          configVersion: l01Config.version,
          ruleId: 10, // L01的规则ID
          sourceEmployeeNo: sourceCalcResult.employeeNo,
          sourceEmployeeName: sourceCalcResult.employee.name,
          sourceAccountId: sourceCalcResult.accountId,
          sourceAccountName: sourceCalcResult.accountName,
          attendanceCodeId: sourceCalcResult.attendanceCodeId,
          attendanceCode: i04Code.code,
          sourceHours: sourceCalcResult.actualHours,
          targetType: 'LINE',
          targetId: 3, // L3产线ID
          targetName: 'L3产线',
          targetAccountId: 155, // L3产线的间接设备账户ID
          allocationBasis: 'ACTUAL_HOURS',
          basisValue: 0,
          weightValue: 0,
          allocationRatio: 0.5,
          allocatedHours: sourceCalcResult.actualHours * 0.5,
          calcTime: new Date(),
        },
      });

      console.log('✓ 成功创建测试AllocationResult:');
      console.log(`  ID: ${testAllocationResult.id}`);
      console.log(`  批次号: ${testAllocationResult.batchNo}`);
      console.log(`  配置ID: ${testAllocationResult.configId}`);
      console.log(`  分摊工时: ${testAllocationResult.allocatedHours}`);

      // 删除测试记录
      await prisma.allocationResult.delete({
        where: { id: testAllocationResult.id },
      });
      console.log('\n✓ 已删除测试AllocationResult');

    } catch (error: any) {
      console.log(`✗ 创建AllocationResult失败: ${error.message}`);
      console.log(`  错误详情: ${JSON.stringify(error, null, 2)}`);
    }
  }

  console.log('\n========================================\n');
}

testL01Allocation()
  .catch((e) => {
    console.error('测试失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
