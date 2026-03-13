import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseL01Issue() {
  console.log('========================================');
  console.log('诊断L01规则找不到工时记录的问题');
  console.log('========================================\n');

  // 1. 查询L01规则配置
  console.log('第一步：查询L01规则配置\n');

  const l01Config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'L01',
      deletedAt: null,
    },
    include: {
      sourceConfig: true,
    },
  });

  if (!l01Config) {
    console.log('✗ 未找到L01配置');
    await prisma.$disconnect();
    return;
  }

  console.log(`配置名称: ${l01Config.configName}`);

  const ruleConfigs = await prisma.allocationRuleConfig.findMany({
    where: {
      configId: l01Config.id,
      deletedAt: null,
    },
  });

  for (const ruleConfig of ruleConfigs) {
    console.log(`\n分摊规则: ${ruleConfig.ruleName || '无'}`);
    console.log(`  分摊依据: ${ruleConfig.allocationBasis}`);
    console.log(`  出勤代码ID: ${ruleConfig.allocationAttendanceCodes || '无'}`);
    console.log(`  分摊范围ID: ${ruleConfig.allocationScopeId || '无'}`);
    console.log(`  分摊归属层级: ${ruleConfig.allocationHierarchyLevels || '无'}`);
  }

  // 2. 检查分摊源配置
  console.log('\n第二步：检查分摊源配置\n');

  if (l01Config.sourceConfig) {
    const sourceFilter = JSON.parse(l01Config.sourceConfig.employeeFilter || '{}');
    const accountFilter = JSON.parse(l01Config.sourceConfig.accountFilter || '{}');
    const attendanceCodes = JSON.parse(l01Config.sourceConfig.attendanceCodes || '[]');

    console.log('员工筛选条件:');
    console.log(JSON.stringify(sourceFilter, null, 2));

    console.log('\n账户筛选条件:');
    console.log(JSON.stringify(accountFilter, null, 2));

    console.log('\n配置的出勤代码:');
    console.log(attendanceCodes.length > 0 ? attendanceCodes.join(', ') : '无');
  }

  // 3. 查询日期范围内的工时记录
  console.log('\n第三步：查询日期范围内的工时记录\n');

  const startDate = new Date('2026-03-01');
  const endDate = new Date('2026-03-12');
  endDate.setHours(23, 59, 59, 999);

  // 获取配置的出勤代码
  const attendanceCodes = JSON.parse(ruleConfigs[0]?.allocationAttendanceCodes || '[]');

  if (attendanceCodes.length === 0) {
    console.log('✗ L01规则未配置出勤代码');
  } else {
    console.log(`配置的出勤代码ID: ${attendanceCodes.join(', ')}`);

    // 查询这些出勤代码的工时记录
    for (const codeId of attendanceCodes) {
      const code = await prisma.attendanceCode.findUnique({
        where: { id: codeId },
      });

      if (code) {
        const count = await prisma.calcResult.count({
          where: {
            calcDate: {
              gte: startDate,
              lte: endDate,
            },
            attendanceCodeId: codeId,
          },
        });

        console.log(`  ${code.code} (${code.name}): ${count} 条记录`);
      }
    }
  }

  // 4. 检查账户筛选条件是否匹配
  console.log('\n第四步：检查账户筛选条件\n');

  if (l01Config.sourceConfig) {
    const accountFilter = JSON.parse(l01Config.sourceConfig.accountFilter || '{}');

    if (accountFilter.hierarchySelections && accountFilter.hierarchySelections.length > 0) {
      console.log('账户层级筛选条件:');

      for (const selection of accountFilter.hierarchySelections) {
        console.log(`  层级 ${selection.level}: ${selection.levelName} (ID: ${selection.levelId})`);
        console.log(`    选中值: ${selection.valueIds.join(', ')}`);

        // 如果是车间层级，检查workshopId=6的账户
        if (selection.levelId === 29 && selection.valueIds.includes(6)) {
          console.log(`    筛选条件：车间ID=6 (W1总装车间)`);

          // 查询该车间有多少账户
          const workshopAccounts = await prisma.laborAccount.findMany({
            where: {
              status: 'ACTIVE',
            },
          });

          // 筛选出hierarchyValues中workshopId=6的账户
          const w1Accounts: any[] = [];
          for (const acc of workshopAccounts) {
            try {
              const hv = JSON.parse(acc.hierarchyValues || '{}');
              if (hv.workshopId === 6) {
                w1Accounts.push(acc);
              }
            } catch (e) {
              // 忽略解析失败的账户
            }
          }

          console.log(`    找到 ${w1Accounts.length} 个W1车间的账户`);

          // 显示这些账户
          for (const acc of w1Accounts.slice(0, 10)) {
            console.log(`      - ${acc.name} (ID: ${acc.id})`);
          }
        }
      }

      // 检查工时记录中的账户是否符合筛选条件
      console.log('\n检查工时记录的账户是否符合筛选条件:\n');

      let totalRecords = 0;
      let matchingRecords = 0;

      for (const codeId of attendanceCodes) {
        const records = await prisma.calcResult.findMany({
          where: {
            calcDate: {
              gte: startDate,
              lte: endDate,
            },
            attendanceCodeId: codeId,
          },
          take: 20,
        });

        totalRecords += records.length;

        for (const record of records) {
          if (record.accountId) {
            const account = await prisma.laborAccount.findUnique({
              where: { id: record.accountId },
            });

            if (account) {
              try {
                const hv = JSON.parse(account.hierarchyValues || '{}');

                // 检查是否符合所有筛选条件
                let matches = true;
                for (const selection of accountFilter.hierarchySelections) {
                  if (selection.levelName === '车间' && selection.valueIds.includes(6)) {
                    if (hv.workshopId !== 6) {
                      matches = false;
                    }
                  }
                  // 可以添加更多层级检查
                }

                if (matches) {
                  matchingRecords++;
                }
              } catch (e) {
                // 解析失败，跳过
              }
            }
          }
        }
      }

      console.log(`总工时记录数: ${totalRecords}`);
      console.log(`符合筛选条件的记录数: ${matchingRecords}`);

      if (matchingRecords === 0 && totalRecords > 0) {
        console.log('\n✗ 工时记录存在，但不符合账户筛选条件');
        console.log('建议：放宽账户筛选条件或检查账户的hierarchyValues是否正确');
      }
    }
  }

  console.log('\n========================================\n');
}

diagnoseL01Issue()
  .catch((e) => {
    console.error('诊断失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
