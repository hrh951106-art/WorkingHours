import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 验证考勤卡工时统计逻辑 ===\n');

  // 1. 获取所有标记为"在考勤卡显示"的出勤代码
  const showInCardCodes = await prisma.definitionAttendanceCode.findMany({
    where: {
      showInAttendanceCard: true,
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  console.log('1. 标记为"在考勤卡显示"的出勤代码:');
  showInCardCodes.forEach(code => {
    console.log(`   - ${code.code} (${code.name})`);
  });

  // 2. 获取一个测试员工的所有工时数据
  const testEmployee = await prisma.workHourResult.findFirst({
    select: {
      employeeNo: true,
    },
  });

  if (!testEmployee) {
    console.log('\n错误: 数据库中没有工时数据');
    return;
  }

  console.log(`\n2. 测试员工: ${testEmployee.employeeNo}`);

  // 3. 查询所有工时数据（不过滤）
  const allWorkHours = await prisma.workHourResult.findMany({
    where: {
      employeeNo: testEmployee.employeeNo,
    },
    include: {
      definitionAttendanceCode: {
        select: {
          id: true,
          code: true,
          name: true,
          showInAttendanceCard: true,
        },
      },
    },
    orderBy: { calcDate: 'desc' },
  });

  console.log(`\n3. 所有工时数据（共 ${allWorkHours.length} 条）:`);
  allWorkHours.forEach((wh, index) => {
    const codeName = wh.definitionAttendanceCode?.name || wh.definitionAttendanceCodeStr;
    const showInCard = wh.definitionAttendanceCode?.showInAttendanceCard ?? false;
    const mark = showInCard ? '✓' : '✗';
    console.log(`   ${index + 1}. ${wh.calcDate.toISOString().split('T')[0]} | ${codeName} | ${wh.workHours}小时 | ${wh.accountName} | 显示:${mark}`);
  });

  // 4. 查询符合条件的工时数据（只包含 showInAttendanceCard = true）
  const filteredWorkHours = await prisma.workHourResult.findMany({
    where: {
      employeeNo: testEmployee.employeeNo,
      definitionAttendanceCode: {
        showInAttendanceCard: true,
      },
    },
    include: {
      definitionAttendanceCode: {
        select: {
          id: true,
          code: true,
          name: true,
          showInAttendanceCard: true,
        },
      },
    },
    orderBy: { calcDate: 'desc' },
  });

  console.log(`\n4. 过滤后的工时数据（只包含"在考勤卡显示" = true，共 ${filteredWorkHours.length} 条）:`);
  filteredWorkHours.forEach((wh, index) => {
    const codeName = wh.definitionAttendanceCode?.name || wh.definitionAttendanceCodeStr;
    console.log(`   ${index + 1}. ${wh.calcDate.toISOString().split('T')[0]} | ${codeName} | ${wh.workHours}小时 | ${wh.accountName}`);
  });

  // 5. 按照出勤代码和劳动力账户分组汇总
  const summaryMap = new Map<string, {
    accountName: string;
    attendanceCodeName: string;
    totalHours: number;
    count: number;
  }>();

  filteredWorkHours.forEach((result) => {
    const accountName = result.accountName || '未分配';
    const attendanceCodeName = result.definitionAttendanceCode?.name || result.definitionAttendanceCodeStr || '未分类';
    const key = `${accountName}|${attendanceCodeName}`;

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        accountName,
        attendanceCodeName,
        totalHours: 0,
        count: 0,
      });
    }

    const summary = summaryMap.get(key)!;
    summary.totalHours += result.workHours || 0;
    summary.count += 1;
  });

  // 转换为数组并排序
  const results = Array.from(summaryMap.values()).sort((a, b) => {
    if (a.accountName !== b.accountName) {
      return a.accountName.localeCompare(b.accountName, 'zh-CN');
    }
    return a.attendanceCodeName.localeCompare(b.attendanceCodeName, 'zh-CN');
  });

  console.log('\n5. 按出勤代码和劳动力账户分组汇总结果:');
  console.log('   ' + '='.repeat(80));
  results.forEach((item, index) => {
    console.log(`   ${index + 1}. 账户: ${item.accountName}`);
    console.log(`      出勤代码: ${item.attendanceCodeName}`);
    console.log(`      工时合计: ${item.totalHours.toFixed(2)} 小时`);
    console.log(`      记录数: ${item.count} 条`);
    console.log();
  });

  // 6. 汇总统计
  const totalHours = results.reduce((sum, item) => sum + item.totalHours, 0);
  console.log('   ' + '='.repeat(80));
  console.log(`   总计: ${results.length} 个分组，总工时 ${totalHours.toFixed(2)} 小时`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
