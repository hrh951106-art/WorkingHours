import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 修复账户145的层级配置 ===\n');

  // 1. 获取W1总装车间和L2线体的信息
  const w1Workshop = await prisma.organization.findFirst({
    where: {
      name: 'W1总装车间',
      type: 'DEPARTMENT',
    },
  });

  const l2Line = await prisma.organization.findFirst({
    where: {
      name: { contains: 'L2' },
      type: 'TEAM',
    },
  });

  if (!w1Workshop) {
    console.error('错误: 未找到W1总装车间');
    return;
  }

  console.log('找到组织信息:');
  console.log(`  W1总装车间: ID=${w1Workshop.id}, 名称=${w1Workshop.name}, 编码=${w1Workshop.code}`);
  if (l2Line) {
    console.log(`  L2线体: ID=${l2Line.id}, 名称=${l2Line.name}, 编码=${l2Line.code}`);
  }

  // 2. 获取账户145的当前配置
  const account145 = await prisma.laborAccount.findUnique({
    where: { id: 145 },
  });

  if (!account145) {
    console.error('错误: 未找到账户145');
    return;
  }

  console.log('\n账户145当前配置:');
  console.log(`  名称: ${account145.name}`);
  console.log(`  名称路径: ${account145.namePath}`);

  // 3. 解析并更新层级值
  const hierarchyValues = JSON.parse(account145.hierarchyValues || '[]');

  console.log('\n更新层级值:');
  hierarchyValues.forEach((hv: any) => {
    if (hv.level === 2 && hv.name === '车间') {
      hv.selectedValue = {
        id: w1Workshop.id,
        name: w1Workshop.name,
        code: w1Workshop.code,
        type: w1Workshop.type,
      };
      console.log(`  ✓ Level 2 - 车间: 设置为 ${w1Workshop.name}`);
    }
    if (hv.level === 3 && hv.name === '线体' && l2Line) {
      hv.selectedValue = {
        id: l2Line.id,
        name: l2Line.name,
        code: l2Line.code,
        type: l2Line.type,
      };
      console.log(`  ✓ Level 3 - 线体: 设置为 ${l2Line.name}`);
    }
  });

  // 4. 更新账户
  const newHierarchyValues = JSON.stringify(hierarchyValues);
  const newName = `富阳工厂/${w1Workshop.name}${l2Line ? '/' + l2Line.name : ''}/间接设备`;
  const newNamePath = `富阳工厂/${w1Workshop.name}${l2Line ? '/' + l2Line.name : ''}/////间接设备`;

  console.log('\n更新账户信息:');
  console.log(`  新名称: ${newName}`);
  console.log(`  新名称路径: ${newNamePath}`);

  await prisma.laborAccount.update({
    where: { id: 145 },
    data: {
      name: newName,
      namePath: newNamePath,
      hierarchyValues: newHierarchyValues,
    },
  });

  console.log('\n✓ 账户145更新成功！');

  // 5. 验证更新结果
  const updatedAccount = await prisma.laborAccount.findUnique({
    where: { id: 145 },
  });

  console.log('\n验证更新结果:');
  console.log(`  名称: ${updatedAccount?.name}`);

  const updatedHierarchyValues = JSON.parse(updatedAccount?.hierarchyValues || '[]');
  const workshop = updatedHierarchyValues.find((hv: any) => hv.level === 2);
  const line = updatedHierarchyValues.find((hv: any) => hv.level === 3);

  console.log(`  车间: ${workshop?.selectedValue?.name || '未配置'}`);
  console.log(`  线体: ${line?.selectedValue?.name || '未配置'}`);
}

main()
  .catch((e) => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
