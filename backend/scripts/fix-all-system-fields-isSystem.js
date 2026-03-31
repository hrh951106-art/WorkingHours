#!/usr/bin/env node

// ========================================
// 修复所有系统内置字段的 isSystem 标识
// ========================================

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 需要下拉选项的系统内置字段
const SYSTEM_FIELDS_WITH_DATASOURCE = [
  'gender',           // 性别
  'nation',           // 民族
  'maritalStatus',    // 婚姻状况
  'politicalStatus',  // 政治面貌
  'educationLevel',   // 学历层次
  'educationType',    // 学历类型
  'employeeType',     // 员工类型
  'position',         // 职位
  'rank',             // 职级
  'resignationReason',// 离职原因
];

// 所有系统内置字段（包括不需要下拉的）
const ALL_SYSTEM_FIELDS = [
  ...SYSTEM_FIELDS_WITH_DATASOURCE,
  'name',              // 姓名
  'gender',           // 性别
  'age',               // 年龄
  'nation',           // 民族
  'maritalStatus',    // 婚姻状况
  'politicalStatus',  // 政治面貌
  'id_card',          // 身份证号
  'birth_date',       // 出生日期
  'native_place',     // 籍贯
  'mobile',           // 手机号码
  'email',            // 电子邮箱
  'home_phone',       // 家庭电话
  'home_address',     // 家庭住址
  'current_address',  // 现住址
  'work_location',    // 工作地点
  'employee_no',      // 员工编号
  'hire_date',        // 入职日期
  'probation_start',  // 试用期开始
  'probation_end',    // 试用期结束
  'probation_months', // 试用期月数
  'regular_date',     // 转正日期
  'work_years',       // 工作年限
  'educationLevel',   // 学历层次
  'educationType',    // 学历类型
  'graduate_school',  // 毕业院校
  'major',            // 专业
  'degree_no',        // 学位证号
  'diploma_no',       // 毕业证号
  'graduation_date',  // 毕业日期
  'employeeType',     // 员工类型
  'position',         // 职位
  'rank',             // 职级
  'work_address',     // 工作地址
  'status',           // 在职状态
  'resignation_date', // 离职日期
  'resignationReason',// 离职原因
  // 紧急联系人
  'emergency_contact', // 紧急联系人
  'emergency_phone',   // 紧急电话
  'emergency_relation',// 紧急关系
  // 工作经历
  'exp_company',      // 曾任职公司
  'exp_position',     // 曾任职位
  'exp_start',        // 开始日期
  'exp_end',          // 结束日期
  'exp_salary',       // 薪资
  'exp_reason',       // 离职原因
  'exp_description',  // 工作描述
  // 家庭成员
  'member_name',      // 成员姓名
  'member_relation',  // 关系
  'member_age',       // 年龄
  'member_work',      // 工作单位
  'member_address',   // 住址
  'member_phone',     // 联系电话
  // 其他
  'photo',            // 照片
  'org_id',           // 所属组织
  'household_register',// 户口所在地
];

async function main() {
  console.log('');
  console.log('========================================');
  console.log('修复所有系统内置字段的 isSystem 标识');
  console.log('========================================');
  console.log('');

  try {
    // ========================================
    // 第一步：更新所有系统内置字段的 isSystem = 1
    // ========================================
    console.log('【第一步】更新系统内置字段的 isSystem 标识');
    console.log('----------------------------------------');

    // 先查询当前状态
    const currentFields = await prisma.employeeInfoTabField.findMany({
      where: {
        fieldCode: {
          in: ALL_SYSTEM_FIELDS
        }
      },
      select: {
        id: true,
        fieldCode: true,
        fieldName: true,
        fieldType: true,
        isSystem: true
      }
    });

    console.log(`找到 ${currentFields.length} 个系统内置字段记录`);

    const needUpdate = currentFields.filter(f => !f.isSystem);
    console.log(`其中 ${needUpdate.length} 个需要更新 isSystem = 1`);

    if (needUpdate.length > 0) {
      console.log('\n需要更新的字段:');
      needUpdate.forEach(f => {
        console.log(`  - ${f.fieldCode} (${f.fieldName}) - 当前: isSystem=${f.isSystem}`);
      });

      // 批量更新
      const updated = await prisma.employeeInfoTabField.updateMany({
        where: {
          fieldCode: {
            in: ALL_SYSTEM_FIELDS
          },
          isSystem: false
        },
        data: {
          isSystem: true
        }
      });

      console.log(`\n✓ 已更新 ${updated.count} 条记录`);
    } else {
      console.log('✓ 所有字段已正确设置 isSystem = 1');
    }

    console.log('');

    // ========================================
    // 第二步：为需要数据源的字段设置 dataSourceId
    // ========================================
    console.log('【第二步】为需要数据源的字段设置 dataSourceId');
    console.log('----------------------------------------');

    const dataSourceMapping = {
      'gender': 'gender',
      'nation': 'nation',
      'maritalStatus': 'marital_status',
      'politicalStatus': 'political_status',
      'educationLevel': 'education_level',
      'educationType': 'education_type',
      'employeeType': 'employee_type',
      'position': 'POSITION',
      'rank': 'JOB_LEVEL',
      'resignationReason': 'resignation_reason',
    };

    for (const [fieldCode, dataSourceCode] of Object.entries(dataSourceMapping)) {
      // 查找数据源
      const dataSource = await prisma.dataSource.findFirst({
        where: {
          code: dataSourceCode,
          isSystem: true
        }
      });

      if (!dataSource) {
        console.log(`⚠️  警告: 未找到数据源 ${dataSourceCode}，跳过字段 ${fieldCode}`);
        continue;
      }

      // 更新字段
      const updated = await prisma.employeeInfoTabField.updateMany({
        where: {
          fieldCode: fieldCode
        },
        data: {
          dataSourceId: dataSource.id,
          isSystem: true
        }
      });

      if (updated.count > 0) {
        console.log(`✓ ${fieldCode} → dataSourceId=${dataSource.id} (${dataSourceCode})`);
      }
    }

    console.log('');

    // ========================================
    // 第三步：更新 fieldType 为 SELECT
    // ========================================
    console.log('【第三步】更新需要下拉的字段类型为 SELECT');
    console.log('----------------------------------------');

    const updated = await prisma.employeeInfoTabField.updateMany({
      where: {
        fieldCode: {
          in: SYSTEM_FIELDS_WITH_DATASOURCE
        },
        fieldType: {
          not: 'SELECT'
        }
      },
      data: {
        fieldType: 'SELECT'
      }
    });

    if (updated.count > 0) {
      console.log(`✓ 已更新 ${updated.count} 个字段的类型为 SELECT`);
    } else {
      console.log('✓ 所有需要下拉的字段类型已正确');
    }

    console.log('');

    // ========================================
    // 第四步：验证结果
    // ========================================
    console.log('【第四步】验证结果');
    console.log('----------------------------------------');

    console.log('4.1 检查所有系统内置字段的 isSystem 状态:');

    const systemFields = await prisma.$queryRaw`
      SELECT
        fieldCode,
        fieldName,
        fieldType,
        isSystem,
        dataSourceId
      FROM EmployeeInfoTabField
      WHERE fieldCode IN (${ALL_SYSTEM_FIELDS.map(() => '?').join(',')})
      ORDER BY fieldCode
    `;

    const wrongSystem = [];
    const correctSystem = [];

    for (const field of systemFields) {
      if (!field.isSystem) {
        wrongSystem.push(field);
      } else {
        correctSystem.push(field);
      }
    }

    if (wrongSystem.length > 0) {
      console.log('\n⚠️  仍然错误的字段:');
      console.table(wrongSystem);
    } else {
      console.log('\n✓ 所有系统内置字段的 isSystem 都正确！');
    }

    console.log(`\n总计: ${correctSystem.length} 个系统内置字段`);

    console.log('\n4.2 检查自定义字段:');

    const customFields = await prisma.customField.findMany({
      where: {
        isSystem: false
      },
      select: {
        code: true,
        name: true,
        isSystem: true
      }
    });

    if (customFields.length > 0) {
      console.table(customFields);
    } else {
      console.log('✓ CustomField 中没有记录');
    }

    console.log('');
    console.log('========================================');
    console.log('✓ 修复完成！');
    console.log('========================================');
    console.log('');
    console.log('完成的操作:');
    console.log('1. 更新所有系统内置字段的 isSystem = 1');
    console.log('2. 为需要数据源的字段设置 dataSourceId');
    console.log('3. 更新需要下拉的字段类型为 SELECT');
    console.log('');
    console.log('前端控制:');
    console.log('- isSystem = 1 的字段: 不显示删除按钮');
    console.log('- isSystem = 0 的字段: 显示删除按钮');
    console.log('');

  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
