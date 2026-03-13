import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBatchDetails() {
  console.log('========================================');
  console.log('检查批次号详情');
  console.log('========================================\n');

  const batchNo = 'ALC17733093471128370';

  // 查询分摊结果
  const allocationResults = await prisma.allocationResult.findMany({
    where: {
      batchNo: batchNo,
    },
  });

  console.log(`找到 ${allocationResults.length} 条分摊结果\n`);

  if (allocationResults.length > 0) {
    const result = allocationResults[0];

    console.log('分摊结果详情:\n');
    console.log(`  源账户: ${result.sourceAccountName || 'Unknown'}`);
    console.log(`  源工时: ${result.sourceHours}`);
    console.log(`  目标: ${result.targetType} - ${result.targetName || 'Unknown'}`);
    console.log(`  目标账户ID: ${result.targetAccountId || 'Unknown'}`);
    console.log(`  分摊依据: ${result.allocationBasis}`);
    console.log(`  依据值: ${result.basisValue}`);
    console.log(`  权重值: ${result.weightValue}`);
    console.log(`  分摊比例: ${result.allocationRatio}`);
    console.log(`  分摊工时: ${result.allocatedHours}`);
    console.log(`  记录日期: ${result.recordDate.toISOString().split('T')[0]}`);
    console.log(`  计算时间: ${result.calcTime.toISOString()}`);

    // 查询配置信息
    console.log('\n配置信息:\n');

    const config = await prisma.allocationConfig.findUnique({
      where: { id: result.configId },
    });

    if (config) {
      console.log(`  配置代码: ${config.configCode}`);
      console.log(`  配置名称: ${config.configName}`);
    }

    // 查询目标账户信息
    console.log('\n目标账户详情:\n');

    if (result.targetAccountId) {
      const targetAccount = await prisma.laborAccount.findUnique({
        where: { id: result.targetAccountId },
      });

      if (targetAccount) {
        console.log(`  账户名称: ${targetAccount.name}`);
        console.log(`  账户ID: ${targetAccount.id}`);

        try {
          const hierarchyValues = JSON.parse(targetAccount.hierarchyValues || '{}');
          console.log(`  层级信息:`);
          console.log(`    orgId: ${hierarchyValues.orgId || 'Unknown'}`);
          console.log(`    workshopId: ${hierarchyValues.workshopId || 'Unknown'}`);
          console.log(`    lineId: ${hierarchyValues.lineId || 'Unknown'}`);
        } catch (e) {
          console.log(`  层级信息: 解析失败`);
        }
      }
    }

    // 查询该日期的所有工时记录
    console.log('\n========================================');
    console.log(`该日期 (${result.recordDate.toISOString().split('T')[0]}) 的工时记录`);
    console.log('========================================\n');

    const calcResults = await prisma.calcResult.findMany({
      where: {
        calcDate: result.recordDate,
      },
    });

    console.log(`总工时记录数: ${calcResults.length}\n`);

    // 按出勤代码分组
    const attendanceStats: Record<number, { code: string; name: string; count: number }> = {};
    for (const record of calcResults) {
      if (record.attendanceCodeId) {
        if (!attendanceStats[record.attendanceCodeId]) {
          const code = await prisma.attendanceCode.findUnique({
            where: { id: record.attendanceCodeId },
          });
          attendanceStats[record.attendanceCodeId] = {
            code: code?.code || 'Unknown',
            name: code?.name || 'Unknown',
            count: 0,
          };
        }
        attendanceStats[record.attendanceCodeId].count++;
      }
    }

    console.log('按出勤代码统计:\n');
    for (const [id, stats] of Object.entries(attendanceStats)) {
      console.log(`  ${stats.code} (${stats.name}): ${stats.count} 条`);
    }
  }

  console.log('\n========================================\n');
}

checkBatchDetails()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
