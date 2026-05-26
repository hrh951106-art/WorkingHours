import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function toLocalTime(date: Date | null): string {
  if (!date) return 'null';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function main() {
  console.log('=== 检查 2026-05-09 的摆卡记录（仅摆卡） ===\n');

  const employeeNo = '202604003';
  const targetDate = new Date('2026-05-09T00:00:00.000Z');

  // 1. 查询摆卡记录
  console.log('摆卡记录:');
  const punchPairs = await prisma.punchPair.findMany({
    where: {
      employeeNo,
      pairDate: targetDate,
    },
    include: {
      inPunch: {
        include: {
          device: true,
          account: true,
        },
      },
      outPunch: {
        include: {
          device: true,
          account: true,
        },
      },
      account: true,
    },
    orderBy: { inPunchTime: 'asc' },
  });

  console.log(`找到 ${punchPairs.length} 条摆卡记录\n`);

  punchPairs.forEach((pair, idx) => {
    const inTime = toLocalTime(pair.inPunchTime);
    const outTime = toLocalTime(pair.outPunchTime);
    const inDevice = pair.inPunch?.device?.name || 'null';
    const outDevice = pair.outPunch?.device?.name || 'null';
    const inAccount = pair.inPunch?.account?.namePath || 'null';
    const outAccount = pair.outPunch?.account?.namePath || 'null';
    const pairAccount = pair.account?.namePath || 'null';

    console.log(`摆卡 ${idx + 1} (ID: ${pair.id}):`);
    console.log(`  进卡: ${inTime} (设备: ${inDevice}, 账户: ${inAccount})`);
    console.log(`  出卡: ${outTime} (设备: ${outDevice}, 账户: ${outAccount})`);
    console.log(`  工时: ${pair.workHours}h`);
    console.log(`  摆卡账户: ${pairAccount}`);
    console.log('');
  });

  // 2. 检查是否有时间交叉
  console.log('时间交叉检查:');
  let hasOverlap = false;
  for (let i = 0; i < punchPairs.length - 1; i++) {
    const current = punchPairs[i];
    const next = punchPairs[i + 1];

    if (current.outPunchTime && next.inPunchTime) {
      const overlap = current.outPunchTime > next.inPunchTime;
      const gap = current.outPunchTime < next.inPunchTime;
      const continuous = current.outPunchTime.getTime() === next.inPunchTime.getTime();

      console.log(`摆卡${i + 1} (${toLocalTime(current.inPunchTime)}~${toLocalTime(current.outPunchTime)}) ` +
                 `与 摆卡${i + 2} (${toLocalTime(next.inPunchTime)}~${toLocalTime(next.outPunchTime)}):`);

      if (overlap) {
        console.log(`  ❌ 时间交叉: ${toLocalTime(current.outPunchTime)} > ${toLocalTime(next.inPunchTime)}`);
        hasOverlap = true;
      } else if (continuous) {
        console.log(`  ✓ 时间连续: ${toLocalTime(current.outPunchTime)} = ${toLocalTime(next.inPunchTime)}`);
      } else if (gap) {
        const gapMinutes = (next.inPunchTime.getTime() - current.outPunchTime.getTime()) / (1000 * 60);
        console.log(`  ⚠️  时间间隔: ${gapMinutes.toFixed(0)} 分钟`);
      } else {
        console.log(`  ✓ 正常`);
      }
    }
  }

  if (!hasOverlap && punchPairs.length <= 1) {
    console.log('\n✓ 没有发现时间交叉');
  }

  // 3. 对比打卡记录
  console.log('\n对比打卡记录:');
  const punchRecords = await prisma.punchRecord.findMany({
    where: {
      employeeNo,
      punchTime: {
        gte: targetDate,
        lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { punchTime: 'asc' },
  });

  console.log('打卡记录时间顺序:');
  punchRecords.forEach((punch, idx) => {
    console.log(`  ${idx + 1}. ${toLocalTime(punch.punchTime)} ${punch.punchType} ` +
               `(账户: ${punch.account?.namePath || 'null'})`);
  });

  // 4. 分析摆卡逻辑是否正确
  console.log('\n摆卡配对分析:');
  console.log('期望配对:');
  console.log('  第一对: 08:00:00 IN + 12:00:00 OUT');
  console.log('  第二对: 13:00:00 IN + 18:00:00 OUT');
  console.log('  孤立: 22:00:00 OUT (应该是孤立的OUT卡)');

  // 检查配对是否正确
  let correctPairing = true;
  if (punchPairs.length === 2) {
    const pair1 = punchPairs[0];
    const pair2 = punchPairs[1];

    const pair1Match = pair1.inPunchTime?.getHours() === 8 &&
                     pair1.outPunchTime?.getHours() === 12;
    const pair2Match = pair2.inPunchTime?.getHours() === 13 &&
                     pair2.outPunchTime?.getHours() === 18;

    if (pair1Match && pair2Match) {
      console.log('\n✓ 摆卡配对正确！');
    } else {
      console.log('\n❌ 摆卡配对不正确:');
      console.log(`  第一对: ${toLocalTime(pair1.inPunchTime)} ~ ${toLocalTime(pair1.outPunchTime)}`);
      console.log(`  第二对: ${toLocalTime(pair2.inPunchTime)} ~ ${toLocalTime(pair2.outPunchTime)}`);
    }
  }

  // 5. 检查前端可能展示的问题
  console.log('\n前端展示可能的问题:');
  console.log('如果前端显示交叉重复，可能原因：');
  console.log('1. 前端将多个摆卡的展示时间合并了');
  console.log('2. 前端没有正确处理12:00~13:00的间隔');
  console.log('3. 前端将 pairDate 错误地用于展示（应该用 inPunchTime 和 outPunchTime）');
}

main()
  .then(() => console.log('\n检查完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
