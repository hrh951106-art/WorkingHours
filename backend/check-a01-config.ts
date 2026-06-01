import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 排查 A01 按工时分摊问题 ==========\n');

  // 1. 查找A01分摊配置
  console.log('【1. 查找A01分摊配置】\n');
  const a01Configs = await prisma.earnedHoursAllocationConfig.findMany({
    where: {
      code: {
        startsWith: 'A01'
      },
      status: {
        in: ['ACTIVE', 'INACTIVE']
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`找到 ${a01Configs.length} 个A01相关配置\n`);

  for (const config of a01Configs) {
    console.log(`配置: ${config.code} (${config.name})`);
    console.log(`  状态: ${config.status}`);
    console.log(`  生效时间: ${config.effectiveStartTime} ~ ${config.effectiveEndTime || '无限期'}`);
    console.log(`  创建时间: ${config.createdAt}`);
    console.log(`  组织: ${config.orgId} (路径: ${config.orgPath})`);

    // 解析sourceConfig
    if (config.sourceConfig) {
      const sourceConfig = typeof config.sourceConfig === 'string'
        ? JSON.parse(config.sourceConfig)
        : config.sourceConfig;

      console.log(`  来源类型: ${sourceConfig.sourceType}`);
      console.log(`  考勤代码: ${JSON.stringify(sourceConfig.attendanceCodes)}`);

      if (sourceConfig.accountFilter) {
        console.log(`  账户筛选:`);
        console.log(`    层级选择: ${JSON.stringify(sourceConfig.accountFilter.hierarchySelections)}`);
      }

      if (sourceConfig.employeeFilter) {
        console.log(`  员工筛选: ${JSON.stringify(sourceConfig.employeeFilter)}`);
      }
    }

    // 解析rules
    if (config.rules) {
      const rules = typeof config.rules === 'string'
        ? JSON.parse(config.rules)
        : config.rules;

      console.log(`  分摊规则: ${rules.length} 条`);
      rules.forEach((rule: any, idx: number) => {
        console.log(`    规则${idx + 1}: ${rule.ruleName}`);
        console.log(`      类型: ${rule.ruleType}`);
        console.log(`      分摊依据: ${rule.allocationBasis}`);
        console.log(`      状态: ${rule.status}`);
      });
    }

    console.log('');
  }

  // 2. 查找团队产量数据（2026-05-19）
  console.log('【2. 查找团队产量数据（2026-05-19）】\n');
  const teamOutput = await prisma.teamOutput.findMany({
    where: {
      outputDate: new Date('2026-05-19'),
      productName: '大桶'
    },
    include: {
      laborAccount: true
    }
  });

  console.log(`找到 ${teamOutput.length} 条产量记录\n`);

  for (const output of teamOutput) {
    console.log(`账户: ${output.laborAccount?.name} (${output.laborAccount?.code})`);
    console.log(`  路径: ${output.laborAccount?.namePath || output.laborAccount?.path}`);
    console.log(`  产品: ${output.productName} (${output.productCode})`);
    console.log(`  数量: ${output.quantity}`);
    console.log(`  日期: ${output.outputDate}`);
    console.log('');
  }

  // 3. 查找2026-05-17到2026-05-20期间的考勤记录
  console.log('【3. 查找期间考勤记录（5.17-5.20）】\n');
  const attendanceRecords = await prisma.punchRecord.findMany({
    where: {
      attendanceDate: {
        gte: new Date('2026-05-17'),
        lte: new Date('2026-05-20')
      },
      attendanceCode: {
        in: ['A01']
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

  console.log(`找到 ${attendanceRecords.length} 条A01考勤记录\n`);

  // 按账户分组统计
  const accountStats = new Map();
  for (const record of attendanceRecords) {
    const accountPath = record.laborAccount?.namePath || record.laborAccount?.path;
    if (!accountStats.has(accountPath)) {
      accountStats.set(accountPath, {
        path: accountPath,
        employees: new Set(),
        totalHours: 0
      });
    }
    const stat = accountStats.get(accountPath);
    stat.employees.add(`${record.employee.employeeNo}-${record.employee.name}`);
    stat.totalHours += record.actualHours || 0;
  }

  for (const [path, stat] of accountStats) {
    console.log(`账户: ${path}`);
    console.log(`  员工数: ${stat.employees.size}`);
    console.log(`  总工时: ${stat.totalHours}`);
    console.log(`  员工列表: ${Array.from(stat.employees).join(', ')}`);
    console.log('');
  }

  // 4. 查找挣得工时计算结果
  console.log('【4. 查找挣得工时计算结果】\n');
  const earnedResults = await prisma.earnedHoursCalculationResult.findMany({
    where: {
      calculationDate: {
        gte: new Date('2026-05-17'),
        lte: new Date('2026-05-20')
      },
      configCode: {
        startsWith: 'A01'
      }
    },
    orderBy: {
      calculationDate: 'desc'
    }
  });

  console.log(`找到 ${earnedResults.length} 条计算结果\n`);

  for (const result of earnedResults) {
    console.log(`计算日期: ${result.calculationDate}`);
    console.log(`  配置: ${result.configCode}`);
    console.log(`  状态: ${result.status}`);
    console.log(`  总产量: ${result.totalOutput}`);
    console.log(`  总挣得工时: ${result.totalEarnedHours}`);
    console.log(`  记录数: ${result.resultRecords?.length || 0}`);
    console.log(`  创建时间: ${result.createdAt}`);
    console.log(`  错误信息: ${result.errorMessage || '无'}`);
    console.log('');
  }

  // 5. 检查电焊相关的账户
  console.log('【5. 检查电焊相关账户】\n');
  const weldingAccounts = await prisma.laborAccount.findMany({
    where: {
      namePath: {
        contains: '电焊'
      },
      type: 'MAIN'
    },
    include: {
      employee: true
    }
  });

  console.log(`找到 ${weldingAccounts.length} 个电焊相关账户\n`);

  for (const account of weldingAccounts) {
    console.log(`账户: ${account.code} (${account.name})`);
    console.log(`  员工: ${account.employee?.name} (${account.employee?.employeeNo})`);
    console.log(`  路径: ${account.namePath || account.path}`);
    console.log(`  状态: ${account.status}`);
    console.log('');
  }

  console.log('========== 排查完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
