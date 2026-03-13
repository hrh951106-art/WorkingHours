import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function buildAccountToLineMap() {
  console.log('========================================');
  console.log('建立账户到产线的映射关系');
  console.log('========================================\n');

  // 1. 获取所有产线
  const lines = await prisma.productionLine.findMany({
    where: {
      deletedAt: null,
    },
  });

  console.log(`产线总数: ${lines.length}\n`);

  // 2. 建立产线名称映射（支持多种匹配模式）
  const linePatterns: Record<string, any> = {};

  lines.forEach(line => {
    // 产线名称作为匹配模式
    linePatterns[line.name] = line;
    linePatterns[line.orgName] = line;

    // 也支持 "L1线体" → "L1产线" 的映射
    const match = line.name.match(/L(\d)产线/);
    if (match) {
      const num = match[1];
      linePatterns[`L${num}线体`] = line;
    }
  });

  console.log('产线匹配模式:');
  Object.keys(linePatterns).forEach(pattern => {
    const line = linePatterns[pattern];
    console.log(`  "${pattern}" → ${line.name} (ID: ${line.id})`);
  });
  console.log();

  // 3. 获取所有劳动力账户
  const accounts = await prisma.laborAccount.findMany({
    where: {
      status: 'ACTIVE',
    },
  });

  console.log(`劳动力账户总数: ${accounts.length}\n`);

  // 4. 从账户名称中提取产线信息并建立映射
  const accountToLine: Record<number, any> = {};
  const unmatchedAccounts: any[] = [];

  accounts.forEach(acc => {
    // 从账户名称路径中提取产线标识
    // 格式：富阳工厂/W1总装车间/L1线体////直接设备
    const pathParts = acc.name.split('/');
    let matchedLine = null;

    // 尝试匹配路径中的每个部分
    for (const part of pathParts) {
      if (linePatterns[part]) {
        matchedLine = linePatterns[part];
        break;
      }
    }

    if (matchedLine) {
      accountToLine[acc.id] = matchedLine;
    } else if (acc.type === 'SUB') {
      // 只记录子账户（实际工时账户）
      unmatchedAccounts.push({
        id: acc.id,
        name: acc.name,
        pathParts,
      });
    }
  });

  console.log('========================================');
  console.log('账户到产线的映射结果');
  console.log('========================================\n');

  const mappedCount = Object.keys(accountToLine).length;
  console.log(`已映射账户: ${mappedCount}`);
  console.log(`未映射账户: ${unmatchedAccounts.length}`);

  if (unmatchedAccounts.length > 0 && unmatchedAccounts.length < 20) {
    console.log('\n未映射的账户（前10个）:');
    unmatchedAccounts.slice(0, 10).forEach(acc => {
      console.log(`  ${acc.name}`);
      console.log(`    路径部分: ${acc.pathParts.join(', ')}`);
    });
  }
  console.log();

  // 5. 验证映射关系
  console.log('========================================');
  console.log('验证映射关系（按产线统计账户）');
  console.log('========================================\n');

  const lineAccounts: Record<number, any[]> = {};
  Object.entries(accountToLine).forEach(([accountId, line]) => {
    if (!lineAccounts[line.id]) {
      lineAccounts[line.id] = [];
    }
    lineAccounts[line.id].push(accountId);
  });

  Object.entries(lineAccounts).forEach(([lineId, accountIds]) => {
    const line = Object.values(accountToLine).find((l: any) => l.id === +lineId) as any;
    console.log(`${line.name} (ID: ${lineId}):`);
    console.log(`  关联账户数: ${accountIds.length}`);
    console.log(`  账户ID: ${accountIds.join(', ')}`);
  });
  console.log();

  // 6. 测试统计直接工时
  console.log('========================================');
  console.log('测试：按账户统计产线直接工时');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');
  const generalConfig = await prisma.allocationGeneralConfig.findFirst();
  const actualHoursCode = await prisma.attendanceCode.findUnique({
    where: { code: generalConfig?.actualHoursAllocationCode || 'I03' },
  });

  if (actualHoursCode) {
    const directResults = await prisma.calcResult.findMany({
      where: {
        calcDate,
        attendanceCodeId: actualHoursCode.id,
      },
    });

    // 按账户统计
    const hoursByAccount: Record<number, number> = {};
    directResults.forEach(r => {
      if (r.accountId) {
        hoursByAccount[r.accountId] = (hoursByAccount[r.accountId] || 0) + r.actualHours;
      }
    });

    console.log('按账户统计直接工时:');
    Object.entries(hoursByAccount).forEach(([accountId, hours]) => {
      const line = accountToLine[+accountId];
      console.log(`  账户 ${accountId}: ${hours}h → ${line ? line.name : '未映射产线'}`);
    });
    console.log();

    // 按产线汇总
    const hoursByLine: Record<number, number> = {};
    directResults.forEach(r => {
      if (r.accountId && accountToLine[r.accountId]) {
        const line = accountToLine[r.accountId];
        hoursByLine[line.id] = (hoursByLine[line.id] || 0) + r.actualHours;
      }
    });

    console.log('按产线汇总直接工时:');
    let totalHours = 0;
    Object.entries(hoursByLine).forEach(([lineId, hours]) => {
      const line = Object.values(accountToLine).find((l: any) => l.id === +lineId) as any;
      console.log(`  ${line.name}: ${hours}h`);
      totalHours += hours;
    });
    console.log(`  总计: ${totalHours}h`);
  }

  console.log('\n========================================');
  return accountToLine;
}

buildAccountToLineMap()
  .catch((e) => {
    console.error('失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
