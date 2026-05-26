import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeResults() {
  console.log('=== 分析班段转移账户合并结果 ===\n');

  // 获取计算结果
  const results = await prisma.calcResult.findMany({
    where: {
      employeeNo: '202604003',
      calcDate: new Date('2026-05-12T00:00:00.000Z'),
    },
    orderBy: { id: 'asc' },
  });

  console.log(`📊 共 ${results.length} 条计算结果:\n`);

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    console.log(`${i + 1}. 工时: ${r.actualHours}h, 金额: ¥${r.amount}`);
    console.log(`   账户路径: ${r.accountPath}`);

    // 解析路径
    const segments = r.accountPath ? r.accountPath.split('/') : [];
    console.log(`   路径分段: [${segments.map((s, idx) => `${idx + 1}.${s || '(空)'}`).join(', ')}]`);

    // 分析工序层级（第5层）
    const processLevel = segments[4] || '(空)';
    console.log(`   工序层级: ${processLevel}`);

    if (processLevel === 'PACKING') {
      console.log(`   ✅ 包含班段转移账户: 包装 (账户19)`);
    } else if (processLevel === 'WELDING') {
      console.log(`   ✅ 包含班段转移账户: 焊接 (账户18)`);
    } else if (processLevel === '(空)') {
      console.log(`   ⚠️  工序层级为空（可能未匹配到班段转移账户）`);
    }

    console.log('');
  }

  console.log('=== 分析完成 ===');
}

analyzeResults()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 错误:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
