import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeLogic() {
  console.log('=== 主劳���力账户创建逻辑分析 ===\n');

  const employee = await prisma.employee.findFirst({
    where: { employeeNo: '202605014' },
    select: { id: true, name: true },
  });

  if (!employee) {
    console.log('员工不存在');
    await prisma.$disconnect();
    return;
  }

  // 查询任职记录
  const workInfoHistory = await prisma.workInfoHistory.findMany({
    where: { employeeId: employee.id },
    orderBy: { effectiveDate: 'desc' },
    select: {
      id: true,
      effectiveDate: true,
      position: true,
      jobLevel: true,
      isCurrent: true,
    },
  });

  console.log(`任职记录数: ${workInfoHistory.length}\n`);
  workInfoHistory.forEach((wh) => {
    console.log(`  记录${wh.id}: ${wh.effectiveDate.toISOString().substring(0, 10)} 生效, isCurrent=${wh.isCurrent}, position=${wh.position}, jobLevel=${wh.jobLevel}`);
  });

  // 查询主账户
  const accounts = await prisma.laborAccount.findMany({
    where: { employeeId: employee.id, type: 'MAIN' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      code: true,
      status: true,
      effectiveDate: true,
      createdAt: true,
      hierarchyValues: true,
    },
  });

  console.log(`\n主账户数: ${accounts.length}\n`);
  accounts.forEach((acc) => {
    console.log(`  账户${acc.id}: ${acc.status}, 创建于${acc.createdAt.toISOString().substring(0, 19)}`);
  });

  console.log('\n=== 问题分析 ===\n');
  console.log('当前逻辑问题：');
  console.log('1. 只有1条任职记录，但有2个主账户（127和212）');
  console.log('2. 账户212是重新生成的，不应该创建新账户');
  console.log('3. 应该只更新账户127的hierarchyValues');

  console.log('\n正确逻辑应该是：');
  console.log('1. 新增WorkInfoHistory记录 → 创建新主账户');
  console.log('2. 更新WorkInfoHistory记录 → 更新对应主账户的hierarchyValues');
  console.log('3. 基本信息变更 → 更新当前主账户，不创建新账户');

  await prisma.$disconnect();
}

analyzeLogic()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
