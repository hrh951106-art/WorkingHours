import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEmployeeLineRelation() {
  console.log('========================================');
  console.log('检查员工与产线的关系');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');

  // 1. 获取员工信息
  const employees = await prisma.employee.findMany({
    where: {
      employeeNo: { in: ['A01', 'A02'] },
    },
    include: {
      org: true,
    },
  });

  console.log(`员工信息:\n`);
  employees.forEach(emp => {
    console.log(`员工: ${emp.employeeNo} ${emp.name}`);
    console.log(`  组织ID: ${emp.orgId}`);
    console.log(`  组织名称: ${emp.org?.name || 'N/A'}`);
    console.log(`  组织类型: ${emp.org?.type || 'N/A'}`);
    console.log();
  });

  // 2. 获取产线信息
  const lines = await prisma.productionLine.findMany({
    where: {
      deletedAt: null,
    },
  });

  console.log('========================================');
  console.log('产线信息');
  console.log('========================================\n');

  lines.forEach(line => {
    console.log(`产线: ${line.name} (ID: ${line.id})`);
    console.log(`  编码: ${line.code}`);
    console.log(`  组织ID: ${line.orgId}`);
    console.log(`  组织名称: ${line.orgName}`);
    console.log();
  });

  // 3. 检查组织架构树
  console.log('========================================');
  console.log('组织架构关系');
  console.log('========================================\n');

  // 获取相关组织
  const orgs = await prisma.organization.findMany({
    where: {
      id: { in: [6, 7, 8] },
    },
  });

  for (const org of orgs) {
    console.log(`组织: ${org.name} (ID: ${org.id})`);
    console.log(`  类型: ${org.type}`);
    console.log(`  父级ID: ${org.parentId || 'NULL'}`);

    // 查找该组织的员工
    const empCount = await prisma.employee.count({
      where: { orgId: org.id },
    });
    console.log(`  员工数: ${empCount}`);

    // 查找该组织的产线
    const lineCount = await prisma.productionLine.count({
      where: { orgId: org.id },
    });
    console.log(`  产线数: ${lineCount}`);
    console.log();
  }

  // 4. 分析直接工时应该如何分配
  console.log('========================================');
  console.log('直接工时分配逻辑分析');
  console.log('========================================\n');

  const generalConfig = await prisma.allocationGeneralConfig.findFirst();
  const actualHoursCode = await prisma.attendanceCode.findUnique({
    where: { code: generalConfig?.actualHoursAllocationCode || 'I03' },
  });

  if (actualHoursCode) {
    const directResults = await prisma.calcResult.findMany({
      where: {
        calcDate,
        attendanceCodeId: actualHoursCode.id,
      },
      include: {
        employee: {
          include: {
            org: true,
          },
        },
      },
    });

    console.log('直接工时记录:\n');

    const byOrg: Record<number, { hours: number; employees: string[] }> = {};

    directResults.forEach(r => {
      const orgId = r.employee.orgId;
      if (!byOrg[orgId]) {
        byOrg[orgId] = { hours: 0, employees: [] };
      }
      byOrg[orgId].hours += r.actualHours;
      if (!byOrg[orgId].employees.includes(r.employeeNo)) {
        byOrg[orgId].employees.push(r.employeeNo);
      }

      console.log(`${r.employeeNo} ${r.employee.name || ''}: ${r.actualHours}h`);
      console.log(`  → 组织: ${r.employee.org?.name || 'N/A'} (ID: ${orgId})`);
    });

    console.log('\n按组织汇总:');
    Object.entries(byOrg).forEach(([orgId, data]) => {
      console.log(`  组织ID ${orgId}: ${data.hours}h, 员工: ${data.employees.join(', ')}`);

      // 查找该组织对应的产线
      const orgLines = lines.filter(l => l.orgId === +orgId);
      if (orgLines.length > 0) {
        console.log(`    → 对应产线: ${orgLines.map(l => l.name).join(', ')}`);
      } else {
        console.log(`    → 无对应产线`);
      }
    });
  }

  console.log('\n========================================');
  console.log('问题分析');
  console.log('========================================\n');

  // 分析：A01张三在组织7，应该对应L1产线（orgId=7）
  // A02李四在组织8，应该对应L2产线（orgId=8）
  console.log('预期逻辑:');
  console.log('  - A01张三（组织7）→ L1产线（orgId=7）→ 9小时直接工时');
  console.log('  - A02李四（组织8）→ L2产线（orgId=8）→ 7小时直接工时');
  console.log('\n当前代码问题:');
  console.log('  - 代码通过班次ID映射到产线，但两个产线使用同一班次');
  console.log('  - 应该通过员工的组织ID来映射到对应产线');
}

checkEmployeeLineRelation()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
