const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkA04Dates() {
  console.log('🔍 检查A04工时数据的日期格式\n');

  const workHours = await prisma.$queryRaw`
    SELECT "id", "calcDate", "employeeId", "definitionAttendanceCodeStr",
           "workHours", "accountName"
    FROM "WorkHourResult"
    WHERE "definitionAttendanceCodeStr" = 'A04_WORKSHOP'
    ORDER BY "calcDate" DESC
  `;

  console.log(`找到 ${workHours.length} 条记录:\n`);

  workHours.forEach((wh, idx) => {
    console.log(`${idx + 1}. calcDate=${wh.calcDate}, calcDate类型=${typeof wh.calcDate}`);
    if (wh.calcDate) {
      console.log(`   ISO字符串: ${wh.calcDate.toISOString()}`);
      console.log(`   日期部分: ${wh.calcDate.toISOString().split('T')[0]}`);
    }
    console.log(`   员工ID=${wh.employeeId}, ${wh.workHours}h`);
    console.log(`   账户: ${wh.accountName}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkA04Dates().catch(console.error);
