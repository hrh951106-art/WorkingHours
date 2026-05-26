import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 测试账户匹配逻辑 ===\n');

  // 查询 2026-05-10 的摆卡账户
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
    },
    orderBy: { id: 'asc' },
  });

  // 查询出勤代码
  const codes = await prisma.calculationAttendanceCode.findMany({
    where: {
      code: {
        in: ['AC_001', 'AC_003'],
      },
    },
  });

  console.log('摆卡账户匹配测试:');
  punchPairs.forEach(pair => {
    console.log('\n摆卡ID: ' + pair.id);
    console.log('账户: ' + pair.account?.namePath);
    
    if (!pair.account) return;

    const hierarchyValues = JSON.parse(pair.account.hierarchyValues || '[]');
    console.log('层级配置:');
    hierarchyValues.forEach((hv: any) => {
      const val = hv.selectedValue ? hv.selectedValue.name : '无值';
      console.log('  Level ' + hv.level + ': ' + val);
    });

    console.log('\n出勤代码匹配结果:');
    codes.forEach(code => {
      const accountLevels = JSON.parse(code.accountLevels || '[]');
      console.log('\n' + code.name + ' (' + code.code + '):');
      console.log('  要求层级: ' + JSON.stringify(accountLevels));

      let matched = true;
      for (const sortValue of accountLevels) {
        const level = sortValue + 1;
        const levelConfig = hierarchyValues.find((hv: any) => hv.level === level);

        if (!levelConfig || !levelConfig.selectedValue) {
          console.log('  Level ' + level + ': 无值 → 不匹配');
          matched = false;
          break;
        } else {
          console.log('  Level ' + level + ': ' + levelConfig.selectedValue.name + ' ✓');
        }
      }

      console.log('  匹配结果: ' + (matched ? '✓ 匹配' : '✗ 不匹配'));
    });
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
