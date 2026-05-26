import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 更新金额政策以使用层级匹配模式
 *
 * 将 A01 政策更新为：
 * - accountPath: "///大桶/焊接//"
 * - accountPathMatch: "LEVEL"
 *
 * 这样就可以匹配所有产品=大桶且工序=焊接的账户
 */
async function updatePolicyToLevelMatching() {
  console.log('========== 更新金额政策为层级匹配模式 ==========\n');

  try {
    // 获取A01政策
    const policy = await prisma.amountPolicy.findFirst({
      where: { code: 'A01' },
    });

    if (!policy) {
      console.log('❌ 未找到A01政策');
      return;
    }

    console.log('当前A01政策信息:');
    console.log(`  ID: ${policy.id}`);
    console.log(`  名称: ${policy.name}`);
    console.log(`  账户路径: ${policy.accountPath}`);
    console.log(`  匹配模式: ${policy.accountPathMatch}`);

    // 更新为层级匹配
    const newAccountPath = '///大桶/焊接//';
    const newAccountPathMatch = 'LEVEL';

    console.log(`\n更新为层级匹配:`);
    console.log(`  新账户路径: ${newAccountPath}`);
    console.log(`  新匹配模式: ${newAccountPathMatch}`);

    const updated = await prisma.amountPolicy.update({
      where: { id: policy.id },
      data: {
        accountPath: newAccountPath,
        accountPathMatch: newAccountPathMatch,
      },
    });

    console.log(`\n✅ 政策已更新`);
    console.log(`  新账户路径: ${updated.accountPath}`);
    console.log(`  新匹配模式: ${updated.accountPathMatch}`);

    // 测试匹配
    console.log(`\n========== 测试匹配结果 ==========`);

    const testPaths = [
      '大华富阳工厂/W1总装车间/W1总装车间L2产线/大桶/焊接/-/-',
      '大华富阳工厂/W1总装车间/W1总装车间L1产线/大桶/包装/-/-',
      '大华富阳工厂/W1总装车间/W1总装车间L1产线/大桶/-/-/-',
    ];

    testPaths.forEach(path => {
      // 分割路径进行层级匹配测试
      const policyParts = newAccountPath.split('/');
      const actualParts = path.split('/');

      let match = true;
      let requiredMatches = 0;

      for (let i = 0; i < policyParts.length; i++) {
        const policyValue = policyParts[i];
        const actualValue = actualParts[i];

        if (policyValue && policyValue !== '-' && policyValue !== '') {
          requiredMatches++;
          if (actualValue !== policyValue) {
            match = false;
            break;
          }
        }
      }

      console.log(`\n账户路径: ${path}`);
      console.log(`匹配结果: ${match ? '✅ 匹配' : '❌ 不匹配'}`);
    });

    console.log('\n========== 更新完成 ==========');
    console.log('\n下一步:');
    console.log('1. 重新计算202604003员工在2026-05-12的工时');
    console.log('2. 验证金额是否正确计算');
    console.log('   - 焊接工时（3小时）: 应该计算为 3 × 20 × 1.5 = 90');
    console.log('   - 包装工时（2小时）: 应该计算为 2 × 20 = 40');

  } catch (error) {
    console.error('更新失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePolicyToLevelMatching()
  .then(() => {
    console.log('\n脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n脚本执行失败:', error);
    process.exit(1);
  });
