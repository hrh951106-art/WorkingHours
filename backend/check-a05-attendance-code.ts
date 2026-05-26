import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkA05() {
  console.log('=== 检查A05考勤代码 ===\n');

  // 1. 查找A05考勤代码定义
  console.log('1. 查找A05考勤代码定义:');
  const a05Codes = await prisma.attendanceCode.findMany({
    where: {
      OR: [
        { code: 'A05' },
        { name: { contains: 'A05' } }
      ]
    }
  });

  if (a05Codes.length === 0) {
    console.log('  ❌ 没有找到代码为A05的考勤代码');
  } else {
    console.log(`  找到 ${a05Codes.length} 条A05考勤代码:`);
    a05Codes.forEach((code) => {
      console.log(`\n  考勤代码ID: ${code.id}`);
      console.log(`    代码: ${code.code}`);
      console.log(`    名称: ${code.name}`);
      console.log(`    类型: ${code.type}`);
      console.log(`    是否间接工时: ${code.isIndirect ? '是' : '否'}`);
      console.log(`    状态: ${code.status}`);
    });
  }

  // 2. 检查所有间接工时考勤代码
  console.log('\n2. 检查所有间接工时考勤代码:');
  const indirectCodes = await prisma.attendanceCode.findMany({
    where: { isIndirect: true }
  });

  console.log(`  找到 ${indirectCodes.length} 条间接工时考勤代码:`);
  indirectCodes.forEach((code) => {
    console.log(`    ${code.code} - ${code.name} (${code.type})`);
  });

  // 3. 检查A05考勤代码的计算结果
  console.log('\n3. 检查A05考勤代码的计算结果:');
  const calcResults = await prisma.calcResult.findMany({
    where: { attendanceCode: 'A05' },
    orderBy: { calcDate: 'desc' },
    take: 10,
    include: { employee: true }
  });

  console.log(`  找到 ${calcResults.length} 条A05计算结果`);
  if (calcResults.length > 0) {
    calcResults.forEach((result, index) => {
      console.log(`\n  记录 ${index + 1}:`);
      console.log(`    员工: ${result.employeeNo} - ${result.employee.name}`);
      console.log(`    计算日期: ${result.calcDate}`);
      console.log(`    班次: ${result.shiftName || '未设置'}`);
      console.log(`    实际工时: ${result.actualHours}`);
      console.log(`    账户ID: ${result.accountId}`);
      console.log(`    账户名称: ${result.accountName}`);
    });
  } else {
    console.log('  ❌ 没有找到A05的计算结果');
  }

  // 4. 检查分配规则中的考勤代码配置
  console.log('\n4. 检查分配规则中配置的考勤代码:');
  const allRules = await prisma.allocationRuleConfig.findMany({
    where: { deletedAt: null }
  });

  console.log(`  检查 ${allRules.length} 条分配规则...`);
  allRules.forEach((rule) => {
    const attendanceCodes = JSON.parse(rule.allocationAttendanceCodes || '[]');
    if (attendanceCodes.length > 0) {
      console.log(`\n  规则ID ${rule.id} (${rule.ruleName || '未命名'}):`);
      console.log(`    配置的考勤代码: ${attendanceCodes.join(', ')}`);
    }
  });

  // 5. 检查最近是否有A05的分摊结果
  console.log('\n5. 检查A05的分摊结果:');
  const a05Allocations = await prisma.allocationResult.findMany({
    where: { attendanceCode: 'A05' },
    orderBy: { createTime: 'desc' },
    take: 10
  });

  console.log(`  找到 ${a05Allocations.length} 条A05分摊结果`);
  if (a05Allocations.length > 0) {
    a05Allocations.forEach((alloc, index) => {
      console.log(`\n  记录 ${index + 1}:`);
      console.log(`    批次号: ${alloc.batchNo}`);
      console.log(`    日期: ${alloc.recordDate}`);
      console.log(`    来源员工: ${alloc.sourceEmployeeNo}`);
      console.log(`    来源工时: ${alloc.sourceHours}`);
      console.log(`    分摊工时: ${alloc.allocatedHours}`);
      console.log(`    创建时间: ${alloc.createTime}`);
    });
  } else {
    console.log('  ❌ 没有找到A05的分摊结果');
  }

  console.log('\n=== 检查完成 ===');
}

checkA05()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
