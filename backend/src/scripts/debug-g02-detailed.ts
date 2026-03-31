import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugG02Detailed() {
  console.log('========================================');
  console.log('G02分摊失败详细排查');
  console.log('========================================\n');

  // 1. 获取G02配置
  const g02Config = await prisma.allocationConfig.findFirst({
    where: {
      configCode: 'G02',
      deletedAt: null,
    },
    include: {
      rules: {
        where: {
          deletedAt: null,
        },
      },
    },
  });

  if (!g02Config) {
    console.log('❌ 未找到G02配置');
    await prisma.$disconnect();
    return;
  }

  const rule = g02Config.rules[0];
  console.log('G02配置:');
  console.log(`  规则ID: ${rule.id}`);
  console.log(`  分摊依据: ${rule.allocationBasis}`);
  console.log(`  分摊范围ID: ${rule.allocationScopeId}`);
  console.log(`  分配归属层级: ${rule.allocationHierarchyLevels || '[]'}`);
  console.log();

  // 2. 解析分配归属层级
  const allocationHierarchyLevels = JSON.parse(rule.allocationHierarchyLevels || '[]');
  console.log('分配归属层级配置:');
  console.log(JSON.stringify(allocationHierarchyLevels, null, 2));
  console.log();

  // 3. 获取2026-03-11的产线数据
  const targetDate = new Date('2026-03-11');
  console.log(`检查日期: ${targetDate.toISOString().split('T')[0]}\n`);

  // 获取当天的开线记录
  const lineShifts = await prisma.lineShift.findMany({
    where: {
      scheduleDate: targetDate,
      deletedAt: null,
      participateInAllocation: true,
    },
  });

  console.log(`开线记录数: ${lineShifts.length}\n`);

  // 4. 检查每个组织的情况
  console.log('4. 组织详细检查:');
  console.log('----------------------------------------');

  for (const ls of lineShifts) {
    console.log(`\n组织: ${ls.orgName} (ID: ${ls.orgId})`);
    console.log(`  开线记录ID: ${ls.id}`);
    console.log(`  班次: ${ls.shiftName} (ID: ${ls.shiftId})`);

    // 查找该组织的所有产线
    const lines = await prisma.productionLine.findMany({
      where: {
        orgId: ls.orgId,
        deletedAt: null,
      },
    });

    console.log(`  该组织的产线数: ${lines.length}`);

    for (const line of lines) {
      console.log(`    - ${line.name} (${line.code})`);
    }

    // 检查产线是否在分配归属层级中
    let isInHierarchy = true;
    if (allocationHierarchyLevels.length > 0 && lines.length > 0) {
      isInHierarchy = lines.some(line => checkLineInHierarchyLevels(line, allocationHierarchyLevels));
      console.log(`  在分配归属层级中: ${isInHierarchy ? '✓ 是' : '✗ 否'}`);
    } else {
      console.log(`  在分配归属层级中: ✓ 配置为空，所有产线都参与`);
    }

    // 检查间接设备账户
    // 修复：使用第一个产线的名称
    if (lines.length > 0) {
      const accountName = `富阳工厂/W1总装车间/${lines[0].name}////间接设备`;
      console.log(`  查找间接设备账户: ${accountName}`);

      const indirectAccount = await prisma.laborAccount.findFirst({
        where: {
          name: accountName,
          status: 'ACTIVE',
        },
      });

      if (indirectAccount) {
        console.log(`  ✓ 找到间接设备账户 (ID: ${indirectAccount.id})`);
      } else {
        console.log(`  ✗ 未找到间接设备账户`);

        // 尝试查找相似账户
        const similarAccounts = await prisma.laborAccount.findMany({
          where: {
            name: {
              contains: '间接设备',
            },
            status: 'ACTIVE',
          },
          take: 10,
        });

        if (similarAccounts.length > 0) {
          console.log(`  相似的间接设备账户:`);
          for (const acc of similarAccounts) {
            console.log(`    - ${acc.name}`);
          }
        }
      }
    }
  }

  console.log('\n\n========================================');
  console.log('问题诊断');
  console.log('========================================\n');

  // 总结问题
  const problems: string[] = [];

  // 检查分配归属层级
  if (allocationHierarchyLevels.length > 0) {
    let hasMatchingLine = false;
    for (const ls of lineShifts) {
      const lines = await prisma.productionLine.findMany({
        where: {
          orgId: ls.orgId,
          deletedAt: null,
        },
      });
      if (lines.some(line => checkLineInHierarchyLevels(line, allocationHierarchyLevels))) {
        hasMatchingLine = true;
        break;
      }
    }

    if (!hasMatchingLine) {
      problems.push('分配归属层级配置导致没有产线符合条件');
    }
  }

  // 检查间接设备账户
  let allAccountsFound = true;
  for (const ls of lineShifts) {
    const lines = await prisma.productionLine.findMany({
      where: {
        orgId: ls.orgId,
        deletedAt: null,
      },
    });
    if (lines.length > 0) {
      const line = lines[0];
      const accountName = `富阳工厂/W1总装车间/${line.name}////间接设备`;
      const indirectAccount = await prisma.laborAccount.findFirst({
        where: {
          name: accountName,
          status: 'ACTIVE',
        },
      });

      if (!indirectAccount) {
        allAccountsFound = false;
        console.log(`✗ 产线 ${line.name} 缺少间接设备账户: ${accountName}`);
      }
    }
  }

  if (!allAccountsFound) {
    problems.push('部分产线缺少对应的间接设备账户');
  }

  if (problems.length === 0) {
    console.log('✓ 未发现明显配置问题');
    console.log('\n可能的原因:');
    console.log('1. 执行分摊时选择的日期不正确');
    console.log('2. 分摊逻辑代码中存在其他过滤条件');
    console.log('3. 产量数据格式问题');
  } else {
    console.log('发现以下问题:\n');
    problems.forEach((problem, index) => {
      console.log(`${index + 1}. ${problem}`);
    });
  }

  console.log('\n========================================');
}

// 检查产线是否在分配归属层级中
function checkLineInHierarchyLevels(
  line: any,
  allocationHierarchyLevels: any[]
): boolean {
  // 如果没有配置层级限制，则所有产线都参与
  if (!allocationHierarchyLevels || allocationHierarchyLevels.length === 0) {
    return true;
  }

  // 检查产线是否匹配任一层级配置
  for (const levelConfig of allocationHierarchyLevels) {
    let matches = true;

    // 检查每个层级值
    for (const key in levelConfig) {
      const lineValue = (line as any)[key];
      const configValue = levelConfig[key];

      if (lineValue !== configValue) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return true;
    }
  }

  return false;
}

debugG02Detailed()
  .catch((e) => {
    console.error('排查失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
