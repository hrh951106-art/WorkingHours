/**
 * 完整的SQLite到PostgreSQL数据导出脚本
 * 导出所有表的数据，包括业务数据
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// SQL 转义函数
function escapeString(str) {
  if (str === null || str === undefined) return 'NULL';
  if (typeof str === 'boolean') return str ? 'true' : 'false';
  if (typeof str === 'number') return str;
  if (str instanceof Date) return `'${str.toISOString()}'`;
  return `'${String(str).replace(/'/g, "''")}'`;
}

// 生成 INSERT 语句
function generateInsert(tableName, data) {
  const columns = Object.keys(data);
  const values = columns.map(col => escapeString(data[col]));
  return `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});`;
}

// 需要导出的所有表（按依赖顺序）
const TABLES = [
  // 系统基础表
  'User',
  'Role',
  'UserRole',
  'DataScopeRule',
  'Organization',
  'Employee',

  // 数据源和配置
  'DataSource',
  'DataSourceOption',
  'CustomField',

  // 员工信息
  'EmployeeInfoTab',
  'EmployeeInfoTabGroup',
  'EmployeeInfoTabField',
  'EmployeeChangeLog',
  'EmployeeEducation',
  'EmployeeFamilyMember',
  'EmployeeWorkExperience',
  'EmployeeCoefficient',
  'EmployeeLaborAccount',

  // 考勤相关
  'AttendanceCode',
  'DefinitionAttendanceCode',
  'AttendanceRuleGroup',
  'AttendanceRuleGroupDetail',
  'EmployeeAttendanceRuleGroup',
  'AttendancePunchPair',
  'PunchPair',
  'PunchDevice',
  'PunchRecord',
  'PunchRule',
  'PunchRuleDeviceGroupInterval',
  'DeviceGroup',

  // 班次相关
  'Shift',
  'ShiftProperty',
  'ShiftPropertyDefinition',
  'ShiftSegment',
  'LineShift',
  'Schedule',

  // 生产相关
  'ProductionLine',
  'Product',
  'ProductionRecord',
  'PersonalProductionRecord',
  'ProductStandardHours',
  'ProductStandardHourByLevel',

  // 工时相关
  'WorkHourResult',
  'WorkInfoHistory',

  // 分摊相关
  'AllocationBasis',
  'AllocationConfig',
  'AllocationGeneralConfig',
  'AllocationResult',
  'AllocationRuleConfig',
  'AllocationRuleTarget',
  'AllocationSourceConfig',
  'AllocationWorkHour',
  'EarnedHoursAllocationConfig',
  'EarnedHoursAllocationResult',

  // 金额政策
  'AmountPolicy',
  'AmountPolicyGroup',

  // 账户相关
  'LaborAccount',
  'AccountHierarchyConfig',
  'AccountHierarchyLevelDetail',
  'DeviceAccount',

  // 工时汇报
  'LaborHourReportRequest',
  'LaborHourReportEmployee',

  // 生产汇报
  'ProductionReportRequest',

  // 计算相关
  'CalcResult',
  'CalcRule',
  'CalculationAttendanceCode',

  // 流程相关
  'WorkflowDefinition',
  'WorkflowNode',
  'WorkflowEdge',
  'WorkflowInstance',
  'WorkflowParticipant',
  'WorkflowApproval',
  'WorkflowCcRecord',
  'ParticipantConfig',

  // 支持/审批
  'SupportRequest',
  'SupportResult',
  'Process',

  // BI报表
  'BiReport',
  'BiReportParameter',
  'BiReportWidget',
  'BiReportAccessLog',
  'ReportDataModel',
  'ReportModelField',
  'ReportModelRelation',

  // 系统配置
  'SystemConfig',
  'SearchConditionConfig',

  // 审计日志
  'AuditLog',
];

async function exportAllData() {
  const outputFile = path.join(__dirname, '../prisma/migrations_postgres/20250331_init/migration_full_with_data.sql');
  const output = fs.createWriteStream(outputFile);

  console.log('开始导出所有数据...\n');

  try {
    // 1. 先写入表结构
    console.log('【步骤 1/3】写入表结构...');
    const schemaFile = path.join(__dirname, '../prisma/migrations_postgres/20250331_init/migration.sql');
    const schemaContent = fs.readFileSync(schemaFile, 'utf8');
    output.write(schemaContent);
    output.write('\n\n');
    console.log('✓ 表结构写入完成\n');

    // 2. 写入数据
    console.log('【步骤 2/3】导出数据...');
    output.write('-- ========================================\n');
    output.write('-- 完整数据导出 (包括业务数据)\n');
    output.write(`-- 生成时间: ${new Date().toISOString()}\n`);
    output.write('-- ========================================\n\n');

    let totalRecords = 0;
    let emptyTables = 0;

    for (const tableName of TABLES) {
      try {
        // 动态查询表数据
        const result = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}"`);
        const records = Array.isArray(result) ? result : [];

        if (records.length > 0) {
          console.log(`  ✓ ${tableName}: ${records.length} 条记录`);

          // 生成 INSERT 语句
          for (const record of records) {
            const insertStmt = generateInsert(tableName, record);
            output.write(insertStmt + '\n');
            totalRecords++;
          }
        } else {
          console.log(`  - ${tableName}: 空表`);
          emptyTables++;
        }
      } catch (error) {
        console.log(`  ✗ ${tableName}: 查询失败 - ${error.message}`);
      }
    }

    console.log(`\n✓ 数据导出完成: ${totalRecords} 条记录, ${emptyTables} 个空表\n`);

    // 3. 写入序列重置命令
    console.log('【步骤 3/3】重置序列...');
    output.write('\n-- ========================================\n');
    output.write('-- 重置序列\n');
    output.write('-- ========================================\n\n');

    for (const tableName of TABLES) {
      try {
        // 检查表是否有 SERIAL 主键
        const result = await prisma.$queryRawUnsafe(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = '${tableName}'
          AND column_default LIKE '%nextval%'
        `);

        if (result && result.length > 0) {
          const columnName = result[0].column_name;
          output.write(`SELECT setval('"${tableName}_${columnName}_seq"', (SELECT MAX("${columnName}") FROM "${tableName}"), true);\n`);
          console.log(`  ✓ ${tableName}`);
        }
      } catch (error) {
        // 忽略错误
      }
    }

    console.log('\n✓ 序列重置完成\n');

    output.end();

    const stats = fs.statSync(outputFile);
    console.log('========================================');
    console.log('✓ 完整导出完成！');
    console.log('========================================');
    console.log(`文件: ${outputFile}`);
    console.log(`大小: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`记录数: ${totalRecords}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('导出失败:', error);
    output.end();
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportAllData();
