import { PrismaClient } from '@prisma/client';
import { differenceInMinutes } from 'date-fns';

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
  console.log('=== 测试连续性判断逻辑 ===\n');

  const employeeNo = '202604003';
  const targetDate = new Date('2026-05-09T00:00:00.000Z');

  // 1. 查询班次信息
  console.log('1. 查询班次信息:');
  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
  });

  if (!employee) {
    console.log('员工不存在');
    return;
  }

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

  if (schedules.length === 0) {
    console.log('没有排班信息');
    return;
  }

  const schedule = schedules[0];
  console.log(`  班次名称: ${schedule.shift?.name}`);

  if (schedule.shift?.segments) {
    console.log(`  班次段数: ${schedule.shift.segments.length}`);
    console.log('');
    console.log('  详细段信息:');
    schedule.shift.segments.forEach((seg, idx) => {
      const segStart = toLocalTime(new Date(`${targetDate.toISOString().split('T')[0]}T${seg.startTime}`));
      const segEnd = toLocalTime(new Date(`${targetDate.toISOString().split('T')[0]}T${seg.endTime}`));
      console.log(`    段${idx + 1}: ${segStart} ~ ${segEnd}, 类型=${seg.type}`);
    });
  }

  // 2. 模拟 expandMultiSegmentShifts 逻辑
  console.log('\n2. 模拟 expandMultiSegmentShifts 逻辑:');

  const normalSegments = schedule.shift?.segments.filter((seg: any) => seg.type === 'NORMAL') || [];
  console.log(`  NORMAL 段数量: ${normalSegments.length}`);

  if (normalSegments.length > 0) {
    const virtualShifts: any[] = [];

    normalSegments.forEach((seg: any) => {
      const dateStr = schedule.scheduleDate.toISOString().split('T')[0];
      const segStart = new Date(`${dateStr}T${seg.startTime}`);
      const segEnd = new Date(`${dateStr}T${seg.endTime}`);

      virtualShifts.push({
        workStartTime: segStart,
        workEndTime: segEnd,
        segment: seg,
      });

      console.log(`  虚拟班次: ${toLocalTime(segStart)} ~ ${toLocalTime(segEnd)}`);
    });

    // 3. 测试连续性判断
    console.log('\n3. 测试连续性判断:');

    if (virtualShifts.length > 1) {
      console.log(`  虚拟班次数量: ${virtualShifts.length}`);
      console.log('');

      const CONTINUITY_THRESHOLD_MINUTES = 120;
      let isContinuous = true;

      for (let i = 0; i < virtualShifts.length - 1; i++) {
        const currentEnd = virtualShifts[i].workEndTime;
        const nextStart = virtualShifts[i + 1].workStartTime;
        const gap = differenceInMinutes(nextStart, currentEnd);

        const gapStr = gap >= 0 ? `${gap}分钟` : `不合理（${gap}分钟）`;

        console.log(`  虚拟班次${i + 1} vs 虚拟班次${i + 2}:`);
        console.log(`    结束时间: ${toLocalTime(currentEnd)}`);
        console.log(`    开始时间: ${toLocalTime(nextStart)}`);
        console.log(`    间隔: ${gapStr}`);
        console.log(`    阈值: ${CONTINUITY_THRESHOLD_MINUTES}分钟`);

        if (gap > CONTINUITY_THRESHOLD_MINUTES || gap < 0) {
          console.log(`    判定: ❌ 不连续`);
          isContinuous = false;
        } else {
          console.log(`    判定: ✓ 连续`);
        }
        console.log('');
      }

      console.log(`  最终判定: ${isContinuous ? '✓ 连续班次' : '❌ 不连续班次'}`);

      // 4. 预期收卡结果
      console.log('\n4. 预期收卡结果:');
      if (isContinuous) {
        console.log(`  收卡方式: 连续班次收卡（只收首尾两笔）`);
        console.log(`  上班卡: ${toLocalTime(virtualShifts[0].workStartTime)}（第一班次上班）`);
        console.log(`  下班卡: ${toLocalTime(virtualShifts[virtualShifts.length - 1].workEndTime)}（最后班次下班）`);
        const totalMinutes = differenceInMinutes(virtualShifts[virtualShifts.length - 1].workEndTime, virtualShifts[0].workStartTime);
        console.log(`  工时范围: ${totalMinutes / 60}小时`);
      } else {
        console.log(`  收卡方式: 不连续班次收卡（每个班次分别收卡）`);
        virtualShifts.forEach((shift, idx) => {
          const workMinutes = differenceInMinutes(shift.workEndTime, shift.workStartTime);
          console.log(`    班次${idx + 1}: ${toLocalTime(shift.workStartTime)} ~ ${toLocalTime(shift.workEndTime)} (${workMinutes / 60}h)`);
        });
      }
    } else {
      console.log(`  只有1个虚拟班次，无需判断连续性`);
    }
  }

  // 5. 查询打卡记录
  console.log('\n5. 实际打卡记录:');
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

  console.log('\n✓ 逻辑测试完成');
}

main()
  .then(() => console.log(''))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
