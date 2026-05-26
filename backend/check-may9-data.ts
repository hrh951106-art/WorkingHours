import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605002';
  const date = '2026-05-09';

  console.log(`=== 检查员工 ${employeeNo} 在 ${date} 的数据和计算情况 ===\n`);

  // 1. 检查摆卡记录
  console.log('=== 摆卡记录 ===');
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo: employeeNo,
      pairDate: {
        gte: new Date(`${date}T00:00:00Z`),
        lte: new Date(`${date}T23:59:59Z`)
      }
    },
    orderBy: { id: 'asc' }
  });

  console.log(`找到 ${punchPairs.length} 条摆卡记录\n`);

  for (const pp of punchPairs) {
    console.log(`--- 摆卡 ID: ${pp.id} ---`);
    console.log(`日期: ${pp.pairDate}`);
    console.log(`班次ID: ${pp.shiftId}`);
    console.log(`班次名称: ${pp.shiftName || 'N/A'}`);
    console.log(`刷卡账户ID: ${pp.accountId || 'N/A'}`);
    console.log(`上班时间: ${pp.inPunchTime}`);
    console.log(`下班时间: ${pp.outPunchTime}`);
    console.log('');
  }

  // 2. 检查刷卡账户
  if (punchPairs.length > 0 && punchPairs[0].accountId) {
    const accountId = punchPairs[0].accountId;
    console.log(`=== 刷卡账户 ${accountId} 详情 ===`);

    const account = await prisma.laborAccount.findUnique({
      where: { id: accountId }
    });

    if (account) {
      console.log(`账户名称: ${account.namePath}`);
      console.log(`账户路径: ${account.path}`);
      console.log(`层级: ${account.level}`);
      console.log('');

      const hierarchyValues = account.hierarchyValues ? JSON.parse(account.hierarchyValues) : [];
      console.log('层级值详情:');
      hierarchyValues.forEach((hv: any) => {
        const value = hv.selectedValue;
        const valueStr = value ? (value.name || value.code || value) : 'null';
        console.log(`  Level ${hv.level} (${hv.name}, ${hv.mappingType}): ${valueStr}`);
      });
      console.log('');
    }
  }

  // 3. 检查计算出勤代码AC_003
  console.log('=== AC_003（工序工时）配置 ===');
  const ac003 = await prisma.calculationAttendanceCode.findFirst({
    where: { code: 'AC_003' }
  });

  if (ac003) {
    console.log(`代码: ${ac003.code}`);
    console.log(`名称: ${ac003.name}`);
    console.log(`类型: ${ac003.type}`);
    console.log(`状态: ${ac003.status}`);
    console.log(`计算工时: ${ac003.calculateHours}`);
    console.log(`账户层级配置: ${ac003.accountLevels}`);
    console.log('');

    const accountLevels = JSON.parse(ac003.accountLevels || '[]');
    console.log('需要检查的层级:');
    accountLevels.forEach((sortValue: number) => {
      const level = sortValue + 1;
      console.log(`  sort=${sortValue} -> level=${level}`);
    });
    console.log('');
  }

  // 4. 检查计算结果
  console.log('=== 计算结果 ===');
  const calcResults = await prisma.calcResult.findMany({
    where: {
      employeeNo: employeeNo,
      calcDate: {
        gte: new Date(`${date}T00:00:00Z`),
        lte: new Date(`${date}T23:59:59Z`)
      }
    },
    include: {
      calculationAttendanceCode: true
    },
    orderBy: { id: 'asc' }
  });

  console.log(`找到 ${calcResults.length} 条计算结果\n`);

  // 按出勤代码分组
  const codeGroups = new Map<string, any[]>();
  calcResults.forEach(result => {
    const code = result.calculationAttendanceCode?.code || 'N/A';
    const name = result.calculationAttendanceCode?.name || 'N/A';
    const type = result.calculationAttendanceCode?.type || 'N/A';
    const key = `${code} (${name}) [${type}]`;

    if (!codeGroups.has(key)) {
      codeGroups.set(key, []);
    }
    codeGroups.get(key)!.push(result);
  });

  console.log('按出勤代码分组:');
  codeGroups.forEach((results, key) => {
    const totalHours = results.reduce((sum, r) => sum + r.actualHours, 0);
    console.log(`  ${key}: ${results.length}条记录, 共${totalHours}小时`);
  });
  console.log('');

  // 检查是否有AC_003的结果
  const hasAC003 = calcResults.some(r => r.calculationAttendanceCode?.code === 'AC_003');
  if (!hasAC003) {
    console.log('❌ 没有找到AC_003（工序工时）的计算结果');
    console.log('');
    console.log('可能的原因:');
    console.log('1. 账户层级不匹配AC_003的要求');
    console.log('2. AC_003未启用或未配置为计算工时');
    console.log('3. 计算逻辑有bug');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
