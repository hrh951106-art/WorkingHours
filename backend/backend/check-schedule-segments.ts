import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查 Paul 的排班和班段信息 ===\n');

  // 查询 2026-05-10 的班次配置
  const shiftSegments = await prisma.shiftSegment.findMany({
    where: {
      shift: {
        scheduleShifts: {
          some: {
            schedule: {
              employee: {
                employeeNo: '202605002',
              },
              scheduleDate: {
                gte: new Date('2026-05-10T00:00:00.000Z'),
                lt: new Date('2026-05-11T00:00:00.000Z'),
              },
            },
          },
        },
      },
    },
    include: {
      shift: true,
      account: true,
    },
    orderBy: ['shiftId', { segmentIndex: 'asc' }],
  });

  if (shiftSegments.length > 0) {
    console.log('班段配置:');
    shiftSegments.forEach(seg => {
      console.log('\n班次: ' + seg.shift.name);
      console.log('班段索引: ' + seg.segmentIndex);
      console.log('时间: ' + seg.startDate + ' ' + seg.startTime + ' - ' + seg.endDate + ' ' + seg.endTime);
      if (seg.account) {
        console.log('账户: ' + seg.account.namePath);
        const hierarchyValues = JSON.parse(seg.account.hierarchyValues || '[]');
        console.log('层级:');
        hierarchyValues.forEach((hv: any) => {
          const val = hv.selectedValue ? hv.selectedValue.name : '无';
          console.log('  Level ' + hv.level + ': ' + val);
        });
      }
    });
  } else {
    console.log('没有找到班段配置');
  }

  // 查询 LineShift 表（线体班次配置）
  console.log('\n\n=== 检查 LineShift 配置 ===\n');
  
  const lineShifts = await prisma.$queryRaw`
    SELECT ls.*, s.name as shiftName, p.name as productName
    FROM LineShift ls
    LEFT JOIN Shift s ON ls.shiftId = s.id
    LEFT JOIN Product p ON ls.productId = p.id
    WHERE ls.employeeId = (SELECT id FROM Employee WHERE employeeNo = '202605002')
      AND ls.workDate = '2026-05-10'
    ORDER BY ls.workDate, ls.shiftId
  `;

  if ((lineShifts as any[]).length > 0) {
    console.log('LineShift 配置:');
    (lineShifts as any[]).forEach((ls: any) => {
      console.log('\n日期: ' + ls.workDate);
      console.log('班次: ' + ls.shiftName);
      console.log('产品: ' + ls.productName);
      console.log('产线ID: ' + ls.productionLineId);
      if (ls.processSegmentId) {
        console.log('工序段ID: ' + ls.processSegmentId);
      }
    });
  } else {
    console.log('没有找到 LineShift 配置');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
