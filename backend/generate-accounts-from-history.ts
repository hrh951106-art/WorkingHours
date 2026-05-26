import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202604003';

  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
    include: { org: true }
  });

  if (!employee) {
    console.log('员工不存在');
    return;
  }

  console.log('=== 员工基本信息 ===');
  console.log('ID:', employee.id);
  console.log('工号:', employee.employeeNo);
  console.log('姓名:', employee.name);

  // 查询所有工作信息历史记录，按生效日期排序
  const workInfoHistory = await prisma.workInfoHistory.findMany({
    where: { employeeId: employee.id },
    orderBy: { effectiveDate: 'asc' }
  });

  console.log('\n找到 ' + workInfoHistory.length + ' 条工作信息历史记录');

  // 获取账户层级配置
  const hierarchyConfigs = await prisma.accountHierarchyConfig.findMany({
    where: { status: 'ACTIVE' },
    orderBy: [{ level: 'asc' }, { sort: 'asc' }]
  });

  if (hierarchyConfigs.length === 0) {
    console.log('错误：请先配置劳动力账户层级');
    return;
  }

  console.log('账户层级配置: ' + hierarchyConfigs.length + ' 层');

  // 为每条工作信息历史记录生成账户
  console.log('\n=== 开始生成劳动力账户 ===');

  for (let i = 0; i < workInfoHistory.length; i++) {
    const workInfo = workInfoHistory[i];
    const effectiveDate = workInfo.effectiveDate;

    // 计算失效日期：下一条记录的生效日期前一天
    let expiryDate = null;
    if (i < workInfoHistory.length - 1) {
      const nextEffectiveDate = workInfoHistory[i + 1].effectiveDate;
      expiryDate = new Date(nextEffectiveDate);
      expiryDate.setDate(expiryDate.getDate() - 1);
    }

    console.log('\n--- 记录 ' + (i + 1) + ' ---');
    console.log('生效日期:', effectiveDate.toISOString().split('T')[0]);
    console.log('失效日期:', expiryDate ? expiryDate.toISOString().split('T')[0] : '无（当前记录）');
    console.log('组织ID:', workInfo.orgId);
    console.log('变更类型:', workInfo.changeType);

    try {
      // 创建账户
      await createAccountsForWorkInfo(
        employee.id,
        workInfo,
        effectiveDate,
        expiryDate,
        hierarchyConfigs
      );
      console.log('✓ 账户生成成功');
    } catch (error: any) {
      console.log('✗ 账户生成失败:', error.message);
    }
  }

  // 验证生成的账户
  const accounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee.id },
    orderBy: { effectiveDate: 'asc' }
  });

  console.log('\n=== 生成的劳动力账户 ===');
  console.log('总计: ' + accounts.length + ' 个账户');
  accounts.forEach(acc => {
    console.log({
      id: acc.id,
      code: acc.code.substring(0, 50),
      name: acc.name,
      level: acc.level,
      effectiveDate: acc.effectiveDate.toISOString().split('T')[0],
      expiryDate: acc.expiryDate ? acc.expiryDate.toISOString().split('T')[0] : '无',
      status: acc.status
    });
  });
}

async function createAccountsForWorkInfo(
  employeeId: number,
  workInfo: any,
  effectiveDate: Date,
  expiryDate: Date | null,
  hierarchyConfigs: any[]
) {
  const timestamp = Date.now();
  const account = await prisma.laborAccount.create({
    data: {
      code: 'account_' + workInfo.id + '_' + timestamp,
      name: 'Account ' + workInfo.changeType,
      type: 'MAIN',
      level: 7,
      path: 'test/path/' + workInfo.id,
      employeeId: employeeId,
      effectiveDate: effectiveDate,
      expiryDate: expiryDate,
      status: expiryDate ? 'INACTIVE' : 'ACTIVE'
    }
  });

  return account;
}

main()
  .then(() => console.log('\n操作完成'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
