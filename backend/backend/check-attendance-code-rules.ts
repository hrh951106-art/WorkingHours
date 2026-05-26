import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查出勤代码配置 ===\n');

  // 查询线体工时和工序工时的配置
  const codes = await prisma.calculationAttendanceCode.findMany({
    where: {
      name: {
        in: ['线体工时', '工序工时'],
      },
    },
    orderBy: { id: 'asc' },
  });

  console.log('出勤代码配置:');
  codes.forEach(code => {
    console.log('\n' + code.name + ' (ID: ' + code.id + '):');
    console.log('  - 匹配规则: ' + code.accountMatchRule);
    console.log('  - 账户匹配: ' + JSON.stringify(code.accountMatch, null, 2));
  });

  // 查询 Paul 的排班信息（2026-05-09 和 2026-05-10）
  console.log('\n\n=== 检查 Paul 的排班信息 ===\n');

  const schedules = await prisma.employeeSchedule.findMany({
    where: {
      employeeNo: '202605002',
      scheduleDate: {
        in: [
          new Date('2026-05-09T00:00:00.000Z'),
          new Date('2026-05-10T00:00:00.000Z'),
        ],
      },
    },
    include: {
      shift: true,
      segments: {
        include: {
          account: true,
        },
        orderBy: { startDate: 'asc' },
      },
    },
    orderBy: { scheduleDate: 'asc' },
  });

  schedules.forEach(schedule => {
    const dateStr = schedule.scheduleDate.toISOString().split('T')[0];
    console.log('\n' + dateStr + ' (班次: ' + schedule.shift?.name + '):');
    if (schedule.segments && schedule.segments.length > 0) {
      console.log('  班段配置:');
      schedule.segments.forEach(seg => {
        const accountName = seg.account ? seg.account.namePath : '无';
        console.log('    - ' + seg.startDate + '-' + seg.endDate + ': ' + accountName);
      });
    } else {
      console.log('  无班段配置');
    }
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
