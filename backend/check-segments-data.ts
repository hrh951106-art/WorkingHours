import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查询前5个班次
  const shifts = await prisma.shift.findMany({
    take: 5,
    include: {
      segments: {
        include: {
          account: true,
        },
      },
    },
  });

  console.log('班次数量:', shifts.length);

  for (const shift of shifts) {
    console.log(`\n班次: ${shift.name} (ID: ${shift.id})`);
    console.log('Segments数量:', shift.segments.length);

    for (const segment of shift.segments) {
      console.log(`  Segment: ${segment.type}, 时间: ${segment.startTime}-${segment.endTime}, accountId: ${segment.accountId}`);
      if (segment.account) {
        console.log(`    账户: ${segment.account.name}`);
      }
    }
  }

  // 查询排班数据
  const schedules = await prisma.schedule.findMany({
    take: 3,
    include: {
      shift: {
        include: {
          segments: {
            include: {
              account: true,
            },
          },
        },
      },
    },
  });

  console.log('\n\n排班数量:', schedules.length);
  for (const schedule of schedules) {
    console.log(`\n排班日期: ${schedule.scheduleDate.toISOString()}, 班次: ${schedule.shift.name}`);
    console.log('Shift Segments数量:', schedule.shift.segments.length);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
