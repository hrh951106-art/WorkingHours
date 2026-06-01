import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkWorkHourAccountDetail() {
  const formNo = 'LABOR202606010835032538';

  console.log('=== 查询工时记录的详细账户信息 ===\n');

  // 1. 查询WorkHourResult中的所有相关字段
  console.log('1. WorkHourResult表的字段��据:');
  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      source: formNo,
    },
    select: {
      id: true,
      employeeNo: true,
      employeeId: true,
      workDate: true,
      workHours: true,
      amount: true,
      attendanceCode: true,
      attendanceCodeName: true,
      calcAttendanceCode: true,
      accountId: true,
      accountName: true,
      accountPath: true,
      sourceType: true,
      sourceId: true,
      source: true,
      sourceBatchId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  console.log(`找到 ${workHourResults.length} 条记录\n`);

  for (let i = 0; i < workHourResults.length; i++) {
    const result = workHourResults[i];
    console.log(`记录 ${i + 1}:`);
    console.log(`  id: ${result.id}`);
    console.log(`  employeeNo: ${result.employeeNo}`);
    console.log(`  employeeId: ${result.employeeId || 'NULL'}`);
    console.log(`  workDate: ${result.workDate.toISOString()}`);
    console.log(`  workHours: ${result.workHours}`);
    console.log(`  amount: ${result.amount || 'NULL'}`);
    console.log(`  attendanceCode: ${result.attendanceCode || 'NULL'}`);
    console.log(`  attendanceCodeName: ${result.attendanceCodeName || 'NULL'}`);
    console.log(`  calcAttendanceCode: ${result.calcAttendanceCode || 'NULL'}`);
    console.log(`  accountId: ${result.accountId || 'NULL'}`);
    console.log(`  accountName: ${result.accountName || 'NULL'}`);
    console.log(`  accountPath: ${result.accountPath || 'NULL'}`);
    console.log(`  sourceType: ${result.sourceType || 'NULL'}`);
    console.log(`  sourceId: ${result.sourceId || 'NULL'}`);
    console.log(`  source: ${result.source || 'NULL'}`);
    console.log(`  sourceBatchId: ${result.sourceBatchId || 'NULL'}`);
    console.log(`  status: ${result.status}`);
    console.log(`  createdAt: ${result.createdAt.toISOString()}`);
    console.log(`  updatedAt: ${result.updatedAt.toISOString()}`);
    console.log('');
  }

  // 2. 查询对应的LaborAccount表信息
  console.log('\n2. 关联的LaborAccount表信息:');
  const accountIds = workHourResults
    .map(r => r.accountId)
    .filter((id): id is number => id !== null);

  if (accountIds.length > 0) {
    const uniqueAccountIds = [...new Set(accountIds)];
    console.log(`查询 ${uniqueAccountIds.length} 个唯一账户\n`);

    const accounts = await prisma.laborAccount.findMany({
      where: {
        id: { in: uniqueAccountIds },
      },
      select: {
        id: true,
        employeeId: true,
        type: true,
        name: true,
        code: true,
        level: true,
        path: true,
        hierarchyValues: true,
        status: true,
        effectiveDate: true,
        expiryDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    for (const account of accounts) {
      console.log(`账户 ID: ${account.id}`);
      console.log(`  employeeId: ${account.employeeId || 'NULL'}`);
      console.log(`  type: ${account.type}`);
      console.log(`  name: ${account.name}`);
      console.log(`  code: ${account.code}`);
      console.log(`  level: ${account.level}`);
      console.log(`  path: ${account.path || 'NULL'}`);
      console.log(`  hierarchyValues: ${account.hierarchyValues || 'NULL'}`);
      console.log(`  status: ${account.status}`);
      console.log(`  effectiveDate: ${account.effectiveDate.toISOString()}`);
      console.log(`  expiryDate: ${account.expiryDate ? account.expiryDate.toISOString() : 'NULL'}`);
      console.log(`  createdAt: ${account.createdAt.toISOString()}`);
      console.log(`  updatedAt: ${account.updatedAt.toISOString()}`);
      console.log('');
    }
  }

  // 3. 对比分析
  console.log('\n3. WorkHourResult与LaborAccount字段对比:');
  console.log('WorkHourResult表字段 -> LaborAccount表字段');
  console.log('  accountId (关联外键) -> id (主键)');
  console.log('  accountName -> name/code (账户名称/编码)');
  console.log('  accountPath -> path (账户路径)');
  console.log('  hierarchyValues (无) -> hierarchyValues (层级值JSON)');

  // 4. 检查hierarchyValues的详细内容
  console.log('\n4. 解析hierarchyValues层级值:');
  for (const result of workHourResults) {
    if (result.accountId) {
      const account = await prisma.laborAccount.findFirst({
        where: { id: result.accountId },
        select: { id: true, hierarchyValues: true },
      });

      if (account && account.hierarchyValues) {
        try {
          const hierarchyValues = JSON.parse(account.hierarchyValues);
          console.log(`账户 ${account.id} 的层级值:`);
          hierarchyValues.forEach((hv: any) => {
            console.log(`  Level ${hv.level} (${hv.name}): ${JSON.stringify(hv.selectedValue)}`);
          });
          console.log('');
        } catch (e) {
          console.log(`  解析失败: ${e}`);
        }
      }
    }
  }

  // 5. 总结
  console.log('\n=== 总结 ===');
  console.log(`WorkHourResult记录数: ${workHourResults.length}`);
  console.log(`涉及的唯一账户数: ${[...new Set(accountIds)].length}`);
  console.log('\n关键字段映射:');
  console.log('- 工时记录的账户ID (accountId) 指向 LaborAccount.id');
  console.log('- 工时记录的账户名称 (accountName) 对应 LaborAccount.name/code');
  console.log('- 工时记录的账户路径 (accountPath) 对应 LaborAccount.path');
  console.log('- LaborAccount.hierarchyValues 包含完整的层级筛选信息');
}

checkWorkHourAccountDetail()
  .then(() => {
    console.log('\n查询完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('查询失败:', error);
    process.exit(1);
  });
