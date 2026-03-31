/**
 * 验证脚本：测试员工A0000011的分摊计算是否成功
 *
 * 修复内容：
 * - 已为2026-03-15班次1添加LineShift产线配置
 * - 现在执行分摊计算应该能够正常产生结果
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 验证LineShift修复结果 ==========\n');

  // 1. 验证LineShift记录
  console.log('1. 验证LineShift记录...');
  // 使用UTC时间创建日期，避免时区问题
  const targetDate = new Date('2026-03-15T00:00:00.000Z');

  const lineShifts = await prisma.lineShift.findMany({
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

  console.log(`   ✓ 找到 ${lineShifts.length} 条LineShift记录`);
  lineShifts.forEach((ls) => {
    console.log(`     - 产线: ${ls.line?.code} (${ls.line?.name}), 班次: ${ls.shiftName}`);
  });

  if (lineShifts.length === 0) {
    console.log('   ✗ 没有找到LineShift记录，修复失败！');
    return;
  }

  // 2. 验证员工工时记录
  console.log('\n2. 验证员工工时记录...');
  // 尝试多种员工编号格式
  const employeeNos = ['A0000011', 'A00000111'];

  let employee = null;
  let employeeNo = '';

  for (const no of employeeNos) {
    employee = await prisma.employee.findUnique({
      where: { employeeNo: no },
    });
    if (employee) {
      employeeNo = no;
      break;
    }
  }

  if (!employee) {
    console.log('   ✗ 未找到员工，尝试的编号: ' + employeeNos.join(', '));
    return;
  }

  console.log(`   ✓ 员工: ${employee.name} (${employee.employeeNo})`);
  console.log(`   ✓ 所属组织ID: ${employee.orgId}`);

  const calcResult = await prisma.calcResult.findFirst({
    where: {
      employeeNo: employeeNo,
      calcDate: targetDate,
    },
  });

  if (!calcResult) {
    console.log('   ✗ 未找到工时记录');
    return;
  }

  console.log(`   ✓ 工时记录: ${calcResult.actualHours} 小时`);
  console.log(`   ✓ 班次ID: ${calcResult.shiftId}, 出勤代码ID: ${calcResult.attendanceCodeId}`);

  // 3. 验证分摊配置
  console.log('\n3. 验证分摊配置...');
  const allocationConfig = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'A0100001',
      status: 'ACTIVE',
      deletedAt: null,
    },
  });

  if (!allocationConfig) {
    console.log('   ✗ 未找到分摊配置A0100001');
    return;
  }

  console.log(`   ✓ 配置: ${allocationConfig.configName} (ID: ${allocationConfig.id})`);

  // 4. 模拟分摊计算逻辑
  console.log('\n4. 模拟分摊计算逻辑...');

  // 4.1 获取该日期的活跃产线
  const activeLines = await prisma.lineShift.findMany({
    where: {
      scheduleDate: targetDate,
      status: 'ACTIVE',
      participateInAllocation: true,
      deletedAt: null,
    },
    include: {
      line: true,
    },
  });

  console.log(`   ✓ 当天活跃产线数量: ${activeLines.length}`);

  // 4.2 过滤班次产线
  const shiftLines = activeLines.filter((line) => line.shiftId === calcResult.shiftId);
  console.log(`   ✓ 班次${calcResult.shiftId}的产线数量: ${shiftLines.length}`);

  if (shiftLines.length === 0) {
    console.log('   ✗ 关键问题：班次在该日期没有产线配置！');
    console.log('   ✗ 分将被跳过，不会产生分摊结果');
    return;
  }

  console.log('   ✓ 产线配置正常，可以执行分摊');

  // 5. 检查现有分摊结果
  console.log('\n5. 检查现有分摊结果...');
  const allocationResults = await prisma.allocationResult.findMany({
    where: {
      configId: allocationConfig.id,
      recordDate: targetDate,
      sourceEmployeeNo: employeeNo,
      deletedAt: null,
    },
  });

  console.log(`   现有分摊结果数量: ${allocationResults.length}`);
  if (allocationResults.length > 0) {
    console.log('   分摊结果详情:');
    allocationResults.forEach((ar) => {
      console.log(
        `     - 目标: ${ar.targetName}, 分配工时: ${ar.allocatedHours}, 比例: ${ar.allocationRatio}`
      );
    });
  } else {
    console.log('   ℹ️  尚未执行分摊计算，或分摊未产生结果');
  }

  // 6. 总结
  console.log('\n========== 验证总结 ==========');
  console.log('✅ LineShift配置: 已修复');
  console.log(`   - 2026-03-15班次1有 ${lineShifts.length} 条产线配置`);
  console.log('✅ 员工工时记录: 正常');
  console.log(`   - 员工A0000011有 ${calcResult.actualHours} 小时工时`);
  console.log('✅ 分摊配置: 正常');
  console.log(`   - 配置${allocationConfig.configCode}状态为ACTIVE`);

  if (shiftLines.length > 0) {
    console.log('\n✅ 修复成功！可以执行分摊计算');
    console.log('\n建议操作：');
    console.log('1. 通过前端页面或API执行分摊计算');
    console.log('2. 配置ID: 20 (A0100001)');
    console.log('3. 日期: 2026-03-15');
    console.log('4. 验证分摊结果是否正确生成');
  } else {
    console.log('\n❌ 仍有问题：班次没有产线配置');
  }

  console.log('\nAPI调用示例:');
  console.log('POST /api/allocation/calculate');
  console.log('Content-Type: application/json');
  console.log(`Authorization: Bearer <YOUR_TOKEN>\n`);
  console.log(JSON.stringify({
    configId: 20,
    startDate: '2026-03-15',
    endDate: '2026-03-15',
  }, null, 2));
}

main()
  .catch((e) => {
    console.error('执行失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
