import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { HrService } from '../src/modules/hr/hr.service';

async function testApiResponse() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const hrService = app.get(HrService);

  console.log('=== 测试API响应数据结构 ===\n');

  // 获取最新员工ID
  const latestEmployee = await prisma.employee.findFirst({
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!latestEmployee) {
    console.log('没有找到员工数据');
    await app.close();
    return;
  }

  console.log(`测试员工: ${latestEmployee.name} (ID: ${latestEmployee.id})\n`);

  // 调用API获取工作信息
  const workInfoData = await hrService.getWorkInfoByVersion(latestEmployee.id, 'current');

  console.log('1. API返回的顶层字段:');
  console.log('----------------------------------------');
  console.log(`id: ${workInfoData.id}`);
  console.log(`employeeNo: ${workInfoData.employeeNo}`);
  console.log(`name: ${workInfoData.name}`);
  console.log(`gender: ${workInfoData.gender || 'NULL'}`);
  console.log();

  console.log('2. currentWorkInfo对象:');
  console.log('----------------------------------------');
  if (!workInfoData.currentWorkInfo) {
    console.log('currentWorkInfo is NULL or undefined!');
  } else {
    console.log(`currentWorkInfo存在: true`);
    console.log(`ID: ${workInfoData.currentWorkInfo.id}`);
    console.log(`employeeId: ${workInfoData.currentWorkInfo.employeeId}`);
    console.log(`position: ${workInfoData.currentWorkInfo.position || 'NULL'}`);
    console.log(`jobLevel: ${workInfoData.currentWorkInfo.jobLevel || 'NULL'}`);
    console.log(`employeeType: ${workInfoData.currentWorkInfo.employeeType || 'NULL'}`);
    console.log(`orgId: ${workInfoData.currentWorkInfo.orgId || 'NULL'}`);
    console.log(`workLocation: ${workInfoData.currentWorkInfo.workLocation || 'NULL'}`);

    // 检查所有字段
    console.log('\n所有currentWorkInfo字段:');
    Object.keys(workInfoData.currentWorkInfo).forEach(key => {
      const value = workInfoData.currentWorkInfo[key];
      if (value !== null && value !== undefined) {
        console.log(`  ${key}: ${value}`);
      }
    });
  }

  console.log('\n3. 前端数据访问模拟:');
  console.log('----------------------------------------');
  const currentWorkInfo = workInfoData; // 模拟前端变量
  const workInfoDataNested = currentWorkInfo?.currentWorkInfo || {};

  console.log(`workInfoData对象存在: ${!!workInfoDataNested}`);
  console.log(`workInfoData.jobLevel: ${workInfoDataNested.jobLevel || 'NULL'}`);
  console.log(`workInfoData.position: ${workInfoDataNested.position || 'NULL'}`);
  console.log(`workInfoData.employeeType: ${workInfoDataNested.employeeType || 'NULL'}`);

  await app.close();
}

testApiResponse().catch(console.error);
