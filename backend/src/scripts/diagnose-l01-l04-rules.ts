import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseL01L04Rules() {
  console.log('========================================');
  console.log('L01-L04分摊规则诊断');
  console.log('========================================\n');

  const ruleCodes = ['L01', 'L02', 'L03', 'L04'];
  const startDate = new Date('2026-03-01');
  const endDate = new Date('2026-03-12');
  endDate.setHours(23, 59, 59, 999);

  // 第一步：查询每个规则的配置
  console.log('第一步：查询L01-L04规则配置\n');

  const rules: any[] = [];

  for (const code of ruleCodes) {
    const config = await prisma.allocationConfig.findFirst({
      where: {
        configCode: code,
        deletedAt: null,
      },
      include: {
        sourceConfig: true,
      },
    });

    if (config) {
      console.log(`----------------------------------------`);
      console.log(`规则代码: ${config.configCode}`);
      console.log(`规则名称: ${config.configName}`);
      console.log(`状态: ${config.status}`);
      console.log(`----------------------------------------`);

      // 查询分摊规则配置
      const ruleConfigs = await prisma.allocationRuleConfig.findMany({
        where: {
          configId: config.id,
          deletedAt: null,
        },
      });

      for (const ruleConfig of ruleConfigs) {
        console.log(`分摊规则: ${ruleConfig.ruleName || '无'}`);
        console.log(`  分摊依据: ${ruleConfig.allocationBasis}`);
        console.log(`  出勤代码: ${ruleConfig.allocationAttendanceCodes || '无'}`);

        rules.push({
          code,
          config,
          ruleConfig,
        });
      }
      console.log();
    } else {
      console.log(`✗ 未找到规则 ${code}\n`);
    }
  }

  // 第二步：检查每个规则的出勤代码配置和工时记录
  console.log('\n第二步：检查每个规则的出勤代码和工时记录\n');

  for (const rule of rules) {
    console.log(`----------------------------------------`);
    console.log(`规则: ${rule.code} - ${rule.config.configName}`);
    console.log(`----------------------------------------`);

    // 解析出勤代码
    const attendanceCodes = JSON.parse(rule.ruleConfig.allocationAttendanceCodes || '[]');

    if (attendanceCodes.length === 0) {
      console.log('⚠ 未配置出勤代码');
      console.log();
      continue;
    }

    console.log(`配置的出勤代码ID: ${attendanceCodes.join(', ')}`);

    // 查询每个出勤代码的信息和工时记录数
    let totalRecords = 0;
    for (const codeId of attendanceCodes) {
      const attendanceCode = await prisma.attendanceCode.findUnique({
        where: { id: codeId },
      });

      if (!attendanceCode) {
        console.log(`  ✗ 出勤代码ID ${codeId} 不存在`);
        continue;
      }

      const count = await prisma.calcResult.count({
        where: {
          calcDate: {
            gte: startDate,
            lte: endDate,
          },
          attendanceCodeId: codeId,
        },
      });

      totalRecords += count;
      console.log(`  ${attendanceCode.code} (${attendanceCode.name}): ${count} 条记录`);
    }

    console.log(`  总计: ${totalRecords} 条工时记录`);

    if (totalRecords === 0) {
      console.log(`  ✗ 该日期范围内没有符合条件的工时记录`);
    } else {
      console.log(`  ✓ 找到工时记录`);
    }

    console.log();
  }

  // 第三步：检查账户筛选条件
  console.log('第三步：检查账户筛选条件\n');

  for (const rule of rules) {
    console.log(`----------------------------------------`);
    console.log(`规则: ${rule.code}`);
    console.log(`----------------------------------------`);

    if (!rule.config.sourceConfig) {
      console.log('✗ 未找到分摊源配置\n');
      continue;
    }

    const accountFilter = JSON.parse(rule.config.sourceConfig.accountFilter || '{}');

    if (accountFilter.hierarchySelections && accountFilter.hierarchySelections.length > 0) {
      console.log('账户层级筛选条件:');
      for (const selection of accountFilter.hierarchySelections) {
        console.log(`  层级 ${selection.level}: ${selection.levelName} (ID: ${selection.levelId})`);
        console.log(`    选中值: ${selection.valueIds.join(', ')}`);
      }
    } else {
      console.log('未配置账户层级筛选');
    }

    console.log();
  }

  // 第四步：检查该日期范围内所有工时记录的分布
  console.log('第四步：该日期范围内所有工时记录的分布\n');

  const allRecords = await prisma.calcResult.findMany({
    where: {
      calcDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  console.log(`总工时记录数: ${allRecords.length}\n`);

  // 按出勤代码统计
  const attendanceStats: Record<number, { code: string; name: string; count: number }> = {};
  for (const record of allRecords) {
    if (record.attendanceCodeId) {
      if (!attendanceStats[record.attendanceCodeId]) {
        const code = await prisma.attendanceCode.findUnique({
          where: { id: record.attendanceCodeId },
        });
        attendanceStats[record.attendanceCodeId] = {
          code: code?.code || 'Unknown',
          name: code?.name || 'Unknown',
          count: 0,
        };
      }
      attendanceStats[record.attendanceCodeId].count++;
    }
  }

  console.log('按出勤代码统计:');
  for (const [id, stats] of Object.entries(attendanceStats)) {
    console.log(`  ${stats.code} (${stats.name}): ${stats.count} 条记录`);
  }

  // 第五步：总结问题
  console.log('\n========================================');
  console.log('问题诊断总结');
  console.log('========================================\n');

  console.log('问题分析:\n');

  for (const rule of rules) {
    const attendanceCodes = JSON.parse(rule.ruleConfig.allocationAttendanceCodes || '[]');

    if (attendanceCodes.length === 0) {
      console.log(`${rule.code}: ✗ 未配置出勤代码`);
      continue;
    }

    let totalRecords = 0;
    for (const codeId of attendanceCodes) {
      const count = await prisma.calcResult.count({
        where: {
          calcDate: {
            gte: startDate,
            lte: endDate,
          },
          attendanceCodeId: codeId,
        },
      });
      totalRecords += count;
    }

    if (totalRecords === 0) {
      console.log(`${rule.code}: ✗ 配置的出勤代码在指定日期范围内没有工时记录`);

      // 显示该出勤代码是什么
      for (const codeId of attendanceCodes) {
        const attendanceCode = await prisma.attendanceCode.findUnique({
          where: { id: codeId },
        });
        if (attendanceCode) {
          console.log(`         配置的出勤代码: ${attendanceCode.code} (${attendanceCode.name})`);
        }
      }
    } else {
      console.log(`${rule.code}: ⚠ 有 ${totalRecords} 条工时记录，但可能账户筛选条件过于严格`);
    }
  }

  console.log('\n========================================\n');
}

diagnoseL01L04Rules()
  .catch((e) => {
    console.error('诊断失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
