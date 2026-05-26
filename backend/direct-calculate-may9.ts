import { PrismaClient } from '@prisma/client';
import { AttendanceCodeService } from './src/modules/calculate/attendance-code.service';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202605002';
  const date = '2026-05-09';

  console.log(`=== 直接调用计算服务计算 ${employeeNo} 在 ${date} 的工时 ===\n`);

  // 1. 获取摆卡记录
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo: employeeNo,
      pairDate: {
        gte: new Date(`${date}T00:00:00Z`),
        lte: new Date(`${date}T23:59:59Z`)
      }
    }
  });

  console.log(`找到 ${punchPairs.length} 条摆卡记录\n`);

  if (punchPairs.length === 0) {
    console.log('❌ 没有摆卡记录');
    return;
  }

  // 2. 创建AttendanceCodeService实例
  const attendanceCodeService = new AttendanceCodeService(prisma, null, null, null);

  // 3. 对每个摆卡记录调用计算
  for (const pp of punchPairs) {
    console.log(`--- 计算摆卡 ID: ${pp.id} ---`);
    console.log(`上班时间: ${pp.inPunchTime}`);
    console.log(`下班时间: ${pp.outPunchTime}`);

    try {
      const results = await attendanceCodeService.calculateFromPunchPair(pp.id);
      console.log(`✅ 计算成功，生成了 ${results.length} 条工时记录`);

      // 显示生成的结果
      results.forEach((result: any, index: number) => {
        console.log(`  [${index + 1}] ${result.calculationAttendanceCodeId} - ${result.actualHours}小时`);
      });
    } catch (error: any) {
      console.error(`❌ 计算失败: ${error.message}`);
    }

    console.log('');
  }

  console.log('=== 计算完成 ===\n');

  // 4. 检查最终的计算结果
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

  console.log(`最终计算结果: ${calcResults.length} 条\n`);

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

  // 检查是否有AC_003的结果
  const hasAC003 = calcResults.some(r => r.calculationAttendanceCode?.code === 'AC_003');
  if (hasAC003) {
    console.log('\n✅ 成功！有AC_003（工序工时）的计算结果');
  } else {
    console.log('\n❌ 仍然没有AC_003（工序工时）的计算结果');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
