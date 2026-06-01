import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('=== 诊断A01规则无法计算2026-05-19数据的原因 ===\n');

  const targetDate = new Date('2026-05-19');
  targetDate.setHours(0, 0, 0, 0);

  // 1. 查询A01规则配置
  console.log('1. 查询A01规则配置:');
  const config = await prisma.earnedHoursAllocationConfig.findFirst({
    where: {
      code: 'A01',
      deletedAt: null,
    },
  });

  if (!config) {
    console.log('❌ 未找到A01规则配置');
    return;
  }

  console.log(`✓ 找到A01配置: ${config.configName} (ID: ${config.id})`);
  console.log(`   状态: ${config.status}`);

  try {
    const sourceConfig = JSON.parse(config.sourceConfig || '{}');
    const rules = JSON.parse(config.rules || '[]');

    console.log('\n   数据源配置:');
    console.log('   - 人员筛选:', JSON.stringify(sourceConfig.employeeFilter, null, 2));
    console.log('   - 账户筛选:', JSON.stringify(sourceConfig.accountFilter, null, 2));
    console.log('   - 出勤代码:', sourceConfig.attendanceCodes);

    console.log('\n   分摊规则:');
    rules.forEach((rule: any, idx: number) => {
      console.log(`   规则${idx + 1}: ${rule.ruleName}`);
      console.log(`     - 生效时间: ${rule.effectiveStartTime} ~ ${rule.effectiveEndTime}`);
      console.log(`     - 分摊方式: ${rule.allocationBasis}`);
    });

    // 2. 查询2026-05-19的生产记录
    console.log('\n2. 查询2026-05-19的生产记录:');
    const startDate = new Date('2026-05-19T00:00:00.000Z');
    const endDate = new Date('2026-05-19T23:59:59.999Z');

    const productionRecords = await prisma.productionRecord.findMany({
      where: {
        recordDate: { gte: startDate, lte: endDate },
        deletedAt: null,
      },
    });

    console.log(`✓ 找到 ${productionRecords.length} 条生产记录`);

    if (productionRecords.length === 0) {
      console.log('❌ 2026-05-19没有生产记录，这是无法计算的原因！');
      return;
    }

    // 显示每条生产记录的详情
    for (const record of productionRecords) {
      console.log(`\n   记录ID: ${record.id}`);
      console.log(`   - 产品: ${record.productName} (ID: ${record.productId})`);
      console.log(`   - 产量: ${record.actualQty}`);
      console.log(`   - 账户: ${record.orgName} (ID: ${record.orgId})`);
      console.log(`   - 日期: ${record.recordDate}`);
    }

    // 3. 查询工时结果
    console.log('\n3. 查询2026-05-19的工时结果:');
    const workHourResults = await prisma.workHourResult.findMany({
      where: {
        workDate: targetDate,
        status: 'ACTIVE',
      },
    });

    console.log(`✓ 找到 ${workHourResults.length} 条工时结果`);

    if (workHourResults.length === 0) {
      console.log('❌ 2026-05-19没有工时结果，这是无法计算的原因！');
      return;
    }

    // 4. 检查账户路径匹配
    console.log('\n4. 检查账户路径匹配:');
    const accountFilter = sourceConfig.accountFilter || {};
    const hierarchySelections = accountFilter.hierarchySelections || [];

    console.log(`   配置的层级筛选: ${JSON.stringify(hierarchySelections)}`);

    // 获取生产记录中的账户
    const accountId = productionRecords[0].orgId;
    const account = await prisma.laborAccount.findFirst({
      where: { id: accountId },
    });

    if (account) {
      console.log(`\n   生产记录账户信息:`);
      console.log(`   - ID: ${account.id}`);
      console.log(`   - 名称: ${account.name}`);
      console.log(`   - 路径: ${account.path}`);
      console.log(`   - 层级值: ${account.hierarchyValues}`);

      // 解析账户的层级值
      let hierarchyValues: any[] = [];
      try {
        hierarchyValues = JSON.parse(account.hierarchyValues || '[]');
      } catch (e) {
        console.log('   解析hierarchyValues失败');
      }

      console.log(`\n   层级值详情:`);
      hierarchyValues.forEach((hv: any) => {
        console.log(`   - Level ${hv.level} (${hv.name}): ${JSON.stringify(hv.selectedValue)}`);
      });

      // 检查是否匹配
      if (hierarchySelections.length > 0) {
        console.log(`\n   匹配检查:`);
        const hierarchyValuesMap = new Map(hierarchyValues.map((hv: any) => [hv.levelId, hv]));

        for (const selection of hierarchySelections) {
          const hv = hierarchyValuesMap.get(selection.levelId);
          console.log(`   - Level ${selection.levelId}:`);
          console.log(`     配置值: [${selection.valueIds.join(', ')}]`);

          if (!hv) {
            console.log(`     账户值: ❌ 账户没有此层级`);
            console.log(`     匹配结果: ❌ 不匹配`);
          } else {
            const accountValueId = hv.selectedValue?.code || hv.selectedValue?.id || hv.selectedValue?.value;
            console.log(`     账户值: ${JSON.stringify(accountValueId)}`);

            const match = selection.valueIds.includes(accountValueId);
            console.log(`     匹配结果: ${match ? '✅ 匹配' : '❌ 不匹配'}`);
          }
        }
      }
    }

    // 5. 检查出勤代码筛选
    console.log('\n5. 检查出勤代码筛选:');
    const attendanceCodes = sourceConfig.attendanceCodes || [];
    console.log(`   配置的出勤代码: [${attendanceCodes.join(', ')}]`);

    if (attendanceCodes.length > 0) {
      const filteredWorkHours = workHourResults.filter(wh =>
        attendanceCodes.includes(wh.attendanceCode)
      );
      console.log(`   符合出勤代码的工时结果: ${filteredWorkHours.length} 条`);

      if (filteredWorkHours.length === 0) {
        const uniqueAttendanceCodes = [...new Set(workHourResults.map(wh => wh.attendanceCode))];
        console.log(`   实际的出勤代码: [${uniqueAttendanceCodes.join(', ')}]`);
        console.log(`   ❌ 没有工时结果符合出勤代码筛选，这是无法计算的原因！`);
      }
    }

    // 6. 检查标准工时配置
    console.log('\n6. 检查标准工时配置:');
    const productStandardHours = await prisma.productStandardHourByLevel.findMany({
      where: {
        productId: productionRecords[0].productId,
        deletedAt: null,
        status: 'ACTIVE',
        effectiveDate: { lte: targetDate },
        OR: [
          { expiryDate: { gte: targetDate } },
          { expiryDate: null },
        ],
      },
    });

    console.log(`   产品ID ${productionRecords[0].productId} 的标准工时配置:`);

    if (productStandardHours.length === 0) {
      console.log('   ❌ 没有找到有效的标准工时配置，这是无法计算的原因！');
    } else {
      productStandardHours.forEach((config) => {
        console.log(`   - 账户路径: ${config.accountPath || '(全局)'}`);
        console.log(`     生效期: ${config.effectiveDate} ~ ${config.expiryDate || '永久'}`);
        console.log(`     标准工时: ${config.standardHours} 小时/${config.quantity} 件`);
      });
    }

    // 7. 检查规则生效时间
    console.log('\n7. 检查分摊规则生效时间:');
    rules.forEach((rule: any) => {
      const startTime = rule.effectiveStartTime ? new Date(rule.effectiveStartTime) : null;
      const endTime = rule.effectiveEndTime ? new Date(rule.effectiveEndTime) : null;

      const isEffective = (!startTime || targetDate >= startTime) && (!endTime || targetDate <= endTime);

      console.log(`   规则: ${rule.ruleName}`);
      console.log(`   - 生效开始: ${startTime ? startTime.toISOString() : '无限制'}`);
      console.log(`   - 生效结束: ${endTime ? endTime.toISOString() : '无限制'}`);
      console.log(`   - 目标日期: ${targetDate.toISOString()}`);
      console.log(`   - 是否生效: ${isEffective ? '✅ 是' : '❌ 否'}`);

      if (!isEffective) {
        console.log(`   ❌ 规则在目标日期未生效，这是无法计算的原因！`);
      }
    });

    // 8. 总结
    console.log('\n=== 诊断总结 ===');
    console.log('请检查以上各步骤，找出导致无法计算的根因。');

  } catch (error) {
    console.error('解析配置失败:', error);
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
