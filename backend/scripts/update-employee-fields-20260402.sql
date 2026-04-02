-- ====================================================================
-- 数据库迁移脚本：员工字段配置更新
-- 版本：20260402
-- 描述：修复员工信息系统中字段验证和显示问题
-- ====================================================================

-- 1. 修改 Employee 表：将 name 和 gender 字段改为可选
-- ====================================================================

-- 检查字段是否已经为可选，如果为 NOT NULL 则需要修改
-- SQLite 不支持 ALTER COLUMN，需要重建表

BEGIN TRANSACTION;

-- 创建新的 Employee 表（name 和 gender 可选）
CREATE TABLE Employee_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeNo TEXT NOT NULL UNIQUE,
    name TEXT,
    gender TEXT,
    idCard TEXT UNIQUE,
    phone TEXT,
    email TEXT,
    orgId INTEGER NOT NULL,
    position TEXT,
    jobLevel TEXT,
    employeeType TEXT,
    workLocation TEXT,
    workAddress TEXT,
    entryDate DATETIME NOT NULL,
    hireDate DATETIME,
    birthDate DATETIME,
    age INTEGER,
    maritalStatus TEXT,
    nativePlace TEXT,
    politicalStatus TEXT,
    householdRegister TEXT,
    currentAddress TEXT,
    photo TEXT,
    emergencyContact TEXT,
    emergencyPhone TEXT,
    emergencyRelation TEXT,
    homeAddress TEXT,
    homePhone TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    customFields TEXT DEFAULT '{}',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (orgId) REFERENCES Organization(id)
);

-- 从旧表复制数据
INSERT INTO Employee_new (
    id, employeeNo, name, gender, idCard, phone, email, orgId,
    position, jobLevel, employeeType, workLocation, workAddress,
    entryDate, hireDate, birthDate, age, maritalStatus, nativePlace,
    politicalStatus, householdRegister, currentAddress, photo,
    emergencyContact, emergencyPhone, emergencyRelation,
    homeAddress, homePhone, status, customFields, createdAt, updatedAt
)
SELECT
    id, employeeNo, name, gender, idCard, phone, email, orgId,
    position, jobLevel, employeeType, workLocation, workAddress,
    entryDate, hireDate, birthDate, age, maritalStatus, nativePlace,
    politicalStatus, householdRegister, currentAddress, photo,
    emergencyContact, emergencyPhone, emergencyRelation,
    homeAddress, homePhone, status, customFields, createdAt, updatedAt
FROM Employee;

-- 删除旧表
DROP TABLE Employee;

-- 重命名新表
ALTER TABLE Employee_new RENAME TO Employee;

-- 重建索引
CREATE INDEX idx_employee_orgId ON Employee(orgId);
CREATE INDEX idx_employee_status ON Employee(status);
CREATE INDEX idx_employee_entryDate ON Employee(entryDate);

COMMIT;

-- ====================================================================
-- 2. 更新 EmployeeInfoTabField 的 dataSourceId
-- ====================================================================

-- 更新紧急联系人关系字段的数据源
UPDATE EmployeeInfoTabField
SET dataSourceId = 19
WHERE fieldCode = 'emergencyRelation'
  AND dataSourceId IS NULL;

-- 更新职级字段的数据源
UPDATE EmployeeInfoTabField
SET dataSourceId = 13
WHERE fieldCode = 'jobLevel'
  AND dataSourceId IS NULL;

-- 更新在职状态字段的数据源
UPDATE EmployeeInfoTabField
SET dataSourceId = 15
WHERE fieldCode = 'status'
  AND dataSourceId IS NULL;

-- ====================================================================
-- 3. 验证数据完整性
-- ====================================================================

-- 检查 Employee 表结构
PRAGMA table_info(Employee);

-- 检查 dataSourceId 更新结果
SELECT
    fieldCode,
    fieldName,
    dataSourceId,
    (SELECT name FROM DataSource WHERE id = EmployeeInfoTabField.dataSourceId) as dataSourceName
FROM EmployeeInfoTabField
WHERE fieldCode IN ('emergencyRelation', 'jobLevel', 'status', 'nation')
ORDER BY fieldCode;

-- ====================================================================
-- 4. 回滚脚本（仅在需要时使用）
-- ====================================================================

/*
-- 回滚步骤 1：恢复 Employee 表（如果需要）
BEGIN TRANSACTION;
CREATE TABLE Employee_backup AS SELECT * FROM Employee;
-- ... 恢复原始结构 ...
COMMIT;

-- 回滚步骤 2：恢复 dataSourceId
UPDATE EmployeeInfoTabField
SET dataSourceId = NULL
WHERE fieldCode IN ('emergencyRelation', 'jobLevel', 'status');
*/

-- ====================================================================
-- 说明：
-- 1. 本次迁移将 Employee 表的 name 和 gender 字段改为可选，允许创建员工时不填写这些信息
-- 2. 更新了关键字段的数据源关联，确保下拉选项正确显示
-- 3. 建议在执行前备份数据库
-- ====================================================================
