const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkWorkHourAccount() {
  console.log('🔍 检查WorkHourResult的accountId\n');
  console.log('═'.repeat(80));

  // 1. 查询A02_LINE的工时数据及其accountId
  const workHours = await prisma.$queryRaw`
    SELECT
      id,
      "employeeNo",
      "calcDate",
      "definitionAttendanceCodeStr",
      "workHours",
      "accountId",
      "accountName",
      status
    FROM "WorkHourResult"
    WHERE "definitionAttendanceCodeStr" = 'A02_LINE'
    LIMIT 10
  `;

  console.log('\n1️⃣ A02_LINE工时数据的账户信息:');
  let hasUndefinedAccount = false;
  let hasValidAccount = false;

  workHours.forEach((wh, idx) => {
    console.log(`  ${idx + 1}. ${wh.calcDate.toISOString().split('T')[0]} | ${wh.employeeNo} | ${wh.definitionAttendanceCodeStr} | ${wh.workHours}h`);
    console.log(`     accountId: ${wh.accountId || 'undefined'} ${wh.accountId === 4 ? '✅' : (wh.accountId === null ? '❌' : '')}`);
    console.log(`     accountName: ${wh.accountName || '(无)'}`);
    console.log('');

    if (!wh.accountId) hasUndefinedAccount = true;
    if (wh.accountId === 4) hasValidAccount = true;
  });

  // 2. 统计
  console.log('\n2️⃣ 统计信息:');
  console.log(`  总记录数: ${workHours.length}`);
  console.log(`  accountId为null: ${hasUndefinedAccount ? '是 ❌' : '否'}`);
  console.log(`  accountId=4: ${hasValidAccount ? '有 ✅' : '无'}`);

  // 3. 检查其他出勤代码的accountId
  console.log('\n3️⃣ 其他出勤代码的accountId情况:');

  const allCodes = await prisma.$queryRaw`
    SELECT
      "definitionAttendanceCodeStr",
      COUNT(*) as count,
      COUNT("accountId") as with_account,
      COUNT(CASE WHEN "accountId" = 4 THEN 1 END) as account_4_count
    FROM "WorkHourResult"
    GROUP BY "definitionAttendanceCodeStr"
    ORDER BY count DESC
  `;

  allCodes.forEach((stat) => {
    console.log(`  ${stat.definitionAttendanceCodeStr}: ${stat.count}条, 有accountId=${stat.with_account}, accountId=4=${stat.account_4_count}条`);
  });

  // 4. 查询ID=4的账户
  console.log('\n4️⃣ ID=4的账户信息:');
  const account4 = await prisma.$queryRaw`
    SELECT id, name, code, path
    FROM "LaborAccount"
    WHERE id = 4
  `;

  if (account4 && account4.length > 0) {
    console.log(`  ID: ${account4[0].id}`);
    console.log(`  名称: ${account4[0].name}`);
    console.log(`  代码: ${account4[0].code}`);
    console.log(`  路径: ${account4[0].path}`);
  }

  // 5. 诊断
  console.log('\n5️⃣ 问题诊断:');
  console.log('═'.repeat(80));

  if (hasUndefinedAccount) {
    console.log('  ❌ 【主要问题】WorkHourResult的accountId字段为null');
    console.log('\n  影响:');
    console.log('    - 账户筛选条件要求: accountId = 4 (大华富阳工厂)');
    console.log('    - 实际情况: WorkHourResult.accountId = null');
    console.log('    - 筛选结果: null != 4, 不匹配');
    console.log('    - 所有数据被过滤掉');
    console.log('\n  解决方案:');
    console.log('    【方案1】填充WorkHourResult的accountId字段');
    console.log('      - 根据员工的组织关系，设置正确的accountId');
    console.log('      - 确保accountId=4（大华富阳工厂）的记录存在');
    console.log('    ');
    console.log('    【方案2】去掉分摊配置中的账户筛选条件');
    console.log('      - 修改A03分摊配置的"工时归属"');
    console.log('      - 不要限制"工厂=大华富阳工厂"');
    console.log('      - 改为"全部"或留空');
  } else if (hasValidAccount) {
    console.log('  ✅ 有accountId=4的数据，应该可以正常分摊');
    console.log('  请检查是否真的执行过分摊计算');
  } else {
    console.log('  ⚠️  有accountId但都不是4，可能是配置问题');
  }

  await prisma.$disconnect();
}

checkWorkHourAccount().catch(console.error);
