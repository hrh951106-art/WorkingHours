import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605002';
  const date = '2026-05-10';

  console.log(`=== 查询员工 ${employeeNo} 在 ${date} 的所有相关信息 ===\n`);

  // 1. 查询员工的主账户
  const employee = await prisma.employee.findUnique({
    where: { employeeNo }
  });

  if (!employee) {
    console.log('员工不存在');
    return;
  }

  const employeeAccounts = await prisma.employeeLaborAccount.findMany({
    where: { employeeId: employee.id },
    include: {
      account: {
        select: {
          id: true,
          name: true,
          path: true,
          level: true,
          hierarchyValues: true
        }
      }
    }
  });

  console.log(`=== 员工关联账户 (${employeeAccounts.length}个) ===\n`);

  employeeAccounts.forEach(ea => {
    const account = ea.account;
    const hierarchyValues = account.hierarchyValues ? JSON.parse(account.hierarchyValues) : [];

    console.log(`账户: ${account.name}`);
    console.log(`  层级: ${account.level}`);
    console.log(`  路径: ${account.path}`);

    // 检查 AC_003 的匹配情况
    const accountLevels_AC003 = [0, 1, 2, 4];
    const missingLevels = [];

    for (const sortValue of accountLevels_AC003) {
      const level = sortValue + 1;
      const levelConfig = hierarchyValues.find((hv: any) => hv.level === level);

      if (!levelConfig || !levelConfig.selectedValue) {
        missingLevels.push(level);
      }
    }

    const match_AC003 = missingLevels.length === 0;
    console.log(`  AC_003 (工序工时) 匹配: ${match_AC003 ? '✅' : '❌'} ${!match_AC003 ? `(缺少: ${missingLevels.join(', ')})` : ''}`);
    console.log('');
  });

  // 2. 查询排班记录（查看班段账户）
  console.log(`\n=== 排班记录 ===\n`);

  const schedules = await prisma.employeeSchedule.findMany({
    where: {
      employeeNo,
      scheduleDate: {
        gte: new Date(`${date}T00:00:00Z`),
        lte: new Date(`${date}T23:59:59Z`)
      }
    }
  });

  console.log(`找到 ${schedules.length} 条排班记录\n`);

  for (const schedule of schedules) {
    console.log(`排班ID: ${schedule.id}`);
    console.log(`  班次: ${schedule.shiftId}`);
    console.log(`  班段: ${schedule.shiftSegmentId}`);

    if (schedule.shiftId) {
      const shift = await prisma.shift.findUnique({
        where: { id: schedule.shiftId },
        include: {
          segments: true
        }
      });

      if (shift) {
        console.log(`  班次名称: ${shift.name}`);
        console.log(`  班段数量: ${shift.segments.length}`);

        for (const segment of shift.segments) {
          console.log(`\n  班段: ${segment.name}`);
          console.log(`    类型: ${segment.type}`);
          console.log(`    转移账户ID: ${segment.accountId || 'N/A'}`);

          if (segment.accountId) {
            const segmentAccount = await prisma.laborAccount.findUnique({
              where: { id: segment.accountId },
              select: {
                id: true,
                name: true,
                level: true,
                hierarchyValues: true
              }
            });

            if (segmentAccount) {
              const hierarchyValues = segmentAccount.hierarchyValues ? JSON.parse(segmentAccount.hierarchyValues) : [];

              console.log(`    账户名称: ${segmentAccount.name}`);
              console.log(`    账户层级: ${segmentAccount.level}`);
              console.log(`    层级值: ${segmentAccount.hierarchyValues}`);

              // 检查 AC_003 的匹配情况
              const accountLevels_AC003 = [0, 1, 2, 4];
              const missingLevels = [];

              for (const sortValue of accountLevels_AC003) {
                const level = sortValue + 1;
                const levelConfig = hierarchyValues.find((hv: any) => hv.level === level);

                if (!levelConfig || !levelConfig.selectedValue) {
                  missingLevels.push(level);
                }
              }

              const match_AC003 = missingLevels.length === 0;
              console.log(`    AC_003 匹配: ${match_AC003 ? '✅' : '❌'} ${!match_AC003 ? `(缺少: ${missingLevels.join(', ')})` : ''}`);
            }
          }
        }
      }
    }

    console.log('');
  }

  // 3. 查询打卡配对（查看刷卡账户）
  console.log(`\n=== 打卡配对记录 ===\n`);

  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo,
      pairDate: {
        gte: new Date(`${date}T00:00:00Z`),
        lte: new Date(`${date}T23:59:59Z`)
      }
    }
  });

  console.log(`找到 ${punchPairs.length} 条打卡配对记录`);

  if (punchPairs.length > 0) {
    for (const pair of punchPairs) {
      console.log(`\n配对ID: ${pair.id}`);
      console.log(`  刷卡账户ID: ${pair.accountId || 'N/A'}`);

      if (pair.accountId) {
        const punchAccount = await prisma.laborAccount.findUnique({
          where: { id: pair.accountId },
          select: {
            id: true,
            name: true,
            level: true,
            hierarchyValues: true
          }
        });

        if (punchAccount) {
          const hierarchyValues = punchAccount.hierarchyValues ? JSON.parse(punchAccount.hierarchyValues) : [];

          console.log(`  账户名称: ${punchAccount.name}`);
          console.log(`  层级值: ${punchAccount.hierarchyValues}`);

          // 检查 AC_003 的匹配情况
          const accountLevels_AC003 = [0, 1, 2, 4];
          const missingLevels = [];

          for (const sortValue of accountLevels_AC003) {
            const level = sortValue + 1;
            const levelConfig = hierarchyValues.find((hv: any) => hv.level === level);

            if (!levelConfig || !levelConfig.selectedValue) {
              missingLevels.push(level);
            }
          }

          const match_AC003 = missingLevels.length === 0;
          console.log(`  AC_003 匹配: ${match_AC003 ? '✅' : '❌'} ${!match_AC003 ? `(缺少: ${missingLevels.join(', ')})` : ''}`);
        }
      }
    }
  } else {
    console.log('  （没有打卡配对记录，说明计算结果不是从精益工时计算产生的）');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
