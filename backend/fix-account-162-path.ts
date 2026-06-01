import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAccount162Path() {
  // 获取账户162
  const account = await prisma.laborAccount.findFirst({
    where: { id: 162 },
    select: { id: true, hierarchyValues: true },
  });

  if (!account || !account.hierarchyValues) {
    console.log('账户不存在或无hierarchyValues');
    await prisma.$disconnect();
    return;
  }

  const hv = JSON.parse(account.hierarchyValues);

  // 构建正确的path和namePath
  const pathParts: string[] = [];
  const namePathParts: string[] = [];

  hv.forEach((level: any) => {
    if (level.selectedValue) {
      // 使用code作为path
      pathParts.push(level.selectedValue.code || '-');
      // 使用name或selectedValueLabel作为namePath
      namePathParts.push(level.selectedValueLabel || level.selectedValue.name || '-');
    } else {
      pathParts.push('-');
      namePathParts.push('-');
    }
  });

  const newPath = pathParts.join('/');
  const newNamePath = namePathParts.join('/');

  console.log('更新前:');
  console.log('  path: SZ/SU01/SZ0101/-/-/-/-');
  console.log('  namePath: 苏州工厂/生产1车间/焊接班组/-/-/-/-');

  console.log('\n更新后:');
  console.log(`  path: ${newPath}`);
  console.log(`  namePath: ${newNamePath}`);

  // 更新账户
  await prisma.laborAccount.update({
    where: { id: 162 },
    data: {
      path: newPath,
      namePath: newNamePath,
      status: 'ACTIVE',  // 同时激��账户
    },
  });

  console.log('\n✅ 账户162已更新并激活');

  await prisma.$disconnect();
}

fixAccount162Path().catch(console.error);
