import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 深入排查 A001/A01 分摊问题 ==========\n');

  // 1. 查找A01或A001配置
  console.log('【1. 查找分摊配置】\n');
  const configs = await prisma.earnedHoursAllocationConfig.findMany({
    where: {
      OR: [
        { code: 'A01' },
        { code: 'A001' },
        { code: { startsWith: 'A0' } }
      ],
      deletedAt: null
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`找到 ${configs.length} 个相关配置\n`);

  if (configs.length === 0) {
    console.log('❌ 未找到A01或A001配置');
    return;
  }

  for (const config of configs) {
    console.log(`配置: ${config.code} (${config.name})`);
    console.log(`  ID: ${config.id}`);
    console.log(`  状态: ${config.status}`);
    console.log(`  生效时间: ${config.effectiveStartTime} ~ ${config.effectiveEndTime || '无限期'}`);
    console.log(`  创建时间: ${config.createdAt}\n`);

    // 解析配置
    try {
      const sourceConfig = JSON.parse(config.sourceConfig || '{}');
      const rules = JSON.parse(config.rules || '[]');

      console.log(`  来源类型: ${sourceConfig.sourceType}`);
      console.log(`  考勤代码: ${JSON.stringify(sourceConfig.attendanceCodes || [])}`);
      console.log(`  员工筛选: ${JSON.stringify(sourceConfig.employeeFilter)}`);
      console.log(`  账户筛选: ${JSON.stringify(sourceConfig.accountFilter)}`);
      console.log(`  分摊规则数量: ${rules.length}`);

      rules.forEach((rule: any, idx: number) => {
        console.log(`    规则${idx + 1}: ${rule.ruleName}`);
        console.log(`      分摊方式: ${rule.allocationBasis}`);
        console.log(`      状态: ${rule.status}`);
        console.log(`      生效时间: ${rule.effectiveStartTime} ~ ${rule.effectiveEndTime || '无限期'}`);
      });

      // 使用这个配置进行后续检查
      var targetConfig = config;
      var targetSourceConfig = sourceConfig;
      var targetRules = rules;

      // 只检查第一个配置
      break;
    } catch (e) {
      console.log(`  ⚠️  解析配置失败: ${e.message}\n`);
    }
  }

  // 2. 检查5月17-20日的生产记录
  console.log('\n【2. 生产记录（5.17-5.20）】\n');
  const startDate = new Date('2026-05-17');
  const endDate = new Date('2026-05-20');

  const productionRecords = await prisma.productionRecord.findMany({
    where: {
      recordDate: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: {
      recordDate: 'asc'
    }
  });

  console.log(`找到 ${productionRecords.length} 条生产记录\n`);

  if (productionRecords.length === 0) {
    console.log('❌ 期间内没有生产记录！');
    console.log('   这是导致没有分摊结果的可能原因1');
  } else {
    // 按日期分组统计
    const recordsByDate = new Map();
    for (const record of productionRecords) {
      const dateKey = record.recordDate.toISOString().split('T')[0];
      if (!recordsByDate.has(dateKey)) {
        recordsByDate.set(dateKey, []);
      }
      recordsByDate.get(dateKey).push(record);
    }

    for (const [date, records] of recordsByDate) {
      console.log(`日期: ${date}`);
      console.log(`  记录数: ${records.length}`);
      records.forEach(r => {
        console.log(`    产品: ${r.productName} (${r.productCode}), 数量: ${r.actualQty}, 组织: ${r.orgName}`);
      });
      console.log('');
    }
  }

  // 3. 检查工时结果数据（5.17-5.20）
  console.log('【3. 工时结果数据（5.17-5.20）】\n');

  if (targetSourceConfig && targetSourceConfig.attendanceCodes) {
    const attendanceCodes = targetSourceConfig.attendanceCodes;
    console.log(`筛选考勤代码: ${JSON.stringify(attendanceCodes)}\n`);

    const workHourResults = await prisma.workHourResult.findMany({
      where: {
        calcDate: {
          gte: startDate,
          lte: endDate
        },
        attendanceCode: {
          in: attendanceCodes
        }
      },
      orderBy: {
        calcDate: 'asc'
      }
    });

    console.log(`找到 ${workHourResults.length} 条工时结果（考勤代码: ${attendanceCodes.join(', ')}）\n`);

    if (workHourResults.length === 0) {
      console.log('❌ 期间内没有符合条件的工时结果！');
      console.log('   这是导致没有分摊结果的可能原因2');

      // 检查是否有其他考勤代码的工时结果
      const allWorkHourResults = await prisma.workHourResult.findMany({
        where: {
          calcDate: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          attendanceCode: true,
          attendanceCodeName: true
        },
        distinct: ['attendanceCode']
      });

      if (allWorkHourResults.length > 0) {
        console.log(`\nℹ️  但期间内有其他考勤代码的工时结果:`);
        allWorkHourResults.forEach(whr => {
          console.log(`   - ${whr.attendanceCode} (${whr.attendanceCodeName})`);
        });
      }
    } else {
      // 按日期和考勤代码分组
      const whrByDate = new Map();
      for (const whr of workHourResults) {
        const dateKey = whr.calcDate.toISOString().split('T')[0];
        if (!whrByDate.has(dateKey)) {
          whrByDate.set(dateKey, new Map());
        }
        const dateMap = whrByDate.get(dateKey);
        if (!dateMap.has(whr.attendanceCode)) {
          dateMap.set(whr.attendanceCode, []);
        }
        dateMap.get(whr.attendanceCode).push(whr);
      }

      for (const [date, codeMap] of whrByDate) {
        console.log(`日期: ${date}`);
        for (const [code, results] of codeMap) {
          const totalHours = results.reduce((sum, r) => sum + (r.workHours || 0), 0);
          const uniqueAccounts = new Set(results.map(r => r.accountPath));
          console.log(`  考勤代码: ${code}`);
          console.log(`    记录数: ${results.length}`);
          console.log(`    总工时: ${totalHours.toFixed(2)}`);
          console.log(`    涉及账户: ${uniqueAccounts.size}`);
        }
        console.log('');
      }
    }
  }

  // 4. 检查分摊结果
  console.log('【4. 分摊结果】\n');
  if (targetConfig) {
    const allocationResults = await prisma.earnedHoursAllocationResult.findMany({
      where: {
        configId: targetConfig.id,
        recordDate: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        recordDate: 'desc'
      },
      take: 20
    });

    console.log(`找到 ${allocationResults.length} 条分摊结果\n`);

    if (allocationResults.length === 0) {
      console.log('❌ 期间内没有分摊结果');
      console.log('   这表明分摊计算可能未执行或执行失败');
    } else {
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
  }

  // 5. 问题总结
  console.log('【5. 问题总结】\n');

  const problems = [];

  if (productionRecords.length === 0) {
    problems.push('❌ 没有生产记录 - 分摊计算需要先有生产记录');
  }

  if (targetSourceConfig && targetSourceConfig.attendanceCodes) {
    const attendanceCodes = targetSourceConfig.attendanceCodes;
    const matchingWorkHours = await prisma.workHourResult.count({
      where: {
        calcDate: { gte: startDate, lte: endDate },
        attendanceCode: { in: attendanceCodes }
      }
    });

    if (matchingWorkHours === 0) {
      problems.push(`❌ 没有符合考勤代码(${attendanceCodes.join(',')})的工时结果`);
    }
  }

  if (targetConfig) {
    const allocationResults = await prisma.earnedHoursAllocationResult.count({
      where: {
        configId: targetConfig.id,
        recordDate: { gte: startDate, lte: endDate }
      }
    });

    if (allocationResults === 0 && productionRecords.length > 0) {
      problems.push('❌ 有生产记录但没有分摊结果 - 分摊计算可能未执行或执行失败');
    }
  }

  if (problems.length === 0) {
    console.log('✅ 未发现明显问题，建议检查:');
    console.log('   1. 分摊计算任务是否成功执行');
    console.log('   2. 查看后端日志中的错误信息');
    console.log('   3. 检查账户路径筛选条件是否匹配');
  } else {
    console.log('发现以下问题:');
    problems.forEach(p => console.log(`  ${p}`));
  }

  console.log('\n========== 排查完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
