import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 诊断推送问题 ===\n');

  // 检查 CalcResult
  const calcResults = await prisma.calcResult.count();
  console.log(`CalcResult 记录数: ${calcResults}`);

  // 检查 DefinitionAttendanceCode
  const defCodes = await prisma.definitionAttendanceCode.count();
  console.log(`DefinitionAttendanceCode 记录数: ${defCodes}`);

  // 检查 WorkHourResult
  const workHourResults = await prisma.workHourResult.count();
  console.log(`WorkHourResult 记录数: ${workHourResults}`);

  console.log('\n=== 分析 ===\n');

  if (calcResults === 0) {
    console.log('❌ CalcResult 为空，需要先调用计算API');
  } else if (workHourResults === 0) {
    console.log('⚠️ CalcResult 有数据但 WorkHourResult 为空');
    console.log('');
    console.log('可能原因：');
    console.log('1. 批量计算API没有被调用（只有数据，没触发推送）');
    console.log('2. DefinitionAttendanceCode 映射缺失');
    console.log('3. 推送逻辑出错但被静默捕获');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
