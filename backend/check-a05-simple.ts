import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkA05Problem() {
  console.log('=== 排查A05间接工时规则没有计算出分摊结果的原因 ===\n');

  // 1. 查找所有考勤代码
  console.log('1. 查找所有考勤代码:');
  const allCodes = await prisma.attendanceCode.findMany({
    orderBy: { code: 'asc' }
  });

  const a05Code = allCodes.find(c => c.code === 'A05');
  if (!a05Code) {
    console.log('  ❌ 没有找到代码为A05的考勤代码');
    console.log(`  所有考勤代码: ${allCodes.map(c => c.code).join(', ')}`);
  } else {
    console.log(`  找到A05考勤代码: ${a05Code.code} - ${a05Code.name}`);
    console.log(`  类型: ${a05Code.type}`);
    console.log(`  状态: ${a05Code.status}`);
  }

  // 2. 检查A05的计算结果
  console.log('\n2. 检查A05考勤代码的计算结果:');
  const a05CalcResults = await prisma.calcResult.findMany({
    where: { attendanceCode: 'A05' },
    orderBy: { calcDate: 'desc' },
    take: 5,
    include: { employee: true }
  });

  console.log(`  找到 ${a05CalcResults.length} 条A05计算结果`);
  if (a05CalcResults.length > 0) {
    a05CalcResults.forEach((result, index) => {
      console.log(`\n  记录 ${index + 1}:`);
      console.log(`    员工: ${result.employeeNo} - ${result.employee.name}`);
      console.log(`    计算日期: ${result.calcDate.toISOString().split('T')[0]}`);
      console.log(`    班次ID: ${result.shiftId}`);
      console.log(`    实际工时: ${result.actualHours}`);
      console.log(`    账户ID: ${result.accountId}`);
      console.log(`    账户名称: ${result.accountName}`);
    });
  } else {
    console.log('  ❌ 没有A05的计算结果，这是第一个可能的原因');
  }

  // 3. 检查分配规则中是否配置了A05
  console.log('\n3. 检查分配规则配置:');
  const allRules = await prisma.allocationRuleConfig.findMany({
    where: { deletedAt: null, status: 'ACTIVE' },
    include: { config: true }
  });

  console.log(`  找到 ${allRules.length} 条激活的分配规则`);
  let rulesWithA05 = 0;
  allRules.forEach((rule) => {
    const attendanceCodes = JSON.parse(rule.allocationAttendanceCodes || '[]');
    if (attendanceCodes.length > 0) {
      console.log(`\n  规则ID ${rule.id} (${rule.ruleName}):`);
      console.log(`    配置的考勤代码: ${attendanceCodes.join(', ')}`);
      if (attendanceCodes.includes('A05')) {
        rulesWithA05++;
        console.log(`    ✅ 包含A05`);
      }
    } else {
      console.log(`\n  规则ID ${rule.id} (${rule.ruleName}): 未配置考勤代码过滤`);
    }
  });

  if (rulesWithA05 === 0) {
    console.log('\n  ❌ 没有任何规则配置了A05考勤代码，这是关键问题！');
  }

  // 4. 检查A05的分摊结果
  console.log('\n4. 检查A05的分摊结果:');
  const a05Allocations = await prisma.allocationResult.findMany({
    where: { attendanceCode: 'A05' },
    orderBy: { createTime: 'desc' },
    take: 5
  });

  console.log(`  找到 ${a05Allocations.length} 条A05分摊结果`);
  if (a05Allocations.length === 0) {
    console.log('  ❌ 确认没有A05的分摊结果');
  } else {
    a05Allocations.forEach((alloc, index) => {
      console.log(`\n  记录 ${index + 1}:`);
      console.log(`    批次号: ${alloc.batchNo}`);
      console.log(`    日期: ${alloc.recordDate.toISOString().split('T')[0]}`);
      console.log(`    来源员工: ${alloc.sourceEmployeeNo}`);
      console.log(`    分摊工时: ${alloc.allocatedHours}`);
    });
  }

  // 5. 检查最近一次分摊计算
  console.log('\n5. 检查最近的分摊计算:');
  const recentAllocations = await prisma.allocationResult.findMany({
    distinct: ['batchNo'],
    orderBy: { createTime: 'desc' },
    take: 3,
    select: {
      batchNo: true,
      recordDate: true,
      createTime: true
    }
  });

  console.log(`  最近的 ${recentAllocations.length} 次分摊计算:`);
  recentAllocations.forEach((alloc, index) => {
    console.log(`\n  批次 ${index + 1}:`);
    console.log(`    批次号: ${alloc.batchNo}`);
    console.log(`    计算日期: ${alloc.recordDate.toISOString().split('T')[0]}`);
    console.log(`    计算时间: ${alloc.createTime.toISOString().split('T')[0]}`);
  });

  // 总结
  console.log('\n=== 问题总结 ===');
  console.log('根据以上检查，A05没有计算出分摊结果可能的原因:');
  console.log(`1. ${!a05Code ? '❌' : '✅'} A05考勤代码是否存在`);
  console.log(`2. ${a05CalcResults.length === 0 ? '❌' : '✅'} 是否有A05的计算结果`);
  console.log(`3. ${rulesWithA05 === 0 ? '❌' : '✅'} 分配规则是否配置了A05`);
  console.log(`4. ${a05Allocations.length === 0 ? '❌' : '✅'} 是否有A05的分摊结果`);

  if (!a05Code) {
    console.log('\n💡 主要问题: A05考勤代码不存在');
  } else if (a05CalcResults.length === 0) {
    console.log('\n💡 主要问题: 没有A05的计算结果，无法进行分摊');
  } else if (rulesWithA05 === 0) {
    console.log('\n💡 主要问题: 分配规则没有配置A05考勤代码，即使有计算结果也不会分摊');
  } else if (a05Allocations.length === 0) {
    console.log('\n💡 主要问题: 有配置也有计算结果，但没有分摊结果，可能是分摊计算逻辑问题');
  } else {
    console.log('\n💡 A05有分摊结果，请检查具体数据是否符合预期');
  }
}

checkA05Problem()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
