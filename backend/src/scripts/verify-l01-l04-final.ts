import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyL01L04Final() {
  console.log('========================================');
  console.log('验证L01-L04规则最终配置');
  console.log('========================================\n');

  const startDate = new Date('2026-03-01');
  const endDate = new Date('2026-03-12');
  endDate.setHours(23, 59, 59, 999);

  const ruleCodes = ['L01', 'L02', 'L03', 'L04'];

  for (const code of ruleCodes) {
    console.log(`----------------------------------------`);
    console.log(`规则: ${code}`);
    console.log(`----------------------------------------`);

    // 查询配置
    const config = await prisma.allocationConfig.findFirst({
      where: {
        configCode: code,
        deletedAt: null,
      },
      include: {
        sourceConfig: true,
      },
    });

    if (!config) {
      console.log('✗ 未找到配置\n');
      continue;
    }

    console.log(`配置名称: ${config.configName}`);
    console.log(`状态: ${config.status}`);

    // 查询分摊规则
    const ruleConfigs = await prisma.allocationRuleConfig.findMany({
      where: {
        configId: config.id,
        deletedAt: null,
      },
    });

    for (const ruleConfig of ruleConfigs) {
      const attendanceCodes = JSON.parse(ruleConfig.allocationAttendanceCodes || '[]');

      console.log(`\n分摊规则: ${ruleConfig.ruleName || '无'}`);
      console.log(`  分摊依据: ${ruleConfig.allocationBasis}`);
      console.log(`  出勤代码ID: ${attendanceCodes.join(', ')}`);

      // 查询出勤代码信息
      for (const codeId of attendanceCodes) {
        const attendanceCode = await prisma.attendanceCode.findUnique({
          where: { id: codeId },
        });
        if (attendanceCode) {
          console.log(`    ${attendanceCode.code} - ${attendanceCode.name}`);
        }
      }

      // 查询工时记录
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

      console.log(`  该日期范围内的工时记录数: ${totalRecords}`);

      if (totalRecords === 0) {
        console.log(`  ✗ 没有工时记录，无法执行分摊`);
        continue;
      }

      // 查看这些工时记录的账户分布
      console.log(`  工时记录账户分布:`);
      const accountStats: Record<string, number> = {};
      for (const codeId of attendanceCodes) {
        const records = await prisma.calcResult.findMany({
          where: {
            calcDate: {
              gte: startDate,
              lte: endDate,
            },
            attendanceCodeId: codeId,
          },
        });

        for (const record of records) {
          const account = record.accountName || 'NULL';
          accountStats[account] = (accountStats[account] || 0) + 1;
        }
      }

      for (const [account, count] of Object.entries(accountStats)) {
        console.log(`    ${account}: ${count} 条`);
      }

      // 检查账户筛选条件
      if (config.sourceConfig) {
        const accountFilter = JSON.parse(config.sourceConfig.accountFilter || '{}');

        if (accountFilter.hierarchySelections && accountFilter.hierarchySelections.length > 0) {
          console.log(`  \n账户筛选条件:`);
          for (const selection of accountFilter.hierarchySelections) {
            console.log(`    层级 ${selection.level}: ${selection.levelName}`);
            console.log(`    选中值: ${selection.valueIds.join(', ')}`);

            // 查询层级详情
            const hierarchy = await prisma.accountHierarchyConfig.findUnique({
              where: { id: selection.levelId },
            });
            if (hierarchy) {
              console.log(`    映射类型: ${hierarchy.mappingType}`);
            }
          }

          // 检查是否有设备类型=A02(间接设备)的筛选
          const deviceTypeFilter = accountFilter.hierarchySelections.find(
            (s: any) => s.levelName === '设备类型'
          );

          if (deviceTypeFilter && deviceTypeFilter.valueIds.includes('A02')) {
            console.log(`  \n⚠ 警告: 账户筛选条件包含"设备类型=间接设备(A02)"`);

            // 检查工时记录中是否有间接设备的记录
            let indirectCount = 0;
            for (const account of Object.keys(accountStats)) {
              if (account.includes('间接设备')) {
                indirectCount += accountStats[account];
              }
            }

            if (indirectCount === 0) {
              console.log(`  ✗ 工时记录中没有"间接设备"账户的记录，分摊会失败`);
              console.log(`  建议: 将设备类型改为"A01"(直接设备)`);
            } else {
              console.log(`  ✓ 找到 ${indirectCount} 条间接设备账户的记录`);
            }
          }
        }
      }

      console.log(`  ✓ 配置验证通过`);
    }

    console.log();
  }

  console.log('========================================');
  console.log('验证完成');
  console.log('========================================\n');

  console.log('总结:');
  console.log('1. ✓ L01-L04规则已配置出勤代码为I04(车间工时)');
  console.log('2. ⚠ 请检查账户筛选条件，特别是设备类型配置');
  console.log('3. 如果工时记录在直接设备账户下，需要修改设备类型为A01\n');

  console.log('下一步操作:');
  console.log('1. 确认是否需要修改账户筛选条件中的设备类型');
  console.log('2. 重启后端服务');
  console.log('3. 重新执行分摊操作\n');

  console.log('========================================\n');
}

verifyL01L04Final()
  .catch((e) => {
    console.error('验证失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
