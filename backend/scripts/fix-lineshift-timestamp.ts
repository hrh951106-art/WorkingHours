/**
 * 修复脚本：修正LineShift时间戳和lineId
 *
 * 问题：
 * 1. ID 18-19的记录scheduleDate正确但lineId为空
 * 2. ID 20-23的记录scheduleDate不正确（时区问题）
 *
 * 解决方案：
 * 删除所有记录，使用正确的时间戳和lineId重新创建
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 修复LineShift时间戳和关联 ==========\n');

  const targetTimestamp = 1773532800000; // 2026-03-15 00:00:00 UTC
  const targetDate = new Date('2026-03-15T00:00:00.000Z');

  console.log(`目标时间戳: ${targetTimestamp}`);
  console.log(`目标日期: ${targetDate.toISOString()}\n`);

  // 1. 查询需要修复的记录
  console.log('1. 查询现有LineShift记录...');
  const existingRecords = await prisma.lineShift.findMany({
    where: {
      OR: [
        { scheduleDate: new Date(targetTimestamp) },
        { scheduleDate: new Date(1773504000000) },
      ],
      shiftId: 1,
      deletedAt: null,
    },
  });

  console.log(`   找到 ${existingRecords.length} 条需要处理的记录`);
  existingRecords.forEach((r) => {
    console.log(`   - ID: ${r.id}, scheduleDate: ${r.scheduleDate.getTime()}, lineId: ${r.lineId}, orgName: ${r.orgName}`);
  });

  // 2. 删除这些记录
  console.log('\n2. 删除旧记录...');
  for (const record of existingRecords) {
    await prisma.lineShift.delete({
      where: { id: record.id },
    });
    console.log(`   ✓ 删除 ID: ${record.id}`);
  }

  // 3. 获取产线信息
  console.log('\n3. 查询W1总装车间的产线...');
  const productionLines = await prisma.productionLine.findMany({
    where: {
      workshopId: 6, // W1总装车间
      status: 'ACTIVE',
      deletedAt: null,
    },
  });

  console.log(`   ✓ 找到 ${productionLines.length} 条产线`);
  productionLines.forEach((line) => {
    console.log(`     - ID: ${line.id}, 编码: ${line.code}, 名称: ${line.name}`);
  });

  // 4. 获取班次信息
  console.log('\n4. 查询班次信息...');
  const shift = await prisma.shift.findUnique({
    where: { id: 1 },
  });

  console.log(`   ✓ 班次: ${shift?.name} (${shift?.code})`);

  // 5. 计算时间
  const startTime = new Date(targetDate);
  startTime.setHours(0, 0, 0, 0); // 00:00:00 UTC

  const endTime = new Date(targetDate);
  endTime.setHours(12, 0, 0, 0); // 12:00:00 UTC (含休息时间)

  console.log('\n5. 班次时间设置...');
  console.log(`   开始时间: ${startTime.toISOString()}`);
  console.log(`   结束时间: ${endTime.toISOString()}`);

  // 6. 重新创建LineShift记录
  console.log('\n6. 重新创建LineShift记录...');

  const createdRecords = [];

  for (const line of productionLines) {
    try {
      const lineShift = await prisma.lineShift.create({
        data: {
          orgId: line.orgId,
          orgName: line.orgName,
          lineId: line.id,
          shiftId: 1,
          shiftName: shift!.name,
          scheduleDate: targetDate,
          startTime: startTime,
          endTime: endTime,
          plannedProducts: JSON.stringify([]),
          participateInAllocation: true,
          status: 'ACTIVE',
          description: '系统自动创建 - 用于修复2026-03-15分摊问题',
        },
      });

      console.log(`   ✓ 创建成功: ${line.code} - ${line.name} (ID: ${lineShift.id}, scheduleDate: ${lineShift.scheduleDate.getTime()})`);
      createdRecords.push({
        id: lineShift.id,
        lineCode: line.code,
        lineName: line.name,
        scheduleDate: lineShift.scheduleDate.getTime(),
      });
    } catch (error: any) {
      console.error(`   ✗ 创建失败: ${line.code} - ${error.message}`);
    }
  }

  // 7. 验证结果
  console.log('\n7. 验证创建结果...');

  const allRecords = await prisma.lineShift.findMany({
    where: {
      scheduleDate: targetDate,
      shiftId: 1,
      status: 'ACTIVE',
      participateInAllocation: true,
      deletedAt: null,
    },
    include: {
      line: true,
    },
  });

  console.log(`   ✓ 2026-03-15 班次1的产线配置：`);
  console.log(`     总计: ${allRecords.length} 条记录`);
  allRecords.forEach((record) => {
    console.log(
      `     - ID: ${record.id}, 产线: ${record.line?.code || 'N/A'} (${record.line?.name || 'N/A'}), ` +
      `scheduleDate: ${record.scheduleDate.getTime()}, ` +
      `参与分摊: ${record.participateInAllocation ? '是' : '否'}`
    );
  });

  // 8. 总结
  console.log('\n========== 修复完成 ==========');
  console.log(`✓ 删除旧记录: ${existingRecords.length} 条`);
  console.log(`✓ 新创建记录: ${createdRecords.length} 条`);
  console.log(`✓ 当前总计: ${allRecords.length} 条`);

  console.log('\n✅ 问题已修复！');
  console.log('\n验证：');
  console.log(`- 时间戳正确: ${allRecords[0]?.scheduleDate.getTime() === targetTimestamp}`);
  console.log(`- 产线关联正确: ${allRecords.every(r => r.lineId !== null)}`);

  console.log('\n后续步骤：');
  console.log('1. 重新执行分摊计算（配置A0100001，日期2026-03-15）');
  console.log('2. 验证员工A00000111的分摊结果是否正确生成');
}

main()
  .catch((e) => {
    console.error('执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
