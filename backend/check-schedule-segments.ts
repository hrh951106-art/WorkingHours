import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkScheduleSegments() {
  // 查询几条排班记录
  const schedules = await prisma.schedule.findMany({
    take: 5,
    include: {
      shift: {
        include: {
          segments: true,
        },
      },
    },
    orderBy: {
      scheduleDate: 'desc',
    },
  });

  console.log('=== 员工排班记录 ===');
  schedules.forEach(schedule => {
    console.log(`\n排班ID: ${schedule.id}`);
    console.log(`员工ID: ${schedule.employeeId}`);
    console.log(`排班日期: ${schedule.scheduleDate}`);
    console.log(`班次: ${schedule.shift.name} (${schedule.shift.code})`);
    console.log(`状态: ${schedule.status}`);
    console.log(`调整开始时间: ${schedule.adjustedStart}`);
    console.log(`调整结束时间: ${schedule.adjustedEnd}`);
    
    console.log('\n班次模板的时间段:');
    schedule.shift.segments.forEach(seg => {
      console.log(`  - ${seg.type}: ${seg.startTime} - ${seg.endTime} (${seg.duration}小时)`);
    });
    
    if (schedule.adjustedSegments) {
      console.log('\n调整后的时间段:');
      try {
        const segments = JSON.parse(schedule.adjustedSegments);
        console.log(JSON.stringify(segments, null, 2));
      } catch (e) {
        console.log('  (解析失败)');
        console.log('  原始值:', schedule.adjustedSegments);
      }
    } else {
      console.log('\n调整后的时间段: (无)');
    }
  });
}

checkScheduleSegments()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
