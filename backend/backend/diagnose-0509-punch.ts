import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 诊断 2026-05-09 摆卡数据 ===\n');

  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo: '202605002',
      pairDate: {
        gte: new Date('2026-05-09T00:00:00.000Z'),
        lt: new Date('2026-05-10T00:00:00.000Z'),
      },
    },
    include: {
      account: true,
      inPunch: true,
      outPunch: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log('摆卡数据:');
  punchPairs.forEach(p => {
    console.log('\n摆卡ID: ' + p.id);
    console.log('班次: ' + p.shiftName);
    console.log('签入: ' + (p.inPunch ? p.inPunch.punchTime : '无'));
    console.log('签出: ' + (p.outPunch ? p.outPunch.punchTime : '无'));
    console.log('账户ID: ' + p.accountId);
    console.log('账户名: ' + p.accountName);
    
    if (p.account) {
      console.log('账户 namePath: ' + p.account.namePath);
      const hierarchyValues = JSON.parse(p.account.hierarchyValues || '[]');
      console.log('层级配置 (' + hierarchyValues.length + ' 层):');
      hierarchyValues.forEach((hv: any) => {
        const val = hv.selectedValue ? hv.selectedValue.name : '无值';
        console.log('  Level ' + hv.level + ' (' + hv.name + '): ' + val);
      });
    }
  });

  // 检查是否有班次和班段配置
  console.log('\n\n=== 检查班次配置 ===\n');
  
  if (punchPairs.length > 0) {
    const shiftId = punchPairs[0].shiftId;
    console.log('班次ID: ' + shiftId);
    
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
    });
    console.log('班次名: ' + shift?.name);
    
    const segments = await prisma.shiftSegment.findMany({
      where: { shiftId },
      include: { account: true },
      orderBy: { id: 'asc' },
    });
    
    console.log('\n班段配置:');
    segments.forEach(seg => {
      console.log('  时间: ' + seg.startDate + ' ' + seg.startTime + ' - ' + seg.endDate + ' ' + seg.endTime);
      if (seg.account) {
        console.log('  账户: ' + seg.account.namePath);
      }
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
