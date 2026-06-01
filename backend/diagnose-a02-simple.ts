import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 简化版诊断脚本
 */
async function diagnoseA02Simple() {
  console.log('=== 诊断挣得工时规则A02问题 ===\n');

  const workDate = new Date('2026-05-20T00:00:00.000Z');

  try {
    // 1. 查看5月20日工时数据
    console.log('1. 查看5月20日工时数据\n');

    const workHours = await prisma.workHourResult.findMany({
      where: { workDate: workDate },
      select: {
        id: true,
        employeeNo: true,
        workHours: true,
        accountPath: true,
      },
      orderBy: { employeeNo: 'asc' },
    });

    console.log(`工时记录数: ${workHours.length}`);
    if (workHours.length > 0) {
      workHours.forEach((wh) => {
        console.log(`  ${wh.employeeNo}: ${wh.workHours}小时, 路径: ${wh.accountPath}`);
      });
    }
    console.log('');

    // 2. 查看5月20日分摊结果
    console.log('2. 查看5月20日分摊结果\n');

    const allocationResults = await prisma.earnedHoursAllocationResult.findMany({
      where: { recordDate: workDate },
      select: {
        id: true,
        batchNo: true,
        configId: true,
        sourceEmployeeNo: true,
        sourceHours: true,
        targetType: true,
        targetName: true,
        allocatedHours: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`分摊结果数: ${allocationResults.length}`);
    if (allocationResults.length > 0) {
      // 按configId分组
      const byConfig = new Map();
      allocationResults.forEach((ar) => {
        const configId = ar.configId.toString();
        if (!byConfig.has(configId)) {
          byConfig.set(configId, []);
        }
        byConfig.get(configId)!.push(ar);
      });

      console.log('');
      console.log('按规则ID分组:');
      let totalResults = 0;
      byConfig.forEach((results, configId) => {
        console.log(`  规则ID ${configId}: ${results.length}条结果`);
        results.slice(0, 2).forEach((ar) => {
          console.log(`    ${ar.sourceEmployeeNo} -> ${ar.targetName}: ${ar.allocatedHours}小时`);
        });
        if (results.length > 2) {
          console.log(`    ... 还有 ${results.length - 2} 条`);
        }
        totalResults += results.length;
      });
    } else {
      console.log('  ❌ 5月20日没有分摊结果');
    }
    console.log('');

    // 3. 查看所有挣得工时规则
    console.log('3. 查看所有挣得工时规则\n');

    const configs = await prisma.earnedHoursAllocationConfig.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`规则总数: ${configs.length}`);
    configs.forEach((c) => {
      const isA02 = c.name?.includes('A02') || c.code?.includes('A02');
      const marker = isA02 ? '👉 ' : '   ';
      console.log(`${marker} ID: ${c.id}, 名称: ${c.name}, 代码: ${c.code}, 状态: ${c.status}`);
    });
    console.log('');

    // 4. 查看最近所有分摊结果的日期
    console.log('4. 查看最近分摊结果的日期分布\n');

    const dateResults = await prisma.earnedHoursAllocationResult.findMany({
      select: {
        recordDate: true,
      },
      orderBy: { recordDate: 'desc' },
      take: 10,
    });

    const uniqueDates = [...new Set(dateResults.map(r => r.recordDate?.toISOString().substring(0, 10)))];
    console.log('最近有分摊结果的日期:');
    uniqueDates.forEach((date) => {
      const count = dateResults.filter(r => r.recordDate?.toISOString().substring(0, 10) === date).length;
      console.log(`  ${date}: ${count}条记录`);
    });

    console.log('');
    console.log('=== 问题分析 ===\n');

    // 查找A02规则
    const a02Config = configs.find(c => c.name?.includes('A02') || c.code?.includes('A02'));

    if (a02Config) {
      console.log('✅ 找到A02规则:');
      console.log(`   ID: ${a02Config.id}`);
      console.log(`   名称: ${a02Config.name}`);
      console.log(`   状态: ${a02Config.status}`);
      console.log('');

      // 检查5月20日是否有A02的结果
      const a02Results = allocationResults.filter(ar => ar.configId === a02Config.id);

      if (a02Results.length === 0) {
        console.log('❌ 问题: 5月20日没有A02规则的分摊结果');
        console.log('');
        console.log('可能原因:');
        console.log('1. 规则未生效或配置有误');
        console.log('2. 工时数据路径与规则配置不匹配');
        console.log('3. 规则的目标类型（如产品）在工时路径中不存在');
        console.log('4. 规则计算条件未满足');
      } else {
        console.log(`✅ A02规则已生成 ${a02Results.length} 条分摊结果`);
      }
    } else {
      console.log('❌ 未找到A02规则');
    }

  } catch (error) {
    console.error('❌ 诊断失败:', error);
    throw error;
  }

  await prisma.$disconnect();
}

diagnoseA02Simple()
  .then(() => {
    console.log('\n诊断完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('诊断失败:', error);
    process.exit(1);
  });
