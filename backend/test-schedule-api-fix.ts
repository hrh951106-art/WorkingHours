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

  console.log('测试员工:', employee.employeeNo, employee.name, 'ID:', employee.id);

  const targetDate = new Date('2026-05-12T00:00:00.000Z');
  const nextDate = new Date('2026-05-13T00:00:00.000Z');

  // 查询排班（模拟API逻辑）
  const schedules = await prisma.schedule.findMany({
    where: {
      employeeId: employee.id,
      scheduleDate: {
        gte: targetDate,
        lt: nextDate,
      },
    },
    include: {
      employee: {
        include: {
          org: true,
        },
      },
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
    orderBy: { scheduleDate: 'asc' },
  });

  console.log('\n查询到排班数量:', schedules.length);

  // 合并班段覆盖信息（新逻辑）
  const schedulesWithOverrides = await Promise.all(schedules.map(async (schedule: any) => {
    let segments = schedule.shift.segments || [];

    // 如果有班段覆盖信息，则合并
    if (schedule.adjustedSegments) {
      try {
        const overrides = JSON.parse(schedule.adjustedSegments);
        segments = segments.map((seg: any) => {
          const override = overrides.find((o: any) => o.id === seg.id);
          return override ? { ...seg, ...override } : seg;
        });
      } catch (e) {
        console.error('Failed to parse adjustedSegments:', e);
      }
    }

    // 收集所有需要查询account的segments
    const segmentsWithAccountIds = segments.filter((seg: any) => seg.accountId);
    if (segmentsWithAccountIds.length > 0) {
      const accountIds = segmentsWithAccountIds.map((seg: any) => seg.accountId);
      const accounts = await prisma.laborAccount.findMany({
        where: { id: { in: accountIds } },
      });

      console.log('查询到账户数量:', accounts.length);
      accounts.forEach(acc => console.log(`  - ID: ${acc.id}, 名称: ${acc.name}`));

      // 为每个segment添加account对象
      segments = segments.map((seg: any) => {
        if (seg.accountId) {
          const account = accounts.find((acc: any) => acc.id === seg.accountId);
          return { ...seg, account: account || null };
        }
        return seg;
      });
    }

    return {
      ...schedule,
      segments,
    };
  }));

  // 输出最终结果
  for (const schedule of schedulesWithOverrides) {
    console.log('\n========================================');
    console.log('排班日期:', schedule.scheduleDate.toISOString().split('T')[0]);
    console.log('班次:', schedule.shift.name);

    console.log('\n合并后的Segments:');
    for (const segment of schedule.segments) {
      console.log(`  Segment ID: ${segment.id}`);
      console.log(`  类型: ${segment.type}`);
      console.log(`  时间: ${segment.startTime}-${segment.endTime}`);
      console.log(`  AccountId: ${segment.accountId || 'null'}`);
      if (segment.account) {
        console.log(`  账户名称: ${segment.account.name}`);
        console.log(`  账户路径: ${segment.account.namePath || '无'}`);
      }
      console.log('');
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
