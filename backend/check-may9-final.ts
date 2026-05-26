import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605002';
  const date = '2026-05-09';

  console.log(`=== 检查 ${employeeNo} 在 ${date} 的计算结果 ===\n`);

  // 检查计算结果
  const calcResults = await prisma.calcResult.findMany({
    where: {
      employeeNo: employeeNo,
      calcDate: {
        gte: new Date(`${date}T00:00:00Z`),
        lte: new Date(`${date}T23:59:59Z`)
      }
    },
    include: {
      calculationAttendanceCode: true
    },
    orderBy: { id: 'asc' }
  });

  console.log(`找到 ${calcResults.length} 条计算结果\n`);

  if (calcResults.length === 0) {
    console.log('没有计算结果');
    console.log('');
    console.log('账户22和27已经修复，可以匹配AC_003。');
    console.log('需要通过前端界面或API触发计算来生成工时结果。');
    return;
  }

  // 按出勤代码分组
  const codeGroups = new Map<string, any[]>();
  calcResults.forEach(result => {
    const code = result.calculationAttendanceCode?.code || 'N/A';
    const name = result.calculationAttendanceCode?.name || 'N/A';
    const key = `${code} (${name})`;

    if (!codeGroups.has(key)) {
      codeGroups.set(key, []);
    }
    codeGroups.get(key)!.push(result);
  });

  console.log('按出勤代码分组:');
  codeGroups.forEach((results, key) => {
    const totalHours = results.reduce((sum, r) => sum + r.actualHours, 0);
    console.log(`  ${key}: ${results.length}条, ${totalHours}小时`);
  });

  // 检查是否有AC_003
  const ac003Results = calcResults.filter(r => r.calculationAttendanceCode?.code === 'AC_003');
  if (ac003Results.length > 0) {
    console.log('');
    console.log('成功！有AC_003（工序工时）的计算结果');
  } else {
    console.log('');
    console.log('仍然没有AC_003（工序工时）的计算结果');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
