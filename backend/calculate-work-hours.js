const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function calculateWorkHours() {
  try {
    console.log('开始计算工时...');

    // 获取所有摆卡结果
    const punchPairs = await prisma.punchPair.findMany({
      include: {
        inPunch: { include: { device: true } },
        outPunch: { include: { device: true } },
        account: true,
      },
    });

    console.log(`找到 ${punchPairs.length} 条摆卡结果`);

    // 获取出勤代码
    const attendanceCodes = await prisma.attendanceCode.findMany({
      where: { code: { in: ['A01', 'A02'] } },
    });

    console.log(`找到 ${attendanceCodes.length} 个出勤代码:`, attendanceCodes.map(c => c.code));

    let successCount = 0;

    for (const punchPair of punchPairs) {
      console.log(`\n处理摆卡 ${punchPair.id}:`);
      console.log(`  员工: ${punchPair.employeeNo}`);
      console.log(`  日期: ${new Date(punchPair.pairDate).toISOString().split('T')[0]}`);
      console.log(`  班次: ${punchPair.shiftName}`);
      console.log(`  上班时间: ${punchPair.inPunchTime ? new Date(punchPair.inPunchTime).toISOString() : 'N/A'}`);
      console.log(`  下班时间: ${punchPair.outPunchTime ? new Date(punchPair.outPunchTime).toISOString() : 'N/A'}`);
      console.log(`  工时: ${punchPair.workHours} 小时`);

      for (const code of attendanceCodes) {
        // 检查是否已存在计算结果
        const existing = await prisma.calcResult.findFirst({
          where: {
            employeeNo: punchPair.employeeNo,
            calcDate: new Date(punchPair.pairDate),
            attendanceCodeId: code.id,
          },
        });

        if (existing) {
          console.log(`    ${code.code}: 已存在，跳过`);
          continue;
        }

        // 只为作业工时（A01）创建计算结果
        if (code.code === 'A01') {
          const result = await prisma.calcResult.create({
            data: {
              employeeNo: punchPair.employeeNo,
              calcDate: new Date(punchPair.pairDate),
              attendanceCodeId: code.id,
              shiftId: punchPair.shiftId,
              shiftName: punchPair.shiftName,
              actualHours: punchPair.workHours,
              standardHours: 7.5,
              accountId: punchPair.accountId,
              accountName: punchPair.account?.namePath || null,
              status: 'PENDING',
              punchInTime: punchPair.inPunchTime ? new Date(punchPair.inPunchTime) : null,
              punchOutTime: punchPair.outPunchTime ? new Date(punchPair.outPunchTime) : null,
            },
          });

          console.log(`    ${code.code}: 创建成功，ID=${result.id}, 工时=${result.actualHours}`);
          successCount++;
        }
      }
    }

    console.log(`\n计算完成！成功创建 ${successCount} 条工时记录`);

  } catch (error) {
    console.error('计算失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

calculateWorkHours();
