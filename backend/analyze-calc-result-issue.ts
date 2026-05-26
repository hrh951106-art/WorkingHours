import { PrismaService } from './src/database/prisma.service';

async function analyze() {
  const prisma = new PrismaService();

  try {
    console.log('=== 分析CalcResult ID 709 ===\n');

    // 1. 查询CalcResult记录
    const calcResult = await prisma.calcResult.findUnique({
      where: { id: 709 },
    });

    if (!calcResult) {
      console.log('CalcResult ID 709 不存在');
      return;
    }

    console.log('1. CalcResult数据:');
    console.log(`   账户ID: ${calcResult.accountId}`);
    console.log(`   accountName: ${calcResult.accountName}`);
    console.log(`   accountPath: ${calcResult.accountPath}\n`);

    // 2. 查询账户14
    const account14 = await prisma.laborAccount.findUnique({
      where: { id: 14 },
    });

    if (account14) {
      console.log('2. 账户14数据:');
      console.log(`   Code: ${account14.code}`);
      console.log(`   Name: ${account14.name}`);
      console.log(`   Type: ${account14.type}`);
      console.log(`   Level: ${account14.level}`);
      console.log(`   Path: ${account14.path}`);
      console.log(`   NamePath: ${account14.namePath}`);

      if (account14.hierarchyValues) {
        try {
          const hv = JSON.parse(account14.hierarchyValues);
          console.log(`   HierarchyValues (${hv.length} 层):`);
          hv.forEach((item: any) => {
            if (item.selectedValue) {
              console.log(`     Level ${item.level}: code=${item.selectedValue.code || 'N/A'}, name=${item.selectedValue.name || 'N/A'}`);
            } else {
              console.log(`     Level ${item.level}: null`);
            }
          });
        } catch (e) {
          console.log(`   HierarchyValues解析失败`);
        }
      }
    }

    // 3. 查询2026-05-12时的主账户
    console.log('\n3. 查询2026-05-12时的主账户:');
    const mainAccount = await prisma.laborAccount.findFirst({
      where: {
        employeeId: 5,
        type: 'MAIN',
        effectiveDate: { lte: new Date('2026-05-12') },
        OR: [
          { expiryDate: null },
          { expiryDate: { gte: new Date('2026-05-12') } },
        ],
      },
      orderBy: { effectiveDate: 'desc' },
    });

    if (mainAccount) {
      console.log(`   ID: ${mainAccount.id}`);
      console.log(`   Code: ${mainAccount.code}`);
      console.log(`   Name: ${mainAccount.name}`);
      console.log(`   Path: ${mainAccount.path}`);
      console.log(`   NamePath: ${mainAccount.namePath}`);
      console.log(`   生效日期: ${new Date(mainAccount.effectiveDate).toISOString()}`);
    } else {
      console.log('   未找到主账户');
    }

    // 4. 分析问题
    console.log('\n4. 问题分析:');
    console.log(`   CalcResult.accountName显示: ${calcResult.accountName}`);
    console.log(`   期望的accountName应该是: 账户的namePath字段`);
    console.log(`   账户14的namePath: ${account14?.namePath}`);

    // 5. 检查是否是buildNamePath的问题
    if (account14?.hierarchyValues) {
      try {
        const hv = JSON.parse(account14.hierarchyValues);
        console.log('\n5. 模拟buildNamePath逻辑:');
        const result = hv
          .filter((v: any) => v.selectedValue)
          .map((v: any) => {
            if (v.selectedValueLabel) {
              return v.selectedValueLabel;
            }
            if (typeof v.selectedValue === 'object' && v.selectedValue !== null) {
              return v.selectedValue.name || v.selectedValue.value || JSON.stringify(v.selectedValue);
            }
            return String(v.selectedValue);
          })
          .join('/');
        console.log(`   buildNamePath结果: ${result}`);
      } catch (e) {
        console.log('   解析失败');
      }
    }

  } catch (error) {
    console.error('分析失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyze();
