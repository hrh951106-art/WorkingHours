#!/bin/bash
# 生成完整的PostgreSQL迁移脚本

set -e

echo "========================================"
echo "生成PostgreSQL完整迁移脚本"
echo "========================================"

cd /Users/aaron.he/Desktop/AI/JY/backend

OUTPUT="prisma/migrations_postgres/20250331_init/migration_full.sql"

# 1. 复制表结构
echo "【步骤 1/3】添加表结构..."
cat prisma/migrations_postgres/20250331_init/migration.sql > "$OUTPUT"

# 2. 导出数据
echo ""
echo "【步骤 2/3】导出种子数据..."

echo "
-- ========================================
-- 种子数据 (Seed Data)
-- 生成时间: $(date -Iseconds)
-- ========================================

" >> "$OUTPUT"

# 使用node脚本导出数据
node -e "
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

(async () => {
  const sql = [];

  // DataSource & DataSourceOption
  console.log('  导出 DataSource...');
  const ds = await prisma.dataSource.findMany({ include: { options: true }, orderBy: { id: 'asc' } });
  ds.forEach(d => {
    sql.push(\`INSERT INTO \"DataSource\" VALUES (\${d.id}, '\${d.code}', '\${d.name}', '\${d.type}', \${d.description ? \"'\" + d.description.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${d.isSystem}, '\${d.status}', \${d.sort}, NOW(), NOW());\`);
    d.options.forEach(o => {
      sql.push(\`INSERT INTO \"DataSourceOption\" VALUES (\${o.id}, \${d.id}, '\${o.label}', '\${o.value}', \${o.sort}, \${o.isActive}, NOW(), NOW());\`);
    });
  });

  // Role
  console.log('  导出 Role...');
  const roles = await prisma.role.findMany({ orderBy: { id: 'asc' } });
  roles.forEach(r => {
    sql.push(\`INSERT INTO \"Role\" VALUES (\${r.id}, '\${r.code}', '\${r.name}', \${r.description ? \"'\" + r.description.replace(/'/g, \"''\") + \"'\" : 'NULL'}, '\${r.functionalPermissions}', '\${r.dataScopeType}', \${r.orgDataScope ? \"'\" + r.orgDataScope.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${r.managedOrgDataScope ? \"'\" + r.managedOrgDataScope.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${r.dataScopeRuleGroups ? \"'\" + r.dataScopeRuleGroups.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${r.isDefault}, '\${r.status}', NOW(), NOW());\`);
  });

  // User
  console.log('  导出 User...');
  const users = await prisma.user.findMany({ orderBy: { id: 'asc' } });
  users.forEach(u => {
    sql.push(\`INSERT INTO \"User\" VALUES (\${u.id}, '\${u.username}', '\${u.password}', '\${u.name}', \${u.email ? \"'\" + u.email.replace(/'/g, \"''\") + \"'\" : 'NULL'}, '\${u.status}', NOW(), NOW());\`);
  });

  // UserRole
  console.log('  导出 UserRole...');
  const userRoles = await prisma.userRole.findMany({ orderBy: { id: 'asc' } });
  userRoles.forEach(ur => {
    sql.push(\`INSERT INTO \"UserRole\" VALUES (\${ur.id}, \${ur.userId}, \${ur.roleId}, NOW());\`);
  });

  // Organization
  console.log('  导出 Organization...');
  const orgs = await prisma.organization.findMany({ orderBy: { id: 'asc' } });
  orgs.forEach(o => {
    sql.push(\`INSERT INTO \"Organization\" VALUES (\${o.id}, '\${o.code}', '\${o.name}', \${o.parentId || 'NULL'}, '\${o.type}', \${o.leaderId || 'NULL'}, \${o.leaderName ? \"'\" + o.leaderName.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${o.level}, '\${o.effectiveDate.toISOString()}', \${o.expiryDate ? \"'\" + o.expiryDate.toISOString() + \"'\" : 'NULL'}, '\${o.status}', NOW(), NOW());\`);
  });

  // Employee
  console.log('  导出 Employee...');
  const emps = await prisma.employee.findMany({ orderBy: { id: 'asc' } });
  emps.forEach(e => {
    sql.push(\`INSERT INTO \"Employee\" VALUES (\${e.id}, '\${e.employeeNo}', '\${e.name}', '\${e.gender}', \${e.idCard ? \"'\" + e.idCard.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${e.phone ? \"'\" + e.phone.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${e.email ? \"'\" + e.email.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${e.orgId}, '\${e.entryDate.toISOString()}', '\${e.status}', '\${e.customFields.replace(/'/g, \"''\")}', NOW(), NOW(), \${e.age || 'NULL'}, \${e.birthDate ? \"'\" + e.birthDate.toISOString() + \"'\" : 'NULL'}, \${e.currentAddress ? \"'\" + e.currentAddress.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${e.emergencyContact ? \"'\" + e.emergencyContact.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${e.emergencyPhone ? \"'\" + e.emergencyPhone.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${e.emergencyRelation ? \"'\" + e.emergencyRelation.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${e.homeAddress ? \"'\" + e.homeAddress.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${e.homePhone ? \"'\" + e.homePhone.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${e.householdRegister ? \"'\" + e.householdRegister.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${e.maritalStatus ? \"'\" + e.maritalStatus.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${e.nativePlace ? \"'\" + e.nativePlace.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${e.photo ? \"'\" + e.photo.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${e.politicalStatus ? \"'\" + e.politicalStatus.replace(/'/g, \"''\") + \"'\" : 'NULL'});\`);
  });

  // Shift
  console.log('  导出 Shift...');
  const shifts = await prisma.shift.findMany({ orderBy: { id: 'asc' } });
  shifts.forEach(s => {
    sql.push(\`INSERT INTO \"Shift\" VALUES (\${s.id}, '\${s.code}', '\${s.name}', '\${s.type}', \${s.standardHours}, \${s.breakHours}, \${s.color ? \"'\" + s.color.replace(/'/g, \"''\") + \"'\" : 'NULL'}, '\${s.status}', NOW(), NOW());\`);
  });

  // ShiftProperty
  console.log('  导出 ShiftProperty...');
  const sp = await prisma.shiftProperty.findMany({ orderBy: { id: 'asc' } });
  sp.forEach(s => {
    sql.push(\`INSERT INTO \"ShiftProperty\" VALUES (\${s.id}, \${s.shiftId}, '\${s.propertyKey}', '\${s.propertyValue}', \${s.description ? \"'\" + s.description.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${s.sortOrder}, NOW(), NOW());\`);
  });

  // PunchDevice
  console.log('  导出 PunchDevice...');
  const devices = await prisma.punchDevice.findMany({ orderBy: { id: 'asc' } });
  devices.forEach(d => {
    sql.push(\`INSERT INTO \"PunchDevice\" VALUES (\${d.id}, '\${d.code}', '\${d.name}', '\${d.type}', \${d.ipAddress ? \"'\" + d.ipAddress.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${d.groupId || 'NULL'}, '\${d.status}', NOW(), NOW());\`);
  });

  // EmployeeInfoTab, Group, Field
  console.log('  导出 EmployeeInfoTab...');
  const tabs = await prisma.employeeInfoTab.findMany({ include: { groups: true, fields: true }, orderBy: { id: 'asc' } });
  tabs.forEach(t => {
    sql.push(\`INSERT INTO \"EmployeeInfoTab\" VALUES (\${t.id}, '\${t.code}', '\${t.name}', \${t.description ? \"'\" + t.description.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${t.isSystem}, \${t.sort}, '\${t.status}', NOW(), NOW());\`);
    t.groups.forEach(g => {
      sql.push(\`INSERT INTO \"EmployeeInfoTabGroup\" VALUES (\${g.id}, \${t.id}, '\${g.code}', '\${g.name}', \${g.description ? \"'\" + g.description.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${g.sort}, '\${g.status}', \${g.collapsed}, \${g.isSystem}, NOW(), NOW());\`);
    });
    t.fields.forEach(f => {
      sql.push(\`INSERT INTO \"EmployeeInfoTabField\" VALUES (\${f.id}, \${t.id}, \${f.groupId || 'NULL'}, '\${f.fieldCode}', '\${f.fieldName}', '\${f.fieldType}', \${f.isRequired}, \${f.isHidden}, \${f.sort}, NOW(), NOW());\`);
    });
  });

  // CustomField
  console.log('  导出 CustomField...');
  const cfs = await prisma.customField.findMany({ orderBy: { id: 'asc' } });
  cfs.forEach(cf => {
    sql.push(\`INSERT INTO \"CustomField\" VALUES (\${cf.id}, '\${cf.code}', '\${cf.name}', '\${cf.type}', \${cf.dataSourceId || 'NULL'}, \${cf.options ? \"'\" + cf.options.replace(/'/g, \"''\") + \"'\" : 'NULL'}, \${cf.isRequired}, \${cf.defaultValue ? \"'\" + cf.defaultValue.replace(/'/g, \"''\") + \"'\" : 'NULL'}, '\${cf.group}', \${cf.sort}, \${cf.isSystem}, '\${cf.status}', NOW(), NOW());\`);
  });

  // 写入
  fs.appendFileSync('$OUTPUT', sql.join('\\n'), 'utf-8');

  console.log('');
  console.log('✓ 数据导出完成');

  await prisma.\$disconnect();
})();
" 2>&1

echo ""
echo "【步骤 3/3】添加序列重置..."
echo "
-- ========================================
-- 重置序列
-- ========================================

SELECT setval('\"User_id_seq\"', (SELECT MAX(id) FROM \"User\"), true);
SELECT setval('\"Role_id_seq\"', (SELECT MAX(id) FROM \"Role\"), true);
SELECT setval('\"UserRole_id_seq\"', (SELECT MAX(id) FROM \"UserRole\"), true);
SELECT setval('\"Organization_id_seq\"', (SELECT MAX(id) FROM \"Organization\"), true);
SELECT setval('\"Employee_id_seq\"', (SELECT MAX(id) FROM \"Employee\"), true);
SELECT setval('\"DataSource_id_seq\"', (SELECT MAX(id) FROM \"DataSource\"), true);
SELECT setval('\"Shift_id_seq\"', (SELECT MAX(id) FROM \"Shift\"), true);
SELECT setval('\"ShiftProperty_id_seq\"', (SELECT MAX(id) FROM \"ShiftProperty\"), true);
SELECT setval('\"PunchDevice_id_seq\"', (SELECT MAX(id) FROM \"PunchDevice\"), true);
SELECT setval('\"EmployeeInfoTab_id_seq\"', (SELECT MAX(id) FROM \"EmployeeInfoTab\"), true);
SELECT setval('\"EmployeeInfoTabGroup_id_seq\"', (SELECT MAX(id) FROM \"EmployeeInfoTabGroup\"), true);
SELECT setval('\"EmployeeInfoTabField_id_seq\"', (SELECT MAX(id) FROM \"EmployeeInfoTabField\"), true);
SELECT setval('\"CustomField_id_seq\"', (SELECT MAX(id) FROM \"CustomField\"), true);
" >> "$OUTPUT"

# 完成
echo ""
echo "========================================"
echo "✓ PostgreSQL完整迁移脚本生成完成！"
echo "========================================"
ls -lh "$OUTPUT"
echo ""
echo "使用方法:"
echo "  psql -U username -d database_name -f $OUTPUT"
echo "========================================"
