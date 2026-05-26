import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCalcResultsByCode() {
  console.log('=== 检查各考勤代码的计算结果统计 ===\n');

  // 1. 获取所有考勤代码
  const allCodes = await prisma.attendanceCode.findMany({
    orderBy: { code: 'asc' }
  });

  console.log('1. 各考勤代码的计算结果统计:\n');

  let totalResults = 0;
  const codeStats: any[] = [];

  for (const code of allCodes) {
    const count = await prisma.calcResult.count({
      where: { attendanceCodeId: code.id }
    });

    totalResults += count;
    codeStats.push({
      code: code.code,
      name: code.name,
      count: count
    });
  }

  // 按数量排序
  codeStats.sort((a, b) => b.count - a.count);

  console.log(`总计算结果: ${totalResults} 条\n`);
  console.log('各考勤代码统计:');
  codeStats.forEach((stat, index) => {
    const status = stat.count === 0 ? '❌' : '✅';
    console.log(`  ${status} ${stat.code} (${stat.name}): ${stat.count} 条`);
  });

  // 2. 检查最近的计算结果
  console.log('\n2. 最近50条计算结果（按考勤代码分组）:');
  const recentResults = await prisma.calcResult.findMany({
    orderBy: { calcDate: 'desc' },
    take: 50,
    include: { employee: true }
  });

  // 按考勤代码分组
  const resultsByCode: any = {};
  recentResults.forEach(result => {
    const code = result.attendanceCode || 'UNKNOWN';
    if (!resultsByCode[code]) {
      resultsByCode[code] = [];
    }
    resultsByCode[code].push(result);
  });

  Object.keys(resultsByCode).sort().forEach(code => {
    const results = resultsByCode[code];
    console.log(`\n  ${code}: ${results.length} 条`);
    results.slice(0, 3).forEach((result, index) => {
      console.log(`    ${index + 1}. ${result.employeeNo} - ${result.employee.name}`);
      console.log(`       日期: ${result.calcDate.toISOString().split('T')[0]}`);
      console.log(`       工时: ${result.actualHours} (班次: ${result.shiftName || '未知'})`);
    });
    if (results.length > 3) {
      console.log(`    ... 还有 ${results.length - 3} 条`);
    }
  });

  // 3. 检查A04的考勤规则配置
  console.log('\n3. 检查A04考勤代码的详细配置:');
  const a04Code = allCodes.find(c => c.code === 'A04');
  if (a04Code) {
    console.log(`  考勤代码ID: ${a04Code.id}`);
    console.log(`  代码: ${a04Code.code}`);
    console.log(`  名称: ${a04Code.name}`);
    console.log(`  类型: ${a04Code.type}`);
    console.log(`  单位: ${a04Code.unit}`);
    console.log(`  是否计算工时: ${a04Code.calculateHours}`);
    console.log(`  是否在明细页显示: ${a04Code.showInDetailPage}`);
    console.log(`  是否扣用餐: ${a04Code.deductMeal}`);
    console.log(`  包含班外: ${a04Code.includeOutside}`);
    console.log(`  仅班外: ${a04Code.onlyOutside}`);
    console.log(`  状态: ${a04Code.status}`);
  }

  // 4. 检查考勤规则中是否配置了A04
  console.log('\n4. 检查考勤规则中A04的配置:');
  const attendanceRuleGroups = await prisma.attendanceRuleGroup.findMany({
    where: { deletedAt: null },
    include: { rules: true }
  });

  console.log(`  找到 ${attendanceRuleGroups.length} 个考勤规则组`);
  attendanceRuleGroups.forEach((group, index) => {
    console.log(`\n  规则组 ${index + 1}: ${group.name}`);
    console.log(`    描述: ${group.description || '无'}`);
    console.log(`    规则数量: ${group.rules.length}`);

    // 检查规则中是否引用了A04
    const rulesWithA04 = group.rules.filter((rule: any) => {
      const codes = JSON.parse(rule.attendanceCodeIds || '[]');
      return codes.includes(a04Code?.id);
    });

    if (rulesWithA04.length > 0) {
      console.log(`    ✅ 包含A04的规则: ${rulesWithA04.length} 条`);
      rulesWithA04.forEach((rule: any) => {
        const codes = JSON.parse(rule.attendanceCodeIds || '[]');
        console.log(`      - 规则ID ${rule.id}: ${rule.name}`);
        console.log(`        考勤代码: ${codes.join(', ')}`);
      });
    } else {
      console.log(`    ❌ 没有包含A04的规则`);
    }
  });

  console.log('\n=== 检查完成 ===');
}

checkCalcResultsByCode()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
