import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 检查5月20日工时数据的出勤代码，验证是否匹配A02规则的条件
 */
async function checkAttendanceCodes() {
  console.log('=== 检查A02规则出勤代码匹配情况 ===\n');

  try {
    const workDate = new Date('2026-05-20T00:00:00.000Z');

    // 1. 查询5月20日所有工时数据，重点关注出勤代码
    const workHours = await prisma.workHourResult.findMany({
      where: { workDate: workDate },
      select: {
        id: true,
        employeeNo: true,
        workHours: true,
        attendanceCode: true,
        attendanceCodeId: true,
        attendanceCodeName: true,
        calcAttendanceCode: true,
        accountPath: true,
        accountId: true,
      },
      orderBy: { employeeNo: 'asc' },
    });

    console.log('5月20日工时数据（含出勤代码）:');
    console.log(`总共: ${workHours.length} 条记录\n`);

    workHours.forEach((wh) => {
      const attendanceCode = wh.attendanceCode || wh.calcAttendanceCode || 'NULL';
      const isA04 = attendanceCode === 'A04';
      const marker = isA04 ? '✅' : '❌';

      console.log(`${marker} 员工: ${wh.employeeNo}`);
      console.log(`   出勤代码: ${attendanceCode}`);
      console.log(`   出勤代码ID: ${wh.attendanceCodeId || 'NULL'}`);
      console.log(`   出勤代码名称: ${wh.attendanceCodeName || 'NULL'}`);
      console.log(`   工时: ${wh.workHours}小时`);
      console.log(`   账户路径: ${wh.accountPath}`);
      console.log('');
    });

    // 2. 统计
    const a04Records = workHours.filter(wh =>
      (wh.attendanceCode === 'A04') || (wh.calcAttendanceCode === 'A04')
    );

    console.log('=== 统计分析 ===\n');
    console.log(`总记录数: ${workHours.length}`);
    console.log(`出勤代码为A04的记录数: ${a04Records.length}`);
    console.log(`非A04记录数: ${workHours.length - a04Records.length}`);
    console.log('');

    // 3. 检查员工账户的岗位信息
    console.log('=== 检查员工岗位信息 ===\n');

    const employeeAccounts = await prisma.laborAccount.findMany({
      where: {
        employeeNo: { in: workHours.map(wh => wh.employeeNo) },
        type: 'MAIN',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        employeeNo: true,
        path: true,
        namePath: true,
        hierarchyValues: true,
        status: true,
      },
    });

    console.log(`找到 ${employeeAccounts.length} 个活跃的主劳动力账户\n`);

    employeeAccounts.forEach((acc) => {
      console.log(`员工: ${acc.employeeNo}`);
      console.log(`  账户ID: ${acc.id}`);
      console.log(`  路径: ${acc.path}`);
      console.log(`  名称路径: ${acc.namePath}`);

      if (acc.hierarchyValues) {
        try {
          const hierarchy = JSON.parse(acc.hierarchyValues);
          console.log(`  层级值:`);
          Object.entries(hierarchy).forEach(([key, value]) => {
            console.log(`    ${key}: ${value}`);
          });

          // 检查岗位
          const position = hierarchy['position'] || hierarchy['FIELD_position'];
          if (position) {
            const isNotPOST001 = position !== 'POST_001';
            const marker = isNotPOST001 ? '✅' : '❌';
            console.log(`    岗位 ${position} != POST_001: ${marker} ${isNotPOST001 ? '满足' : '不满足'}`);
          }
        } catch (e) {
          console.log('  解析hierarchyValues失败');
        }
      }
      console.log('');
    });

    // 4. 最终结论
    console.log('=== A02规则条件匹配分析 ===\n');

    console.log('A02规则要求:');
    console.log('  1. 出勤代码 = "A04"');
    console.log('  2. 岗位 != "POST_001"');
    console.log('  3. 工厂 = "SZ"');
    console.log('');

    const hasA04 = a04Records.length > 0;
    console.log('实际数据匹配情况:');
    console.log(`  1. 出勤代码匹配: ${hasA04 ? '✅ 有' + a04Records.length + '条记录' : '❌ 没有A04记录'}`);
    console.log(`  2. 工厂匹配: 需要检查账户路径（都是SZ开头）`);
    console.log(`  3. 岗位匹配: 需要检查具体岗位值`);
    console.log('');

    if (!hasA04) {
      console.log('🔍 **根本原因: 5月20日的工时数据出勤代码不是A04**');
      console.log('');
      console.log('A02规则配置了 attendanceCodes: ["A04"]，表示只处理出勤代码为A04的工时记录。');
      console.log('但5月20日的所有工时记录的出勤代码都不是A04，因此A02规则没有数据可处理，不会生成分摊结果。');
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
    throw error;
  }

  await prisma.$disconnect();
}

checkAttendanceCodes()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
