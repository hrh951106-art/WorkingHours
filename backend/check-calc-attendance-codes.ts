import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 查询计算出勤代码配置 ===\n');

  const calcCodes = await prisma.calculationAttendanceCode.findMany({
    where: {
      status: 'ACTIVE'
    },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      calculateHours: true,
      priority: true,
      accountLevels: true,
      definitionAttendanceCode: true
    },
    orderBy: { priority: 'asc' }
  });

  console.log(`找到 ${calcCodes.length} 个激活的计算出勤代码:\n`);

  calcCodes.forEach(code => {
    console.log(`代码: ${code.code}`);
    console.log(`名称: ${code.name}`);
    console.log(`类型: ${code.type}`);
    console.log(`优先级: ${code.priority}`);
    console.log(`是否计算���时: ${code.calculateHours}`);
    console.log(`账户层级: ${code.accountLevels || 'N/A'}`);
    console.log(`分配范围: ${code.allocationScope || 'N/A'}`);
    console.log('---');
  });

  // 查询员工 Paul 的主账户信息
  console.log('\n=== 查询员工 Paul 的账户信息 ===\n');

  const employee = await prisma.employee.findUnique({
    where: { employeeNo: '202605002' },
    select: { id: true, employeeNo: true, name: true }
  });

  if (employee) {
    // 查询员工账户关联
    const employeeAccounts = await prisma.employeeLaborAccount.findMany({
      where: { employeeId: employee.id },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            path: true,
            level: true,
            hierarchyValues: true
          }
        }
      }
    });

    if (employeeAccounts.length > 0) {
      const mainAccount = employeeAccounts.find(ea => ea.account.level === 3)?.account;

      if (mainAccount) {
        console.log('主账户信息 (层级3):');
        console.log(`ID: ${mainAccount.id}`);
        console.log(`名称: ${mainAccount.name}`);
        console.log(`路径: ${mainAccount.path}`);
        console.log(`层级: ${mainAccount.level}`);
        console.log(`层级值: ${mainAccount.hierarchyValues}`);
      }

      console.log(`\n所有账户 (${employeeAccounts.length}个):\n`);

      employeeAccounts.forEach(ea => {
        const account = ea.account;
        console.log(`${account.name}`);
        console.log(`  层级: ${account.level}`);
        console.log(`  路径: ${account.path}`);
        console.log(`  层级值: ${account.hierarchyValues}`);
        console.log('');
      });
    } else {
      console.log('未找到账户');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
