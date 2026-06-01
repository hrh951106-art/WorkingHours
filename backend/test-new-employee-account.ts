import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 测试新员工入职账户生成 ==========\n');

  // 模拟创建新员工（实际应该通过API调用）
  // 这里我们直接检查最近创建的员工账户
  console.log('查找最近创建的员工...\n');

  const recentEmployees = await prisma.employee.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 最近24小时
      }
    },
    include: {
      org: true,
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5
  });

  if (recentEmployees.length === 0) {
    console.log('最近24小时没有新员工创建');
    return;
  }

  for (const emp of recentEmployees) {
    console.log(`\n=== 员工: ${emp.employeeNo} - ${emp.name} ===`);
    console.log(`入职时间: ${emp.createdAt}`);
    console.log(`组织: ${emp.org?.name}`);

    // 查询当前工作信息
    const workInfo = await prisma.workInfoHistory.findFirst({
      where: {
        employeeId: emp.id,
        isCurrent: true
      }
    });

    if (workInfo) {
      console.log('工作信息:');
      console.log(`  岗位: ${workInfo.position || '-'}`);
      console.log(`  职级: ${workInfo.jobLevel || '-'}`);
    }

    // 查询主劳动力账户
    const mainAccount = await prisma.laborAccount.findFirst({
      where: {
        employeeId: emp.id,
        type: 'MAIN'
      }
    });

    if (mainAccount) {
      console.log('\n主劳动力账户:');
      console.log(`  账户代码: ${mainAccount.code}`);
      console.log(`  创建时间: ${mainAccount.createdAt}`);
      console.log(`  路径: ${mainAccount.path}`);
      console.log(`  名称路径: ${mainAccount.namePath}`);

      // 检查是否包含代码（POST_或Level_）
      const hasCodeInPath = mainAccount.namePath.includes('POST_') || mainAccount.namePath.includes('Level_');

      if (hasCodeInPath) {
        console.log('  ⚠️  名称路径中包含代码而不是中文标签！');
      } else {
        console.log('  ✅ 名称路径显示正确（使用中文标签）');
      }
    }
  }

  console.log('\n========== 检查完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
