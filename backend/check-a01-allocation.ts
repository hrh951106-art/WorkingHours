import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 排查 A01 按工时分摊问题 ==========\n');

  // 1. 查找A01分摊配置
  console.log('【1. 查找A01分摊配置】\n');
  const a01Config = await prisma.earnedHoursAllocationConfig.findFirst({
    where: {
      code: 'A01'
    },
    include: {
      results: {
        take: 5,
        orderBy: {
          recordDate: 'desc'
        }
      }
    }
  });

  if (!a01Config) {
    console.log('❌ 未找到A01配置\n');
    return;
  }

  console.log(`✅ 找到A01配置: ${a01Config.name}`);
  console.log(`  状态: ${a01Config.status}`);
  console.log(`  生效时间: ${a01Config.effectiveStartTime} ~ ${a01Config.effectiveEndTime || '无限期'}`);
  console.log(`  创建时间: ${a01Config.createdAt}`);
  console.log(`  组织路径: ${a01Config.orgPath}`);

  // 解析配置
  if (a01Config.rules) {
    const rules = typeof a01Config.rules === 'string' ? JSON.parse(a01Config.rules) : a01Config.rules;
    console.log(`  分摊规则: ${rules.length} 条`);
    rules.forEach((rule: any, idx: number) => {
      console.log(`    规则${idx + 1}: ${rule.ruleName}`);
      console.log(`      类型: ${rule.ruleType}`);
      console.log(`      分摊依据: ${rule.allocationBasis}`);
      console.log(`      状态: ${rule.status}`);
    });
  }

  // 解析来源配置
  console.log('\n来源配置:');
  let sourceConfig;
  try {
    sourceConfig = typeof a01Config.sourceConfig === 'string' && a01Config.sourceConfig
      ? JSON.parse(a01Config.sourceConfig)
      : a01Config.sourceConfig || {};
    console.log(`  来源类型: ${sourceConfig.sourceType}`);
    console.log(`  考勤代码: ${JSON.stringify(sourceConfig.attendanceCodes)}`);
    console.log(`  员工筛选: ${JSON.stringify(sourceConfig.employeeFilter)}`);
    console.log(`  账户筛选: ${JSON.stringify(sourceConfig.accountFilter)}`);
  } catch (e) {
    console.log(`  ⚠️  解析sourceConfig失败: ${e.message}`);
  }

  // 2. 查找2026-05-17到2026-05-20期间的考勤工时记录
  console.log('\n\n【2. 查找期间考勤工时记录（5.17-5.20）】\n');

  // 先确定要查询的考勤代码
  const attendanceCodes = sourceConfig?.attendanceCodes || [];

  console.log(`配置中的考勤代码: ${JSON.stringify(attendanceCodes)}`);

  const workHours = await prisma.attendanceWorkHour.findMany({
    where: {
      attendanceDate: {
        gte: new Date('2026-05-17'),
        lte: new Date('2026-05-20')
      },
      attendanceCode: {
        in: attendanceCodes.length > 0 ? attendanceCodes : ['A01', 'A06']
      }
    },
    include: {
      employee: {
        select: {
          employeeNo: true,
          name: true
        }
      },
      laborAccount: true
    }
  });

  console.log(`\n找到 ${workHours.length} 条考勤工时记录\n`);

  // 按账户和日期分组统计
  const stats = new Map();
  for (const record of workHours) {
    const key = `${record.attendanceDate.toISOString().split('T')[0]}_${record.laborAccount?.namePath || record.laborAccount?.path}`;
    if (!stats.has(key)) {
      stats.set(key, {
        date: record.attendanceDate.toISOString().split('T')[0],
        path: record.laborAccount?.namePath || record.laborAccount?.path,
        employees: new Set(),
        totalHours: 0,
        attendanceCodes: new Set()
      });
    }
    const stat = stats.get(key);
    stat.employees.add(`${record.employee.employeeNo}-${record.employee.name}`);
    stat.totalHours += record.actualHours || 0;
    stat.attendanceCodes.add(record.attendanceCode);
  }

  for (const [key, stat] of stats) {
    console.log(`日期: ${stat.date}`);
    console.log(`  账户路径: ${stat.path}`);
    console.log(`  考勤代码: ${Array.from(stat.attendanceCodes).join(', ')}`);
    console.log(`  员工数: ${stat.employees.size}`);
    console.log(`  总工时: ${stat.totalHours}`);
    console.log(`  员工列表: ${Array.from(stat.employees).join(', ')}`);
    console.log('');
  }

  // 3. 查找挣得工时分摊结果
  console.log('【3. 查找挣得工时分摊结果】\n');
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
    },
    take: 20
  });

  console.log(`找到 ${allocationResults.length} 条分摊结果记录\n`);

  if (allocationResults.length === 0) {
    console.log('❌ 没有找到分摊结果！这可能是问题的原因。\n');
  } else {
    // 按日期分组
    const resultsByDate = new Map();
    for (const result of allocationResults) {
      const dateKey = result.recordDate.toISOString().split('T')[0];
      if (!resultsByDate.has(dateKey)) {
        resultsByDate.set(dateKey, []);
      }
      resultsByDate.get(dateKey).push(result);
    }

    for (const [date, results] of resultsByDate) {
      console.log(`日期: ${date}`);
      console.log(`  记录数: ${results.length}`);
      console.log(`  总分摊工时: ${results.reduce((sum, r) => sum + (r.allocatedHours || 0), 0)}`);
      console.log('');
    }
  }

  // 4. 查找电焊相关的账户
  console.log('【4. 检查电焊相关账户】\n');
  const weldingAccounts = await prisma.laborAccount.findMany({
    where: {
      namePath: {
        contains: '电焊'
      },
      type: 'MAIN'
    },
    include: {
      employee: {
        select: {
          employeeNo: true,
          name: true
        }
      }
    }
  });

  console.log(`找到 ${weldingAccounts.length} 个电焊相关账户\n`);

  for (const account of weldingAccounts) {
    console.log(`账户: ${account.code} (${account.name})`);
    console.log(`  员工: ${account.employee?.name} (${account.employee?.employeeNo})`);
    console.log(`  路径: ${account.namePath || account.path}`);
    console.log(`  状态: ${account.status}`);

    // 检查账户的层级配置
    if (account.hierarchyValues && account.hierarchyValues !== '{}') {
      try {
        const levels = JSON.parse(account.hierarchyValues);
        console.log(`  层级值:`);
        levels.forEach((level: any) => {
          if (level.selectedValue) {
            console.log(`    层级${level.level}: ${level.selectedValue.name || level.selectedValue.code || '-'}`);
          }
        });
      } catch (e) {
        console.log(`  层级值解析失败`);
      }
    }
    console.log('');
  }

  // 5. 总结问题
  console.log('【5. 问题分析】\n');

  if (workHours.length === 0) {
    console.log('❌ 可能原因1: 期间内没有符合条件的考勤工时记录');
    console.log(`   配置要求考勤代码: ${JSON.stringify(attendanceCodes)}`);
    console.log(`   查询时间段: 2026-05-17 到 2026-05-20`);
  }

  if (allocationResults.length === 0) {
    console.log('❌ 可能原因2: 没有执行过分摊计算或计算失败');
    console.log('   建议检查:');
    console.log('   1. 是否执行过分摊计算任务');
    console.log('   2. 计算任务是否有错误日志');
    console.log('   3. 账户路径是否匹配（需要包含电焊层级）');
  }

  if (attendanceCodes.length > 0 && !attendanceCodes.includes('A01')) {
    console.log('⚠️  注意: 配置中的考勤代码不包含A01');
    console.log(`   配置的考勤代码: ${JSON.stringify(attendanceCodes)}`);
    console.log(`   用户提到的考勤代码: A01`);
  }

  console.log('\n========== 排查完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
