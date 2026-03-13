import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseL01ExecutionFlow() {
  console.log('========================================');
  console.log('诊断L01执行流程');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');
  calcDate.setHours(0, 0, 0, 0);

  // 1. 查询I04工时记录（源数据）
  console.log('第一步：查询I04源工时记录\n');

  const i04Code = await prisma.attendanceCode.findFirst({
    where: { code: 'I04' },
  });

  if (!i04Code) {
    console.log('✗ 未找到I04出勤代码');
    await prisma.$disconnect();
    return;
  }

  const sourceCalcResults = await prisma.calcResult.findMany({
    where: {
      calcDate: calcDate,
      attendanceCodeId: i04Code.id,
    },
    include: {
      employee: true,
    },
  });

  console.log(`找到 ${sourceCalcResults.length} 条I04源工时记录\n`);

  if (sourceCalcResults.length === 0) {
    console.log('✗ 没有I04源工时记录，L01无法分摊');
    await prisma.$disconnect();
    return;
  }

  for (const cr of sourceCalcResults) {
    console.log(`  员工: ${cr.employee.name}, 账户: ${cr.accountName}, 工时: ${cr.actualHours}`);
    console.log(`    accountId: ${cr.accountId}, accountName: ${cr.accountName}`);
    console.log();
  }

  const sourceCalcResult = sourceCalcResults[0];

  // 2. 检查源账户的workshopId
  console.log('第二步：检查源账户的workshopId\n');

  if (sourceCalcResult.accountId) {
    const sourceAccount = await prisma.laborAccount.findUnique({
      where: { id: sourceCalcResult.accountId },
    });

    if (sourceAccount) {
      console.log(`源账户: ${sourceAccount.name}`);
      console.log(`源账户ID: ${sourceAccount.id}`);
      console.log(`hierarchyValues: ${sourceAccount.hierarchyValues || 'NULL'}`);

      if (sourceAccount.hierarchyValues) {
        try {
          const hierarchyValues = JSON.parse(sourceAccount.hierarchyValues);
          console.log(`解析后的hierarchyValues:`, hierarchyValues);
          console.log(`workshopId: ${hierarchyValues.workshopId || 'NOT FOUND'}`);
        } catch (e) {
          console.log(`✗ 解析hierarchyValues失败`);
        }
      }

      // 从账户名称解析workshopId
      if (sourceAccount.name.includes('W1总装车间')) {
        console.log(`从账户名称解析出: workshopId = 6 (W1总装车间)`);
      } else if (sourceAccount.name.includes('W2总装车间')) {
        console.log(`从账户名称解析出: workshopId = 9 (W2总装车间)`);
      }
    } else {
      console.log(`✗ 源账户不存在 (ID: ${sourceCalcResult.accountId})`);
    }
  }

  // 3. 查询产线直接工时
  console.log('\n第三步：查询产线直接工时\n');

  const i01Code = await prisma.attendanceCode.findFirst({
    where: { code: 'I01' },
  });

  if (i01Code) {
    const directHoursResults = await prisma.calcResult.findMany({
      where: {
        calcDate: calcDate,
        attendanceCodeId: i01Code.id,
        accountName: {
          contains: 'W1总装车间',
        },
      },
    });

    console.log(`找到 ${directHoursResults.length} 条I01直接工时记录（W1车间）\n`);

    // 按产线分组
    const lineDirectHours: Record<number, number> = {};
    const lineNames: Record<number, string> = {};

    for (const cr of directHoursResults) {
      // 从账户名称中提取产线名称
      // 富阳工厂/W1总装车间/L1产线////直接设备
      const match = cr.accountName.match(/\/([^/]+产线)\/{5}直接设备/);
      if (match) {
        const lineName = match[1];

        // 查询产线ID
        const line = await prisma.productionLine.findFirst({
          where: {
            name: lineName,
            deletedAt: null,
          },
        });

        if (line) {
          if (!lineDirectHours[line.id]) {
            lineDirectHours[line.id] = 0;
            lineNames[line.id] = line.name;
          }
          lineDirectHours[line.id] += cr.actualHours;
        }
      }
    }

    console.log('各产线直接工时:\n');

    if (Object.keys(lineDirectHours).length === 0) {
      console.log('✗ 没有找到任何产线的直接工时');
      console.log('  这就是为什么L01没有创建AllocationResult的原因！');
      console.log('  如果所有产线的直接工时都为0，分摊系数无法计算，无法分摊');
    } else {
      for (const [lineId, hours] of Object.entries(lineDirectHours)) {
        console.log(`  ${lineNames[lineId]} (ID: ${lineId}): ${hours.toFixed(2)}小时`);
      }

      const totalDirectHours = Object.values(lineDirectHours).reduce((sum, h) => sum + h, 0);
      console.log(`\n总直接工时: ${totalDirectHours.toFixed(2)}小时`);

      if (totalDirectHours > 0) {
        console.log('\n✓ 有直接工时，可以计算分摊系数');

        // 模拟分摊计算
        console.log('\n模拟分摊计算:\n');

        for (const [lineId, lineHours] of Object.entries(lineDirectHours)) {
          const allocationRatio = lineHours / totalDirectHours;
          const allocatedHours = sourceCalcResult.actualHours * allocationRatio;

          console.log(`产线 ${lineNames[lineId]}:`);
          console.log(`  直接工时: ${lineHours.toFixed(2)}`);
          console.log(`  分摊系数: ${allocationRatio.toFixed(4)}`);
          console.log(`  分摊工时: ${allocatedHours.toFixed(2)}`);
          console.log();
        }
      }
    }
  }

  // 4. 总结
  console.log('========================================');
  console.log('诊断总结');
  console.log('========================================\n');

  console.log('L01分摊流程:');
  console.log('1. 查询I04源工时记录 ✓');
  console.log('2. 确定源账户所属车间 ✓');
  console.log('3. 查询产线直接工时');
  console.log('4. 过滤属于源车间的产线');
  console.log('5. 计算分摊系数');
  console.log('6. 创建AllocationResult和CalcResult');

  console.log('\n可能的问题:');
  console.log('- 如果第3步没有找到直接工时，则无法分摊');
  console.log('- 如果第5步分摊工时为0，则不会创建AllocationResult');
  console.log('- 如果第6步创建AllocationResult失败，则只会有CalcResult');

  console.log('\n建议:');
  console.log('- 确保有I04源工时记录（在车间级别的间接设备账户上）');
  console.log('- 确保有产线的I01直接工时记录');
  console.log('- 检查后端日志中的分摊执行情况');

  console.log('\n========================================\n');
}

diagnoseL01ExecutionFlow()
  .catch((e) => {
    console.error('诊断失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
