import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testWorkHourDetailsAPI() {
  console.log('========================================');
  console.log('测试工时明细API金额字段');
  console.log('========================================\n');

  const employeeNo = '202604003';
  const accountName = '大华富阳工厂/W1总装车间/W1总装车间L2产线/大桶/焊接/-/-';
  const attendanceCodeName = '线体工时';

  const start = new Date('2026-05-10T00:00:00');
  const end = new Date('2026-05-12T23:59:59');

  console.log('查询条件:');
  console.log('  员工号:', employeeNo);
  console.log('  账户:', accountName);
  console.log('  出勤代码:', attendanceCodeName);
  console.log('  日期范围:', start.toLocaleDateString(), '-', end.toLocaleDateString());
  console.log('');

  // 查询工时结果
  const workHourDetails = await prisma.workHourResult.findMany({
    where: {
      employeeNo,
      calcDate: {
        gte: start,
        lte: end,
      },
      accountName: accountName,
      definitionAttendanceCode: {
        name: attendanceCodeName,
        showInAttendanceCard: true,
      },
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
    orderBy: { calcDate: 'asc' },
  });

  console.log(`找到 ${workHourDetails.length} 条工时明细\n`);

  if (workHourDetails.length > 0) {
    console.log('字段检查:');
    const firstRecord = workHourDetails[0];
    console.log('  包含字段:', Object.keys(firstRecord));
    console.log('  amount字段:', 'amount' in firstRecord ? '✅ 存在' : '❌ 不存在');
    console.log('  amount值:', firstRecord.amount);
    console.log('');

    console.log('数据详情:');
    workHourDetails.forEach((detail) => {
      console.log('----------------------------------------');
      console.log('  日期:', detail.calcDate);
      console.log('  账户:', detail.accountName);
      console.log('  出勤代码:', detail.definitionAttendanceCode?.name);
      console.log('  工时:', detail.workHours);
      console.log('  金额:', detail.amount || 0, '✅');
      console.log('  班次:', detail.shiftName);
    });
  }

  console.log('\n========================================');
}

testWorkHourDetailsAPI()
  .then(() => {
    console.log('测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('测试失败:', error);
    process.exit(1);
  });
