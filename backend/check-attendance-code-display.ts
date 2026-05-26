import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查出勤代码显示问题 ===\n');

  // 1. 检查 DefinitionAttendanceCode 表
  const ac001 = await prisma.definitionAttendanceCode.findUnique({
    where: { code: 'AC_001' },
  });

  console.log('1. DefinitionAttendanceCode.AC_001:');
  console.log('   ID:', ac001?.id);
  console.log('   Code:', ac001?.code);
  console.log('   Name:', ac001?.name);
  console.log('   showInAttendanceCard:', ac001?.showInAttendanceCard);

  // 2. 检查 WorkHourResult 表中的数据
  const workHours = await prisma.workHourResult.findMany({
    where: {
      definitionAttendanceCodeId: ac001?.id,
    },
    take: 5,
  });

  console.log('\n2. WorkHourResult 原始数据（前5条）:');
  workHours.forEach((wh, index) => {
    console.log(`   ${index + 1}. ID: ${wh.id}`);
    console.log(`      definitionAttendanceCodeId: ${wh.definitionAttendanceCodeId}`);
    console.log(`      definitionAttendanceCodeStr: "${wh.definitionAttendanceCodeStr}"`);
    console.log(`      accountName: "${wh.accountName}"`);
  });

  // 3. 测试带 include 的查询
  const results = await prisma.workHourResult.findMany({
    where: {
      definitionAttendanceCodeId: ac001?.id,
    },
    include: {
      definitionAttendanceCode: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
    take: 5,
  });

  console.log('\n3. 带 include 的查询结果:');
  results.forEach((wh, index) => {
    console.log(`   ${index + 1}. ID: ${wh.id}`);
    console.log(`      definitionAttendanceCodeId: ${wh.definitionAttendanceCodeId}`);
    console.log(`      definitionAttendanceCodeStr: "${wh.definitionAttendanceCodeStr}"`);
    console.log(`      definitionAttendanceCode 是否存在: ${!!wh.definitionAttendanceCode}`);
    if (wh.definitionAttendanceCode) {
      console.log(`      definitionAttendanceCode.code: "${wh.definitionAttendanceCode.code}"`);
      console.log(`      definitionAttendanceCode.name: "${wh.definitionAttendanceCode.name}"`);
    }
    console.log(`      accountName: "${wh.accountName}"`);
  });

  // 4. 测试汇总逻辑
  console.log('\n4. 测试汇总逻辑:');
  const summaryMap = new Map<string, any>();

  results.forEach((result) => {
    const accountName = result.accountName || '未分配';
    const attendanceCodeStr = result.definitionAttendanceCode?.name || result.definitionAttendanceCodeStr || '未分类';
    const key = `${accountName}|${attendanceCodeStr}`;

    console.log(`   处理记录: accountName="${accountName}", attendanceCodeStr="${attendanceCodeStr}"`);
    console.log(`   key="${key}"`);
    console.log(`   result.definitionAttendanceCode?.name="${result.definitionAttendanceCode?.name}"`);
    console.log(`   result.definitionAttendanceCodeStr="${result.definitionAttendanceCodeStr}"`);

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        accountName,
        attendanceCodeStr,
        totalHours: 0,
      });
    }

    const summary = summaryMap.get(key)!;
    summary.totalHours += result.workHours || 0;
  });

  console.log('\n5. 汇总结果:');
  Array.from(summaryMap.values()).forEach((item, index) => {
    console.log(`   ${index + 1}. 账户: ${item.accountName}`);
    console.log(`      出勤代码: ${item.attendanceCodeStr}`);
    console.log(`      总工时: ${item.totalHours} 小时`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
