import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查 hierarchyValues 字段类型 ===\n');

  // 查询摆卡数据中的账户
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo: '202605002',
      pairDate: {
        gte: new Date('2026-05-09T00:00:00.000Z'),
        lt: new Date('2026-05-11T00:00:00.000Z'),
      },
    },
    include: {
      account: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log('摆卡账户的 hierarchyValues 类型:');
  punchPairs.forEach(p => {
    if (p.account) {
      console.log('\n摆卡ID: ' + p.id + ', 账户ID: ' + p.account.id);
      console.log('hierarchyValues 类型: ' + typeof p.account.hierarchyValues);
      console.log('hierarchyValues 值: ' + p.account.hierarchyValues);
      
      // 尝试解析
      try {
        const parsed = JSON.parse(p.account.hierarchyValues);
        console.log('解析成功，类型: ' + typeof parsed + ', 是否数组: ' + Array.isArray(parsed));
      } catch (e: any) {
        console.log('解析失败: ' + e.message);
      }
    }
  });

  // 查询班段账户
  const shiftSegments = await prisma.shiftSegment.findMany({
    where: {
      shiftId: 8,
    },
    include: {
      account: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log('\n\n班段账户的 hierarchyValues 类型:');
  shiftSegments.forEach(ss => {
    if (ss.account) {
      console.log('\n班段ID: ' + ss.id + ', 账户ID: ' + ss.account.id);
      console.log('hierarchyValues 类型: ' + typeof ss.account.hierarchyValues);
      console.log('hierarchyValues 值: ' + ss.account.hierarchyValues);
    }
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
