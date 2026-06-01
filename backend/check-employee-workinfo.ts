import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEmployeeWorkInfo() {
  console.log('=== 检查员工任职历史和岗位信息 ===\n');

  try {
    const employeeNos = ['202605012', '202605013', '202605014', '202605015'];

    for (const empNo of employeeNos) {
      console.log(`员工: ${empNo}`);
      console.log('');

      // 1. 获取员工ID
      const employee = await prisma.employee.findFirst({
        where: { employeeNo: empNo },
        select: { id: true, name: true },
      });

      if (!employee) {
        console.log('  ❌ 未找到员工记录\n');
        continue;
      }

      console.log(`  姓名: ${employee.name}`);
      console.log(`  ID: ${employee.id}`);
      console.log('');

      // 2. 查询WorkInfoHistory
      const workInfoHistory = await prisma.workInfoHistory.findMany({
        where: { employeeId: employee.id },
        orderBy: { effectiveDate: 'desc' },
        take: 3,
      });

      console.log(`  任职历史记录数: ${workInfoHistory.length}`);
      workInfoHistory.forEach((wih, idx) => {
        console.log(`  记录 ${idx + 1}:`);
        console.log(`    effectiveDate: ${wih.effectiveDate.toISOString().substring(0, 10)}`);
        console.log(`    isCurrent: ${wih.isCurrent}`);
        console.log(`    position: ${wih.position || 'NULL'}`);
        console.log(`    jobLevel: ${wih.jobLevel || 'NULL'}`);
        console.log(`    employeeType: ${wih.employeeType || 'NULL'}`);
        console.log(`    workLocation: ${wih.workLocation || 'NULL'}`);
        console.log('');
      });

      // 3. 查询主劳动力账户
      const mainAccounts = await prisma.laborAccount.findMany({
        where: {
          employeeId: employee.id,
          type: 'MAIN',
        },
        orderBy: { effectiveDate: 'desc' },
        take: 2,
      });

      console.log(`  主劳动力账户数: ${mainAccounts.length}`);
      mainAccounts.forEach((acc) => {
        console.log(`  账户 ID: ${acc.id}, 状态: ${acc.status}`);
        console.log(`    effectiveDate: ${acc.effectiveDate.toISOString().substring(0, 10)}`);
        console.log(`    path: ${acc.path}`);
        console.log(`    namePath: ${acc.namePath}`);

        if (acc.hierarchyValues) {
          try {
            const hierarchy = JSON.parse(acc.hierarchyValues);
            console.log(`    层级值:`);
            Object.entries(hierarchy).forEach(([key, value]) => {
              console.log(`      ${key}: ${value}`);
            });
          } catch (e) {
            console.log('    解析hierarchyValues失败');
          }
        }
        console.log('');
      });

      console.log('---\n');
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
    throw error;
  }

  await prisma.$disconnect();
}

checkEmployeeWorkInfo()
  .then(() => {
    console.log('检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
