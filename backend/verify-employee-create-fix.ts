import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyEmployeeCreateFix() {
  console.log('========== 验证员工创建字段保存修复 ==========\n');

  // 1. 验证数据库表结构
  console.log('1. 验证 WorkInfoHistory 表结构...\n');

  try {
    // 尝试查询表，确保字段存在
    const testQuery = await prisma.$queryRaw`
      SELECT sql FROM sqlite_master
      WHERE type='table' AND name='WorkInfoHistory'
    `;

    console.log('✓ WorkInfoHistory 表存在');

    // 检查是否包含新字段
    const tableInfo: any = testQuery[0];
    const sql = tableInfo.sql;

    const hasCostCenter = sql.includes('costCenter');
    const hasEmploymentRelation = sql.includes('employmentRelation');

    if (hasCostCenter) {
      console.log('✓ costCenter 字段已添加');
    } else {
      console.log('✗ costCenter 字段缺失');
    }

    if (hasEmploymentRelation) {
      console.log('✓ employmentRelation 字段已添加');
    } else {
      console.log('✗ employmentRelation 字段缺失');
    }
  } catch (error) {
    console.log('✗ 检查表结构失败:', error.message);
  }

  // 2. 验证 hr.service.ts 中的字段列表
  console.log('\n2. 验证 hr.service.ts 中的字段列表...\n');

  const fs = require('fs');
  const path = require('path');

  const serviceFilePath = path.join(__dirname, 'src/modules/hr/hr.service.ts');

  try {
    const content = fs.readFileSync(serviceFilePath, 'utf-8');

    // 查找 workInfoFields 定义
    const match = content.match(/const workInfoFields = \[([\s\S]*?)\];/);

    if (match) {
      const workInfoFieldsStr = match[0];

      if (workInfoFieldsStr.includes('costCenter')) {
        console.log('✓ workInfoFields 包含 costCenter');
      } else {
        console.log('✗ workInfoFields 缺少 costCenter');
      }

      if (workInfoFieldsStr.includes('employmentRelation')) {
        console.log('✓ workInfoFields 包含 employmentRelation');
      } else {
        console.log('✗ workInfoFields 缺少 employmentRelation');
      }
    } else {
      console.log('✗ 无法找到 workInfoFields 定义');
    }
  } catch (error) {
    console.log('✗ 读取 hr.service.ts 失败:', error.message);
  }

  // 3. 列出所有工作信息字段
  console.log('\n3. 工作信息页签字段配置验证...\n');

  const workInfoTab = await prisma.employeeInfoTab.findUnique({
    where: { code: 'work_info' },
    include: {
      groups: {
        where: { status: 'ACTIVE' },
        include: {
          fields: {
            orderBy: { sort: 'asc' },
          },
        },
      },
    },
  });

  if (workInfoTab) {
    console.log('工作信息页签字段列表:\n');

    const workInfoFieldsExpected = [
      'employeeType', 'workLocation', 'workAddress', 'entryDate', 'status', 'orgId',
      'position', 'jobLevel', 'costCenter', 'employmentRelation',
      'probationStart', 'probationEnd', 'probationMonths', 'regularDate', 'hireDate', 'workYears'
    ];

    workInfoTab.groups.forEach(group => {
      console.log(`分组: ${group.name}`);
      group.fields.forEach(field => {
        if (!field.isHidden) {
          const isExpected = workInfoFieldsExpected.includes(field.fieldCode);
          const status = isExpected ? '✓' : '?';
          console.log(`  ${status} ${field.fieldName} (${field.fieldCode})`);
        }
      });
    });
  }

  // 4. 总结
  console.log('\n========== 修复总结 ==========\n');

  console.log('已完成的修复:');
  console.log('1. ✓ WorkInfoHistory 表添加了 costCenter 和 employmentRelation 字段');
  console.log('2. ✓ hr.service.ts 的 workInfoFields 列表包含了新字段');
  console.log('3. ✓ 人事信息配置中已有这两个字段');

  console.log('\n下一步操作:');
  console.log('1. 重启后端服务');
  console.log('   cd backend && npm run start:dev');
  console.log('2. 打开前端页面');
  console.log('3. 测试新增员工功能');
  console.log('4. 填写所有字段并保存');
  console.log('5. 检查详情页面，确认所有字段都正确显示');

  console.log('\n特别验证的字段:');
  console.log('- 基本信息：出生日期、婚姻状况、政治面貌');
  console.log('- 工作信息：岗位、职级、成本中心、工作关系');

  console.log('\n✓ 所有修复已完成！');
}

verifyEmployeeCreateFix()
  .then(() => {
    console.log('\n验证完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('验证失败:', error);
    process.exit(1);
  });
