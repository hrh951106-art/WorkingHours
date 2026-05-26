import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查询所有劳动力账户，按级别分组
  const allAccounts = await prisma.laborAccount.findMany({
    where: {
      status: 'ACTIVE'
    },
    orderBy: [
      { level: 'asc' },
      { code: 'asc' }
    ]
  });

  console.log('所有劳动力账户（按级别排序）：');
  console.log('==========================================');

  // 按级别分组
  const accountsByLevel: Record<number, any[]> = {};
  allAccounts.forEach(account => {
    if (!accountsByLevel[account.level]) {
      accountsByLevel[account.level] = [];
    }
    accountsByLevel[account.level].push(account);
  });

  for (const level in accountsByLevel) {
    console.log(`\n级别 ${level} 的账户（共 ${accountsByLevel[level].length} 个）：`);
    console.log('------------------------------------------');
    accountsByLevel[level].forEach(account => {
      console.log(`账户编码: ${account.code}`);
      console.log(`账户名称: ${account.name}`);
      console.log(`账户类型: ${account.type}`);
      console.log(`账户路径: ${account.path}`);
      console.log(`员工ID: ${account.employeeId || '未关联员工'}`);
      console.log(`父账户ID: ${account.parentId || '无（根账户）'}`);
      console.log(`用途类型: ${account.usageType || 'SHIFT'}`);
      console.log('---');
    });
  }

  // 查询已关联员工的账户
  const accountsWithEmployees = await prisma.laborAccount.findMany({
    where: {
      status: 'ACTIVE',
      employeeId: {
        not: null
      }
    },
    include: {
      employee: {
        select: {
          employeeNo: true,
          name: true
        }
      }
    }
  });

  console.log('\n已关联员工的账户：');
  console.log('==========================================');
  accountsWithEmployees.forEach(account => {
    console.log(`账户编码: ${account.code}`);
    console.log(`账户名称: ${account.name}`);
    console.log(`关联员工: ${account.employee?.employeeNo} - ${account.employee?.name || '未设置'}`);
    console.log(`账户类型: ${account.type}`);
    console.log(`账户级别: ${account.level}`);
    console.log('---');
  });

  // 查询根账户（没有父账户的账户）
  const rootAccounts = await prisma.laborAccount.findMany({
    where: {
      status: 'ACTIVE',
      parentId: null
    },
    orderBy: {
      code: 'asc'
    }
  });

  console.log('\n根账户（顶级账户）：');
  console.log('==========================================');
  rootAccounts.forEach(account => {
    console.log(`账户编码: ${account.code}`);
    console.log(`账户名称: ${account.name}`);
    console.log(`账户类型: ${account.type}`);
    console.log('---');
  });

  await prisma.$disconnect();
}

main().catch(console.error);
