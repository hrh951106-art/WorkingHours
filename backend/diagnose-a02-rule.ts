import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 诊断挣得工时规则A02计算无结果的问题
 */
async function diagnoseA02Rule() {
  console.log('=== 诊断挣得工时规则A02计算问题 ===\n');

  try {
    // 1. 查看规则A02的配置
    console.log('1. 查看规则A02配置...\n');

    const a02Rule = await prisma.earnedHoursAllocationConfig.findFirst({
      where: {
        name: { contains: 'A02' },
      },
      include: {
        configDetails: true,
      },
    });

    if (!a02Rule) {
      console.log('❌ 未找到规则A02');
      await prisma.$disconnect();
      return;
    }

    console.log(`规则ID: ${a02Rule.id}`);
    console.log(`规则名称: ${a02Rule.name}`);
    console.log(`规则状态: ${a02Rule.status}`);
    console.log(`目标类型: ${a02Rule.targetType}`);
    console.log('');

    // 2. 查看5月20日的工时数据
    console.log('2. 查看5月20日工时数据...\n');

    const workDate = new Date('2026-05-20T00:00:00.000Z');

    const workHours = await prisma.workHourResult.findMany({
      where: { workDate: workDate },
      select: {
        id: true,
        employeeNo: true,
        workDate: true,
        workHours: true,
        accountId: true,
        accountPath: true,
        amount: true,
        source: true,
      },
      orderBy: { employeeNo: 'asc' },
    });

    console.log(`工时记录数: ${workHours.length}`);
    if (workHours.length > 0) {
      workHours.forEach((wh) => {
        console.log(`  ${wh.employeeNo}: ${wh.workHours}小时, 账户${wh.accountId}, 路径: ${wh.accountPath}`);
      });
    }
    console.log('');

    // 3. 查看5月20日的产量数据
    console.log('3. 查看5月20日产量数据...\n');

    // 先查看产量数据表
    const productionTables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%production%'
    `;

    console.log('产量相关表:');
    if (Array.isArray(productionTables)) {
      productionTables.forEach((table: any) => {
        console.log(`  ${table.name}`);
      });
    }
    console.log('');

    // 4. 查看分摊结果（A02规则）
    console.log('4. 查看A02规���分摊结果...\n');

    const allocationResults = await prisma.earnedHoursAllocationResult.findMany({
      where: {
        recordDate: workDate,
        configId: a02Rule.id,
      },
      select: {
        id: true,
        batchNo: true,
        recordDate: true,
        sourceEmployeeNo: true,
        sourceHours: true,
        targetType: true,
        targetId: true,
        targetName: true,
        allocatedHours: true,
        calcTime: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`A02规则分摊结果数: ${allocationResults.length}`);
    if (allocationResults.length > 0) {
      allocationResults.slice(0, 10).forEach((ar) => {
        console.log(`  批次: ${ar.batchNo}`);
        console.log(`    来源员工: ${ar.sourceEmployeeNo}, 工时: ${ar.sourceHours}`);
        console.log(`    目标: ${ar.targetName} (${ar.targetType})`);
        console.log(`    分摊工时: ${ar.allocatedHours}`);
        console.log(`    计算时间: ${ar.calcTime ? ar.calcTime.toISOString().substring(0, 19) : 'NULL'}`);
        console.log('');
      });
    } else {
      console.log('  ❌ 没有找到A02规则的分摊结果');
    }
    console.log('');

    // 5. 查看最近的所有分摊结果，看看是否有其他规则的结果
    console.log('5. 查看最近的所有分摊结果...\n');

    const recentAllocations = await prisma.earnedHoursAllocationResult.findMany({
      where: { recordDate: workDate },
      select: {
        id: true,
        batchNo: true,
        configId: true,
        recordDate: true,
        targetType: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    console.log(`5月20日所有分摊结果: ${recentAllocations.length}条`);
    if (recentAllocations.length > 0) {
      // 按configId分组
      const byConfig = new Map();
      recentAllocations.forEach((ar) => {
        const configId = ar.configId.toString();
        if (!byConfig.has(configId)) {
          byConfig.set(configId, []);
        }
        byConfig.get(configId)!.push(ar);
      });

      console.log('');
      console.log('按规则ID分组:');
      byConfig.forEach((results, configId) => {
        console.log(`  规则ID ${configId}: ${results.length}条结果`);
      });
    }
    console.log('');

    // 6. 检查规则配置详情
    console.log('6. 检查A02规则配置详情...\n');

    if (a02Rule.configDetails && a02Rule.configDetails.length > 0) {
      console.log(`配置明细数: ${a02Rule.configDetails.length}`);
      a02Rule.configDetails.forEach((detail, index) => {
        console.log(`  ${index + 1}. Level ${detail.level}: ${detail.name || 'N/A'}`);
        console.log(`     映射类型: ${detail.mappingType}`);
        console.log(`     映射值: ${detail.mappingValue || 'N/A'}`);
        console.log('');
      });
    }

    // 7. 检查工时账户路径
    console.log('7. 检查工时账户路径结构...\n');

    const accountPaths = [...new Set(workHours.map(wh => wh.accountPath))];
    console.log(`账户路径种类: ${accountPaths.length}`);
    accountPaths.forEach((path) => {
      const levels = path ? path.split('/') : [];
      console.log(`  路径: ${path}`);
      console.log(`    层级数: ${levels.length}`);
      levels.forEach((level, index) => {
        console.log(`      Level ${index + 1}: ${level}`);
      });
      console.log('');
    });

    console.log('=== 诊断完成 ===\n');

  } catch (error) {
    console.error('❌ 诊断失败:', error);
    throw error;
  }

  await prisma.$disconnect();
}

diagnoseA02Rule()
  .then(() => {
    console.log('\n诊断完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('诊断失败:', error);
    process.exit(1);
  });
