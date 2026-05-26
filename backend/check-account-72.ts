import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const accountId = 72;

  console.log('=== 查询账户ID 72的详细信息 ===\n');

  const account = await prisma.laborAccount.findUnique({
    where: { id: accountId }
  });

  if (!account) {
    console.log(`账户ID ${accountId} 不存在`);
    await prisma.$disconnect();
    return;
  }

  console.log(`账户ID: ${account.id}`);
  console.log(`账户编码: ${account.code}`);
  console.log(`账户名称: ${account.name}`);
  console.log(`账户类型: ${account.type}`);
  console.log(`账户级别: ${account.level}`);
  console.log(`账户路径(path): ${account.path}`);
  console.log(`namePath: ${account.namePath || '(空)'}`);
  console.log(`员工ID: ${account.employeeId || '未关联员工'}`);
  console.log(`父账户ID: ${account.parentId || '无'}`);
  console.log(`用途类型: ${account.usageType || 'SHIFT'}`);
  console.log(`状态: ${account.status}`);
  console.log(`生效日期: ${account.effectiveDate.toLocaleDateString('zh-CN')}`);
  console.log(`失效日期: ${account.expiryDate ? account.expiryDate.toLocaleDateString('zh-CN') : '永久'}`);

  if (account.hierarchyValues) {
    console.log(`\n========================================`);
    console.log(`hierarchyValues 字段存在！`);
    console.log(`========================================\n`);
    console.log(`原始数据:`);
    console.log(account.hierarchyValues);

    try {
      const hierarchy = JSON.parse(account.hierarchyValues);

      console.log(`\n========================================`);
      console.log(`解析后的层级信息（共${hierarchy.length}层）`);
      console.log(`========================================\n`);

      let hasCompleteCode = true;
      const codePath: string[] = [];
      const namePath: string[] = [];

      hierarchy.forEach((level: any, index: number) => {
        console.log(`Level ${level.level} - ${level.name}:`);
        console.log(`  levelId: ${level.levelId}`);
        console.log(`  mappingType: ${level.mappingType}`);
        console.log(`  mappingValue: ${level.mappingValue || '(无)'}`);

        if (level.selectedValue) {
          console.log(`  selectedValue:`);
          console.log(`    id: ${level.selectedValue.id}`);
          console.log(`    name: ${level.selectedValue.name}`);
          console.log(`    code: ${level.selectedValue.code || '❌ 无'}`);
          console.log(`    type: ${level.selectedValue.type || '(无)'}`);

          if (level.selectedValue.code) {
            codePath.push(`L${level.level}:${level.selectedValue.code}`);
            namePath.push(level.selectedValue.name);
          } else {
            hasCompleteCode = false;
            console.log(`  ⚠️  此层级缺少Code`);
          }
        } else {
          hasCompleteCode = false;
          console.log(`  selectedValue: ❌ 无`);
          console.log(`  ⚠️  此层级未选择任何值`);
        }

        console.log('');
      });

      console.log(`========================================`);
      console.log(`Code路径汇总`);
      console.log(`========================================\n`);

      if (codePath.length > 0) {
        console.log(`完整Code路径: ${codePath.join(' → ')}`);
        console.log(`名称路径: ${namePath.join(' → ')}`);
        console.log(`\nCode层级数: ${codePath.length}/${hierarchy.length}`);

        if (hasCompleteCode) {
          console.log(`✓ 该账户有完整的Code路径！`);
        } else {
          console.log(`⚠️  该账户的Code路径不完整`);
        }
      } else {
        console.log(`❌ 该账户没有任何Code信息`);
      }

      // 检查是否所有层级都有selectedValue
      const allLevelsSelected = hierarchy.every((h: any) => h.selectedValue !== null);
      console.log(`\n层级选择完整性: ${allLevelsSelected ? '✓ 所有层级都已选择' : '⚠️ 部分层级未选择'}`);

    } catch (e) {
      console.log(`\n❌ hierarchyValues解析失败:`, e);
    }
  } else {
    console.log(`\nhierarchyValues字段: ❌ (空)`);
  }

  // 查询父账户链路
  console.log(`\n========================================`);
  console.log(`账户层级链路（向上追溯）`);
  console.log(`========================================\n`);

  let currentAccount = account;
  const chain: any[] = [];

  while (currentAccount) {
    chain.push({
      id: currentAccount.id,
      code: currentAccount.code,
      name: currentAccount.name,
      level: currentAccount.level,
      path: currentAccount.path,
      hasHierarchyValues: !!currentAccount.hierarchyValues
    });

    if (currentAccount.parentId) {
      currentAccount = await prisma.laborAccount.findUnique({
        where: { id: currentAccount.parentId }
      });
    } else {
      currentAccount = null;
    }
  }

  console.log('从当前账户到根账户（从底到顶）：\n');
  chain.forEach((acc, index) => {
    console.log(`${index + 1}. Level ${acc.level}: ${acc.code}`);
    console.log(`   名称: ${acc.name}`);
    console.log(`   path: ${acc.path}`);
    console.log(`   有hierarchyValues: ${acc.hasHierarchyValues ? '✓' : '❌'}`);
    console.log('');
  });

  await prisma.$disconnect();
}

main().catch(console.error);
