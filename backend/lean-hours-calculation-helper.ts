import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 精益工时计算辅助工具
 * 用于测试账户合并逻辑
 */

async function testAccountMerge() {
  console.log('=== 测试账户合并逻辑 ===');

  // 1. 获取一个摆卡记录
  const punchPair = await prisma.punchPair.findFirst({
    where: { employeeNo: '202604003' },
    include: { employee: true },
  });

  if (!punchPair) {
    console.log('未找到摆卡记录');
    return;
  }

  console.log(`摆卡记录: ID=${punchPair.id}, 员工=${punchPair.employeeNo}, 日期=${new Date(punchPair.pairDate).toISOString()}`);
  console.log(`刷卡账户ID: ${punchPair.accountId}`);

  // 2. 获取刷卡账户
  const punchAccount = punchPair.accountId ? await prisma.laborAccount.findUnique({
    where: { id: punchPair.accountId },
    select: { id: true, namePath: true, path: true, level: true, hierarchyValues: true },
  }) : null;

  console.log('\n刷卡账户:');
  console.log(JSON.stringify(punchAccount, null, 2));

  // 3. 获取员工主账户
  const employee = await prisma.employee.findUnique({
    where: { employeeNo: '202604003' },
  });

  if (!employee) {
    console.log('未找到员工信息');
    return;
  }

  const targetDate = new Date();
  const mainAccounts = await prisma.laborAccount.findMany({
    where: {
      employeeId: employee.id,
      type: 'MAIN',
      effectiveDate: { lte: targetDate },
      OR: [
        { expiryDate: null },
        { expiryDate: { gt: targetDate } },
      ],
    },
    orderBy: { level: 'desc' },
    take: 1,
  });

  const mainAccount = mainAccounts[0] || null;
  console.log('\n主账户:');
  console.log(JSON.stringify(mainAccount, null, 2));

  // 4. 合并账户
  const accountsToMerge = [punchAccount, mainAccount].filter(a => a !== null);
  const mergedAccount = mergeAccountsLogic(punchAccount, mainAccount);

  console.log('\n合并后的账户:');
  console.log(JSON.stringify(mergedAccount, null, 2));
}

/**
 * 合并两个劳动力账户
 * 优先级：punchAccount > mainAccount
 */
function mergeAccountsLogic(punchAccount: any, mainAccount: any): any {
  if (!punchAccount && !mainAccount) return null;
  if (!mainAccount) return punchAccount;
  if (!punchAccount) return mainAccount;

  // 解析层级值
  const punchValues = punchAccount.hierarchyValues ? JSON.parse(punchAccount.hierarchyValues) : [];
  const mainValues = mainAccount.hierarchyValues ? JSON.parse(mainAccount.hierarchyValues) : [];

  // 创建合并后的层级值映射表
  const mergedValuesMap = new Map<number, any>();

  // 首先添加主账户的所有层级值（作为基础）
  mainValues.forEach((v: any) => {
    mergedValuesMap.set(v.level, v);
  });

  // 然后用刷卡账户的层级值覆盖（只覆盖有值的层级）
  punchValues.forEach((v: any) => {
    if (v.selectedValue) {
      mergedValuesMap.set(v.level, v);
    }
  });

  // 转换回数组并排序
  const mergedValues = Array.from(mergedValuesMap.values()).sort((a, b) => a.level - b.level);

  // 计算合并后的层级数
  const maxLevel = Math.max(
    punchValues.length > 0 ? punchValues[punchValues.length - 1].level : 0,
    mainValues.length > 0 ? mainValues[mainValues.length - 1].level : 0
  );

  // 构建namePath和path
  const namePath = buildNamePath(mergedValues);
  const path = buildPath(mergedValues);

  return {
    id: punchAccount.id,
    namePath: namePath,
    path: path,
    level: maxLevel,
    hierarchyValues: JSON.stringify(mergedValues),
  };
}

function buildNamePath(hierarchyValues: any[]): string {
  return hierarchyValues
    .map(v => {
      if (!v.selectedValue) return '-';
      if (v.selectedValueLabel) return v.selectedValueLabel;
      if (typeof v.selectedValue === 'object' && v.selectedValue !== null) {
        return v.selectedValue.name || '-';
      }
      return String(v.selectedValue);
    })
    .join('/');
}

function buildPath(hierarchyValues: any[]): string {
  return hierarchyValues
    .map(v => {
      if (!v.selectedValue) return '-';
      if (typeof v.selectedValue === 'object' && v.selectedValue !== null) {
        return v.selectedValue.code || '-';
      }
      return String(v.selectedValue);
    })
    .join('/');
}

// 执行测试
testAccountMerge()
  .then(() => {
    console.log('\n测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('测试失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
