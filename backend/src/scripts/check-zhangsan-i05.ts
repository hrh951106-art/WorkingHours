import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';

async function checkZhangSanI05() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('=== 检查张三的I05工时记录 ===\n');

  // 1. 查找张三
  const zhangSan = await prisma.employee.findFirst({
    where: {
      name: '张三',
    },
  });

  if (!zhangSan) {
    console.log('未找到张三');
    await app.close();
    return;
  }

  console.log(`找到张三: ${zhangSan.name} (${zhangSan.employeeNo})`);

  // 2. 查找I05出勤代码
  const i05Code = await prisma.attendanceCode.findFirst({
    where: {
      code: 'I05',
    },
  });

  if (!i05Code) {
    console.log('未找到I05出勤代码');
    await app.close();
    return;
  }

  console.log(`\nI05出勤代码: ${i05Code.name} (ID: ${i05Code.id})`);

  // 3. 查找张三的所有工时记录
  console.log(`\n张三的所有工时记录:`);
  const allResults = await prisma.calcResult.findMany({
    where: {
      employeeNo: zhangSan.employeeNo,
    },
    include: {
      attendanceCode: true,
    },
    orderBy: {
      calcDate: 'desc',
    },
    take: 20,
  });

  console.log(`总工时记录数: ${allResults.length}`);
  for (const result of allResults) {
    console.log(`- 日期: ${result.calcDate.toISOString().split('T')[0]}, ` +
                `出勤代码: ${result.attendanceCode?.name || 'N/A'} (${result.attendanceCode?.code || 'N/A'}), ` +
                `实际工时: ${result.actualHours}, ` +
                `账户: ${result.accountName || 'N/A'}`);
  }

  // 4. 查找张三的I05工时记录（具体）
  console.log(`\n张三的I05工时记录:`);
  const i05Results = await prisma.calcResult.findMany({
    where: {
      employeeNo: zhangSan.employeeNo,
      attendanceCodeId: i05Code.id,
    },
    include: {
      attendanceCode: true,
    },
    orderBy: {
      calcDate: 'desc',
    },
  });

  console.log(`找到 ${i05Results.length} 条I05工时记录`);
  for (const result of i05Results) {
    console.log(`- 日期: ${result.calcDate.toISOString().split('T')[0]}, ` +
                `实际工时: ${result.actualHours}, ` +
                `账户: ${result.accountName || 'N/A'} (ID: ${result.accountId}), ` +
                `状态: ${result.status}`);
  }

  // 5. 检查富阳工厂//////间接设备账户
  console.log(`\n检查富阳工厂//////间接设备账户:`);
  const factoryAccount = await prisma.laborAccount.findFirst({
    where: {
      name: '富阳工厂//////间接设备',
    },
  });

  if (factoryAccount) {
    console.log(`找到账户: ${factoryAccount.name} (ID: ${factoryAccount.id})`);
    console.log(`层级值: ${factoryAccount.hierarchyValues}`);
  } else {
    console.log('未找到账户');
  }

  // 6. 检查是否有账户为富阳工厂//////间接设备的工时记录
  if (factoryAccount) {
    console.log(`\n检查账户为富阳工厂//////间接设备的工时记录:`);
    const accountResults = await prisma.calcResult.findMany({
      where: {
        accountId: factoryAccount.id,
      },
      include: {
        attendanceCode: true,
        employee: true,
      },
      orderBy: {
        calcDate: 'desc',
      },
      take: 10,
    });

    console.log(`找到 ${accountResults.length} 条工时记录`);
    for (const result of accountResults) {
      console.log(`- 日期: ${result.calcDate.toISOString().split('T')[0]}, ` +
                  `员工: ${result.employee?.name || 'N/A'}, ` +
                  `出勤代码: ${result.attendanceCode?.name || 'N/A'}, ` +
                  `实际工时: ${result.actualHours}, ` +
                  `状态: ${result.status}`);
    }
  }

  console.log('\n=== 检查完成 ===');

  await app.close();
}

checkZhangSanI05().catch(console.error);
