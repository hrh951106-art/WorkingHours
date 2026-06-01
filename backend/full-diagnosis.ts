import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== A01分摊计算完整排查 ==========\n');

  // ========== 第1步：检查A01配置 ==========
  console.log('【第1步：检查A01配置】\n');
  const a01Config = await prisma.earnedHoursAllocationConfig.findFirst({
    where: { code: 'A01' }
  });

  if (!a01Config) {
    console.log('❌ A01配置不存在');
    return;
  }

  console.log(`✅ A01配置存在`);
  console.log(`  ID: ${a01Config.id}`);
  console.log(`  状态: ${a01Config.status}`);
  console.log(`  配置生效时间: ${a01Config.effectiveStartTime.toISOString().substring(0, 10)} ~ ${a01Config.effectiveEndTime ? a01Config.effectiveEndTime.toISOString().substring(0, 10) : '无限期'}`);

  const sourceConfig = JSON.parse(a01Config.sourceConfig || '{}');
  const rules = JSON.parse(a01Config.rules || '[]');
  console.log(`  考勤代码: ${JSON.stringify(sourceConfig.attendanceCodes)}`);
  console.log(`  账户筛选: ${JSON.stringify(sourceConfig.accountFilter?.hierarchySelections)}`);
  console.log(`  规则数量: ${rules.length}`);

  // ========== 第2步：检查5月19日生产记录 ==========
  console.log('\n【第2步：检查5月19日生产记录】\n');
  const prodRecord = await prisma.productionRecord.findFirst({
    where: { recordDate: new Date('2026-05-19') }
  });

  if (!prodRecord) {
    console.log('❌ 5月19日没有生产记录');
    return;
  }

  console.log(`✅ 生产记录存在`);
  console.log(`  产品ID: ${prodRecord.productId}`);
  console.log(`  产品名称: ${prodRecord.productName}`);
  console.log(`  产量: ${prodRecord.actualQty}`);
  console.log(`  组织ID: ${prodRecord.orgId}`);
  console.log(`  组织名称: ${prodRecord.orgName}`);

  // ========== 第3步：检查标准工时配置匹配 ==========
  console.log('\n【第3步：检查标准工时配置匹配】\n');
  const orgName = prodRecord.orgName;
  const segments = orgName.split('/').filter(s => s.trim() !== '');
  console.log(`组织层级: [${segments.join(', ')}]`);

  // 生成路径组合
  const pathCombinations = [];
  for (let len = segments.length; len >= 1; len--) {
    for (let i = 0; i <= segments.length - len; i++) {
      pathCombinations.push(segments.slice(i, i + len).join('/'));
    }
  }

  const recordDate = new Date('2026-05-19');
  recordDate.setHours(0, 0, 0, 0);

  let matchedConfig = null;
  for (const path of pathCombinations) {
    const config = await prisma.productStandardHourByLevel.findFirst({
      where: {
        productId: prodRecord.productId,
        accountPath: path,
        effectiveDate: { lte: recordDate },
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: recordDate } }
        ],
        status: 'ACTIVE',
        deletedAt: null
      }
    });

    if (config) {
      console.log(`✅ 找到匹配配置: 路径="${path}"`);
      console.log(`  配置ID: ${config.id}`);
      console.log(`  标准工时: ${config.standardHours} / ${config.quantity || 1}件`);
      matchedConfig = config;
      break;
    }
  }

  if (!matchedConfig) {
    console.log('❌ 没有找到匹配的标准工时配置');
    return;
  }

  // 计算总得工时
  const quantity = matchedConfig.quantity || 1;
  const standardHours = matchedConfig.standardHours;
  const totalEarnedHours = (prodRecord.actualQty / quantity) * standardHours;
  console.log(`  总得工时: ${totalEarnedHours.toFixed(2)} 小时`);

  if (totalEarnedHours <= 0) {
    console.log('❌ 总得工时为0或负数');
    return;
  }

  // ========== 第4步：检查账户 ==========
  console.log('\n【第4步：检查账户】\n');
  const account = await prisma.laborAccount.findFirst({
    where: {
      id: prodRecord.orgId,
      status: 'ACTIVE'
    }
  });

  if (!account) {
    console.log(`❌ 账户${prodRecord.orgId}不存在或不是ACTIVE状态`);
    return;
  }

  console.log(`✅ 账户存在且为ACTIVE状态`);
  console.log(`  账户ID: ${account.id}`);
  console.log(`  账户名称: ${account.name}`);
  console.log(`  账户路径: ${account.path || account.namePath}`);

  // ========== 第5步：账户层级筛选 ==========
  console.log('\n【第5步：账户层级筛选】\n');
  if (sourceConfig.accountFilter?.hierarchySelections) {
    console.log('有层级筛选条件，检查账户是否满足...');

    const hierarchyValues = account.hierarchyValues ? JSON.parse(account.hierarchyValues) : [];
    let passedFilter = true;

    for (const selection of sourceConfig.accountFilter.hierarchySelections) {
      const accountLevelValue = hierarchyValues.find((hv: any) => hv.level === selection.level);
      const isMatch = accountLevelValue && selection.valueIds.includes(accountLevelValue.selectedValue?.code);

      console.log(`  层级${selection.level}: ${isMatch ? '✅' : '❌'} ${accountLevelValue?.selectedValue?.code || '(无)'} vs ${selection.valueIds.join(',')}`);

      if (!isMatch) {
        passedFilter = false;
      }
    }

    if (!passedFilter) {
      console.log('❌ 账户未通过层级筛选');
      return;
    }

    console.log('✅ 账户通过层级筛选');
  } else {
    console.log('✅ 没有层级筛选条件');
  }

  // ========== 第6步：查询工时结果 ==========
  console.log('\n【第6步：查询工时结果】\n');

  // 构建账户路径
  const accountPaths = new Set<string>();
  if (account.path) {
    accountPaths.add(account.path);
    const pathSegments = account.path.split('/');
    for (let i = 1; i < pathSegments.length; i++) {
      accountPaths.add(pathSegments.slice(0, i + 1).join('/'));
    }
  }

  console.log(`查询条件:`);
  console.log(`  日期: ${recordDate.toISOString().substring(0, 10)}`);
  console.log(`  考勤代码: ${sourceConfig.attendanceCodes?.join(',') || '(无)'}`);
  console.log(`  账户路径: ${Array.from(accountPaths).join(', ')}`);

  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      workDate: recordDate,
      status: 'ACTIVE',
      attendanceCode: { in: sourceConfig.attendanceCodes || [] },
      accountPath: { in: Array.from(accountPaths) }
    }
  });

  console.log(`找到工时结果数量: ${workHourResults.length}`);

  if (workHourResults.length === 0) {
    console.log('❌ 没有找到工时结果');
    return;
  }

  const totalWorkHours = workHourResults.reduce((sum, wh) => sum + (wh.workHours || 0), 0);
  console.log(`✅ 找到工时结果`);
  console.log(`  总工时: ${totalWorkHours.toFixed(2)}`);
  console.log(`  涉及员工: ${workHourResults.length}人`);

  // ========== 第7步：员工筛选 ==========
  console.log('\n【第7步：员工筛选】\n');

  if (sourceConfig.employeeFilter?.fieldGroups && sourceConfig.employeeFilter.fieldGroups.length > 0) {
    console.log('有员工筛选条件，检查员工是否满足...');

    let passedEmployeeCount = 0;
    for (const whr of workHourResults) {
      const emp = await prisma.employee.findUnique({
        where: { employeeNo: whr.employeeNo }
      });

      if (emp && emp.status === 'ACTIVE') {
        passedEmployeeCount++;
      }
    }

    console.log(`通过员工筛选: ${passedEmployeeCount}/${workHourResults.length}`);

    if (passedEmployeeCount === 0) {
      console.log('❌ 没有员工通过筛选');
      return;
    }
  } else {
    console.log('✅ 没有员工筛选条件，所有员工都通过');
  }

  // ========== 第8步：检查分摊规则 ==========
  console.log('\n【第8步：检查分摊规则】\n');

  if (rules.length === 0) {
    console.log('❌ 没有分摊规则');
    return;
  }

  const rule = rules.find((r) => {
    const startTime = r.effectiveStartTime ? new Date(r.effectiveStartTime) : null;
    const endTime = r.effectiveEndTime ? new Date(r.effectiveEndTime) : null;
    return (!startTime || recordDate >= startTime) && (!endTime || recordDate <= endTime);
  });

  if (!rule) {
    console.log('❌ 没有找到在5月19日生效的分摊规则');
    return;
  }

  console.log(`✅ 找到生效规则: ${rule.ruleName}`);
  console.log(`  分摊方式: ${rule.allocationBasis}`);

  // ========== 第9步：检查现有分摊结果 ==========
  console.log('\n【第9步：检查现有分摊结果】\n');

  const existingResults = await prisma.earnedHoursAllocationResult.findMany({
    where: {
      configId: a01Config.id,
      recordDate: recordDate,
      sourceAccountId: prodRecord.orgId
    }
  });

  console.log(`现有分摊结果数量: ${existingResults.length}`);
  if (existingResults.length > 0) {
    console.log(`  批次号: ${existingResults[0].batchNo}`);
    console.log(`  总分摊工时: ${existingResults.reduce((sum, r) => sum + (r.allocatedHours || 0), 0).toFixed(2)}`);
  }

  // ========== 第10步：最终结论 ==========
  console.log('\n【第10步：最终结论】\n');
  console.log('✅ 所有检查都通过！');
  console.log(`  1. A01配置存在且有效`);
  console.log(`  2. 生产记录存在`);
  console.log(`  3. 标准工时配置匹配 (总得工时: ${totalEarnedHours.toFixed(2)}小时)`);
  console.log(`  4. 账户存在且ACTIVE`);
  console.log(`  5. 账户通过层级筛选`);
  console.log(`  6. 工时结果存在 (${workHourResults.length}人, ${totalWorkHours.toFixed(2)}工时)`);
  console.log(`  7. 员工通过筛选`);
  console.log(`  8. 分摊规则生效`);

  console.log('\n❌ 但是没有产生分摊结果！');
  console.log('\n可能的原因:');
  console.log('  1. 分摊计算任务未执行');
  console.log('  2. 分摊计算执行时发生错误');
  console.log('  3. 分摊结果被误删');
  console.log('  4. 数据库事务问题');

  console.log('\n建议操作:');
  console.log('  1. 查看后端日志，确认分摊计算是否执行');
  console.log('  2. 重新执行A01分摊计算');
  console.log('  3. 检查数据库事务日志');

  console.log('\n========== 排查完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
