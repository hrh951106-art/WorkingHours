import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查摆卡账户的层级 ===\n');

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

  console.log('2026-05-10 摆卡账户层级:');
  punchPairs.forEach(p => {
    if (p.account) {
      console.log('\n摆卡ID: ' + p.id);
      console.log('账户: ' + p.account.namePath);
      const hierarchyValues = JSON.parse(p.account.hierarchyValues || '[]');
      console.log('层级配置:');
      hierarchyValues.forEach((hv: any) => {
        const hasValue = hv.selectedValue ? '有值' : '无值';
        console.log('  Level ' + hv.level + ' (' + hv.name + '): ' + hasValue);
        if (hv.selectedValue) {
          console.log('    值: ' + JSON.stringify(hv.selectedValue));
        }
      });
    }
  });

  // 查询出勤代码的层级配置
  console.log('\n\n=== 出勤代码层级配置 ===\n');

  const codes = await prisma.calculationAttendanceCode.findMany({
    where: {
      code: {
        in: ['AC_001', 'AC_003'],
      },
    },
  });

  codes.forEach(code => {
    console.log('\n' + code.name + ' (' + code.code + '):');
    const accountLevels = JSON.parse(code.accountLevels || '[]');
    console.log('要求层级: ' + JSON.stringify(accountLevels));
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
