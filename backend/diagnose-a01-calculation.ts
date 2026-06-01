import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('=== 深入诊断：A01规则无法计算2026-05-19的详细原因 ===\n');

  // 使用日期范围查询，避免时区问题
  const startDate = new Date('2026-05-19T00:00:00.000Z');
  const endDate = new Date('2026-05-19T23:59:59.999Z');
  const targetDate = startDate;

  // 1. 获取A01规则配置
  console.log('1. 获取A01规则配置:');
  const config = await prisma.earnedHoursAllocationConfig.findFirst({
    where: {
      code: 'A01',
      deletedAt: null,
    },
  });

  if (!config) {
    console.log('❌ 未找到A01规则');
    return;
  }

  console.log(`✓ 规则ID: ${config.id}`);
  console.log(`  规则名称: ${config.configName}`);
  console.log(`  状态: ${config.status}`);

  let sourceConfig: any = {};
  let rules: any[] = [];
  try {
    sourceConfig = JSON.parse(config.sourceConfig || '{}');
    rules = JSON.parse(config.rules || '[]');
  } catch (e) {
    console.log('❌ 解析配置失败:', e);
    return;
  }

  console.log('\n  人员筛选:');
  console.log('  ', JSON.stringify(sourceConfig.employeeFilter, null, 2));

  console.log('\n  工时筛选:');
  const accountFilter = sourceConfig.accountFilter || {};
  const hierarchySelections = accountFilter.hierarchySelections || [];
  const attendanceCodes = sourceConfig.attendanceCodes || [];

  console.log(`    层级筛选: ${JSON.stringify(hierarchySelections, null, 2)}`);
  console.log(`    出勤代码: [${attendanceCodes.join(', ')}]`);

  console.log('\n  分摊规则:');
  rules.forEach((rule: any, idx: number) => {
    console.log(`    规则${idx + 1}: ${rule.ruleName}`);
    console.log(`      生效时间: ${rule.effectiveStartTime} ~ ${rule.effectiveEndTime || '永久'}`);
    console.log(`      分摊方式: ${rule.allocationBasis}`);
  });

  // 2. 查询生产记录
  console.log('\n2. 查询2026-05-19的生产记录:');

  const productionRecords = await prisma.productionRecord.findMany({
    where: {
      recordDate: { gte: startDate, lte: endDate },
      deletedAt: null,
    },
  });

  console.log(`找到 ${productionRecords.length} 条生产记录`);

  if (productionRecords.length === 0) {
    console.log('❌ 没有生产记录，无法进行分摊计算！');
    return;
  }

  for (const record of productionRecords) {
    console.log(`\n  记录ID: ${record.id}`);
    console.log(`    产品: ${record.productName} (ID: ${record.productId})`);
    console.log(`    产量: ${record.actualQty}`);
    console.log(`    账户ID: ${record.orgId}`);
    console.log(`    账户名称: ${record.orgName}`);
    console.log(`    日期: ${record.recordDate}`);
  }

  // 3. 检查生产记录的账户信息
  console.log('\n3. 检查生产记录的劳动力账户:');
  const productionAccount = await prisma.laborAccount.findFirst({
    where: {
      id: productionRecords[0].orgId,
    },
    select: {
      id: true,
      name: true,
      code: true,
      path: true,
      hierarchyValues: true,
      status: true,
    },
  });

  if (!productionAccount) {
    console.log(`❌ 生产记录的账户 ${productionRecords[0].orgId} 不存在！`);
    return;
  }

  console.log('✓ 生产账户信息:');
  console.log(`  id: ${productionAccount.id}`);
  console.log(`  name: ${productionAccount.name}`);
  console.log(`  code: ${productionAccount.code}`);
  console.log(`  path: ${productionAccount.path}`);
  console.log(`  hierarchyValues: ${productionAccount.hierarchyValues}`);

  // 解析生产账户的层级值
  let productionHierarchyValues: any[] = [];
  try {
    productionHierarchyValues = JSON.parse(productionAccount.hierarchyValues || '[]');
    console.log('\n  生产账户层级详情:');
    productionHierarchyValues.forEach((hv: any) => {
      console.log(`    Level ${hv.level} (${hv.name}): ${JSON.stringify(hv.selectedValue)}`);
    });
  } catch (e) {
    console.log('  解析hierarchyValues失败');
  }

  // 4. 检查层级筛选匹配
  console.log('\n4. 检查层级筛选匹配:');
  let productionAccountMatch = true;
  if (hierarchySelections.length > 0) {
    const hierarchyValuesMap = new Map(productionHierarchyValues.map((hv: any) => [hv.levelId, hv]));

    let allMatch = true;
    for (const selection of hierarchySelections) {
      const hv = hierarchyValuesMap.get(selection.levelId);
      console.log(`\n  检查 Level ${selection.level} (${selection.levelName}):`);
      console.log(`    配置的valueIds: [${selection.valueIds.join(', ')}]`);

      if (!hv) {
        console.log(`    ❌ 账户没有此层级`);
        allMatch = false;
        continue;
      }

      const accountValueId = hv.selectedValue?.code || hv.selectedValue?.id || hv.selectedValue?.value;
      console.log(`    账户的值: ${JSON.stringify(hv.selectedValue)}`);
      console.log(`    提取的valueId: ${accountValueId}`);

      const match = selection.valueIds.includes(accountValueId);
      console.log(`    匹配结果: ${match ? '✅ 匹配' : '❌ 不匹配'}`);

      if (!match) {
        allMatch = false;
      }
    }

    if (allMatch) {
      productionAccountMatch = true;
      console.log('\n✓ 层级筛选: 通过');
    } else {
      productionAccountMatch = false;
      console.log('\n❌ 层级筛选: 未通过 - 生产账户不符合筛选条件');
    }
  } else {
    productionAccountMatch = true; // 没有筛选条件就算通过
    console.log('  没有配置层级筛选');
  }

  // 5. 查询工时记录（使用日期范围查询，避免时区问题）
  console.log('\n5. 查询工时记录:');
  console.log(`  查询日期范围: ${startDate.toISOString()} ~ ${endDate.toISOString()}`);

  const allWorkHourResults = await prisma.workHourResult.findMany({
    where: {
      workDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  console.log(`2026-05-19的所有工时记录: ${allWorkHourResults.length} 条`);

  if (allWorkHourResults.length === 0) {
    console.log('❌ 该日期没有任何工时记录，无法进行分摊计算！');
    return;
  }

  console.log('\n  所有工时记录详情:');
  for (const result of allWorkHourResults) {
    console.log(`    员工: ${result.employeeNo}, 工时: ${result.workHours}, 出勤代码: ${result.attendanceCode || 'NULL'}, 账户ID: ${result.accountId}, 账户路径: ${result.accountPath}, 状态: ${result.status}`);
  }

  // 按出勤代码筛选
  const workHourResults = attendanceCodes.length > 0
    ? allWorkHourResults.filter(r => attendanceCodes.includes(r.attendanceCode))
    : allWorkHourResults;

  console.log(`\n  筛选后的工时记录（出勤代码[${attendanceCodes.join(', ')}]）: ${workHourResults.length} 条`);

  // 6. 检查工时账户的层级筛选
  console.log('\n6. 检查工时账户的层级筛选:');
  const workHourAccountIds = [...new Set(workHourResults.map(r => r.accountId).filter((id): id is number => id !== null))];

  console.log(`涉及 ${workHourAccountIds.length} 个唯一工时账户`);

  let matchedAccounts = 0;
  for (const accountId of workHourAccountIds) {
    const account = await prisma.laborAccount.findFirst({
      where: { id: accountId },
      select: {
        id: true,
        name: true,
        path: true,
        hierarchyValues: true,
      },
    });

    if (!account) continue;

    console.log(`\n  工时账户 ID: ${account.id}`);
    console.log(`    name: ${account.name}`);
    console.log(`    path: ${account.path}`);

    let hierarchyValues: any[] = [];
    try {
      hierarchyValues = JSON.parse(account.hierarchyValues || '[]');
    } catch (e) {
      console.log('    解析hierarchyValues失败');
      continue;
    }

    const hierarchyValuesMap = new Map(hierarchyValues.map((hv: any) => [hv.levelId, hv]));

    let accountMatch = true;
    for (const selection of hierarchySelections) {
      const hv = hierarchyValuesMap.get(selection.levelId);
      if (!hv) {
        console.log(`    ❌ 账户没有Level ${selection.levelId}`);
        accountMatch = false;
        break;
      }

      const accountValueId = hv.selectedValue?.code || hv.selectedValue?.id || hv.selectedValue?.value;
      const match = selection.valueIds.includes(accountValueId);

      if (!match) {
        console.log(`    ❌ Level ${selection.level}: ${accountValueId} 不在 [${selection.valueIds.join(', ')}] 中`);
        accountMatch = false;
      }
    }

    if (accountMatch) {
      console.log(`    ✅ 该账户通过层级筛选`);
      matchedAccounts++;
    } else {
      console.log(`    ❌ 该账户未通过层级筛选`);
    }
  }

  console.log(`\n  通过层级筛选的账户数: ${matchedAccounts}/${workHourAccountIds.length}`);

  if (matchedAccounts === 0) {
    console.log('\n❌ 没有工时账户通过层级筛选，无法进行分摊计算！');
    return;
  }

  // 7. 检查人员筛选
  console.log('\n7. 检查人员筛选:');
  const employeeFilter = sourceConfig.employeeFilter || { fieldGroups: [] };

  if (employeeFilter.fieldGroups.length === 0) {
    console.log('  没有配置人员筛选，所有员工都通过');
  } else {
    console.log('  人员筛选条件:', JSON.stringify(employeeFilter, null, 2));

    let matchedEmployees = 0;
    for (const result of workHourResults) {
      const employee = await prisma.employee.findFirst({
        where: { employeeNo: result.employeeNo },
        select: {
          employeeNo: true,
          name: true,
          customFields: true,
        },
      });

      if (!employee) continue;

      console.log(`\n  员工: ${employee.employeeNo} (${employee.name})`);

      let employeeMatch = true;
      for (const fieldGroup of employeeFilter.fieldGroups) {
        if (!fieldGroup.conditions || fieldGroup.conditions.length === 0) continue;

        for (const condition of fieldGroup.conditions) {
          let fieldValue: any = null;

          if (condition.fieldCode === 'position') {
            // 先获取员工的ID
            const emp = await prisma.employee.findFirst({
              where: { employeeNo: result.employeeNo },
              select: { id: true },
            });

            if (!emp) {
              console.log(`    未找到员工ID`);
              employeeMatch = false;
              break;
            }

            const workInfo = await prisma.workInfoHistory.findFirst({
              where: {
                employeeId: emp.id,
                OR: [
                  { endDate: null },
                  { endDate: { gte: new Date() } }
                ]
              },
              orderBy: { effectiveDate: 'desc' },
              select: { position: true },
            });
            fieldValue = workInfo?.position;
          } else if (employee.customFields) {
            try {
              const customFields = JSON.parse(employee.customFields);
              fieldValue = customFields[condition.fieldCode];
            } catch (e) {
              console.log(`    解析customFields失败`);
            }
          }

          const passes = compareValues(fieldValue, condition.operator, condition.value);
          console.log(`    ${condition.fieldName || condition.fieldCode}: ${fieldValue ?? 'undefined'} ${condition.operator} ${condition.value} = ${passes ? '✅' : '❌'}`);

          if (!passes) {
            employeeMatch = false;
          }
        }
      }

      if (employeeMatch) {
        console.log(`    ✅ 该员工通过人员筛选`);
        matchedEmployees++;
      } else {
        console.log(`    ❌ 该员工未通过人员筛选`);
      }
    }

    console.log(`\n  通过人员筛选的员工数: ${matchedEmployees}/${workHourResults.length}`);

    if (matchedEmployees === 0) {
      console.log('\n❌ 没有员工通过人员筛选，无法进行分摊计算！');
      return;
    }
  }

  // 8. 检查标准工时配置
  console.log('\n8. 检查标准工时配置:');
  const productId = productionRecords[0].productId;
  const productStandardHours = await prisma.productStandardHourByLevel.findMany({
    where: {
      productId: productId,
      deletedAt: null,
      status: 'ACTIVE',
      effectiveDate: { lte: targetDate },
      OR: [
        { expiryDate: { gte: targetDate } },
        { expiryDate: null },
      ],
    },
  });

  console.log(`产品 ${productId} 的标准工时配置: ${productStandardHours.length} 条`);

  if (productStandardHours.length === 0) {
    console.log('❌ 没有找到有效的标准工时配置，无法计算总得工时！');

    // 尝试查找全局配置
    const globalConfig = await prisma.productStandardHourByLevel.findFirst({
      where: {
        productId: productId,
        deletedAt: null,
        status: 'ACTIVE',
        effectiveDate: { lte: targetDate },
        OR: [
          { accountPath: '' },
          { accountPath: null },
          { accountPath: '-' },
        ],
      },
    });

    if (globalConfig) {
      console.log(`✓ 找到全局标准工时配置: ${globalConfig.standardHours} 小时/${globalConfig.quantity} 件`);
    } else {
      console.log('❌ 连全局标准工时配置都没有，无法计算！');
      return;
    }
  } else {
    productStandardHours.forEach((config) => {
      console.log(`  账户路径: ${config.accountPath || '(全局)'}, 标准工时: ${config.standardHours}/${config.quantity} 件`);
    });
  }

  // 9. 总结
  console.log('\n=== 诊断总结 ===');
  console.log('检查项:');
  console.log(`  1. 生产记录: ${productionRecords.length > 0 ? '✅' : '❌'} (${productionRecords.length} 条)`);
  console.log(`  2. 生产账户层级筛选: ${productionAccountMatch ? '✅' : '❌'}`);
  console.log(`  3. 工时记录: ${workHourResults.length > 0 ? '✅' : '❌'} (${workHourResults.length} 条)`);
  console.log(`  4. 工时账户层级筛选: ${matchedAccounts > 0 ? '✅' : '❌'} (${matchedAccounts}/${workHourAccountIds.length})`);
  console.log(`  5. 标准工时配置: ${productStandardHours.length > 0 ? '✅' : '❌'}`);

  console.log('\n可能的问题:');
  const issues = [];
  if (productionRecords.length === 0) issues.push('没有生产记录');
  if (!productionAccountMatch) issues.push('生产账户未通过层级筛选');
  if (workHourResults.length === 0) issues.push('没有工时记录');
  if (matchedAccounts === 0) issues.push('没有工时账户通过层级筛选');
  if (productStandardHours.length === 0) issues.push('没有标准工时配置');

  if (issues.length > 0) {
    console.log('❌ 发现以下问题:');
    issues.forEach((issue, idx) => console.log(`   ${idx + 1}. ${issue}`));
  } else {
    console.log('✅ 所有检查项都通过，应该可以正常计算');
    console.log('\n如果还是没有结果，可能需要:');
    console.log('  1. 检查后端日志，查看计算过程中的错误');
    console.log('  2. 检查账户路径格式是否一致');
    console.log('  3. 检查规则生效时间是否正确');
  }
}

function compareValues(fieldValue: any, operator: string, conditionValue: any): boolean {
  if (fieldValue === undefined || fieldValue === null) {
    switch (operator) {
      case 'eq': return false;
      case 'ne': return true;
      case 'in': return false;
      case 'not_in': return true;
      default: return false;
    }
  }

  switch (operator) {
    case 'eq': return fieldValue == conditionValue;
    case 'ne': return fieldValue != conditionValue;
    case 'in': return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
    case 'not_in': return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
    default: return true;
  }
}

diagnose()
  .then(() => {
    console.log('\n诊断完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('诊断失败:', error);
    process.exit(1);
  });
