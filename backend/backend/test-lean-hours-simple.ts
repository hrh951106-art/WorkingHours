import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 测试精益工时计算修复 ===\n');

  // 查询 Paul 在 2026-05-10 的摆卡数据
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo: '202605002',
      pairDate: {
        gte: new Date('2026-05-10T00:00:00.000Z'),
        lt: new Date('2026-05-11T00:00:00.000Z'),
      },
    },
    include: {
      account: true,
      inPunch: true,
      outPunch: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log(`找到 ${punchPairs.length} 条摆卡数据`);

  // 删除 2026-05-10 的精益工时结果
  console.log('\n删除 2026-05-10 的现有精益工时结果...');
  await prisma.calculationAttendanceCode.deleteMany({
    where: {
      employeeNo: '202605002',
      attendanceDate: {
        gte: new Date('2026-05-10T00:00:00.000Z'),
        lt: new Date('2026-05-11T00:00:00.000Z'),
      },
    },
  });
  console.log('删除完成');

  // 查询出勤代码配置
  const codes = await prisma.calculationAttendanceCode.findMany({
    where: {
      code: {
        in: ['AC_001', 'AC_003'],
      },
      status: 'ACTIVE',
    },
  });

  console.log(`\n找到 ${codes.length} 个出勤代码配置`);
  codes.forEach(code => {
    const levels = JSON.parse(code.accountLevels || '[]');
    console.log(`- ${code.name} (${code.code}): 要求层级 ${JSON.stringify(levels)}`);
  });

  // 重新计算精益工时
  console.log('\n开始重新计算精益工时...\n');
  console.log('=================================================\n');

  let totalResults = 0;

  for (const pair of punchPairs) {
    console.log(`摆卡ID: ${pair.id}`);
    console.log(`账户: ${pair.accountName || '无'}`);
    console.log(`时间: ${pair.inPunch?.punchTime} - ${pair.outPunch?.punchTime}`);

    if (!pair.account) {
      console.log('跳过: 无账户\n');
      continue;
    }

    const hierarchyValues = JSON.parse(pair.account.hierarchyValues || '[]');
    console.log(`账户层级: ${hierarchyValues.length} 层`);

    // 尝试匹配每个出勤代码
    for (const code of codes) {
      console.log(`\n测试匹配: ${code.name} (${code.code})`);

      const accountLevels = JSON.parse(code.accountLevels || '[]');
      console.log(`  要求层级: ${JSON.stringify(accountLevels)}`);

      // 检查账户是否匹配
      let matched = true;
      for (const sortValue of accountLevels) {
        const level = sortValue + 1;
        const levelConfig = hierarchyValues.find((hv: any) => hv.level === level);

        if (!levelConfig || !levelConfig.selectedValue) {
          console.log(`  Level ${level}: 无值 → 不匹配`);
          matched = false;
          break;
        } else {
          console.log(`  Level ${level}: ${levelConfig.selectedValue.name} ✓`);
        }
      }

      if (matched) {
        console.log(`  ✓ 匹配成功!`);

        // 计算工时
        const startTime = new Date(pair.inPunch!.punchTime);
        const endTime = new Date(pair.outPunch!.punchTime);
        const workHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

        console.log(`  创建记录: ${workHours.toFixed(2)} 小时`);

        await prisma.calculationAttendanceCode.create({
          data: {
            employeeNo: pair.employeeNo,
            date: '2026-05-10',
            calculationAttendanceCodeConfigId: code.id,
            code: code.code,
            name: code.name,
            hours: workHours,
            punchPairId: pair.id,
            accountId: pair.accountId,
            accountName: pair.accountName,
            accountPath: pair.accountPath,
            hierarchyValues: pair.account.hierarchyValues,
            attendanceDate: pair.pairDate,
            inPunchTime: pair.inPunch!.punchTime,
            outPunchTime: pair.outPunch!.punchTime,
          },
        });

        totalResults++;
      } else {
        console.log(`  ✗ 不匹配`);
      }
    }

    console.log('\n=================================================\n');
  }

  console.log(`\n总结: 共创建 ${totalResults} 条精益工时记录`);

  // 查询最终结果
  const results = await prisma.calculationAttendanceCode.findMany({
    where: {
      employeeNo: '202605002',
      attendanceDate: {
        gte: new Date('2026-05-10T00:00:00.000Z'),
        lt: new Date('2026-05-11T00:00:00.000Z'),
      },
    },
    orderBy: { id: 'asc' },
  });

  console.log('\n最终结果:');
  results.forEach(r => {
    console.log(`- ${r.name} (${r.code}): ${r.hours.toFixed(2)} 小时`);
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
