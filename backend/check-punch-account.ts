import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605002';
  const date = '2026-05-10';

  console.log(`=== 查询员工 ${employeeNo} 在 ${date} 的打卡配对和账户信息 ===\n`);

  // 查询打卡配对
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo: employeeNo,
      pairDate: {
        gte: new Date(`${date}T00:00:00Z`),
        lte: new Date(`${date}T23:59:59Z`)
      }
    }
  });

  console.log(`找到 ${punchPairs.length} 条打卡配对记录\n`);

  for (const pair of punchPairs) {
    console.log(`--- 配对 ID: ${pair.id} ---`);
    console.log(`上班打卡: ${pair.inPunchTime}`);
    console.log(`下班打卡: ${pair.outPunchTime}`);
    console.log(`工时: ${pair.workHours} 小时`);
    console.log(`班次: ${pair.shiftName || 'N/A'}`);
    console.log(`刷卡账户ID: ${pair.accountId || 'N/A'}`);

    if (pair.accountId) {
      const punchAccount = await prisma.laborAccount.findUnique({
        where: { id: pair.accountId },
        select: {
          id: true,
          name: true,
          path: true,
          level: true,
          hierarchyValues: true
        }
      });

      if (punchAccount) {
        console.log(`\n刷卡账户信息:`);
        console.log(`名称: ${punchAccount.name}`);
        console.log(`路径: ${punchAccount.path}`);
        console.log(`层级: ${punchAccount.level}`);
        console.log(`层级值: ${punchAccount.hierarchyValues}`);

        // 检查各出勤代码的匹配情况
        console.log(`\n匹配情况:`);

        const codes = [
          { code: 'AC_001', name: '线体工时', levels: [0,1,2] },
          { code: 'AC_003', name: '工序工时', levels: [0,1,2,4] },
          { code: 'AC_004', name: '出勤工时', levels: [] }
        ];

        const hierarchyValues = punchAccount.hierarchyValues ? JSON.parse(punchAccount.hierarchyValues) : [];

        codes.forEach(codeInfo => {
          let match = true;
          const missingLevels = [];

          if (codeInfo.levels.length > 0) {
            for (const sortValue of codeInfo.levels) {
              const level = sortValue + 1;
              const levelConfig = hierarchyValues.find((hv: any) => hv.level === level);

              if (!levelConfig || !levelConfig.selectedValue) {
                match = false;
                missingLevels.push(level);
              }
            }
          }

          console.log(`  ${codeInfo.code} (${codeInfo.name}): ${match ? '✅ 匹配' : '❌ 不匹配 (缺少层级: ' + missingLevels.join(', ') + ')'}`);
        });
      }
    }

    console.log('');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
