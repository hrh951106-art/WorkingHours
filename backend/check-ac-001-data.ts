import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查 AC_001 配置 ===');

  // 1. 检查 DefinitionAttendanceCode 表中 AC_001 的配置
  const defCode = await prisma.definitionAttendanceCode.findUnique({
    where: { code: 'AC_001' },
  });

  console.log('\n1. DefinitionAttendanceCode.AC_001:');
  console.log('   ID:', defCode?.id);
  console.log('   Code:', defCode?.code);
  console.log('   Name:', defCode?.name);
  console.log('   showInAttendanceCard:', defCode?.showInAttendanceCard);
  console.log('   Status:', defCode?.status);

  if (!defCode) {
    console.log('\n错误: AC_001 在 DefinitionAttendanceCode 表中不存在！');
    return;
  }

  // 2. 检查 WorkHourResult 表中关联了 AC_001 ID 的记录
  const workHours = await prisma.workHourResult.findMany({
    where: {
      definitionAttendanceCodeId: defCode.id,
    },
    take: 5,
    orderBy: { calcDate: 'desc' },
  });

  console.log('\n2. WorkHourResult 通过 definitionAttendanceCodeId 关联的记录数:', workHours.length);
  if (workHours.length > 0) {
    console.log('   前5条记录:');
    workHours.forEach((wh) => {
      console.log(`   - ID: ${wh.id}, EmployeeNo: ${wh.employeeNo}, CalcDate: ${wh.calcDate.toISOString().split('T')[0]}, workHours: ${wh.workHours}`);
    });
  }

  // 3. 检查是否有使用 definitionAttendanceCodeStr 的记录
  const workHoursByStr = await prisma.workHourResult.findMany({
    where: {
      definitionAttendanceCodeStr: {
        contains: 'AC_001',
      },
    },
    take: 5,
  });

  console.log('\n3. WorkHourResult 通过 definitionAttendanceCodeStr 包含 AC_001 的记录数:', workHoursByStr.length);
  if (workHoursByStr.length > 0) {
    console.log('   前5条记录:');
    workHoursByStr.forEach((wh) => {
      console.log(`   - ID: ${wh.id}, EmployeeNo: ${wh.employeeNo}, CalcDate: ${wh.calcDate.toISOString().split('T')[0]}, definitionAttendanceCodeStr: ${wh.definitionAttendanceCodeStr}, definitionAttendanceCodeId: ${wh.definitionAttendanceCodeId}`);
    });
  }

  // 4. 检查所有 WorkHourResult 记录的关联情况
  const totalCount = await prisma.workHourResult.count();
  const withIdCount = await prisma.workHourResult.count({
    where: { definitionAttendanceCodeId: { not: null } }
  });

  console.log('\n4. WorkHourResult 总体关联情况:');
  console.log(`   - 总记录数: ${totalCount}`);
  console.log(`   - 有 definitionAttendanceCodeId 的记录数: ${withIdCount}`);
  console.log(`   - 无 definitionAttendanceCodeId 的记录数: ${totalCount - withIdCount}`);

  // 5. 测试查询 - 模拟考勤卡的查询逻辑
  console.log('\n5. 测试考勤卡查询逻辑（包含关联）:');

  if (workHours.length > 0) {
    const testEmployeeNo = workHours[0].employeeNo;

    const results = await prisma.workHourResult.findMany({
      where: {
        employeeNo: testEmployeeNo,
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
      take: 5,
    });

    console.log(`   员工 ${testEmployeeNo} 的查询结果数:`, results.length);
    results.forEach((r) => {
      console.log(`   - Code: ${r.definitionAttendanceCode?.code}, Name: ${r.definitionAttendanceCode?.name}, ShowInCard: ${r.definitionAttendanceCode?.showInAttendanceCard}`);
    });

    // 6. 对比：不过滤 showInAttendanceCard 的查询
    const resultsWithoutFilter = await prisma.workHourResult.findMany({
      where: {
        employeeNo: testEmployeeNo,
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
      take: 5,
    });

    console.log(`\n6. 员工 ${testEmployeeNo} 不过滤的查询结果数:`, resultsWithoutFilter.length);
    resultsWithoutFilter.forEach((r) => {
      const hasRelation = !!r.definitionAttendanceCode;
      console.log(`   - Code: ${r.definitionAttendanceCode?.code || 'N/A'}, Name: ${r.definitionAttendanceCode?.name || r.definitionAttendanceCodeStr}, HasRelation: ${hasRelation}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
