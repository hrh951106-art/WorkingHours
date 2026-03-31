/**
 * 修复脚本：更新LineShift表中lineId为NULL的记录
 *
 * 问题原因：
 * - 前端提交的是线体组织ID（如7=L1线体，8=L2线体）
 * - ProductionLine表的orgId字段存储的是工厂ID（5=富阳工厂）
 * - 旧的后端逻辑只匹配orgId，导致找不到对应的产线
 * - 解决方案：同时匹配orgId和workshopId
 *
 * 修复内容：
 * 1. 查找所有lineId为NULL的LineShift记录
 * 2. 根据orgId查找对应的ProductionLine（匹配workshopId）
 * 3. 更新LineShift记录的lineId字段
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 修复LineShift的lineId字段 ==========\n');

  // 1. 查找所有lineId为NULL的记录
  console.log('1. 查询lineId为NULL的LineShift记录...');
  const nullLineIdRecords = await prisma.lineShift.findMany({
    where: {
      lineId: null,
      deletedAt: null,
    },
    include: {
      line: true, // 尝试加载关联的产线
    },
  });

  console.log(`   找到 ${nullLineIdRecords.length} 条lineId为NULL的记录`);

  if (nullLineIdRecords.length === 0) {
    console.log('   ✅ 没有需要修复的记录');
    return;
  }

  // 2. 按orgId分组，查询对应的ProductionLine
  console.log('\n2. 分析记录并查找对应的产线...');

  const orgIds = [...new Set(nullLineIdRecords.map((r) => r.orgId))];
  console.log(`   涉及的组织ID: ${orgIds.join(', ')}`);

  // 建立orgId到ProductionLine的映射
  const orgIdToLineId: Record<number, number> = {};

  for (const orgId of orgIds) {
    // 尝试通过workshopId查找（因为orgId是线体组织ID）
    const productionLine = await prisma.productionLine.findFirst({
      where: {
        OR: [
          { orgId: orgId },      // 兼容：orgId可能是工厂ID
          { workshopId: orgId }, // 修复：orgId可能是车间/线体ID
        ],
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    if (productionLine) {
      orgIdToLineId[orgId] = productionLine.id;
      console.log(`   ✓ orgId ${orgId} -> 产线: ${productionLine.code} (ID: ${productionLine.id})`);
    } else {
      console.log(`   ✗ orgId ${orgId} -> 未找到对应的产线`);
    }
  }

  // 3. 更新LineShift记录
  console.log('\n3. 更新LineShift记录...');
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const record of nullLineIdRecords) {
    const targetLineId = orgIdToLineId[record.orgId];

    if (!targetLineId) {
      console.log(
        `   ⊘ 跳过 ID ${record.id}: orgId ${record.orgId} (${record.orgName}) - 未找到对应的产线`
      );
      skippedCount++;
      continue;
    }

    try {
      await prisma.lineShift.update({
        where: { id: record.id },
        data: { lineId: targetLineId },
      });

      const scheduleDate = new Date(record.scheduleDate).toISOString().split('T')[0];
      console.log(
        `   ✓ 更新成功 ID ${record.id}: ${scheduleDate} ${record.shiftName} ${record.orgName} -> lineId: ${targetLineId}`
      );
      updatedCount++;
    } catch (error: any) {
      console.error(`   ✗ 更新失败 ID ${record.id}: ${error.message}`);
      errorCount++;
    }
  }

  // 4. 验证修复结果
  console.log('\n4. 验证修复结果...');
  const remainingNullRecords = await prisma.lineShift.count({
    where: {
      lineId: null,
      deletedAt: null,
    },
  });

  console.log(`   剩余lineId为NULL的记录: ${remainingNullRecords}`);

  // 5. 显示一些修复后的记录
  console.log('\n5. 修复后的记录示例（前5条）：');
  const sampleRecords = await prisma.lineShift.findMany({
    where: {
      id: { in: nullLineIdRecords.slice(0, 5).map((r) => r.id) },
    },
    include: {
      line: true,
    },
    take: 5,
  });

  sampleRecords.forEach((record) => {
    const scheduleDate = new Date(record.scheduleDate).toISOString().split('T')[0];
    console.log(
      `   - ID ${record.id}: ${scheduleDate} ${record.shiftName} ` +
      `${record.orgName} -> 产线: ${record.line?.code || 'N/A'} (${record.line?.name || 'N/A'})`
    );
  });

  // 6. 总结
  console.log('\n========== 修复完成 ==========');
  console.log(`✅ 成功更新: ${updatedCount} 条`);
  console.log(`⊘ 跳过: ${skippedCount} 条（未找到对应产线）`);
  console.log(`✗ 失败: ${errorCount} 条`);
  console.log(`📊 总计: ${nullLineIdRecords.length} 条`);
  console.log(`\n剩余lineId为NULL的记录: ${remainingNullRecords}`);

  if (updatedCount > 0) {
    console.log('\n✅ 修复成功！');
    console.log('\n后续步骤：');
    console.log('1. 重新执行分摊计算（配置AC01，日期2026-03-16）');
    console.log('2. 验证员工A00000111的分摊结果是否正确生成');
    console.log('\nAPI请求示例：');
    console.log('POST /api/allocation/calculate');
    console.log('{');
    console.log('  "configId": 21,');
    console.log('  "startDate": "2026-03-16",');
    console.log('  "endDate": "2026-03-16"');
    console.log('}');
  } else if (skippedCount > 0) {
    console.log('\n⚠️  部分记录无法修复');
    console.log('原因：这些记录的orgId没有对应的ProductionLine');
    console.log('建议：检查ProductionLine表是否配置完整');
  }
}

main()
  .catch((e) => {
    console.error('执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
