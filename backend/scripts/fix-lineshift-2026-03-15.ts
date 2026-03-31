/**
 * 修复脚本：为2026-03-15添加LineShift产线配置
 *
 * 问题描述：
 * 员工A0000011在2026-03-15使用班次1（早班）进行分摊时，由于LineShift表中
 * 没有该日期该班次的产线配置，导致分摊失败。
 *
 * 解决方案：
 * 为2026-03-15的班次1添加LineShift记录，配置L1和L2产线。
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 开始修复LineShift缺失问题 ==========');

  // 1. 检查是否已存在2026-03-15的LineShift记录
  const targetDate = new Date('2026-03-15');
  targetDate.setHours(0, 0, 0, 0);

  console.log(`\n1. 检查 ${targetDate.toISOString().split('T')[0]} 的LineShift记录...`);

  const existingRecords = await prisma.lineShift.findMany({
    where: {
      scheduleDate: targetDate,
      shiftId: 1,
      deletedAt: null,
    },
  });

  if (existingRecords.length > 0) {
    console.log(`  ⚠️  已存在 ${existingRecords.length} 条记录：`);
    existingRecords.forEach((record) => {
      console.log(`     - ID: ${record.id}, 组织: ${record.orgName}, 产线ID: ${record.lineId}, 班次: ${record.shiftName}`);
    });
    console.log('\n是否需要删除这些记录并重新创建？(输入y删除，其他键跳过)');

    // 在实际执行时，建议先检查，避免覆盖已有数据
    console.log('  ℹ️  脚本将保留现有记录，仅添加缺失的配置\n');
  } else {
    console.log('  ✓ 没有现有记录，将继续创建\n');
  }

  // 2. 获取产线信息
  console.log('2. 查询W1总装车间的产线...');
  const productionLines = await prisma.productionLine.findMany({
    where: {
      workshopId: 6, // W1总装车间
      status: 'ACTIVE',
      deletedAt: null,
    },
  });

  console.log(`  ✓ 找到 ${productionLines.length} 条产线：`);
  productionLines.forEach((line) => {
    console.log(`     - ID: ${line.id}, 编码: ${line.code}, 名称: ${line.name}`);
  });

  if (productionLines.length === 0) {
    console.error('  ✗ 未找到W1总装车间的产线，脚本终止');
    return;
  }

  // 3. 获取班次信息
  console.log('\n3. 查询班次1（早班）信息...');
  const shift = await prisma.shift.findUnique({
    where: { id: 1 },
  });

  if (!shift) {
    console.error('  ✗ 未找到班次1，脚本终止');
    return;
  }

  console.log(`  ✓ 班次: ${shift.name} (${shift.code})`);
  console.log(`     标准工时: ${shift.standardHours}小时, 休息时间: ${shift.breakHours}小时`);

  // 4. 计算开始和结束时间
  // 早班：8:00 - 17:30（8小时工作 + 1.5小时休息）
  const startTime = new Date(targetDate);
  startTime.setHours(8, 0, 0, 0); // 08:00:00

  const endTime = new Date(targetDate);
  endTime.setHours(20, 0, 0, 0); // 20:00:00（含休息时间）

  console.log('\n4. 计算班次时间...');
  console.log(`  开始时间: ${startTime.toISOString()}`);
  console.log(`  结束时间: ${endTime.toISOString()}`);

  // 5. 创建LineShift记录
  console.log('\n5. 开始创建LineShift记录...');

  const createdRecords = [];
  const skippedRecords = [];

  for (const line of productionLines) {
    // 检查是否已存在该产线的配置
    const existing = await prisma.lineShift.findFirst({
      where: {
        orgId: line.orgId,
        shiftId: 1,
        scheduleDate: targetDate,
        lineId: line.id,
        deletedAt: null,
      },
    });

    if (existing) {
      console.log(`  ⊘ 跳过产线 ${line.code}（已存在配置）`);
      skippedRecords.push(line.code);
      continue;
    }

    try {
      const lineShift = await prisma.lineShift.create({
        data: {
          orgId: line.orgId,
          orgName: line.orgName,
          lineId: line.id,
          shiftId: 1,
          shiftName: shift.name,
          scheduleDate: targetDate,
          startTime: startTime,
          endTime: endTime,
          plannedProducts: JSON.stringify([]), // 空的计划产品列表
          participateInAllocation: true, // 参与分摊
          status: 'ACTIVE',
          description: `系统自动创建 - 用于修复${targetDate.toISOString().split('T')[0]}分摊问题`,
        },
      });

      console.log(`  ✓ 创建成功: ${line.code} - ${line.name} (ID: ${lineShift.id})`);
      createdRecords.push({
        id: lineShift.id,
        lineCode: line.code,
        lineName: line.name,
      });
    } catch (error: any) {
      console.error(`  ✗ 创建失败: ${line.code} - ${error.message}`);
    }
  }

  // 6. 验证结果
  console.log('\n6. 验证创建结果...');

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

  console.log(`  ✓ ${targetDate.toISOString().split('T')[0]} 班次1（早班）的产线配置：`);
  console.log(`     总计: ${allRecords.length} 条记录`);
  allRecords.forEach((record) => {
    console.log(
      `     - 产线: ${record.line?.code || 'N/A'} (${record.line?.name || 'N/A'}), ` +
      `参与分摊: ${record.participateInAllocation ? '是' : '否'}, ` +
      `状态: ${record.status}`
    );
  });

  // 7. 总结
  console.log('\n========== 修复完成 ==========');
  console.log(`✓ 新创建记录: ${createdRecords.length} 条`);
  console.log(`⊘ 跳过记录: ${skippedRecords.length} 条（已存在）`);
  console.log(`✓ 当前总计: ${allRecords.length} 条`);

  if (createdRecords.length > 0) {
    console.log('\n✅ 问题已修复！');
    console.log('\n后续步骤：');
    console.log('1. 重新执行分摊计算（配置A0100001，日期2026-03-15）');
    console.log('2. 验证员工A0000011的分摊结果是否正确生成');
    console.log('\nAPI请求示例：');
    console.log(`POST /api/allocation/calculate`);
    console.log(`{`);
    console.log(`  "configId": 20,`);
    console.log(`  "startDate": "2026-03-15",`);
    console.log(`  "endDate": "2026-03-15"`);
    console.log(`}`);
  } else {
    console.log('\n⚠️  未创建新记录');
    if (allRecords.length > 0) {
      console.log('   配置已存在，可以正常执行分摊计算');
    } else {
      console.log('   请检查产线数据是否正确');
    }
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
