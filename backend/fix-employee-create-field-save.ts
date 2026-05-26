import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixEmployeeCreateFieldSave() {
  console.log('========== 修复员工创建字段保存问题 ==========\n');

  // 1. 读取当前 hr.service.ts 文件内容
  const fs = require('fs');
  const path = require('path');

  const serviceFilePath = path.join(__dirname, 'src/modules/hr/hr.service.ts');

  console.log('步骤 1: 检查 hr.service.ts 文件...');

  if (!fs.existsSync(serviceFilePath)) {
    console.error('文件不存在:', serviceFilePath);
    console.log('\n请手动修改以下内容：');
    console.log('\n文件: backend/src/modules/hr/hr.service.ts');
    console.log('\n需要修改的位置（createEmployee 方法，大约第424-430行）：');
    console.log('\n原代码：');
    console.log(`  const workInfoFields = [
      'changeType', 'position', 'jobLevel', 'employeeType', 'workLocation', 'workAddress',
      'hireDate', 'probationStart', 'probationEnd', 'probationMonths',
      'regularDate', 'resignationDate', 'resignationReason', 'workYears',
      'orgId', 'effectiveDate', 'isCurrent', 'reason'
    ];`);

    console.log('\n修改为：');
    console.log(`  const workInfoFields = [
      'changeType', 'position', 'jobLevel', 'employeeType', 'workLocation', 'workAddress',
      'hireDate', 'probationStart', 'probationEnd', 'probationMonths',
      'regularDate', 'resignationDate', 'resignationReason', 'workYears',
      'costCenter', 'employmentRelation',
      'orgId', 'effectiveDate', 'isCurrent', 'reason'
    ];`);

    console.log('\n说明：添加了 costCenter 和 employmentRelation 字段');
    return;
  }

  console.log('✓ 文件存在');

  // 2. 显示需要手动修改的内容
  console.log('\n步骤 2: 需要手动修改的内容\n');

  console.log('问题分析：');
  console.log('1. costCenter 和 employmentRelation 字段未在后端字段列表中定义');
  console.log('2. 这些字段会被放入 customFields，但前端查询时可能没有正确解析');
  console.log('3. entryDate 和 status 在工作信息页签中，但应该保存到 Employee 表\n');

  console.log('修复方案：');
  console.log('将 costCenter 和 employmentRelation 添加到 workInfoFields 列表中\n');

  console.log('需要修改的文件：');
  console.log('  backend/src/modules/hr/hr.service.ts\n');

  console.log('修改位置：');
  console.log('  createEmployee 方法（大约第424-430行）\n');

  console.log('原代码：');
  console.log(`  const workInfoFields = [
    'changeType', 'position', 'jobLevel', 'employeeType', 'workLocation', 'workAddress',
    'hireDate', 'probationStart', 'probationEnd', 'probationMonths',
    'regularDate', 'resignationDate', 'resignationReason', 'workYears',
    'orgId', 'effectiveDate', 'isCurrent', 'reason'
  ];`);

  console.log('\n修改为：');
  console.log(`  const workInfoFields = [
    'changeType', 'position', 'jobLevel', 'employeeType', 'workLocation', 'workAddress',
    'hireDate', 'probationStart', 'probationEnd', 'probationMonths',
    'regularDate', 'resignationDate', 'resignationReason', 'workYears',
    'costCenter', 'employmentRelation',
    'orgId', 'effectiveDate', 'isCurrent', 'reason'
  ];`);

  console.log('\n说明：');
  console.log('  - 在 workYears 后添加 costCenter');
  console.log('  - 在 costCenter 后添加 employmentRelation');

  // 3. 自动修复
  console.log('\n\n步骤 3: 尝试自动修复...\n');

  try {
    let content = fs.readFileSync(serviceFilePath, 'utf-8');

    // 查找 workInfoFields 定义
    const oldPattern = /const workInfoFields = \[([\s\S]*?)\];/;
    const match = content.match(oldPattern);

    if (match) {
      const oldWorkInfoFields = match[0];
      console.log('找到 workInfoFields 定义:');
      console.log(oldWorkInfoFields);

      // 检查是否已经包含 costCenter 和 employmentRelation
      if (oldWorkInfoFields.includes('costCenter') && oldWorkInfoFields.includes('employmentRelation')) {
        console.log('\n✓ 字段已经存在，无需修改');
      } else {
        // 构建新的 workInfoFields 定义
        const newWorkInfoFields = `const workInfoFields = [
      'changeType', 'position', 'jobLevel', 'employeeType', 'workLocation', 'workAddress',
      'hireDate', 'probationStart', 'probationEnd', 'probationMonths',
      'regularDate', 'resignationDate', 'resignationReason', 'workYears',
      'costCenter', 'employmentRelation',
      'orgId', 'effectiveDate', 'isCurrent', 'reason'
    ];`;

        // 替换
        content = content.replace(oldPattern, newWorkInfoFields);

        // 写回文件
        fs.writeFileSync(serviceFilePath, content, 'utf-8');

        console.log('\n✓ 自动修复成功！');
        console.log('已将 costCenter 和 employmentRelation 添加到 workInfoFields');
      }
    } else {
      console.log('✗ 无法找到 workInfoFields 定义，请手动修改');
    }
  } catch (error) {
    console.log('✗ 自动修复失败:', error.message);
    console.log('请按照上述说明手动修改');
  }

  console.log('\n========== 后续步骤 ==========\n');

  console.log('1. 如果自动修复成功，直接进入下一步');
  console.log('2. 如果自动修复失败，请手动修改 hr.service.ts 文件');
  console.log('3. 修改完成后，重启后端服务：');
  console.log('   npm run start:dev 或 npm run start:prod');
  console.log('4. 测试新增员工功能，验证所有字段都能正确保存');
}

fixEmployeeCreateFieldSave()
  .then(() => {
    console.log('\n修复完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('修复失败:', error);
    process.exit(1);
  });
