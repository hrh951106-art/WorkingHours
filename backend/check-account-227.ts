import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAccount227() {
  console.log('=== 检查账户227的详细信息 ===\n');

  try {
    // 1. 查询账户227
    const account227 = await prisma.laborAccount.findUnique({
      where: { id: 227 },
    });

    if (!account227) {
      console.log('❌ 未找到账户227');
      await prisma.$disconnect();
      return;
    }

    console.log('账户227信息:');
    console.log(`  ID: ${account227.id}`);
    console.log(`  code: ${account227.code || 'NULL'}`);
    console.log(`  name: ${account227.name || 'NULL'}`);
    console.log(`  type: ${account227.type}`);
    console.log(`  path: ${account227.path}`);
    console.log(`  namePath: ${account227.namePath || 'NULL'}`);
    console.log(`  employeeId: ${account227.employeeId || 'NULL'}`);
    console.log(`  employeeNo: ${account227.employeeNo || 'NULL'}`);
    console.log(`  status: ${account227.status}`);
    console.log(`  effectiveDate: ${account227.effectiveDate.toISOString().substring(0, 10)}`);
    console.log(`  expiryDate: ${account227.expiryDate?.toISOString().substring(0, 10) || 'NULL'}`);
    console.log('');

    // 2. 解析层级路径
    if (account227.path) {
      const levels = account227.path.split('/');
      console.log('路径层级分析:');
      console.log(`  总层数: ${levels.length}`);
      levels.forEach((level, index) => {
        const hasValue = level && level.trim() !== '';
        console.log(`  Level ${index + 1}: ${hasValue ? level : '(空)'} ${hasValue ? '✅' : '❌'}`);
      });
      console.log('');
    }

    // 3. A02规则的accountFilter要求
    console.log('A02规则的accountFilter要求:');
    console.log('  Level 1 (工厂): SZ');
    console.log('');

    const level1Value = account227.path?.split('/')[0];
    const matches = level1Value === 'SZ';
    const marker = matches ? '✅' : '❌';
    console.log(`账户227的Level 1值: ${level1Value || '(空)'}`);
    console.log(`匹配结果: ${marker} ${matches ? '匹配' : '不匹配'}`);
    console.log('');

    // 4. 查询所有SZ工厂的账户
    console.log('查询所有工厂=SZ的账户（前10个）:');
    const szAccounts = await prisma.laborAccount.findMany({
      where: {
        path: { startsWith: 'SZ/' },
        status: 'ACTIVE',
      },
      take: 10,
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        path: true,
        employeeNo: true,
      },
    });

    console.log(`找到 ${szAccounts.length} 个账户\n`);
    szAccounts.forEach((acc) => {
      console.log(`  ID: ${acc.id}, 类型: ${acc.type}, 员工: ${acc.employeeNo || 'N/A'}, 路径: ${acc.path}`);
    });
    console.log('');

    // 5. 检查账户227是否在分摊计算时会被查询到
    console.log('=== 检查账户筛选逻辑 ===\n');
    console.log('A02规则配置:');
    console.log('  hierarchySelections: [{ level: 1, levelName: "工厂", valueIds: ["SZ"] }]');
    console.log('');
    console.log('系统会根据这个条件查询所有Level 1 = SZ的账户');
    console.log('然后使用这些账户的ID列表来筛选工时记录');
    console.log('');

    if (matches) {
      console.log('✅ 账户227符合筛选条件（Level 1 = SZ）');
      console.log('');
      console.log('那么问题不在账户筛选上...');
    } else {
      console.log('❌ 账户227不符合筛选条件');
      console.log('这就是为什么A02规则没有数据的原因！');
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
    throw error;
  }

  await prisma.$disconnect();
}

checkAccount227()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
