import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查所有精益工时计算结果 ===\n');

  // 查询所有精益工时计算结果
  const leanResults = await prisma.calcResult.findMany({
    where: {
      calculationAttendanceCode: {
        type: 'LEAN_HOURS'
      }
    },
    include: {
      calculationAttendanceCode: true,
    },
    orderBy: { calcDate: 'desc' }
  });

  console.log(`找到 ${leanResults.length} 条精益工时计算结果\n`);

  if (leanResults.length === 0) {
    console.log('❌ 没有任何精益工时计算结果！');
    console.log('');
    console.log('这说明：');
    console.log('1. 精益工时计算逻辑从未被执行过');
    console.log('2. 或者执行了但结果没有保存到数据库');
    return;
  }

  // 按计算出勤代码分组统计
  const codeGroups = new Map<string, any[]>();
  leanResults.forEach(result => {
    const code = result.calculationAttendanceCode?.code || 'N/A';
    const name = result.calculationAttendanceCode?.name || 'N/A';
    const key = `${code} (${name})`;

    if (!codeGroups.has(key)) {
      codeGroups.set(key, []);
    }
    codeGroups.get(key)!.push(result);
  });

  console.log('=== 按计算出勤代码分组统计 ===\n');

  codeGroups.forEach((results, key) => {
    const totalHours = results.reduce((sum, r) => sum + r.actualHours, 0);
    const employeeCount = new Set(results.map(r => r.employeeNo)).size;
    console.log(`${key}`);
    console.log(`  记录数: ${results.length}`);
    console.log(`  员工数: ${employeeCount}`);
    console.log(`  总工时: ${totalHours} 小时`);
    console.log('');
  });

  // 检查是否有不匹配的情况
  console.log('=== 检查账户匹配情况（前10条）===\n');

  for (const result of leanResults.slice(0, 10)) {
    const code = result.calculationAttendanceCode;
    if (!code) continue;

    console.log(`--- 结果 ID: ${result.id} ---`);
    console.log(`员工: ${result.employeeNo}`);
    console.log(`日期: ${result.calcDate.toISOString().split('T')[0]}`);
    console.log(`出勤代码: ${code.code} (${code.name})`);
    console.log(`账户路径: ${result.accountPath || 'N/A'}`);
    console.log(`账户名称: ${result.accountName || 'N/A'}`);
    console.log(`工时: ${result.actualHours} 小时`);

    // 检查账户匹配
    if (result.accountId && code.accountLevels) {
      const account = await prisma.laborAccount.findUnique({
        where: { id: result.accountId }
      });

      if (account) {
        const hierarchyValues = account.hierarchyValues ? JSON.parse(account.hierarchyValues) : [];
        const accountLevels = JSON.parse(code.accountLevels || '[]');

        // 检查每个层级是否有值
        const missingLevels = [];
        for (const sortValue of accountLevels) {
          const level = sortValue + 1;
          const levelConfig = hierarchyValues.find((hv: any) => hv.level === level);

          if (!levelConfig || !levelConfig.selectedValue) {
            missingLevels.push(level);
          }
        }

        if (missingLevels.length > 0) {
          console.log(`⚠️ 账户不匹配！缺少层级: ${missingLevels.join(', ')}`);
        } else {
          console.log('✅ 账户匹配');
        }
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
