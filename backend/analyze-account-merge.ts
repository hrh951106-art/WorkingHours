import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 分析账户合并逻辑的影响 ===\n');

  // 查询摆卡记录 193
  const punchPair = await prisma.punchPair.findUnique({
    where: { id: 193 },
  });

  // 查询刷卡账户
  const punchAccount = await prisma.laborAccount.findUnique({
    where: { id: punchPair!.accountId! },
  });

  // 查询员工主账户
  const employee = await prisma.employee.findFirst({
    where: { employeeNo: punchPair!.employeeNo },
  });

  const employeeMainAccounts = await prisma.laborAccount.findMany({
    where: {
      employeeId: employee?.id,
      type: 'MAIN',
      effectiveDate: { lte: new Date() },
      OR: [
        { expiryDate: null },
        { expiryDate: { gt: new Date() } },
      ],
    },
    orderBy: { level: 'desc' },
    take: 1,
  });

  const employeeMainAccount = employeeMainAccounts[0] || null;

  // 查询转移账户（从排班信息）
  const dayStart = new Date(punchPair!.pairDate);
  dayStart.setHours(0, 0, 0, 0);

  const schedule = await prisma.schedule.findFirst({
    where: {
      employeeId: employee?.id,
      scheduleDate: dayStart,
      shiftId: punchPair!.shiftId,
    },
  });

  let transferAccountId: number | null = null;
  if (schedule?.adjustedSegments) {
    try {
      const adjustedSegments = JSON.parse(schedule.adjustedSegments);
      // 段2的转移账户
      const seg2 = adjustedSegments.find((s: any) => s.id === 13);
      transferAccountId = seg2?.accountId || null;
    } catch (e) {
      // ignore
    }
  }

  const transferAccount = transferAccountId
    ? await prisma.laborAccount.findUnique({ where: { id: transferAccountId } })
    : null;

  console.log('1. 账户信息:');
  console.log(`   刷卡账户 (ID=${punchAccount?.id}): ${punchAccount?.namePath}`);
  console.log(`   转移账户 (ID=${transferAccountId}): ${transferAccount?.namePath || 'null'}`);
  console.log(`   主账户 (ID=${employeeMainAccount?.id}): ${employeeMainAccount?.namePath || 'null'}`);

  console.log('\n2. 账户层级详情:');

  const printHierarchy = (account: any, label: string) => {
    if (!account) return;
    console.log(`   ${label} (ID=${account.id}):`);
    const hierarchyValues = JSON.parse(account.hierarchyValues || '[]');
    hierarchyValues.forEach((hv: any) => {
      const hasValue = hv.selectedValue ? '✓' : '✗';
      const value = hv.selectedValue?.name || hv.selectedValue?.code || 'null';
      console.log(`     层级${hv.level} (${hv.name}): ${hasValue} ${value}`);
    });
  };

  printHierarchy(punchAccount, '刷卡账户');
  printHierarchy(transferAccount, '转移账户');
  printHierarchy(employeeMainAccount, '主账户');

  // 模拟账户合并
  console.log('\n3. 模拟账户合并（刷卡 > 转移 > 主账户）:');

  const accountsToMerge: any[] = [];
  if (punchAccount) accountsToMerge.push({ ...punchAccount, priority: '刷卡' });
  if (transferAccount) accountsToMerge.push({ ...transferAccount, priority: '转移' });
  if (employeeMainAccount) accountsToMerge.push({ ...employeeMainAccount, priority: '主账户' });

  // 创建合并后的层级值映射表
  const mergedValuesMap = new Map<number, any>();

  // 首先添加主账户的所有层级值
  const employeeMainValues = employeeMainAccount?.hierarchyValues
    ? JSON.parse(employeeMainAccount.hierarchyValues)
    : [];
  employeeMainValues.forEach((v: any) => {
    mergedValuesMap.set(v.level, { ...v, source: '主账户' });
  });

  // 然后用转移账户的层级值覆盖
  const transferValues = transferAccount?.hierarchyValues
    ? JSON.parse(transferAccount.hierarchyValues)
    : [];
  transferValues.forEach((v: any) => {
    if (v.selectedValue) {
      mergedValuesMap.set(v.level, { ...v, source: '转移账户' });
    }
  });

  // 最后用刷卡账户的层级值覆盖
  const punchValues = punchAccount?.hierarchyValues
    ? JSON.parse(punchAccount.hierarchyValues)
    : [];
  punchValues.forEach((v: any) => {
    if (v.selectedValue) {
      mergedValuesMap.set(v.level, { ...v, source: '刷卡账户' });
    }
  });

  // 输出合并结果
  const mergedValues = Array.from(mergedValuesMap.values()).sort((a, b) => a.level - b.level);
  console.log('   合并后的账户层级:');
  mergedValues.forEach((hv: any) => {
    const value = hv.selectedValue?.name || hv.selectedValue?.code || 'null';
    console.log(`     层级${hv.level} (${hv.name}): ${value} [来源: ${hv.source}]`);
  });

  // 检查合并后的账户是否匹配各个出勤代码
  console.log('\n4. 出勤代码匹配检查:');

  const attendanceCodes = await prisma.calculationAttendanceCode.findMany({
    where: {
      type: 'LEAN_HOURS',
      status: 'ACTIVE',
      calculateHours: true,
    },
    orderBy: [{ priority: 'asc' }, { id: 'asc' }],
  });

  const mergedAccount = {
    id: punchAccount!.id,
    hierarchyValues: JSON.stringify(mergedValues),
  };

  attendanceCodes.forEach((code) => {
    console.log(`   ${code.name} (${code.code}):`);
    console.log(`     配置层级: ${code.accountLevels}`);

    const accountLevels = JSON.parse(code.accountLevels || '[]');
    const requiredLevels = new Set(accountLevels.map((s: any) => s + 1));

    // 找出合并后账户中所有有值的层级
    const accountFilledLevels = mergedValues
      .filter((hv: any) => hv.selectedValue)
      .map((hv: any) => hv.level);

    console.log(`     合并后账户有值层级: [${accountFilledLevels.join(',')}]`);

    // 检查匹配
    const matchCount = accountFilledLevels.length;
    const requiredCount = requiredLevels.size;

    const isMatch = matchCount === requiredCount &&
      accountFilledLevels.every((l) => requiredLevels.has(l));

    console.log(`     匹配: ${isMatch ? '✓' : '✗'}`);
  });

  // 查询实际生成的工时结果
  console.log('\n5. 实际生成的工时结果:');
  const calcResults = await prisma.calcResult.findMany({
    where: {
      employeeNo: punchPair!.employeeNo,
      calcDate: punchPair!.pairDate,
    },
    include: {
      calculationAttendanceCode: true,
    },
    orderBy: { punchInTime: 'asc' },
  });

  calcResults.forEach((result, idx) => {
    if (result.punchInTime >= new Date('2026-05-12T04:00:00.000Z')) {
      console.log(`   结果${idx + 1}:`);
      console.log(`     时间: ${result.punchInTime?.toISOString()} ~ ${result.punchOutTime?.toISOString()}`);
      console.log(`     工时: ${result.actualHours}h`);
      console.log(`     账户: ${result.accountName || 'null'}`);
      console.log(`     出勤代码: ${result.calculationAttendanceCode?.name || 'null'}`);
    }
  });
}

main()
  .then(() => console.log('\n分析完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
