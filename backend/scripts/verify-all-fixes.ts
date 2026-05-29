import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 验证所有修复 ===\n');

  // 1. 验证 PERSONAL_PRODUCTION 类型
  console.log('1. 验证 PERSONAL_PRODUCTION 类型:\n');

  const personalProductionResults = await prisma.workHourResult.findMany({
    where: { sourceType: 'PERSONAL_PRODUCTION' },
    select: {
      id: true,
      employeeNo: true,
      definitionAttendanceCodeId: true,
      definitionAttendanceCodeStr: true,
      accountId: true,
      accountName: true,
      accountPath: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log(\);

  if (personalProductionResults.length > 0) {
    const defCodes = await prisma.definitionAttendanceCode.findMany({
      where: {
        id: { in: personalProductionResults.map(r => r.definitionAttendanceCodeId).filter((id): id is number => id !== null) },
      },
      select: { id: true, code: true, name: true },
    });

    let correctCodeCount = 0;
    let correctPathCount = 0;

    personalProductionResults.forEach(result => {
      const defCode = defCodes.find(d => d.id === result.definitionAttendanceCodeId);
      const isCodeFormat = defCode && result.definitionAttendanceCodeStr === defCode.code;
      const hasPath = result.accountPath && result.accountPath.length > 0;

      if (isCodeFormat) correctCodeCount++;
      if (hasPath) correctPathCount++;

      console.log(`ID: ${result.id}`);
      console.log(`  definitionAttendanceCodeStr: "${result.definitionAttendanceCodeStr}" ${isCodeFormat ? '✓ 代码格式' : '✗ 非代码格式'}`);
      console.log(`  accountPath: "${result.accountPath || 'null'}" ${hasPath ? '✓ 有路径' : '✗ 缺少路径'}`);
      console.log('');
    });

    console.log(`统计:`);
    console.log(`  definitionAttendanceCodeStr 正确率: ${correctCodeCount}/${personalProductionResults.length}`);
    console.log(`  accountPath 有值率: ${correctPathCount}/${personalProductionResults.length}`);
  }

  // 2. 验证 LABOR_HOUR_REPORT 类型
  console.log('\n2. 验证 LABOR_HOUR_REPORT 类型:\n');

  const laborReportResults = await prisma.workHourResult.findMany({
    where: { sourceType: 'LABOR_HOUR_REPORT' },
    select: {
      id: true,
      employeeNo: true,
      definitionAttendanceCodeId: true,
      definitionAttendanceCodeStr: true,
      accountPath: true,
      source: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(\);

  if (laborReportResults.length > 0) {
    const defCodes = await prisma.definitionAttendanceCode.findMany({
      where: {
        id: { in: laborReportResults.map(r => r.definitionAttendanceCodeId).filter((id): id is number => id !== null) },
      },
      select: { id: true, code: true, name: true },
    });

    let correctCodeCount = 0;
    let correctPathCount = 0;
    let correctSourceCount = 0;

    laborReportResults.forEach(result => {
      const defCode = defCodes.find(d => d.id === result.definitionAttendanceCodeId);
      const isCodeFormat = defCode && result.definitionAttendanceCodeStr === defCode.code;
      const isPathFormat = result.accountPath && result.accountPath.includes('/');
      const isSimpleSource = result.source === '工时报工';

      if (isCodeFormat) correctCodeCount++;
      if (isPathFormat) correctPathCount++;
      if (isSimpleSource) correctSourceCount++;

      console.log(`ID: ${result.id}`);
      console.log(`  definitionAttendanceCodeStr: "${result.definitionAttendanceCodeStr}" ${isCodeFormat ? '✓' : '✗'}`);
      console.log(`  accountPath: "${result.accountPath}" ${isPathFormat ? '✓' : '✗'}`);
      console.log(`  source: "${result.source}" ${isSimpleSource ? '✓' : '✗'}`);
      console.log('');
    });

    console.log(`统计:`);
    console.log(`  definitionAttendanceCodeStr 正确率: ${correctCodeCount}/${laborReportResults.length}`);
    console.log(`  accountPath 正确率: ${correctPathCount}/${laborReportResults.length}`);
    console.log(`  source 正确率: ${correctSourceCount}/${laborReportResults.length}`);
  }

  console.log('\n=== 验证完成 ===');
}

main()
  .then(() => process.exit(0))
  .catch((error) => { console.error('验证失败:', error); process.exit(1); })
  .finally(async () => await prisma.());
