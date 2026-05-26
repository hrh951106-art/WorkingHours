import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testWorkHourDetailsAPI() {
  console.log('========================================');
  console.log('测试工时明细API金额字段');
  console.log('========================================\n');

  const employeeNo = '202604003';
  const startDate = '2026-05-10';
  const endDate = '2026-05-12';
  const accountName = '大华富阳工厂/W1总装车间/W1总装车间L2产线/大桶/焊接/-/-';
  const attendanceCodeName = '线体工时';

  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T23:59:59');

  console.log('查询条件:');
  console.log('  员工号:', employeeNo);
  console.log('  账户:', accountName);
  console.log('  出勤代码:', attendanceCodeName);
  console.log('  日期范围:', startDate, '-', endDate);
  console.log('');

  // 查询工时明细
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
    // 格式化响应数据
    const formattedDetails = workHourDetails.map((detail) => {
      const formatDate = (date: Date) => {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      };

      return {
        date: formatDate(detail.calcDate),
        calcDate: detail.calcDate,
        accountName: detail.accountName,
        attendanceCodeName: detail.definitionAttendanceCode?.name || detail.definitionAttendanceCodeStr,
        startTime: detail.startTime,
        endTime: detail.endTime,
        workHours: detail.workHours,
        amount: detail.amount || 0,
        shiftName: detail.shiftName,
      };
    });

    console.log('📋 API返回数据（前端收到的数据）:');
    console.log('');
    console.log('字段列表:', Object.keys(formattedDetails[0]));
    console.log('');

    formattedDetails.forEach((detail, index) => {
      console.log(`${index + 1}. 日期: ${detail.date}`);
      console.log(`   账户: ${detail.accountName}`);
      console.log(`   出勤代码: ${detail.attendanceCodeName}`);
      console.log(`   工作时段: ${detail.startTime ? detail.startTime.substring(0, 16) : '-'} - ${detail.endTime ? detail.endTime.substring(0, 16) : '-'}`);
      console.log(`   工时: ${detail.workHours} 小时`);
      console.log(`   金额: ¥${detail.amount} ${detail.amount > 0 ? '✅' : '❌'}`);
      console.log(`   班次: ${detail.shiftName || '-'}`);
      console.log('');
    });

    console.log('✅ 金额字段验证成功');
  } else {
    console.log('❌ 没有找到明细数据');
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
