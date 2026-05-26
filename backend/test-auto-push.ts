import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 测试完整的自动推送流程 ===\n');

  // 1. 检查当前数据状态
  console.log('步骤1：检查当前数据状态');
  const punchPairCount = await prisma.punchPair.count();
  const calcResultCount = await prisma.calcResult.count();
  const workHourResultCount = await prisma.workHourResult.count();

  console.log(`  PunchPair: ${punchPairCount} 条`);
  console.log(`  CalcResult: ${calcResultCount} 条`);
  console.log(`  WorkHourResult: ${workHourResultCount} 条\n`);

  if (punchPairCount === 0) {
    console.log('❌ 没有摆卡数据，请先创建摆卡数据');
    return;
  }

  // 2. 模拟批量计算API的推送逻辑
  console.log('步骤2：模拟批量计算后的自动推送\n');

  try {
    // 查询所有 CalcResult
    const newCalcResults = await prisma.calcResult.findMany({
      select: { id: true }
    });

    const calcResultIds = newCalcResults.map(r => r.id);
    console.log(`找到 ${calcResultIds.length} 条 CalcResult，准备推送...`);

    if (calcResultIds.length === 0) {
      console.log('❌ 没有 CalcResult 数据，请先调用计算API');
      return;
    }

    // 注意：这里不能直接调用推送服务，因为需要完整的NestJS上下文
    // 需要通过API来触发
    console.log('\n步骤3：通过API触发推送\n');
    console.log('请使用以下curl命令触发推送：\n');
    console.log(`curl -X POST 'http://localhost:3001/api/calculate/work-hours/push' \\`);
    console.log(`  -H 'Content-Type: application/json' \\`);
    console.log(`  -H 'Authorization: Bearer YOUR_TOKEN' \\`);
    console.log(`  -d '{"calcResultIds": [${calcResultIds.join(', ')}]}'\n`);

  } catch (error: any) {
    console.error('执行失败:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
