import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 检查WorkHourResult中accountPath字段的存储差异
 */

async function main() {
  console.log('=== 检查 accountPath 字���存储差异 ===\n');

  // 1. 查询计算推送的数据
  console.log('1. 计算推送的数据 (LEAN/ATTENDANCE):\n');
  const calculatedResults = await prisma.workHourResult.findMany({
    where: {
      sourceType: {
        in: ['LEAN', 'ATTENDANCE'],
      },
    },
    select: {
      id: true,
      employeeNo: true,
      accountId: true,
      accountName: true,
      accountPath: true,
      sourceType: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  });

  console.log(`找到 ${calculatedResults.length} 条计算推送数据\n`);

  calculatedResults.forEach((result) => {
    console.log(`ID: ${result.id}`);
    console.log(`员工: ${result.employeeNo}`);
    console.log(`账户ID: ${result.accountId}`);
    console.log(`账户名称: ${result.accountName}`);
    console.log(`账户路径: ${result.accountPath}`);
    console.log(`来源类型: ${result.sourceType}`);
    console.log('---');
  });

  // 2. 查询工时申报的数据
  console.log('\n2. 工时申报的数据 (LABOR_HOUR_REPORT):\n');
  const reportedResults = await prisma.workHourResult.findMany({
    where: {
      sourceType: 'LABOR_HOUR_REPORT',
    },
    select: {
      id: true,
      employeeNo: true,
      accountId: true,
      accountName: true,
      accountPath: true,
      sourceType: true,
      customFields: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  });

  console.log(`找到 ${reportedResults.length} 条工时申报数据\n`);

  reportedResults.forEach((result) => {
    console.log(`ID: ${result.id}`);
    console.log(`员工: ${result.employeeNo}`);
    console.log(`账户ID: ${result.accountId}`);
    console.log(`账户名称: ${result.accountName}`);
    console.log(`账户路径: ${result.accountPath}`);
    console.log(`来源类型: ${result.sourceType}`);
    console.log(`自定义字段: ${result.customFields}`);
    console.log('---');
  });

  // 3. 对比分析
  console.log('\n3. 字段存储格式对比:\n');

  if (calculatedResults.length > 0 && reportedResults.length > 0) {
    const calcPath = calculatedResults[0].accountPath;
    const repPath = reportedResults[0].accountPath;

    console.log('计算推送 accountPath 格式:');
    console.log(`  值: "${calcPath}"`);
    console.log(`  格式: ${calcPath?.includes('/') ? '路径格式 (用/分隔)' : '其他格式'}`);
    console.log(`  长度: ${calcPath?.length || 0}`);

    console.log('\n工时申报 accountPath 格式:');
    console.log(`  值: "${repPath}"`);
    console.log(`  格式: ${repPath?.includes('/') ? '路径格式 (用/分隔)' : '其他格式'}`);
    console.log(`  长度: ${repPath?.length || 0}`);

    console.log('\n格式是否一致:', calcPath === repPath ? '✗ 不一致' : '✓ 不一致');

    // 4. 查看原始数据源
    console.log('\n4. 查看原始数据源:\n');

    // 查看 CalcResult 中的 accountPath
    const calcResults = await prisma.calcResult.findMany({
      where: {
        id: {
          in: calculatedResults.map((r) => r.sourceId as number).filter((id) => id > 0),
        },
      },
      select: {
        id: true,
        accountPath: true,
      },
      take: 3,
    });

    console.log('CalcResult 中的 accountPath:');
    calcResults.forEach((cr) => {
      console.log(`  CalcResult ID: ${cr.id}, accountPath: "${cr.accountPath}"`);
    });

    // 查看 LaborHourReportRequest 中的 accountCode
    const laborRequests = await prisma.laborHourReportRequest.findMany({
      where: {
        id: {
          in: reportedResults.map((r) => r.sourceId as number).filter((id) => id > 0),
        },
      },
      select: {
        id: true,
        accountCode: true,
        accountName: true,
      },
      take: 3,
    });

    console.log('\nLaborHourReportRequest 中的 accountCode:');
    laborRequests.forEach((req) => {
      console.log(`  Request ID: ${req.id}, accountCode: "${req.accountCode}", accountName: "${req.accountName}"`);
    });

    // 5. 查看 LaborAccount 表中的数据
    console.log('\n5. LaborAccount 表中的实际数据:\n');

    const accountIds = [
      ...calculatedResults.map((r) => r.accountId).filter((id) => id !== null),
      ...reportedResults.map((r) => r.accountId).filter((id) => id !== null),
    ];

    const accounts = await prisma.laborAccount.findMany({
      where: {
        id: {
          in: accountIds as number[],
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        path: true,
        accountPath: true,
      },
      take: 5,
    });

    console.log('LaborAccount 中的字段:');
    accounts.forEach((acc) => {
      console.log(`  ID: ${acc.id}`);
      console.log(`  code: "${acc.code}"`);
      console.log(`  name: "${acc.name}"`);
      console.log(`  path: "${acc.path}"`);
      console.log(`  accountPath: "${acc.accountPath}"`);
      console.log('  ---');
    });
  }

  // 6. 统计所有不同的 accountPath 格式
  console.log('\n6. accountPath 格式统计:\n');

  const allPaths = [
    ...calculatedResults.map((r) => ({ source: '计算推送', path: r.accountPath })),
    ...reportedResults.map((r) => ({ source: '工时申报', path: r.accountPath })),
  ];

  const pathPatterns = new Map<string, string[]>();
  allPaths.forEach(({ source, path }) => {
    const pattern = path?.includes('/') ? '路径格式 (/分隔)' : '非路径格式';
    if (!pathPatterns.has(pattern)) {
      pathPatterns.set(pattern, []);
    }
    pathPatterns.get(pattern)!.push(source);
  });

  console.log('格式分布:');
  pathPatterns.forEach((sources, pattern) => {
    const calcCount = sources.filter((s) => s === '计算推送').length;
    const repCount = sources.filter((s) => s === '工时申报').length;
    console.log(`  ${pattern}:`);
    console.log(`    计算推送: ${calcCount} 条`);
    console.log(`    工时申报: ${repCount} 条`);
  });
}

main()
  .then(() => {
    console.log('\n检查完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
