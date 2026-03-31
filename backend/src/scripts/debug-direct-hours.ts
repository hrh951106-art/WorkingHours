import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugDirectHours() {
  console.log('========================================');
  console.log('详细检查直接工时数据分布');
  console.log('========================================\n');

  const calcDate = new Date('2026-03-11');

  // 1. 获取直接工时代码
  const generalConfig = await prisma.allocationGeneralConfig.findFirst();
  const actualHoursCode = await prisma.attendanceCode.findUnique({
    where: { code: generalConfig?.actualHoursAllocationCode || 'I03' },
  });

  if (!actualHoursCode) {
    console.log('❌ 未找到直接工时代码');
    return;
  }

  console.log(`直接工时代码: ${actualHoursCode.code} (ID: ${actualHoursCode.id})\n`);

  // 2. 获取所有直接工时记录
  const directResults = await prisma.calcResult.findMany({
    where: {
      calcDate,
      attendanceCodeId: actualHoursCode.id,
    },
    include: {
      employee: true,
    },
  });

  console.log(`直接工时记录总数: ${directResults.length}\n`);

  // 3. 按员工分组
  const byEmployee: Record<string, any[]> = {};
  directResults.forEach(r => {
    if (!byEmployee[r.employeeNo]) {
      byEmployee[r.employeeNo] = [];
    }
    byEmployee[r.employeeNo].push(r);
  });

  console.log('========================================');
  console.log('按员工统计直接工时');
  console.log('========================================\n');

  Object.entries(byEmployee).forEach(([empNo, records]) => {
    const empName = records[0].employee?.name || '';
    const totalHours = records.reduce((sum, r) => sum + r.actualHours, 0);
    const shifts = [...new Set(records.map(r => r.shiftId))];

    console.log(`员工: ${empNo} ${empName}`);
    console.log(`  总工时: ${totalHours}h`);
    console.log(`  记录数: ${records.length}`);
    console.log(`  涉及班次ID: ${shifts.join(', ')}`);

    records.forEach(r => {
      console.log(`    - ${r.actualHours}h (班次ID: ${r.shiftId}, 班次名: ${r.shiftName})`);
    });
    console.log();
  });

  // 4. 检查所有班次
  console.log('========================================');
  console.log('所有班次信息');
  console.log('========================================\n');

  const shifts = await prisma.shift.findMany();
  shifts.forEach(s => {
    const hoursInShift = directResults
      .filter(r => r.shiftId === s.id)
      .reduce((sum, r) => sum + r.actualHours, 0);
    console.log(`班次ID ${s.id}: ${s.name} (${s.code || 'N/A'})`);
    console.log(`  直接工时: ${hoursInShift}h`);
    console.log(`  员工数: ${[...new Set(directResults.filter(r => r.shiftId === s.id).map(r => r.employeeNo))].length}`);
  });
  console.log();

  // 5. 获取开线计划
  console.log('========================================');
  console.log('开线计划与班次映射');
  console.log('========================================\n');

  const lineShifts = await prisma.lineShift.findMany({
    where: {
      scheduleDate: calcDate,
      status: 'ACTIVE',
      deletedAt: null,
    },
  });

  console.log(`开线记录数: ${lineShifts.length}\n`);

  lineShifts.forEach(ls => {
    // 统计该班次的直接工时
    const shiftHours = directResults
      .filter(r => r.shiftId === ls.shiftId)
      .reduce((sum, r) => sum + r.actualHours, 0);

    console.log(`开线记录ID: ${ls.id}`);
    console.log(`  组织: ${ls.orgName || 'N/A'} (ID: ${ls.orgId})`);
    console.log(`  班次: ${ls.shiftName} (ID: ${ls.shiftId})`);
    console.log(`  该班次直接工时: ${shiftHours}h`);
    console.log(`  参与分摊: ${ls.participateInAllocation ? '是' : '否'}`);
  });
  console.log();

  // 6. 问题分析
  console.log('========================================');
  console.log('问题分析');
  console.log('========================================\n');

  // 建立班次到组织的映射
  const shiftToOrg: Record<number, any> = {};
  lineShifts.forEach(ls => {
    if (ls.orgId) {
      shiftToOrg[ls.shiftId] = { id: ls.orgId, name: ls.orgName };
    }
  });

  console.log('班次到组织的映射:');
  Object.entries(shiftToOrg).forEach(([shiftId, org]) => {
    const shiftHours = directResults
      .filter(r => r.shiftId === +shiftId)
      .reduce((sum, r) => sum + r.actualHours, 0);
    console.log(`  班次 ${shiftId} → ${org.name} (${org.id}): ${shiftHours}h`);
  });
  console.log();

  // 按组织汇总
  const directHoursByOrg: Record<number, number> = {};
  directResults.forEach(r => {
    const org = shiftToOrg[r.shiftId];
    if (org) {
      directHoursByOrg[org.id] = (directHoursByOrg[org.id] || 0) + r.actualHours;
    }
  });

  console.log('按组织汇总直接工时:');
  Object.entries(directHoursByOrg).forEach(([orgId, hours]) => {
    const org = Object.values(shiftToOrg).find((o: any) => o.id === +orgId) as any;
    console.log(`  ${org?.name || `组织${orgId}`}: ${hours}h`);
  });

  const missingShift = directResults.filter(r => !shiftToOrg[r.shiftId]);
  if (missingShift.length > 0) {
    const missingHours = missingShift.reduce((sum, r) => sum + r.actualHours, 0);
    console.log(`\n⚠️  警告: ${missingShift.length} 条记录（${missingHours}h）的班次没有对应的开线记录`);
    console.log('   这些工时无法分摊到组织！');
  }

  console.log('\n========================================');
}

debugDirectHours()
  .catch((e) => {
    console.error('检查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
