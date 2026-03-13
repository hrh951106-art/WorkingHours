import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAccountAllocation() {
  console.log('========================================');
  console.log('验证按账户统计的工时分摊');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');

  // 1. 获取直接工时记录（按账户统计）
  const generalConfig = await prisma.allocationGeneralConfig.findFirst();
  const actualHoursCode = await prisma.attendanceCode.findUnique({
    where: { code: generalConfig?.actualHoursAllocationCode || 'I03' },
  });

  if (!actualHoursCode) {
    console.log('❌ 未找到直接工时代码');
    return;
  }

  const directResults = await prisma.calcResult.findMany({
    where: {
      calcDate,
      attendanceCodeId: actualHoursCode.id,
    },
    include: {
      employee: true,
    },
    orderBy: [
      { employeeNo: 'asc' },
    ],
  });

  // 2. 建立账户到产线的映射
  const lines = await prisma.productionLine.findMany({
    where: {
      deletedAt: null,
    },
  });

  const linePatterns: Record<string, any> = {};
  lines.forEach(line => {
    linePatterns[line.name] = line;
    linePatterns[line.orgName] = line;
    const match = line.name.match(/L(\d)产线/);
    if (match) {
      const num = match[1];
      linePatterns[`L${num}线体`] = line;
    }
  });

  const accountIds = [...new Set(directResults.map(r => r.accountId).filter(id => id !== null))];
  const accounts = await prisma.laborAccount.findMany({
    where: {
      id: { in: accountIds as number[] },
    },
  });

  const accountToLine: Record<number, any> = {};
  accounts.forEach(acc => {
    const pathParts = acc.name.split('/');
    for (const part of pathParts) {
      if (linePatterns[part]) {
        accountToLine[acc.id] = linePatterns[part];
        break;
      }
    }
  });

  // 3. 按员工和账户统计工时
  console.log('========================================');
  console.log('按员工和账户统计直接工时');
  console.log('========================================\n');

  const byEmployeeAccount: Record<string, Record<number, number>> = {};

  directResults.forEach(r => {
    const empKey = `${r.employeeNo} ${r.employee?.name || ''}`;
    if (!byEmployeeAccount[empKey]) {
      byEmployeeAccount[empKey] = {};
    }
    if (r.accountId) {
      byEmployeeAccount[empKey][r.accountId] = (byEmployeeAccount[empKey][r.accountId] || 0) + r.actualHours;
    }
  });

  Object.entries(byEmployeeAccount).forEach(([empKey, empAccounts]) => {
    console.log(`${empKey}:`);
    let empTotal = 0;
    Object.entries(empAccounts).forEach(([accountId, hours]) => {
      const line = accountToLine[+accountId];
      const account = accounts.find((a: any) => a.id === +accountId);
      console.log(`  账户 ${accountId}: ${hours}h → ${line ? line.name : '未映射产线'}`);
      if (account) {
        console.log(`    (${account.name})`);
      }
      empTotal += hours;
    });
    console.log(`  总计: ${empTotal}h\n`);
  });

  // 4. 按产线汇总
  console.log('========================================');
  console.log('按产线汇总直接工时');
  console.log('========================================\n');

  const hoursByLine: Record<number, { hours: number; employees: string[] }> = {};

  directResults.forEach(r => {
    if (r.accountId && accountToLine[r.accountId]) {
      const line = accountToLine[r.accountId];
      if (!hoursByLine[line.id]) {
        hoursByLine[line.id] = { hours: 0, employees: [] };
      }
      hoursByLine[line.id].hours += r.actualHours;
      if (!hoursByLine[line.id].employees.includes(r.employeeNo)) {
        hoursByLine[line.id].employees.push(r.employeeNo);
      }
    }
  });

  let totalHours = 0;
  Object.entries(hoursByLine).forEach(([lineId, data]) => {
    const line = Object.values(accountToLine).find((l: any) => l.id === +lineId) as any;
    console.log(`${line.name}:`);
    console.log(`  直接工时: ${data.hours}h`);
    console.log(`  涉及员工: ${data.employees.join(', ')}`);
    totalHours += data.hours;
  });
  console.log(`\n总计: ${totalHours}h`);

  console.log('\n========================================');
}

verifyAccountAllocation()
  .catch((e) => {
    console.error('验证失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
