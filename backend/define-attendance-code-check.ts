import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAttendanceCodeIds() {
  console.log('=== 检查出勤代码ID配置 ===\n');

  try {
    const workDate = new Date('2026-05-20T00:00:00.000Z');

    // 1. 查询DefinitionAttendanceCode表，找到A04的ID
    const attendanceCodes = await prisma.definitionAttendanceCode.findMany({
      where: {
        code: { in: ['A04', 'A01', 'A02', 'A03'] },
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    console.log('出勤代码定义:');
    attendanceCodes.forEach((ac) => {
      console.log(`  ID: ${ac.id}, 代码: ${ac.code}, 名称: ${ac.name}`);
    });
    console.log('');

    // 2. 查询5月20日的工时记录，包括definitionAttendanceCodeId
    const workHours = await prisma.workHourResult.findMany({
      where: { workDate: workDate },
      select: {
        id: true,
        employeeNo: true,
        workDate: true,
        workHours: true,
        attendanceCode: true,
        attendanceCodeName: true,
        definitionAttendanceCodeId: true,
        definitionAttendanceCodeStr: true,
      },
      orderBy: { employeeNo: 'asc' },
    });

    console.log('5月20日工时记录（含出勤代码ID）:');
    workHours.forEach((wh) => {
      const hasId = wh.definitionAttendanceCodeId !== null && wh.definitionAttendanceCodeId !== undefined;
      const marker = hasId ? '✅' : '❌';
      console.log(`${marker} 员工: ${wh.employeeNo}`);
      console.log(`   workDate: ${wh.workDate?.toISOString().substring(0, 10)}`);
      console.log(`   attendanceCode: ${wh.attendanceCode || 'NULL'}`);
      console.log(`   attendanceCodeName: ${wh.attendanceCodeName || 'NULL'}`);
      console.log(`   definitionAttendanceCodeId: ${wh.definitionAttendanceCodeId || 'NULL'}`);
      console.log(`   definitionAttendanceCodeStr: ${wh.definitionAttendanceCodeStr || 'NULL'}`);
      console.log('');
    });

    // 3. 检查A04的ID
    const a04Code = attendanceCodes.find(ac => ac.code === 'A04');
    console.log('=== 分析 ===\n');
    if (a04Code) {
      console.log(`A04的ID是: ${a04Code.id}`);
      console.log('');

      // 检查工时记录是否有这个ID
      const hasA04Id = workHours.some(wh => wh.definitionAttendanceCodeId === a04Code.id);
      console.log(`工时记录中是否有A04的ID: ${hasA04Id ? '是 ✅' : '否 ❌'}`);

      if (!hasA04Id) {
        console.log('');
        console.log('🔍 **根本原因: 工时记录的definitionAttendanceCodeId不是A04的ID！**');
        console.log('');
        console.log('A02规则配置了 attendanceCodes: ["A04"]');
        console.log('系统会将"A04"代码转换为对应的definitionAttendanceCodeId进行筛选。');
        console.log('如果工时记录的definitionAttendanceCodeId字段为空或不匹配，则无法通过筛选。');
      }
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
    throw error;
  }

  await prisma.$disconnect();
}

checkAttendanceCodeIds()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
