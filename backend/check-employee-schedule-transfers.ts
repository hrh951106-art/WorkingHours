import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查找员工 202604003
  const employee = await prisma.employee.findUnique({
    where: { employeeNo: '202604003' },
  });

  if (!employee) {
    console.log('员工不存在');
    return;
  }

  console.log('员工:', employee.employeeNo, employee.name, 'ID:', employee.id);

  // 查询5月12日的排班
  const targetDate = new Date('2026-05-12T00:00:00.000Z');
  const nextDate = new Date('2026-05-13T00:00:00.000Z');

  const schedules = await prisma.schedule.findMany({
    where: {
      employeeId: employee.id,
      scheduleDate: {
        gte: targetDate,
        lt: nextDate,
      },
    },
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
      transfers: {
        include: {
          account: true,
        },
      },
    },
  });

  console.log('\n排班数量:', schedules.length);

  for (const schedule of schedules) {
    console.log('\n========================================');
    console.log('排班ID:', schedule.id);
    console.log('排班日期:', schedule.scheduleDate);
    console.log('班次:', schedule.shift.name);
    console.log('状态:', schedule.status);

    // 检查adjustedSegments
    if (schedule.adjustedSegments) {
      console.log('\n有覆盖班段信息 adjustedSegments:');
      try {
        const adjusted = JSON.parse(schedule.adjustedSegments);
        console.log(JSON.stringify(adjusted, null, 2));
      } catch (e) {
        console.log('解析失败:', e);
      }
    }

    // 检查shift的segments
    console.log('\n班次默认segments:');
    for (const segment of schedule.shift.segments) {
      console.log(`  - ${segment.type}: ${segment.startTime}-${segment.endTime}, accountId: ${segment.accountId}`);
      if (segment.account) {
        console.log(`    账户: ${segment.account.name}`);
      }
    }

    // 检查transfers
    console.log('\n转移记录 (AccountTransfer):');
    if (schedule.transfers.length > 0) {
      for (const transfer of schedule.transfers) {
        console.log(`  - 账户ID: ${transfer.accountId}`);
        console.log(`    账户名称: ${transfer.account.name}`);
        console.log(`    时间: ${transfer.startTime} - ${transfer.endTime}`);
        console.log(`    时长: ${transfer.hours}小时`);
      }
    } else {
      console.log('  无转移记录');
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
