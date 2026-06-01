import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 检查员工筛选逻辑 ==========\n');

  // 1. 获取5月19日的工时结果
  console.log('【1. 5月19日工时结果】\n');
  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      calcDate: new Date('2026-05-19'),
      attendanceCode: 'A06'
    }
  });

  console.log(`工时结果数量: ${workHourResults.length}\n`);

  // 2. 检查A01配置的员工筛选条件
  console.log('【2. A01员工筛选条件】\n');
  const a01Config = await prisma.earnedHoursAllocationConfig.findFirst({
    where: { code: 'A01' }
  });

  if (a01Config) {
    const sourceConfig = JSON.parse(a01Config.sourceConfig || '{}');
    console.log('员工筛选配置:', JSON.stringify(sourceConfig.employeeFilter, null, 2));

    // 3. 检查每个员工是否满足筛选条件
    console.log('\n【3. 员工筛选检查】\n');

    for (const whr of workHourResults) {
      // 获取员工信息
      const employee = await prisma.employee.findUnique({
        where: { employeeNo: whr.employeeNo }
      });
      console.log(`员工: ${whr.employeeNo} - ${employee?.name || '(未知)'}`);
      console.log(`  账户: ${whr.accountName}`);
      console.log(`  账户路径: ${whr.accountPath}`);
      console.log(`  工时: ${whr.workHours}`);

      if (employee) {
        console.log(`  员工ID: ${employee.id}`);
        console.log(`  状态: ${employee.status}`);

        // 检查员工是否有主账户
        const mainAccount = await prisma.laborAccount.findFirst({
          where: {
            employeeId: employee.id,
            type: 'MAIN',
            status: 'ACTIVE'
          }
        });

        if (mainAccount) {
          console.log(`  主账户: ${mainAccount.code}`);
          console.log(`  主账户路径: ${mainAccount.namePath || mainAccount.path}`);
        } else {
          console.log(`  ❌ 没有活跃的主账户`);
        }
      }

      console.log('');
    }

    // 4. 模拟员工筛选逻辑
    console.log('【4. 模拟员工筛选】\n');

    if (sourceConfig.employeeFilter?.fieldGroups && sourceConfig.employeeFilter.fieldGroups.length > 0) {
      console.log('有员工筛选条件，需要检查...');

      for (const whr of workHourResults) {
        const employee = await prisma.employee.findUnique({
          where: { employeeNo: whr.employeeNo }
        });

        if (employee) {
          // 这里需要模拟filterEmployees的逻辑
          // 由于没有看到具体的实现，我们先检查员工状态
          const isMatch = employee.status === 'ACTIVE';
          console.log(`${whr.employeeNo}: ${isMatch ? '✅ 通过筛选' : '❌ 未通过筛选'} (状态: ${employee.status})`);
        }
      }
    } else {
      console.log('❌ 没有员工筛选条件，所有员工都应该通过');
    }
  }

  console.log('\n========== 分析完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
