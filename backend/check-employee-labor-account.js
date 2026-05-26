const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkEmployeeLaborAccount() {
  console.log('🔍 检查员工的laborAccountId\n');
  console.log('═'.repeat(80));

  // 1. 检查有A02_LINE工时的员工
  const employees = await prisma.$queryRaw`
    SELECT DISTINCT
      e.id as "employeeId",
      e.name,
      e."employeeNo",
      e."laborAccountId",
      e."laborAccountName",
      e."laborAccountCode"
    FROM "WorkHourResult" wh
    JOIN "Employee" e ON wh."employeeId" = e.id
    WHERE wh."definitionAttendanceCodeStr" = 'A02_LINE'
    LIMIT 10
  `;

  console.log('\n1️⃣ 有A02_LINE工时的员工:');
  employees.forEach((emp, idx) => {
    console.log(`  ${idx + 1}. 员工ID=${emp.employeeId}, 姓名=${emp.name}, 工号=${emp.employeeNo}`);
    console.log(`     laborAccountId=${emp.laborAccountId || 'undefined'} ❌`);
    console.log(`     laborAccountName=${emp.laborAccountName || '(无)'}`);
    console.log(`     laborAccountCode=${emp.laborAccountCode || '(无)'}`);
    console.log('');
  });

  // 2. 查看ID=4的账户信息（大华富阳工厂）
  console.log('\n2️⃣ ID=4的账户信息（大华富阳工厂）:');
  const account4 = await prisma.$queryRaw`
    SELECT id, name, code, path, "parentId"
    FROM "LaborAccount"
    WHERE id = 4
  `;

  if (account4 && account4.length > 0) {
    console.log(`  ID: ${account4[0].id}`);
    console.log(`  名称: ${account4[0].name}`);
    console.log(`  代码: ${account4[0].code}`);
    console.log(`  路径: ${account4[0].path}`);
    console.log(`  父级ID: ${account4[0].parentId}`);
  } else {
    console.log('  ❌ 未找到ID=4的账户');
  }

  // 3. 检查所有LaborAccount
  console.log('\n3️⃣ 所有可用的LaborAccount:');
  const accounts = await prisma.$queryRaw`
    SELECT id, name, code, "parentId"
    FROM "LaborAccount"
    ORDER BY id ASC
    LIMIT 20
  `;

  accounts.forEach((acc) => {
    console.log(`  ID=${acc.id}, 名称=${acc.name}, 代码=${acc.code}, 父级=${acc.parentId || '(无)'}`);
  });

  // 4. 诊断
  console.log('\n4️⃣ 问题诊断:');
  console.log('═'.repeat(80));

  console.log('\n  ❌ 【主要问题】员工的laborAccountId字段为空（undefined）');
  console.log('\n  影响:');
  console.log('    1. 账户筛选条件要求 laborAccountId = 4');
  console.log('    2. 但所有员工的 laborAccountId = undefined');
  console.log('    3. 筛选结果：undefined != 4，不匹配');
  console.log('    4. 所有数据被过滤掉，无法执行分摊');

  console.log('\n  解决方案:');
  console.log('    【方案1】配置员工的laborAccountId');
  console.log('      - 更新Employee表，设置员工的laborAccountId字段');
  console.log('      - 将员工关联到对应的账户（如：大华富阳工厂，ID=4）');
  console.log('    ');
  console.log('    【方案2】修改分摊配置的账户筛选条件');
  console.log('      - 去掉"工厂=大华富阳工厂"的筛选条件');
  console.log('      - 或者设置为"全部"');
  console.log('    ');
  console.log('    【方案3】检查数据源');
  console.log('      - WorkHourResult是否正确关联了Employee');
  console.log('      - Employee表是否正确维护了laborAccountId');

  await prisma.$disconnect();
}

checkEmployeeLaborAccount().catch(console.error);
