import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 深入分析 A01 分摊问题 ==========\n');

  // 1. 查看A01���置
  console.log('【1. A01配置详情】\n');
  const a01Config = await prisma.earnedHoursAllocationConfig.findFirst({
    where: { code: 'A01' }
  });

  if (!a01Config) {
    console.log('❌ 未找到A01配置\n');
    return;
  }

  const sourceConfig = JSON.parse(a01Config.sourceConfig || '{}');
  console.log(`配置: ${a01Config.name} (${a01Config.code})`);
  console.log(`状态: ${a01Config.status}`);
  console.log(`生效时间: ${a01Config.effectiveStartTime}`);
  console.log(`组织: ${a01Config.orgPath}`);
  console.log(`\n来源配置:`);
  console.log(`  来源类型: ${sourceConfig.sourceType}`);
  console.log(`  考勤代码: ${JSON.stringify(sourceConfig.attendanceCodes)}`);
  console.log(`  员工筛选: ${JSON.stringify(sourceConfig.employeeFilter)}`);
  console.log(`  账户筛选: ${JSON.stringify(sourceConfig.accountFilter)}`);

  // 2. 查找生产记录（5.17-5.20）
  console.log('\n\n【2. 生产记录（5.17-5.20）】\n');
  const productionRecords = await prisma.productionRecord.findMany({
    where: {
      recordDate: {
        gte: new Date('2026-05-17T00:00:00.000Z'),
        lte: new Date('2026-05-20T23:59:59.999Z')
      },
      deletedAt: null
    },
    include: {
      laborAccount: true,
      definitionAttendanceCode: true
    },
    orderBy: {
      recordDate: 'asc'
    }
  });

  console.log(`找到 ${productionRecords.length} 条生产记录\n`);

  for (const record of productionRecords) {
    console.log(`日期: ${record.recordDate.toISOString().split('T')[0]}`);
    console.log(`  产品: ${record.productName} (${record.productCode})`);
    console.log(`  数量: ${record.quantity}`);
    console.log(`  账户: ${record.laborAccount?.name || record.laborAccount?.code}`);
    console.log(`  账户路径: ${record.laborAccount?.namePath || record.laborAccount?.path}`);
    console.log(`  考勤代码: ${record.definitionAttendanceCode?.name || record.definitionAttendanceCode?.code || '未关联'}`);
    console.log('');
  }

  // 3. 查找工时结果（5.17-5.20期间的A01考勤代码）
  console.log('【3. 工时结果（5.17-5.20）】\n');
  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      calcDate: {
        gte: new Date('2026-05-17'),
        lte: new Date('2026-05-20')
      }
    },
    include: {
      laborAccount: true
    },
    orderBy: {
      calcDate: 'asc'
    }
  });

  console.log(`找到 ${workHourResults.length} 条工时结果\n`);

  // 按日期和考勤代码分组
  const whrStats = new Map();
  for (const whr of workHourResults) {
    const key = `${whr.calcDate.toISOString().split('T')[0]}_${whr.attendanceCode}`;
    if (!whrStats.has(key)) {
      whrStats.set(key, {
        date: whr.calcDate.toISOString().split('T')[0],
        attendanceCode: whr.attendanceCode,
        attendanceCodeName: whr.attendanceCodeName,
        totalHours: 0,
        employeeCount: 0,
        accounts: new Set()
      });
    }
    const stat = whrStats.get(key);
    stat.totalHours += whr.workHours || 0;
    stat.employeeCount += 1;
    stat.accounts.add(whr.laborAccount?.namePath || whr.laborAccount?.path);
  }

  for (const [key, stat] of whrStats) {
    console.log(`日期: ${stat.date}`);
    console.log(`  考勤代码: ${stat.attendanceCode} (${stat.attendanceCodeName})`);
    console.log(`  总工时: ${stat.totalHours}`);
    console.log(`  员工数: ${stat.employeeCount}`);
    console.log(`  账户数: ${stat.accounts.size}`);
    console.log('');
  }

  // 4. 检查5月19日的电焊账户
  console.log('【4. 检查电焊相关账户和工时（5.19）】\n');
  const weldingWorkHours = workHourResults.filter(whr =>
    whr.calcDate.toISOString().split('T')[0] === '2026-05-19' &&
    (whr.laborAccount?.namePath?.includes('电焊') || whr.laborAccount?.path?.includes('电焊'))
  );

  console.log(`找到 ${weldingWorkHours.length} 条电焊账户的工时记录（5.19）\n`);

  for (const whr of weldingWorkHours) {
    console.log(`员工: ${whr.employeeNo} - ${whr.employeeName}`);
    console.log(`  账户: ${whr.laborAccount?.name}`);
    console.log(`  账户路径: ${whr.laborAccount?.namePath || whr.laborAccount?.path}`);
    console.log(`  考勤代码: ${whr.attendanceCode} (${whr.attendanceCodeName})`);
    console.log(`  工时: ${whr.workHours}`);
    console.log('');
  }

  // 5. 查找分摊结果
  console.log('【5. 分摊结果（5.17-5.20）】\n');
  const allocationResults = await prisma.earnedHoursAllocationResult.findMany({
    where: {
      configId: a01Config.id,
      recordDate: {
        gte: new Date('2026-05-17'),
        lte: new Date('2026-05-20')
      }
    },
    orderBy: {
      recordDate: 'desc'
    }
  });

  console.log(`找到 ${allocationResults.length} 条分摊结果\n`);

  if (allocationResults.length > 0) {
    // 按批次号分组
    const batchGroups = new Map();
    for (const result of allocationResults) {
      if (!batchGroups.has(result.batchNo)) {
        batchGroups.set(result.batchNo, []);
      }
      batchGroups.get(result.batchNo).push(result);
    }

    for (const [batchNo, results] of batchGroups) {
      const first = results[0];
      console.log(`批次: ${batchNo}`);
      console.log(`  日期: ${first.recordDate.toISOString().split('T')[0]}`);
      console.log(`  记录数: ${results.length}`);
      console.log(`  总分摊工时: ${results.reduce((sum, r) => sum + (r.allocatedHours || 0), 0).toFixed(2)}`);
      console.log('');
    }
  }

  // 6. 问题分析
  console.log('【6. 问题分析】\n');

  console.log('关键信息总结:');
  console.log(`1. 配置的考勤代码: ${JSON.stringify(sourceConfig.attendanceCodes || [])}`);
  console.log(`2. 用户提到的考勤代码: A01`);
  console.log(`3. 生产记录数量: ${productionRecords.length}`);
  console.log(`4. 工时结果数量: ${workHourResults.length}`);
  console.log(`5. 分摊结果数量: ${allocationResults.length}`);

  console.log('\n可能的问题:');

  if (sourceConfig.attendanceCodes && sourceConfig.attendanceCodes.length > 0) {
    if (!sourceConfig.attendanceCodes.includes('A01')) {
      console.log('⚠️  问题1: 配置中的考勤代码不包含A01');
      console.log(`   配置的考勤代码: ${JSON.stringify(sourceConfig.attendanceCodes)}`);
      console.log(`   用户使用的考勤代码: A01`);
    }
  }

  if (productionRecords.length === 0) {
    console.log('⚠️  问题2: 期间内没有生产记录');
    console.log('   分摊计算需要先有生产记录才能执行');
  }

  if (allocationResults.length === 0 && productionRecords.length > 0) {
    console.log('⚠️  问题3: 有生产记录但没有分摊结果');
    console.log('   可能原因:');
    console.log('   a) 没有执行过分摊计算');
    console.log('   b) 计算时没有找到符合条件的工时数据');
    console.log('   c) 账户路径不匹配');
  }

  // 检查账户路径匹配
  const weldingPaths = new Set();
  for (const whr of weldingWorkHours) {
    if (whr.laborAccount?.namePath) {
      weldingPaths.add(whr.laborAccount.namePath);
    }
  }

  if (weldingPaths.size > 0) {
    console.log('\n电焊账户路径:');
    for (const path of weldingPaths) {
      console.log(`  ${path}`);
    }
  }

  console.log('\n========== 分析完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
