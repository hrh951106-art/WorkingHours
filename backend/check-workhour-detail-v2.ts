import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkWorkHourAccountDetail() {
  const targetDate = new Date('2026-05-19');
  targetDate.setHours(0, 0, 0, 0);

  console.log('=== 查询工时记录的详细账户信息 ===\n');

  // 1. 查询WorkHourResult中的所有相关字段
  // 先查询该表单的员工信息��然后用OR条件查询工时记录
  console.log('1. 先查询表单信息:');
  const laborRequest = await prisma.laborHourReportRequest.findFirst({
    where: {
      requestNo: 'LABOR202606010835032538',
    },
    select: {
      id: true,
      reportDate: true,
      employeeNo: true,
    },
  });

  if (!laborRequest) {
    console.log('未找到表单');
    return;
  }

  console.log(`找到表单，reportDate: ${laborRequest.reportDate.toISOString().substring(0, 10)}, employeeNo: ${laborRequest.employeeNo}\n`);

  console.log('2. WorkHourResult表的字段数据 (使用OR条件查询):');
  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      OR: [
        {
          source: 'LABOR202606010835032538',
        },
        {
          sourceId: laborRequest.id,
        },
        {
          workDate: laborRequest.reportDate,
          employeeNo: laborRequest.employeeNo || '',
        },
      ],
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
  console.log('\n3. WorkHourResult与LaborAccount字段对应关系:');
  console.log('WorkHourResult字段 -> LaborAccount字段');
  console.log('  accountId (外键) -> id (主键)');
  console.log('  accountName -> name/code (账户名称/编码)');
  console.log('  accountPath -> path (账户路径)');
  console.log('  hierarchyValues (无此字段) -> hierarchyValues (层级值JSON)');

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
          console.log(`账户 ${account.id} (员工: ${result.employeeNo}) 的层级值:`);
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
  console.log('- 工时记录.accountId (外键) -> LaborAccount.id');
  console.log('- 工时记录.accountName (冗余字段) ≈ LaborAccount.name/code');
  console.log('- 工时记录.accountPath (冗余字段) ≈ LaborAccount.path');
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
