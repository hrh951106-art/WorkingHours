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
  console.log('=== 诊断考勤摆卡时间交叉问题 ===\n');

  const employeeNo = '202604003';
  const targetDate = new Date('2026-05-09T00:00:00.000Z');

  // 1. 查询班次信息
  console.log('1. 班次信息:');
  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
  });

  if (employee) {
    const schedules = await prisma.schedule.findMany({
      where: {
        employeeId: employee.id,
        scheduleDate: targetDate,
      },
      include: {
        shift: {
          include: {
            segments: {
              orderBy: { startTime: 'asc' },
            },
          },
        },
      },
    });

    if (schedules.length > 0) {
      const schedule = schedules[0];
      console.log(`  班次: ${schedule.shift?.name}`);
      if (schedule.shift?.segments) {
        schedule.shift.segments.forEach((seg, idx) => {
          const segStart = toLocalTime(new Date(`${targetDate.toISOString().split('T')[0]}T${seg.startTime}`));
          const segEnd = toLocalTime(new Date(`${targetDate.toISOString().split('T')[0]}T${seg.endTime}`));
          console.log(`    段${idx + 1}: ${segStart} ~ ${segEnd}, 类型=${seg.type}`);
        });
      }
    }
  }

  // 2. 查询打卡记录
  console.log('\n2. 打卡记录:');
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

  punchRecords.forEach((punch) => {
    const time = toLocalTime(punch.punchTime);
    console.log(`  ${time} ${punch.punchType} (ID: ${punch.id})`);
  });

  // 3. 查询考勤摆卡结果
  console.log('\n3. 考勤摆卡结果:');
  const attendancePairs = await prisma.attendancePunchPair.findMany({
    where: {
      employeeNo,
      punchDate: new Date('2026-05-09T00:00:00.000Z'),
    },
    orderBy: { workStartPunchTime: 'asc' },
  });

  attendancePairs.forEach((pair, idx) => {
    const startTime = toLocalTime(pair.workStartPunchTime);
    const endTime = toLocalTime(pair.workEndPunchTime);
    console.log(`  记录${idx + 1}: ${startTime} ~ ${endTime} (ID: ${pair.id})`);

    // 解析使用的打卡卡
    if (pair.workStartPunches) {
      try {
        const startPunches = JSON.parse(pair.workStartPunches);
        console.log(`    上班卡使用的打卡记录:`);
        startPunches.forEach((p: any) => {
          const time = toLocalTime(new Date(p.punchTime));
          console.log(`      - ${time} (ID: ${p.id})`);
        });
      } catch (e) {}
    }

    if (pair.workEndPunches) {
      try {
        const endPunches = JSON.parse(pair.workEndPunches);
        console.log(`    下班卡使用的打卡记录:`);
        endPunches.forEach((p: any) => {
          const time = toLocalTime(new Date(p.punchTime));
          console.log(`      - ${time} (ID: ${p.id})`);
        });
      } catch (e) {}
    }
  });

  // 4. 分析重复使用的打卡卡
  console.log('\n4. 检查打卡卡是否被重复使用:');

  const usedPunchIds = new Set<number>();
  const duplicatePunchIds = new Set<number>();

  attendancePairs.forEach((pair) => {
    const allPunches: number[] = [];

    if (pair.workStartPunches) {
      try {
        const startPunches = JSON.parse(pair.workStartPunches);
        startPunches.forEach((p: any) => allPunches.push(p.id));
      } catch (e) {}
    }

    if (pair.workEndPunches) {
      try {
        const endPunches = JSON.parse(pair.workEndPunches);
        endPunches.forEach((p: any) => allPunches.push(p.id));
      } catch (e) {}
    }

    allPunches.forEach((punchId) => {
      if (usedPunchIds.has(punchId)) {
        duplicatePunchIds.add(punchId);
      }
      usedPunchIds.add(punchId);
    });
  });

  if (duplicatePunchIds.size > 0) {
    console.log(`  ❌ 发现 ${duplicatePunchIds.size} 张打卡卡被重复使用:`);
    duplicatePunchIds.forEach((punchId) => {
      const punch = punchRecords.find((p) => p.id === punchId);
      if (punch) {
        const time = toLocalTime(punch.punchTime);
        console.log(`    - 打卡ID ${punchId}: ${time} ${punch.punchType}`);
      }
    });
  } else {
    console.log(`  ✓ 没有发现打卡卡被重复使用`);
  }

  // 5. 结论
  console.log('\n5. 问题分析:');
  console.log('  班次配置:');
  console.log('    段1: 08:00 ~ 12:00 (NORMAL)');
  console.log('    段2: 12:00 ~ 13:30 (REST)');
  console.log('    段3: 13:30 ~ 17:30 (NORMAL)');
  console.log('');
  console.log('  收卡结果:');
  console.log('    记录1: 08:00 ~ 13:00');
  console.log('    记录2: 12:00 ~ 18:00');
  console.log('');
  console.log('  问题: 第二段的上班卡收到了 12:00 的卡，而 12:00 是第一段的下班卡');
  console.log('  原因: 收卡时间范围设置过大，导致跨段收卡');
}

main()
  .then(() => console.log('\n诊断完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
