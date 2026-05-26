import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function toLocalTime(date: Date | null): string {
  if (!date) return 'null';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

async function main() {
  console.log('=== 检查 2026-05-09 考勤摆卡详细信息 ===\n');

  // 查询所有考勤摆卡记录
  const attendancePairs = await prisma.attendancePunchPair.findMany({
    where: {
      punchDate: new Date('2026-05-09T00:00:00.000Z'),
    },
    orderBy: { id: 'asc' },
  });

  console.log(`找到 ${attendancePairs.length} 条记录\n`);

  attendancePairs.forEach((pair, idx) => {
    const startTime = toLocalTime(pair.workStartPunchTime);
    const endTime = toLocalTime(pair.workEndPunchTime);
    console.log(`记录${idx + 1} (ID: ${pair.id}):`);
    console.log(`  上班卡时间: ${startTime} (ID: ${pair.workStartPunchId})`);
    console.log(`  下班卡时间: ${endTime} (ID: ${pair.workEndPunchId})`);

    if (pair.workStartPunches) {
      try {
        const startPunches = JSON.parse(pair.workStartPunches);
        console.log(`  上班卡详情 (${startPunches.length}笔):`);
        startPunches.forEach((p: any) => {
          const time = toLocalTime(new Date(p.punchTime));
          console.log(`    - ${time} (ID: ${p.id}, 班次: ${p.shiftName || 'null'})`);
        });
      } catch (e) {
        console.log(`  上班卡详情解析失败: ${e}`);
      }
    }

    if (pair.workEndPunches) {
      try {
        const endPunches = JSON.parse(pair.workEndPunches);
        console.log(`  下班卡详情 (${endPunches.length}笔):`);
        endPunches.forEach((p: any) => {
          const time = toLocalTime(new Date(p.punchTime));
          console.log(`    - ${time} (ID: ${p.id}, 班次: ${p.shiftName || 'null'})`);
        });
      } catch (e) {
        console.log(`  下班卡��情解析失败: ${e}`);
      }
    }

    console.log('');
  });

  // 查询所有打卡记录
  console.log('\n所有打卡记录:');
  const punchRecords = await prisma.punchRecord.findMany({
    where: {
      punchTime: {
        gte: new Date('2026-05-09T00:00:00.000Z'),
        lt: new Date('2026-05-10T00:00:00.000Z'),
      },
    },
    orderBy: { punchTime: 'asc' },
  });

  punchRecords.forEach((punch) => {
    const time = toLocalTime(punch.punchTime);
    console.log(`  ${time} ${punch.punchType} (ID: ${punch.id})`);
  });
}

main()
  .then(() => console.log('\n完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
