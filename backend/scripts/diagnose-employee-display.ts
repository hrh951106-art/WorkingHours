import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

async function diagnoseEmployeeDisplay() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('=== 员工详情显示问题诊断 ===\n');

  // 1. 获取最新的员工
  const latestEmployee = await prisma.employee.findFirst({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      org: true,
    },
  });

  if (!latestEmployee) {
    console.log('没有找到员工数据');
    await app.close();
    return;
  }

  console.log('1. 员工基本信息:');
  console.log('----------------------------------------');
  console.log(`ID: ${latestEmployee.id}`);
  console.log(`姓名: ${latestEmployee.name}`);
  console.log(`工号: ${latestEmployee.employeeNo}`);
  console.log(`性别(存储值): ${latestEmployee.gender || 'NULL'}`);
  console.log(`组织ID: ${latestEmployee.orgId || 'NULL'}`);
  console.log(`组织名称: ${latestEmployee.org?.name || 'NULL'}`);
  console.log();

  // 2. 获取当前工作信息
  const currentWorkInfo = await prisma.workInfoHistory.findFirst({
    where: {
      employeeId: latestEmployee.id,
      isCurrent: true,
    },
    include: {
      org: true,
    },
  });

  if (!currentWorkInfo) {
    console.log('未找到当前工作信息');
    await app.close();
    return;
  }

  console.log('2. 当前工作信息(原始存储值):');
  console.log('----------------------------------------');
  console.log(`WorkInfoHistory ID: ${currentWorkInfo.id}`);
  console.log(`职位(position): ${currentWorkInfo.position || 'NULL'}`);
  console.log(`职级(jobLevel): ${currentWorkInfo.jobLevel || 'NULL'}`);
  console.log(`员工类型(employeeType): ${currentWorkInfo.employeeType || 'NULL'}`);
  console.log(`工作地点(workLocation): ${currentWorkInfo.workLocation || 'NULL'}`);
  console.log();

  // 3. 检查DataSource配置
  console.log('3. DataSource配置检查:');
  console.log('----------------------------------------');

  const jobLevelDS = await prisma.dataSource.findFirst({
    where: { code: 'JOB_LEVEL' },
    include: { options: { where: { isActive: true } } },
  });

  if (jobLevelDS) {
    console.log('JOB_LEVEL数据源:');
    console.log(`  ID: ${jobLevelDS.id}`);
    console.log(`  Code: ${jobLevelDS.code}`);
    console.log(`  名称: ${jobLevelDS.name}`);
    console.log(`  选项数: ${jobLevelDS.options.length}`);
    console.log('  选项列表:');
    jobLevelDS.options.forEach(opt => {
      console.log(`    - value: "${opt.value}" → label: "${opt.label}" (ID: ${opt.id}, isActive: ${opt.isActive})`);
    });

    // 检查当前员工的jobLevel值是否能匹配到label
    if (currentWorkInfo.jobLevel) {
      const matchedOption = jobLevelDS.options.find(opt => opt.value === currentWorkInfo.jobLevel);
      console.log(`\n  当前员工职级匹配:`);
      console.log(`    存储值: "${currentWorkInfo.jobLevel}"`);
      if (matchedOption) {
        console.log(`    匹配成功 → 应显示: "${matchedOption.label}"`);
      } else {
        console.log(`    匹配失败 → 将显示原始值: "${currentWorkInfo.jobLevel}"`);
      }
    }
  } else {
    console.log('JOB_LEVEL数据源未找到!');
  }

  const genderDS = await prisma.dataSource.findFirst({
    where: { code: 'gender' },
    include: { options: { where: { isActive: true } } },
  });

  console.log('\ngender数据源:');
  if (genderDS) {
    console.log(`  ID: ${genderDS.id}`);
    console.log(`  Code: ${genderDS.code}`);
    console.log(`  名称: ${genderDS.name}`);
    console.log(`  选项数: ${genderDS.options.length}`);
    console.log('  选项列表:');
    genderDS.options.forEach(opt => {
      console.log(`    - value: "${opt.value}" → label: "${opt.label}" (ID: ${opt.id}, isActive: ${opt.isActive})`);
    });

    // 检查当前员工的gender值是否能匹配到label
    if (latestEmployee.gender) {
      const matchedOption = genderDS.options.find(opt => opt.value === latestEmployee.gender);
      console.log(`\n  当前员工性别匹配:`);
      console.log(`    存储值: "${latestEmployee.gender}"`);
      if (matchedOption) {
        console.log(`    匹配成功 → 应显示: "${matchedOption.label}"`);
      } else {
        console.log(`    匹配失败 → 将显示原始值: "${latestEmployee.gender}"`);
      }
    }
  } else {
    console.log('gender数据源未找到!');
  }

  console.log('\n4. 检查position数据源:');
  const positionDS = await prisma.dataSource.findFirst({
    where: { code: 'POSITION' },
    include: { options: { where: { isActive: true } } },
  });

  if (positionDS) {
    console.log(`  找到POSITION数据源，ID: ${positionDS.id}`);
    console.log(`  选项数: ${positionDS.options.length}`);
    if (positionDS.options.length > 0) {
      console.log('  前5个选项:');
      positionDS.options.slice(0, 5).forEach(opt => {
        console.log(`    - value: "${opt.value}" → label: "${opt.label}"`);
      });
    }
  } else {
    console.log('  POSITION数据源未找到');
  }

  console.log('\n5. 检查employeeType数据源:');
  const employeeTypeDS = await prisma.dataSource.findFirst({
    where: { code: 'EMPLOYEE_TYPE' },
    include: { options: { where: { isActive: true } } },
  });

  if (employeeTypeDS) {
    console.log(`  找到EMPLOYEE_TYPE数据源，ID: ${employeeTypeDS.id}`);
    console.log(`  选项数: ${employeeTypeDS.options.length}`);
    if (employeeTypeDS.options.length > 0) {
      console.log('  前5个选项:');
      employeeTypeDS.options.slice(0, 5).forEach(opt => {
        console.log(`    - value: "${opt.value}" → label: "${opt.label}"`);
      });
    }
  } else {
    console.log('  EMPLOYEE_TYPE数据源未找到');
  }

  console.log('\n=== 诊断总结 ===');
  console.log('----------------------------------------');
  console.log('可能的问题原因:');
  console.log('1. 数据源未配置或选项为空');
  console.log('2. 存储的value与数据源中的value不匹配');
  console.log('3. 前端getLabelByValue函数未正确加载dataSources');
  console.log('4. 前端预览模式下数据未正确传递给formatValue函数');

  await app.close();
}

diagnoseEmployeeDisplay().catch(console.error);
