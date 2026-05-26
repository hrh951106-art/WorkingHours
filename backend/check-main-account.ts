import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMainAccount() {
  const mainAccount = await prisma.laborAccount.findUnique({
    where: { id: 72 },
  });

  console.log('=== Main Account (ID 72) ===');
  console.log('Path:', mainAccount?.path || 'NULL');
  console.log('Level:', mainAccount?.level);
  console.log('Type:', mainAccount?.type);
  console.log('Hierarchy Values:');
  if (mainAccount?.hierarchyValues && mainAccount.hierarchyValues !== '[]') {
    const values = JSON.parse(mainAccount.hierarchyValues);
    values.forEach((v: any, i: number) => {
      const hasValue = v.selectedValue ? 'YES' : 'NO';
      console.log('  Level', (i + 1) + ':', hasValue, (v.selectedValue?.name || '(empty)'));
    });
  } else {
    console.log('  EMPTY - will be parsed from path field');
  }

  await prisma.$disconnect();
}

checkMainAccount().catch(console.error);
