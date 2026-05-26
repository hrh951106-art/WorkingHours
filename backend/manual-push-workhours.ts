import { PrismaService } from './src/database/prisma.service';
import { WorkHourPushService } from './src/modules/calculate/work-hour-push.service';

const prisma = new PrismaService();

async function main() {
  console.log('=== 手动触发工时推送 ===\n');

  // 获取所有 CalcResult ID
  const calcResults = await prisma.calcResult.findMany({
    select: { id: true }
  });

  const calcResultIds = calcResults.map(r => r.id);

  console.log(`找到 ${calcResultIds.length} 条 CalcResult 记录`);
  console.log(`准备推送 ID: ${calcResultIds.join(', ')}\n`);

  if (calcResultIds.length === 0) {
    console.log('❌ 没有 CalcResult 数据，无法推送');
    return;
  }

  try {
    // 直接调用推送服务
    const workHourPushService = new WorkHourPushService(prisma, null);
    const result = await workHourPushService.pushWorkHourResults(calcResultIds);

    console.log('推送完成!');
    console.log(`  成功: ${result.success}`);
    console.log(`  失败: ${result.failed}`);
    console.log(`  删除旧数据: ${result.deleted}`);

    if (result.errors && result.errors.length > 0) {
      console.log('\n错误信息:');
      result.errors.forEach((err, index) => {
        console.log(`  [${index + 1}] ${err}`);
      });
    }

    // 验证推送结果
    const workHourCount = await prisma.workHourResult.count();
    console.log(`\nWorkHourResult 表现在有 ${workHourCount} 条记录`);

    if (workHourCount > 0) {
      console.log('✅ 推送成功！');
    } else {
      console.log('⚠️ 推送完成但 WorkHourResult 仍为空，可能有过滤条件');
    }

  } catch (error: any) {
    console.error('❌ 推送失败:', error.message);
    console.error('错误详情:', error.stack);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
