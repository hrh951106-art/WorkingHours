/**
 * 修复员工工作信息历史记录
 * 为缺少当前工作信息的员工创建默认的工作信息历史记录
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixEmployeeWorkInfo() {
  console.log('=== 开始修复员工工作信息历史记录 ===\n');

  // 1. 获取所有员工
  const employees = await prisma.employee.findMany({
    include: {
      org: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log(`共找到 ${employees.length} 个员工\n`);

  let fixedCount = 0;
  let skippedCount = 0;

  for (const employee of employees) {
    console.log(`处理员工: ${employee.name} (${employee.employeeNo})`);

    // 检查是否已有当前工作信息
    const existingCurrentWorkInfo = await prisma.workInfoHistory.findFirst({
      where: {
        employeeId: employee.id,
        isCurrent: true,
      },
    });

    if (existingCurrentWorkInfo) {
      console.log(`  ✅ 已有当前工作信息，跳过`);
      skippedCount++;
      continue;
    }

    // 检查是否有历史工作信息
    const allWorkInfoHistories = await prisma.workInfoHistory.findMany({
      where: { employeeId: employee.id },
      orderBy: { effectiveDate: 'desc' },
    });

    if (allWorkInfoHistories.length > 0) {
      // 如果有历史记录，将最新的设置为当前
      const latestWorkInfo = allWorkInfoHistories[0];
      console.log(`  📝 找到 ${allWorkInfoHistories.length} 条历史记录，将最新记录设置为当前`);

      await prisma.workInfoHistory.update({
        where: { id: latestWorkInfo.id },
        data: { isCurrent: true },
      });

      fixedCount++;
    } else {
      // 如果没有任何历史记录，创建一个默认的当前工作信息
      console.log(`  ➕ 创建默认工作信息历史`);

      await prisma.workInfoHistory.create({
        data: {
          employeeId: employee.id,
          effectiveDate: employee.entryDate || new Date(),
          changeType: 'ENTRY', // 默认为入职
          orgId: employee.orgId,
          customFields: '{}',
          isCurrent: true,
        },
      });

      fixedCount++;
    }

    console.log(`  ✅ 修复完成\n`);
  }

  console.log('=== 修复完成 ===');
  console.log(`修复员工数: ${fixedCount}`);
  console.log(`跳过员工数: ${skippedCount}`);

  // 验证修复结果
  console.log('\n=== 验证修复结果 ===');

  const employeesWithCurrentWorkInfo = await prisma.workInfoHistory.groupBy({
    by: ['employeeId'],
    where: { isCurrent: true },
  });

  console.log(`总员工数: ${employees.length}`);
  console.log(`有当前工作信息的员工数: ${employeesWithCurrentWorkInfo.length}`);

  if (employeesWithCurrentWorkInfo.length === employees.length) {
    console.log('\n✅ 所有员工都已有当前工作信息！');
  } else {
    console.log(`\n⚠️  还有 ${employees.length - employeesWithCurrentWorkInfo.length} 个员工缺少当前工作信息`);
  }

  await prisma.$disconnect();
}

fixEmployeeWorkInfo()
  .then(() => {
    console.log('\n脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('执行失败:', error);
    process.exit(1);
  });
