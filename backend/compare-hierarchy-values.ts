import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 比较账户22和其他账户的hierarchyValues ===\n');

  // 检查账户22（有问题的账户）
  console.log('--- 账户22（问题账户）---');
  const account22 = await prisma.laborAccount.findUnique({
    where: { id: 22 }
  });

  if (account22) {
    console.log(`名称: ${account22.namePath}`);
    console.log(`路径: ${account22.path}`);
    console.log(`层级: ${account22.level}`);
    console.log(`hierarchyValues长度: ${account22.hierarchyValues ? JSON.parse(account22.hierarchyValues).length : 0}`);
    console.log('');
  }

  // 检查几个正常的账户
  const normalAccountIds = [7, 8, 27]; // 同一员工的其他账户

  for (const accountId of normalAccountIds) {
    console.log(`--- 账户${accountId}（正常账户）---`);
    const account = await prisma.laborAccount.findUnique({
      where: { id: accountId }
    });

    if (account) {
      console.log(`名称: ${account.namePath}`);
      console.log(`路径: ${account.path}`);
      console.log(`层级: ${account.level}`);

      const hierarchyValues = account.hierarchyValues ? JSON.parse(account.hierarchyValues) : [];
      console.log(`hierarchyValues长度: ${hierarchyValues.length}`);

      if (hierarchyValues.length > 0) {
        console.log('层级值详情:');
        hierarchyValues.forEach((hv: any) => {
          const value = hv.selectedValue;
          const valueStr = value ? (value.name || value.code || JSON.stringify(value)) : 'null';
          console.log(`  Level ${hv.level} (${hv.name}, ${hv.mappingType}): ${valueStr}`);
        });
      }
      console.log('');
    }
  }

  // 查看层级配置
  // console.log('=== 层级配置 ===\n');
  // const hierarchyLevels = await prisma.hierarchyLevel.findMany({
  //   orderBy: { level: 'asc' }
  // });

  // console.log('系统中的层级配置:');
  // hierarchyLevels.forEach(level => {
  //   console.log(`  Level ${level.level}: ${level.name} (${level.mappingType})`);
  // });
  // console.log('');

  // 分析账户22应该有的hierarchyValues
  console.log('=== 分析账户22应该有的hierarchyValues ===\n');
  console.log('账户22的路径: 大华工厂/W1总装车间/W1总装L2产线//焊接');
  console.log('路径分段:');
  const segments = account22?.path.split('/') || [];
  segments.forEach((seg, index) => {
    console.log(`  [${index}] ${seg || '(空)'}`);
  });
  console.log('');

  // 根据路径推断应该有的层级值
  console.log('根据路径推断应该有的层级值:');
  console.log('  Level 1 (工厂): 大华工厂');
  console.log('  Level 2 (车间): W1总装车间');
  console.log('  Level 3 (产线): W1总装L2产线');
  console.log('  Level 4 (产品): (空)');
  console.log('  Level 5 (工序): 焊接');
  console.log('');

  // 检查账户7或8的hierarchyValues作为参考
  console.log('=== 参考账户7的hierarchyValues结构 ===\n');
  const account7 = await prisma.laborAccount.findUnique({
    where: { id: 7 }
  });

  if (account7 && account7.hierarchyValues) {
    const hierarchyValues = JSON.parse(account7.hierarchyValues);
    console.log(JSON.stringify(hierarchyValues, null, 2));
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
