import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 重新计算 2026-05-12 的工时（简化版） ===\n');

  const employeeNo = '202604003';
  const calcDate = new Date('2026-05-12T00:00:00.000Z');

  // 1. 删除旧的工时结果
  console.log('1. 删除旧工时结果:');
  const deleteResult = await prisma.calcResult.deleteMany({
    where: {
      employeeNo,
      calcDate: calcDate,
    },
  });
  console.log(`   删除了 ${deleteResult.count} 条旧工时结果`);

  // 2. 使用API重新计算（避免依赖注入问题）
  console.log('\n2. 使用API重新计算:');

  try {
    const response = await fetch('http://localhost:3011/api/calculate/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtcGxveWVlTm8iOiJhZG1pbiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzI2ODAwNDIsImV4cCI6MTc3Mjc2NjQ0Mn0.HuqrrufQ2Q_ca-QWZg-k_lHehW_Fto9hRT0nFlUT_mo',
      },
      body: JSON.stringify({
        startDate: '2026-05-12',
        endDate: '2026-05-12',
        employeeNos: [employeeNo],
      }),
    });

    const result = await response.json();
    console.log(`   计算结果: ${JSON.stringify(result, null, 2)}`);
  } catch (error: any) {
    console.log(`   API调用失败: ${error.message}`);
    console.log(`   请确保后端服务器正在运行（npm run start:dev）`);
  }

  // 3. 查询最终结果
  console.log('\n3. 最终工时结果:');
  const finalResults = await prisma.calcResult.findMany({
    where: {
      employeeNo,
      calcDate: calcDate,
    },
    include: {
      calculationAttendanceCode: true,
    },
    orderBy: { punchInTime: 'asc' },
  });

  if (finalResults.length === 0) {
    console.log('   没有找到工时结果');
  } else {
    finalResults.forEach((result, idx) => {
      console.log(`   结果${idx + 1}:`);
      console.log(`     时间: ${result.punchInTime?.toISOString()} ~ ${result.punchOutTime?.toISOString()}`);
      console.log(`     工时: ${result.actualHours}h`);
      console.log(`     账户: ${result.accountName || 'null'}`);
      console.log(`     出勤代码: ${result.calculationAttendanceCode?.name || 'null'}`);
    });
  }

  // 4. 查询摆卡记录
  console.log('\n4. 摆卡记录:');
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo,
      pairDate: calcDate,
    },
    include: {
      account: true,
    },
    orderBy: { inPunchTime: 'asc' },
  });

  punchPairs.forEach((pair, idx) => {
    console.log(`   摆卡${idx + 1} (ID=${pair.id}):`);
    console.log(`     时间: ${pair.inPunchTime?.toISOString()} ~ ${pair.outPunchTime?.toISOString() || 'null'}`);
    console.log(`     工时: ${pair.workHours}h`);
    console.log(`     账户: ${pair.account?.namePath || 'null'}`);
  });
}

main()
  .then(() => console.log('\n重新计算完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
