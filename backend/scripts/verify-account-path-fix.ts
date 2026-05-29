import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 验证 accountPath 字段修复是否正确
 */

async function main() {
  console.log('=== 验证 accountPath 字段修复 ===\n');

  // 1. 查询所有工时申报数据
  console.log('1. 查询工时申报的 WorkHourResult 数据:\n');
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
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`找到 ${reportedResults.length} 条工时申报数据\n`);

  if (reportedResults.length > 0) {
    console.log('工时申报数据示例:');
    reportedResults.slice(0, 3).forEach((result) => {
      console.log(`  ID: ${result.id}`);
      console.log(`  员工: ${result.employeeNo}`);
      console.log(`  账户ID: ${result.accountId}`);
      console.log(`  账户名称: ${result.accountName}`);
      console.log(`  账户路径: ${result.accountPath}`);
      console.log(`  创建时间: ${result.createdAt.toISOString()}`);
      console.log('  ---');
    });

    // 2. 分析 accountPath 格式
    console.log('\n2. accountPath 格式分析:\n');

    const pathFormatCount = {
      路径格式: 0,  // 包含 /
      自动编码: 0,  // 包含 AUTO- 或 LINE-
      空值: 0,      // 空字符串
      其他: 0,
    };

    reportedResults.forEach((result) => {
      const path = result.accountPath || '';
      if (path === '') {
        pathFormatCount.空值++;
      } else if (path.includes('/')) {
        pathFormatCount.路径格式++;
      } else if (path.includes('AUTO-') || path.includes('LINE-')) {
        pathFormatCount.自动编码++;
      } else {
        pathFormatCount.其他++;
      }
    });

    console.log('格式分布:');
    Object.entries(pathFormatCount).forEach(([format, count]) => {
      const percentage = reportedResults.length > 0
        ? ((count / reportedResults.length) * 100).toFixed(1)
        : '0.0';
      console.log(`  ${format}: ${count} 条 (${percentage}%)`);
    });

    // 3. 与计算推送数据对比
    console.log('\n3. 与计算推送数据对比:\n');

    const calculatedResults = await prisma.workHourResult.findMany({
      where: {
        sourceType: {
          in: ['LEAN', 'ATTENDANCE'],
        },
      },
      select: {
        id: true,
        accountPath: true,
      },
      take: 5,
    });

    if (calculatedResults.length > 0) {
      const calcPathExample = calculatedResults[0].accountPath;
      console.log(`计算推送示例 accountPath: "${calcPathExample}"`);

      const repPathExample = reportedResults[0].accountPath;
      console.log(`工时申报示例 accountPath: "${repPathExample}"`);

      // 判断格式是否一致
      const calcIsPath = calcPathExample?.includes('/') || false;
      const repIsPath = repPathExample?.includes('/') || false;

      console.log('\n格式一致性:');
      console.log(`  计算推送是路径格式: ${calcIsPath ? '✓' : '✗'}`);
      console.log(`  工时申报是路径格式: ${repIsPath ? '✓' : '✗'}`);
      console.log(`  格式一致: ${calcIsPath === repIsPath ? '✓ 是' : '✗ 否'}`);
    }

    // 4. 检查 LaborHourReportRequest 表中的 accountPath
    console.log('\n4. 检查 LaborHourReportRequest 表:\n');

    const requests = await prisma.laborHourReportRequest.findMany({
      select: {
        id: true,
        accountCode: true,
        accountPath: true,
        accountName: true,
        status: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 3,
    });

    console.log(`找到 ${requests.length} 条工时报表申请\n`);

    requests.forEach((req) => {
      console.log(`  Request ID: ${req.id}`);
      console.log(`  accountCode: "${req.accountCode}"`);
      console.log(`  accountPath: "${req.accountPath}"`);
      console.log(`  accountName: "${req.accountName}"`);
      console.log(`  status: ${req.status}`);
      console.log('  ---');
    });

    // 5. 验证结论
    console.log('\n5. 验证结论:\n');

    const newRecordsHavePath = reportedResults.some(r =>
      r.accountPath && r.accountPath.includes('/') && r.createdAt > new Date(Date.now() - 1000 * 60 * 10) // 最近10分钟
    );

    if (newRecordsHavePath) {
      console.log('✓ 修复成功！新的工时申报数据使用正确的路径格式');
    } else if (pathFormatCount.路径格式 > 0) {
      console.log('✓ 部分数据已使用正确的路径格式');
      console.log(`  共 ${pathFormatCount.路径格式} 条数据使用路径格式`);
    } else {
      console.log('⚠️ 尚未检测到新的工时申报数据');
      console.log('  请在前端创建一个新的工时报表申请来验证修复');
    }

    if (pathFormatCount.自动编码 > 0) {
      console.log(`\n⚠️ 仍有 ${pathFormatCount.自动编码} 条旧数据使用自动编码格式`);
      console.log('  这些是修复前的数据，不影响功能');
    }

  } else {
    console.log('⚠️ 没有找到工时申报数据');
    console.log('  请在前端创建一个新的工时报表申请来验证修复');
  }

  // 6. 对比 LaborAccount 表
  console.log('\n6. LaborAccount 表数据参考:\n');

  const accounts = await prisma.laborAccount.findMany({
    where: {
      id: {
        in: [
          ...(reportedResults.map(r => r.accountId).filter((id): id is number => id !== null) as number[]),
          ...(await prisma.workHourResult.findMany({
            where: { sourceType: { in: ['LEAN', 'ATTENDANCE'] } },
            select: { accountId: true },
            take: 3,
          })).map(r => r.accountId).filter((id): id is number => id !== null)
        ],
      },
    },
    select: {
      id: true,
      code: true,
      path: true,
      name: true,
    },
    take: 5,
  });

  accounts.forEach((acc) => {
    console.log(`  Account ID: ${acc.id}`);
    console.log(`  code: "${acc.code}"`);
    console.log(`  path: "${acc.path}"`);
    console.log(`  name: "${acc.name}"`);
    console.log('  ---');
  });
}

main()
  .then(() => {
    console.log('\n✅ 验证完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 验证失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
