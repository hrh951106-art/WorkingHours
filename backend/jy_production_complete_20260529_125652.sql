-- ==========================================
-- 精益工时管理系统 - PostgreSQL 完整数据库
-- 生成时间: 2026-05-29 12:56:52
-- 表数量: 87
-- ==========================================

-- 设置客户端编码
SET client_encoding = 'UTF8';

-- 禁用触发器加速导入
SET session_replication_role = 'replication';

-- 开始事务
BEGIN;

-- ==========================================
-- 表结构定义
-- ==========================================

-- Table: AccountHierarchyConfig
DROP TABLE IF EXISTS "AccountHierarchyConfig" CASCADE;
CREATE TABLE "AccountHierarchyConfig" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL,
    "parentLevelId" INTEGER,
    "parentLevelName" TEXT,
    "mappingType" TEXT,
    "mappingValue" TEXT,
    "dataSourceId" INTEGER,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: AccountHierarchyLevelDetail
DROP TABLE IF EXISTS "AccountHierarchyLevelDetail" CASCADE;
CREATE TABLE "AccountHierarchyLevelDetail" (
    "id" SERIAL,
    "configId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "levelName" TEXT NOT NULL,
    "levelCode" TEXT,
    "parentLevelId" INTEGER,
    "parentLevelName" TEXT,
    "accountCodePrefix" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: AllocationBasis
DROP TABLE IF EXISTS "AllocationBasis" CASCADE;
CREATE TABLE "AllocationBasis" (
    "id" SERIAL,
    "basisCode" TEXT NOT NULL,
    "basisName" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'SYSTEM',
    "sourceTable" TEXT,
    "calcFormula" TEXT,
    "dataType" TEXT NOT NULL,
    "precision" INTEGER NOT NULL DEFAULT 2,
    "unit" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ENABLED',
    "description" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: AllocationConfig
DROP TABLE IF EXISTS "AllocationConfig" CASCADE;
CREATE TABLE "AllocationConfig" (
    "id" SERIAL,
    "configCode" TEXT NOT NULL,
    "configName" TEXT NOT NULL,
    "orgId" INTEGER NOT NULL,
    "orgPath" TEXT,
    "effectiveStartTime" TIMESTAMP NOT NULL,
    "effectiveEndTime" TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentConfigId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" INTEGER,
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP NOT NULL,
    "approvedById" INTEGER,
    "approvedByName" TEXT,
    "approvedAt" TIMESTAMP,
    "deletedAt" TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: AllocationGeneralConfig
DROP TABLE IF EXISTS "AllocationGeneralConfig" CASCADE;
CREATE TABLE "AllocationGeneralConfig" (
    "id" SERIAL,
    "actualHoursAllocationCode" TEXT NOT NULL,
    "indirectHoursAllocationCode" TEXT NOT NULL,
    "description" TEXT,
    "updatedById" INTEGER,
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: AllocationResult
DROP TABLE IF EXISTS "AllocationResult" CASCADE;
CREATE TABLE "AllocationResult" (
    "id" SERIAL,
    "batchNo" TEXT NOT NULL,
    "recordDate" TIMESTAMP NOT NULL,
    "calcResultId" INTEGER NOT NULL,
    "configId" INTEGER NOT NULL,
    "configVersion" INTEGER NOT NULL,
    "ruleId" INTEGER NOT NULL,
    "sourceEmployeeNo" TEXT,
    "sourceEmployeeName" TEXT,
    "sourceAccountId" INTEGER,
    "sourceAccountName" TEXT,
    "attendanceCodeId" INTEGER,
    "attendanceCode" TEXT,
    "sourceHours" DOUBLE PRECISION NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "targetName" TEXT NOT NULL,
    "targetAccountId" INTEGER,
    "allocationBasis" TEXT NOT NULL,
    "basisValue" DOUBLE PRECISION NOT NULL,
    "weightValue" DOUBLE PRECISION NOT NULL,
    "allocationRatio" DOUBLE PRECISION NOT NULL,
    "allocatedHours" DOUBLE PRECISION NOT NULL,
    "calcTime" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: AllocationRuleConfig
DROP TABLE IF EXISTS "AllocationRuleConfig" CASCADE;
CREATE TABLE "AllocationRuleConfig" (
    "id" SERIAL,
    "configId" INTEGER NOT NULL,
    "ruleName" TEXT,
    "ruleType" TEXT NOT NULL,
    "allocationBasis" TEXT NOT NULL,
    "allocationAttendanceCodes" TEXT NOT NULL DEFAULT '[]',
    "allocationHierarchyLevels" TEXT NOT NULL DEFAULT '[]',
    "allocationScopeId" INTEGER,
    "basisFilter" TEXT NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "effectiveStartTime" TIMESTAMP,
    "effectiveEndTime" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: AllocationRuleTarget
DROP TABLE IF EXISTS "AllocationRuleTarget" CASCADE;
CREATE TABLE "AllocationRuleTarget" (
    "id" SERIAL,
    "ruleId" INTEGER NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "targetName" TEXT NOT NULL,
    "targetCode" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetAccountId" INTEGER,
    "targetAccountName" TEXT,
    PRIMARY KEY ("id")
);

-- Table: AllocationSourceConfig
DROP TABLE IF EXISTS "AllocationSourceConfig" CASCADE;
CREATE TABLE "AllocationSourceConfig" (
    "id" SERIAL,
    "configId" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'EMPLOYEE_HOURS',
    "employeeFilter" TEXT NOT NULL DEFAULT '{}',
    "accountFilter" TEXT NOT NULL DEFAULT '{}',
    "attendanceCodes" TEXT NOT NULL DEFAULT '[]',
    "description" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: AllocationWorkHour
DROP TABLE IF EXISTS "AllocationWorkHour" CASCADE;
CREATE TABLE "AllocationWorkHour" (
    "id" SERIAL,
    "batchNo" TEXT NOT NULL,
    "recordDate" TIMESTAMP NOT NULL,
    "configId" INTEGER NOT NULL,
    "sourceEmployeeNo" TEXT,
    "sourceEmployeeName" TEXT,
    "sourceAccountId" INTEGER,
    "sourceAccountName" TEXT,
    "attendanceCodeId" INTEGER,
    "attendanceCode" TEXT,
    "sourceHours" DOUBLE PRECISION NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "targetName" TEXT NOT NULL,
    "targetAccountId" INTEGER,
    "allocatedHours" DOUBLE PRECISION NOT NULL,
    "calcTime" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP,
    "definitionAttendanceCodeId" INTEGER,
    PRIMARY KEY ("id")
);

-- Table: AmountPolicy
DROP TABLE IF EXISTS "AmountPolicy" CASCADE;
CREATE TABLE "AmountPolicy" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "policyType" TEXT NOT NULL DEFAULT 'ADD',
    "multiplier" DOUBLE PRECISION,
    "fixedValue" DOUBLE PRECISION,
    "accountPath" TEXT NOT NULL,
    "accountPathMatch" TEXT NOT NULL DEFAULT 'EXACT',
    "attendanceCodes" TEXT NOT NULL DEFAULT '[]',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" INTEGER,
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: AmountPolicyGroup
DROP TABLE IF EXISTS "AmountPolicyGroup" CASCADE;
CREATE TABLE "AmountPolicyGroup" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "policyIds" TEXT NOT NULL DEFAULT '[]',
    "policies" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" INTEGER,
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: AttendanceCode
DROP TABLE IF EXISTS "AttendanceCode" CASCADE;
CREATE TABLE "AttendanceCode" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'LEAN_HOURS',
    "accountLevels" TEXT NOT NULL DEFAULT '[]',
    "unit" TEXT NOT NULL DEFAULT 'HOURS',
    "deductMeal" BOOLEAN NOT NULL DEFAULT false,
    "includeOutside" BOOLEAN NOT NULL DEFAULT false,
    "onlyOutside" BOOLEAN NOT NULL DEFAULT false,
    "showInDetailPage" BOOLEAN NOT NULL DEFAULT false,
    "calculateHours" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: AttendancePunchPair
DROP TABLE IF EXISTS "AttendancePunchPair" CASCADE;
CREATE TABLE "AttendancePunchPair" (
    "id" SERIAL,
    "employeeNo" TEXT NOT NULL,
    "employeeName" TEXT,
    "punchDate" TIMESTAMP NOT NULL,
    "workStartPunches" TEXT,
    "workStartPunchTime" TIMESTAMP,
    "workEndPunches" TEXT,
    "workEndPunchTime" TIMESTAMP,
    "workStartDeviceId" INTEGER,
    "workEndDeviceId" INTEGER,
    "workStartShiftId" INTEGER,
    "workEndShiftId" INTEGER,
    "workStartShiftName" TEXT,
    "workEndShiftName" TEXT,
    "accountId" INTEGER,
    "ruleGroupId" INTEGER,
    "ruleId" INTEGER,
    "ruleName" TEXT,
    "ruleType" TEXT DEFAULT 'ATTENDANCE_PAIRING',
    "isContinuousShift" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: AttendanceRuleGroup
DROP TABLE IF EXISTS "AttendanceRuleGroup" CASCADE;
CREATE TABLE "AttendanceRuleGroup" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" INTEGER,
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: AttendanceRuleGroupDetail
DROP TABLE IF EXISTS "AttendanceRuleGroupDetail" CASCADE;
CREATE TABLE "AttendanceRuleGroupDetail" (
    "id" SERIAL,
    "ruleGroupId" INTEGER NOT NULL,
    "ruleName" TEXT NOT NULL,
    "attendanceCodeIds" TEXT NOT NULL DEFAULT '[]',
    "amountPolicyIds" TEXT NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "attendancePunchRuleId" INTEGER,
    "leanPunchRuleId" INTEGER,
    PRIMARY KEY ("id")
);

-- Table: AuditLog
DROP TABLE IF EXISTS "AuditLog" CASCADE;
CREATE TABLE "AuditLog" (
    "id" SERIAL,
    "module" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "operationDesc" TEXT NOT NULL,
    "targetId" INTEGER,
    "targetType" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "requestIp" TEXT,
    "operatorId" INTEGER NOT NULL,
    "operatorName" TEXT NOT NULL,
    "operationTime" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" TEXT NOT NULL,
    "errorMsg" TEXT,
    PRIMARY KEY ("id")
);

-- Table: BiReport
DROP TABLE IF EXISTS "BiReport" CASCADE;
CREATE TABLE "BiReport" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "modelId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" INTEGER,
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: BiReportAccessLog
DROP TABLE IF EXISTS "BiReportAccessLog" CASCADE;
CREATE TABLE "BiReportAccessLog" (
    "id" SERIAL,
    "reportId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "userName" TEXT,
    "accessType" TEXT NOT NULL,
    "accessTime" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    PRIMARY KEY ("id")
);

-- Table: BiReportParameter
DROP TABLE IF EXISTS "BiReportParameter" CASCADE;
CREATE TABLE "BiReportParameter" (
    "id" SERIAL,
    "reportId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parameterType" TEXT NOT NULL,
    "defaultValue" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "config" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    "sortNo" INTEGER DEFAULT 0,
    PRIMARY KEY ("id")
);

-- Table: BiReportWidget
DROP TABLE IF EXISTS "BiReportWidget" CASCADE;
CREATE TABLE "BiReportWidget" (
    "id" SERIAL,
    "reportId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "widgetType" TEXT NOT NULL,
    "dataSource" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "position" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    "queryConfig" TEXT DEFAULT '{}',
    "style" TEXT DEFAULT '{}',
    "title" TEXT,
    "type" TEXT,
    PRIMARY KEY ("id")
);

-- Table: CalcResult
DROP TABLE IF EXISTS "CalcResult" CASCADE;
CREATE TABLE "CalcResult" (
    "id" SERIAL,
    "employeeNo" TEXT NOT NULL,
    "calcDate" TIMESTAMP NOT NULL,
    "shiftId" INTEGER,
    "shiftName" TEXT,
    "attendanceCodeId" INTEGER,
    "calculationAttendanceCodeId" INTEGER,
    "punchInTime" TIMESTAMP,
    "punchOutTime" TIMESTAMP,
    "standardHours" DOUBLE PRECISION NOT NULL,
    "actualHours" DOUBLE PRECISION NOT NULL,
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leaveHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "absenceHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accountHours" TEXT NOT NULL DEFAULT '[]',
    "exceptions" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "accountId" INTEGER,
    "accountName" TEXT,
    "accountPath" TEXT,
    "amount" DOUBLE PRECISION,
    PRIMARY KEY ("id")
);

-- Table: CalcRule
DROP TABLE IF EXISTS "CalcRule" CASCADE;
CREATE TABLE "CalcRule" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "conditions" TEXT NOT NULL,
    "calcLogic" TEXT NOT NULL,
    "overtimeRules" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: CalculationAttendanceCode
DROP TABLE IF EXISTS "CalculationAttendanceCode" CASCADE;
CREATE TABLE "CalculationAttendanceCode" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'LEAN_HOURS',
    "accountLevels" TEXT NOT NULL DEFAULT '[]',
    "unit" TEXT NOT NULL DEFAULT 'HOURS',
    "deductMeal" BOOLEAN NOT NULL DEFAULT false,
    "includeOutside" BOOLEAN NOT NULL DEFAULT false,
    "onlyOutside" BOOLEAN NOT NULL DEFAULT false,
    "showInDetailPage" BOOLEAN NOT NULL DEFAULT false,
    "showInAttendancePage" BOOLEAN NOT NULL DEFAULT false,
    "calculateHours" BOOLEAN NOT NULL DEFAULT true,
    "calculateAmount" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "definitionAttendanceCode" TEXT,
    "definitionAttendanceCodeId" INTEGER,
    "definitionAttendanceCodeStr" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: CustomField
DROP TABLE IF EXISTS "CustomField" CASCADE;
CREATE TABLE "CustomField" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dataSourceId" INTEGER,
    "options" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,
    "group" TEXT NOT NULL DEFAULT '默认分组',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY ("id")
);

-- Table: DataScopeRule
DROP TABLE IF EXISTS "DataScopeRule" CASCADE;
CREATE TABLE "DataScopeRule" (
    "id" SERIAL,
    "roleId" INTEGER NOT NULL,
    "ruleType" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "orgId" INTEGER,
    "includeChild" BOOLEAN NOT NULL DEFAULT false,
    "condition" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: DataSource
DROP TABLE IF EXISTS "DataSource" CASCADE;
CREATE TABLE "DataSource" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CUSTOM',
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: DataSourceOption
DROP TABLE IF EXISTS "DataSourceOption" CASCADE;
CREATE TABLE "DataSourceOption" (
    "id" SERIAL,
    "dataSourceId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: DefinitionAttendanceCode
DROP TABLE IF EXISTS "DefinitionAttendanceCode" CASCADE;
CREATE TABLE "DefinitionAttendanceCode" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "type" TEXT,
    "priority" INTEGER DEFAULT 0,
    "unit" TEXT DEFAULT 'HOURS',
    "calculateHours" BOOLEAN NOT NULL DEFAULT true,
    "deductMealTime" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "showInAttendanceCard" BOOLEAN NOT NULL DEFAULT false,
    "showInDetailPage" BOOLEAN NOT NULL DEFAULT false,
    "calcAttendanceCode" TEXT,
    "calculationAttendanceCode" TEXT,
    "definitionAttendanceCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: DeviceAccount
DROP TABLE IF EXISTS "DeviceAccount" CASCADE;
CREATE TABLE "DeviceAccount" (
    "id" SERIAL,
    "deviceId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "effectiveDate" TIMESTAMP NOT NULL,
    "expiryDate" TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "path" TEXT,
    "namePath" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: DeviceGroup
DROP TABLE IF EXISTS "DeviceGroup" CASCADE;
CREATE TABLE "DeviceGroup" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: EarnedHoursAllocationConfig
DROP TABLE IF EXISTS "EarnedHoursAllocationConfig" CASCADE;
CREATE TABLE "EarnedHoursAllocationConfig" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "configName" TEXT,
    "description" TEXT,
    "orgId" INTEGER NOT NULL,
    "orgPath" TEXT,
    "effectiveStartTime" TIMESTAMP NOT NULL,
    "effectiveEndTime" TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" INTEGER,
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP NOT NULL,
    "approvedById" INTEGER,
    "approvedByName" TEXT,
    "approvedAt" TIMESTAMP,
    "deletedAt" TIMESTAMP,
    "rules" TEXT NOT NULL DEFAULT '[]',
    "sourceConfig" TEXT DEFAULT '{}',
    PRIMARY KEY ("id")
);

-- Table: EarnedHoursAllocationResult
DROP TABLE IF EXISTS "EarnedHoursAllocationResult" CASCADE;
CREATE TABLE "EarnedHoursAllocationResult" (
    "id" SERIAL,
    "batchNo" TEXT NOT NULL,
    "recordDate" TIMESTAMP NOT NULL,
    "configId" INTEGER NOT NULL,
    "configVersion" INTEGER NOT NULL,
    "ruleName" TEXT,
    "sourceEmployeeNo" TEXT,
    "sourceEmployeeName" TEXT,
    "sourceAccountId" INTEGER,
    "sourceAccountName" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "targetName" TEXT NOT NULL,
    "targetAccountId" INTEGER,
    "targetAccountName" TEXT,
    "sourceHours" DOUBLE PRECISION NOT NULL,
    "allocatedHours" DOUBLE PRECISION NOT NULL,
    "allocationRatio" DOUBLE PRECISION,
    "calcResultId" INTEGER,
    "calcTime" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: Employee
DROP TABLE IF EXISTS "Employee" CASCADE;
CREATE TABLE "Employee" (
    "id" SERIAL,
    "employeeNo" TEXT NOT NULL,
    "name" TEXT,
    "gender" TEXT,
    "idCard" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "orgId" INTEGER NOT NULL,
    "entryDate" TIMESTAMP NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "customFields" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "age" INTEGER,
    "birthDate" TIMESTAMP,
    "currentAddress" TEXT,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "emergencyRelation" TEXT,
    "homeAddress" TEXT,
    "homePhone" TEXT,
    "householdRegister" TEXT,
    "maritalStatus" TEXT,
    "nativePlace" TEXT,
    "photo" TEXT,
    "politicalStatus" TEXT,
    PRIMARY KEY ("id")
);

-- Table: EmployeeAttendanceRuleGroup
DROP TABLE IF EXISTS "EmployeeAttendanceRuleGroup" CASCADE;
CREATE TABLE "EmployeeAttendanceRuleGroup" (
    "id" SERIAL,
    "employeeNo" TEXT NOT NULL,
    "employeeName" TEXT,
    "ruleGroupId" INTEGER NOT NULL,
    "ruleGroupName" TEXT,
    "effectiveDate" TIMESTAMP NOT NULL,
    "expiryDate" TIMESTAMP,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: EmployeeChangeLog
DROP TABLE IF EXISTS "EmployeeChangeLog" CASCADE;
CREATE TABLE "EmployeeChangeLog" (
    "id" SERIAL,
    "employeeId" INTEGER NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "operatorId" INTEGER NOT NULL,
    "operatorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: EmployeeCoefficient
DROP TABLE IF EXISTS "EmployeeCoefficient" CASCADE;
CREATE TABLE "EmployeeCoefficient" (
    "id" SERIAL,
    "employeeNo" TEXT NOT NULL,
    "employeeName" TEXT,
    "coefficientType" TEXT NOT NULL,
    "coefficient" DOUBLE PRECISION NOT NULL,
    "effectiveDate" TIMESTAMP NOT NULL,
    "expiryDate" TIMESTAMP,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" INTEGER,
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: EmployeeEducation
DROP TABLE IF EXISTS "EmployeeEducation" CASCADE;
CREATE TABLE "EmployeeEducation" (
    "id" SERIAL,
    "employeeId" INTEGER NOT NULL,
    "school" TEXT NOT NULL,
    "major" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "educationLevel" TEXT NOT NULL,
    "startDate" TIMESTAMP NOT NULL,
    "endDate" TIMESTAMP,
    "isHighest" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "degreeNo" TEXT,
    "diplomaNo" TEXT,
    "educationType" TEXT,
    "graduationDate" TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: EmployeeFamilyMember
DROP TABLE IF EXISTS "EmployeeFamilyMember" CASCADE;
CREATE TABLE "EmployeeFamilyMember" (
    "id" SERIAL,
    "employeeId" INTEGER NOT NULL,
    "relationship" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT,
    "idCard" TEXT,
    "phone" TEXT,
    "workUnit" TEXT,
    "dateOfBirth" TIMESTAMP,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "address" TEXT,
    "age" INTEGER,
    PRIMARY KEY ("id")
);

-- Table: EmployeeInfoTab
DROP TABLE IF EXISTS "EmployeeInfoTab" CASCADE;
CREATE TABLE "EmployeeInfoTab" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: EmployeeInfoTabField
DROP TABLE IF EXISTS "EmployeeInfoTabField" CASCADE;
CREATE TABLE "EmployeeInfoTabField" (
    "id" SERIAL,
    "tabId" INTEGER NOT NULL,
    "groupId" INTEGER,
    "fieldCode" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "dataSourceId" INTEGER,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: EmployeeInfoTabGroup
DROP TABLE IF EXISTS "EmployeeInfoTabGroup" CASCADE;
CREATE TABLE "EmployeeInfoTabGroup" (
    "id" SERIAL,
    "tabId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "collapsed" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: EmployeeLaborAccount
DROP TABLE IF EXISTS "EmployeeLaborAccount" CASCADE;
CREATE TABLE "EmployeeLaborAccount" (
    "id" SERIAL,
    "employeeNo" TEXT NOT NULL,
    "employeeId" INTEGER,
    "accountId" INTEGER NOT NULL,
    "effectiveDate" TIMESTAMP NOT NULL,
    "expiryDate" TIMESTAMP,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: EmployeeWorkExperience
DROP TABLE IF EXISTS "EmployeeWorkExperience" CASCADE;
CREATE TABLE "EmployeeWorkExperience" (
    "id" SERIAL,
    "employeeId" INTEGER NOT NULL,
    "company" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "startDate" TIMESTAMP NOT NULL,
    "endDate" TIMESTAMP,
    "description" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "reason" TEXT,
    "salary" TEXT,
    PRIMARY KEY ("id")
);

-- Table: LaborAccount
DROP TABLE IF EXISTS "LaborAccount" CASCADE;
CREATE TABLE "LaborAccount" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "namePath" TEXT,
    "accountPath" TEXT,
    "level" INTEGER NOT NULL,
    "parentId" INTEGER,
    "parentPath" TEXT,
    "orgId" INTEGER,
    "orgName" TEXT,
    "orgPath" TEXT,
    "type" TEXT,
    "usageType" TEXT DEFAULT 'PRODUCTION',
    "employeeId" INTEGER,
    "effectiveDate" TIMESTAMP,
    "expiryDate" TIMESTAMP,
    "hierarchyValues" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: LaborHourReportEmployee
DROP TABLE IF EXISTS "LaborHourReportEmployee" CASCADE;
CREATE TABLE "LaborHourReportEmployee" (
    "id" SERIAL,
    "requestId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "employeeNo" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: LaborHourReportRequest
DROP TABLE IF EXISTS "LaborHourReportRequest" CASCADE;
CREATE TABLE "LaborHourReportRequest" (
    "id" SERIAL,
    "requestNo" TEXT NOT NULL,
    "workflowCode" TEXT NOT NULL DEFAULT 'LABOR_HOUR_REPORT',
    "title" TEXT NOT NULL,
    "reportDate" TIMESTAMP NOT NULL,
    "reportMode" TEXT NOT NULL DEFAULT 'personal',
    "employeeId" INTEGER,
    "employeeNo" TEXT,
    "employeeName" TEXT,
    "hourType" TEXT NOT NULL,
    "hourTypeName" TEXT NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '小时',
    "description" TEXT,
    "accountId" INTEGER NOT NULL,
    "accountCode" TEXT NOT NULL,
    "accountPath" TEXT NOT NULL DEFAULT '',
    "accountName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requesterId" INTEGER NOT NULL,
    "requesterName" TEXT NOT NULL,
    "approverId" INTEGER,
    "approverName" TEXT,
    "approvedAt" TIMESTAMP,
    "approvalComment" TEXT,
    "instanceId" INTEGER,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: LineShift
DROP TABLE IF EXISTS "LineShift" CASCADE;
CREATE TABLE "LineShift" (
    "id" SERIAL,
    "orgId" INTEGER NOT NULL,
    "orgName" TEXT NOT NULL,
    "shiftId" INTEGER NOT NULL,
    "shiftName" TEXT NOT NULL,
    "scheduleDate" TIMESTAMP NOT NULL,
    "startTime" TIMESTAMP NOT NULL,
    "endTime" TIMESTAMP NOT NULL,
    "plannedProducts" TEXT NOT NULL,
    "participateInAllocation" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    "delayedShutdownTime" INTEGER,
    "accountId" INTEGER,
    "accountName" TEXT,
    PRIMARY KEY ("id")
);

-- Table: Organization
DROP TABLE IF EXISTS "Organization" CASCADE;
CREATE TABLE "Organization" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" INTEGER,
    "type" TEXT NOT NULL,
    "leaderId" INTEGER,
    "leaderName" TEXT,
    "level" INTEGER NOT NULL,
    "effectiveDate" TIMESTAMP NOT NULL,
    "expiryDate" TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: ParticipantConfig
DROP TABLE IF EXISTS "ParticipantConfig" CASCADE;
CREATE TABLE "ParticipantConfig" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "participants" TEXT NOT NULL DEFAULT '[]',
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "config" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: PersonalProductionRecord
DROP TABLE IF EXISTS "PersonalProductionRecord" CASCADE;
CREATE TABLE "PersonalProductionRecord" (
    "id" SERIAL,
    "recordDate" TIMESTAMP NOT NULL,
    "employeeNo" TEXT NOT NULL,
    "employeeName" TEXT,
    "orgId" INTEGER NOT NULL,
    "orgName" TEXT NOT NULL,
    "lineId" INTEGER,
    "lineName" TEXT,
    "shiftId" INTEGER,
    "shiftName" TEXT,
    "productId" INTEGER,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "actualQty" DOUBLE PRECISION NOT NULL,
    "standardHours" DOUBLE PRECISION NOT NULL,
    "earnedHours" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "recorderId" INTEGER NOT NULL,
    "recorderName" TEXT NOT NULL,
    "recordedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: Process
DROP TABLE IF EXISTS "Process" CASCADE;
CREATE TABLE "Process" (
    "id" SERIAL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: Product
DROP TABLE IF EXISTS "Product" CASCADE;
CREATE TABLE "Product" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specification" TEXT,
    "unit" TEXT NOT NULL DEFAULT '件',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "standardHours" DOUBLE PRECISION NOT NULL,
    "conversionFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "description" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" INTEGER,
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: ProductStandardHourByLevel
DROP TABLE IF EXISTS "ProductStandardHourByLevel" CASCADE;
CREATE TABLE "ProductStandardHourByLevel" (
    "id" SERIAL,
    "productId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "accountLevel" TEXT NOT NULL,
    "accountPath" TEXT,
    "standardHours" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION,
    "effectiveDate" TIMESTAMP NOT NULL,
    "expiryDate" TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: ProductStandardHours
DROP TABLE IF EXISTS "ProductStandardHours" CASCADE;
CREATE TABLE "ProductStandardHours" (
    "id" SERIAL,
    "productId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "processId" INTEGER,
    "processName" TEXT,
    "standardHours" DOUBLE PRECISION NOT NULL,
    "effectiveDate" TIMESTAMP NOT NULL,
    "expiryDate" TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: ProductionLine
DROP TABLE IF EXISTS "ProductionLine" CASCADE;
CREATE TABLE "ProductionLine" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orgId" INTEGER NOT NULL,
    "orgName" TEXT NOT NULL,
    "workshopId" INTEGER,
    "workshopName" TEXT,
    "type" TEXT NOT NULL,
    "capacity" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" INTEGER,
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: ProductionRecord
DROP TABLE IF EXISTS "ProductionRecord" CASCADE;
CREATE TABLE "ProductionRecord" (
    "id" SERIAL,
    "recordDate" TIMESTAMP NOT NULL,
    "orgId" INTEGER NOT NULL,
    "orgName" TEXT NOT NULL,
    "lineId" INTEGER,
    "lineName" TEXT,
    "shiftId" INTEGER,
    "shiftName" TEXT,
    "productId" INTEGER,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "plannedQty" DOUBLE PRECISION NOT NULL,
    "actualQty" DOUBLE PRECISION NOT NULL,
    "qualifiedQty" DOUBLE PRECISION NOT NULL,
    "unqualifiedQty" DOUBLE PRECISION,
    "standardHours" DOUBLE PRECISION NOT NULL,
    "totalStdHours" DOUBLE PRECISION NOT NULL,
    "workHours" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "recorderId" INTEGER NOT NULL,
    "recorderName" TEXT NOT NULL,
    "recordedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: ProductionReportRequest
DROP TABLE IF EXISTS "ProductionReportRequest" CASCADE;
CREATE TABLE "ProductionReportRequest" (
    "id" SERIAL,
    "requestNo" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PRODUCTION',
    "employeeNo" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "orgId" INTEGER NOT NULL,
    "orgName" TEXT NOT NULL,
    "reportDate" TIMESTAMP NOT NULL,
    "shiftId" INTEGER,
    "shiftName" TEXT,
    "lineId" INTEGER,
    "lineName" TEXT,
    "productId" INTEGER NOT NULL,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "plannedQty" DOUBLE PRECISION NOT NULL,
    "actualQty" DOUBLE PRECISION NOT NULL,
    "qualifiedQty" DOUBLE PRECISION NOT NULL,
    "unqualifiedQty" DOUBLE PRECISION NOT NULL,
    "standardHours" DOUBLE PRECISION NOT NULL,
    "workHours" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requesterId" INTEGER NOT NULL,
    "requesterName" TEXT NOT NULL,
    "approverId" INTEGER,
    "approverName" TEXT,
    "approvedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: PunchDevice
DROP TABLE IF EXISTS "PunchDevice" CASCADE;
CREATE TABLE "PunchDevice" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ipAddress" TEXT,
    "groupId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: PunchPair
DROP TABLE IF EXISTS "PunchPair" CASCADE;
CREATE TABLE "PunchPair" (
    "id" SERIAL,
    "employeeNo" TEXT NOT NULL,
    "pairDate" TIMESTAMP NOT NULL,
    "shiftId" INTEGER,
    "shiftName" TEXT,
    "inPunchId" INTEGER,
    "outPunchId" INTEGER,
    "inPunchTime" TIMESTAMP,
    "outPunchTime" TIMESTAMP,
    "workHours" DOUBLE PRECISION NOT NULL,
    "sourceGroupId" INTEGER,
    "accountId" INTEGER,
    "accountName" TEXT,
    "accountPath" TEXT,
    "workStartPunchTime" TIMESTAMP,
    "workEndPunchTime" TIMESTAMP,
    "workStartPunches" TEXT,
    "workEndPunches" TEXT,
    "workStartPunchId" INTEGER,
    "workEndPunchId" INTEGER,
    "workStartShiftId" INTEGER,
    "workStartShiftName" TEXT,
    "workEndShiftId" INTEGER,
    "workEndShiftName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: PunchRecord
DROP TABLE IF EXISTS "PunchRecord" CASCADE;
CREATE TABLE "PunchRecord" (
    "id" SERIAL,
    "employeeNo" TEXT NOT NULL,
    "punchTime" TIMESTAMP NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "punchType" TEXT NOT NULL,
    "location" TEXT,
    "source" TEXT NOT NULL DEFAULT 'AUTO',
    "accountId" INTEGER,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: PunchRule
DROP TABLE IF EXISTS "PunchRule" CASCADE;
CREATE TABLE "PunchRule" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "ruleType" TEXT NOT NULL DEFAULT 'LEAN_PAIRING',
    "conditions" TEXT NOT NULL,
    "beforeShiftMins" INTEGER NOT NULL DEFAULT 0,
    "afterShiftMins" INTEGER NOT NULL DEFAULT 0,
    "configs" TEXT NOT NULL DEFAULT '[]',
    "scheduledConfig" TEXT DEFAULT '{}',
    "unscheduledConfig" TEXT DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: PunchRuleDeviceGroupInterval
DROP TABLE IF EXISTS "PunchRuleDeviceGroupInterval" CASCADE;
CREATE TABLE "PunchRuleDeviceGroupInterval" (
    "id" SERIAL,
    "deviceGroupId" INTEGER NOT NULL,
    "ruleId" INTEGER,
    "deviceGroupCode" TEXT,
    "deviceGroupName" TEXT,
    "beforeShiftMins" INTEGER NOT NULL DEFAULT 0,
    "afterShiftMins" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: ReportDataModel
DROP TABLE IF EXISTS "ReportDataModel" CASCADE;
CREATE TABLE "ReportDataModel" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" INTEGER,
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    "dataSource" TEXT,
    "sourceSql" TEXT,
    "sourceTable" TEXT,
    "type" TEXT,
    PRIMARY KEY ("id")
);

-- Table: ReportModelField
DROP TABLE IF EXISTS "ReportModelField" CASCADE;
CREATE TABLE "ReportModelField" (
    "id" SERIAL,
    "modelId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fieldType" TEXT NOT NULL,
    "dataSource" TEXT,
    "config" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    "aggregation" TEXT,
    "dataType" TEXT,
    "sortNo" INTEGER DEFAULT 0,
    "sourceExpr" TEXT,
    "sourceTable" TEXT,
    "type" TEXT,
    PRIMARY KEY ("id")
);

-- Table: ReportModelRelation
DROP TABLE IF EXISTS "ReportModelRelation" CASCADE;
CREATE TABLE "ReportModelRelation" (
    "id" SERIAL,
    "modelId" INTEGER NOT NULL,
    "relationCode" TEXT NOT NULL,
    "relationName" TEXT NOT NULL,
    "description" TEXT,
    "relationType" TEXT NOT NULL,
    "targetModel" TEXT NOT NULL,
    "joinCondition" TEXT,
    "config" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: Role
DROP TABLE IF EXISTS "Role" CASCADE;
CREATE TABLE "Role" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "functionalPermissions" TEXT NOT NULL DEFAULT '[]',
    "dataScopeType" TEXT NOT NULL DEFAULT 'ALL',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "dataScopeRuleGroups" TEXT,
    "managedOrgDataScope" TEXT,
    "orgDataScope" TEXT,
    PRIMARY KEY ("id")
);

-- Table: Schedule
DROP TABLE IF EXISTS "Schedule" CASCADE;
CREATE TABLE "Schedule" (
    "id" SERIAL,
    "employeeId" INTEGER NOT NULL,
    "shiftId" INTEGER NOT NULL,
    "scheduleDate" TIMESTAMP NOT NULL,
    "adjustedStart" TIMESTAMP,
    "adjustedEnd" TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "cancelReason" TEXT,
    "pushStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "adjustedSegments" TEXT,
    PRIMARY KEY ("id")
);

-- Table: SearchConditionConfig
DROP TABLE IF EXISTS "SearchConditionConfig" CASCADE;
CREATE TABLE "SearchConditionConfig" (
    "id" SERIAL,
    "configCode" TEXT NOT NULL,
    "configName" TEXT NOT NULL,
    "pageCode" TEXT NOT NULL,
    "pageName" TEXT NOT NULL,
    "fieldCode" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "dataSourceCode" TEXT,
    "applicablePages" TEXT DEFAULT '[]',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: Shift
DROP TABLE IF EXISTS "Shift" CASCADE;
CREATE TABLE "Shift" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "standardHours" DOUBLE PRECISION NOT NULL,
    "breakHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "color" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: ShiftProperty
DROP TABLE IF EXISTS "ShiftProperty" CASCADE;
CREATE TABLE "ShiftProperty" (
    "id" SERIAL,
    "shiftId" INTEGER NOT NULL,
    "propertyKey" TEXT NOT NULL,
    "propertyValue" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: ShiftPropertyDefinition
DROP TABLE IF EXISTS "ShiftPropertyDefinition" CASCADE;
CREATE TABLE "ShiftPropertyDefinition" (
    "id" SERIAL,
    "propertyKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "valueType" TEXT NOT NULL DEFAULT 'TEXT',
    "options" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: ShiftSegment
DROP TABLE IF EXISTS "ShiftSegment" CASCADE;
CREATE TABLE "ShiftSegment" (
    "id" SERIAL,
    "shiftId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "accountId" INTEGER,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: SupportRequest
DROP TABLE IF EXISTS "SupportRequest" CASCADE;
CREATE TABLE "SupportRequest" (
    "id" SERIAL,
    "requestNo" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requesterId" INTEGER NOT NULL,
    "requesterName" TEXT NOT NULL,
    "assigneeId" INTEGER,
    "assigneeName" TEXT,
    "instanceId" INTEGER,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    "calculatedHours" DOUBLE PRECISION DEFAULT 0,
    "endDate" TEXT,
    "endTime" TEXT,
    "startDate" TEXT,
    "startTime" TEXT,
    "supportAccountId" INTEGER,
    "supportAccountName" TEXT,
    "supportEmployeeId" INTEGER,
    "supportEmployeeName" TEXT,
    "supportEmployeeNo" TEXT,
    "supportMode" TEXT DEFAULT 'FULL_DAY',
    PRIMARY KEY ("id")
);

-- Table: SupportResult
DROP TABLE IF EXISTS "SupportResult" CASCADE;
CREATE TABLE "SupportResult" (
    "id" SERIAL,
    "requestId" INTEGER NOT NULL,
    "result" TEXT NOT NULL,
    "attachments" TEXT NOT NULL DEFAULT '[]',
    "createdBy" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: SystemConfig
DROP TABLE IF EXISTS "SystemConfig" CASCADE;
CREATE TABLE "SystemConfig" (
    "id" SERIAL,
    "configKey" TEXT NOT NULL,
    "configValue" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "updatedById" INTEGER,
    "updatedByName" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: User
DROP TABLE IF EXISTS "User" CASCADE;
CREATE TABLE "User" (
    "id" SERIAL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: UserRole
DROP TABLE IF EXISTS "UserRole" CASCADE;
CREATE TABLE "UserRole" (
    "id" SERIAL,
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: WorkHourResult
DROP TABLE IF EXISTS "WorkHourResult" CASCADE;
CREATE TABLE "WorkHourResult" (
    "id" SERIAL,
    "employeeNo" TEXT NOT NULL,
    "employeeId" INTEGER,
    "workDate" TIMESTAMP NOT NULL,
    "calcDate" TIMESTAMP,
    "shiftId" INTEGER,
    "shiftName" TEXT,
    "attendanceCodeId" INTEGER,
    "attendanceCode" TEXT,
    "calcAttendanceCode" TEXT,
    "attendanceCodeName" TEXT,
    "workHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION,
    "calculateAmount" DOUBLE PRECISION,
    "accountId" INTEGER,
    "accountName" TEXT,
    "accountPath" TEXT,
    "sourceType" TEXT,
    "sourceId" INTEGER,
    "source" TEXT,
    "sourceBatchId" TEXT,
    "attendancePunchPair" INTEGER,
    "customFields" TEXT NOT NULL DEFAULT '{}',
    "orgId" INTEGER,
    "definitionAttendanceCodeId" INTEGER,
    "definitionAttendanceCodeStr" TEXT,
    "startTime" TIMESTAMP,
    "endTime" TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: WorkInfoHistory
DROP TABLE IF EXISTS "WorkInfoHistory" CASCADE;
CREATE TABLE "WorkInfoHistory" (
    "id" SERIAL,
    "employeeId" INTEGER NOT NULL,
    "effectiveDate" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP,
    "changeType" TEXT,
    "position" TEXT,
    "jobLevel" TEXT,
    "employeeType" TEXT,
    "workLocation" TEXT,
    "workAddress" TEXT,
    "hireDate" TIMESTAMP,
    "probationStart" TIMESTAMP,
    "probationEnd" TIMESTAMP,
    "probationMonths" INTEGER,
    "regularDate" TIMESTAMP,
    "resignationDate" TIMESTAMP,
    "resignationReason" TEXT,
    "workYears" INTEGER,
    "orgId" INTEGER,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "customFields" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "costCenter" TEXT,
    "employmentRelation" TEXT,
    PRIMARY KEY ("id")
);

-- Table: WorkflowApproval
DROP TABLE IF EXISTS "WorkflowApproval" CASCADE;
CREATE TABLE "WorkflowApproval" (
    "id" SERIAL,
    "instanceId" INTEGER NOT NULL,
    "instanceNo" TEXT NOT NULL,
    "nodeId" INTEGER NOT NULL,
    "nodeCode" TEXT NOT NULL,
    "nodeName" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "approverId" INTEGER NOT NULL,
    "approverName" TEXT NOT NULL,
    "approvers" TEXT NOT NULL DEFAULT '[]',
    "needAllApprove" BOOLEAN NOT NULL DEFAULT false,
    "action" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "approvedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: WorkflowCcRecord
DROP TABLE IF EXISTS "WorkflowCcRecord" CASCADE;
CREATE TABLE "WorkflowCcRecord" (
    "id" SERIAL,
    "instanceId" INTEGER NOT NULL,
    "step" TEXT NOT NULL,
    "ccUserId" INTEGER NOT NULL,
    "ccUserName" TEXT NOT NULL,
    "hasRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: WorkflowDefinition
DROP TABLE IF EXISTS "WorkflowDefinition" CASCADE;
CREATE TABLE "WorkflowDefinition" (
    "id" SERIAL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "version" INTEGER NOT NULL DEFAULT 1,
    "versionString" TEXT NOT NULL DEFAULT '1',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "formConfig" TEXT NOT NULL DEFAULT '{}',
    "flowConfig" TEXT NOT NULL DEFAULT '{}',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP,
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "updatedById" INTEGER,
    "updatedByName" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: WorkflowEdge
DROP TABLE IF EXISTS "WorkflowEdge" CASCADE;
CREATE TABLE "WorkflowEdge" (
    "id" SERIAL,
    "workflowId" INTEGER NOT NULL,
    "sourceNodeId" INTEGER NOT NULL,
    "targetNodeId" INTEGER NOT NULL,
    "condition" TEXT,
    "label" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: WorkflowInstance
DROP TABLE IF EXISTS "WorkflowInstance" CASCADE;
CREATE TABLE "WorkflowInstance" (
    "id" SERIAL,
    "workflowId" INTEGER NOT NULL,
    "instanceNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "initiatorId" INTEGER NOT NULL,
    "initiatorName" TEXT NOT NULL,
    "initiatorOrgId" INTEGER NOT NULL,
    "initiatorOrgName" TEXT NOT NULL,
    "currentStep" TEXT,
    "data" TEXT NOT NULL DEFAULT '{}',
    "initiatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startTime" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP,
    "endTime" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Table: WorkflowNode
DROP TABLE IF EXISTS "WorkflowNode" CASCADE;
CREATE TABLE "WorkflowNode" (
    "id" SERIAL,
    "workflowId" INTEGER NOT NULL,
    "nodeCode" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "nodeName" TEXT NOT NULL,
    "needAllApprove" BOOLEAN NOT NULL DEFAULT false,
    "approverStrategy" TEXT,
    "approverConfig" TEXT,
    "ccStrategy" TEXT,
    "conditionConfig" TEXT,
    "formPermission" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

-- Table: WorkflowParticipant
DROP TABLE IF EXISTS "WorkflowParticipant" CASCADE;
CREATE TABLE "WorkflowParticipant" (
    "id" SERIAL,
    "workflowId" INTEGER NOT NULL,
    "nodeId" TEXT NOT NULL,
    "participantType" TEXT NOT NULL,
    "participantId" INTEGER NOT NULL,
    "participantName" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);


-- ==========================================
-- 数据导入
-- ==========================================

-- 数据导入: AccountHierarchyConfig
INSERT INTO "AccountHierarchyConfig" ("id", "code", "name", "description", "level", "parentLevelId", "parentLevelName", "mappingType", "mappingValue", "dataSourceId", "sort", "status", "createdAt", "updatedAt") VALUES (4, 'AHC_001', '工厂', NULL, 1, NULL, NULL, 'ORG', 'COMPANY', NULL, 0, 'ACTIVE', 1779415681969, 1779415681969);
INSERT INTO "AccountHierarchyConfig" ("id", "code", "name", "description", "level", "parentLevelId", "parentLevelName", "mappingType", "mappingValue", "dataSourceId", "sort", "status", "createdAt", "updatedAt") VALUES (5, 'AHC_002', '车间', NULL, 2, NULL, NULL, 'ORG', 'DEPARTMENT', NULL, 1, 'ACTIVE', 1779415681969, 1779415681969);
INSERT INTO "AccountHierarchyConfig" ("id", "code", "name", "description", "level", "parentLevelId", "parentLevelName", "mappingType", "mappingValue", "dataSourceId", "sort", "status", "createdAt", "updatedAt") VALUES (6, 'AHC_003', '产线', NULL, 3, NULL, NULL, 'ORG', 'TEAM', NULL, 2, 'ACTIVE', 1779415681969, 1779415681969);
INSERT INTO "AccountHierarchyConfig" ("id", "code", "name", "description", "level", "parentLevelId", "parentLevelName", "mappingType", "mappingValue", "dataSourceId", "sort", "status", "createdAt", "updatedAt") VALUES (7, 'AHC_004', '产品', NULL, 4, NULL, NULL, 'FIELD_A01', NULL, NULL, 3, 'ACTIVE', 1779415681969, 1779415681969);
INSERT INTO "AccountHierarchyConfig" ("id", "code", "name", "description", "level", "parentLevelId", "parentLevelName", "mappingType", "mappingValue", "dataSourceId", "sort", "status", "createdAt", "updatedAt") VALUES (8, 'AHC_005', '工序', NULL, 5, NULL, NULL, 'FIELD_A02', NULL, NULL, 4, 'ACTIVE', 1779415681969, 1779415681969);

-- 数据导入: AccountHierarchyLevelDetail
INSERT INTO "AccountHierarchyLevelDetail" ("id", "configId", "level", "levelName", "levelCode", "parentLevelId", "parentLevelName", "accountCodePrefix", "status", "createdAt", "updatedAt") VALUES (69, 4, 1, '杭州工厂', 'DH', NULL, NULL, NULL, 'ACTIVE', 1779798225503, 1779798225503);
INSERT INTO "AccountHierarchyLevelDetail" ("id", "configId", "level", "levelName", "levelCode", "parentLevelId", "parentLevelName", "accountCodePrefix", "status", "createdAt", "updatedAt") VALUES (70, 8, 1, '焊接', 'A01', NULL, NULL, NULL, 'ACTIVE', 1779798225509, 1779798225509);
INSERT INTO "AccountHierarchyLevelDetail" ("id", "configId", "level", "levelName", "levelCode", "parentLevelId", "parentLevelName", "accountCodePrefix", "status", "createdAt", "updatedAt") VALUES (71, 8, 2, '喷漆', 'A02', NULL, NULL, NULL, 'ACTIVE', 1779798225509, 1779798225509);
INSERT INTO "AccountHierarchyLevelDetail" ("id", "configId", "level", "levelName", "levelCode", "parentLevelId", "parentLevelName", "accountCodePrefix", "status", "createdAt", "updatedAt") VALUES (72, 6, 1, 'W1总装L2产线', 'DH01002', NULL, NULL, NULL, 'ACTIVE', 1779798225519, 1779798225519);
INSERT INTO "AccountHierarchyLevelDetail" ("id", "configId", "level", "levelName", "levelCode", "parentLevelId", "parentLevelName", "accountCodePrefix", "status", "createdAt", "updatedAt") VALUES (73, 6, 2, 'W1总装L1产线', 'DH0101', NULL, NULL, NULL, 'ACTIVE', 1779798225519, 1779798225519);
INSERT INTO "AccountHierarchyLevelDetail" ("id", "configId", "level", "levelName", "levelCode", "parentLevelId", "parentLevelName", "accountCodePrefix", "status", "createdAt", "updatedAt") VALUES (74, 6, 3, 'W2总装车间L1产线', 'DH02001', NULL, NULL, NULL, 'ACTIVE', 1779798225519, 1779798225519);
INSERT INTO "AccountHierarchyLevelDetail" ("id", "configId", "level", "levelName", "levelCode", "parentLevelId", "parentLevelName", "accountCodePrefix", "status", "createdAt", "updatedAt") VALUES (75, 6, 4, 'W2总装车间L2产线', 'DH02002', NULL, NULL, NULL, 'ACTIVE', 1779798225519, 1779798225519);
INSERT INTO "AccountHierarchyLevelDetail" ("id", "configId", "level", "levelName", "levelCode", "parentLevelId", "parentLevelName", "accountCodePrefix", "status", "createdAt", "updatedAt") VALUES (76, 7, 1, '大桶', 'A01', NULL, NULL, NULL, 'ACTIVE', 1779798225540, 1779798225540);
INSERT INTO "AccountHierarchyLevelDetail" ("id", "configId", "level", "levelName", "levelCode", "parentLevelId", "parentLevelName", "accountCodePrefix", "status", "createdAt", "updatedAt") VALUES (77, 7, 2, '小桶', 'A02', NULL, NULL, NULL, 'ACTIVE', 1779798225540, 1779798225540);
INSERT INTO "AccountHierarchyLevelDetail" ("id", "configId", "level", "levelName", "levelCode", "parentLevelId", "parentLevelName", "accountCodePrefix", "status", "createdAt", "updatedAt") VALUES (78, 5, 1, 'W1总装车间', 'DH01', NULL, NULL, NULL, 'ACTIVE', 1779798225540, 1779798225540);
INSERT INTO "AccountHierarchyLevelDetail" ("id", "configId", "level", "levelName", "levelCode", "parentLevelId", "parentLevelName", "accountCodePrefix", "status", "createdAt", "updatedAt") VALUES (79, 5, 2, 'W2总装车间', 'DH02', NULL, NULL, NULL, 'ACTIVE', 1779798225540, 1779798225540);

-- 数据导入: AllocationConfig
INSERT INTO "AllocationConfig" ("id", "configCode", "configName", "orgId", "orgPath", "effectiveStartTime", "effectiveEndTime", "status", "description", "version", "parentConfigId", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt", "approvedById", "approvedByName", "approvedAt", "deletedAt") VALUES (1, 'A0001', '按产量分摊车间工时', 1, '/', 1777593600000, NULL, 'ACTIVE', '', 1, NULL, 1, 'Admin', 1779807741637, NULL, NULL, 1779807746003, 1, 'Admin', 1779807746002, NULL);
INSERT INTO "AllocationConfig" ("id", "configCode", "configName", "orgId", "orgPath", "effectiveStartTime", "effectiveEndTime", "status", "description", "version", "parentConfigId", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt", "approvedById", "approvedByName", "approvedAt", "deletedAt") VALUES (2, 'A0002', '按实际工时比例拆分', 1, '/', 1777593600000, NULL, 'ACTIVE', '', 1, NULL, 1, 'Admin', 1779891572711, NULL, NULL, 1779891576545, 1, 'Admin', 1779891576545, NULL);
INSERT INTO "AllocationConfig" ("id", "configCode", "configName", "orgId", "orgPath", "effectiveStartTime", "effectiveEndTime", "status", "description", "version", "parentConfigId", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt", "approvedById", "approvedByName", "approvedAt", "deletedAt") VALUES (3, 'A0003', 'A0003', 1, '/', 1777593600000, NULL, 'ACTIVE', '', 1, NULL, 1, 'Admin', 1779894192617, NULL, NULL, 1779894196672, 1, 'Admin', 1779894196671, NULL);
INSERT INTO "AllocationConfig" ("id", "configCode", "configName", "orgId", "orgPath", "effectiveStartTime", "effectiveEndTime", "status", "description", "version", "parentConfigId", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt", "approvedById", "approvedByName", "approvedAt", "deletedAt") VALUES (4, 'A0004', 'A0004', 1, '/', 1777593600000, NULL, 'ACTIVE', '', 1, NULL, 1, 'Admin', 1779895014157, NULL, NULL, 1779895017345, 1, 'Admin', 1779895017344, NULL);
INSERT INTO "AllocationConfig" ("id", "configCode", "configName", "orgId", "orgPath", "effectiveStartTime", "effectiveEndTime", "status", "description", "version", "parentConfigId", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt", "approvedById", "approvedByName", "approvedAt", "deletedAt") VALUES (5, 'A0005', 'A0005', 1, '/', 1777593600000, NULL, 'ACTIVE', '', 1, NULL, 1, 'Admin', 1779896248687, NULL, NULL, 1779896253271, 1, 'Admin', 1779896253270, NULL);
INSERT INTO "AllocationConfig" ("id", "configCode", "configName", "orgId", "orgPath", "effectiveStartTime", "effectiveEndTime", "status", "description", "version", "parentConfigId", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt", "approvedById", "approvedByName", "approvedAt", "deletedAt") VALUES (6, 'A0006', 'A0006', 1, '/', 1777593600000, NULL, 'ACTIVE', '', 1, NULL, 1, 'Admin', 1779896337185, NULL, NULL, 1779896340483, 1, 'Admin', 1779896340482, NULL);
INSERT INTO "AllocationConfig" ("id", "configCode", "configName", "orgId", "orgPath", "effectiveStartTime", "effectiveEndTime", "status", "description", "version", "parentConfigId", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt", "approvedById", "approvedByName", "approvedAt", "deletedAt") VALUES (7, 'A0007', 'A0007', 1, '/', 1777593600000, NULL, 'ACTIVE', '', 1, NULL, 1, 'Admin', 1779896430851, NULL, NULL, 1779896434904, 1, 'Admin', 1779896434903, NULL);

-- 数据导入: AllocationResult
INSERT INTO "AllocationResult" ("id", "batchNo", "recordDate", "calcResultId", "configId", "configVersion", "ruleId", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "attendanceCodeId", "attendanceCode", "sourceHours", "targetType", "targetId", "targetName", "targetAccountId", "allocationBasis", "basisValue", "weightValue", "allocationRatio", "allocatedHours", "calcTime", "createdAt", "deletedAt") VALUES (13, 'ALC17798899781325364', 1778371200000, 557, 1, 1, 1, '202605003', 'N/A', 31, '杭州工厂/W1总装车间///', 3, 'AC_002', 8.0, 'LINE', 6, 'W1总装L1产线', 8, 'ACTUAL_YIELDS', 1000.0, 1800.0, 0.5555555555555556, 4.444444444444445, 1779889978132, 1779889978179, NULL);
INSERT INTO "AllocationResult" ("id", "batchNo", "recordDate", "calcResultId", "configId", "configVersion", "ruleId", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "attendanceCodeId", "attendanceCode", "sourceHours", "targetType", "targetId", "targetName", "targetAccountId", "allocationBasis", "basisValue", "weightValue", "allocationRatio", "allocatedHours", "calcTime", "createdAt", "deletedAt") VALUES (14, 'ALC17798899781325364', 1778371200000, 557, 1, 1, 1, '202605003', 'N/A', 31, '杭州工厂/W1总装车间///', 3, 'AC_002', 8.0, 'LINE', 7, 'W1总装L2产线', 7, 'ACTUAL_YIELDS', 800.0, 1800.0, 0.4444444444444444, 3.555555555555555, 1779889978132, 1779889978190, NULL);
INSERT INTO "AllocationResult" ("id", "batchNo", "recordDate", "calcResultId", "configId", "configVersion", "ruleId", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "attendanceCodeId", "attendanceCode", "sourceHours", "targetType", "targetId", "targetName", "targetAccountId", "allocationBasis", "basisValue", "weightValue", "allocationRatio", "allocatedHours", "calcTime", "createdAt", "deletedAt") VALUES (17, 'ALC17798938212237316', 1779840000000, 595, 1, 1, 1, '202605003', 'N/A', 31, '杭州工厂/W1总装车间///', 3, 'AC_002', 7.0, 'LINE', 6, 'W1总装L1产线', 8, 'ACTUAL_YIELDS', 1500.0, 2500.0, 0.6, 4.2, 1779893821223, 1779893821346, NULL);
INSERT INTO "AllocationResult" ("id", "batchNo", "recordDate", "calcResultId", "configId", "configVersion", "ruleId", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "attendanceCodeId", "attendanceCode", "sourceHours", "targetType", "targetId", "targetName", "targetAccountId", "allocationBasis", "basisValue", "weightValue", "allocationRatio", "allocatedHours", "calcTime", "createdAt", "deletedAt") VALUES (18, 'ALC17798938212237316', 1779840000000, 595, 1, 1, 1, '202605003', 'N/A', 31, '杭州工厂/W1总装车间///', 3, 'AC_002', 7.0, 'LINE', 7, 'W1总装L2产线', 7, 'ACTUAL_YIELDS', 1000.0, 2500.0, 0.4, 2.8, 1779893821223, 1779893821362, NULL);
INSERT INTO "AllocationResult" ("id", "batchNo", "recordDate", "calcResultId", "configId", "configVersion", "ruleId", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "attendanceCodeId", "attendanceCode", "sourceHours", "targetType", "targetId", "targetName", "targetAccountId", "allocationBasis", "basisValue", "weightValue", "allocationRatio", "allocatedHours", "calcTime", "createdAt", "deletedAt") VALUES (27, 'ALC17799868516264297', 1779840000000, 595, 7, 1, 7, '202605003', 'N/A', 31, '杭州工厂/W1总装车间///', 3, 'A03', 7.0, 'LINE', 6, 'W1总装L1产线', 8, 'PRODUCTION_LINE_AVERAGE', 1.0, 2.0, 0.5, 3.5, 1779986851626, 1779986851752, NULL);
INSERT INTO "AllocationResult" ("id", "batchNo", "recordDate", "calcResultId", "configId", "configVersion", "ruleId", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "attendanceCodeId", "attendanceCode", "sourceHours", "targetType", "targetId", "targetName", "targetAccountId", "allocationBasis", "basisValue", "weightValue", "allocationRatio", "allocatedHours", "calcTime", "createdAt", "deletedAt") VALUES (28, 'ALC17799868516264297', 1779840000000, 595, 7, 1, 7, '202605003', 'N/A', 31, '杭州工厂/W1总装车间///', 3, 'A03', 7.0, 'LINE', 7, 'W1总装L2产线', 7, 'PRODUCTION_LINE_AVERAGE', 1.0, 2.0, 0.5, 3.5, 1779986851626, 1779986851767, NULL);
INSERT INTO "AllocationResult" ("id", "batchNo", "recordDate", "calcResultId", "configId", "configVersion", "ruleId", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "attendanceCodeId", "attendanceCode", "sourceHours", "targetType", "targetId", "targetName", "targetAccountId", "allocationBasis", "basisValue", "weightValue", "allocationRatio", "allocatedHours", "calcTime", "createdAt", "deletedAt") VALUES (29, 'ALC17799868891289204', 1779840000000, 595, 5, 1, 5, '202605003', 'N/A', 31, '杭州工厂/W1总装车间///', 3, 'AC_002', 7.0, 'ORGANIZATION', 6, 'W1总装L1产线', 65, 'ACTUAL_HOURS', 4.0, 8.0, 0.5, 3.5, 1779986889128, 1779986889228, NULL);
INSERT INTO "AllocationResult" ("id", "batchNo", "recordDate", "calcResultId", "configId", "configVersion", "ruleId", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "attendanceCodeId", "attendanceCode", "sourceHours", "targetType", "targetId", "targetName", "targetAccountId", "allocationBasis", "basisValue", "weightValue", "allocationRatio", "allocatedHours", "calcTime", "createdAt", "deletedAt") VALUES (30, 'ALC17799868891289204', 1779840000000, 595, 5, 1, 5, '202605003', 'N/A', 31, '杭州工厂/W1总装车间///', 3, 'AC_002', 7.0, 'ORGANIZATION', 7, 'W1总装L2产线', 66, 'ACTUAL_HOURS', 4.0, 8.0, 0.5, 3.5, 1779986889128, 1779986889239, NULL);

-- 数据导入: AllocationRuleConfig
INSERT INTO "AllocationRuleConfig" ("id", "configId", "ruleName", "ruleType", "allocationBasis", "allocationAttendanceCodes", "allocationHierarchyLevels", "allocationScopeId", "basisFilter", "sortOrder", "status", "description", "effectiveStartTime", "effectiveEndTime", "createdAt", "updatedAt", "deletedAt") VALUES (1, 1, '分摊规则1', 'PROPORTIONAL', 'ACTUAL_YIELDS', '[]', '[]', 6, '{}', 0, 'ACTIVE', '', 1777564800000, NULL, 1779807741640, 1779807741640, NULL);
INSERT INTO "AllocationRuleConfig" ("id", "configId", "ruleName", "ruleType", "allocationBasis", "allocationAttendanceCodes", "allocationHierarchyLevels", "allocationScopeId", "basisFilter", "sortOrder", "status", "description", "effectiveStartTime", "effectiveEndTime", "createdAt", "updatedAt", "deletedAt") VALUES (2, 2, '分摊规则1', 'PROPORTIONAL', 'ACTUAL_HOURS', '[]', '[]', 6, '{}', 0, 'ACTIVE', '', 1777564800000, NULL, 1779891572714, 1779891572714, NULL);
INSERT INTO "AllocationRuleConfig" ("id", "configId", "ruleName", "ruleType", "allocationBasis", "allocationAttendanceCodes", "allocationHierarchyLevels", "allocationScopeId", "basisFilter", "sortOrder", "status", "description", "effectiveStartTime", "effectiveEndTime", "createdAt", "updatedAt", "deletedAt") VALUES (3, 3, '分摊规则1', 'PROPORTIONAL', 'ACTUAL_HOURS', '[]', '[]', 6, '{}', 0, 'ACTIVE', '', 1777564800000, NULL, 1779894192620, 1779894192620, NULL);
INSERT INTO "AllocationRuleConfig" ("id", "configId", "ruleName", "ruleType", "allocationBasis", "allocationAttendanceCodes", "allocationHierarchyLevels", "allocationScopeId", "basisFilter", "sortOrder", "status", "description", "effectiveStartTime", "effectiveEndTime", "createdAt", "updatedAt", "deletedAt") VALUES (4, 4, '分摊规则1', 'PROPORTIONAL', 'ACTUAL_HOURS', '[]', '[]', 6, '{}', 0, 'ACTIVE', '', 1777564800000, NULL, 1779895014160, 1779895014160, NULL);
INSERT INTO "AllocationRuleConfig" ("id", "configId", "ruleName", "ruleType", "allocationBasis", "allocationAttendanceCodes", "allocationHierarchyLevels", "allocationScopeId", "basisFilter", "sortOrder", "status", "description", "effectiveStartTime", "effectiveEndTime", "createdAt", "updatedAt", "deletedAt") VALUES (5, 5, '分摊规则1', 'PROPORTIONAL', 'ACTUAL_HOURS', '[]', '[]', 5, '{}', 0, 'ACTIVE', '', 1777564800000, NULL, 1779896248691, 1779896248691, NULL);
INSERT INTO "AllocationRuleConfig" ("id", "configId", "ruleName", "ruleType", "allocationBasis", "allocationAttendanceCodes", "allocationHierarchyLevels", "allocationScopeId", "basisFilter", "sortOrder", "status", "description", "effectiveStartTime", "effectiveEndTime", "createdAt", "updatedAt", "deletedAt") VALUES (6, 6, '分摊规则1', 'PROPORTIONAL', 'ACTUAL_YIELDS', '[]', '[]', 5, '{}', 0, 'ACTIVE', '', 1777564800000, NULL, 1779896337188, 1779896337188, NULL);
INSERT INTO "AllocationRuleConfig" ("id", "configId", "ruleName", "ruleType", "allocationBasis", "allocationAttendanceCodes", "allocationHierarchyLevels", "allocationScopeId", "basisFilter", "sortOrder", "status", "description", "effectiveStartTime", "effectiveEndTime", "createdAt", "updatedAt", "deletedAt") VALUES (7, 7, '分摊规则1', 'PROPORTIONAL', 'PRODUCTION_LINE_AVERAGE', '[]', '[]', 5, '{}', 0, 'ACTIVE', '', 1777564800000, NULL, 1779896430854, 1779896430854, NULL);

-- 数据导入: AllocationSourceConfig
INSERT INTO "AllocationSourceConfig" ("id", "configId", "sourceType", "employeeFilter", "accountFilter", "attendanceCodes", "description", "createdAt", "updatedAt") VALUES (1, 1, 'EMPLOYEE_HOURS', '{"fieldGroups":[{"id":"default_group","fieldGroups":[{"id":"default","conditions":[{"fieldCode":"position","fieldName":"岗位","fieldType":"select","operator":"eq","value":"POST_003"}]}]}]}', '{"hierarchySelections":[{"levelId":4,"level":1,"levelName":"工厂","valueIds":[4]}]}', '["A03"]', '', 1779807741639, 1779807741639);
INSERT INTO "AllocationSourceConfig" ("id", "configId", "sourceType", "employeeFilter", "accountFilter", "attendanceCodes", "description", "createdAt", "updatedAt") VALUES (2, 2, 'EMPLOYEE_HOURS', '{"fieldGroups":[{"id":"default_group","fieldGroups":[{"id":"default","conditions":[{"fieldCode":"position","fieldName":"岗位","fieldType":"select","operator":"eq","value":"POST_003"}]}]}]}', '{"hierarchySelections":[{"levelId":4,"level":1,"levelName":"工厂","valueIds":[69]}]}', '["A04"]', '', 1779891572713, 1779891572713);
INSERT INTO "AllocationSourceConfig" ("id", "configId", "sourceType", "employeeFilter", "accountFilter", "attendanceCodes", "description", "createdAt", "updatedAt") VALUES (3, 3, 'EMPLOYEE_HOURS', '{"fieldGroups":[{"id":"default_group","fieldGroups":[{"id":"default","conditions":[{"fieldCode":"position","fieldName":"岗位","fieldType":"select","operator":"eq","value":"POST_003"}]}]}]}', '{"hierarchySelections":[{"levelId":4,"level":1,"levelName":"工厂","valueIds":[69]}]}', '["A03"]', '', 1779894192619, 1779894192619);
INSERT INTO "AllocationSourceConfig" ("id", "configId", "sourceType", "employeeFilter", "accountFilter", "attendanceCodes", "description", "createdAt", "updatedAt") VALUES (4, 4, 'EMPLOYEE_HOURS', '{"fieldGroups":[{"id":"default_group","fieldGroups":[{"id":"default","conditions":[{"fieldCode":"position","fieldName":"岗位","fieldType":"select","operator":"eq","value":"POST_003"}]}]}]}', '{"hierarchySelections":[{"levelId":4,"level":1,"levelName":"工厂","valueIds":["DH"]}]}', '["A03"]', '', 1779895014159, 1779895014159);
INSERT INTO "AllocationSourceConfig" ("id", "configId", "sourceType", "employeeFilter", "accountFilter", "attendanceCodes", "description", "createdAt", "updatedAt") VALUES (5, 5, 'EMPLOYEE_HOURS', '{"fieldGroups":[{"id":"default_group","fieldGroups":[{"id":"default","conditions":[{"fieldCode":"position","fieldName":"岗位","fieldType":"select","operator":"eq","value":"POST_003"}]}]}]}', '{"hierarchySelections":[{"levelId":4,"level":1,"levelName":"工厂","valueIds":["DH"]}]}', '["A03"]', '', 1779896248689, 1779896248689);
INSERT INTO "AllocationSourceConfig" ("id", "configId", "sourceType", "employeeFilter", "accountFilter", "attendanceCodes", "description", "createdAt", "updatedAt") VALUES (6, 6, 'EMPLOYEE_HOURS', '{"fieldGroups":[{"id":"default_group","fieldGroups":[{"id":"default","conditions":[{"fieldCode":"position","fieldName":"岗位","fieldType":"select","operator":"eq","value":"POST_003"}]}]}]}', '{"hierarchySelections":[{"levelId":4,"level":1,"levelName":"工厂","valueIds":["DH"]}]}', '["A03"]', '', 1779896337187, 1779896337187);
INSERT INTO "AllocationSourceConfig" ("id", "configId", "sourceType", "employeeFilter", "accountFilter", "attendanceCodes", "description", "createdAt", "updatedAt") VALUES (7, 7, 'EMPLOYEE_HOURS', '{"fieldGroups":[{"id":"default_group","fieldGroups":[{"id":"default","conditions":[{"fieldCode":"position","fieldName":"岗位","fieldType":"select","operator":"eq","value":"POST_003"}]}]}]}', '{"hierarchySelections":[{"levelId":4,"level":1,"levelName":"工厂","valueIds":["DH"]}]}', '["A03"]', '', 1779896430853, 1779896430853);

-- 数据导入: AmountPolicy
INSERT INTO "AmountPolicy" ("id", "code", "name", "description", "policyType", "multiplier", "fixedValue", "accountPath", "accountPathMatch", "attendanceCodes", "priority", "status", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt", "deletedAt") VALUES (1, 'AP001', '1.5倍', NULL, 'MULTIPLY', 1.5, NULL, '///大桶/喷漆', 'LEVEL', '["AC_001","AC_002","AC_003","AC_004"]', 0, 'ACTIVE', 1, 'admin', 1779766684063, NULL, NULL, 1779766684063, NULL);
INSERT INTO "AmountPolicy" ("id", "code", "name", "description", "policyType", "multiplier", "fixedValue", "accountPath", "accountPathMatch", "attendanceCodes", "priority", "status", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt", "deletedAt") VALUES (2, 'AP002', '作业工时2倍', NULL, 'MULTIPLY', 2.0, NULL, 'DH/DH01/DH0101//A02', 'LEVEL', '["AC_005"]', 0, 'ACTIVE', 1, 'admin', 1779983593515, NULL, NULL, 1779983593515, NULL);

-- 数据导入: AmountPolicyGroup
INSERT INTO "AmountPolicyGroup" ("id", "code", "name", "description", "policyIds", "policies", "status", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt", "deletedAt") VALUES (1, 'APG001', '通用金额规则组', NULL, '[2,1]', '[]', 'ACTIVE', 1, 'admin', 1779766699709, 1, 'admin', 1779983606526, NULL);

-- 数据导入: AttendancePunchPair
INSERT INTO "AttendancePunchPair" ("id", "employeeNo", "employeeName", "punchDate", "workStartPunches", "workStartPunchTime", "workEndPunches", "workEndPunchTime", "workStartDeviceId", "workEndDeviceId", "workStartShiftId", "workEndShiftId", "workStartShiftName", "workEndShiftName", "accountId", "ruleGroupId", "ruleId", "ruleName", "ruleType", "isContinuousShift", "status", "createdAt", "updatedAt") VALUES (28, '202605002', NULL, 1778284800000, '[{"id":6,"employeeNo":"202605002","punchTime":"2026-05-09T00:00:00.000Z","deviceId":12,"punchType":"IN","location":null,"source":"MANUAL","accountId":21,"createdAt":"2026-05-26T13:52:05.423Z","mergedAccountId":23,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//焊接"}]', 1778284800000, '[null]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 20, NULL, 1, 'A001', 'scheduled', 0, 'PENDING', 1779803525541, 1779803525541);
INSERT INTO "AttendancePunchPair" ("id", "employeeNo", "employeeName", "punchDate", "workStartPunches", "workStartPunchTime", "workEndPunches", "workEndPunchTime", "workStartDeviceId", "workEndDeviceId", "workStartShiftId", "workEndShiftId", "workStartShiftName", "workEndShiftName", "accountId", "ruleGroupId", "ruleId", "ruleName", "ruleType", "isContinuousShift", "status", "createdAt", "updatedAt") VALUES (29, '202605002', NULL, 1778284800000, '[null]', NULL, '[{"id":6,"employeeNo":"202605002","punchTime":"2026-05-09T00:00:00.000Z","deviceId":12,"punchType":"IN","location":null,"source":"MANUAL","accountId":21,"createdAt":"2026-05-26T13:52:05.423Z","mergedAccountId":23,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//焊接"}]', 1778284800000, NULL, NULL, NULL, NULL, NULL, NULL, 20, NULL, 1, 'A001', 'scheduled', 0, 'PENDING', 1779803525546, 1779803525546);
INSERT INTO "AttendancePunchPair" ("id", "employeeNo", "employeeName", "punchDate", "workStartPunches", "workStartPunchTime", "workEndPunches", "workEndPunchTime", "workStartDeviceId", "workEndDeviceId", "workStartShiftId", "workEndShiftId", "workStartShiftName", "workEndShiftName", "accountId", "ruleGroupId", "ruleId", "ruleName", "ruleType", "isContinuousShift", "status", "createdAt", "updatedAt") VALUES (30, '202605002', NULL, 1778371200000, '[{"id":1,"employeeNo":"202605002","punchTime":"2026-05-09T23:00:00.000Z","deviceId":11,"punchType":"IN","location":null,"source":"MANUAL","accountId":null,"createdAt":"2026-05-26T04:10:38.696Z","mergedAccountId":24,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L1产线//"}]', 1778367600000, '[{"id":2,"employeeNo":"202605002","punchTime":"2026-05-10T04:00:00.000Z","deviceId":11,"punchType":"OUT","location":null,"source":"MANUAL","accountId":null,"createdAt":"2026-05-26T04:11:08.761Z","mergedAccountId":24,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L1产线//"}]', 1778385600000, NULL, NULL, NULL, NULL, NULL, NULL, 20, NULL, 1, 'A001', 'scheduled', 0, 'PENDING', 1779803525669, 1779803525669);
INSERT INTO "AttendancePunchPair" ("id", "employeeNo", "employeeName", "punchDate", "workStartPunches", "workStartPunchTime", "workEndPunches", "workEndPunchTime", "workStartDeviceId", "workEndDeviceId", "workStartShiftId", "workEndShiftId", "workStartShiftName", "workEndShiftName", "accountId", "ruleGroupId", "ruleId", "ruleName", "ruleType", "isContinuousShift", "status", "createdAt", "updatedAt") VALUES (31, '202605002', NULL, 1778371200000, '[{"id":3,"employeeNo":"202605002","punchTime":"2026-05-10T04:00:00.000Z","deviceId":12,"punchType":"IN","location":null,"source":"MANUAL","accountId":null,"createdAt":"2026-05-26T04:11:44.335Z","mergedAccountId":25,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//"}]', 1778385600000, '[{"id":4,"employeeNo":"202605002","punchTime":"2026-05-10T10:00:00.000Z","deviceId":12,"punchType":"OUT","location":null,"source":"MANUAL","accountId":null,"createdAt":"2026-05-26T04:12:21.550Z","mergedAccountId":25,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//"}]', 1778407200000, NULL, NULL, NULL, NULL, NULL, NULL, 20, NULL, 1, 'A001', 'scheduled', 0, 'PENDING', 1779803525717, 1779803525717);
INSERT INTO "AttendancePunchPair" ("id", "employeeNo", "employeeName", "punchDate", "workStartPunches", "workStartPunchTime", "workEndPunches", "workEndPunchTime", "workStartDeviceId", "workEndDeviceId", "workStartShiftId", "workEndShiftId", "workStartShiftName", "workEndShiftName", "accountId", "ruleGroupId", "ruleId", "ruleName", "ruleType", "isContinuousShift", "status", "createdAt", "updatedAt") VALUES (32, '202605002', NULL, 1778371200000, '[null]', NULL, '[{"id":5,"employeeNo":"202605002","punchTime":"2026-05-10T11:00:00.000Z","deviceId":12,"punchType":"OUT","location":null,"source":"MANUAL","accountId":null,"createdAt":"2026-05-26T04:12:46.317Z","mergedAccountId":25,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//"}]', 1778410800000, NULL, NULL, NULL, NULL, NULL, NULL, 20, NULL, 1, 'A001', 'scheduled', 0, 'PENDING', 1779803525735, 1779803525735);
INSERT INTO "AttendancePunchPair" ("id", "employeeNo", "employeeName", "punchDate", "workStartPunches", "workStartPunchTime", "workEndPunches", "workEndPunchTime", "workStartDeviceId", "workEndDeviceId", "workStartShiftId", "workEndShiftId", "workStartShiftName", "workEndShiftName", "accountId", "ruleGroupId", "ruleId", "ruleName", "ruleType", "isContinuousShift", "status", "createdAt", "updatedAt") VALUES (33, '202605002', NULL, 1778302800000, '[{"id":6,"employeeNo":"202605002","punchTime":"2026-05-09T00:00:00.000Z","deviceId":12,"punchType":"IN","location":null,"source":"MANUAL","accountId":21,"createdAt":"2026-05-26T13:52:05.423Z","mergedAccountId":23,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//焊接"}]', 1778284800000, '[{"id":7,"employeeNo":"202605002","punchTime":"2026-05-09T05:00:00.000Z","deviceId":12,"punchType":"IN","location":null,"source":"MANUAL","accountId":26,"createdAt":"2026-05-26T13:52:56.041Z","mergedAccountId":28,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//喷漆"}]', 1778302800000, NULL, NULL, NULL, NULL, NULL, NULL, 20, NULL, 1, 'A001', 'scheduled', 0, 'PENDING', 1779803576143, 1779803576143);
INSERT INTO "AttendancePunchPair" ("id", "employeeNo", "employeeName", "punchDate", "workStartPunches", "workStartPunchTime", "workEndPunches", "workEndPunchTime", "workStartDeviceId", "workEndDeviceId", "workStartShiftId", "workEndShiftId", "workStartShiftName", "workEndShiftName", "accountId", "ruleGroupId", "ruleId", "ruleName", "ruleType", "isContinuousShift", "status", "createdAt", "updatedAt") VALUES (34, '202605002', NULL, 1778302800000, '[{"id":7,"employeeNo":"202605002","punchTime":"2026-05-09T05:00:00.000Z","deviceId":12,"punchType":"IN","location":null,"source":"MANUAL","accountId":26,"createdAt":"2026-05-26T13:52:56.041Z","mergedAccountId":28,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//喷漆"}]', 1778302800000, '[null]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 20, NULL, 1, 'A001', 'scheduled', 0, 'PENDING', 1779803576150, 1779803576150);
INSERT INTO "AttendancePunchPair" ("id", "employeeNo", "employeeName", "punchDate", "workStartPunches", "workStartPunchTime", "workEndPunches", "workEndPunchTime", "workStartDeviceId", "workEndDeviceId", "workStartShiftId", "workEndShiftId", "workStartShiftName", "workEndShiftName", "accountId", "ruleGroupId", "ruleId", "ruleName", "ruleType", "isContinuousShift", "status", "createdAt", "updatedAt") VALUES (35, '202605002', NULL, 1778389200000, '[{"id":1,"employeeNo":"202605002","punchTime":"2026-05-09T23:00:00.000Z","deviceId":11,"punchType":"IN","location":null,"source":"MANUAL","accountId":null,"createdAt":"2026-05-26T04:10:38.696Z","mergedAccountId":24,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L1产线//"}]', 1778367600000, '[{"id":2,"employeeNo":"202605002","punchTime":"2026-05-10T04:00:00.000Z","deviceId":11,"punchType":"OUT","location":null,"source":"MANUAL","accountId":null,"createdAt":"2026-05-26T04:11:08.761Z","mergedAccountId":24,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L1产线//"}]', 1778385600000, NULL, NULL, NULL, NULL, NULL, NULL, 20, NULL, 1, 'A001', 'scheduled', 0, 'PENDING', 1779803576367, 1779803576367);
INSERT INTO "AttendancePunchPair" ("id", "employeeNo", "employeeName", "punchDate", "workStartPunches", "workStartPunchTime", "workEndPunches", "workEndPunchTime", "workStartDeviceId", "workEndDeviceId", "workStartShiftId", "workEndShiftId", "workStartShiftName", "workEndShiftName", "accountId", "ruleGroupId", "ruleId", "ruleName", "ruleType", "isContinuousShift", "status", "createdAt", "updatedAt") VALUES (36, '202605002', NULL, 1778389200000, '[{"id":3,"employeeNo":"202605002","punchTime":"2026-05-10T04:00:00.000Z","deviceId":12,"punchType":"IN","location":null,"source":"MANUAL","accountId":null,"createdAt":"2026-05-26T04:11:44.335Z","mergedAccountId":25,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//"}]', 1778385600000, '[{"id":4,"employeeNo":"202605002","punchTime":"2026-05-10T10:00:00.000Z","deviceId":12,"punchType":"OUT","location":null,"source":"MANUAL","accountId":null,"createdAt":"2026-05-26T04:12:21.550Z","mergedAccountId":25,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//"}]', 1778407200000, NULL, NULL, NULL, NULL, NULL, NULL, 20, NULL, 1, 'A001', 'scheduled', 0, 'PENDING', 1779803576370, 1779803576370);
INSERT INTO "AttendancePunchPair" ("id", "employeeNo", "employeeName", "punchDate", "workStartPunches", "workStartPunchTime", "workEndPunches", "workEndPunchTime", "workStartDeviceId", "workEndDeviceId", "workStartShiftId", "workEndShiftId", "workStartShiftName", "workEndShiftName", "accountId", "ruleGroupId", "ruleId", "ruleName", "ruleType", "isContinuousShift", "status", "createdAt", "updatedAt") VALUES (37, '202605002', NULL, 1778389200000, '[null]', NULL, '[{"id":5,"employeeNo":"202605002","punchTime":"2026-05-10T11:00:00.000Z","deviceId":12,"punchType":"OUT","location":null,"source":"MANUAL","accountId":null,"createdAt":"2026-05-26T04:12:46.317Z","mergedAccountId":25,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//"}]', 1778410800000, NULL, NULL, NULL, NULL, NULL, NULL, 20, NULL, 1, 'A001', 'scheduled', 0, 'PENDING', 1779803576373, 1779803576373);
INSERT INTO "AttendancePunchPair" ("id", "employeeNo", "employeeName", "punchDate", "workStartPunches", "workStartPunchTime", "workEndPunches", "workEndPunchTime", "workStartDeviceId", "workEndDeviceId", "workStartShiftId", "workEndShiftId", "workStartShiftName", "workEndShiftName", "accountId", "ruleGroupId", "ruleId", "ruleName", "ruleType", "isContinuousShift", "status", "createdAt", "updatedAt") VALUES (38, '202605002', NULL, 1778313600000, '[{"id":6,"employeeNo":"202605002","punchTime":"2026-05-09T00:00:00.000Z","deviceId":12,"punchType":"IN","location":null,"source":"MANUAL","accountId":21,"createdAt":"2026-05-26T13:52:05.423Z","mergedAccountId":23,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//焊接"}]', 1778284800000, '[{"id":8,"employeeNo":"202605002","punchTime":"2026-05-09T08:00:00.000Z","deviceId":12,"punchType":"OUT","location":null,"source":"MANUAL","accountId":29,"createdAt":"2026-05-26T13:54:17.674Z","mergedAccountId":23,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//焊接"}]', 1778313600000, NULL, NULL, NULL, NULL, NULL, NULL, 20, NULL, 1, 'A001', 'scheduled', 0, 'PENDING', 1779803657787, 1779803657787);
INSERT INTO "AttendancePunchPair" ("id", "employeeNo", "employeeName", "punchDate", "workStartPunches", "workStartPunchTime", "workEndPunches", "workEndPunchTime", "workStartDeviceId", "workEndDeviceId", "workStartShiftId", "workEndShiftId", "workStartShiftName", "workEndShiftName", "accountId", "ruleGroupId", "ruleId", "ruleName", "ruleType", "isContinuousShift", "status", "createdAt", "updatedAt") VALUES (39, '202605002', NULL, 1778313600000, '[{"id":7,"employeeNo":"202605002","punchTime":"2026-05-09T05:00:00.000Z","deviceId":12,"punchType":"IN","location":null,"source":"MANUAL","accountId":26,"createdAt":"2026-05-26T13:52:56.041Z","mergedAccountId":28,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//喷漆"}]', 1778302800000, '[null]', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 20, NULL, 1, 'A001', 'scheduled', 0, 'PENDING', 1779803657790, 1779803657790);
INSERT INTO "AttendancePunchPair" ("id", "employeeNo", "employeeName", "punchDate", "workStartPunches", "workStartPunchTime", "workEndPunches", "workEndPunchTime", "workStartDeviceId", "workEndDeviceId", "workStartShiftId", "workEndShiftId", "workStartShiftName", "workEndShiftName", "accountId", "ruleGroupId", "ruleId", "ruleName", "ruleType", "isContinuousShift", "status", "createdAt", "updatedAt") VALUES (40, '202605002', NULL, 1778400000000, '[{"id":1,"employeeNo":"202605002","punchTime":"2026-05-09T23:00:00.000Z","deviceId":11,"punchType":"IN","location":null,"source":"MANUAL","accountId":null,"createdAt":"2026-05-26T04:10:38.696Z","mergedAccountId":24,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L1产线//"}]', 1778367600000, '[{"id":2,"employeeNo":"202605002","punchTime":"2026-05-10T04:00:00.000Z","deviceId":11,"punchType":"OUT","location":null,"source":"MANUAL","accountId":null,"createdAt":"2026-05-26T04:11:08.761Z","mergedAccountId":24,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L1产线//"}]', 1778385600000, NULL, NULL, NULL, NULL, NULL, NULL, 20, NULL, 1, 'A001', 'scheduled', 0, 'PENDING', 1779803658012, 1779803658012);
INSERT INTO "AttendancePunchPair" ("id", "employeeNo", "employeeName", "punchDate", "workStartPunches", "workStartPunchTime", "workEndPunches", "workEndPunchTime", "workStartDeviceId", "workEndDeviceId", "workStartShiftId", "workEndShiftId", "workStartShiftName", "workEndShiftName", "accountId", "ruleGroupId", "ruleId", "ruleName", "ruleType", "isContinuousShift", "status", "createdAt", "updatedAt") VALUES (41, '202605002', NULL, 1778400000000, '[{"id":3,"employeeNo":"202605002","punchTime":"2026-05-10T04:00:00.000Z","deviceId":12,"punchType":"IN","location":null,"source":"MANUAL","accountId":null,"createdAt":"2026-05-26T04:11:44.335Z","mergedAccountId":25,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//"}]', 1778385600000, '[{"id":4,"employeeNo":"202605002","punchTime":"2026-05-10T10:00:00.000Z","deviceId":12,"punchType":"OUT","location":null,"source":"MANUAL","accountId":null,"createdAt":"2026-05-26T04:12:21.550Z","mergedAccountId":25,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//"}]', 1778407200000, NULL, NULL, NULL, NULL, NULL, NULL, 20, NULL, 1, 'A001', 'scheduled', 0, 'PENDING', 1779803658015, 1779803658015);
INSERT INTO "AttendancePunchPair" ("id", "employeeNo", "employeeName", "punchDate", "workStartPunches", "workStartPunchTime", "workEndPunches", "workEndPunchTime", "workStartDeviceId", "workEndDeviceId", "workStartShiftId", "workEndShiftId", "workStartShiftName", "workEndShiftName", "accountId", "ruleGroupId", "ruleId", "ruleName", "ruleType", "isContinuousShift", "status", "createdAt", "updatedAt") VALUES (42, '202605002', NULL, 1778400000000, '[null]', NULL, '[{"id":5,"employeeNo":"202605002","punchTime":"2026-05-10T11:00:00.000Z","deviceId":12,"punchType":"OUT","location":null,"source":"MANUAL","accountId":null,"createdAt":"2026-05-26T04:12:46.317Z","mergedAccountId":25,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//"}]', 1778410800000, NULL, NULL, NULL, NULL, NULL, NULL, 20, NULL, 1, 'A001', 'scheduled', 0, 'PENDING', 1779803658018, 1779803658018);
INSERT INTO "AttendancePunchPair" ("id", "employeeNo", "employeeName", "punchDate", "workStartPunches", "workStartPunchTime", "workEndPunches", "workEndPunchTime", "workStartDeviceId", "workEndDeviceId", "workStartShiftId", "workEndShiftId", "workStartShiftName", "workEndShiftName", "accountId", "ruleGroupId", "ruleId", "ruleName", "ruleType", "isContinuousShift", "status", "createdAt", "updatedAt") VALUES (43, '202605002', NULL, 1778324400000, '[{"id":23,"employeeNo":"202605002","punchTime":"2026-05-09T00:00:00.000Z","deviceId":11,"punchType":"IN","location":null,"source":"MANUAL","accountId":8,"createdAt":"2026-05-26T16:42:50.453Z","mergedAccountId":24,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L1产线//"}]', 1778284800000, '[{"id":25,"employeeNo":"202605002","punchTime":"2026-05-09T02:00:00.000Z","deviceId":11,"punchType":"OUT","location":null,"source":"MANUAL","accountId":8,"createdAt":"2026-05-26T16:43:51.022Z","mergedAccountId":24,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L1产线//"}]', 1778292000000, NULL, NULL, NULL, NULL, NULL, NULL, 41, NULL, 1, 'A001', 'scheduled', 0, 'PENDING', 1779821617090, 1779821617090);
INSERT INTO "AttendancePunchPair" ("id", "employeeNo", "employeeName", "punchDate", "workStartPunches", "workStartPunchTime", "workEndPunches", "workEndPunchTime", "workStartDeviceId", "workEndDeviceId", "workStartShiftId", "workEndShiftId", "workStartShiftName", "workEndShiftName", "accountId", "ruleGroupId", "ruleId", "ruleName", "ruleType", "isContinuousShift", "status", "createdAt", "updatedAt") VALUES (44, '202605002', NULL, 1778324400000, '[{"id":26,"employeeNo":"202605002","punchTime":"2026-05-09T03:00:00.000Z","deviceId":12,"punchType":"IN","location":null,"source":"MANUAL","accountId":7,"createdAt":"2026-05-26T16:44:32.329Z","mergedAccountId":25,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//"}]', 1778295600000, '[{"id":27,"employeeNo":"202605002","punchTime":"2026-05-09T04:00:00.000Z","deviceId":12,"punchType":"OUT","location":null,"source":"MANUAL","accountId":7,"createdAt":"2026-05-26T16:44:57.862Z","mergedAccountId":25,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//"}]', 1778299200000, NULL, NULL, NULL, NULL, NULL, NULL, 41, NULL, 1, 'A001', 'scheduled', 0, 'PENDING', 1779821617114, 1779821617114);
INSERT INTO "AttendancePunchPair" ("id", "employeeNo", "employeeName", "punchDate", "workStartPunches", "workStartPunchTime", "workEndPunches", "workEndPunchTime", "workStartDeviceId", "workEndDeviceId", "workStartShiftId", "workEndShiftId", "workStartShiftName", "workEndShiftName", "accountId", "ruleGroupId", "ruleId", "ruleName", "ruleType", "isContinuousShift", "status", "createdAt", "updatedAt") VALUES (45, '202605002', NULL, 1778324400000, '[{"id":28,"employeeNo":"202605002","punchTime":"2026-05-09T06:00:00.000Z","deviceId":11,"punchType":"IN","location":null,"source":"MANUAL","accountId":8,"createdAt":"2026-05-26T16:47:42.732Z","mergedAccountId":24,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L1产线//"}]', 1778306400000, '[{"id":29,"employeeNo":"202605002","punchTime":"2026-05-09T08:00:00.000Z","deviceId":11,"punchType":"OUT","location":null,"source":"MANUAL","accountId":8,"createdAt":"2026-05-26T16:48:22.522Z","mergedAccountId":24,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L1产线//"}]', 1778313600000, NULL, NULL, NULL, NULL, NULL, NULL, 41, NULL, 1, 'A001', 'scheduled', 0, 'PENDING', 1779821617118, 1779821617118);
INSERT INTO "AttendancePunchPair" ("id", "employeeNo", "employeeName", "punchDate", "workStartPunches", "workStartPunchTime", "workEndPunches", "workEndPunchTime", "workStartDeviceId", "workEndDeviceId", "workStartShiftId", "workEndShiftId", "workStartShiftName", "workEndShiftName", "accountId", "ruleGroupId", "ruleId", "ruleName", "ruleType", "isContinuousShift", "status", "createdAt", "updatedAt") VALUES (46, '202605002', NULL, 1778324400000, '[{"id":30,"employeeNo":"202605002","punchTime":"2026-05-09T09:00:00.000Z","deviceId":12,"punchType":"IN","location":null,"source":"MANUAL","accountId":28,"createdAt":"2026-05-26T17:02:00.279Z","mergedAccountId":28,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//喷漆"}]', 1778317200000, '[{"id":31,"employeeNo":"202605002","punchTime":"2026-05-09T11:00:00.000Z","deviceId":12,"punchType":"OUT","location":null,"source":"MANUAL","accountId":28,"createdAt":"2026-05-26T18:53:36.769Z","mergedAccountId":28,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//喷漆"}]', 1778324400000, NULL, NULL, NULL, NULL, NULL, NULL, 41, NULL, 1, 'A001', 'scheduled', 0, 'PENDING', 1779821617121, 1779821617121);
INSERT INTO "AttendancePunchPair" ("id", "employeeNo", "employeeName", "punchDate", "workStartPunches", "workStartPunchTime", "workEndPunches", "workEndPunchTime", "workStartDeviceId", "workEndDeviceId", "workStartShiftId", "workEndShiftId", "workStartShiftName", "workEndShiftName", "accountId", "ruleGroupId", "ruleId", "ruleName", "ruleType", "isContinuousShift", "status", "createdAt", "updatedAt") VALUES (47, '202605002', NULL, 1778410800000, '[{"id":15,"employeeNo":"202605002","punchTime":"2026-05-09T23:00:00.000Z","deviceId":11,"punchType":"IN","location":null,"source":"MANUAL","accountId":8,"createdAt":"2026-05-26T15:43:13.363Z","mergedAccountId":24,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L1产线//"}]', 1778367600000, '[{"id":16,"employeeNo":"202605002","punchTime":"2026-05-10T04:00:00.000Z","deviceId":11,"punchType":"OUT","location":null,"source":"MANUAL","accountId":8,"createdAt":"2026-05-26T15:43:39.943Z","mergedAccountId":24,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L1产线//"}]', 1778385600000, NULL, NULL, NULL, NULL, NULL, NULL, 41, NULL, 1, 'A001', 'scheduled', 0, 'PENDING', 1779821617381, 1779821617381);
INSERT INTO "AttendancePunchPair" ("id", "employeeNo", "employeeName", "punchDate", "workStartPunches", "workStartPunchTime", "workEndPunches", "workEndPunchTime", "workStartDeviceId", "workEndDeviceId", "workStartShiftId", "workEndShiftId", "workStartShiftName", "workEndShiftName", "accountId", "ruleGroupId", "ruleId", "ruleName", "ruleType", "isContinuousShift", "status", "createdAt", "updatedAt") VALUES (48, '202605002', NULL, 1778410800000, '[{"id":21,"employeeNo":"202605002","punchTime":"2026-05-10T05:00:00.000Z","deviceId":12,"punchType":"IN","location":null,"source":"MANUAL","accountId":7,"createdAt":"2026-05-26T16:32:29.563Z","mergedAccountId":25,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//"}]', 1778389200000, '[{"id":22,"employeeNo":"202605002","punchTime":"2026-05-10T11:00:00.000Z","deviceId":12,"punchType":"OUT","location":null,"source":"MANUAL","accountId":7,"createdAt":"2026-05-26T16:32:57.778Z","mergedAccountId":25,"mergedAccountPath":"大华工厂/W1总装车间/W1总装L2产线//"}]', 1778410800000, NULL, NULL, NULL, NULL, NULL, NULL, 41, NULL, 1, 'A001', 'scheduled', 0, 'PENDING', 1779821617385, 1779821617385);

-- 数据导入: AttendanceRuleGroup
INSERT INTO "AttendanceRuleGroup" ("id", "code", "name", "description", "isDefault", "status", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt", "deletedAt") VALUES (1, 'ARG_001', '考勤规则组', NULL, 0, 'ACTIVE', 1, 'admin', 1779766721387, NULL, NULL, 1779983525771, NULL);

-- 数据导入: AttendanceRuleGroupDetail
INSERT INTO "AttendanceRuleGroupDetail" ("id", "ruleGroupId", "ruleName", "attendanceCodeIds", "amountPolicyIds", "sortOrder", "createdAt", "updatedAt", "attendancePunchRuleId", "leanPunchRuleId") VALUES (2, 1, '考勤规则组', '[1,2,3,4]', '[1]', 0, 1779983525773, 1779983525773, 1, 2);

-- 数据导入: AuditLog
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (1, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798165972453662，配置：按产量分摊车间工时', 1, 'AllocationConfig', NULL, '{"batchNo":"ALC17798165972453662","startDate":"2026-05-10","endDate":"2026-05-10","resultCount":0}', NULL, 1, 'Admin', 1779816597274, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (2, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798173148706657，配置：按产量分摊车间工时', 1, 'AllocationConfig', NULL, '{"batchNo":"ALC17798173148706657","startDate":"2026-05-10","endDate":"2026-05-10","resultCount":0}', NULL, 1, 'Admin', 1779817314907, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (3, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798179024329154，配置：按产量分摊车间工时', 1, 'AllocationConfig', NULL, '{"batchNo":"ALC17798179024329154","startDate":"2026-05-10","endDate":"2026-05-10","resultCount":0}', NULL, 1, 'Admin', 1779817902468, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (4, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798181397698260，配置：按产量分摊车间工时', 1, 'AllocationConfig', NULL, '{"batchNo":"ALC17798181397698260","startDate":"2026-05-10","endDate":"2026-05-10","resultCount":0}', NULL, 1, 'Admin', 1779818139799, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (5, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798184127449532，配置：按产量分摊车间工时', 1, 'AllocationConfig', NULL, '{"batchNo":"ALC17798184127449532","startDate":"2026-05-10","endDate":"2026-05-27","resultCount":0}', NULL, 1, 'Admin', 1779818412778, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (6, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798197213905759，配置：按产量分摊车间工时', 1, 'AllocationConfig', NULL, '{"batchNo":"ALC17798197213905759","startDate":"2026-05-03","endDate":"2026-05-27","resultCount":0}', NULL, 1, 'Admin', 1779819721427, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (7, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798211348122300，配置：按产量分摊车间工时', 1, 'AllocationConfig', NULL, '{"batchNo":"ALC17798211348122300","startDate":"2026-05-10","endDate":"2026-05-27","resultCount":2}', NULL, 1, 'Admin', 1779821134876, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (8, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798215531896394，配置：按产量分摊车间工时', 1, 'AllocationConfig', NULL, '{"batchNo":"ALC17798215531896394","startDate":"2026-05-10","endDate":"2026-05-27","resultCount":2}', NULL, 1, 'Admin', 1779821553256, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (9, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798217483726447，配置：按产量分摊车间工时', 1, 'AllocationConfig', NULL, '{"batchNo":"ALC17798217483726447","startDate":"2026-05-10","endDate":"2026-05-27","resultCount":2}', NULL, 1, 'Admin', 1779821748431, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (10, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798219906111075，配置：按产量分摊车间工时', 1, 'AllocationConfig', NULL, '{"batchNo":"ALC17798219906111075","startDate":"2026-05-03","endDate":"2026-05-27","resultCount":2}', NULL, 1, 'Admin', 1779821990682, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (11, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798221106756559，配置：按产量分摊车间工时', 1, 'AllocationConfig', NULL, '{"batchNo":"ALC17798221106756559","startDate":"2026-05-10","endDate":"2026-05-27","resultCount":2}', NULL, 1, 'Admin', 1779822110735, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (12, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798499047378681，配置：按产量分摊车间工时', 1, 'AllocationConfig', NULL, '{"batchNo":"ALC17798499047378681","startDate":"2026-05-01","endDate":"2026-05-27","resultCount":2}', NULL, 1, 'Admin', 1779849904810, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (13, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798899781325364，配置：按产量分摊车间工时', 1, 'AllocationConfig', NULL, '{"batchNo":"ALC17798899781325364","startDate":"2026-05-03","endDate":"2026-05-27","resultCount":2}', NULL, 1, 'Admin', 1779889978198, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (14, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798911475390599，配置：按产量分摊车间工时', 1, 'AllocationConfig', NULL, '{"batchNo":"ALC17798911475390599","startDate":"2026-05-20","endDate":"2026-05-27","resultCount":0}', NULL, 1, 'Admin', 1779891147564, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (15, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798913397149286，配置：按产量分摊车间工时', 1, 'AllocationConfig', NULL, '{"batchNo":"ALC17798913397149286","startDate":"2026-05-20","endDate":"2026-05-27","resultCount":2}', NULL, 1, 'Admin', 1779891339769, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (16, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798938212237316，配置：按产量分摊车间工时', 1, 'AllocationConfig', NULL, '{"batchNo":"ALC17798938212237316","startDate":"2026-05-20","endDate":"2026-05-27","resultCount":2}', NULL, 1, 'Admin', 1779893821370, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (17, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798942055534107，配置：A0003', 3, 'AllocationConfig', NULL, '{"batchNo":"ALC17798942055534107","startDate":"2026-05-20","endDate":"2026-05-27","resultCount":0}', NULL, 1, 'Admin', 1779894205638, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (18, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798950280854494，配置：A0004', 4, 'AllocationConfig', NULL, '{"batchNo":"ALC17798950280854494","startDate":"2026-05-20","endDate":"2026-05-27","resultCount":0}', NULL, 1, 'Admin', 1779895028171, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (19, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798962618580837，配置：A0005', 5, 'AllocationConfig', NULL, '{"batchNo":"ALC17798962618580837","startDate":"2026-05-20","endDate":"2026-05-27","resultCount":2}', NULL, 1, 'Admin', 1779896261959, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (20, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798963516291892，配置：A0006', 6, 'AllocationConfig', NULL, '{"batchNo":"ALC17798963516291892","startDate":"2026-05-20","endDate":"2026-05-27","resultCount":2}', NULL, 1, 'Admin', 1779896351730, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (21, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798964693815683，配置：A0007', 7, 'AllocationConfig', NULL, '{"batchNo":"ALC17798964693815683","startDate":"2026-05-20","endDate":"2026-05-27","resultCount":0}', NULL, 1, 'Admin', 1779896469445, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (22, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798974784085769，配置：A0007', 7, 'AllocationConfig', NULL, '{"batchNo":"ALC17798974784085769","startDate":"2026-05-20","endDate":"2026-05-27","resultCount":0}', NULL, 1, 'Admin', 1779897478564, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (23, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798977012548375，配置：A0007', 7, 'AllocationConfig', NULL, '{"batchNo":"ALC17798977012548375","startDate":"2026-05-21","endDate":"2026-05-28","resultCount":0}', NULL, 1, 'Admin', 1779897701360, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (24, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798985652461006，配置：A0007', 7, 'AllocationConfig', NULL, '{"batchNo":"ALC17798985652461006","startDate":"2026-05-21","endDate":"2026-05-28","resultCount":0}', NULL, 1, 'Admin', 1779898565383, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (25, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798988630167230，配置：A0007', 7, 'AllocationConfig', NULL, '{"batchNo":"ALC17798988630167230","startDate":"2026-05-21","endDate":"2026-05-28","resultCount":0}', NULL, 1, 'Admin', 1779898863125, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (26, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798989929576115，配置：A0007', 7, 'AllocationConfig', NULL, '{"batchNo":"ALC17798989929576115","startDate":"2026-05-21","endDate":"2026-05-28","resultCount":2}', NULL, 1, 'Admin', 1779898993025, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (27, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17798995445240936，配置：A0007', 7, 'AllocationConfig', NULL, '{"batchNo":"ALC17798995445240936","startDate":"2026-05-21","endDate":"2026-05-28","resultCount":2}', NULL, 1, 'Admin', 1779899544624, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (28, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17799868516264297，配置：A0007', 7, 'AllocationConfig', NULL, '{"batchNo":"ALC17799868516264297","startDate":"2026-05-22","endDate":"2026-05-29","resultCount":2}', NULL, 1, 'Admin', 1779986851770, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (29, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17799868779598693，配置：A0006', 6, 'AllocationConfig', NULL, '{"batchNo":"ALC17799868779598693","startDate":"2026-05-22","endDate":"2026-05-29","resultCount":0}', NULL, 1, 'Admin', 1779986878061, 'SUCCESS', NULL);
INSERT INTO "AuditLog" ("id", "module", "operationType", "operationDesc", "targetId", "targetType", "oldValue", "newValue", "requestIp", "operatorId", "operatorName", "operationTime", "result", "errorMsg") VALUES (30, 'ALLOCATION', 'EXECUTE', '执行间接工时分摊计算，批次号：ALC17799868891289204，配置：A0005', 5, 'AllocationConfig', NULL, '{"batchNo":"ALC17799868891289204","startDate":"2026-05-22","endDate":"2026-05-29","resultCount":2}', NULL, 1, 'Admin', 1779986889248, 'SUCCESS', NULL);

-- 数据导入: CalcResult
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (113, '202605002', 1778371200000, 8, '生产长白班', NULL, 1, 1778371200000, 1778385600000, 4.0, 4.0, 0.0, 0.0, 0.0, '[]', '[]', 'COMPLETED', 1779810219993, 1779869892823, 8, '大华工厂/W1总装车间/W1总装L1产线/-/焊接', 'DH/DH01/DH0101/-/A01', 80.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (114, '202605004', 1778371200000, 8, '生产长白班', NULL, 2, 1778371200000, 1778385600000, 4.0, 4.0, 0.0, 0.0, 0.0, '[]', '[]', 'COMPLETED', 1779810387182, 1779869892866, 31, '杭州工厂/W1总装车间///', 'DH/DH01///', 0.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (115, '202605004', 1778371200000, 8, '生产长白班', NULL, 2, 1778389200000, 1778407200000, 5.0, 5.0, 0.0, 0.0, 0.0, '[]', '[]', 'COMPLETED', 1779810387193, 1779869892870, 31, '杭州工厂/W1总装车间///', 'DH/DH01///', 0.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (116, '202605003', 1778371200000, 8, '生产长白班', NULL, 2, 1778371200000, 1778385600000, 4.0, 4.0, 0.0, 0.0, 0.0, '[]', '[]', 'COMPLETED', 1779813053328, 1779869892890, 31, '杭州工厂/W1总装车间///', 'DH/DH01///', 0.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (117, '202605003', 1778371200000, 8, '生产长白班', NULL, 2, 1778389200000, 1778403600000, 4.0, 4.0, 0.0, 0.0, 0.0, '[]', '[]', 'COMPLETED', 1779813053339, 1779869892894, 31, '杭州工厂/W1总装车间///', 'DH/DH01///', 0.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (118, '202605002', 1778371200000, 8, '生产长白班', NULL, 1, 1778389200000, 1778407200000, 5.0, 5.0, 0.0, 0.0, 0.0, '[]', '[]', 'COMPLETED', 1779813177858, 1779869892846, 7, '大华工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 100.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (119, '202605002', 1778284800000, 8, '生产长白班', NULL, 1, 1778284800000, 1778292000000, 2.0, 2.0, 0.0, 0.0, 0.0, '[]', '[]', 'COMPLETED', 1779813831062, 1779869892691, 8, '大华工厂/W1总装车间/W1总装L1产线/-/焊接', 'DH/DH01/DH0101/-/A01', 40.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (120, '202605002', 1778284800000, 8, '生产长白班', NULL, 1, 1778295600000, 1778299200000, 1.0, 1.0, 0.0, 0.0, 0.0, '[]', '[]', 'COMPLETED', 1779813897922, 1779869892767, 7, '大华工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 20.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (121, '202605002', 1778284800000, 8, '生产长白班', NULL, 1, 1778306400000, 1778313600000, 2.0, 2.0, 0.0, 0.0, 0.0, '[]', '[]', 'COMPLETED', 1779814102616, 1779869892728, 8, '大华工厂/W1总装车间/W1总装L1产线/-/焊接', 'DH/DH01/DH0101/-/A01', 40.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (122, '202605002', 1778324400000, NULL, NULL, NULL, 4, 1778284800000, 1778299200000, 4.0, 4.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":33,"sourceBatchId":"AUTO_202605002_1778324400000","remark":"来自考勤打卡收卡记录 #33，班段内时数，班段：NORMAL"}', 'PENDING', 1779821617197, 1779821617197, 21, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 80.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (123, '202605002', 1778324400000, NULL, NULL, NULL, 4, 1778284800000, 1778299200000, 4.0, 4.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":38,"sourceBatchId":"AUTO_202605002_1778324400000","remark":"来自考勤打卡收卡记录 #38，班段内时数，班段：NORMAL"}', 'PENDING', 1779821617206, 1779821617206, 21, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 80.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (124, '202605002', 1778324400000, NULL, NULL, NULL, 4, 1778284800000, 1778292000000, 2.0, 2.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":43,"sourceBatchId":"AUTO_202605002_1778324400000","remark":"来自考勤打卡收卡记录 #43，班段内时数，班段：NORMAL"}', 'PENDING', 1779821617213, 1779821617213, 8, '大华工厂/W1总装车间/W1总装L1产线/-/焊接', 'DH/DH01/DH0101/-/A01', 40.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (125, '202605002', 1778324400000, NULL, NULL, NULL, 4, 1778295600000, 1778299200000, 1.0, 1.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":44,"sourceBatchId":"AUTO_202605002_1778324400000","remark":"来自考勤打卡收卡记录 #44，班段内时数，班段：NORMAL"}', 'PENDING', 1779821617222, 1779821617222, 7, '大华工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 20.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (126, '202605002', 1778324400000, NULL, NULL, NULL, 4, 1778302800000, 1778313600000, 3.0, 3.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":38,"sourceBatchId":"AUTO_202605002_1778324400000","remark":"来自考勤打卡收卡记录 #38，班段内时数，班段：NORMAL"}', 'PENDING', 1779821617228, 1779821617228, 21, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 60.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (127, '202605002', 1778324400000, NULL, NULL, NULL, 4, 1778306400000, 1778313600000, 2.0, 2.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":45,"sourceBatchId":"AUTO_202605002_1778324400000","remark":"来自考勤打卡收卡记录 #45，班段内时数，班段：NORMAL"}', 'PENDING', 1779821617237, 1779821617237, 8, '大华工厂/W1总装车间/W1总装L1产线/-/焊接', 'DH/DH01/DH0101/-/A01', 40.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (128, '202605002', 1778324400000, NULL, NULL, NULL, 4, 1778317200000, 1778324400000, 2.0, 2.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":46,"sourceBatchId":"AUTO_202605002_1778324400000","remark":"来自考勤打卡收卡记录 #46，班段内时数，班段：NORMAL（合并了2段相邻工时）"}', 'PENDING', 1779821617245, 1779821617245, 28, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 40.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (129, '202605002', 1778410800000, NULL, NULL, NULL, 4, 1778367600000, 1778371200000, 1.0, 1.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":30,"sourceBatchId":"AUTO_202605002_1778410800000","remark":"来自考勤打卡收卡记录 #30，班外时数"}', 'PENDING', 1779821617473, 1779821617473, 41, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 20.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (130, '202605002', 1778410800000, NULL, NULL, NULL, 4, 1778367600000, 1778371200000, 1.0, 1.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":35,"sourceBatchId":"AUTO_202605002_1778410800000","remark":"来自考勤打卡收卡记录 #35，班外时数"}', 'PENDING', 1779821617480, 1779821617480, 41, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 20.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (131, '202605002', 1778410800000, NULL, NULL, NULL, 4, 1778367600000, 1778371200000, 1.0, 1.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":40,"sourceBatchId":"AUTO_202605002_1778410800000","remark":"来自考勤打卡收卡记录 #40，班外时数"}', 'PENDING', 1779821617488, 1779821617488, 41, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 20.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (132, '202605002', 1778410800000, NULL, NULL, NULL, 4, 1778367600000, 1778371200000, 1.0, 1.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":47,"sourceBatchId":"AUTO_202605002_1778410800000","remark":"来自考勤打卡收卡记录 #47，班外时数"}', 'PENDING', 1779821617494, 1779821617494, 8, '大华工厂/W1总装车间/W1总装L1产线/-/焊接', 'DH/DH01/DH0101/-/A01', 20.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (133, '202605002', 1778410800000, NULL, NULL, NULL, 4, 1778371200000, 1778385600000, 4.0, 4.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":30,"sourceBatchId":"AUTO_202605002_1778410800000","remark":"来自考勤打卡收卡记录 #30，班段内时数，班段：NORMAL"}', 'PENDING', 1779821617503, 1779821617503, 41, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 80.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (134, '202605002', 1778410800000, NULL, NULL, NULL, 4, 1778371200000, 1778385600000, 4.0, 4.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":35,"sourceBatchId":"AUTO_202605002_1778410800000","remark":"来自考勤打卡收卡记录 #35，班段内时数，班段：NORMAL"}', 'PENDING', 1779821617509, 1779821617509, 41, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 80.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (135, '202605002', 1778410800000, NULL, NULL, NULL, 4, 1778371200000, 1778385600000, 4.0, 4.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":40,"sourceBatchId":"AUTO_202605002_1778410800000","remark":"来自考勤打卡收卡记录 #40，班段内时数，班段：NORMAL"}', 'PENDING', 1779821617515, 1779821617515, 41, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 80.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (136, '202605002', 1778410800000, NULL, NULL, NULL, 4, 1778371200000, 1778385600000, 4.0, 4.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":47,"sourceBatchId":"AUTO_202605002_1778410800000","remark":"来自考勤打卡收卡记录 #47，班段内时数，班段：NORMAL"}', 'PENDING', 1779821617521, 1779821617521, 8, '大华工厂/W1总装车间/W1总装L1产线/-/焊接', 'DH/DH01/DH0101/-/A01', 80.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (137, '202605002', 1778410800000, NULL, NULL, NULL, 4, 1778389200000, 1778407200000, 5.0, 5.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":31,"sourceBatchId":"AUTO_202605002_1778410800000","remark":"来自考勤打卡收卡记录 #31，班段内时数，班段：NORMAL"}', 'PENDING', 1779821617528, 1779821617528, 41, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 100.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (138, '202605002', 1778410800000, NULL, NULL, NULL, 4, 1778389200000, 1778407200000, 5.0, 5.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":36,"sourceBatchId":"AUTO_202605002_1778410800000","remark":"来自考勤打卡收卡记录 #36，班段内时数，班段：NORMAL"}', 'PENDING', 1779821617534, 1779821617534, 41, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 100.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (139, '202605002', 1778410800000, NULL, NULL, NULL, 4, 1778389200000, 1778407200000, 5.0, 5.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":41,"sourceBatchId":"AUTO_202605002_1778410800000","remark":"来自考勤打卡收卡记录 #41，班段内时数，班段：NORMAL"}', 'PENDING', 1779821617540, 1779821617540, 41, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 100.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (140, '202605002', 1778410800000, NULL, NULL, NULL, 4, 1778389200000, 1778410800000, 6.0, 6.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":48,"sourceBatchId":"AUTO_202605002_1778410800000","remark":"来自考勤打卡收卡记录 #48，班段内时数，班段：NORMAL（合并了2段相邻工时）"}', 'PENDING', 1779821617546, 1779821617546, 7, '大华工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 120.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (141, '202605002', 1778284800000, 8, '生产长白班', NULL, 1, 1778317200000, 1778320800000, 1.0, 1.0, 0.0, 0.0, 0.0, '[]', '[]', 'COMPLETED', 1779822767536, 1779869892790, 27, '杭州工厂/W1总装车间/W1总装L2产线/-/喷漆', 'DH/DH01/DH01002/-/A02', 20.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (142, '202605002', 1778284800000, 8, '生产长白班', NULL, 3, 1778317200000, 1778320800000, 1.0, 1.0, 0.0, 0.0, 0.0, '[]', '[]', 'COMPLETED', 1779822767544, 1779869892796, 27, '杭州工厂/W1总装车间/W1总装L2产线/-/喷漆', 'DH/DH01/DH01002/-/A02', 20.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (143, '202605002', 1778284800000, NULL, NULL, NULL, 4, 1778284800000, 1778299200000, 4.0, 4.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":33,"remark":"来自考勤打卡收卡记录 #33，班段内时数，班段：NORMAL"}', 'PENDING', 1779822880163, 1779822880163, 21, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 80.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (144, '202605002', 1778284800000, NULL, NULL, NULL, 4, 1778284800000, 1778299200000, 4.0, 4.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":38,"remark":"来自考勤打卡收卡记录 #38，班段内时数，班段：NORMAL"}', 'PENDING', 1779822880170, 1779822880170, 21, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 80.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (145, '202605002', 1778284800000, NULL, NULL, NULL, 4, 1778284800000, 1778292000000, 2.0, 2.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":43,"remark":"来自考勤打卡收卡记录 #43，班段内时数，班段：NORMAL"}', 'PENDING', 1779822880181, 1779822880181, 8, '大华工厂/W1总装车间/W1总装L1产线/-/焊接', 'DH/DH01/DH0101/-/A01', 40.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (146, '202605002', 1778284800000, NULL, NULL, NULL, 4, 1778295600000, 1778299200000, 1.0, 1.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":44,"remark":"来自考勤打卡收卡记录 #44，班段内时数，班段：NORMAL"}', 'PENDING', 1779822880187, 1779822880187, 7, '大华工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 20.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (147, '202605002', 1778284800000, NULL, NULL, NULL, 4, 1778302800000, 1778313600000, 3.0, 3.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":38,"remark":"来自考勤打卡收卡记录 #38，班段内时数，班段：NORMAL"}', 'PENDING', 1779822880198, 1779822880198, 21, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 60.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (148, '202605002', 1778284800000, NULL, NULL, NULL, 4, 1778306400000, 1778313600000, 2.0, 2.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":45,"remark":"来自考勤打卡收卡记录 #45，班段内时数，班段：NORMAL"}', 'PENDING', 1779822880204, 1779822880204, 8, '大华工厂/W1总装车间/W1总装L1产线/-/焊接', 'DH/DH01/DH0101/-/A01', 40.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (149, '202605002', 1778284800000, NULL, NULL, NULL, 4, 1778317200000, 1778324400000, 2.0, 2.0, 0.0, 0.0, 0.0, '[]', '{"source":1,"sourceType":"CALCULATED","sourceId":46,"remark":"来自考勤打卡收卡记录 #46，班段内时数，班段：NORMAL（合并了2段相邻工时）"}', 'PENDING', 1779822880214, 1779822880214, 28, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 40.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (152, '202605004', 1779840000000, 8, '生产长白班', NULL, 2, 1779840000000, 1779854400000, 4.0, 4.0, 0.0, 0.0, 0.0, '[]', '[]', 'COMPLETED', 1779867996241, 1779869892915, 31, '杭州工厂/W1总装车间///', 'DH/DH01///', 0.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (153, '202605004', 1779840000000, 8, '生产长白班', NULL, 2, 1779858000000, 1779876000000, 5.0, 5.0, 0.0, 0.0, 0.0, '[]', '[]', 'COMPLETED', 1779867996246, 1779869892919, 31, '杭州工厂/W1总装车间///', 'DH/DH01///', 0.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (155, '202605002', 1779840000000, 8, '生产长白班', NULL, 1, 1779840000000, 1779854400000, 4.0, 4.0, 0.0, 0.0, 0.0, '[]', '[]', 'COMPLETED', 1779869892946, 1779871155979, 42, '杭州工厂/W1总装车间/W1总装L1产线/-/焊接', 'DH/DH01/DH0101/-/A01', 80.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (156, '202605002', 1779840000000, 8, '生产长白班', NULL, 1, 1779861600000, 1779876000000, 4.0, 4.0, 0.0, 0.0, 0.0, '[]', '[]', 'COMPLETED', 1779871155986, 1779871155986, 43, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 80.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (157, '202605003', 1779840000000, 8, '生产长白班', NULL, 2, 1779843600000, 1779854400000, 3.0, 3.0, 0.0, 0.0, 0.0, '[]', '[]', 'COMPLETED', 1779891087943, 1779891109020, 31, '杭州工厂/W1总装车间///', 'DH/DH01///', 0.0);
INSERT INTO "CalcResult" ("id", "employeeNo", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "calculationAttendanceCodeId", "punchInTime", "punchOutTime", "standardHours", "actualHours", "overtimeHours", "leaveHours", "absenceHours", "accountHours", "exceptions", "status", "createdAt", "updatedAt", "accountId", "accountName", "accountPath", "amount") VALUES (158, '202605003', 1779840000000, 8, '生产长白班', NULL, 2, 1779858000000, 1779872400000, 4.0, 4.0, 0.0, 0.0, 0.0, '[]', '[]', 'COMPLETED', 1779891087949, 1779891109030, 31, '杭州工厂/W1总装车间///', 'DH/DH01///', 0.0);

-- 数据导入: CalculationAttendanceCode
INSERT INTO "CalculationAttendanceCode" ("id", "code", "name", "description", "type", "accountLevels", "unit", "deductMeal", "includeOutside", "onlyOutside", "showInDetailPage", "showInAttendancePage", "calculateHours", "calculateAmount", "priority", "color", "status", "definitionAttendanceCode", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "createdAt", "updatedAt") VALUES (1, 'AC_001', '线体工时', NULL, 'LEAN_HOURS', '[0,1,2]', 'HOURS', 1, 1, 0, 0, 0, 1, 1, 0, '#1890ff', 'ACTIVE', NULL, NULL, NULL, 1779435297938, 1779439001888);
INSERT INTO "CalculationAttendanceCode" ("id", "code", "name", "description", "type", "accountLevels", "unit", "deductMeal", "includeOutside", "onlyOutside", "showInDetailPage", "showInAttendancePage", "calculateHours", "calculateAmount", "priority", "color", "status", "definitionAttendanceCode", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "createdAt", "updatedAt") VALUES (2, 'AC_002', '车间工时', NULL, 'LEAN_HOURS', '[0,1]', 'HOURS', 1, 1, 0, 0, 0, 1, 1, 0, '#1890ff', 'ACTIVE', NULL, NULL, NULL, 1779435336820, 1779439001911);
INSERT INTO "CalculationAttendanceCode" ("id", "code", "name", "description", "type", "accountLevels", "unit", "deductMeal", "includeOutside", "onlyOutside", "showInDetailPage", "showInAttendancePage", "calculateHours", "calculateAmount", "priority", "color", "status", "definitionAttendanceCode", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "createdAt", "updatedAt") VALUES (3, 'AC_003', '工序工时', NULL, 'LEAN_HOURS', '[0,1,2,4]', 'HOURS', 1, 1, 0, 0, 0, 1, 1, 0, '#1890ff', 'ACTIVE', NULL, NULL, NULL, 1779435357786, 1779435374708);
INSERT INTO "CalculationAttendanceCode" ("id", "code", "name", "description", "type", "accountLevels", "unit", "deductMeal", "includeOutside", "onlyOutside", "showInDetailPage", "showInAttendancePage", "calculateHours", "calculateAmount", "priority", "color", "status", "definitionAttendanceCode", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "createdAt", "updatedAt") VALUES (4, 'AC_004', '出勤工时', NULL, 'ATTENDANCE_HOURS', '[]', 'HOURS', 1, 1, 0, 0, 0, 1, 1, 0, '#1890ff', 'ACTIVE', NULL, NULL, NULL, 1779435389818, 1779435394632);
INSERT INTO "CalculationAttendanceCode" ("id", "code", "name", "description", "type", "accountLevels", "unit", "deductMeal", "includeOutside", "onlyOutside", "showInDetailPage", "showInAttendancePage", "calculateHours", "calculateAmount", "priority", "color", "status", "definitionAttendanceCode", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "createdAt", "updatedAt") VALUES (5, 'AC_005', '作业工时', NULL, 'ATTENDANCE_HOURS', '[]', 'HOURS', 0, 0, 0, 0, 0, 1, 1, 0, '#1890ff', 'ACTIVE', NULL, NULL, NULL, 1779982531241, 1779982531241);

-- 数据导入: CustomField
INSERT INTO "CustomField" ("id", "code", "name", "type", "dataSourceId", "options", "isRequired", "defaultValue", "group", "sort", "status", "createdAt", "updatedAt", "isSystem") VALUES (1, 'A01', '产品', 'SELECT_SINGLE', 4, NULL, 0, NULL, '默认分组', 0, 'ACTIVE', 1779413016836, 1779413016836, 0);
INSERT INTO "CustomField" ("id", "code", "name", "type", "dataSourceId", "options", "isRequired", "defaultValue", "group", "sort", "status", "createdAt", "updatedAt", "isSystem") VALUES (2, 'A02', '工序', 'SELECT_SINGLE', 5, NULL, 0, NULL, '默认分组', 0, 'ACTIVE', 1779413030049, 1779413030049, 0);

-- 数据导入: DataSource
INSERT INTO "DataSource" ("id", "code", "name", "type", "description", "isSystem", "status", "sort", "createdAt", "updatedAt") VALUES (1, 'ORG_TYPE', '组织类型', 'BUILTIN', '组织架构类型选项', 1, 'ACTIVE', 1, 1779361923102, 1779361923102);
INSERT INTO "DataSource" ("id", "code", "name", "type", "description", "isSystem", "status", "sort", "createdAt", "updatedAt") VALUES (2, 'EDUCATION', '学历', 'CUSTOM', '员工学历选项', 1, 'ACTIVE', 12, 1779361923123, '2026-05-22 01:19:30');
INSERT INTO "DataSource" ("id", "code", "name", "type", "description", "isSystem", "status", "sort", "createdAt", "updatedAt") VALUES (3, 'WORK_STATUS', '工作状态', 'CUSTOM', '员工工作状态', 0, 'ACTIVE', 3, 1779361923140, 1779361923140);
INSERT INTO "DataSource" ("id", "code", "name", "type", "description", "isSystem", "status", "sort", "createdAt", "updatedAt") VALUES (4, 'PRODUCT', '产品', 'BUILTIN', '产品选项（来自产品配置）', 1, 'ACTIVE', 4, 1779361923154, 1779361923154);
INSERT INTO "DataSource" ("id", "code", "name", "type", "description", "isSystem", "status", "sort", "createdAt", "updatedAt") VALUES (5, 'PROCESS', '工序', 'BUILTIN', '工序选项（来自班次配置）', 1, 'ACTIVE', 5, 1779361923156, 1779361923156);
INSERT INTO "DataSource" ("id", "code", "name", "type", "description", "isSystem", "status", "sort", "createdAt", "updatedAt") VALUES (6, 'GENDER', '性别', 'CUSTOM', '员工性别选项', 1, 'ACTIVE', 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSource" ("id", "code", "name", "type", "description", "isSystem", "status", "sort", "createdAt", "updatedAt") VALUES (7, 'MARITAL_STATUS', '婚姻状况', 'CUSTOM', '员工婚姻状况选项', 1, 'ACTIVE', 2, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSource" ("id", "code", "name", "type", "description", "isSystem", "status", "sort", "createdAt", "updatedAt") VALUES (8, 'POLITICAL_STATUS', '政治面貌', 'CUSTOM', '员工政治面貌选项', 1, 'ACTIVE', 3, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSource" ("id", "code", "name", "type", "description", "isSystem", "status", "sort", "createdAt", "updatedAt") VALUES (9, 'EMERGENCY_CONTACT_RELATION', '紧急联系人关系', 'CUSTOM', '紧急联系人关系选项', 1, 'ACTIVE', 4, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSource" ("id", "code", "name", "type", "description", "isSystem", "status", "sort", "createdAt", "updatedAt") VALUES (10, 'EMPLOYMENT_RELATION', '工作关系', 'CUSTOM', '员工工作关系选项', 1, 'ACTIVE', 5, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSource" ("id", "code", "name", "type", "description", "isSystem", "status", "sort", "createdAt", "updatedAt") VALUES (11, 'ENTRY_TYPE', '入职类型', 'CUSTOM', '员工入职类型选项', 1, 'ACTIVE', 6, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSource" ("id", "code", "name", "type", "description", "isSystem", "status", "sort", "createdAt", "updatedAt") VALUES (12, 'EMPLOYEE_TYPE', '员工类型', 'CUSTOM', '员工类型选项', 1, 'ACTIVE', 7, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSource" ("id", "code", "name", "type", "description", "isSystem", "status", "sort", "createdAt", "updatedAt") VALUES (13, 'JOB_LEVEL', '职级', 'CUSTOM', '员工职级选项', 1, 'ACTIVE', 8, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSource" ("id", "code", "name", "type", "description", "isSystem", "status", "sort", "createdAt", "updatedAt") VALUES (15, 'COST_CENTER', '成本中心', 'CUSTOM', '成本中心选项', 1, 'ACTIVE', 10, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSource" ("id", "code", "name", "type", "description", "isSystem", "status", "sort", "createdAt", "updatedAt") VALUES (17, 'POSITION', '岗位', 'CUSTOM', '员工岗位', 1, 'ACTIVE', 0, 1779437709826, 1779437709826);

-- 数据导入: DataSourceOption
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (1, 1, '集团', 'GROUP', 1, 1, 1779361923109, 1779361923109);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (2, 1, '工厂', 'COMPANY', 2, 1, 1779361923112, 1779412483178);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (3, 1, '车间', 'DEPARTMENT', 3, 1, 1779361923115, 1779412490559);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (4, 1, '产线', 'TEAM', 4, 1, 1779361923117, 1779412497511);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (5, 1, '岗位', 'POSITION', 5, 0, 1779361923120, 1779412500459);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (6, 2, '高中', 'HIGH_SCHOOL', 1, 1, 1779361923126, 1779361923126);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (7, 2, '大专', 'COLLEGE', 2, 1, 1779361923129, 1779361923129);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (8, 2, '本科', 'BACHELOR', 3, 1, 1779361923132, 1779361923132);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (9, 2, '硕士', 'MASTER', 4, 1, 1779361923135, 1779361923135);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (10, 2, '博士', 'DOCTOR', 5, 1, 1779361923138, 1779361923138);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (11, 3, '在职', 'ACTIVE', 1, 1, 1779361923143, 1779361923143);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (12, 3, '试用期', 'PROBATION', 2, 1, 1779361923146, 1779361923146);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (13, 3, '请假', 'LEAVE', 3, 1, 1779361923148, 1779361923148);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (14, 3, '离职', 'RESIGNED', 4, 1, 1779361923151, 1779361923151);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (15, 4, '大桶', 'A01', 0, 1, 1779412395242, 1779412395242);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (16, 4, '小桶', 'A02', 0, 1, 1779412405008, 1779412405008);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (17, 5, '焊接', 'A01', 0, 1, 1779412435093, 1779412435093);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (18, 5, '喷漆', 'A02', 0, 1, 1779412445034, 1779412445034);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (19, 6, '男', 'MALE', 1, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (20, 6, '女', 'FEMALE', 2, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (21, 7, '未婚', 'SINGLE', 1, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (22, 7, '已婚', 'MARRIED', 2, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (23, 7, '离异', 'DIVORCED', 3, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (24, 7, '丧偶', 'WIDOWED', 4, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (25, 8, '群众', 'MASS', 1, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (26, 8, '党员', 'CCP_MEMBER', 2, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (27, 8, '团员', 'CYL_MEMBER', 3, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (28, 8, '民主党派', 'DEMOCRATIC_PARTY', 4, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (29, 8, '其他', 'OTHER', 5, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (30, 9, '父亲', 'FATHER', 1, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (31, 9, '母亲', 'MOTHER', 2, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (32, 9, '配偶', 'SPOUSE', 3, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (33, 9, '子女', 'CHILD', 4, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (34, 9, '其他', 'OTHER', 5, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (35, 10, '正式员工', 'FORMAL', 1, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (36, 10, '临时员工', 'TEMPORARY', 2, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (37, 10, '实习生', 'INTERN', 3, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (38, 10, '外包', 'OUTSOURCE', 4, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (39, 11, '校园招聘', 'CAMPUS_RECRUITMENT', 1, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (40, 11, '社会招聘', 'SOCIAL_RECRUITMENT', 2, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (41, 11, '内部推荐', 'INTERNAL_REFERRAL', 3, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (42, 11, '其他', 'OTHER', 4, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (43, 12, '全职', 'FULL_TIME', 1, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (44, 12, '兼职', 'PART_TIME', 2, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (45, 12, '劳务派遣', 'LABOR_DISPATCH', 3, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (61, 15, '研发中心', 'RD_CENTER', 1, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (62, 15, '销售中心', 'SALES_CENTER', 2, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (63, 15, '运营中心', 'OPERATION_CENTER', 3, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (64, 15, '市场中心', 'MARKETING_CENTER', 4, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (65, 15, '财务中心', 'FINANCE_CENTER', 5, 1, '2026-05-22 01:19:30', '2026-05-22 01:19:30');
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (72, 17, '线组长', 'POST_001', 0, 1, 1779437709829, 1779437709829);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (73, 17, '工艺工程师', 'POST_002', 1, 1, 1779437709831, 1779437709831);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (74, 17, '设备工程师', 'POST_003', 2, 1, 1779437709834, 1779437709834);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (75, 17, '质量工程师', 'POST_004', 3, 1, 1779437709836, 1779437709836);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (76, 17, '设备技术员', 'POST_005', 4, 1, 1779437709838, 1779437709838);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (77, 17, '工艺技术员', 'POST_006', 5, 1, 1779437709841, 1779437709841);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (78, 17, '维修技术员', 'POST_007', 6, 1, 1779437709843, 1779437709843);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (79, 17, 'SMT操作员', 'POST_008', 7, 1, 1779437709845, 1779437709845);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (80, 17, '装配工', 'POST_009', 8, 1, 1779437709847, 1779437709847);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (81, 17, '质检员', 'POST_010', 9, 1, 1779437709849, 1779437709849);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (82, 17, '仓管员', 'POST_011', 10, 1, 1779437709851, 1779437709851);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (83, 13, '初级', 'LEVEL_001', 0, 1, 1779437709855, 1779437709855);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (84, 13, '中级', 'LEVEL_002', 1, 1, 1779437709857, 1779437709857);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (85, 13, '高级', 'LEVEL_003', 2, 1, 1779437709859, 1779437709859);
INSERT INTO "DataSourceOption" ("id", "dataSourceId", "label", "value", "sort", "isActive", "createdAt", "updatedAt") VALUES (86, 13, '专家级', 'LEVEL_004', 3, 1, 1779437709860, 1779437709860);

-- 数据导入: DefinitionAttendanceCode
INSERT INTO "DefinitionAttendanceCode" ("id", "code", "name", "description", "category", "type", "priority", "unit", "calculateHours", "deductMealTime", "color", "showInAttendanceCard", "showInDetailPage", "calcAttendanceCode", "calculationAttendanceCode", "definitionAttendanceCode", "status", "createdAt", "updatedAt") VALUES (1, 'A01', '线体工时', NULL, NULL, 'LEAN_HOURS', 0, 'HOURS', 1, 0, '#1890ff', 0, 1, 'AC_001', NULL, NULL, 'ACTIVE', 1779437774775, 1779809708162);
INSERT INTO "DefinitionAttendanceCode" ("id", "code", "name", "description", "category", "type", "priority", "unit", "calculateHours", "deductMealTime", "color", "showInAttendanceCard", "showInDetailPage", "calcAttendanceCode", "calculationAttendanceCode", "definitionAttendanceCode", "status", "createdAt", "updatedAt") VALUES (2, 'A02', '工序工时', NULL, NULL, 'LEAN_HOURS', 0, 'HOURS', 1, 0, '#1890ff', 0, 1, 'AC_003', NULL, NULL, 'ACTIVE', 1779437787995, 1779809701505);
INSERT INTO "DefinitionAttendanceCode" ("id", "code", "name", "description", "category", "type", "priority", "unit", "calculateHours", "deductMealTime", "color", "showInAttendanceCard", "showInDetailPage", "calcAttendanceCode", "calculationAttendanceCode", "definitionAttendanceCode", "status", "createdAt", "updatedAt") VALUES (3, 'A03', '车间工时', NULL, NULL, 'LEAN_HOURS', 0, 'HOURS', 1, 0, '#1affe4', 0, 1, 'AC_002', NULL, NULL, 'ACTIVE', 1779437800862, 1779870015515);
INSERT INTO "DefinitionAttendanceCode" ("id", "code", "name", "description", "category", "type", "priority", "unit", "calculateHours", "deductMealTime", "color", "showInAttendanceCard", "showInDetailPage", "calcAttendanceCode", "calculationAttendanceCode", "definitionAttendanceCode", "status", "createdAt", "updatedAt") VALUES (4, 'A04', '出勤工时', NULL, NULL, 'STANDARD_HOURS', 0, 'HOURS', 1, 0, '#1890ff', 0, 0, 'AC_004', NULL, NULL, 'ACTIVE', 1779437825225, 1779437932925);
INSERT INTO "DefinitionAttendanceCode" ("id", "code", "name", "description", "category", "type", "priority", "unit", "calculateHours", "deductMealTime", "color", "showInAttendanceCard", "showInDetailPage", "calcAttendanceCode", "calculationAttendanceCode", "definitionAttendanceCode", "status", "createdAt", "updatedAt") VALUES (5, 'A05', '分摊工时', NULL, NULL, 'LEAN_HOURS', 0, 'HOURS', 1, 0, '#ffc21a', 0, 1, NULL, NULL, NULL, 'ACTIVE', 1779437856199, 1779870036430);
INSERT INTO "DefinitionAttendanceCode" ("id", "code", "name", "description", "category", "type", "priority", "unit", "calculateHours", "deductMealTime", "color", "showInAttendanceCard", "showInDetailPage", "calcAttendanceCode", "calculationAttendanceCode", "definitionAttendanceCode", "status", "createdAt", "updatedAt") VALUES (11, 'A06', '作业工时', NULL, NULL, 'LEAN_HOURS', 0, 'HOURS', 1, 0, '#1890ff', 0, 1, 'AC_005', NULL, NULL, 'ACTIVE', 1779864065272, 1779864065272);
INSERT INTO "DefinitionAttendanceCode" ("id", "code", "name", "description", "category", "type", "priority", "unit", "calculateHours", "deductMealTime", "color", "showInAttendanceCard", "showInDetailPage", "calcAttendanceCode", "calculationAttendanceCode", "definitionAttendanceCode", "status", "createdAt", "updatedAt") VALUES (12, 'A07', '挣得工时', NULL, NULL, 'LEAN_HOURS', 0, 'HOURS', 1, 0, '#1890ff', 0, 1, NULL, NULL, NULL, 'ACTIVE', 1779886947972, 1779897808976);

-- 数据导入: DeviceAccount
INSERT INTO "DeviceAccount" ("id", "deviceId", "accountId", "effectiveDate", "expiryDate", "status", "path", "namePath", "createdAt", "updatedAt") VALUES (8, 9, 5, 1777593600000, NULL, 'ACTIVE', NULL, NULL, 1779445363105, 1779445363105);
INSERT INTO "DeviceAccount" ("id", "deviceId", "accountId", "effectiveDate", "expiryDate", "status", "path", "namePath", "createdAt", "updatedAt") VALUES (13, 16, 30, 1777672680000, NULL, 'ACTIVE', 'DH/DH02///', '杭州工厂/W2总装车间///', 1779803933843, 1779803933843);
INSERT INTO "DeviceAccount" ("id", "deviceId", "accountId", "effectiveDate", "expiryDate", "status", "path", "namePath", "createdAt", "updatedAt") VALUES (14, 15, 31, 1777672680000, NULL, 'ACTIVE', 'DH/DH01///', '杭州工厂/W1总装车间///', 1779803948998, 1779803948998);
INSERT INTO "DeviceAccount" ("id", "deviceId", "accountId", "effectiveDate", "expiryDate", "status", "path", "namePath", "createdAt", "updatedAt") VALUES (15, 14, 59, 1777663860000, NULL, 'ACTIVE', 'DH/DH01/DH0101//A02', '杭州工厂/W1总装车间/W1总装L1产线//喷漆', 1779867544560, 1779867544560);
INSERT INTO "DeviceAccount" ("id", "deviceId", "accountId", "effectiveDate", "expiryDate", "status", "path", "namePath", "createdAt", "updatedAt") VALUES (16, 13, 60, 1777663920000, NULL, 'ACTIVE', 'DH/DH01/DH0101//A01', '杭州工厂/W1总装车间/W1总装L1产线//焊接', 1779867562329, 1779867562329);
INSERT INTO "DeviceAccount" ("id", "deviceId", "accountId", "effectiveDate", "expiryDate", "status", "path", "namePath", "createdAt", "updatedAt") VALUES (20, 11, 64, 1777650960000, NULL, 'ACTIVE', 'DH/DH01/DH0101//', '杭州工厂/W1总装车间/W1总装L1产线//', 1779868624782, 1779868624782);
INSERT INTO "DeviceAccount" ("id", "deviceId", "accountId", "effectiveDate", "expiryDate", "status", "path", "namePath", "createdAt", "updatedAt") VALUES (21, 12, 63, 1777679760000, NULL, 'ACTIVE', 'DH/DH01/DH01002//', '杭州工厂/W1总装车间/W1总装L2产线//', 1779868631930, 1779868631930);

-- 数据导入: DeviceGroup
INSERT INTO "DeviceGroup" ("id", "code", "name", "description", "status", "createdAt", "updatedAt") VALUES (1, 'A01', '车间设备组', NULL, 'INACTIVE', 1779444981143, 1779765534903);
INSERT INTO "DeviceGroup" ("id", "code", "name", "description", "status", "createdAt", "updatedAt") VALUES (2, 'A02', '线体设备组', NULL, 'INACTIVE', 1779444989852, 1779765533084);
INSERT INTO "DeviceGroup" ("id", "code", "name", "description", "status", "createdAt", "updatedAt") VALUES (3, 'A03', '工序设备组', NULL, 'INACTIVE', 1779444999706, 1779765531151);
INSERT INTO "DeviceGroup" ("id", "code", "name", "description", "status", "createdAt", "updatedAt") VALUES (4, 'A001', '车间设备组', NULL, 'INACTIVE', 1779766085269, 1779766215613);
INSERT INTO "DeviceGroup" ("id", "code", "name", "description", "status", "createdAt", "updatedAt") VALUES (5, 'A00001', '线体设备组', NULL, 'ACTIVE', 1779766225458, 1779766225458);
INSERT INTO "DeviceGroup" ("id", "code", "name", "description", "status", "createdAt", "updatedAt") VALUES (6, 'A000002', '工序设备组', NULL, 'ACTIVE', 1779766382024, 1779766382024);

-- 数据导入: EarnedHoursAllocationConfig
INSERT INTO "EarnedHoursAllocationConfig" ("id", "code", "name", "configName", "description", "orgId", "orgPath", "effectiveStartTime", "effectiveEndTime", "status", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt", "approvedById", "approvedByName", "approvedAt", "deletedAt", "rules", "sourceConfig") VALUES (1, 'A0001', 'A0001', 'A0001', '', 1, '/', 1779926400000, NULL, 'INACTIVE', 1, 'Admin', 1779944926965, 1, 'Admin', 1779944972053, 1, 'Admin', 1779944942325, NULL, '[{"ruleName":"分配规则1","ruleType":"PROPORTIONAL","allocationBasis":"ACTUAL_HOURS","effectiveStartTime":"2026-04-30T16:00:00.000Z","effectiveEndTime":null,"status":"ACTIVE","sortOrder":0,"description":""}]', '{"sourceType":"EMPLOYEE_HOURS","employeeFilter":{"fieldGroups":[{"id":"default","conditions":[{"fieldCode":"position","fieldName":"岗位","fieldType":"select","operator":"ne","value":"POST_001"}]}]},"accountFilter":{"hierarchySelections":[{"levelId":4,"level":1,"levelName":"工厂","valueIds":["DH"]},{"levelId":5,"level":2,"levelName":"车间","valueIds":["DH01","DH02"]}]},"attendanceCodes":["A06","A01"],"description":""}');
INSERT INTO "EarnedHoursAllocationConfig" ("id", "code", "name", "configName", "description", "orgId", "orgPath", "effectiveStartTime", "effectiveEndTime", "status", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt", "approvedById", "approvedByName", "approvedAt", "deletedAt", "rules", "sourceConfig") VALUES (2, 'A0002', 'A0002', 'A0002', '', 1, '/', 1779926400000, NULL, 'ACTIVE', 1, 'Admin', 1779945112294, NULL, NULL, 1779945120527, 1, 'Admin', 1779945120526, NULL, '[{"ruleName":"分配规则1","ruleType":"PROPORTIONAL","allocationBasis":"ACTUAL_HOURS","effectiveStartTime":"2026-04-30T16:00:00.000Z","effectiveEndTime":null,"status":"ACTIVE","sortOrder":0,"description":""}]', '{"sourceType":"EMPLOYEE_HOURS","employeeFilter":{"fieldGroups":[{"id":"default","conditions":[{"fieldCode":"position","fieldName":"岗位","fieldType":"select","operator":"ne","value":"POST_001"}]}]},"accountFilter":{"hierarchySelections":[{"levelId":4,"level":1,"levelName":"工厂","valueIds":["DH"]},{"levelId":5,"level":2,"levelName":"车间","valueIds":["DH01","DH02"]},{"levelId":6,"level":3,"levelName":"产线","valueIds":["DH01002","DH0101","DH02001","DH02002"]}]},"attendanceCodes":["A01","A06"],"description":""}');
INSERT INTO "EarnedHoursAllocationConfig" ("id", "code", "name", "configName", "description", "orgId", "orgPath", "effectiveStartTime", "effectiveEndTime", "status", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt", "approvedById", "approvedByName", "approvedAt", "deletedAt", "rules", "sourceConfig") VALUES (3, 'A003', 'A003', 'A003', '', 1, '/', 1779926400000, NULL, 'ACTIVE', 1, 'Admin', 1779945457874, NULL, NULL, 1779945916202, 1, 'Admin', 1779945916201, NULL, '[{"ruleName":"分配规则1","ruleType":"PROPORTIONAL","allocationBasis":"ACTUAL_HOURS","effectiveStartTime":"2026-04-30T16:00:00.000Z","effectiveEndTime":null,"status":"ACTIVE","sortOrder":0,"description":""}]', '{"sourceType":"EMPLOYEE_HOURS","employeeFilter":{"fieldGroups":[{"id":"default","conditions":[{"fieldCode":"position","fieldName":"岗位","fieldType":"select","operator":"ne","value":"POST_001"}]}]},"accountFilter":{"hierarchySelections":[{"levelId":4,"level":1,"levelName":"工厂","valueIds":["DH"]},{"levelId":5,"level":2,"levelName":"车间","valueIds":["DH01","DH02"]}]},"attendanceCodes":["A01","A06"],"description":""}');
INSERT INTO "EarnedHoursAllocationConfig" ("id", "code", "name", "configName", "description", "orgId", "orgPath", "effectiveStartTime", "effectiveEndTime", "status", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt", "approvedById", "approvedByName", "approvedAt", "deletedAt", "rules", "sourceConfig") VALUES (4, 'A0004', '规则二', '规则二', '', 1, '/', 1779926400000, NULL, 'ACTIVE', 1, 'Admin', 1779981732997, NULL, NULL, 1779981736703, 1, 'Admin', 1779981736702, NULL, '[{"ruleName":"分配规则1","ruleType":"PROPORTIONAL","allocationBasis":"AVERAGE","effectiveStartTime":"2026-04-30T16:00:00.000Z","effectiveEndTime":null,"status":"ACTIVE","sortOrder":0,"description":""}]', '{"sourceType":"EMPLOYEE_HOURS","employeeFilter":{"fieldGroups":[{"id":"default","conditions":[{"fieldCode":"position","fieldName":"岗位","fieldType":"select","operator":"ne","value":"POST_001"}]}]},"accountFilter":{"hierarchySelections":[{"levelId":4,"level":1,"levelName":"工厂","valueIds":["DH"]},{"levelId":5,"level":2,"levelName":"车间","valueIds":["DH01","DH02"]}]},"attendanceCodes":["A01","A06"],"description":""}');
INSERT INTO "EarnedHoursAllocationConfig" ("id", "code", "name", "configName", "description", "orgId", "orgPath", "effectiveStartTime", "effectiveEndTime", "status", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt", "approvedById", "approvedByName", "approvedAt", "deletedAt", "rules", "sourceConfig") VALUES (5, 'A0005', '按金额分摊', '按金额分摊', '', 1, '/', 1780012800000, NULL, 'ACTIVE', 1, 'Admin', 1779984158227, NULL, NULL, 1779984161977, 1, 'Admin', 1779984161976, NULL, '[{"ruleName":"分配规则1","ruleType":"PROPORTIONAL","allocationBasis":"ACTUAL_HOURS_COEFFICIENT","effectiveStartTime":"2026-04-30T16:00:00.000Z","effectiveEndTime":null,"status":"ACTIVE","sortOrder":0,"description":""}]', '{"sourceType":"EMPLOYEE_HOURS","employeeFilter":{"fieldGroups":[{"id":"default","conditions":[{"fieldCode":"position","fieldName":"岗位","fieldType":"select","operator":"ne","value":"POST_001"}]}]},"accountFilter":{"hierarchySelections":[{"levelId":4,"level":1,"levelName":"工厂","valueIds":["DH"]},{"levelId":5,"level":2,"levelName":"车间","valueIds":["DH01"]}]},"attendanceCodes":["A01","A06"],"description":""}');

-- 数据导入: EarnedHoursAllocationResult
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (98, 'EHA-1779987309641-8iwe4q', 1779926400000, 5, 1, NULL, '202605001', 'Aaron.he', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Aaron.he', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 0.0, 0.0, 0.0, NULL, 1779987309702, 1779987309709, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (99, 'EHA-1779987309641-8iwe4q', 1779926400000, 5, 1, NULL, '202605004', 'Will', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Will', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 72.0, 6.990291262135923, 0.1747572815533981, NULL, 1779987309702, 1779987309712, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (100, 'EHA-1779987309641-8iwe4q', 1779926400000, 5, 1, NULL, '202605002', 'Paul ', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Paul ', 81, '杭州工厂/W1总装车间/W1总装L2产线/焊接', 0.0, 0.0, 0.0, NULL, 1779987309702, 1779987309716, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (101, 'EHA-1779987309641-8iwe4q', 1779926400000, 5, 1, NULL, '202605003', 'Eric', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Eric', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 100.0, 9.70873786407767, 0.2427184466019418, NULL, 1779987309702, 1779987309719, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (102, 'EHA-1779987309641-8iwe4q', 1779926400000, 5, 1, NULL, '202605005', '张三', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, '张三', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 240.0, 23.3009708737864, 0.5825242718446602, NULL, 1779987309702, 1779987309723, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (103, 'EHA-1779987318474-riu3qi', 1779926400000, 4, 1, NULL, '202605001', 'Aaron.he', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Aaron.he', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 9.0, 8.0, 0.2, NULL, 1779987318537, 1779987318542, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (104, 'EHA-1779987318474-riu3qi', 1779926400000, 4, 1, NULL, '202605004', 'Will', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Will', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 11.0, 8.0, 0.2, NULL, 1779987318537, 1779987318546, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (105, 'EHA-1779987318474-riu3qi', 1779926400000, 4, 1, NULL, '202605002', 'Paul ', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Paul ', 81, '杭州工厂/W1总装车间/W1总装L2产线/焊接', 7.0, 8.0, 0.2, NULL, 1779987318537, 1779987318549, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (106, 'EHA-1779987318474-riu3qi', 1779926400000, 4, 1, NULL, '202605003', 'Eric', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Eric', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 11.0, 8.0, 0.2, NULL, 1779987318537, 1779987318552, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (107, 'EHA-1779987318474-riu3qi', 1779926400000, 4, 1, NULL, '202605005', '张三', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, '张三', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 12.0, 8.0, 0.2, NULL, 1779987318537, 1779987318555, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (108, 'EHA-1779987324523-uaxm2w', 1779926400000, 3, 1, NULL, '202605001', 'Aaron.he', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Aaron.he', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 9.0, 7.199999999999999, 0.18, NULL, 1779987324584, 1779987324589, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (109, 'EHA-1779987324523-uaxm2w', 1779926400000, 3, 1, NULL, '202605004', 'Will', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Will', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 11.0, 8.8, 0.22, NULL, 1779987324584, 1779987324592, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (110, 'EHA-1779987324523-uaxm2w', 1779926400000, 3, 1, NULL, '202605002', 'Paul ', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Paul ', 81, '杭州工厂/W1总装车间/W1总装L2产线/焊接', 7.0, 5.600000000000001, 0.14, NULL, 1779987324584, 1779987324595, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (111, 'EHA-1779987324523-uaxm2w', 1779926400000, 3, 1, NULL, '202605003', 'Eric', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Eric', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 11.0, 8.8, 0.22, NULL, 1779987324584, 1779987324598, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (112, 'EHA-1779987324523-uaxm2w', 1779926400000, 3, 1, NULL, '202605005', '张三', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, '张三', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 12.0, 9.6, 0.24, NULL, 1779987324584, 1779987324602, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (148, 'EHA-1779988081284-e9bj38', 1779926400000, 3, 1, '分配规则1', '202605001', 'Aaron.he', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Aaron.he', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 9.0, 7.199999999999999, 0.18, NULL, 1779988081349, 1779988081355, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (149, 'EHA-1779988081284-e9bj38', 1779926400000, 3, 1, '分配规则1', '202605004', 'Will', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Will', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 11.0, 8.8, 0.22, NULL, 1779988081349, 1779988081358, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (150, 'EHA-1779988081284-e9bj38', 1779926400000, 3, 1, '分配规则1', '202605002', 'Paul ', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Paul ', 81, '杭州工厂/W1总装车间/W1总装L2产线/焊接', 7.0, 5.600000000000001, 0.14, NULL, 1779988081349, 1779988081362, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (151, 'EHA-1779988081284-e9bj38', 1779926400000, 3, 1, '分配规则1', '202605003', 'Eric', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Eric', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 11.0, 8.8, 0.22, NULL, 1779988081349, 1779988081365, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (152, 'EHA-1779988081284-e9bj38', 1779926400000, 3, 1, '分配规则1', '202605005', '张三', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, '张三', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 12.0, 9.6, 0.24, NULL, 1779988081349, 1779988081369, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (153, 'EHA-1779988095783-rsi6f5', 1779926400000, 4, 1, '分配规则1', '202605001', 'Aaron.he', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Aaron.he', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 9.0, 8.0, 0.2, NULL, 1779988095841, 1779988095846, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (154, 'EHA-1779988095783-rsi6f5', 1779926400000, 4, 1, '分配规则1', '202605004', 'Will', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Will', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 11.0, 8.0, 0.2, NULL, 1779988095841, 1779988095849, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (155, 'EHA-1779988095783-rsi6f5', 1779926400000, 4, 1, '分配规则1', '202605002', 'Paul ', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Paul ', 81, '杭州工厂/W1总装车间/W1总装L2产线/焊接', 7.0, 8.0, 0.2, NULL, 1779988095841, 1779988095854, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (156, 'EHA-1779988095783-rsi6f5', 1779926400000, 4, 1, '分配规则1', '202605003', 'Eric', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Eric', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 11.0, 8.0, 0.2, NULL, 1779988095841, 1779988095857, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (157, 'EHA-1779988095783-rsi6f5', 1779926400000, 4, 1, '分配规则1', '202605005', '张三', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, '张三', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 12.0, 8.0, 0.2, NULL, 1779988095841, 1779988095861, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (158, 'EHA-1779988110876-9ht90i', 1779926400000, 5, 1, '分配规则1', '202605001', 'Aaron.he', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Aaron.he', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 0.0, 0.0, 0.0, NULL, 1779988110965, 1779988110970, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (159, 'EHA-1779988110876-9ht90i', 1779926400000, 5, 1, '分配规则1', '202605004', 'Will', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Will', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 72.0, 6.990291262135923, 0.1747572815533981, NULL, 1779988110965, 1779988110974, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (160, 'EHA-1779988110876-9ht90i', 1779926400000, 5, 1, '分配规则1', '202605002', 'Paul ', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Paul ', 81, '杭州工厂/W1总装车间/W1总装L2产线/焊接', 0.0, 0.0, 0.0, NULL, 1779988110965, 1779988110978, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (161, 'EHA-1779988110876-9ht90i', 1779926400000, 5, 1, '分配规则1', '202605003', 'Eric', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, 'Eric', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 100.0, 9.70873786407767, 0.2427184466019418, NULL, 1779988110965, 1779988110981, NULL);
INSERT INTO "EarnedHoursAllocationResult" ("id", "batchNo", "recordDate", "configId", "configVersion", "ruleName", "sourceEmployeeNo", "sourceEmployeeName", "sourceAccountId", "sourceAccountName", "targetType", "targetId", "targetName", "targetAccountId", "targetAccountName", "sourceHours", "allocatedHours", "allocationRatio", "calcResultId", "calcTime", "createdAt", "deletedAt") VALUES (162, 'EHA-1779988110876-9ht90i', 1779926400000, 5, 1, '分配规则1', '202605005', '张三', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'EMPLOYEE', 0, '张三', 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 240.0, 23.3009708737864, 0.5825242718446602, NULL, 1779988110965, 1779988110985, NULL);

-- 数据导入: Employee
INSERT INTO "Employee" ("id", "employeeNo", "name", "gender", "idCard", "phone", "email", "orgId", "entryDate", "status", "customFields", "createdAt", "updatedAt", "age", "birthDate", "currentAddress", "emergencyContact", "emergencyPhone", "emergencyRelation", "homeAddress", "homePhone", "householdRegister", "maritalStatus", "nativePlace", "photo", "politicalStatus") VALUES (3, '202605001', 'Aaron.he', 'MALE', NULL, '15851492871', NULL, 6, 1704067200000, 'ACTIVE', '{}', 1779435660968, 1779439537399, NULL, 915148800000, '苏州', NULL, '15851492871', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "Employee" ("id", "employeeNo", "name", "gender", "idCard", "phone", "email", "orgId", "entryDate", "status", "customFields", "createdAt", "updatedAt", "age", "birthDate", "currentAddress", "emergencyContact", "emergencyPhone", "emergencyRelation", "homeAddress", "homePhone", "householdRegister", "maritalStatus", "nativePlace", "photo", "politicalStatus") VALUES (4, '202605002', 'Paul ', 'MALE', NULL, NULL, NULL, 7, 1735689600000, 'ACTIVE', '{"A02":"A01"}', 1779438320162, 1779811104436, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "Employee" ("id", "employeeNo", "name", "gender", "idCard", "phone", "email", "orgId", "entryDate", "status", "customFields", "createdAt", "updatedAt", "age", "birthDate", "currentAddress", "emergencyContact", "emergencyPhone", "emergencyRelation", "homeAddress", "homePhone", "householdRegister", "maritalStatus", "nativePlace", "photo", "politicalStatus") VALUES (5, '202605003', 'Eric', 'MALE', NULL, NULL, NULL, 6, 1735689600000, 'ACTIVE', '{}', 1779440047875, 1779440047875, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "Employee" ("id", "employeeNo", "name", "gender", "idCard", "phone", "email", "orgId", "entryDate", "status", "customFields", "createdAt", "updatedAt", "age", "birthDate", "currentAddress", "emergencyContact", "emergencyPhone", "emergencyRelation", "homeAddress", "homePhone", "householdRegister", "maritalStatus", "nativePlace", "photo", "politicalStatus") VALUES (6, '202605004', 'Will', 'MALE', NULL, NULL, NULL, 7, 1704067200000, 'ACTIVE', '{}', 1779441117465, 1779441117465, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "Employee" ("id", "employeeNo", "name", "gender", "idCard", "phone", "email", "orgId", "entryDate", "status", "customFields", "createdAt", "updatedAt", "age", "birthDate", "currentAddress", "emergencyContact", "emergencyPhone", "emergencyRelation", "homeAddress", "homePhone", "householdRegister", "maritalStatus", "nativePlace", "photo", "politicalStatus") VALUES (7, '202605005', '张三', 'MALE', NULL, NULL, NULL, 6, 1704067200000, 'ACTIVE', '{}', 1779441491792, 1779441491792, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "Employee" ("id", "employeeNo", "name", "gender", "idCard", "phone", "email", "orgId", "entryDate", "status", "customFields", "createdAt", "updatedAt", "age", "birthDate", "currentAddress", "emergencyContact", "emergencyPhone", "emergencyRelation", "homeAddress", "homePhone", "householdRegister", "maritalStatus", "nativePlace", "photo", "politicalStatus") VALUES (8, '202605006', '李四', 'MALE', NULL, NULL, NULL, 7, 1735689600000, 'ACTIVE', '{}', 1779442268799, 1779442268799, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "Employee" ("id", "employeeNo", "name", "gender", "idCard", "phone", "email", "orgId", "entryDate", "status", "customFields", "createdAt", "updatedAt", "age", "birthDate", "currentAddress", "emergencyContact", "emergencyPhone", "emergencyRelation", "homeAddress", "homePhone", "householdRegister", "maritalStatus", "nativePlace", "photo", "politicalStatus") VALUES (9, '202605007', '测试员工', 'MALE', NULL, NULL, NULL, 7, 1704067200000, 'ACTIVE', '{}', 1779442826887, 1779442826887, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "Employee" ("id", "employeeNo", "name", "gender", "idCard", "phone", "email", "orgId", "entryDate", "status", "customFields", "createdAt", "updatedAt", "age", "birthDate", "currentAddress", "emergencyContact", "emergencyPhone", "emergencyRelation", "homeAddress", "homePhone", "householdRegister", "maritalStatus", "nativePlace", "photo", "politicalStatus") VALUES (10, '202605008', '测试员工1111', 'MALE', NULL, NULL, NULL, 9, 1704067200000, 'ACTIVE', '{}', 1779442984069, 1779442984069, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "Employee" ("id", "employeeNo", "name", "gender", "idCard", "phone", "email", "orgId", "entryDate", "status", "customFields", "createdAt", "updatedAt", "age", "birthDate", "currentAddress", "emergencyContact", "emergencyPhone", "emergencyRelation", "homeAddress", "homePhone", "householdRegister", "maritalStatus", "nativePlace", "photo", "politicalStatus") VALUES (11, '202605009', '测试员工2', 'MALE', NULL, NULL, NULL, 6, 1704067200000, 'ACTIVE', '{}', 1779443504365, 1779443504365, 27, 915148800000, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'SINGLE', NULL, NULL, NULL);
INSERT INTO "Employee" ("id", "employeeNo", "name", "gender", "idCard", "phone", "email", "orgId", "entryDate", "status", "customFields", "createdAt", "updatedAt", "age", "birthDate", "currentAddress", "emergencyContact", "emergencyPhone", "emergencyRelation", "homeAddress", "homePhone", "householdRegister", "maritalStatus", "nativePlace", "photo", "politicalStatus") VALUES (12, '202605010', '测试员工3', 'MALE', NULL, '15851492871', 'Aaron.he@gaiaworks.cn', 7, 1704067200000, 'ACTIVE', '{"employmentRelation":"FORMAL","costCenter":"RD_CENTER"}', 1779443692243, 1779443723784, 27, 915148800000, '苏州', '张三', '15851492871', 'OTHER', NULL, NULL, '苏州', 'SINGLE', '苏州', NULL, 'OTHER');
INSERT INTO "Employee" ("id", "employeeNo", "name", "gender", "idCard", "phone", "email", "orgId", "entryDate", "status", "customFields", "createdAt", "updatedAt", "age", "birthDate", "currentAddress", "emergencyContact", "emergencyPhone", "emergencyRelation", "homeAddress", "homePhone", "householdRegister", "maritalStatus", "nativePlace", "photo", "politicalStatus") VALUES (13, '202605011', '测试11', 'MALE', NULL, '15851492871', 'Aaron.he@gaiaworks.cn', 7, 1767225600000, 'ACTIVE', '{}', 1779768290665, 1779768290665, 27, 915148800000, '苏州', '张三', '15851492871', 'OTHER', NULL, NULL, '苏州', 'SINGLE', '苏州', NULL, 'OTHER');

-- 数据导入: EmployeeAttendanceRuleGroup
INSERT INTO "EmployeeAttendanceRuleGroup" ("id", "employeeNo", "employeeName", "ruleGroupId", "ruleGroupName", "effectiveDate", "expiryDate", "isCurrent", "status", "createdAt", "updatedAt") VALUES (1, '202605002', 'Paul ', 1, '考勤规则组', 1767225600000, NULL, 1, 'ACTIVE', 1779766744060, 1779766747187);
INSERT INTO "EmployeeAttendanceRuleGroup" ("id", "employeeNo", "employeeName", "ruleGroupId", "ruleGroupName", "effectiveDate", "expiryDate", "isCurrent", "status", "createdAt", "updatedAt") VALUES (3, '202605005', '张三', 1, '考勤规则组', 1777593600000, NULL, 1, 'ACTIVE', 1779984869493, 1779984869493);

-- 数据导入: EmployeeCoefficient
INSERT INTO "EmployeeCoefficient" ("id", "employeeNo", "employeeName", "coefficientType", "coefficient", "effectiveDate", "expiryDate", "description", "status", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt") VALUES (1, '202605011', '测试11', 'DEFAULT', 20.0, 1777593600000, NULL, '', 'ACTIVE', 1, 'admin', 1779768315316, 1, 'admin', 1779768319115);
INSERT INTO "EmployeeCoefficient" ("id", "employeeNo", "employeeName", "coefficientType", "coefficient", "effectiveDate", "expiryDate", "description", "status", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt") VALUES (2, '202605002', 'Paul ', 'DEFAULT', 20.0, 1767225600000, NULL, '', 'ACTIVE', 1, 'admin', 1779768828606, NULL, NULL, 1779768828606);
INSERT INTO "EmployeeCoefficient" ("id", "employeeNo", "employeeName", "coefficientType", "coefficient", "effectiveDate", "expiryDate", "description", "status", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt") VALUES (3, '202605005', '张三', 'DEFAULT', 20.0, 1777593600000, NULL, '', 'ACTIVE', 1, 'admin', 1779983506187, NULL, NULL, 1779983506187);
INSERT INTO "EmployeeCoefficient" ("id", "employeeNo", "employeeName", "coefficientType", "coefficient", "effectiveDate", "expiryDate", "description", "status", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt") VALUES (4, '202605006', '李四', 'DEFAULT', 15.0, 1777593600000, NULL, '', 'ACTIVE', 1, 'admin', 1779984678271, NULL, NULL, 1779984678271);
INSERT INTO "EmployeeCoefficient" ("id", "employeeNo", "employeeName", "coefficientType", "coefficient", "effectiveDate", "expiryDate", "description", "status", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt") VALUES (5, '202605004', 'Will', 'DEFAULT', 18.0, 1777593600000, NULL, '', 'ACTIVE', 1, 'admin', 1779984694572, NULL, NULL, 1779984694572);
INSERT INTO "EmployeeCoefficient" ("id", "employeeNo", "employeeName", "coefficientType", "coefficient", "effectiveDate", "expiryDate", "description", "status", "createdById", "createdByName", "createdAt", "updatedById", "updatedByName", "updatedAt") VALUES (6, '202605003', 'Eric', 'DEFAULT', 25.0, 1777593600000, NULL, '', 'ACTIVE', 1, 'admin', 1779984709492, NULL, NULL, 1779984709492);

-- 数据导入: EmployeeInfoTab
INSERT INTO "EmployeeInfoTab" ("id", "code", "name", "description", "isSystem", "sort", "status", "createdAt", "updatedAt") VALUES (1, 'basic_info', '基本信息', '员工的基本个人信息', 1, 1, 'ACTIVE', 1779412690460, 1779412690460);
INSERT INTO "EmployeeInfoTab" ("id", "code", "name", "description", "isSystem", "sort", "status", "createdAt", "updatedAt") VALUES (2, 'work_info', '工作信息', '员工的工作相关信息，包括职位、职级、异动历史等', 1, 2, 'ACTIVE', 1779412690467, 1779412690467);
INSERT INTO "EmployeeInfoTab" ("id", "code", "name", "description", "isSystem", "sort", "status", "createdAt", "updatedAt") VALUES (3, 'education_info', '学历信息', '员工的教育背景和学历信息', 1, 3, 'ACTIVE', 1779412690471, 1779412690471);
INSERT INTO "EmployeeInfoTab" ("id", "code", "name", "description", "isSystem", "sort", "status", "createdAt", "updatedAt") VALUES (4, 'work_experience', '工作经历', '员工过往的工作经历', 1, 4, 'ACTIVE', 1779412690474, 1779412690474);
INSERT INTO "EmployeeInfoTab" ("id", "code", "name", "description", "isSystem", "sort", "status", "createdAt", "updatedAt") VALUES (5, 'family_info', '家庭信息', '员工家庭成员信息', 1, 5, 'ACTIVE', 1779412690477, 1779412690477);

-- 数据导入: EmployeeInfoTabField
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (1, 1, 1, 'employeeNo', '员工编号', 'TEXT', 1, 0, 1, NULL, 1, 1779412690495, 1779435296567);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (2, 1, 1, 'name', '姓名', 'TEXT', 1, 0, 1, NULL, 2, 1779412690500, 1779435296570);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (3, 1, 1, 'gender', '性别', 'DATASOURCE', 1, 0, 1, 6, 3, 1779412690503, 1779435296573);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (4, 1, 1, 'idCard', '身份证号', 'TEXT', 0, 0, 1, NULL, 4, 1779412690506, 1779435296576);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (5, 1, 1, 'photo', '照片', 'IMAGE', 0, 0, 1, NULL, 5, 1779412690509, 1779435296578);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (6, 1, 2, 'phone', '手机号码', 'TEXT', 0, 0, 1, NULL, 1, 1779412690512, 1779435296581);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (7, 1, 2, 'email', '电子邮箱', 'TEXT', 0, 0, 1, NULL, 2, 1779412690515, 1779435296584);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (8, 1, 2, 'currentAddress', '现居住地址', 'TEXT', 0, 0, 1, NULL, 3, 1779412690520, 1779435296587);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (9, 1, 2, 'emergencyContact', '紧急联系人', 'TEXT', 0, 0, 1, NULL, 4, 1779412690524, 1779435296590);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (10, 1, 2, 'emergencyPhone', '紧急联系电话', 'TEXT', 0, 0, 1, NULL, 5, 1779412690528, 1779435296592);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (11, 1, 2, 'emergencyRelation', '紧急联系人关系', 'DATASOURCE', 0, 0, 1, 9, 6, 1779412690530, 1779435296594);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (12, 1, 3, 'birthDate', '出生日期', 'DATE', 0, 0, 1, NULL, 1, 1779412690534, 1779435296597);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (13, 1, 3, 'age', '年龄', 'NUMBER', 0, 0, 1, NULL, 2, 1779412690537, 1779435296599);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (14, 1, 3, 'maritalStatus', '婚姻状况', 'DATASOURCE', 0, 0, 1, 7, 3, 1779412690540, 1779435296601);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (15, 1, 3, 'nativePlace', '籍贯', 'TEXT', 0, 0, 1, NULL, 4, 1779412690543, 1779435296603);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (16, 1, 3, 'politicalStatus', '政治面貌', 'DATASOURCE', 0, 0, 1, 8, 5, 1779412690546, 1779435296606);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (17, 1, 3, 'householdRegister', '户口所在地', 'TEXT', 0, 0, 1, NULL, 6, 1779412690549, 1779435296608);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (18, 2, 8, 'position', '岗位', 'DATASOURCE', 0, 0, 1, 17, 6, 1779412690561, 1779438905771);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (19, 2, 8, 'jobLevel', '职级', 'DATASOURCE', 0, 0, 1, 13, 7, 1779412690564, 1779436943483);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (20, 2, 8, 'employeeType', '员工类型', 'DATASOURCE', 0, 0, 1, 12, 0, 1779412690566, 1779438905755);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (21, 2, 8, 'workLocation', '工作地点', 'TEXT', 0, 0, 1, NULL, 1, 1779412690571, 1779438905758);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (22, 2, 8, 'workAddress', '办公地址', 'TEXT', 0, 0, 1, NULL, 2, 1779412690575, 1779438905760);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (23, 2, 8, 'entryDate', '入职日期', 'DATE', 1, 0, 1, NULL, 3, 1779412690578, 1779438905763);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (24, 2, 9, 'hireDate', '受雇日期', 'DATE', 0, 0, 1, NULL, 4, 1779412690580, 1779438905784);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (25, 2, 9, 'probationStart', '试用期开始', 'DATE', 0, 0, 1, NULL, 0, 1779412690584, 1779438905774);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (26, 2, 9, 'probationEnd', '试用期结束', 'DATE', 0, 0, 1, NULL, 1, 1779412690587, 1779438905777);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (27, 2, 9, 'probationMonths', '试用期月数', 'NUMBER', 0, 0, 1, NULL, 2, 1779412690590, 1779438905780);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (28, 2, 9, 'regularDate', '转正日期', 'DATE', 0, 0, 1, NULL, 3, 1779412690594, 1779438905782);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (29, 2, 9, 'workYears', '工作年限', 'NUMBER', 0, 0, 1, NULL, 5, 1779412690597, 1779438905787);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (30, 2, 8, 'status', '员工状态', 'SELECT', 1, 0, 1, NULL, 4, 1779412690600, 1779438905765);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (31, 2, 8, 'orgId', '所属组织', 'ORG_SELECT', 1, 0, 1, NULL, 5, 1779412690603, 1779438905768);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (32, 3, NULL, 'educations', '学历列表', 'LIST', 0, 0, 1, NULL, 1, 1779412690608, 1779435296637);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (33, 4, NULL, 'workExperiences', '工作经历列表', 'LIST', 0, 0, 1, NULL, 1, 1779412690613, 1779435296639);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (34, 5, NULL, 'familyMembers', '家庭成员列表', 'LIST', 0, 0, 1, NULL, 1, 1779412690617, 1779435296641);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (35, 1, 7, 'A01', '产品', 'CUSTOM', 0, 1, 0, NULL, 0, 1779413070144, 1779413074510);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (36, 1, 7, 'A02', '工序', 'CUSTOM', 0, 0, 0, NULL, 0, 1779413073067, 1779811075120);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (37, 2, 8, 'costCenter', '成本中心', 'DATASOURCE', 0, 0, 1, 15, 8, 1779438877203, 1779438877203);
INSERT INTO "EmployeeInfoTabField" ("id", "tabId", "groupId", "fieldCode", "fieldName", "fieldType", "isRequired", "isHidden", "isSystem", "dataSourceId", "sort", "createdAt", "updatedAt") VALUES (38, 2, 8, 'employmentRelation', '工作关系', 'DATASOURCE', 0, 0, 1, 10, 9, 1779438877208, 1779438877208);

-- 数据导入: EmployeeInfoTabGroup
INSERT INTO "EmployeeInfoTabGroup" ("id", "tabId", "code", "name", "description", "sort", "status", "collapsed", "isSystem", "createdAt", "updatedAt") VALUES (1, 1, 'PERSONAL_INFO', '个人资料', '姓名、性别、身份证等基本资料', 1, 'ACTIVE', 0, 1, 1779412690480, 1779412690480);
INSERT INTO "EmployeeInfoTabGroup" ("id", "tabId", "code", "name", "description", "sort", "status", "collapsed", "isSystem", "createdAt", "updatedAt") VALUES (2, 1, 'CONTACT_INFO', '联系方式', '电话、邮箱、地址等联系方式', 2, 'ACTIVE', 0, 1, 1779412690486, 1779412690486);
INSERT INTO "EmployeeInfoTabGroup" ("id", "tabId", "code", "name", "description", "sort", "status", "collapsed", "isSystem", "createdAt", "updatedAt") VALUES (3, 1, 'PERSONAL_DETAILS', '个人详情', '出生日期、婚姻状况、政治面貌等', 3, 'ACTIVE', 1, 1, 1779412690490, 1779412690490);
INSERT INTO "EmployeeInfoTabGroup" ("id", "tabId", "code", "name", "description", "sort", "status", "collapsed", "isSystem", "createdAt", "updatedAt") VALUES (7, 1, 'A01', '产品信息', NULL, 4, 'ACTIVE', 0, 0, 1779413061088, 1779413061088);
INSERT INTO "EmployeeInfoTabGroup" ("id", "tabId", "code", "name", "description", "sort", "status", "collapsed", "isSystem", "createdAt", "updatedAt") VALUES (8, 2, 'employment_info', '雇佣信息', '员工雇佣相关信息', 1, 'ACTIVE', 0, 0, 1779436643331, 1779436643331);
INSERT INTO "EmployeeInfoTabGroup" ("id", "tabId", "code", "name", "description", "sort", "status", "collapsed", "isSystem", "createdAt", "updatedAt") VALUES (9, 2, 'probation_info', '试用与转正', '试用期与转正相关信息', 2, 'ACTIVE', 0, 0, 1779436643334, 1779436643334);

-- 数据导入: EmployeeLaborAccount
INSERT INTO "EmployeeLaborAccount" ("id", "employeeNo", "employeeId", "accountId", "effectiveDate", "expiryDate", "isPrimary", "status", "createdAt", "updatedAt") VALUES (1, '202605011', 13, 13, 1767225600000, NULL, 1, 'ACTIVE', 1779768290692, 1779768290692);
INSERT INTO "EmployeeLaborAccount" ("id", "employeeNo", "employeeId", "accountId", "effectiveDate", "expiryDate", "isPrimary", "status", "createdAt", "updatedAt") VALUES (4, '202605002', 4, 41, 1735689600000, NULL, 1, 'ACTIVE', 1779811778256, 1779811778256);

-- 数据导入: LaborAccount
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (1, 'AUTO-1779431142811', '///大桶/焊接', 'A01/A01', '///大桶/焊接', NULL, 2, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779431142824, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":null},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":null},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":null},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":{"id":65,"name":"大桶","code":"A01"}},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":63,"name":"焊接","code":"A01"}}]', 'ACTIVE', 1779431142825, 1779431142825);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (2, 'AUTO-1779433810928', '///大桶/喷漆', 'A01/A02', '///大桶/喷漆', NULL, 2, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779433810938, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":null},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":null},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":null},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":{"id":65,"name":"大桶","code":"A01"}},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":64,"name":"喷漆","code":"A02"}}]', 'ACTIVE', 1779433810940, 1779433810940);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (3, 'AUTO-1779439820992', '///小桶/喷漆', 'A02/A02', '///小桶/喷漆', NULL, 2, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779439821002, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":null},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":null},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":null},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":{"id":66,"name":"小桶","code":"A02"}},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":64,"name":"喷漆","code":"A02"}}]', 'ACTIVE', 1779439821005, 1779439821005);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (4, 'AUTO-1779444116053', '大华工厂/W1总装车间/W1总装L1产线//喷漆', 'DH/DH01/DH0101/A02', '大华工厂/W1总装车间/W1总装L1产线//喷漆', NULL, 4, NULL, NULL, NULL, NULL, NULL, 'SUB', 'DEVICE', NULL, 1779444116170, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"大华工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":64,"name":"喷漆","code":"A02"}}]', 'ACTIVE', 1779444116171, 1779444116171);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (5, 'AUTO-1779444131796', '大华工厂/W1总装车间/W1总装L1产线//喷漆', 'DH/DH01/DH0101/A02', '大华工厂/W1总装车间/W1总装L1产线//喷漆', NULL, 4, NULL, NULL, NULL, NULL, NULL, 'SUB', 'DEVICE', NULL, 1779444131806, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"大华工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":64,"name":"喷漆","code":"A02"}}]', 'ACTIVE', 1779444131807, 1779444131807);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (6, 'AUTO-1779444640702', '大华工厂/W1总装车间/W1总装L1产线//焊接', 'DH/DH01/DH0101/A01', '大华工厂/W1总装车间/W1总装L1产线//焊接', NULL, 4, NULL, NULL, NULL, NULL, NULL, 'SUB', 'DEVICE', NULL, 1779444640712, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"大华工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":63,"name":"焊接","code":"A01"}}]', 'ACTIVE', 1779444640713, 1779444640713);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (7, 'AUTO-1779766176192', '大华工厂/W1总装车间/W1总装L2产线//', 'DH/DH01/DH01002//', '大华工厂/W1总装车间/W1总装L2产线//', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'DEVICE', NULL, 1779766176206, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"大华工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":7,"name":"W1总装L2产线","code":"DH01002","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779766176207, 1779766176207);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (8, 'AUTO-1779766194467', '大华工厂/W1总装车间/W1总装L1产线//', 'DH/DH01/DH0101//', '大华工厂/W1总装车间/W1总装L1产线//', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'DEVICE', NULL, 1779766194476, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"大华工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779766194477, 1779766194477);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (9, 'DH_L1_290682', '大华工厂', 'DH', '大华工厂', NULL, 1, NULL, NULL, NULL, NULL, NULL, 'MAIN', 'PRODUCTION', NULL, 1767225600000, NULL, '[]', 'ACTIVE', 1779768290683, 1779807760826);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (10, 'DH01_L2_290687', '大华工厂/W1总装车间', 'DH/DH01', '大华工厂/W1总装车间', NULL, 2, 9, NULL, NULL, NULL, NULL, 'MAIN', 'PRODUCTION', NULL, 1767225600000, NULL, '[]', 'ACTIVE', 1779768290687, 1779807760830);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (11, 'DH01002_L3_290688', '大华工厂/W1总装车间/W1总装L2产线', 'DH/DH01/DH01002', '大华工厂/W1总装车间/W1总装L2产线', NULL, 3, 10, NULL, NULL, NULL, NULL, 'MAIN', 'PRODUCTION', NULL, 1767225600000, NULL, '[]', 'ACTIVE', 1779768290689, 1779807760833);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (12, '-13_L4_290689', '大华工厂/W1总装车间/W1总装L2产线/-', 'DH/DH01/DH01002/-', '大华工厂/W1总装车间/W1总装L2产线/-', NULL, 4, 11, NULL, NULL, NULL, NULL, 'MAIN', 'PRODUCTION', NULL, 1767225600000, NULL, '[]', 'ACTIVE', 1779768290690, 1779807760836);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (13, '-13_L5_290690', '大华工厂/W1总装车间/W1总装L2产线/-/-', 'DH/DH01/DH01002/-/-', '大华工厂/W1总装车间/W1总装L2产线/-/-', NULL, 5, 12, NULL, NULL, NULL, NULL, 'MAIN', 'PRODUCTION', 13, 1767225600000, NULL, '[{"level":1,"selectedValue":{"code":"DH","name":"大华工厂","value":"DH"},"selectedValueLabel":"大华工厂"},{"level":2,"selectedValue":{"code":"DH01","name":"W1总装车间","value":"DH01"},"selectedValueLabel":"W1总装车间"},{"level":3,"selectedValue":{"code":"DH01002","name":"W1总装L2产线","value":"DH01002"},"selectedValueLabel":"W1总装L2产线"},{"level":4,"selectedValue":null,"selectedValueLabel":null},{"level":5,"selectedValue":null,"selectedValueLabel":null}]', 'ACTIVE', 1779768290691, 1779768290691);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (14, 'AUTO-1779768590594', '////焊接', '////A01', '////焊接', NULL, 1, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779768590602, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":null},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":null},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":null},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":63,"name":"焊接","code":"A01"}}]', 'ACTIVE', 1779768590603, 1779768590603);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (15, 'AUTO-1779768598348', '////喷漆', '////A02', '////喷漆', NULL, 1, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779768598357, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":null},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":null},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":null},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":64,"name":"喷漆","code":"A02"}}]', 'ACTIVE', 1779768598358, 1779768598358);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (16, 'old_16_1779811104463', '大华工厂', 'DH', '大华工厂', NULL, 1, NULL, NULL, NULL, NULL, NULL, 'MAIN', 'PRODUCTION', NULL, 1735689600000, 1779638400000, '[]', 'INACTIVE', 1779768836522, 1779811104483);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (17, 'old_17_1779811104463', '大华工厂/W1总装车间', 'DH/DH01', '大华工厂/W1总装车间', NULL, 2, 16, NULL, NULL, NULL, NULL, 'MAIN', 'PRODUCTION', NULL, 1735689600000, 1779638400000, '[]', 'INACTIVE', 1779768836528, 1779811104481);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (18, 'old_18_1779811104463', '大华工厂/W1总装车间/W1总装L2产线', 'DH/DH01/DH01002', '大华工厂/W1总装车间/W1总装L2产线', NULL, 3, 17, NULL, NULL, NULL, NULL, 'MAIN', 'PRODUCTION', NULL, 1735689600000, 1779638400000, '[]', 'INACTIVE', 1779768836531, 1779811104479);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (19, 'old_19_1779811104463', '大华工厂/W1总装车间/W1总装L2产线/-', 'DH/DH01/DH01002/-', '大华工厂/W1总装车间/W1总装L2产线/-', NULL, 4, 18, NULL, NULL, NULL, NULL, 'MAIN', 'PRODUCTION', NULL, 1735689600000, 1779638400000, '[]', 'INACTIVE', 1779768836532, 1779811104476);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (21, 'AUTO-1779803520673', '////焊接', '////A01', '////焊接', NULL, 1, NULL, NULL, NULL, NULL, NULL, 'SUB', 'PUNCH', NULL, 1779803520684, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":null},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":null},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":null},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":70,"name":"焊接","code":"A01"}}]', 'ACTIVE', 1779803520685, 1779803520685);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (22, 'AUTO_1779803525498', '大华工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', '大华工厂/W1总装车间/W1总装L2产线//焊接', NULL, 4, NULL, NULL, NULL, NULL, NULL, 'SUB', 'PUNCH', NULL, NULL, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":7,"name":"W1总装L2产线","code":"DH01002","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"name":"焊接","code":"A01"}}]', 'ACTIVE', 1779803525499, 1779809768967);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (23, 'AUTO_1779803525530_sfe8bj', '大华工厂/W1总装车间/W1总装L2产线//焊接', '大华工厂/W1总装车间/W1总装L2产线//焊接', '大华工厂/W1总装车间/W1总装L2产线//焊接', '大华工厂/W1总装车间/W1总装L2产线//焊接', 4, NULL, NULL, NULL, NULL, NULL, 'SUB', 'PUNCH', NULL, NULL, NULL, '[]', 'ACTIVE', 1779803525531, 1779807760854);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (24, 'AUTO_1779803525633_wlz27m', '大华工厂/W1总装车间/W1总装L1产线//', '大华工厂/W1总装车间/W1总装L1产线//', '大华工厂/W1总装车间/W1总装L1产线//', '大华工厂/W1总装车间/W1总装L1产线//', 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'PUNCH', NULL, NULL, NULL, '[]', 'ACTIVE', 1779803525634, 1779807760857);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (25, 'AUTO_1779803525649_jp9t8r', '大华工厂/W1总装车间/W1总装L2产线//', '大华工厂/W1总装车间/W1总装L2产线//', '大华工厂/W1总装车间/W1总装L2产线//', '大华工厂/W1总装车间/W1总装L2产线//', 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'PUNCH', NULL, NULL, NULL, '[]', 'ACTIVE', 1779803525650, 1779807760861);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (26, 'AUTO-1779803570665', '////喷漆', '////A02', '////喷漆', NULL, 1, NULL, NULL, NULL, NULL, NULL, 'SUB', 'PUNCH', NULL, 1779803570677, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":null},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":null},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":null},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":71,"name":"喷漆","code":"A02"}}]', 'ACTIVE', 1779803570679, 1779803570679);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (27, 'AUTO_1779803576087', '大华工厂/W1总装车间/W1总装L2产线//喷漆', 'DH/DH01/DH01002//A02', '大华工厂/W1总装车间/W1总装L2产线//喷漆', NULL, 4, NULL, NULL, NULL, NULL, NULL, 'SUB', 'PUNCH', NULL, NULL, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":7,"name":"W1总装L2产线","code":"DH01002","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"name":"喷漆","code":"A02"}}]', 'ACTIVE', 1779803576089, 1779809768971);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (28, 'AUTO_1779803576133_ygmgc', '大华工厂/W1总装车间/W1总装L2产线//喷漆', '大华工厂/W1总装车间/W1总装L2产线//喷漆', '大华工厂/W1总装车间/W1总装L2产线//喷漆', '大华工厂/W1总装车间/W1总装L2产线//喷漆', 4, NULL, NULL, NULL, NULL, NULL, 'SUB', 'PUNCH', NULL, NULL, NULL, '[]', 'ACTIVE', 1779803576134, 1779807760866);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (29, 'AUTO-1779803655865', '////焊接', '////A01', '////焊接', NULL, 1, NULL, NULL, NULL, NULL, NULL, 'SUB', 'PUNCH', NULL, 1779803655873, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":null},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":null},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":null},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":70,"name":"焊接","code":"A01"}}]', 'ACTIVE', 1779803655874, 1779803655874);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (30, 'AUTO-1779803924775', '杭州工厂/W2总装车间///', 'DH/DH02///', '杭州工厂/W2总装车间///', NULL, 2, NULL, NULL, NULL, NULL, NULL, 'SUB', 'DEVICE', NULL, 1779803924782, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":8,"name":"W2总装车间","code":"DH02","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":null},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779803924783, 1779803924783);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (31, 'AUTO-1779803943303', '杭州工厂/W1总装车间///', 'DH/DH01///', '杭州工厂/W1总装车间///', NULL, 2, NULL, NULL, NULL, NULL, NULL, 'SUB', 'DEVICE', NULL, 1779803943312, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":null},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779803943313, 1779803943313);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (32, 'DH_L1_104498', '杭州工厂', 'DH', '杭州工厂', NULL, 1, NULL, NULL, NULL, NULL, NULL, 'MAIN', 'PRODUCTION', NULL, 1779724800000, NULL, '{}', 'ACTIVE', 1779811104499, 1779811104499);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (33, 'DH01_L2_104504', '杭州工厂/W1总装车间', 'DH/DH01', '杭州工厂/W1总装车间', NULL, 2, 32, NULL, NULL, NULL, NULL, 'MAIN', 'PRODUCTION', NULL, 1779724800000, NULL, '{}', 'ACTIVE', 1779811104506, 1779811104506);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (34, 'DH01002_L3_104507', '杭州工厂/W1总装车间/W1总装L2产线', 'DH/DH01/DH01002', '杭州工厂/W1总装车间/W1总装L2产线', NULL, 3, 33, NULL, NULL, NULL, NULL, 'MAIN', 'PRODUCTION', NULL, 1779724800000, NULL, '{}', 'ACTIVE', 1779811104508, 1779811104508);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (35, '-4_L4_104508', '杭州工厂/W1总装车间/W1总装L2产线/-', 'DH/DH01/DH01002/-', '杭州工厂/W1总装车间/W1总装L2产线/-', NULL, 4, 34, NULL, NULL, NULL, NULL, 'MAIN', 'PRODUCTION', NULL, 1779724800000, NULL, '{}', 'ACTIVE', 1779811104509, 1779811104509);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (37, 'DH_L1_778238', '杭州工厂', 'DH', '杭州工厂', NULL, 1, NULL, NULL, NULL, NULL, NULL, 'MAIN', 'PRODUCTION', NULL, 1735689600000, NULL, '{}', 'ACTIVE', 1779811778240, 1779811778240);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (38, 'DH01_L2_778246', '杭州工厂/W1总装车间', 'DH/DH01', '杭州工厂/W1总装车间', NULL, 2, 37, NULL, NULL, NULL, NULL, 'MAIN', 'PRODUCTION', NULL, 1735689600000, NULL, '{}', 'ACTIVE', 1779811778247, 1779811778247);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (39, 'DH01002_L3_778250', '杭州工厂/W1总装车间/W1总装L2产线', 'DH/DH01/DH01002', '杭州工厂/W1总装车间/W1总装L2产线', NULL, 3, 38, NULL, NULL, NULL, NULL, 'MAIN', 'PRODUCTION', NULL, 1735689600000, NULL, '{}', 'ACTIVE', 1779811778251, 1779811778251);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (40, '-4_L4_778252', '杭州工厂/W1总装车间/W1总装L2产线/-', 'DH/DH01/DH01002/-', '杭州工厂/W1总装车间/W1总装L2产线/-', NULL, 4, 39, NULL, NULL, NULL, NULL, 'MAIN', 'PRODUCTION', NULL, 1735689600000, NULL, '{}', 'ACTIVE', 1779811778252, 1779811778252);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (41, 'A01_L5_778254', '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', NULL, 5, 40, NULL, NULL, NULL, NULL, 'MAIN', 'PRODUCTION', 4, 1735689600000, NULL, '[{"level":1,"selectedValue":{"code":"DH","name":"杭州工厂","value":"DH"},"selectedValueLabel":"杭州工厂"},{"level":2,"selectedValue":{"code":"DH01","name":"W1总装车间","value":"DH01"},"selectedValueLabel":"W1总装车间"},{"level":3,"selectedValue":{"code":"DH01002","name":"W1总装L2产线","value":"DH01002"},"selectedValueLabel":"W1总装L2产线"},{"level":4,"selectedValue":null,"selectedValueLabel":null},{"level":5,"selectedValue":{"code":"A01","name":"焊接","value":"A01"},"selectedValueLabel":"焊接"}]', 'ACTIVE', 1779811778255, 1779811778255);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (42, 'LINE-1779812649181', '杭州工厂/W1总装车间/W1总装L1产线//', 'DH/DH01/DH0101//', '杭州工厂/W1总装车间/W1总装L1产线//', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779812649192, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779812649193, 1779812649193);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (43, 'LINE-1779812695441', '杭州工厂/W1总装车间/W1总装L2产线//', 'DH/DH01/DH01002//', '杭州工厂/W1总装车间/W1总装L2产线//', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779812695454, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":7,"name":"W1总装L2产线","code":"DH01002","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779812695455, 1779812695455);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (44, 'LINE-1779814143353', '杭州工厂/W1总装车间/W1总装L1产线//', 'DH/DH01/DH0101//', '杭州工厂/W1总装车间/W1总装L1产线//', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779814143363, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779814143364, 1779814143364);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (45, 'AUTO-1779814401758', '杭州工厂/W1总装车间/W1总装L1产线//', 'DH/DH01/DH0101//', '杭州工厂/W1总装车间/W1总装L1产线//', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779814401783, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779814401784, 1779814401784);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (46, 'LINE-1779814465486', '杭州工厂/W1总装车间/W1总装L1产线//', 'HZ/W1/WL1//', '杭州工厂/W1总装车间/W1总装L1产线//', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, NULL, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","type":"TEAM"}}]', 'ACTIVE', 1779814465488, 1779814465488);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (47, 'LINE-1779814564276', '杭州工厂/W1总装车间/W1总装L1产线//', 'DH/DH01/DH0101//', '杭州工厂/W1总装车间/W1总装L1产线//', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779814564284, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779814564285, 1779814564285);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (48, 'LINE-1779814633815', '杭州工厂/W1总装车间/W1总装L2产线//', 'DH/DH01/DH01002//', '杭州工厂/W1总装车间/W1总装L2产线//', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779814633822, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":7,"name":"W1总装L2产线","code":"DH01002","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779814633823, 1779814633823);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (49, 'LINE-1779814759782', '杭州工厂/W1总装车间/W1总装L1产线//', 'DH/DH01/DH0101//', '杭州工厂/W1总装车间/W1总装L1产线//', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779814759790, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779814759791, 1779814759791);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (50, 'LINE-1779814812247', '杭州工厂/W1总装车间/W1总装L2产线//', 'DH/DH01/DH01002//', '杭州工厂/W1总装车间/W1总装L2产线//', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779814812254, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":7,"name":"W1总装L2产线","code":"DH01002","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779814812255, 1779814812255);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (51, 'AUTO-1779815863368', '杭州工厂/W1总装车间/W1总装L1产线//', 'DH/DH01/DH0101//', '杭州工厂/W1总装车间/W1总装L1产线//', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779815863375, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779815863376, 1779815863376);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (52, 'AUTO-1779815883735', '杭州工厂/W1总装车间/W1总装L2产线//', 'DH/DH01/DH01002//', '杭州工厂/W1总装车间/W1总装L2产线//', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779815883746, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":7,"name":"W1总装L2产线","code":"DH01002","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779815883747, 1779815883747);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (53, 'AUTO-1779816071609', '杭州工厂/W1总装车间/W1总装L1产线', 'DH/DH01/DH0101//', '杭州工厂/W1总装车间/W1总装L1产线//', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779816071617, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779816071618, 1779816071618);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (54, 'AUTO-1779816091876', '杭州工厂/W1总装车间/W1总装L2产线', 'DH/DH01/DH01002//', '杭州工厂/W1总装车间/W1总装L2产线//', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779816091886, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":7,"name":"W1总装L2产线","code":"DH01002","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779816091887, 1779816091887);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (58, 'AUTO-1779864110677', '杭州工厂/W1总装车间/W1总装L1产线/大桶/焊接', 'DH/DH01/DH0101/A01/A01', '杭州工厂/W1总装车间/W1总装L1产线/大桶/焊接', NULL, 5, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779864110687, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":{"id":76,"name":"大桶","code":"A01"}},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":70,"name":"焊接","code":"A01"}}]', 'ACTIVE', 1779864110688, 1779864110688);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (59, 'AUTO-1779867542309', '杭州工厂/W1总装车间/W1总装L1产线/喷漆', 'DH/DH01/DH0101//A02', '杭州工厂/W1总装车间/W1总装L1产线//喷漆', NULL, 4, NULL, NULL, NULL, NULL, NULL, 'SUB', 'DEVICE', NULL, 1779867542335, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":71,"name":"喷漆","code":"A02"}}]', 'ACTIVE', 1779867542336, 1779867542336);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (60, 'AUTO-1779867559669', '杭州工厂/W1总装车间/W1总装L1产线/焊接', 'DH/DH01/DH0101//A01', '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, 4, NULL, NULL, NULL, NULL, NULL, 'SUB', 'DEVICE', NULL, 1779867559677, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":70,"name":"焊接","code":"A01"}}]', 'ACTIVE', 1779867559678, 1779867559678);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (61, 'AUTO-1779867580436', '杭州工厂/W1总装车间/W1总装L2产线', 'DH/DH01/DH01002//', '杭州工厂/W1总装车间/W1总装L2产线//', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'DEVICE', NULL, 1779867580448, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":7,"name":"W1总装L2产线","code":"DH01002","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779867580449, 1779867580449);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (62, 'AUTO-1779867591426', '杭州工厂/W1总装车间/W1总装L1产线', 'DH/DH01/DH0101//', '杭州工厂/W1总装车间/W1总装L1产线//', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'DEVICE', NULL, 1779867591439, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779867591440, 1779867591440);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (63, 'AUTO-1779868606174', '杭州工厂/W1总装车间/W1总装L2产线', 'DH/DH01/DH01002//', '杭州工厂/W1总装车间/W1总装L2产线//', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'DEVICE', NULL, 1779868606185, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":7,"name":"W1总装L2产线","code":"DH01002","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779868606186, 1779868606186);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (64, 'AUTO-1779868619357', '杭州工厂/W1总装车间/W1总装L1产线', 'DH/DH01/DH0101//', '杭州工厂/W1总装车间/W1总装L1产线//', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'DEVICE', NULL, 1779868619365, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779868619366, 1779868619366);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (65, 'LINE-1779891226554', '杭州工厂/W1总装车间/W1总装L1产线', 'DH/DH01/DH0101//', '杭州工厂/W1总装车间/W1总装L1产线//', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779891226568, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779891226569, 1779891226569);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (66, 'LINE-1779891251800', '杭州工厂/W1总装车间/W1总装L2产线', 'DH/DH01/DH01002//', '杭州工厂/W1总装车间/W1总装L2产线//', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779891251807, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":7,"name":"W1总装L2产线","code":"DH01002","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":null}]', 'ACTIVE', 1779891251808, 1779891251808);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (67, 'AUTO-1779895928025', '杭州工厂/W1总装车间/W1总装L2产线/焊接', 'DH/DH01/DH01002//A01', '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, 4, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779895928044, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":7,"name":"W1总装L2产线","code":"DH01002","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":70,"name":"焊接","code":"A01"}}]', 'ACTIVE', 1779895928045, 1779895928045);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (68, 'ORG_4', '杭州工厂', '4', '杭州工厂', NULL, 1, NULL, NULL, NULL, NULL, NULL, 'ORG', 'ALLOCATED', NULL, 1779897478484, NULL, '{"orgId":4,"orgName":"杭州工厂"}', 'ACTIVE', 1779897478485, 1779897478485);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (69, 'WORKSHOP_5', 'W1总装车间', '4/5', '杭州工厂/W1总装车间', NULL, 2, 68, NULL, NULL, NULL, NULL, 'WORKSHOP', 'ALLOCATED', NULL, 1779897478489, NULL, '{"orgId":4,"orgName":"杭州工厂","workshopId":5,"workshopName":"W1总装车间"}', 'ACTIVE', 1779897478489, 1779897478489);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (70, 'LINE_6_INDIRECT', 'undefined_间接工时', '4/5/6', '杭州工厂/W1总装车间/undefined_间接工时', NULL, 3, 69, NULL, NULL, NULL, NULL, 'LINE', 'ALLOCATED', NULL, 1779897478492, NULL, '{"lineId":6,"lineCode":"LINE_6","workshopId":5,"workshopName":"W1总装车间","orgId":4,"orgName":"杭州工厂"}', 'ACTIVE', 1779897478493, 1779897478493);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (71, 'LINE_7_INDIRECT', 'undefined_间接工时', '4/5/7', '杭州工厂/W1总装车间/undefined_间接工时', NULL, 3, 69, NULL, NULL, NULL, NULL, 'LINE', 'ALLOCATED', NULL, 1779897478549, NULL, '{"lineId":7,"lineCode":"LINE_7","workshopId":5,"workshopName":"W1总装车间","orgId":4,"orgName":"杭州工厂"}', 'ACTIVE', 1779897478549, 1779897478549);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (72, 'AUTO-1779901615555', '杭州工厂/W1总装车间/W1总装L2产线/喷漆', 'DH/DH01/DH01002//A02', '杭州工厂/W1总装车间/W1总装L2产线//喷漆', NULL, 4, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779901615572, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":7,"name":"W1总装L2产线","code":"DH01002","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":71,"name":"喷漆","code":"A02"}}]', 'ACTIVE', 1779901615573, 1779901615573);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (73, 'AUTO-1779931273523', '杭州工厂/W1总装车间/W1总装L1产线/焊接', 'DH/DH01/DH0101//A01', '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, 4, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779931273532, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":70,"name":"焊接","code":"A01"}}]', 'ACTIVE', 1779931273533, 1779931273533);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (74, 'AUTO-1779933311701', '杭州工厂/W1总装车间/焊接', 'DH/DH01///A01', '杭州工厂/W1总装车间///焊接', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779933311733, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":null},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":70,"name":"焊接","code":"A01"}}]', 'ACTIVE', 1779933311734, 1779933311734);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (75, 'AUTO-1779933381070', '杭州工厂/W1总装车间/W1总装L2产线/焊接', 'DH/DH01/DH01002//A01', '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, 4, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779933381077, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":7,"name":"W1总装L2产线","code":"DH01002","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":70,"name":"焊接","code":"A01"}}]', 'ACTIVE', 1779933381077, 1779933381077);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (76, 'AUTO-1779936408414', '杭州工厂/W1总装车间/W1总装L1产线/喷漆', 'DH/DH01/DH0101//A02', '杭州工厂/W1总装车间/W1总装L1产线//喷漆', NULL, 4, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779936408422, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":71,"name":"喷漆","code":"A02"}}]', 'ACTIVE', 1779936408423, 1779936408423);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (77, 'AUTO-1779936470092', '杭州工厂/W1总装车间/W1总装L1产线/焊接', 'DH/DH01/DH0101//A01', '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, 4, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779936470098, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":70,"name":"焊接","code":"A01"}}]', 'ACTIVE', 1779936470099, 1779936470099);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (78, 'AUTO-1779936500474', '杭州工厂/W1总装车间/焊接', 'DH/DH01///A01', '杭州工厂/W1总装车间///焊接', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779936500479, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":null},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":70,"name":"焊接","code":"A01"}}]', 'ACTIVE', 1779936500480, 1779936500480);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (79, 'AUTO-1779936604910', '杭州工厂/W1总装车间/焊接', 'DH/DH01///A01', '杭州工厂/W1总装车间///焊接', NULL, 3, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779936604922, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":null},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":70,"name":"焊接","code":"A01"}}]', 'ACTIVE', 1779936604923, 1779936604923);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (80, 'AUTO-1779938183575', '杭州工厂/W1总装车间/W1总装L1产线/喷漆', 'DH/DH01/DH0101//A02', '杭州工厂/W1总装车间/W1总装L1产线//喷漆', NULL, 4, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779938183587, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":71,"name":"喷漆","code":"A02"}}]', 'ACTIVE', 1779938183588, 1779938183588);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (81, 'AUTO-1779946195871', '杭州工厂/W1总装车间/W1总装L2产线/焊接', 'DH/DH01/DH01002//A01', '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, 4, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779946195880, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":7,"name":"W1总装L2产线","code":"DH01002","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":70,"name":"焊接","code":"A01"}}]', 'ACTIVE', 1779946195881, 1779946195881);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (82, 'AUTO-1779983562379', '焊接', '////A01', '////焊接', NULL, 1, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779983562387, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":null},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":null},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":null},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":70,"name":"焊接","code":"A01"}}]', 'ACTIVE', 1779983562388, 1779983562388);
INSERT INTO "LaborAccount" ("id", "code", "name", "path", "namePath", "accountPath", "level", "parentId", "parentPath", "orgId", "orgName", "orgPath", "type", "usageType", "employeeId", "effectiveDate", "expiryDate", "hierarchyValues", "status", "createdAt", "updatedAt") VALUES (83, 'AUTO-1779984600074', '杭州工厂/W1总装车间/W1总装L1产线/焊接', 'DH/DH01/DH0101//A01', '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, 4, NULL, NULL, NULL, NULL, NULL, 'SUB', 'SHIFT', NULL, 1779984600089, NULL, '[{"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"杭州工厂","code":"DH","type":"COMPANY"}},{"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},{"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},{"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},{"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":70,"name":"焊接","code":"A01"}}]', 'ACTIVE', 1779984600090, 1779984600090);

-- 数据导入: LaborHourReportEmployee
INSERT INTO "LaborHourReportEmployee" ("id", "requestId", "employeeId", "employeeNo", "employeeName", "createdAt") VALUES (77, 35, 13, '202605011', '测试11', 1779975728317);
INSERT INTO "LaborHourReportEmployee" ("id", "requestId", "employeeId", "employeeNo", "employeeName", "createdAt") VALUES (78, 35, 4, '202605002', 'Paul ', 1779975728317);
INSERT INTO "LaborHourReportEmployee" ("id", "requestId", "employeeId", "employeeNo", "employeeName", "createdAt") VALUES (79, 35, 5, '202605003', 'Eric', 1779975728317);
INSERT INTO "LaborHourReportEmployee" ("id", "requestId", "employeeId", "employeeNo", "employeeName", "createdAt") VALUES (80, 35, 6, '202605004', 'Will', 1779975728317);
INSERT INTO "LaborHourReportEmployee" ("id", "requestId", "employeeId", "employeeNo", "employeeName", "createdAt") VALUES (81, 36, 8, '202605006', '李四', 1779975849849);
INSERT INTO "LaborHourReportEmployee" ("id", "requestId", "employeeId", "employeeNo", "employeeName", "createdAt") VALUES (82, 36, 6, '202605004', 'Will', 1779975849849);
INSERT INTO "LaborHourReportEmployee" ("id", "requestId", "employeeId", "employeeNo", "employeeName", "createdAt") VALUES (83, 36, 4, '202605002', 'Paul ', 1779975849849);
INSERT INTO "LaborHourReportEmployee" ("id", "requestId", "employeeId", "employeeNo", "employeeName", "createdAt") VALUES (84, 36, 3, '202605001', 'Aaron.he', 1779975849849);
INSERT INTO "LaborHourReportEmployee" ("id", "requestId", "employeeId", "employeeNo", "employeeName", "createdAt") VALUES (85, 36, 5, '202605003', 'Eric', 1779975849849);
INSERT INTO "LaborHourReportEmployee" ("id", "requestId", "employeeId", "employeeNo", "employeeName", "createdAt") VALUES (86, 37, 5, '202605003', 'Eric', 1779975887608);
INSERT INTO "LaborHourReportEmployee" ("id", "requestId", "employeeId", "employeeNo", "employeeName", "createdAt") VALUES (87, 37, 3, '202605001', 'Aaron.he', 1779975887608);
INSERT INTO "LaborHourReportEmployee" ("id", "requestId", "employeeId", "employeeNo", "employeeName", "createdAt") VALUES (88, 37, 4, '202605002', 'Paul ', 1779975887608);
INSERT INTO "LaborHourReportEmployee" ("id", "requestId", "employeeId", "employeeNo", "employeeName", "createdAt") VALUES (89, 37, 6, '202605004', 'Will', 1779975887608);
INSERT INTO "LaborHourReportEmployee" ("id", "requestId", "employeeId", "employeeNo", "employeeName", "createdAt") VALUES (90, 38, 5, '202605003', 'Eric', 1779976355382);
INSERT INTO "LaborHourReportEmployee" ("id", "requestId", "employeeId", "employeeNo", "employeeName", "createdAt") VALUES (91, 38, 3, '202605001', 'Aaron.he', 1779976355382);
INSERT INTO "LaborHourReportEmployee" ("id", "requestId", "employeeId", "employeeNo", "employeeName", "createdAt") VALUES (92, 38, 4, '202605002', 'Paul ', 1779976355382);
INSERT INTO "LaborHourReportEmployee" ("id", "requestId", "employeeId", "employeeNo", "employeeName", "createdAt") VALUES (93, 38, 6, '202605004', 'Will', 1779976355382);
INSERT INTO "LaborHourReportEmployee" ("id", "requestId", "employeeId", "employeeNo", "employeeName", "createdAt") VALUES (94, 45, 7, '202605005', '张三', 1779985016456);
INSERT INTO "LaborHourReportEmployee" ("id", "requestId", "employeeId", "employeeNo", "employeeName", "createdAt") VALUES (95, 45, 6, '202605004', 'Will', 1779985016456);
INSERT INTO "LaborHourReportEmployee" ("id", "requestId", "employeeId", "employeeNo", "employeeName", "createdAt") VALUES (96, 45, 5, '202605003', 'Eric', 1779985016456);
INSERT INTO "LaborHourReportEmployee" ("id", "requestId", "employeeId", "employeeNo", "employeeName", "createdAt") VALUES (97, 45, 8, '202605006', '李四', 1779985016456);

-- 数据导入: LaborHourReportRequest
INSERT INTO "LaborHourReportRequest" ("id", "requestNo", "workflowCode", "title", "reportDate", "reportMode", "employeeId", "employeeNo", "employeeName", "hourType", "hourTypeName", "startTime", "endTime", "value", "unit", "description", "accountId", "accountCode", "accountPath", "accountName", "status", "requesterId", "requesterName", "approverId", "approverName", "approvedAt", "approvalComment", "instanceId", "createdAt", "updatedAt") VALUES (34, 'LABOR202605282134298487', 'LABOR_HOUR_REPORT', 'Aaron.he - 作业工时 - 2026-05-28', 1779926400000, 'personal', 3, '202605001', 'Aaron.he', 'A06', '作业工时', '08:00', '10:00', 2.0, 'HOURS', NULL, 81, 'AUTO-1779946195871', '', '杭州工厂/W1总装车间/W1总装L2产线/焊接', 'APPROVED', 1, '系统管理员', 1, '系统管理员', 1779975287000, NULL, 42, 1779975269224, 1779975287001);
INSERT INTO "LaborHourReportRequest" ("id", "requestNo", "workflowCode", "title", "reportDate", "reportMode", "employeeId", "employeeNo", "employeeName", "hourType", "hourTypeName", "startTime", "endTime", "value", "unit", "description", "accountId", "accountCode", "accountPath", "accountName", "status", "requesterId", "requesterName", "approverId", "approverName", "approvedAt", "approvalComment", "instanceId", "createdAt", "updatedAt") VALUES (35, 'LABOR202605282142089870', 'LABOR_HOUR_REPORT', '团队报工(4人) - 分摊工时 - 2026-05-28', 1779926400000, 'team', 13, '202605011', '测试11', 'A05', '分摊工时', '09:00', '12:00', 3.0, 'HOURS', NULL, 81, 'AUTO-1779946195871', '', '杭州工厂/W1总装车间/W1总装L2产线/焊接', 'APPROVED', 1, '系统管理员', 1, '系统管理员', 1779975742378, NULL, 43, 1779975728317, 1779975742379);
INSERT INTO "LaborHourReportRequest" ("id", "requestNo", "workflowCode", "title", "reportDate", "reportMode", "employeeId", "employeeNo", "employeeName", "hourType", "hourTypeName", "startTime", "endTime", "value", "unit", "description", "accountId", "accountCode", "accountPath", "accountName", "status", "requesterId", "requesterName", "approverId", "approverName", "approvedAt", "approvalComment", "instanceId", "createdAt", "updatedAt") VALUES (36, 'LABOR202605282144099948', 'LABOR_HOUR_REPORT', '团队报工(5人) - 作业工时 - 2026-05-28', 1779926400000, 'team', 8, '202605006', '李四', 'A06', '作业工时', '09:00', '12:00', 3.0, 'HOURS', NULL, 81, 'AUTO-1779946195871', '', '杭州工厂/W1总装车间/W1总装L2产线/焊接', 'APPROVED', 1, '系统管理员', 1, '系统管理员', 1779975934853, NULL, 44, 1779975849849, 1779975934854);
INSERT INTO "LaborHourReportRequest" ("id", "requestNo", "workflowCode", "title", "reportDate", "reportMode", "employeeId", "employeeNo", "employeeName", "hourType", "hourTypeName", "startTime", "endTime", "value", "unit", "description", "accountId", "accountCode", "accountPath", "accountName", "status", "requesterId", "requesterName", "approverId", "approverName", "approvedAt", "approvalComment", "instanceId", "createdAt", "updatedAt") VALUES (37, 'LABOR202605282144479578', 'LABOR_HOUR_REPORT', '团队报工(4人) - 线体工时 - 2026-05-28', 1779926400000, 'team', 5, '202605003', 'Eric', 'A01', '线体工时', NULL, NULL, 2.0, 'HOURS', NULL, 81, 'AUTO-1779946195871', '', '杭州工厂/W1总装车间/W1总装L2产线/焊接', 'APPROVED', 1, '系统管理员', 3, 'Aaron.he', 1779976259620, '重新审批通过（修复NULL时间字段问题）', 45, 1779975887608, 1779976259621);
INSERT INTO "LaborHourReportRequest" ("id", "requestNo", "workflowCode", "title", "reportDate", "reportMode", "employeeId", "employeeNo", "employeeName", "hourType", "hourTypeName", "startTime", "endTime", "value", "unit", "description", "accountId", "accountCode", "accountPath", "accountName", "status", "requesterId", "requesterName", "approverId", "approverName", "approvedAt", "approvalComment", "instanceId", "createdAt", "updatedAt") VALUES (38, 'LABOR202605282152350623', 'LABOR_HOUR_REPORT', '团队报工(4人) - 线体工时 - 2026-05-28', 1779926400000, 'team', 5, '202605003', 'Eric', 'A01', '线体工时', NULL, NULL, 2.0, 'HOURS', NULL, 81, 'AUTO-1779946195871', '', '杭州工厂/W1总装车间/W1总装L2产线/焊接', 'APPROVED', 1, '系统管理员', 1, '系统管理员', 1779976389265, NULL, 46, 1779976355382, 1779976389267);
INSERT INTO "LaborHourReportRequest" ("id", "requestNo", "workflowCode", "title", "reportDate", "reportMode", "employeeId", "employeeNo", "employeeName", "hourType", "hourTypeName", "startTime", "endTime", "value", "unit", "description", "accountId", "accountCode", "accountPath", "accountName", "status", "requesterId", "requesterName", "approverId", "approverName", "approvedAt", "approvalComment", "instanceId", "createdAt", "updatedAt") VALUES (39, 'LABOR202605282354253068', 'LABOR_HOUR_REPORT', '张三 - 作业工时 - 2026-05-28', 1779926400000, 'personal', 7, '202605005', '张三', 'A06', '作业工时', '08:00', '12:00', 4.0, 'HOURS', NULL, 81, 'AUTO-1779946195871', '', '杭州工厂/W1总装车间/W1总装L2产线/焊接', 'APPROVED', 1, '系统管理员', 1, 'admin', 1779983865067, '重新审批以计算金额', 47, 1779983665619, 1779983865068);
INSERT INTO "LaborHourReportRequest" ("id", "requestNo", "workflowCode", "title", "reportDate", "reportMode", "employeeId", "employeeNo", "employeeName", "hourType", "hourTypeName", "startTime", "endTime", "value", "unit", "description", "accountId", "accountCode", "accountPath", "accountName", "status", "requesterId", "requesterName", "approverId", "approverName", "approvedAt", "approvalComment", "instanceId", "createdAt", "updatedAt") VALUES (40, 'LABOR202605290004482948', 'LABOR_HOUR_REPORT', '张三 - 作业工时 - 2026-05-28', 1779926400000, 'personal', 7, '202605005', '张三', 'A06', '作业工时', '08:00', '10:00', 2.0, 'HOURS', NULL, 81, 'AUTO-1779946195871', '', '杭州工厂/W1总装车间/W1总装L2产线/焊接', 'APPROVED', 1, '系统管理员', 1, 'admin', 1779984480467, '重新审批以计算金额', 48, 1779984288857, 1779984480468);
INSERT INTO "LaborHourReportRequest" ("id", "requestNo", "workflowCode", "title", "reportDate", "reportMode", "employeeId", "employeeNo", "employeeName", "hourType", "hourTypeName", "startTime", "endTime", "value", "unit", "description", "accountId", "accountCode", "accountPath", "accountName", "status", "requesterId", "requesterName", "approverId", "approverName", "approvedAt", "approvalComment", "instanceId", "createdAt", "updatedAt") VALUES (41, 'LABOR202605290009219775', 'LABOR_HOUR_REPORT', '张三 - 作业工时 - 2026-05-28', 1779926400000, 'personal', 7, '202605005', '张三', 'A06', '作业工时', '05:00', '07:00', 2.0, 'HOURS', NULL, 81, 'AUTO-1779946195871', '', '杭州工厂/W1总装车间/W1总装L2产线/焊接', 'APPROVED', 1, '系统管理员', 1, '系统管理员', 1779984627727, NULL, 49, 1779984561236, 1779984627729);
INSERT INTO "LaborHourReportRequest" ("id", "requestNo", "workflowCode", "title", "reportDate", "reportMode", "employeeId", "employeeNo", "employeeName", "hourType", "hourTypeName", "startTime", "endTime", "value", "unit", "description", "accountId", "accountCode", "accountPath", "accountName", "status", "requesterId", "requesterName", "approverId", "approverName", "approvedAt", "approvalComment", "instanceId", "createdAt", "updatedAt") VALUES (42, 'LABOR202605290010023697', 'LABOR_HOUR_REPORT', '张三 - 作业工时 - 2026-05-28', 1779926400000, 'personal', 7, '202605005', '张三', 'A06', '作业工时', NULL, NULL, 2.0, 'HOURS', NULL, 83, 'AUTO-1779984600074', '', '杭州工厂/W1总装车间/W1总装L1产线/焊接', 'APPROVED', 1, '系统管理员', 1, '系统管理员', 1779984620969, NULL, 50, 1779984602840, 1779984620971);
INSERT INTO "LaborHourReportRequest" ("id", "requestNo", "workflowCode", "title", "reportDate", "reportMode", "employeeId", "employeeNo", "employeeName", "hourType", "hourTypeName", "startTime", "endTime", "value", "unit", "description", "accountId", "accountCode", "accountPath", "accountName", "status", "requesterId", "requesterName", "approverId", "approverName", "approvedAt", "approvalComment", "instanceId", "createdAt", "updatedAt") VALUES (43, 'LABOR202605290012568606', 'LABOR_HOUR_REPORT', '张三 - 作业工时 - 2026-05-28', 1779926400000, 'personal', 7, '202605005', '张三', 'A06', '作业工时', NULL, NULL, 2.0, 'HOURS', NULL, 80, 'AUTO-1779938183575', '', '杭州工厂/W1总装车间/W1总装L1产线/喷漆', 'APPROVED', 1, '系统管理员', 1, '系统管理员', 1779984790837, NULL, 51, 1779984776187, 1779984790838);
INSERT INTO "LaborHourReportRequest" ("id", "requestNo", "workflowCode", "title", "reportDate", "reportMode", "employeeId", "employeeNo", "employeeName", "hourType", "hourTypeName", "startTime", "endTime", "value", "unit", "description", "accountId", "accountCode", "accountPath", "accountName", "status", "requesterId", "requesterName", "approverId", "approverName", "approvedAt", "approvalComment", "instanceId", "createdAt", "updatedAt") VALUES (44, 'LABOR202605290014507371', 'LABOR_HOUR_REPORT', '张三 - 作业工时 - 2026-05-29', 1780012800000, 'personal', 7, '202605005', '张三', 'A06', '作业工时', NULL, NULL, 2.0, 'HOURS', NULL, 80, 'AUTO-1779938183575', '', '杭州工厂/W1总装车间/W1总装L1产线/喷漆', 'APPROVED', 1, '系统管理员', 1, 'admin', 1779985364397, '验证LEVEL匹配修复', 52, 1779984890595, 1779985364398);
INSERT INTO "LaborHourReportRequest" ("id", "requestNo", "workflowCode", "title", "reportDate", "reportMode", "employeeId", "employeeNo", "employeeName", "hourType", "hourTypeName", "startTime", "endTime", "value", "unit", "description", "accountId", "accountCode", "accountPath", "accountName", "status", "requesterId", "requesterName", "approverId", "approverName", "approvedAt", "approvalComment", "instanceId", "createdAt", "updatedAt") VALUES (45, 'LABOR202605290016561181', 'LABOR_HOUR_REPORT', '团队报工(4人) - 作业工时 - 2026-05-28', 1779926400000, 'team', 7, '202605005', '张三', 'A06', '作业工时', NULL, NULL, 2.0, 'HOURS', NULL, 81, 'AUTO-1779946195871', '', '杭州工厂/W1总装车间/W1总装L2产线/焊接', 'APPROVED', 1, '系统管理员', 1, '系统管理员', 1779985563113, '测试金额政策匹配', 53, 1779985016456, 1779985563114);
INSERT INTO "LaborHourReportRequest" ("id", "requestNo", "workflowCode", "title", "reportDate", "reportMode", "employeeId", "employeeNo", "employeeName", "hourType", "hourTypeName", "startTime", "endTime", "value", "unit", "description", "accountId", "accountCode", "accountPath", "accountName", "status", "requesterId", "requesterName", "approverId", "approverName", "approvedAt", "approvalComment", "instanceId", "createdAt", "updatedAt") VALUES (46, 'LABOR202605290024338974', 'LABOR_HOUR_REPORT', '张三 - 作业工时 - 2026-05-28', 1779926400000, 'personal', 7, '202605005', '张三', 'A06', '作业工时', NULL, NULL, 1.0, 'HOURS', '1', 80, 'AUTO-1779938183575', '', '杭州工厂/W1总装车间/W1总装L1产线/喷漆', 'APPROVED', 1, '系统管理员', 1, '系统管理员', 1779985488587, NULL, 54, 1779985473931, 1779985488587);

-- 数据导入: LineShift
INSERT INTO "LineShift" ("id", "orgId", "orgName", "shiftId", "shiftName", "scheduleDate", "startTime", "endTime", "plannedProducts", "participateInAllocation", "status", "description", "createdAt", "updatedAt", "deletedAt", "delayedShutdownTime", "accountId", "accountName") VALUES (1, 6, 'W1总装L1产线', 8, '生产长白班', 1778371200000, 1778371200000, 1778403600000, '"[]"', 1, 'ACTIVE', '', 1779812665199, 1779814136049, 1779814136049, NULL, NULL, NULL);
INSERT INTO "LineShift" ("id", "orgId", "orgName", "shiftId", "shiftName", "scheduleDate", "startTime", "endTime", "plannedProducts", "participateInAllocation", "status", "description", "createdAt", "updatedAt", "deletedAt", "delayedShutdownTime", "accountId", "accountName") VALUES (2, 7, 'W1总装L2产线', 8, '生产长白班', 1778371200000, 1778371200000, 1778414400000, '"[]"', 1, 'ACTIVE', '', 1779812710610, 1779814624484, 1779814624483, NULL, 43, '杭州工厂/W1总装车间/W1总装L2产线//');
INSERT INTO "LineShift" ("id", "orgId", "orgName", "shiftId", "shiftName", "scheduleDate", "startTime", "endTime", "plannedProducts", "participateInAllocation", "status", "description", "createdAt", "updatedAt", "deletedAt", "delayedShutdownTime", "accountId", "accountName") VALUES (3, 6, 'W1总装L1产线', 8, '生产长白班', 1778371200000, 1778371200000, 1778414400000, '"[]"', 1, 'ACTIVE', '', 1779814160336, 1779814558319, 1779814558318, NULL, 46, '杭州工厂/W1总装车间/W1总装L1产线//');
INSERT INTO "LineShift" ("id", "orgId", "orgName", "shiftId", "shiftName", "scheduleDate", "startTime", "endTime", "plannedProducts", "participateInAllocation", "status", "description", "createdAt", "updatedAt", "deletedAt", "delayedShutdownTime", "accountId", "accountName") VALUES (4, 6, 'W1总装L1产线', 8, '生产长白班', 1778371200000, 1778371200000, 1778414400000, '"[]"', 1, 'ACTIVE', '', 1779814578381, 1779814754613, 1779814754612, NULL, NULL, NULL);
INSERT INTO "LineShift" ("id", "orgId", "orgName", "shiftId", "shiftName", "scheduleDate", "startTime", "endTime", "plannedProducts", "participateInAllocation", "status", "description", "createdAt", "updatedAt", "deletedAt", "delayedShutdownTime", "accountId", "accountName") VALUES (5, 7, 'W1总装L2产线', 8, '生产长白班', 1778371200000, 1778371200000, 1778414400000, '"[]"', 1, 'ACTIVE', '', 1779814653864, 1779814752355, 1779814752355, NULL, NULL, NULL);
INSERT INTO "LineShift" ("id", "orgId", "orgName", "shiftId", "shiftName", "scheduleDate", "startTime", "endTime", "plannedProducts", "participateInAllocation", "status", "description", "createdAt", "updatedAt", "deletedAt", "delayedShutdownTime", "accountId", "accountName") VALUES (7, 6, 'W1总装L1产线', 8, '生产长白班', 1778371200000, 1778371200000, 1778414400000, '"[]"', 1, 'ACTIVE', '', 1779814774914, 1779814774914, NULL, NULL, 49, '杭州工厂/W1总装车间/W1总装L1产线//');
INSERT INTO "LineShift" ("id", "orgId", "orgName", "shiftId", "shiftName", "scheduleDate", "startTime", "endTime", "plannedProducts", "participateInAllocation", "status", "description", "createdAt", "updatedAt", "deletedAt", "delayedShutdownTime", "accountId", "accountName") VALUES (8, 7, 'W1总装L2产线', 8, '生产长白班', 1778371200000, 1778371200000, 1778414400000, '"[]"', 1, 'ACTIVE', '', 1779814821499, 1779814821499, NULL, NULL, 50, '杭州工厂/W1总装车间/W1总装L2产线//');
INSERT INTO "LineShift" ("id", "orgId", "orgName", "shiftId", "shiftName", "scheduleDate", "startTime", "endTime", "plannedProducts", "participateInAllocation", "status", "description", "createdAt", "updatedAt", "deletedAt", "delayedShutdownTime", "accountId", "accountName") VALUES (9, 6, 'W1总装L1产线', 8, '生产长白班', 1779840000000, 1779840000000, 1779883200000, '"[]"', 1, 'ACTIVE', '', 1779891241939, 1779891241939, NULL, NULL, 65, '杭州工厂/W1总装车间/W1总装L1产线//');
INSERT INTO "LineShift" ("id", "orgId", "orgName", "shiftId", "shiftName", "scheduleDate", "startTime", "endTime", "plannedProducts", "participateInAllocation", "status", "description", "createdAt", "updatedAt", "deletedAt", "delayedShutdownTime", "accountId", "accountName") VALUES (10, 7, 'W1总装L2产线', 8, '生产长白班', 1779840000000, 1779840000000, 1779883200000, '"[]"', 1, 'ACTIVE', '', 1779891275039, 1779891275039, NULL, NULL, 66, '杭州工厂/W1总装车间/W1总装L2产线//');

-- 数据导入: Organization
INSERT INTO "Organization" ("id", "code", "name", "parentId", "type", "leaderId", "leaderName", "level", "effectiveDate", "expiryDate", "status", "createdAt", "updatedAt") VALUES (1, 'ROOT', '集团总部', NULL, 'GROUP', NULL, '总经理', 1, 1779361914239, NULL, 'ACTIVE', 1779361914242, 1779361914242);
INSERT INTO "Organization" ("id", "code", "name", "parentId", "type", "leaderId", "leaderName", "level", "effectiveDate", "expiryDate", "status", "createdAt", "updatedAt") VALUES (4, 'DH', '杭州工厂', 1, 'COMPANY', NULL, NULL, 1, 1779445024151, NULL, 'ACTIVE', 1779416243630, 1779798209734);
INSERT INTO "Organization" ("id", "code", "name", "parentId", "type", "leaderId", "leaderName", "level", "effectiveDate", "expiryDate", "status", "createdAt", "updatedAt") VALUES (5, 'DH01', 'W1总装车间', 4, 'DEPARTMENT', NULL, NULL, 2, 1779445056020, NULL, 'ACTIVE', 1779416273948, 1779416273948);
INSERT INTO "Organization" ("id", "code", "name", "parentId", "type", "leaderId", "leaderName", "level", "effectiveDate", "expiryDate", "status", "createdAt", "updatedAt") VALUES (6, 'DH0101', 'W1总装L1产线', 5, 'TEAM', NULL, NULL, 1, 1779445078886, NULL, 'ACTIVE', 1779416300672, 1779416309263);
INSERT INTO "Organization" ("id", "code", "name", "parentId", "type", "leaderId", "leaderName", "level", "effectiveDate", "expiryDate", "status", "createdAt", "updatedAt") VALUES (7, 'DH01002', 'W1总装L2产线', 5, 'TEAM', NULL, NULL, 3, 1779445119482, NULL, 'ACTIVE', 1779416333763, 1779416333763);
INSERT INTO "Organization" ("id", "code", "name", "parentId", "type", "leaderId", "leaderName", "level", "effectiveDate", "expiryDate", "status", "createdAt", "updatedAt") VALUES (8, 'DH02', 'W2总装车间', 4, 'DEPARTMENT', NULL, NULL, 2, 1779462675813, NULL, 'ACTIVE', 1779433895897, 1779433895897);
INSERT INTO "Organization" ("id", "code", "name", "parentId", "type", "leaderId", "leaderName", "level", "effectiveDate", "expiryDate", "status", "createdAt", "updatedAt") VALUES (9, 'DH02001', 'W2总装车间L1产线', 8, 'TEAM', NULL, NULL, 3, 1779462707728, NULL, 'ACTIVE', 1779433930580, 1779433930580);
INSERT INTO "Organization" ("id", "code", "name", "parentId", "type", "leaderId", "leaderName", "level", "effectiveDate", "expiryDate", "status", "createdAt", "updatedAt") VALUES (10, 'DH02002', 'W2总装车间L2产线', 8, 'TEAM', NULL, NULL, 3, 1779462735391, NULL, 'ACTIVE', 1779433953833, 1779433953833);
INSERT INTO "Organization" ("id", "code", "name", "parentId", "type", "leaderId", "leaderName", "level", "effectiveDate", "expiryDate", "status", "createdAt", "updatedAt") VALUES (11, 'SZ', '苏州工厂', 1, 'COMPANY', NULL, NULL, 2, 1777593600000, NULL, 'ACTIVE', 1780030295703, 1780030295703);
INSERT INTO "Organization" ("id", "code", "name", "parentId", "type", "leaderId", "leaderName", "level", "effectiveDate", "expiryDate", "status", "createdAt", "updatedAt") VALUES (12, 'SU01', '生产1车间', 11, 'DEPARTMENT', NULL, NULL, 3, 1777593600000, NULL, 'ACTIVE', 1780030327638, 1780030327638);
INSERT INTO "Organization" ("id", "code", "name", "parentId", "type", "leaderId", "leaderName", "level", "effectiveDate", "expiryDate", "status", "createdAt", "updatedAt") VALUES (13, 'SU02', '苏州2车间', 11, 'DEPARTMENT', NULL, NULL, 3, 1780059133182, NULL, 'ACTIVE', 1780030357564, 1780030357564);
INSERT INTO "Organization" ("id", "code", "name", "parentId", "type", "leaderId", "leaderName", "level", "effectiveDate", "expiryDate", "status", "createdAt", "updatedAt") VALUES (14, 'SZ0101', '焊接班组', 12, 'TEAM', NULL, NULL, 4, 1780059182353, NULL, 'ACTIVE', 1780030495591, 1780030495591);

-- 数据导入: ParticipantConfig
INSERT INTO "ParticipantConfig" ("id", "code", "name", "type", "participants", "description", "sortOrder", "config", "status", "createdAt", "updatedAt") VALUES (1, 'A001', '张三(202605005)', 'FIXED_USER', '[{"type":"FIXED_USER","userIds":[7],"userNames":["张三"],"employeeNos":["202605005"]}]', NULL, 0, '{}', 'ACTIVE', 1779768453606, 1779768453606);
INSERT INTO "ParticipantConfig" ("id", "code", "name", "type", "participants", "description", "sortOrder", "config", "status", "createdAt", "updatedAt") VALUES (2, 'A002', '提交人所在组织主管', 'ORG_MANAGER', '[{"type":"ORG_MANAGER","subjectType":"SUBMITTER","orgLevel":0,"orgLevelName":"提交人 的 所在组织"}]', NULL, 0, '{}', 'ACTIVE', 1779768476759, 1779768476759);

-- 数据导入: PersonalProductionRecord
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (1, 1778457600000, '202605002', 'Paul ', 58, '杭州工厂/W1总装车间/W1总装L1产线/大桶/焊接', NULL, '杭州工厂/W1总装车间/W1总装L1产线/大桶/焊接', 8, '生产长白班', 15, 'A01', '大桶', 1000.0, 0.0, 0.0, 'MANUAL', 1, '系统管理员', 1779865504927, NULL, 1779865504927, 1779897271039, 1779897271038);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (2, 1779840000000, '202605001', 'Aaron.he', 60, '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, '', 15, 'A01', '大桶', 300.0, 0.0, 0.0, 'MANUAL', 1, '系统管理员', 1779889518604, NULL, 1779889518604, 1779889962082, 1779889962081);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (3, 1779840000000, '202605001', 'Aaron.he', 60, '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, NULL, 15, 'A01', '大桶', 300.0, 0.01, 3.0, 'MANUAL', 1, '系统管理员', 1779889967333, NULL, 1779889967333, 1779890194259, 1779890194259);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (4, 1779840000000, '202605001', 'Aaron.he', 60, '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, NULL, 15, 'A01', '大桶', 300.0, 0.01, 3.0, 'MANUAL', 1, '系统管理员', 1779890195318, NULL, 1779890195318, 1779890405726, 1779890405725);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (5, 1779840000000, '202605001', 'Aaron.he', 60, '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, NULL, 15, 'A01', '大桶', 300.0, 0.01, 3.0, 'MANUAL', 1, '系统管理员', 1779890406802, NULL, 1779890406802, 1779890805125, 1779890805124);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (6, 1779840000000, '202605001', 'Aaron.he', 60, '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, NULL, 15, 'A01', '大桶', 300.0, 0.01, 3.0, 'MANUAL', 1, '系统管理员', 1779890806197, NULL, 1779890806197, 1779891052871, 1779891052870);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (7, 1779840000000, '202605001', 'Aaron.he', 60, '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, NULL, 15, 'A01', '大桶', 300.0, 0.01, 3.0, 'MANUAL', 1, '系统管理员', 1779891053912, NULL, 1779891053912, 1779897259098, 1779897259097);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (8, 1778716800000, '202605002', 'Paul ', 67, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '', 15, 'A01', '大桶', 300.0, 0.015, 4.5, 'MANUAL', 1, '系统管理员', 1779895937889, NULL, 1779895937889, 1779897267806, 1779897267805);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (9, 1778889600000, '202605002', 'Paul ', 67, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '', 15, 'A01', '大桶', 300.0, 0.015, 4.5, 'MANUAL', 1, '系统管理员', 1779895978991, NULL, 1779895978991, 1779897263887, 1779897263886);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (10, 1778025600000, '202605002', 'Paul ', 67, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '', 15, 'A01', '大桶', 400.0, 0.015, 6.0, 'MANUAL', 1, '系统管理员', 1779896563886, NULL, 1779896563886, 1779897274246, 1779897274245);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (11, 1777939200000, '202605002', 'Paul ', 64, '杭州工厂/W1总装车间/W1总装L1产线//', NULL, '杭州工厂/W1总装车间/W1总装L1产线//', NULL, '', 15, 'A01', '大桶', 300.0, 0.015, 4.5, 'MANUAL', 1, '系统管理员', 1779897299477, NULL, 1779897299477, 1779936389925, 1779936389925);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (12, 1778112000000, '202605002', 'Paul ', 67, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '', 15, 'A01', '大桶', 300.0, 0.015, 4.5, 'MANUAL', 1, '系统管理员', 1779897328893, NULL, 1779897328893, 1779936384621, 1779936384620);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (13, 1777939200000, '202605001', 'Aaron.he', 67, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '', 15, 'A01', '大桶', 400.0, 0.01, 4.0, 'MANUAL', 1, '系统管理员', 1779897870013, NULL, 1779897870013, 1779936387098, 1779936387098);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (14, 1778112000000, '202605001', 'Aaron.he', 67, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '', 15, 'A01', '大桶', 200.0, 0.01, 2.0, 'MANUAL', 1, '系统管理员', 1779898378249, NULL, 1779898378249, 1779936381960, 1779936381959);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (15, 1779926400000, '202605001', 'Aaron.he', 72, '杭州工厂/W1总装车间/W1总装L2产线//喷漆', NULL, '杭州工厂/W1总装车间/W1总装L2产线//喷漆', NULL, '', 15, 'A01', '大桶', 1000.0, 0.015, 15.0, 'MANUAL', 1, '系统管理员', 1779901623518, NULL, 1779901623518, 1779936367155, 1779936367154);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (16, 1779667200000, '202605001', 'Aaron.he', 72, '杭州工厂/W1总装车间/W1总装L2产线//喷漆', NULL, '杭州工厂/W1总装车间/W1总装L2产线//喷漆', NULL, '', 15, 'A01', '大桶', 200.0, 0.0, 0.0, 'MANUAL', 1, '系统管理员', 1779931001082, NULL, 1779931001082, 1779936370663, 1779936370662);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (17, 1779926400000, '202605002', 'Paul ', 67, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '', 15, 'A01', '大桶', 100.0, 0.0, 0.0, 'MANUAL', 1, '系统管理员', 1779931189801, NULL, 1779931189801, 1779936363921, 1779936363920);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (18, 1779321600000, '202605002', 'Paul ', 73, '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, '', 15, 'A01', '大桶', 200.0, 0.0, 0.0, 'MANUAL', 1, '系统管理员', 1779931291986, NULL, 1779931291986, 1779936373596, 1779936373595);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (19, 1778889600000, '202605002', 'Paul ', 74, '杭州工厂/W1总装车间///焊接', NULL, '杭州工厂/W1总装车间///焊接', NULL, '', 15, 'A01', '大桶', 300.0, 0.015, 4.5, 'MANUAL', 1, '系统管理员', 1779933328084, NULL, 1779933328084, 1779936378937, 1779936378936);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (20, 1778976000000, '202605002', 'Paul ', 75, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '', 15, 'A01', '大桶', 400.0, 0.015, 6.0, 'MANUAL', 1, '系统管理员', 1779933387570, NULL, 1779933387570, 1779936376319, 1779936376318);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (21, 1779926400000, '202605001', 'Aaron.he', 76, '杭州工厂/W1总装车间/W1总装L1产线//喷漆', NULL, '杭州工厂/W1总装车间/W1总装L1产线//喷漆', NULL, '', 16, 'A02', '小桶', 200.0, 0.0, 0.0, 'MANUAL', 1, '系统管理员', 1779936416545, NULL, 1779936416545, 1779936416545, NULL);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (22, 1779840000000, '202605001', 'Aaron.he', 77, '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, '', 16, 'A02', '小桶', 300.0, 0.01, 3.0, 'MANUAL', 1, '系统管理员', 1779936476663, NULL, 1779936476663, 1779936542208, NULL);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (23, 1779753600000, '202605001', 'Aaron.he', 78, '杭州工厂/W1总装车间///焊接', NULL, '杭州工厂/W1总装车间///焊接', NULL, '', 16, 'A02', '小桶', 200.0, 0.0, 0.0, 'MANUAL', 1, '系统管理员', 1779936509666, NULL, 1779936509666, 1779936509666, NULL);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (24, 1779580800000, '202605001', 'Aaron.he', 79, '杭州工厂/W1总装车间///焊接', NULL, '杭州工厂/W1总装车间///焊接', NULL, '', 16, 'A02', '小桶', 400.0, 0.0, 0.0, 'MANUAL', 1, '系统管理员', 1779936611554, NULL, 1779936611554, 1779936611554, NULL);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (25, 1779926400000, '202605002', 'Paul ', 78, '杭州工厂/W1总装车间///焊接', NULL, '杭州工厂/W1总装车间///焊接', NULL, '', 16, 'A02', '小桶', 100.0, 0.02, 2.0, 'MANUAL', 1, '系统管理员', 1779938114365, NULL, 1779938114365, 1779938114365, NULL);
INSERT INTO "PersonalProductionRecord" ("id", "recordDate", "employeeNo", "employeeName", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "actualQty", "standardHours", "earnedHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (26, 1779840000000, '202605002', 'Paul ', 80, '杭州工厂/W1总装车间/W1总装L1产线//喷漆', NULL, '杭州工厂/W1总装车间/W1总装L1产线//喷漆', NULL, '', 16, 'A02', '小桶', 300.0, 0.02, 6.0, 'MANUAL', 1, '系统管理员', 1779938191736, NULL, 1779938191736, 1779938191736, NULL);

-- 数据导入: ProductStandardHourByLevel
INSERT INTO "ProductStandardHourByLevel" ("id", "productId", "productName", "accountLevel", "accountPath", "standardHours", "quantity", "effectiveDate", "expiryDate", "status", "description", "createdById", "createdByName", "createdAt", "deletedAt") VALUES (1, 15, '大桶', '工序', '焊接', 1.0, 100.0, 1777564800000, 1778688000000, 'ACTIVE', NULL, 1, '系统管理员', 1779889443371, 1779936222458);
INSERT INTO "ProductStandardHourByLevel" ("id", "productId", "productName", "accountLevel", "accountPath", "standardHours", "quantity", "effectiveDate", "expiryDate", "status", "description", "createdById", "createdByName", "createdAt", "deletedAt") VALUES (2, 15, '大桶', '工序', '焊接', 1.5, 100.0, 1778774400000, NULL, 'ACTIVE', NULL, 1, '系统管理员', 1779895228834, 1779936215763);
INSERT INTO "ProductStandardHourByLevel" ("id", "productId", "productName", "accountLevel", "accountPath", "standardHours", "quantity", "effectiveDate", "expiryDate", "status", "description", "createdById", "createdByName", "createdAt", "deletedAt") VALUES (3, 15, '大桶', '产线', 'W1总装L1产线/焊接', 1.0, 100.0, 1777564800000, NULL, 'ACTIVE', NULL, 1, '系统管理员', 1779931128621, 1779936224586);
INSERT INTO "ProductStandardHourByLevel" ("id", "productId", "productName", "accountLevel", "accountPath", "standardHours", "quantity", "effectiveDate", "expiryDate", "status", "description", "createdById", "createdByName", "createdAt", "deletedAt") VALUES (4, 16, '小桶', '产线', 'W1总装L1产线/焊接', 1.0, 100.0, 1777564800000, NULL, 'ACTIVE', NULL, 1, '系统管理员', 1779936198070, NULL);
INSERT INTO "ProductStandardHourByLevel" ("id", "productId", "productName", "accountLevel", "accountPath", "standardHours", "quantity", "effectiveDate", "expiryDate", "status", "description", "createdById", "createdByName", "createdAt", "deletedAt") VALUES (5, 16, '小桶', '', '-', 2.0, 400.0, 1777564800000, 1778860800000, 'ACTIVE', NULL, 1, '系统管理员', 1779937180644, NULL);
INSERT INTO "ProductStandardHourByLevel" ("id", "productId", "productName", "accountLevel", "accountPath", "standardHours", "quantity", "effectiveDate", "expiryDate", "status", "description", "createdById", "createdByName", "createdAt", "deletedAt") VALUES (6, 16, '小桶', '', '-', 2.0, 100.0, 1778947200000, NULL, 'ACTIVE', NULL, 1, '系统管理员', 1779937529968, NULL);
INSERT INTO "ProductStandardHourByLevel" ("id", "productId", "productName", "accountLevel", "accountPath", "standardHours", "quantity", "effectiveDate", "expiryDate", "status", "description", "createdById", "createdByName", "createdAt", "deletedAt") VALUES (7, 15, '大桶', '工序', '喷漆', 1.0, 100.0, 1777564800000, NULL, 'ACTIVE', NULL, 1, '系统管理员', 1779948437000, NULL);

-- 数据导入: ProductionRecord
INSERT INTO "ProductionRecord" ("id", "recordDate", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "plannedQty", "actualQty", "qualifiedQty", "unqualifiedQty", "standardHours", "totalStdHours", "workHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (6, 1778371200000, 53, '杭州工厂/W1总装车间/W1总装L1产线//', 4, '杭州工厂/W1总装车间/W1总装L1产线//', 8, '生产长白班', 15, 'A01', '大桶', 1000.0, 1000.0, 1000.0, 0.0, 0.0, 0.0, 0.0, 'MANUAL', 1, '系统管理员', 1779816077786, NULL, 1779816077786, 1779816077786, NULL);
INSERT INTO "ProductionRecord" ("id", "recordDate", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "plannedQty", "actualQty", "qualifiedQty", "unqualifiedQty", "standardHours", "totalStdHours", "workHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (7, 1778371200000, 54, '杭州工厂/W1总装车间/W1总装L2产线//', NULL, '杭州工厂/W1总装车间/W1总装L2产线//', 8, '生产长白班', 15, 'A01', '大桶', 800.0, 800.0, 800.0, 0.0, 0.0, 0.0, 0.0, 'MANUAL', 1, '系统管理员', 1779816098304, NULL, 1779816098304, 1779816098304, NULL);
INSERT INTO "ProductionRecord" ("id", "recordDate", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "plannedQty", "actualQty", "qualifiedQty", "unqualifiedQty", "standardHours", "totalStdHours", "workHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (8, 1778457600000, 52, '杭州工厂/W1总装车间/W1总装L2产线//', NULL, '杭州工厂/W1总装车间/W1总装L2产线//', 8, '生产长白班', 15, 'A01', '大桶', 1000.0, 1000.0, 1000.0, 0.0, 0.0, 0.0, 0.0, 'MANUAL', 1, '系统管理员', 1779865478537, NULL, 1779865478537, 1779865478537, NULL);
INSERT INTO "ProductionRecord" ("id", "recordDate", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "plannedQty", "actualQty", "qualifiedQty", "unqualifiedQty", "standardHours", "totalStdHours", "workHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (9, 1779840000000, 63, '杭州工厂/W1总装车间/W1总装L2产线//', NULL, '杭州工厂/W1总装车间/W1总装L2产线//', 8, '生产长白班', 15, 'A01', '大桶', 1000.0, 1000.0, 1000.0, 0.0, 0.0, 0.0, 0.0, 'MANUAL', 1, '系统管理员', 1779891311574, NULL, 1779891311574, 1779897247213, 1779897247212);
INSERT INTO "ProductionRecord" ("id", "recordDate", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "plannedQty", "actualQty", "qualifiedQty", "unqualifiedQty", "standardHours", "totalStdHours", "workHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (10, 1779840000000, 62, '杭州工厂/W1总装车间/W1总装L1产线//', NULL, '杭州工厂/W1总装车间/W1总装L1产线//', 8, '生产长白班', 15, 'A01', '大桶', 1500.0, 1500.0, 1500.0, 0.0, 0.0, 0.0, 0.0, 'MANUAL', 1, '系统管理员', 1779891330328, NULL, 1779891330328, 1779956675910, 1779956675909);
INSERT INTO "ProductionRecord" ("id", "recordDate", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "plannedQty", "actualQty", "qualifiedQty", "unqualifiedQty", "standardHours", "totalStdHours", "workHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (11, 1779235200000, 67, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '', 15, 'A01', '大桶', 100.0, 100.0, 100.0, 0.0, 0.0, 0.0, 0.0, 'MANUAL', 1, '系统管理员', 1779931163575, NULL, 1779931163575, 1779931174116, 1779931174115);
INSERT INTO "ProductionRecord" ("id", "recordDate", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "plannedQty", "actualQty", "qualifiedQty", "unqualifiedQty", "standardHours", "totalStdHours", "workHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (12, 1779926400000, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 8, '生产长白班', 16, 'A02', '小桶', 1000.0, 1000.0, 1000.0, 0.0, 0.0, 0.0, 0.0, 'MANUAL', 1, '系统管理员', 1779946204449, NULL, 1779946204449, 1779955072749, 1779955072748);
INSERT INTO "ProductionRecord" ("id", "recordDate", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "plannedQty", "actualQty", "qualifiedQty", "unqualifiedQty", "standardHours", "totalStdHours", "workHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (13, 1779926400000, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 8, '生产长白班', 16, 'A02', '小桶', 3000.0, 3000.0, 3000.0, 0.0, 0.0, 0.0, 0.0, 'MANUAL', 1, '系统管理员', 1779955100636, NULL, 1779955100636, 1779956667040, 1779956667039);
INSERT INTO "ProductionRecord" ("id", "recordDate", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "plannedQty", "actualQty", "qualifiedQty", "unqualifiedQty", "standardHours", "totalStdHours", "workHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (14, 1779840000000, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 8, '生产长白班', 16, 'A02', '小桶', 2000.0, 2000.0, 2000.0, 0.0, 0.0, 0.0, 0.0, 'MANUAL', 1, '系统管理员', 1779957218424, NULL, 1779957218424, 1779959553689, 1779959553688);
INSERT INTO "ProductionRecord" ("id", "recordDate", "orgId", "orgName", "lineId", "lineName", "shiftId", "shiftName", "productId", "productCode", "productName", "plannedQty", "actualQty", "qualifiedQty", "unqualifiedQty", "standardHours", "totalStdHours", "workHours", "source", "recorderId", "recorderName", "recordedAt", "description", "createdAt", "updatedAt", "deletedAt") VALUES (15, 1779926400000, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, '', 16, 'A02', '小桶', 2000.0, 2000.0, 2000.0, 0.0, 0.0, 0.0, 0.0, 'MANUAL', 1, '系统管理员', 1779959569413, NULL, 1779959569413, 1779959569413, NULL);

-- 数据导入: PunchDevice
INSERT INTO "PunchDevice" ("id", "code", "name", "type", "ipAddress", "groupId", "status", "createdAt", "updatedAt") VALUES (1, 'DEV001', '前台考勤机', 'FACE', NULL, NULL, 'DISABLED', 1779361914266, 1779443795114);
INSERT INTO "PunchDevice" ("id", "code", "name", "type", "ipAddress", "groupId", "status", "createdAt", "updatedAt") VALUES (2, 'TEST001', '测试设备', 'FINGERPRINT', NULL, NULL, 'DISABLED', 1779441745419, 1779442472581);
INSERT INTO "PunchDevice" ("id", "code", "name", "type", "ipAddress", "groupId", "status", "createdAt", "updatedAt") VALUES (3, 'A0001', 'W1总装车间设备', 'FINGERPRINT', NULL, 1, 'DISABLED', 1779442476835, 1779766110603);
INSERT INTO "PunchDevice" ("id", "code", "name", "type", "ipAddress", "groupId", "status", "createdAt", "updatedAt") VALUES (4, 'A0002', 'W2总装车间设备', 'FINGERPRINT', NULL, 1, 'DISABLED', 1779442498305, 1779766110602);
INSERT INTO "PunchDevice" ("id", "code", "name", "type", "ipAddress", "groupId", "status", "createdAt", "updatedAt") VALUES (5, 'DEL_TEST', '待删除测试设备', 'FINGERPRINT', NULL, NULL, 'DISABLED', 1779442666245, 1779442671583);
INSERT INTO "PunchDevice" ("id", "code", "name", "type", "ipAddress", "groupId", "status", "createdAt", "updatedAt") VALUES (6, 'A01', 'W1总装L1线体设备', 'FINGERPRINT', NULL, 2, 'DISABLED', 1779443816970, 1779766110600);
INSERT INTO "PunchDevice" ("id", "code", "name", "type", "ipAddress", "groupId", "status", "createdAt", "updatedAt") VALUES (7, 'A02', 'W1总装L1线体设备', 'FINGERPRINT', NULL, 2, 'DISABLED', 1779443824491, 1779766110599);
INSERT INTO "PunchDevice" ("id", "code", "name", "type", "ipAddress", "groupId", "status", "createdAt", "updatedAt") VALUES (8, 'AC1', 'W1总装L1线体焊接设备', 'FINGERPRINT', NULL, 3, 'DISABLED', 1779443867751, 1779766110600);
INSERT INTO "PunchDevice" ("id", "code", "name", "type", "ipAddress", "groupId", "status", "createdAt", "updatedAt") VALUES (9, 'AC2', 'W1总装L1线体喷漆设备', 'FINGERPRINT', NULL, 3, 'DISABLED', 1779443879422, 1779766105144);
INSERT INTO "PunchDevice" ("id", "code", "name", "type", "ipAddress", "groupId", "status", "createdAt", "updatedAt") VALUES (10, 'A001', 'W1总装L1线体设备', 'FINGERPRINT', NULL, NULL, 'DISABLED', 1779765556776, 1779766039100);
INSERT INTO "PunchDevice" ("id", "code", "name", "type", "ipAddress", "groupId", "status", "createdAt", "updatedAt") VALUES (11, 'A00001', 'W1总装L1线体设备', 'FINGERPRINT', NULL, 5, 'NORMAL', 1779766134742, 1779766233269);
INSERT INTO "PunchDevice" ("id", "code", "name", "type", "ipAddress", "groupId", "status", "createdAt", "updatedAt") VALUES (12, 'A00002', 'W1总装L2产线设备', 'FINGERPRINT', NULL, 5, 'NORMAL', 1779766153503, 1779766233269);
INSERT INTO "PunchDevice" ("id", "code", "name", "type", "ipAddress", "groupId", "status", "createdAt", "updatedAt") VALUES (13, 'W1L1A1', 'W1车间L1线体焊接设备', 'FINGERPRINT', NULL, 6, 'NORMAL', 1779766284547, 1779766387372);
INSERT INTO "PunchDevice" ("id", "code", "name", "type", "ipAddress", "groupId", "status", "createdAt", "updatedAt") VALUES (14, 'W1L1A2', 'W1车间L1线体喷漆设备', 'FINGERPRINT', NULL, 6, 'NORMAL', 1779766301739, 1779766387372);
INSERT INTO "PunchDevice" ("id", "code", "name", "type", "ipAddress", "groupId", "status", "createdAt", "updatedAt") VALUES (15, 'C0001', 'W1车间设备', 'FINGERPRINT', NULL, NULL, 'NORMAL', 1779803892123, 1779803911915);
INSERT INTO "PunchDevice" ("id", "code", "name", "type", "ipAddress", "groupId", "status", "createdAt", "updatedAt") VALUES (16, 'C0002', 'W2车间设备', 'FINGERPRINT', NULL, NULL, 'NORMAL', 1779803906166, 1779803906166);

-- 数据导入: PunchPair
INSERT INTO "PunchPair" ("id", "employeeNo", "pairDate", "shiftId", "shiftName", "inPunchId", "outPunchId", "inPunchTime", "outPunchTime", "workHours", "sourceGroupId", "accountId", "accountName", "accountPath", "workStartPunchTime", "workEndPunchTime", "workStartPunches", "workEndPunches", "workStartPunchId", "workEndPunchId", "workStartShiftId", "workStartShiftName", "workEndShiftId", "workEndShiftName", "status", "createdAt", "updatedAt") VALUES (186, '202605002', 1778284800000, 8, '生产长白班', 23, 25, 1778284800000, 1778292000000, 2.0, 5, 8, '大华工厂/W1总装车间/W1总装L1产线//', 'DH/DH01/DH0101//', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 1779869407571, 1779869407571);
INSERT INTO "PunchPair" ("id", "employeeNo", "pairDate", "shiftId", "shiftName", "inPunchId", "outPunchId", "inPunchTime", "outPunchTime", "workHours", "sourceGroupId", "accountId", "accountName", "accountPath", "workStartPunchTime", "workEndPunchTime", "workStartPunches", "workEndPunches", "workStartPunchId", "workEndPunchId", "workStartShiftId", "workStartShiftName", "workEndShiftId", "workEndShiftName", "status", "createdAt", "updatedAt") VALUES (187, '202605002', 1778284800000, 8, '生产长白班', 28, 29, 1778306400000, 1778313600000, 2.0, 5, 8, '大华工厂/W1总装车间/W1总装L1产线//', 'DH/DH01/DH0101//', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 1779869407578, 1779869407578);
INSERT INTO "PunchPair" ("id", "employeeNo", "pairDate", "shiftId", "shiftName", "inPunchId", "outPunchId", "inPunchTime", "outPunchTime", "workHours", "sourceGroupId", "accountId", "accountName", "accountPath", "workStartPunchTime", "workEndPunchTime", "workStartPunches", "workEndPunches", "workStartPunchId", "workEndPunchId", "workStartShiftId", "workStartShiftName", "workEndShiftId", "workEndShiftName", "status", "createdAt", "updatedAt") VALUES (188, '202605002', 1778284800000, 8, '生产长白班', 26, 27, 1778295600000, 1778299200000, 1.0, 5, 7, '大华工厂/W1总装车间/W1总装L2产线//', 'DH/DH01/DH01002//', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 1779869407590, 1779869407590);
INSERT INTO "PunchPair" ("id", "employeeNo", "pairDate", "shiftId", "shiftName", "inPunchId", "outPunchId", "inPunchTime", "outPunchTime", "workHours", "sourceGroupId", "accountId", "accountName", "accountPath", "workStartPunchTime", "workEndPunchTime", "workStartPunches", "workEndPunches", "workStartPunchId", "workEndPunchId", "workStartShiftId", "workStartShiftName", "workEndShiftId", "workEndShiftName", "status", "createdAt", "updatedAt") VALUES (189, '202605002', 1778284800000, 8, '生产长白班', 30, 31, 1778317200000, 1778324400000, 2.0, 5, 27, '大华工厂/W1总装车间/W1总装L2产线//喷漆', 'DH/DH01/DH01002//A02', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 1779869407594, 1779869407594);
INSERT INTO "PunchPair" ("id", "employeeNo", "pairDate", "shiftId", "shiftName", "inPunchId", "outPunchId", "inPunchTime", "outPunchTime", "workHours", "sourceGroupId", "accountId", "accountName", "accountPath", "workStartPunchTime", "workEndPunchTime", "workStartPunches", "workEndPunches", "workStartPunchId", "workEndPunchId", "workStartShiftId", "workStartShiftName", "workEndShiftId", "workEndShiftName", "status", "createdAt", "updatedAt") VALUES (190, '202605002', 1778371200000, 8, '生产长白班', 15, 16, 1778367600000, 1778385600000, 5.0, 5, 8, '大华工厂/W1总装车间/W1总装L1产线//', 'DH/DH01/DH0101//', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 1779869407699, 1779869407699);
INSERT INTO "PunchPair" ("id", "employeeNo", "pairDate", "shiftId", "shiftName", "inPunchId", "outPunchId", "inPunchTime", "outPunchTime", "workHours", "sourceGroupId", "accountId", "accountName", "accountPath", "workStartPunchTime", "workEndPunchTime", "workStartPunches", "workEndPunches", "workStartPunchId", "workEndPunchId", "workStartShiftId", "workStartShiftName", "workEndShiftId", "workEndShiftName", "status", "createdAt", "updatedAt") VALUES (191, '202605002', 1778371200000, 8, '生产长白班', 21, 22, 1778389200000, 1778410800000, 6.0, 5, 7, '大华工厂/W1总装车间/W1总装L2产线//', 'DH/DH01/DH01002//', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 1779869407715, 1779869407715);
INSERT INTO "PunchPair" ("id", "employeeNo", "pairDate", "shiftId", "shiftName", "inPunchId", "outPunchId", "inPunchTime", "outPunchTime", "workHours", "sourceGroupId", "accountId", "accountName", "accountPath", "workStartPunchTime", "workEndPunchTime", "workStartPunches", "workEndPunches", "workStartPunchId", "workEndPunchId", "workStartShiftId", "workStartShiftName", "workEndShiftId", "workEndShiftName", "status", "createdAt", "updatedAt") VALUES (192, '202605004', 1778371200000, 8, '生产长白班', 17, 18, 1778371200000, 1778407200000, 10.0, NULL, 31, '杭州工厂/W1总装车间///', 'DH/DH01///', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 1779869407755, 1779869407755);
INSERT INTO "PunchPair" ("id", "employeeNo", "pairDate", "shiftId", "shiftName", "inPunchId", "outPunchId", "inPunchTime", "outPunchTime", "workHours", "sourceGroupId", "accountId", "accountName", "accountPath", "workStartPunchTime", "workEndPunchTime", "workStartPunches", "workEndPunches", "workStartPunchId", "workEndPunchId", "workStartShiftId", "workStartShiftName", "workEndShiftId", "workEndShiftName", "status", "createdAt", "updatedAt") VALUES (193, '202605003', 1778371200000, 8, '生产长白班', 19, 20, 1778371200000, 1778403600000, 9.0, NULL, 31, '杭州工厂/W1总装车间///', 'DH/DH01///', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 1779869407782, 1779869407782);
INSERT INTO "PunchPair" ("id", "employeeNo", "pairDate", "shiftId", "shiftName", "inPunchId", "outPunchId", "inPunchTime", "outPunchTime", "workHours", "sourceGroupId", "accountId", "accountName", "accountPath", "workStartPunchTime", "workEndPunchTime", "workStartPunches", "workEndPunches", "workStartPunchId", "workEndPunchId", "workStartShiftId", "workStartShiftName", "workEndShiftId", "workEndShiftName", "status", "createdAt", "updatedAt") VALUES (194, '202605004', 1779840000000, 8, '生产长白班', 34, 36, 1779840000000, 1779876000000, 10.0, NULL, 31, '杭州工厂/W1总装车间///', 'DH/DH01///', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 1779869408629, 1779869408629);
INSERT INTO "PunchPair" ("id", "employeeNo", "pairDate", "shiftId", "shiftName", "inPunchId", "outPunchId", "inPunchTime", "outPunchTime", "workHours", "sourceGroupId", "accountId", "accountName", "accountPath", "workStartPunchTime", "workEndPunchTime", "workStartPunches", "workEndPunches", "workStartPunchId", "workEndPunchId", "workStartShiftId", "workStartShiftName", "workEndShiftId", "workEndShiftName", "status", "createdAt", "updatedAt") VALUES (199, '202605002', 1779840000000, 8, '生产长白班', 37, 38, 1779836400000, 1779854400000, 5.0, 5, 42, '杭州工厂/W1总装车间/W1总装L1产线//', 'DH/DH01/DH0101//', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 1779871155952, 1779871155952);
INSERT INTO "PunchPair" ("id", "employeeNo", "pairDate", "shiftId", "shiftName", "inPunchId", "outPunchId", "inPunchTime", "outPunchTime", "workHours", "sourceGroupId", "accountId", "accountName", "accountPath", "workStartPunchTime", "workEndPunchTime", "workStartPunches", "workEndPunches", "workStartPunchId", "workEndPunchId", "workStartShiftId", "workStartShiftName", "workEndShiftId", "workEndShiftName", "status", "createdAt", "updatedAt") VALUES (200, '202605002', 1779840000000, 8, '生产长白班', 39, 40, 1779861600000, 1779883200000, 6.0, 5, 43, '杭州工厂/W1总装车间/W1总装L2产线//', 'DH/DH01/DH01002//', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 1779871155958, 1779871155958);
INSERT INTO "PunchPair" ("id", "employeeNo", "pairDate", "shiftId", "shiftName", "inPunchId", "outPunchId", "inPunchTime", "outPunchTime", "workHours", "sourceGroupId", "accountId", "accountName", "accountPath", "workStartPunchTime", "workEndPunchTime", "workStartPunches", "workEndPunches", "workStartPunchId", "workEndPunchId", "workStartShiftId", "workStartShiftName", "workEndShiftId", "workEndShiftName", "status", "createdAt", "updatedAt") VALUES (202, '202605003', 1779840000000, 8, '生产长白班', 41, 35, 1779843600000, 1779872400000, 8.0, NULL, 31, '杭州工厂/W1总装车间///', 'DH/DH01///', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 1779891109001, 1779891109001);
INSERT INTO "PunchPair" ("id", "employeeNo", "pairDate", "shiftId", "shiftName", "inPunchId", "outPunchId", "inPunchTime", "outPunchTime", "workHours", "sourceGroupId", "accountId", "accountName", "accountPath", "workStartPunchTime", "workEndPunchTime", "workStartPunches", "workEndPunches", "workStartPunchId", "workEndPunchId", "workStartShiftId", "workStartShiftName", "workEndShiftId", "workEndShiftName", "status", "createdAt", "updatedAt") VALUES (203, '202605003', 1779840000000, 8, '生产长白班', NULL, 42, NULL, 1779872400000, 0.0, NULL, 31, '杭州工厂/W1总装车间///', 'DH/DH01///', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 1779891109006, 1779891109006);

-- 数据导入: PunchRecord
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (15, '202605002', 1778367600000, 11, 'IN', NULL, 'MANUAL', 8, 1779810193363);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (16, '202605002', 1778385600000, 11, 'OUT', NULL, 'MANUAL', 8, 1779810219943);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (17, '202605004', 1778371200000, 15, 'IN', NULL, 'MANUAL', 31, 1779810360609);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (18, '202605004', 1778407200000, 15, 'OUT', NULL, 'MANUAL', 31, 1779810387142);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (19, '202605003', 1778371200000, 15, 'IN', NULL, 'MANUAL', 31, 1779813034093);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (20, '202605003', 1778403600000, 15, 'OUT', NULL, 'MANUAL', 31, 1779813053279);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (21, '202605002', 1778389200000, 12, 'IN', NULL, 'MANUAL', 7, 1779813149563);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (22, '202605002', 1778410800000, 12, 'OUT', NULL, 'MANUAL', 7, 1779813177778);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (23, '202605002', 1778284800000, 11, 'IN', NULL, 'MANUAL', 8, 1779813770453);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (25, '202605002', 1778292000000, 11, 'OUT', NULL, 'MANUAL', 8, 1779813831022);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (26, '202605002', 1778295600000, 12, 'IN', NULL, 'MANUAL', 7, 1779813872329);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (27, '202605002', 1778299200000, 12, 'OUT', NULL, 'MANUAL', 7, 1779813897862);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (28, '202605002', 1778306400000, 11, 'IN', NULL, 'MANUAL', 8, 1779814062732);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (29, '202605002', 1778313600000, 11, 'OUT', NULL, 'MANUAL', 8, 1779814102522);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (30, '202605002', 1778317200000, 12, 'IN', NULL, 'MANUAL', 27, 1779814920279);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (31, '202605002', 1778324400000, 12, 'OUT', NULL, 'MANUAL', 27, 1779821616769);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (34, '202605004', 1779840000000, 15, 'IN', NULL, 'MANUAL', 31, 1779867893451);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (35, '202605003', 1779872400000, 15, 'OUT', NULL, 'MANUAL', 31, 1779867917177);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (36, '202605004', 1779876000000, 15, 'OUT', NULL, 'MANUAL', 31, 1779867996198);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (37, '202605002', 1779836400000, 11, 'IN', NULL, 'MANUAL', 42, 1779868658538);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (38, '202605002', 1779854400000, 11, 'OUT', NULL, 'MANUAL', 42, 1779868677504);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (39, '202605002', 1779861600000, 12, 'IN', NULL, 'MANUAL', 43, 1779871134049);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (40, '202605002', 1779883200000, 12, 'OUT', NULL, 'MANUAL', 43, 1779871155908);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (41, '202605003', 1779843600000, 15, 'IN', NULL, 'MANUAL', 31, 1779891087895);
INSERT INTO "PunchRecord" ("id", "employeeNo", "punchTime", "deviceId", "punchType", "location", "source", "accountId", "createdAt") VALUES (42, '202605003', 1779872400000, 15, 'OUT', NULL, 'MANUAL', 31, 1779891108975);

-- 数据导入: PunchRule
INSERT INTO "PunchRule" ("id", "code", "name", "priority", "ruleType", "conditions", "beforeShiftMins", "afterShiftMins", "configs", "scheduledConfig", "unscheduledConfig", "status", "createdAt", "updatedAt") VALUES (1, 'PR_001', 'A001', 1, 'ATTENDANCE_PAIRING', '{}', 120, 120, '[]', '{"punchInterval":0,"workStart":{"earlyRange":240,"lateRange":240,"countType":"FIRST","deviceGroupIds":[5]},"workEnd":{"earlyRange":240,"lateRange":240,"countType":"LAST","deviceGroupIds":[5]}}', '{"requirePunch":true,"punchInterval":0,"work":{"startAfterShiftMins":240,"endBeforeShiftMins":240,"deviceGroupIds":[5]},"off":{"endBeforeShiftMins":1200,"deviceGroupIds":[5]}}', 'ACTIVE', 1779766619915, 1779766619915);
INSERT INTO "PunchRule" ("id", "code", "name", "priority", "ruleType", "conditions", "beforeShiftMins", "afterShiftMins", "configs", "scheduledConfig", "unscheduledConfig", "status", "createdAt", "updatedAt") VALUES (2, 'PR_002', 'A001', 1, 'LEAN_PAIRING', '{}', 240, 240, '[]', NULL, NULL, 'ACTIVE', 1779766646696, 1779766646696);

-- 数据导入: Role
INSERT INTO "Role" ("id", "code", "name", "description", "functionalPermissions", "dataScopeType", "isDefault", "status", "createdAt", "updatedAt", "dataScopeRuleGroups", "managedOrgDataScope", "orgDataScope") VALUES (1, 'ADMIN', '系统管理员', '拥有系统所有权限', '["*"]', 'ALL', 0, 'ACTIVE', 1779361914024, 1779361914024, NULL, NULL, NULL);
INSERT INTO "Role" ("id", "code", "name", "description", "functionalPermissions", "dataScopeType", "isDefault", "status", "createdAt", "updatedAt", "dataScopeRuleGroups", "managedOrgDataScope", "orgDataScope") VALUES (2, 'HR_ADMIN', 'HR管理员', '人事管理相关权限', '["hr:org:view","hr:org:edit","hr:emp:view","hr:emp:edit","hr:emp:delete"]', 'ALL', 1, 'ACTIVE', 1779361914029, 1779361914029, NULL, NULL, NULL);

-- 数据导入: Schedule
INSERT INTO "Schedule" ("id", "employeeId", "shiftId", "scheduleDate", "adjustedStart", "adjustedEnd", "status", "cancelReason", "pushStatus", "createdAt", "updatedAt", "adjustedSegments") VALUES (1, 4, 8, 1778284800000, 1778281200000, 1778320800000, 'ACTIVE', NULL, 'PENDING', 1779439804996, 1779441005841, '[{"id":22,"startTime":"07:00","endTime":"12:00","startDate":"+0","endDate":"+0","accountId":3},{"id":23,"startTime":"13:00","endTime":"18:00","startDate":"+0","endDate":"+0","accountId":1}]');
INSERT INTO "Schedule" ("id", "employeeId", "shiftId", "scheduleDate", "adjustedStart", "adjustedEnd", "status", "cancelReason", "pushStatus", "createdAt", "updatedAt", "adjustedSegments") VALUES (2, 4, 8, 1778371200000, 1778371200000, 1778407200000, 'ACTIVE', NULL, 'PENDING', 1779768574869, 1779811423868, '[{"id":27,"startTime":"08:00","endTime":"12:00","startDate":"+0","endDate":"+0","accountId":null},{"id":28,"startTime":"13:00","endTime":"18:00","startDate":"+0","endDate":"+0","accountId":null}]');
INSERT INTO "Schedule" ("id", "employeeId", "shiftId", "scheduleDate", "adjustedStart", "adjustedEnd", "status", "cancelReason", "pushStatus", "createdAt", "updatedAt", "adjustedSegments") VALUES (3, 6, 8, 1778284800000, NULL, NULL, 'ACTIVE', NULL, 'PENDING', 1779807870975, 1779807880372, NULL);
INSERT INTO "Schedule" ("id", "employeeId", "shiftId", "scheduleDate", "adjustedStart", "adjustedEnd", "status", "cancelReason", "pushStatus", "createdAt", "updatedAt", "adjustedSegments") VALUES (4, 6, 8, 1778371200000, 1778371200000, 1778407200000, 'ACTIVE', NULL, 'PENDING', 1779807870979, 1779811423821, '[{"id":27,"startTime":"08:00","endTime":"12:00","startDate":"+0","endDate":"+0","accountId":null},{"id":28,"startTime":"13:00","endTime":"18:00","startDate":"+0","endDate":"+0","accountId":null}]');
INSERT INTO "Schedule" ("id", "employeeId", "shiftId", "scheduleDate", "adjustedStart", "adjustedEnd", "status", "cancelReason", "pushStatus", "createdAt", "updatedAt", "adjustedSegments") VALUES (5, 5, 8, 1778371200000, 1778371200000, 1778407200000, 'ACTIVE', NULL, 'PENDING', 1779807870981, 1779811423857, '[{"id":27,"startTime":"08:00","endTime":"12:00","startDate":"+0","endDate":"+0","accountId":null},{"id":28,"startTime":"13:00","endTime":"18:00","startDate":"+0","endDate":"+0","accountId":null}]');
INSERT INTO "Schedule" ("id", "employeeId", "shiftId", "scheduleDate", "adjustedStart", "adjustedEnd", "status", "cancelReason", "pushStatus", "createdAt", "updatedAt", "adjustedSegments") VALUES (6, 6, 8, 1779840000000, NULL, NULL, 'ACTIVE', NULL, 'PENDING', 1779867459312, 1779867459312, NULL);
INSERT INTO "Schedule" ("id", "employeeId", "shiftId", "scheduleDate", "adjustedStart", "adjustedEnd", "status", "cancelReason", "pushStatus", "createdAt", "updatedAt", "adjustedSegments") VALUES (7, 5, 8, 1779840000000, NULL, NULL, 'ACTIVE', NULL, 'PENDING', 1779867459316, 1779867459316, NULL);
INSERT INTO "Schedule" ("id", "employeeId", "shiftId", "scheduleDate", "adjustedStart", "adjustedEnd", "status", "cancelReason", "pushStatus", "createdAt", "updatedAt", "adjustedSegments") VALUES (8, 4, 8, 1779840000000, NULL, NULL, 'ACTIVE', NULL, 'PENDING', 1779867459320, 1779867459320, NULL);

-- 数据导入: SearchConditionConfig
INSERT INTO "SearchConditionConfig" ("id", "configCode", "configName", "pageCode", "pageName", "fieldCode", "fieldName", "fieldType", "isEnabled", "sortOrder", "dataSourceCode", "applicablePages", "createdAt", "updatedAt") VALUES (18, 'A0001', '通用查询条件', 'employee-list', '员工列表', 'employeeNo', '员工编号', 'text', 1, 0, NULL, '["employee-list","schedule-management","punch-records","punch-results","work-hour-details","work-hour-results"]', 1779439788645, 1779439788645);
INSERT INTO "SearchConditionConfig" ("id", "configCode", "configName", "pageCode", "pageName", "fieldCode", "fieldName", "fieldType", "isEnabled", "sortOrder", "dataSourceCode", "applicablePages", "createdAt", "updatedAt") VALUES (19, 'A0001', '通用查询条件', 'employee-list', '员工列表', 'orgId', '所属组织', 'select', 1, 2, NULL, '["employee-list","schedule-management","punch-records","punch-results","work-hour-details","work-hour-results"]', 1779439788645, 1779439788645);
INSERT INTO "SearchConditionConfig" ("id", "configCode", "configName", "pageCode", "pageName", "fieldCode", "fieldName", "fieldType", "isEnabled", "sortOrder", "dataSourceCode", "applicablePages", "createdAt", "updatedAt") VALUES (20, 'A0001', '通用查询条件', 'employee-list', '员工列表', 'name', '姓名', 'text', 1, 1, NULL, '["employee-list","schedule-management","punch-records","punch-results","work-hour-details","work-hour-results"]', 1779439788645, 1779439788645);
INSERT INTO "SearchConditionConfig" ("id", "configCode", "configName", "pageCode", "pageName", "fieldCode", "fieldName", "fieldType", "isEnabled", "sortOrder", "dataSourceCode", "applicablePages", "createdAt", "updatedAt") VALUES (21, 'A0001', '通用查询条件', 'employee-list', '员工列表', 'employeeType', '员工类型', 'select', 1, 3, 'EMPLOYEE_TYPE', '["employee-list","schedule-management","punch-records","punch-results","work-hour-details","work-hour-results"]', 1779439788645, 1779439788645);

-- 数据导入: Shift
INSERT INTO "Shift" ("id", "code", "name", "type", "standardHours", "breakHours", "color", "status", "createdAt", "updatedAt") VALUES (1, 'NORMAL', '正常班', 'NORMAL', 7.5, 1.5, '#1890ff', 'INACTIVE', 1779361914260, 1779434976721);
INSERT INTO "Shift" ("id", "code", "name", "type", "standardHours", "breakHours", "color", "status", "createdAt", "updatedAt") VALUES (2, 'A01', '白班', 'NORMAL', 10.0, 0.0, '#00B365', 'INACTIVE', 1779413509342, 1779435254308);
INSERT INTO "Shift" ("id", "code", "name", "type", "standardHours", "breakHours", "color", "status", "createdAt", "updatedAt") VALUES (3, 'SIMPLE_001', '简单班次', 'NORMAL', 9.0, 0.0, NULL, 'INACTIVE', 1779429363366, 1779435252042);
INSERT INTO "Shift" ("id", "code", "name", "type", "standardHours", "breakHours", "color", "status", "createdAt", "updatedAt") VALUES (4, 'A03', '更新后的班次名称', 'NORMAL', 10.0, 0.0, '#00B365', 'INACTIVE', 1779429682862, 1779431102779);
INSERT INTO "Shift" ("id", "code", "name", "type", "standardHours", "breakHours", "color", "status", "createdAt", "updatedAt") VALUES (5, 'TEST_TRANSFER_001', '测试转移账户班次', 'NORMAL', 10.0, 0.0, NULL, 'INACTIVE', 1779430387910, 1779435249458);
INSERT INTO "Shift" ("id", "code", "name", "type", "standardHours", "breakHours", "color", "status", "createdAt", "updatedAt") VALUES (6, 'A06', '生产白班', 'NORMAL', 10.0, 0.0, '#00B365', 'INACTIVE', 1779431230464, 1779435246922);
INSERT INTO "Shift" ("id", "code", "name", "type", "standardHours", "breakHours", "color", "status", "createdAt", "updatedAt") VALUES (7, 'A01-NEW', 'A01生产白班', 'NORMAL', 10.0, 0.0, NULL, 'INACTIVE', 1779431302405, 1779435244676);
INSERT INTO "Shift" ("id", "code", "name", "type", "standardHours", "breakHours", "color", "status", "createdAt", "updatedAt") VALUES (8, 'A07', '生产长白班', 'NORMAL', 9.0, 0.0, '#00B365', 'ACTIVE', 1779434583095, 1779811394800);
INSERT INTO "Shift" ("id", "code", "name", "type", "standardHours", "breakHours", "color", "status", "createdAt", "updatedAt") VALUES (9, 'TEST_A', '测试班次A', 'NORMAL', 8.0, 0.0, NULL, 'ACTIVE', 1779441298873, 1779441298873);

-- 数据导入: ShiftProperty
INSERT INTO "ShiftProperty" ("id", "shiftId", "propertyKey", "propertyValue", "description", "sortOrder", "createdAt", "updatedAt") VALUES (1, 2, 'A01', '是', NULL, 0, 1779413509396, 1779413509396);
INSERT INTO "ShiftProperty" ("id", "shiftId", "propertyKey", "propertyValue", "description", "sortOrder", "createdAt", "updatedAt") VALUES (3, 4, 'A01', '是', NULL, 0, 1779431086008, 1779431086008);
INSERT INTO "ShiftProperty" ("id", "shiftId", "propertyKey", "propertyValue", "description", "sortOrder", "createdAt", "updatedAt") VALUES (8, 8, 'A01', '是', NULL, 0, 1779811394852, 1779811394852);

-- 数据导入: ShiftPropertyDefinition
INSERT INTO "ShiftPropertyDefinition" ("id", "propertyKey", "name", "description", "valueType", "options", "status", "sortOrder", "createdAt", "updatedAt") VALUES (1, 'A01', '生产白班', NULL, 'TEXT', NULL, 'ACTIVE', 0, 1779412308304, 1779412308304);

-- 数据导入: ShiftSegment
INSERT INTO "ShiftSegment" ("id", "shiftId", "type", "startDate", "startTime", "endDate", "endTime", "duration", "accountId", "createdAt", "updatedAt") VALUES (1, 1, 'NORMAL', '+0', '08:00', '+0', '12:00', 4.0, NULL, 1779361914263, 1779361914263);
INSERT INTO "ShiftSegment" ("id", "shiftId", "type", "startDate", "startTime", "endDate", "endTime", "duration", "accountId", "createdAt", "updatedAt") VALUES (2, 1, 'REST', '+0', '12:00', '+0', '13:30', 1.5, NULL, 1779361914263, 1779361914263);
INSERT INTO "ShiftSegment" ("id", "shiftId", "type", "startDate", "startTime", "endDate", "endTime", "duration", "accountId", "createdAt", "updatedAt") VALUES (3, 1, 'NORMAL', '+0', '13:30', '+0', '17:30', 4.0, NULL, 1779361914263, 1779361914263);
INSERT INTO "ShiftSegment" ("id", "shiftId", "type", "startDate", "startTime", "endDate", "endTime", "duration", "accountId", "createdAt", "updatedAt") VALUES (4, 2, 'NORMAL', '+0', '08:00', '+0', '18:00', 10.0, NULL, 1779413509369, 1779413509369);
INSERT INTO "ShiftSegment" ("id", "shiftId", "type", "startDate", "startTime", "endDate", "endTime", "duration", "accountId", "createdAt", "updatedAt") VALUES (5, 3, 'NORMAL', '+0', '08:00', '+0', '17:00', 9.0, NULL, 1779429363383, 1779429363383);
INSERT INTO "ShiftSegment" ("id", "shiftId", "type", "startDate", "startTime", "endDate", "endTime", "duration", "accountId", "createdAt", "updatedAt") VALUES (8, 5, 'NORMAL', '+0', '08:00', '+0', '12:00', 4.0, NULL, 1779430387912, 1779430387912);
INSERT INTO "ShiftSegment" ("id", "shiftId", "type", "startDate", "startTime", "endDate", "endTime", "duration", "accountId", "createdAt", "updatedAt") VALUES (9, 5, 'TRANSFER', '+0', '12:00', '+0', '13:00', 1.0, NULL, 1779430387912, 1779430387912);
INSERT INTO "ShiftSegment" ("id", "shiftId", "type", "startDate", "startTime", "endDate", "endTime", "duration", "accountId", "createdAt", "updatedAt") VALUES (10, 5, 'NORMAL', '+0', '13:00', '+0', '18:00', 5.0, NULL, 1779430387912, 1779430387912);
INSERT INTO "ShiftSegment" ("id", "shiftId", "type", "startDate", "startTime", "endDate", "endTime", "duration", "accountId", "createdAt", "updatedAt") VALUES (11, 4, 'NORMAL', '+0', '08:00', '+0', '18:00', 10.0, NULL, 1779431085969, 1779431085969);
INSERT INTO "ShiftSegment" ("id", "shiftId", "type", "startDate", "startTime", "endDate", "endTime", "duration", "accountId", "createdAt", "updatedAt") VALUES (12, 6, 'NORMAL', '+0', '08:00', '+0', '18:00', 10.0, 1, 1779431230466, 1779431230466);
INSERT INTO "ShiftSegment" ("id", "shiftId", "type", "startDate", "startTime", "endDate", "endTime", "duration", "accountId", "createdAt", "updatedAt") VALUES (13, 7, 'NORMAL', '+0', '08:00', '+0', '18:00', 10.0, NULL, 1779431302408, 1779431302408);
INSERT INTO "ShiftSegment" ("id", "shiftId", "type", "startDate", "startTime", "endDate", "endTime", "duration", "accountId", "createdAt", "updatedAt") VALUES (24, 9, 'NORMAL', '+0', '08:00', '+0', '17:00', 8.0, NULL, 1779441298875, 1779441298875);
INSERT INTO "ShiftSegment" ("id", "shiftId", "type", "startDate", "startTime", "endDate", "endTime", "duration", "accountId", "createdAt", "updatedAt") VALUES (27, 8, 'NORMAL', '+0', '08:00', '+0', '12:00', 4.0, NULL, 1779811394803, 1779811394803);
INSERT INTO "ShiftSegment" ("id", "shiftId", "type", "startDate", "startTime", "endDate", "endTime", "duration", "accountId", "createdAt", "updatedAt") VALUES (28, 8, 'NORMAL', '+0', '13:00', '+0', '18:00', 5.0, NULL, 1779811394803, 1779811394803);

-- 数据导入: SystemConfig
INSERT INTO "SystemConfig" ("id", "configKey", "configValue", "category", "description", "updatedById", "updatedByName", "createdAt", "updatedAt") VALUES (1, 'productionLineHierarchyLevel', '3', 'WORK_HOURS', '开线计划产线选择可选层级（工厂、车间、产线）', NULL, NULL, 1779440742106, 1779937272478);
INSERT INTO "SystemConfig" ("id", "configKey", "configValue", "category", "description", "updatedById", "updatedByName", "createdAt", "updatedAt") VALUES (2, 'productionLineShiftPropertyKeys', 'A01', 'WORK_HOURS', '产线开线班次属性', NULL, NULL, 1779440742106, 1779937272478);
INSERT INTO "SystemConfig" ("id", "configKey", "configValue", "category", "description", "updatedById", "updatedByName", "createdAt", "updatedAt") VALUES (3, 'standardHoursHierarchyLevels', '6,8', 'WORK_HOURS', '标准工时配置层级', NULL, NULL, 1779440742106, 1779937272478);
INSERT INTO "SystemConfig" ("id", "configKey", "configValue", "category", "description", "updatedById", "updatedByName", "createdAt", "updatedAt") VALUES (4, 'productionLineShiftIds', '8', 'WORK_HOURS', '产线班次ID列表(自动根据属性生成)', NULL, NULL, 1779440742107, 1779937272478);
INSERT INTO "SystemConfig" ("id", "configKey", "configValue", "category", "description", "updatedById", "updatedByName", "createdAt", "updatedAt") VALUES (5, 'actualHoursAllocationCode', 'A01', 'ALLOCATION', '按实际工时方式分配的工时代码', NULL, NULL, 1779440742106, 1779937272479);
INSERT INTO "SystemConfig" ("id", "configKey", "configValue", "category", "description", "updatedById", "updatedByName", "createdAt", "updatedAt") VALUES (6, 'indirectHoursAllocationCode', 'A05', 'ALLOCATION', '间接工时分配后的工时代码', NULL, NULL, 1779440742106, 1779937272481);
INSERT INTO "SystemConfig" ("id", "configKey", "configValue", "category", "description", "updatedById", "updatedByName", "createdAt", "updatedAt") VALUES (7, 'WH1001', '3', 'WH_MANAGEMENT', '开线计划产线对应劳动力账户层级（层级序号，多个用逗号分隔）', NULL, NULL, 1779812574178, 1779812574178);
INSERT INTO "SystemConfig" ("id", "configKey", "configValue", "category", "description", "updatedById", "updatedByName", "createdAt", "updatedAt") VALUES (8, 'earnedHoursAttendanceCode', 'A07', 'ALLOCATION', '配置后，挣得工时计算结果存储至该代码', 1, '系统管理��', '2026-05-27 07:20:44', 1779937272487);

-- 数据导入: User
INSERT INTO "User" ("id", "username", "password", "name", "email", "status", "createdAt", "updatedAt") VALUES (1, 'admin', '$2b$10$lYrCIqi1QW2/gx7QVtH65.X9gAnJzqwSn4jW8u7Yg13kOPaeKPDRK', '系统管理员', 'admin@example.com', 'ACTIVE', 1779361914131, 1779361914131);
INSERT INTO "User" ("id", "username", "password", "name", "email", "status", "createdAt", "updatedAt") VALUES (2, 'hr_admin', '$2b$10$e1xpPRDKdv2G3gaTHnVT9.U./cxkbZ0mNp9fZaa3Y4.U9C6mCEiK2', 'HR管理员', 'hr_admin@example.com', 'ACTIVE', 1779361914230, 1779361914230);
INSERT INTO "User" ("id", "username", "password", "name", "email", "status", "createdAt", "updatedAt") VALUES (3, '202605001', '$2b$10$I1wmeEXUw.QCsUXhQSyGZOHVSzbltaKl8b88eBQF5ZpBPa/E6fgaG', 'Aaron.he', NULL, 'ACTIVE', 1779435661158, 1779435661158);
INSERT INTO "User" ("id", "username", "password", "name", "email", "status", "createdAt", "updatedAt") VALUES (4, '202605002', '$2b$10$QSa9XL/Gsk7roEcGo/QC6O4QkstdIvmVgzgicheSif/uSMScYt0re', 'Paul ', NULL, 'ACTIVE', 1779438320297, 1779438320297);
INSERT INTO "User" ("id", "username", "password", "name", "email", "status", "createdAt", "updatedAt") VALUES (5, '202605003', '$2b$10$vKuq8Pv81zEZSktv1kGMTuY6BocSUKG1UNKYolGb3wol8Jo4.jyLq', 'Eric', NULL, 'ACTIVE', 1779440048033, 1779440048033);
INSERT INTO "User" ("id", "username", "password", "name", "email", "status", "createdAt", "updatedAt") VALUES (6, '202605004', '$2b$10$6Oy1td8t2LzBcVu7M1apn.PGN8Q2NNnR1FknZk.YrIoVl/sO2DOAq', 'Will', NULL, 'ACTIVE', 1779441117624, 1779441117624);
INSERT INTO "User" ("id", "username", "password", "name", "email", "status", "createdAt", "updatedAt") VALUES (7, '202605005', '$2b$10$SwGYF6wObK8tiH9DSO1i9elGvgbNCvseqvlOElfSi3TNjfRwzy3y2', '张三', NULL, 'ACTIVE', 1779441491918, 1779441491918);
INSERT INTO "User" ("id", "username", "password", "name", "email", "status", "createdAt", "updatedAt") VALUES (8, '202605006', '$2b$10$CQx4YLYHOi1AgCN4yCvgGOm62ElDXcQRBYE0LB4Fwp42e1pHNRRyK', '李四', NULL, 'ACTIVE', 1779442268955, 1779442268955);
INSERT INTO "User" ("id", "username", "password", "name", "email", "status", "createdAt", "updatedAt") VALUES (9, '202605007', '$2b$10$ee6VPZGzTUCgT7yygSvZ/.fmMGaX4ocYfHf0U6cC25IXjyVRpH.tW', '测试员工', NULL, 'ACTIVE', 1779442827069, 1779442827069);
INSERT INTO "User" ("id", "username", "password", "name", "email", "status", "createdAt", "updatedAt") VALUES (10, '202605008', '$2b$10$QzF/q3B7rWXvSfKGl9RZ4eXtbdoA0cxlP1WQz4AJjobkWSG02m1Oe', '测试员工1111', NULL, 'ACTIVE', 1779442984191, 1779442984191);
INSERT INTO "User" ("id", "username", "password", "name", "email", "status", "createdAt", "updatedAt") VALUES (11, '202605009', '$2b$10$FsDxJV6zVq4oDZIPuApyv.6boa6e0zOXdk5oI1pzrrDELPc4Qzebe', '测试员工2', NULL, 'ACTIVE', 1779443504522, 1779443504522);
INSERT INTO "User" ("id", "username", "password", "name", "email", "status", "createdAt", "updatedAt") VALUES (12, '202605010', '$2b$10$QGLqSIhRXVU2P4DQpXICaO0lCpxXm7r8jccEn8chDHScrRZiNFpF2', '测试员工3', 'Aaron.he@gaiaworks.cn', 'ACTIVE', 1779443692365, 1779443692365);
INSERT INTO "User" ("id", "username", "password", "name", "email", "status", "createdAt", "updatedAt") VALUES (13, '202605011', '$2b$10$laBa6XQ6fmsEUUpM4kezVOO2j25FoBk5UqgccCoTCrafarTTGvAzC', '测试11', 'Aaron.he@gaiaworks.cn', 'ACTIVE', 1779768290769, 1779768290769);

-- 数据导入: UserRole
INSERT INTO "UserRole" ("id", "userId", "roleId", "createdAt") VALUES (1, 1, 1, 1779361914233);
INSERT INTO "UserRole" ("id", "userId", "roleId", "createdAt") VALUES (2, 2, 2, 1779361914237);
INSERT INTO "UserRole" ("id", "userId", "roleId", "createdAt") VALUES (3, 3, 2, 1779435661166);
INSERT INTO "UserRole" ("id", "userId", "roleId", "createdAt") VALUES (4, 4, 2, 1779438320302);
INSERT INTO "UserRole" ("id", "userId", "roleId", "createdAt") VALUES (5, 5, 2, 1779440048039);
INSERT INTO "UserRole" ("id", "userId", "roleId", "createdAt") VALUES (6, 6, 2, 1779441117629);
INSERT INTO "UserRole" ("id", "userId", "roleId", "createdAt") VALUES (7, 7, 2, 1779441491922);
INSERT INTO "UserRole" ("id", "userId", "roleId", "createdAt") VALUES (8, 8, 2, 1779442268960);
INSERT INTO "UserRole" ("id", "userId", "roleId", "createdAt") VALUES (9, 9, 2, 1779442827073);
INSERT INTO "UserRole" ("id", "userId", "roleId", "createdAt") VALUES (10, 10, 2, 1779442984195);
INSERT INTO "UserRole" ("id", "userId", "roleId", "createdAt") VALUES (11, 11, 2, 1779443504526);
INSERT INTO "UserRole" ("id", "userId", "roleId", "createdAt") VALUES (12, 12, 2, 1779443692369);
INSERT INTO "UserRole" ("id", "userId", "roleId", "createdAt") VALUES (13, 13, 2, 1779768290772);

-- 数据导入: WorkHourResult
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (541, '202605002', NULL, 1778371200000, 1778371200000, 8, '生产长白班', NULL, 'A06', NULL, '线体工时', 4.0, 80.0, NULL, 8, '大华工厂/W1总装车间/W1总装L1产线/-/焊接', 'DH/DH01/DH0101/-/A01', 'LEAN', 113, NULL, NULL, NULL, '{}', NULL, 1, 'A01', 1778371200000, 1778385600000, 'CONFIRMED', 1779869892970, 1779869892970);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (542, '202605002', NULL, 1778371200000, 1778371200000, 8, '生产长白班', NULL, 'A06', NULL, '线体工时', 5.0, 100.0, NULL, 7, '大华工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'LEAN', 118, NULL, NULL, NULL, '{}', NULL, 1, 'A01', 1778389200000, 1778407200000, 'CONFIRMED', 1779869892975, 1779869892975);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (543, '202605002', NULL, 1778410800000, 1778410800000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 1.0, 20.0, NULL, 41, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'ATTENDANCE', 129, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778367600000, 1778371200000, 'CONFIRMED', 1779869892976, 1779869892976);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (544, '202605002', NULL, 1778410800000, 1778410800000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 1.0, 20.0, NULL, 41, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'ATTENDANCE', 130, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778367600000, 1778371200000, 'CONFIRMED', 1779869892978, 1779869892978);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (545, '202605002', NULL, 1778410800000, 1778410800000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 1.0, 20.0, NULL, 41, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'ATTENDANCE', 131, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778367600000, 1778371200000, 'CONFIRMED', 1779869892979, 1779869892979);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (546, '202605002', NULL, 1778410800000, 1778410800000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 1.0, 20.0, NULL, 8, '大华工厂/W1总装车间/W1总装L1产线/-/焊接', 'DH/DH01/DH0101/-/A01', 'ATTENDANCE', 132, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778367600000, 1778371200000, 'CONFIRMED', 1779869892980, 1779869892980);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (547, '202605002', NULL, 1778410800000, 1778410800000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 4.0, 80.0, NULL, 41, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'ATTENDANCE', 133, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778371200000, 1778385600000, 'CONFIRMED', 1779869892982, 1779869892982);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (548, '202605002', NULL, 1778410800000, 1778410800000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 4.0, 80.0, NULL, 41, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'ATTENDANCE', 134, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778371200000, 1778385600000, 'CONFIRMED', 1779869892983, 1779869892983);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (549, '202605002', NULL, 1778410800000, 1778410800000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 4.0, 80.0, NULL, 41, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'ATTENDANCE', 135, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778371200000, 1778385600000, 'CONFIRMED', 1779869892984, 1779869892984);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (550, '202605002', NULL, 1778410800000, 1778410800000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 4.0, 80.0, NULL, 8, '大华工厂/W1总装车间/W1总装L1产线/-/焊接', 'DH/DH01/DH0101/-/A01', 'ATTENDANCE', 136, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778371200000, 1778385600000, 'CONFIRMED', 1779869892985, 1779869892985);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (551, '202605002', NULL, 1778410800000, 1778410800000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 5.0, 100.0, NULL, 41, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'ATTENDANCE', 137, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778389200000, 1778407200000, 'CONFIRMED', 1779869892987, 1779869892987);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (552, '202605002', NULL, 1778410800000, 1778410800000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 5.0, 100.0, NULL, 41, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'ATTENDANCE', 138, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778389200000, 1778407200000, 'CONFIRMED', 1779869892988, 1779869892988);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (553, '202605002', NULL, 1778410800000, 1778410800000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 5.0, 100.0, NULL, 41, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'ATTENDANCE', 139, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778389200000, 1778407200000, 'CONFIRMED', 1779869892989, 1779869892989);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (554, '202605002', NULL, 1778410800000, 1778410800000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 6.0, 120.0, NULL, 7, '大华工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'ATTENDANCE', 140, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778389200000, 1778410800000, 'CONFIRMED', 1779869892990, 1779869892990);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (555, '202605004', NULL, 1778371200000, 1778371200000, 8, '生产长白班', NULL, 'A01', NULL, '车间工时', 4.0, 0.0, NULL, 31, '杭州工厂/W1总装车间///', 'DH/DH01///', 'LEAN', 114, NULL, NULL, NULL, '{}', NULL, 3, 'A03', 1778371200000, 1778385600000, 'CONFIRMED', 1779869892996, 1779869892996);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (556, '202605004', NULL, 1778371200000, 1778371200000, 8, '生产长白班', NULL, 'A01', NULL, '车间工时', 5.0, 0.0, NULL, 31, '杭州工厂/W1总装车间///', 'DH/DH01///', 'LEAN', 115, NULL, NULL, NULL, '{}', NULL, 3, 'A03', 1778389200000, 1778407200000, 'CONFIRMED', 1779869892998, 1779869892998);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (557, '202605003', NULL, 1778371200000, 1778371200000, 8, '生产长白班', NULL, 'A01', NULL, '车间工时', 4.0, 0.0, NULL, 31, '杭州工厂/W1总装车间///', 'DH/DH01///', 'LEAN', 116, NULL, NULL, NULL, '{}', NULL, 3, 'A03', 1778371200000, 1778385600000, 'CONFIRMED', 1779869893004, 1779869893004);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (558, '202605003', NULL, 1778371200000, 1778371200000, 8, '生产长白班', NULL, 'A01', NULL, '车间工时', 4.0, 0.0, NULL, 31, '杭州工厂/W1总装车间///', 'DH/DH01///', 'LEAN', 117, NULL, NULL, NULL, '{}', NULL, 3, 'A03', 1778389200000, 1778403600000, 'CONFIRMED', 1779869893006, 1779869893006);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (559, '202605002', NULL, 1778284800000, 1778284800000, 8, '生产长白班', NULL, 'AC_001', NULL, '线体工时', 2.0, 40.0, NULL, 8, '大华工厂/W1总装车间/W1总装L1产线/-/焊接', 'DH/DH01/DH0101/-/A01', 'LEAN', 119, NULL, NULL, NULL, '{}', NULL, 1, 'A01', 1778284800000, 1778292000000, 'CONFIRMED', 1779869893013, 1779869893013);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (560, '202605002', NULL, 1778284800000, 1778284800000, 8, '生产长白班', NULL, 'AC_001', NULL, '线体工时', 1.0, 20.0, NULL, 7, '大华工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'LEAN', 120, NULL, NULL, NULL, '{}', NULL, 1, 'A01', 1778295600000, 1778299200000, 'CONFIRMED', 1779869893017, 1779869893017);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (561, '202605002', NULL, 1778284800000, 1778284800000, 8, '生产长白班', NULL, 'AC_001', NULL, '线体工时', 2.0, 40.0, NULL, 8, '大华工厂/W1总装车间/W1总装L1产线/-/焊接', 'DH/DH01/DH0101/-/A01', 'LEAN', 121, NULL, NULL, NULL, '{}', NULL, 1, 'A01', 1778306400000, 1778313600000, 'CONFIRMED', 1779869893020, 1779869893020);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (562, '202605002', NULL, 1778324400000, 1778324400000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 4.0, 80.0, NULL, 21, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'ATTENDANCE', 122, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778284800000, 1778299200000, 'CONFIRMED', 1779869893022, 1779869893022);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (563, '202605002', NULL, 1778324400000, 1778324400000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 4.0, 80.0, NULL, 21, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'ATTENDANCE', 123, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778284800000, 1778299200000, 'CONFIRMED', 1779869893023, 1779869893023);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (564, '202605002', NULL, 1778324400000, 1778324400000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 2.0, 40.0, NULL, 8, '大华工厂/W1总装车间/W1总装L1产线/-/焊接', 'DH/DH01/DH0101/-/A01', 'ATTENDANCE', 124, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778284800000, 1778292000000, 'CONFIRMED', 1779869893024, 1779869893024);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (565, '202605002', NULL, 1778324400000, 1778324400000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 1.0, 20.0, NULL, 7, '大华工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'ATTENDANCE', 125, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778295600000, 1778299200000, 'CONFIRMED', 1779869893026, 1779869893026);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (566, '202605002', NULL, 1778324400000, 1778324400000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 3.0, 60.0, NULL, 21, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'ATTENDANCE', 126, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778302800000, 1778313600000, 'CONFIRMED', 1779869893027, 1779869893027);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (567, '202605002', NULL, 1778324400000, 1778324400000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 2.0, 40.0, NULL, 8, '大华工厂/W1总装车间/W1总装L1产线/-/焊接', 'DH/DH01/DH0101/-/A01', 'ATTENDANCE', 127, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778306400000, 1778313600000, 'CONFIRMED', 1779869893028, 1779869893028);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (568, '202605002', NULL, 1778324400000, 1778324400000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 2.0, 40.0, NULL, 28, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'ATTENDANCE', 128, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778317200000, 1778324400000, 'CONFIRMED', 1779869893029, 1779869893029);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (569, '202605002', NULL, 1778284800000, 1778284800000, 8, '生产长白班', NULL, 'AC_001', NULL, '线体工时', 1.0, 20.0, NULL, 27, '杭州工厂/W1总装车间/W1总装L2产线/-/喷漆', 'DH/DH01/DH01002/-/A02', 'LEAN', 141, NULL, NULL, NULL, '{}', NULL, 1, 'A01', 1778317200000, 1778320800000, 'CONFIRMED', 1779869893034, 1779869893034);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (570, '202605002', NULL, 1778284800000, 1778284800000, 8, '生产长白班', NULL, 'AC_003', NULL, '工序工时', 1.0, 20.0, NULL, 27, '杭州工厂/W1总装车间/W1总装L2产线/-/喷漆', 'DH/DH01/DH01002/-/A02', 'LEAN', 142, NULL, NULL, NULL, '{}', NULL, 2, 'A02', 1778317200000, 1778320800000, 'CONFIRMED', 1779869893038, 1779869893038);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (571, '202605002', NULL, 1778284800000, 1778284800000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 4.0, 80.0, NULL, 21, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'ATTENDANCE', 143, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778284800000, 1778299200000, 'CONFIRMED', 1779869893039, 1779869893039);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (572, '202605002', NULL, 1778284800000, 1778284800000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 4.0, 80.0, NULL, 21, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'ATTENDANCE', 144, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778284800000, 1778299200000, 'CONFIRMED', 1779869893040, 1779869893040);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (573, '202605002', NULL, 1778284800000, 1778284800000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 2.0, 40.0, NULL, 8, '大华工厂/W1总装车间/W1总装L1产线/-/焊接', 'DH/DH01/DH0101/-/A01', 'ATTENDANCE', 145, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778284800000, 1778292000000, 'CONFIRMED', 1779869893042, 1779869893042);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (574, '202605002', NULL, 1778284800000, 1778284800000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 1.0, 20.0, NULL, 7, '大华工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'ATTENDANCE', 146, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778295600000, 1778299200000, 'CONFIRMED', 1779869893043, 1779869893043);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (575, '202605002', NULL, 1778284800000, 1778284800000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 3.0, 60.0, NULL, 21, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'ATTENDANCE', 147, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778302800000, 1778313600000, 'CONFIRMED', 1779869893044, 1779869893044);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (576, '202605002', NULL, 1778284800000, 1778284800000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 2.0, 40.0, NULL, 8, '大华工厂/W1总装车间/W1总装L1产线/-/焊接', 'DH/DH01/DH0101/-/A01', 'ATTENDANCE', 148, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778306400000, 1778313600000, 'CONFIRMED', 1779869893045, 1779869893045);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (577, '202605002', NULL, 1778284800000, 1778284800000, NULL, NULL, NULL, 'AC_004', NULL, '出勤工时', 2.0, 40.0, NULL, 28, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'ATTENDANCE', 149, NULL, NULL, NULL, '{}', NULL, 4, 'A04', 1778317200000, 1778324400000, 'CONFIRMED', 1779869893046, 1779869893046);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (578, '202605004', NULL, 1779840000000, 1779840000000, 8, '生产长白班', NULL, 'AC_002', NULL, '车间工时', 4.0, 0.0, NULL, 31, '杭州工厂/W1总装车间///', 'DH/DH01///', 'LEAN', 152, NULL, NULL, NULL, '{}', NULL, 3, 'A03', 1779840000000, 1779854400000, 'CONFIRMED', 1779869893052, 1779869893052);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (579, '202605004', NULL, 1779840000000, 1779840000000, 8, '生产长白班', NULL, 'AC_002', NULL, '车间工时', 5.0, 0.0, NULL, 31, '杭州工厂/W1总装车间///', 'DH/DH01///', 'LEAN', 153, NULL, NULL, NULL, '{}', NULL, 3, 'A03', 1779858000000, 1779876000000, 'CONFIRMED', 1779869893054, 1779869893054);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (582, '202605002', NULL, 1779840000000, 1779840000000, 8, '生产长白班', NULL, 'AC_001', NULL, '线体工时', 4.0, 80.0, NULL, 42, '杭州工厂/W1总装车间/W1总装L1产线/-/焊接', 'DH/DH01/DH0101/-/A01', 'LEAN', 155, NULL, NULL, NULL, '{}', NULL, 1, 'A01', 1779840000000, 1779854400000, 'CONFIRMED', 1779871155991, 1779871155991);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (583, '202605002', NULL, 1779840000000, 1779840000000, 8, '生产长白班', NULL, 'AC_001', NULL, '线体工时', 4.0, 80.0, NULL, 43, '杭州工厂/W1总装车间/W1总装L2产线/-/焊接', 'DH/DH01/DH01002/-/A01', 'LEAN', 156, NULL, NULL, NULL, '{}', NULL, 1, 'A01', 1779861600000, 1779876000000, 'CONFIRMED', 1779871156006, 1779871156006);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (588, '202605003', NULL, 1778371200000, 1778371200000, 8, '生产长白班', NULL, NULL, '', '分摊工时', 4.444444444444445, 0.0, NULL, 8, '大华工厂/W1总装车间/W1总装L1产线//', 'DH/DH01/DH0101//', 'ALLOCATION', 1, '3', 'ALC17798899781325364', NULL, '{}', NULL, 5, 'A05', NULL, NULL, 'DRAFT', 1779889978183, 1779889978183);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (589, '202605003', NULL, 1778371200000, 1778371200000, 8, '生产长白班', NULL, NULL, '', '分摊工时', 3.555555555555555, 0.0, NULL, 7, '大华工厂/W1总装车间/W1总装L2产线//', 'DH/DH01/DH01002//', 'ALLOCATION', 1, '3', 'ALC17798899781325364', NULL, '{}', NULL, 5, 'A05', NULL, NULL, 'DRAFT', 1779889978195, 1779889978195);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (595, '202605003', NULL, 1779840000000, 1779840000000, 8, '生产长白班', NULL, 'AC_002', NULL, '车间工时', 3.0, 0.0, NULL, 31, '杭州工厂/W1总装车间///', 'DH/DH01///', 'LEAN', 157, NULL, NULL, NULL, '{}', NULL, 3, 'A03', 1779843600000, 1779854400000, 'CONFIRMED', 1779891109039, 1779891109039);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (596, '202605003', NULL, 1779840000000, 1779840000000, 8, '生产长白班', NULL, 'AC_002', NULL, '车间工时', 4.0, 0.0, NULL, 31, '杭州工厂/W1总装车间///', 'DH/DH01///', 'LEAN', 158, NULL, NULL, NULL, '{}', NULL, 3, 'A03', 1779858000000, 1779872400000, 'CONFIRMED', 1779891109043, 1779891109043);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (601, '202605002', NULL, 1778688000000, 1779895937897, NULL, NULL, NULL, 'A07', NULL, '挣得工时', 4.5, NULL, NULL, 67, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, 'PERSONAL_PRODUCTION', NULL, '个人产量', NULL, NULL, '{}', 67, 12, NULL, NULL, NULL, 'COMPLETED', 1779895937898, 1779895937898);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (607, '202605002', NULL, 1777996800000, 1779896563893, NULL, NULL, NULL, 'A07', NULL, '挣得工时', 6.0, NULL, NULL, 67, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, 'PERSONAL_PRODUCTION', NULL, '个人产量', NULL, NULL, '{}', 67, 12, NULL, NULL, NULL, 'COMPLETED', 1779896563894, 1779896563894);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (608, '202605002', NULL, 1777910400000, 1779897299484, NULL, NULL, NULL, 'A07', NULL, '挣得工时', 4.5, NULL, NULL, 64, '杭州工厂/W1总装车间/W1总装L1产线//', NULL, 'PERSONAL_PRODUCTION', NULL, '个人产量', NULL, NULL, '{}', 64, 12, NULL, NULL, NULL, 'COMPLETED', 1779897299485, 1779897299485);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (609, '202605002', NULL, 1778083200000, 1779897328899, NULL, NULL, NULL, 'A07', NULL, '挣得工时', 4.5, NULL, NULL, 67, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, 'PERSONAL_PRODUCTION', NULL, '个人产量', NULL, NULL, '{}', 67, 12, NULL, NULL, NULL, 'COMPLETED', 1779897328900, 1779897328900);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (614, '202605001', NULL, 1777910400000, 1779897870019, NULL, NULL, NULL, 'A07', NULL, '挣得工时', 4.0, NULL, NULL, 67, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, 'PERSONAL_PRODUCTION', NULL, '个人产量', NULL, NULL, '{}', 67, 12, NULL, NULL, NULL, 'COMPLETED', 1779897870020, 1779897870020);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (615, '202605001', NULL, 1778083200000, 1779898378256, NULL, NULL, NULL, 'A07', NULL, '挣得工时', 2.0, NULL, NULL, 67, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, 'PERSONAL_PRODUCTION', NULL, '个人产量', NULL, NULL, '{}', 67, 12, NULL, NULL, NULL, 'COMPLETED', 1779898378257, 1779898378257);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (645, '202605001', NULL, 1779638400000, 1779931001094, NULL, NULL, NULL, 'A07', NULL, '挣得工时', 0.0, NULL, NULL, 72, '杭州工厂/W1总装车间/W1总装L2产线//喷漆', NULL, 'PERSONAL_PRODUCTION', NULL, '个人产量', NULL, NULL, '{}', 72, 12, NULL, NULL, NULL, 'COMPLETED', 1779931001095, 1779931001095);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (647, '202605002', NULL, 1779292800000, 1779931291992, NULL, NULL, NULL, 'A07', NULL, '挣得工时', 0.0, NULL, NULL, 73, '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, 'PERSONAL_PRODUCTION', NULL, '个人产量', NULL, NULL, '{}', 73, 12, NULL, NULL, NULL, 'COMPLETED', 1779931291993, 1779931291993);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (648, '202605002', NULL, 1778860800000, 1779933328093, NULL, NULL, NULL, 'A07', NULL, '挣得工时', 4.5, NULL, NULL, 74, '杭州工厂/W1总装车间///焊接', NULL, 'PERSONAL_PRODUCTION', NULL, '个人产量', NULL, NULL, '{}', 74, 12, NULL, NULL, NULL, 'COMPLETED', 1779933328094, 1779933328094);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (649, '202605002', NULL, 1778947200000, 1779933387576, NULL, NULL, NULL, 'A07', NULL, '挣得工时', 6.0, NULL, NULL, 75, '杭州工厂/W1总装车间/W1总装L2产线//焊接', NULL, 'PERSONAL_PRODUCTION', NULL, '个人产量', NULL, NULL, '{}', 75, 12, NULL, NULL, NULL, 'COMPLETED', 1779933387577, 1779933387577);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (650, '202605001', NULL, 1779897600000, 1779936416552, NULL, NULL, NULL, 'A07', NULL, '挣得工时', 0.0, NULL, NULL, 76, '杭州工厂/W1总装车间/W1总装L1产线//喷漆', NULL, 'PERSONAL_PRODUCTION', NULL, '个人产量', NULL, NULL, '{}', 76, 12, NULL, NULL, NULL, 'COMPLETED', 1779936416553, 1779936416553);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (651, '202605001', NULL, 1779811200000, 1779936476672, NULL, NULL, NULL, 'A07', NULL, '挣得工时', 2.0, NULL, NULL, 77, '杭州工厂/W1总装车间/W1总装L1产线//焊接', NULL, 'PERSONAL_PRODUCTION', NULL, '个人产量', NULL, NULL, '{}', 77, 12, NULL, NULL, NULL, 'COMPLETED', 1779936476673, 1779936476673);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (652, '202605001', NULL, 1779724800000, 1779936509674, NULL, NULL, NULL, 'A07', NULL, '挣得工时', 0.0, NULL, NULL, 78, '杭州工厂/W1总装车间///焊接', NULL, 'PERSONAL_PRODUCTION', NULL, '个人产量', NULL, NULL, '{}', 78, 12, NULL, NULL, NULL, 'COMPLETED', 1779936509675, 1779936509675);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (653, '202605001', NULL, 1779552000000, 1779936611561, NULL, NULL, NULL, 'A07', NULL, '挣得工时', 0.0, NULL, NULL, 79, '杭州工厂/W1总装车间///焊接', NULL, 'PERSONAL_PRODUCTION', NULL, '个人产量', NULL, NULL, '{}', 79, 12, NULL, NULL, NULL, 'COMPLETED', 1779936611562, 1779936611562);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (654, '202605002', NULL, 1779897600000, 1779938114380, NULL, NULL, NULL, 'A07', NULL, '挣得工时', 2.0, NULL, NULL, 78, '杭州工厂/W1总装车间///焊接', NULL, 'PERSONAL_PRODUCTION', NULL, '个人产量', NULL, NULL, '{}', 78, 12, NULL, NULL, NULL, 'COMPLETED', 1779938114381, 1779938114381);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (655, '202605002', NULL, 1779811200000, 1779938191741, NULL, NULL, NULL, 'A07', NULL, '挣得工时', 6.0, NULL, NULL, 80, '杭州工厂/W1总装车间/W1总装L1产线//喷漆', NULL, 'PERSONAL_PRODUCTION', NULL, '个人产量', NULL, NULL, '{}', 80, 12, NULL, NULL, NULL, 'COMPLETED', 1779938191742, 1779938191742);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (656, '202605001', NULL, 1778457600000, NULL, NULL, NULL, NULL, 'A06', NULL, NULL, 8.0, NULL, NULL, NULL, NULL, 'DH/DH01/DH0101', NULL, NULL, NULL, NULL, NULL, '{}', NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 1779948720000, 1779948720000);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (657, '202605002', NULL, 1778457600000, NULL, NULL, NULL, NULL, 'A06', NULL, NULL, 8.0, NULL, NULL, NULL, NULL, 'DH/DH01/DH0101', NULL, NULL, NULL, NULL, NULL, '{}', NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 1779948720000, 1779948720000);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (658, '202605003', NULL, 1778457600000, NULL, NULL, NULL, NULL, 'A01', NULL, NULL, 8.0, NULL, NULL, NULL, NULL, 'DH/DH01/DH0101', NULL, NULL, NULL, NULL, NULL, '{}', NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 1779948720000, 1779948720000);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (659, '202605001', NULL, 1778371200000, NULL, NULL, NULL, NULL, 'A06', NULL, NULL, 8.0, NULL, NULL, NULL, NULL, 'DH/DH01/DH0101', NULL, NULL, NULL, NULL, NULL, '{}', NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 1779948851000, 1779948851000);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (660, '202605002', NULL, 1778371200000, NULL, NULL, NULL, NULL, 'A06', NULL, NULL, 8.0, NULL, NULL, NULL, NULL, 'DH/DH01/DH0101', NULL, NULL, NULL, NULL, NULL, '{}', NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 1779948851000, 1779948851000);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (661, '202605003', NULL, 1778371200000, NULL, NULL, NULL, NULL, 'A01', NULL, NULL, 8.0, NULL, NULL, NULL, NULL, 'DH/DH01/DH0101', NULL, NULL, NULL, NULL, NULL, '{}', NULL, NULL, NULL, NULL, NULL, 'ACTIVE', 1779948851000, 1779948851000);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (666, '202605001', 3, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A06', 'A06', '作业工时', 2.0, NULL, NULL, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 34, '工时报表申请: Aaron.he - 作业工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605282134298487","reportMode":"personal","description":null,"localStartTime":"2026-05-28 08:00","localEndTime":"2026-05-28 10:00"}', NULL, 11, 'A06', 1779926400000, 1779933600000, 'ACTIVE', 1779975287030, 1779975287030);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (667, '202605011', 13, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A05', 'A05', '分摊工时', 3.0, NULL, NULL, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 35, '工时报表申请: 团队报工(4人) - 分摊工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605282142089870","reportMode":"team","description":null,"localStartTime":"2026-05-28 09:00","localEndTime":"2026-05-28 12:00"}', NULL, 5, 'A05', 1779930000000, 1779940800000, 'ACTIVE', 1779975742386, 1779975742386);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (668, '202605002', 4, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A05', 'A05', '分摊工时', 3.0, NULL, NULL, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 35, '工时报表申请: 团队报工(4人) - 分摊工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605282142089870","reportMode":"team","description":null,"localStartTime":"2026-05-28 09:00","localEndTime":"2026-05-28 12:00"}', NULL, 5, 'A05', 1779930000000, 1779940800000, 'ACTIVE', 1779975742409, 1779975742409);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (669, '202605003', 5, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A05', 'A05', '分摊工时', 3.0, NULL, NULL, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 35, '工时报表申请: 团队报工(4人) - 分摊工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605282142089870","reportMode":"team","description":null,"localStartTime":"2026-05-28 09:00","localEndTime":"2026-05-28 12:00"}', NULL, 5, 'A05', 1779930000000, 1779940800000, 'ACTIVE', 1779975742412, 1779975742412);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (670, '202605004', 6, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A05', 'A05', '分摊工时', 3.0, NULL, NULL, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 35, '工时报表申请: 团队报工(4人) - 分摊工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605282142089870","reportMode":"team","description":null,"localStartTime":"2026-05-28 09:00","localEndTime":"2026-05-28 12:00"}', NULL, 5, 'A05', 1779930000000, 1779940800000, 'ACTIVE', 1779975742416, 1779975742416);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (671, '202605006', 8, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A06', 'A06', '作业工时', 3.0, NULL, NULL, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 36, '工时报表申请: 团队报工(5人) - 作业工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605282144099948","reportMode":"team","description":null,"localStartTime":"2026-05-28 09:00","localEndTime":"2026-05-28 12:00"}', NULL, 11, 'A06', 1779930000000, 1779940800000, 'ACTIVE', 1779975934862, 1779975934862);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (672, '202605004', 6, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A06', 'A06', '作业工时', 3.0, NULL, NULL, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 36, '工时报表申请: 团队报工(5人) - 作业工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605282144099948","reportMode":"team","description":null,"localStartTime":"2026-05-28 09:00","localEndTime":"2026-05-28 12:00"}', NULL, 11, 'A06', 1779930000000, 1779940800000, 'ACTIVE', 1779975934866, 1779975934866);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (673, '202605002', 4, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A06', 'A06', '作业工时', 3.0, NULL, NULL, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 36, '工时报表申请: 团队报工(5人) - 作业工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605282144099948","reportMode":"team","description":null,"localStartTime":"2026-05-28 09:00","localEndTime":"2026-05-28 12:00"}', NULL, 11, 'A06', 1779930000000, 1779940800000, 'ACTIVE', 1779975934869, 1779975934869);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (674, '202605001', 3, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A06', 'A06', '作业工时', 3.0, NULL, NULL, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 36, '工时报表申请: 团队报工(5人) - 作业工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605282144099948","reportMode":"team","description":null,"localStartTime":"2026-05-28 09:00","localEndTime":"2026-05-28 12:00"}', NULL, 11, 'A06', 1779930000000, 1779940800000, 'ACTIVE', 1779975934872, 1779975934872);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (675, '202605003', 5, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A06', 'A06', '作业工时', 3.0, NULL, NULL, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 36, '工时报表申请: 团队报工(5人) - 作业工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605282144099948","reportMode":"team","description":null,"localStartTime":"2026-05-28 09:00","localEndTime":"2026-05-28 12:00"}', NULL, 11, 'A06', 1779930000000, 1779940800000, 'ACTIVE', 1779975934875, 1779975934875);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (676, '202605003', 5, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A01', 'AC_001', '线体工时', 2.0, NULL, NULL, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 37, '工时报表申请: Eric - 线体工时 - 2026/5/28', NULL, NULL, '{}', NULL, 1, 'A01', NULL, NULL, 'ACTIVE', 1779976259627, 1779976259627);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (677, '202605001', 3, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A01', 'AC_001', '线体工时', 2.0, NULL, NULL, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 37, '工时报表申请: Eric - 线体工时 - 2026/5/28', NULL, NULL, '{}', NULL, 1, 'A01', NULL, NULL, 'ACTIVE', 1779976259633, 1779976259633);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (678, '202605002', 4, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A01', 'AC_001', '线体工时', 2.0, NULL, NULL, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 37, '工时报表申请: Eric - 线体工时 - 2026/5/28', NULL, NULL, '{}', NULL, 1, 'A01', NULL, NULL, 'ACTIVE', 1779976259634, 1779976259634);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (679, '202605004', 6, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A01', 'AC_001', '线体工时', 2.0, NULL, NULL, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 37, '工时报表申请: Eric - 线体工时 - 2026/5/28', NULL, NULL, '{}', NULL, 1, 'A01', NULL, NULL, 'ACTIVE', 1779976259636, 1779976259636);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (680, '202605003', 5, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A01', 'AC_001', '线体工时', 2.0, NULL, NULL, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 38, '工时报表申请: 团队报工(4人) - 线体工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605282152350623","reportMode":"team","description":null,"localStartTime":null,"localEndTime":null}', NULL, 1, 'A01', NULL, NULL, 'ACTIVE', 1779976389275, 1779976389275);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (681, '202605001', 3, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A01', 'AC_001', '线体工时', 2.0, NULL, NULL, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 38, '工时报表申请: 团队报工(4人) - 线体工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605282152350623","reportMode":"team","description":null,"localStartTime":null,"localEndTime":null}', NULL, 1, 'A01', NULL, NULL, 'ACTIVE', 1779976389298, 1779976389298);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (682, '202605002', 4, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A01', 'AC_001', '线体工时', 2.0, NULL, NULL, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 38, '工时报表申请: 团队报工(4人) - 线体工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605282152350623","reportMode":"team","description":null,"localStartTime":null,"localEndTime":null}', NULL, 1, 'A01', NULL, NULL, 'ACTIVE', 1779976389305, 1779976389305);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (683, '202605004', 6, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A01', 'AC_001', '线体工时', 2.0, NULL, NULL, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 38, '工时报表申请: 团队报工(4人) - 线体工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605282152350623","reportMode":"team","description":null,"localStartTime":null,"localEndTime":null}', NULL, 1, 'A01', NULL, NULL, 'ACTIVE', 1779976389308, 1779976389308);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (686, '202605005', 7, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A06', 'AC_005', '作业工时', 4.0, 80.0, 80.0, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 39, '工时报表申请: 张三 - 作业工时 - 2026/5/28', NULL, NULL, '{}', NULL, 11, 'A06', 1779926400000, 1779940800000, 'ACTIVE', 1779983865074, 1779983865074);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (688, '202605005', 7, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A06', 'AC_005', '作业工时', 2.0, 40.0, 40.0, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 40, '工时报表申请: 张三 - 作业工时 - 2026/5/28', NULL, NULL, '{}', NULL, 11, 'A06', 1779926400000, 1779933600000, 'ACTIVE', 1779984480482, 1779984480482);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (689, '202605005', 7, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A06', 'AC_005', '作业工时', 2.0, 40.0, 40.0, 83, '杭州工厂/W1总装车间/W1总装L1产线//焊接', 'DH/DH01/DH0101//A01', 'LABOR_HOUR_REPORT', 42, '工时报表申请: 张三 - 作业工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605290010023697","reportMode":"personal","description":null,"localStartTime":null,"localEndTime":null}', NULL, 11, 'A06', NULL, NULL, 'ACTIVE', 1779984620985, 1779984620985);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (690, '202605005', 7, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A06', 'AC_005', '作业工时', 2.0, 40.0, 40.0, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 41, '工时报表申请: 张三 - 作业工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605290009219775","reportMode":"personal","description":null,"localStartTime":"2026-05-28 05:00","localEndTime":"2026-05-28 07:00"}', NULL, 11, 'A06', 1779915600000, 1779922800000, 'ACTIVE', 1779984627744, 1779984627744);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (691, '202605005', 7, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A06', 'AC_005', '作业工时', 2.0, 40.0, 40.0, 80, '杭州工厂/W1总装车间/W1总装L1产线//喷漆', 'DH/DH01/DH0101//A02', 'LABOR_HOUR_REPORT', 43, '工时报表申请: 张三 - 作业工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605290012568606","reportMode":"personal","description":null,"localStartTime":null,"localEndTime":null}', NULL, 11, 'A06', NULL, NULL, 'ACTIVE', 1779984790847, 1779984790847);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (694, '202605005', 7, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A06', 'AC_005', '作业工时', 2.0, 40.0, 40.0, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 45, '工时报表申请: 张三 - 作业工时 - 2026/5/28', NULL, NULL, '{}', NULL, 11, 'A06', NULL, NULL, 'ACTIVE', 1779985235083, 1779985235083);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (695, '202605004', 6, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A06', 'AC_005', '作业工时', 2.0, 36.0, 36.0, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 45, '工时报表申请: 张三 - 作业工时 - 2026/5/28', NULL, NULL, '{}', NULL, 11, 'A06', NULL, NULL, 'ACTIVE', 1779985235093, 1779985235093);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (696, '202605003', 5, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A06', 'AC_005', '作业工时', 2.0, 50.0, 50.0, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 45, '工时报表申请: 张三 - 作业工时 - 2026/5/28', NULL, NULL, '{}', NULL, 11, 'A06', NULL, NULL, 'ACTIVE', 1779985235101, 1779985235101);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (697, '202605006', 8, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A06', 'AC_005', '作业工时', 2.0, 30.0, 30.0, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 45, '工时报表申请: 张三 - 作业工时 - 2026/5/28', NULL, NULL, '{}', NULL, 11, 'A06', NULL, NULL, 'ACTIVE', 1779985235109, 1779985235109);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (699, '202605005', 7, 1780012800000, 1780012800000, NULL, NULL, NULL, 'A06', 'AC_005', '作业工时', 2.0, 80.0, 80.0, 80, '杭州工厂/W1总装车间/W1总装L1产线//喷漆', 'DH/DH01/DH0101//A02', 'LABOR_HOUR_REPORT', 44, '工时报表申请: 张三 - 作业工时 - 2026/5/29', NULL, NULL, '{}', NULL, 11, 'A06', NULL, NULL, 'ACTIVE', 1779985364412, 1779985364412);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (700, '202605005', 7, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A06', 'AC_005', '作业工时', 1.0, 40.0, 40.0, 80, '杭州工厂/W1总装车间/W1总装L1产线//喷漆', 'DH/DH01/DH0101//A02', 'LABOR_HOUR_REPORT', 46, '工时报表申请: 张三 - 作业工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605290024338974","reportMode":"personal","description":"1","localStartTime":null,"localEndTime":null}', NULL, 11, 'A06', NULL, NULL, 'ACTIVE', 1779985488600, 1779985488600);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (701, '202605005', 7, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A06', 'AC_005', '作业工时', 2.0, 40.0, 40.0, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 45, '工时报表申请: 团队报工(4人) - 作业工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605290016561181","reportMode":"team","description":null,"localStartTime":null,"localEndTime":null}', NULL, 11, 'A06', NULL, NULL, 'ACTIVE', 1779985563123, 1779985563123);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (702, '202605004', 6, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A06', 'AC_005', '作业工时', 2.0, 36.0, 36.0, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 45, '工时报表申请: 团队报工(4人) - 作业工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605290016561181","reportMode":"team","description":null,"localStartTime":null,"localEndTime":null}', NULL, 11, 'A06', NULL, NULL, 'ACTIVE', 1779985563137, 1779985563137);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (703, '202605003', 5, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A06', 'AC_005', '作业工时', 2.0, 50.0, 50.0, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 45, '工时报表申请: 团队报工(4人) - 作业工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605290016561181","reportMode":"team","description":null,"localStartTime":null,"localEndTime":null}', NULL, 11, 'A06', NULL, NULL, 'ACTIVE', 1779985563178, 1779985563178);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (704, '202605006', 8, 1779926400000, 1779926400000, NULL, NULL, NULL, 'A06', 'AC_005', '作业工时', 2.0, 30.0, 30.0, 81, '杭州工厂/W1总装车间/W1总装L2产线//焊接', 'DH/DH01/DH01002//A01', 'LABOR_HOUR_REPORT', 45, '工时报表申请: 团队报工(4人) - 作业工时 - 2026-05-28', NULL, NULL, '{"isManualInput":true,"requestNo":"LABOR202605290016561181","reportMode":"team","description":null,"localStartTime":null,"localEndTime":null}', NULL, 11, 'A06', NULL, NULL, 'ACTIVE', 1779985563186, 1779985563186);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (707, '202605003', NULL, 1779840000000, 1779840000000, 8, '生产长白班', NULL, NULL, '', '分摊工时', 3.5, 0.0, NULL, 65, '杭州工厂/W1总装车间/W1总装L1产线', 'DH/DH01/DH0101//', 'ALLOCATION', 5, '3', 'ALC17799868891289204', NULL, '{}', NULL, 5, 'A05', NULL, NULL, 'DRAFT', 1779986889234, 1779986889234);
INSERT INTO "WorkHourResult" ("id", "employeeNo", "employeeId", "workDate", "calcDate", "shiftId", "shiftName", "attendanceCodeId", "attendanceCode", "calcAttendanceCode", "attendanceCodeName", "workHours", "amount", "calculateAmount", "accountId", "accountName", "accountPath", "sourceType", "sourceId", "source", "sourceBatchId", "attendancePunchPair", "customFields", "orgId", "definitionAttendanceCodeId", "definitionAttendanceCodeStr", "startTime", "endTime", "status", "createdAt", "updatedAt") VALUES (708, '202605003', NULL, 1779840000000, 1779840000000, 8, '生产长白班', NULL, NULL, '', '分摊工时', 3.5, 0.0, NULL, 66, '杭州工厂/W1总装车间/W1总装L2产线', 'DH/DH01/DH01002//', 'ALLOCATION', 5, '3', 'ALC17799868891289204', NULL, '{}', NULL, 5, 'A05', NULL, NULL, 'DRAFT', 1779986889245, 1779986889245);

-- 数据导入: WorkInfoHistory
INSERT INTO "WorkInfoHistory" ("id", "employeeId", "effectiveDate", "endDate", "changeType", "position", "jobLevel", "employeeType", "workLocation", "workAddress", "hireDate", "probationStart", "probationEnd", "probationMonths", "regularDate", "resignationDate", "resignationReason", "workYears", "orgId", "isCurrent", "reason", "customFields", "createdAt", "updatedAt", "costCenter", "employmentRelation") VALUES (1, 3, 1704067200000, NULL, 'ENTRY', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 6, 1, NULL, '{}', 1779435660977, 1779435660977, NULL, NULL);
INSERT INTO "WorkInfoHistory" ("id", "employeeId", "effectiveDate", "endDate", "changeType", "position", "jobLevel", "employeeType", "workLocation", "workAddress", "hireDate", "probationStart", "probationEnd", "probationMonths", "regularDate", "resignationDate", "resignationReason", "workYears", "orgId", "isCurrent", "reason", "customFields", "createdAt", "updatedAt", "costCenter", "employmentRelation") VALUES (2, 4, 1735689600000, NULL, 'ENTRY', NULL, 'LEVEL_001', 'FULL_TIME', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 7, 1, NULL, '{"costCenter":"SALES_CENTER","employmentRelation":"FORMAL"}', 1779438320166, 1779439414099, NULL, NULL);
INSERT INTO "WorkInfoHistory" ("id", "employeeId", "effectiveDate", "endDate", "changeType", "position", "jobLevel", "employeeType", "workLocation", "workAddress", "hireDate", "probationStart", "probationEnd", "probationMonths", "regularDate", "resignationDate", "resignationReason", "workYears", "orgId", "isCurrent", "reason", "customFields", "createdAt", "updatedAt", "costCenter", "employmentRelation") VALUES (3, 5, 1735689600000, NULL, 'ENTRY', 'POST_003', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 6, 1, NULL, '{}', 1779440047878, 1779807788756, NULL, NULL);
INSERT INTO "WorkInfoHistory" ("id", "employeeId", "effectiveDate", "endDate", "changeType", "position", "jobLevel", "employeeType", "workLocation", "workAddress", "hireDate", "probationStart", "probationEnd", "probationMonths", "regularDate", "resignationDate", "resignationReason", "workYears", "orgId", "isCurrent", "reason", "customFields", "createdAt", "updatedAt", "costCenter", "employmentRelation") VALUES (4, 6, 1704067200000, NULL, 'ENTRY', 'POST_002', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 7, 1, NULL, '{}', 1779441117470, 1779807807224, NULL, NULL);
INSERT INTO "WorkInfoHistory" ("id", "employeeId", "effectiveDate", "endDate", "changeType", "position", "jobLevel", "employeeType", "workLocation", "workAddress", "hireDate", "probationStart", "probationEnd", "probationMonths", "regularDate", "resignationDate", "resignationReason", "workYears", "orgId", "isCurrent", "reason", "customFields", "createdAt", "updatedAt", "costCenter", "employmentRelation") VALUES (5, 7, 1704067200000, NULL, 'ENTRY', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 6, 1, NULL, '{}', 1779441491795, 1779441491795, NULL, NULL);
INSERT INTO "WorkInfoHistory" ("id", "employeeId", "effectiveDate", "endDate", "changeType", "position", "jobLevel", "employeeType", "workLocation", "workAddress", "hireDate", "probationStart", "probationEnd", "probationMonths", "regularDate", "resignationDate", "resignationReason", "workYears", "orgId", "isCurrent", "reason", "customFields", "createdAt", "updatedAt", "costCenter", "employmentRelation") VALUES (6, 8, 1735689600000, NULL, 'ENTRY', 'POST_001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 7, 1, NULL, '{}', 1779442268803, 1779979215626, NULL, NULL);
INSERT INTO "WorkInfoHistory" ("id", "employeeId", "effectiveDate", "endDate", "changeType", "position", "jobLevel", "employeeType", "workLocation", "workAddress", "hireDate", "probationStart", "probationEnd", "probationMonths", "regularDate", "resignationDate", "resignationReason", "workYears", "orgId", "isCurrent", "reason", "customFields", "createdAt", "updatedAt", "costCenter", "employmentRelation") VALUES (7, 9, 1704067200000, NULL, 'ENTRY', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 7, 1, NULL, '{}', 1779442826894, 1779442826894, NULL, NULL);
INSERT INTO "WorkInfoHistory" ("id", "employeeId", "effectiveDate", "endDate", "changeType", "position", "jobLevel", "employeeType", "workLocation", "workAddress", "hireDate", "probationStart", "probationEnd", "probationMonths", "regularDate", "resignationDate", "resignationReason", "workYears", "orgId", "isCurrent", "reason", "customFields", "createdAt", "updatedAt", "costCenter", "employmentRelation") VALUES (8, 10, 1704067200000, NULL, 'ENTRY', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 9, 1, NULL, '{}', 1779442984072, 1779442984072, NULL, NULL);
INSERT INTO "WorkInfoHistory" ("id", "employeeId", "effectiveDate", "endDate", "changeType", "position", "jobLevel", "employeeType", "workLocation", "workAddress", "hireDate", "probationStart", "probationEnd", "probationMonths", "regularDate", "resignationDate", "resignationReason", "workYears", "orgId", "isCurrent", "reason", "customFields", "createdAt", "updatedAt", "costCenter", "employmentRelation") VALUES (9, 11, 1704067200000, NULL, 'ENTRY', NULL, 'LEVEL_002', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 6, 1, NULL, '{}', 1779443504370, 1779443504370, 'SALES_CENTER', NULL);
INSERT INTO "WorkInfoHistory" ("id", "employeeId", "effectiveDate", "endDate", "changeType", "position", "jobLevel", "employeeType", "workLocation", "workAddress", "hireDate", "probationStart", "probationEnd", "probationMonths", "regularDate", "resignationDate", "resignationReason", "workYears", "orgId", "isCurrent", "reason", "customFields", "createdAt", "updatedAt", "costCenter", "employmentRelation") VALUES (10, 12, 1704067200000, NULL, 'ENTRY', 'POST_002', 'LEVEL_001', 'FULL_TIME', NULL, NULL, 1704067200000, 1704067200000, NULL, NULL, 1704067200000, NULL, NULL, NULL, 7, 0, NULL, '{}', 1779443692247, 1779443723744, 'SALES_CENTER', 'FORMAL');
INSERT INTO "WorkInfoHistory" ("id", "employeeId", "effectiveDate", "endDate", "changeType", "position", "jobLevel", "employeeType", "workLocation", "workAddress", "hireDate", "probationStart", "probationEnd", "probationMonths", "regularDate", "resignationDate", "resignationReason", "workYears", "orgId", "isCurrent", "reason", "customFields", "createdAt", "updatedAt", "costCenter", "employmentRelation") VALUES (11, 12, 1778025600000, NULL, 'TRANSFER', 'POST_002', 'LEVEL_001', 'FULL_TIME', NULL, NULL, 1704067200000, 1704067200000, NULL, NULL, 1704067200000, NULL, NULL, NULL, 7, 1, NULL, '{"employmentRelation":"FORMAL","costCenter":"RD_CENTER"}', 1779443723781, 1779443723781, NULL, NULL);
INSERT INTO "WorkInfoHistory" ("id", "employeeId", "effectiveDate", "endDate", "changeType", "position", "jobLevel", "employeeType", "workLocation", "workAddress", "hireDate", "probationStart", "probationEnd", "probationMonths", "regularDate", "resignationDate", "resignationReason", "workYears", "orgId", "isCurrent", "reason", "customFields", "createdAt", "updatedAt", "costCenter", "employmentRelation") VALUES (12, 13, 1767225600000, NULL, 'ENTRY', 'POST_003', 'LEVEL_002', 'FULL_TIME', '苏州', '苏州', 1767225600000, 1767225600000, 1767225600000, NULL, 1767225600000, NULL, NULL, NULL, 7, 1, NULL, '{}', 1779768290669, 1779768290669, 'MARKETING_CENTER', 'FORMAL');

-- 数据导入: WorkflowApproval
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (31, 19, 'LABORHOURREPORT202605272044472942', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 测试', 1779886164949, 1779885887354, 1779886164950);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (32, 19, 'LABORHOURREPORT202605272044472942', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 测试', 1779886164954, 1779885887354, 1779886164955);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (33, 20, 'LABORHOURREPORT202605272057367463', 7, '2_node_1779768506311', '审批', '0', 7, '张三', '[{"id":7,"name":"张三"}]', 0, '', 'PENDING', NULL, NULL, 1779886656955, 1779886656955);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (34, 20, 'LABORHOURREPORT202605272057367463', 6, '2_node_1779768487334', '审批', '0', 0, '无审批人', '[]', 0, '', 'PENDING', NULL, NULL, 1779886656962, 1779886656962);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (35, 21, 'LABORHOURREPORT202605272117074348', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 测试', 1779889073631, 1779887827224, 1779889073632);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (36, 21, 'LABORHOURREPORT202605272117074348', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 测试', 1779889073627, 1779887827231, 1779889073628);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (37, 22, 'LABORHOURREPORT202605280041286075', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 测试', 1779900101720, 1779900088794, 1779900101721);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (38, 22, 'LABORHOURREPORT202605280041286075', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 测试', 1779900101717, 1779900088800, 1779900101718);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (39, 23, 'LABORHOURREPORT202605280049025892', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 测试', 1779900620506, 1779900542733, 1779900620507);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (40, 23, 'LABORHOURREPORT202605280049025892', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 测试', 1779900620504, 1779900542735, 1779900620504);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (41, 24, 'LABORHOURREPORT202605280049461497', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 测试', 1779900611686, 1779900586967, 1779900611687);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (42, 24, 'LABORHOURREPORT202605280049461497', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 测试', 1779900611682, 1779900586975, 1779900611683);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (43, 25, 'LABORHOURREPORT202605280101346647', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 111', 1779901305160, 1779901294911, 1779901305161);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (44, 25, 'LABORHOURREPORT202605280101346647', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 111', 1779901305163, 1779901294918, 1779901305163);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (45, 26, 'LABORHOURREPORT202605280102226291', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 111', 1779901361859, 1779901342367, 1779901361860);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (46, 26, 'LABORHOURREPORT202605280102226291', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 111', 1779901361856, 1779901342368, 1779901361857);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (47, 27, 'LABORHOURREPORT202605280117067517', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: w', 1779902277323, 1779902226215, 1779902277324);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (48, 27, 'LABORHOURREPORT202605280117067517', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: w', 1779902277320, 1779902226222, 1779902277321);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (49, 28, 'LABORHOURREPORT202605280117414131', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 和', 1779902284868, 1779902261706, 1779902284869);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (50, 28, 'LABORHOURREPORT202605280117414131', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 和', 1779902284865, 1779902261713, 1779902284865);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (51, 29, 'LABORHOURREPORT202605280123409394', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: vv ', 1779902634288, 1779902620267, 1779902634288);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (52, 29, 'LABORHOURREPORT202605280123409394', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: vv ', 1779902634290, 1779902620273, 1779902634291);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (53, 30, 'LABORHOURREPORT202605280127205493', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 你奶奶', 1779903109678, 1779902840554, 1779903109679);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (54, 30, 'LABORHOURREPORT202605280127205493', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 你奶奶', 1779903109675, 1779902840560, 1779903109676);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (55, 31, 'LABORHOURREPORT202605280131340399', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 你奶奶', 1779903119481, 1779903094557, 1779903119482);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (56, 31, 'LABORHOURREPORT202605280131340399', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 你奶奶', 1779903119478, 1779903094557, 1779903119479);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (57, 32, 'LABORHOURREPORT202605281130494738', 6, '2_node_1779768487334', '审批', '0', 0, '无审批人', '[]', 0, '', 'PENDING', NULL, NULL, 1779939049836, 1779939049836);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (58, 32, 'LABORHOURREPORT202605281130494738', 7, '2_node_1779768506311', '审批', '0', 7, '张三', '[{"id":7,"name":"张三"}]', 0, '', 'PENDING', NULL, NULL, 1779939049838, 1779939049838);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (59, 33, 'LABORHOURREPORT202605281134199562', 7, '2_node_1779768506311', '审批', '0', 7, '张三', '[{"id":7,"name":"张三"}]', 0, '', 'PENDING', NULL, NULL, 1779939259807, 1779939259807);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (60, 33, 'LABORHOURREPORT202605281134199562', 6, '2_node_1779768487334', '审批', '0', 0, '无审批人', '[]', 0, '', 'PENDING', NULL, NULL, 1779939259813, 1779939259813);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (61, 34, 'LABORHOURREPORT202605281134295123', 7, '2_node_1779768506311', '审批', '0', 7, '张三', '[{"id":7,"name":"张三"}]', 0, '', 'PENDING', NULL, NULL, 1779939269932, 1779939269932);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (62, 34, 'LABORHOURREPORT202605281134295123', 6, '2_node_1779768487334', '审批', '0', 0, '无审批人', '[]', 0, '', 'PENDING', NULL, NULL, 1779939269933, 1779939269933);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (63, 35, 'LABORHOURREPORT202605281137135900', 7, '2_node_1779768506311', '审批', '0', 7, '张三', '[{"id":7,"name":"张三"}]', 0, '', 'PENDING', NULL, NULL, 1779939433674, 1779939433674);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (64, 35, 'LABORHOURREPORT202605281137135900', 6, '2_node_1779768487334', '审批', '0', 0, '无审批人', '[]', 0, '', 'PENDING', NULL, NULL, 1779939433682, 1779939433682);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (65, 36, 'LABORHOURREPORT202605281425195482', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 测试', 1779949535932, 1779949519738, 1779949535932);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (66, 36, 'LABORHOURREPORT202605281425195482', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 测试', 1779949535926, 1779949519741, 1779949535927);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (67, 37, 'LABORHOURREPORT202605281427143197', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 存储', 1779949648805, 1779949634203, 1779949648806);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (68, 37, 'LABORHOURREPORT202605281427143197', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 存储', 1779949648802, 1779949634204, 1779949648803);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (69, 38, 'LABORHOURREPORT202605282113286391', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 问我', 1779974030545, 1779974008680, 1779974030546);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (70, 38, 'LABORHOURREPORT202605282113286391', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 问我', 1779974030540, 1779974008682, 1779974030541);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (71, 39, 'LABORHOURREPORT202605282121531287', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 11', 1779974531073, 1779974513017, 1779974531074);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (72, 39, 'LABORHOURREPORT202605282121531287', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 11', 1779974531069, 1779974513020, 1779974531070);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (73, 40, 'LABORHOURREPORT202605282126027198', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779974780121, 1779974762163, 1779974780122);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (74, 40, 'LABORHOURREPORT202605282126027198', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779974780119, 1779974762164, 1779974780120);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (75, 41, 'LABORHOURREPORT202605282130491222', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779975064819, 1779975049195, 1779975064820);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (76, 41, 'LABORHOURREPORT202605282130491222', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779975064822, 1779975049197, 1779975064823);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (77, 42, 'LABORHOURREPORT202605282134299494', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779975286988, 1779975269211, 1779975286989);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (78, 42, 'LABORHOURREPORT202605282134299494', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779975286984, 1779975269211, 1779975286985);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (79, 43, 'LABORHOURREPORT202605282142088180', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779975742370, 1779975728309, 1779975742371);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (80, 43, 'LABORHOURREPORT202605282142088180', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779975742367, 1779975728310, 1779975742368);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (81, 44, 'LABORHOURREPORT202605282144094944', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779975934840, 1779975849808, 1779975934841);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (82, 44, 'LABORHOURREPORT202605282144094944', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779975934844, 1779975849809, 1779975934844);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (83, 45, 'LABORHOURREPORT202605282144477537', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779975920772, 1779975887599, 1779975920773);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (84, 45, 'LABORHOURREPORT202605282144477537', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779975920770, 1779975887599, 1779975920770);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (85, 46, 'LABORHOURREPORT202605282152352369', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779976389255, 1779976355372, 1779976389256);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (86, 46, 'LABORHOURREPORT202605282152352369', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779976389252, 1779976355372, 1779976389253);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (87, 47, 'LABORHOURREPORT202605282354253463', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779983676453, 1779983665607, 1779983676454);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (88, 47, 'LABORHOURREPORT202605282354253463', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779983676450, 1779983665607, 1779983676451);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (89, 48, 'LABORHOURREPORT202605290004485875', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779984304645, 1779984288846, 1779984304646);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (90, 48, 'LABORHOURREPORT202605290004485875', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779984304648, 1779984288847, 1779984304648);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (91, 49, 'LABORHOURREPORT202605290009215686', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779984627717, 1779984561226, 1779984627718);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (92, 49, 'LABORHOURREPORT202605290009215686', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779984627713, 1779984561226, 1779984627714);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (93, 50, 'LABORHOURREPORT202605290010029268', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779984620958, 1779984602828, 1779984620959);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (94, 50, 'LABORHOURREPORT202605290010029268', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779984620954, 1779984602828, 1779984620955);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (95, 51, 'LABORHOURREPORT202605290012565560', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779984790825, 1779984776173, 1779984790826);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (96, 51, 'LABORHOURREPORT202605290012565560', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 1', 1779984790822, 1779984776174, 1779984790823);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (97, 52, 'LABORHOURREPORT202605290014506990', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: LABOR202605290014507371', 1779984905216, 1779984890581, 1779984905217);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (98, 52, 'LABORHOURREPORT202605290014506990', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: LABOR202605290014507371', 1779984905213, 1779984890581, 1779984905214);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (99, 53, 'LABORHOURREPORT202605290016561554', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 11', 1779985563099, 1779985016442, 1779985563101);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (100, 53, 'LABORHOURREPORT202605290016561554', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 11', 1779985563095, 1779985016443, 1779985563096);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (101, 54, 'LABORHOURREPORT202605290024339270', 7, '2_node_1779768506311', '审批', '0', 1, '系统管理员（强制通过）', '[{"id":7,"name":"张三"}]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 11', 1779985488576, 1779985473917, 1779985488577);
INSERT INTO "WorkflowApproval" ("id", "instanceId", "instanceNo", "nodeId", "nodeCode", "nodeName", "step", "approverId", "approverName", "approvers", "needAllApprove", "action", "status", "comment", "approvedAt", "createdAt", "updatedAt") VALUES (102, 54, 'LABORHOURREPORT202605290024339270', 6, '2_node_1779768487334', '审批', '0', 1, '系统管理员（强制通过）', '[]', 0, 'APPROVED', 'APPROVED', '[强制通过] 系统管理员: 11', 1779985488572, 1779985473918, 1779985488573);

-- 数据导入: WorkflowDefinition
INSERT INTO "WorkflowDefinition" ("id", "code", "name", "description", "category", "version", "versionString", "status", "formConfig", "flowConfig", "isSystem", "publishedAt", "createdById", "createdByName", "updatedById", "updatedByName", "createdAt", "updatedAt", "deletedAt") VALUES (1, 'LABOR_HOUR_REPORT_V1779768525442', '工时报工流程', NULL, 'LABOR_HOUR_REPORT', 1, '1', 'PUBLISHED', '{}', '{"nodes":[{"id":"node_1779768483248","type":"start","position":{"x":36.70702633550877,"y":241.2377809314895},"data":{"label":"开始"}},{"id":"node_1779768487334","type":"approval","position":{"x":252.76865527586367,"y":212.88371175003405},"data":{"label":"审批","needAllApprove":false,"approverStrategy":[2]}},{"id":"node_1779768506311","type":"approval","position":{"x":536.0297298287647,"y":214.66504590836655},"data":{"label":"审批","needAllApprove":false,"approverStrategy":[1]}},{"id":"node_1779768518936","type":"end","position":{"x":529.8386545547635,"y":417.45263641226904},"data":{"label":"结束"}}],"edges":[{"id":"edge_1779768491770","source":"node_1779768483248","target":"node_1779768487334","label":""},{"id":"edge_1779768510364","source":"node_1779768487334","target":"node_1779768506311","label":""},{"id":"edge_1779768523938","source":"node_1779768506311","target":"node_1779768518936","label":""}]}', 0, 1779768528387, 1, '系统管理员', NULL, NULL, 1779768525453, 1779768528387, NULL);
INSERT INTO "WorkflowDefinition" ("id", "code", "name", "description", "category", "version", "versionString", "status", "formConfig", "flowConfig", "isSystem", "publishedAt", "createdById", "createdByName", "updatedById", "updatedByName", "createdAt", "updatedAt", "deletedAt") VALUES (2, 'LABOR_HOUR_REPORT_V1779858051309', '工时报工流程', NULL, 'LABOR_HOUR_REPORT', 1, '1', 'PUBLISHED', '{}', '{"nodes":[{"id":"node_1779768483248","type":"start","position":{"x":36.70702633550877,"y":241.2377809314895},"data":{"label":"开始"}},{"id":"node_1779768487334","type":"approval","position":{"x":252.76865527586367,"y":212.88371175003405},"data":{"label":"审批","needAllApprove":false,"approverStrategy":["A002"]}},{"id":"node_1779768506311","type":"approval","position":{"x":536.0297298287647,"y":214.66504590836655},"data":{"label":"审批","needAllApprove":false,"approverStrategy":["A001"]}},{"id":"node_1779768518936","type":"end","position":{"x":529.8386545547635,"y":417.45263641226904},"data":{"label":"结束"}}],"edges":[{"id":"edge_1779768491770","source":"node_1779768483248","target":"node_1779768487334","label":""},{"id":"edge_1779768510364","source":"node_1779768487334","target":"node_1779768506311","label":""},{"id":"edge_1779768523938","source":"node_1779768506311","target":"node_1779768518936","label":""}]}', 0, 1779858059535, 1, '系统管理员', NULL, NULL, 1779858051325, 1779858059536, NULL);

-- 数据导入: WorkflowEdge
INSERT INTO "WorkflowEdge" ("id", "workflowId", "sourceNodeId", "targetNodeId", "condition", "label", "createdAt", "updatedAt") VALUES (1, 1, 1, 2, 'default', '', 1779768525460, 1779768525460);
INSERT INTO "WorkflowEdge" ("id", "workflowId", "sourceNodeId", "targetNodeId", "condition", "label", "createdAt", "updatedAt") VALUES (2, 1, 2, 3, 'default', '', 1779768525462, 1779768525462);
INSERT INTO "WorkflowEdge" ("id", "workflowId", "sourceNodeId", "targetNodeId", "condition", "label", "createdAt", "updatedAt") VALUES (3, 1, 3, 4, 'default', '', 1779768525465, 1779768525465);
INSERT INTO "WorkflowEdge" ("id", "workflowId", "sourceNodeId", "targetNodeId", "condition", "label", "createdAt", "updatedAt") VALUES (4, 2, 5, 6, 'default', '', 1779858051335, 1779858051335);
INSERT INTO "WorkflowEdge" ("id", "workflowId", "sourceNodeId", "targetNodeId", "condition", "label", "createdAt", "updatedAt") VALUES (5, 2, 6, 7, 'default', '', 1779858051339, 1779858051339);
INSERT INTO "WorkflowEdge" ("id", "workflowId", "sourceNodeId", "targetNodeId", "condition", "label", "createdAt", "updatedAt") VALUES (6, 2, 7, 8, 'default', '', 1779858051343, 1779858051343);

-- 数据导入: WorkflowInstance
INSERT INTO "WorkflowInstance" ("id", "workflowId", "instanceNo", "title", "category", "status", "initiatorId", "initiatorName", "initiatorOrgId", "initiatorOrgName", "currentStep", "data", "initiatedAt", "startTime", "finishedAt", "endTime", "createdAt", "updatedAt", "deletedAt") VALUES (42, 2, 'LABORHOURREPORT202605282134299494', 'Aaron.he - 作业工时 - 2026-05-28', 'LABOR_HOUR_REPORT', 'COMPLETED', 1, '系统管理员', 1, '默认组织', NULL, '{"requestNo":"LABOR202605282134298487","reportMode":"personal","hourType":"A06","value":2}', 1779975269202, 1779975269202, 1779975286992, 1779975286992, 1779975269203, 1779975286993, NULL);
INSERT INTO "WorkflowInstance" ("id", "workflowId", "instanceNo", "title", "category", "status", "initiatorId", "initiatorName", "initiatorOrgId", "initiatorOrgName", "currentStep", "data", "initiatedAt", "startTime", "finishedAt", "endTime", "createdAt", "updatedAt", "deletedAt") VALUES (43, 2, 'LABORHOURREPORT202605282142088180', '团队报工(4人) - 分摊工时 - 2026-05-28', 'LABOR_HOUR_REPORT', 'COMPLETED', 1, '系统管理员', 1, '默认组织', NULL, '{"requestNo":"LABOR202605282142089870","reportMode":"team","hourType":"A05","value":3}', 1779975728300, 1779975728300, 1779975742373, 1779975742373, 1779975728301, 1779975742374, NULL);
INSERT INTO "WorkflowInstance" ("id", "workflowId", "instanceNo", "title", "category", "status", "initiatorId", "initiatorName", "initiatorOrgId", "initiatorOrgName", "currentStep", "data", "initiatedAt", "startTime", "finishedAt", "endTime", "createdAt", "updatedAt", "deletedAt") VALUES (44, 2, 'LABORHOURREPORT202605282144094944', '团队报工(5人) - 作业工时 - 2026-05-28', 'LABOR_HOUR_REPORT', 'COMPLETED', 1, '系统管理员', 1, '默认组织', NULL, '{"requestNo":"LABOR202605282144099948","reportMode":"team","hourType":"A06","value":3}', 1779975849796, 1779975849796, 1779975934847, 1779975934847, 1779975849797, 1779975934848, NULL);
INSERT INTO "WorkflowInstance" ("id", "workflowId", "instanceNo", "title", "category", "status", "initiatorId", "initiatorName", "initiatorOrgId", "initiatorOrgName", "currentStep", "data", "initiatedAt", "startTime", "finishedAt", "endTime", "createdAt", "updatedAt", "deletedAt") VALUES (45, 2, 'LABORHOURREPORT202605282144477537', '团队报工(4人) - 线体工时 - 2026-05-28', 'LABOR_HOUR_REPORT', 'COMPLETED', 1, '系统管理员', 1, '默认组织', NULL, '{"requestNo":"LABOR202605282144479578","reportMode":"team","hourType":"A01","value":2}', 1779975887564, 1779975887564, 1779975920775, 1779975920775, 1779975887565, 1779975920776, NULL);
INSERT INTO "WorkflowInstance" ("id", "workflowId", "instanceNo", "title", "category", "status", "initiatorId", "initiatorName", "initiatorOrgId", "initiatorOrgName", "currentStep", "data", "initiatedAt", "startTime", "finishedAt", "endTime", "createdAt", "updatedAt", "deletedAt") VALUES (46, 2, 'LABORHOURREPORT202605282152352369', '团队报工(4人) - 线体工时 - 2026-05-28', 'LABOR_HOUR_REPORT', 'COMPLETED', 1, '系统管理员', 1, '默认组织', NULL, '{"requestNo":"LABOR202605282152350623","reportMode":"team","hourType":"A01","value":2}', 1779976355334, 1779976355334, 1779976389258, 1779976389258, 1779976355353, 1779976389259, NULL);
INSERT INTO "WorkflowInstance" ("id", "workflowId", "instanceNo", "title", "category", "status", "initiatorId", "initiatorName", "initiatorOrgId", "initiatorOrgName", "currentStep", "data", "initiatedAt", "startTime", "finishedAt", "endTime", "createdAt", "updatedAt", "deletedAt") VALUES (47, 2, 'LABORHOURREPORT202605282354253463', '张三 - 作业工时 - 2026-05-28', 'LABOR_HOUR_REPORT', 'COMPLETED', 1, '系统管理员', 1, '默认组织', NULL, '{"requestNo":"LABOR202605282354253068","reportMode":"personal","hourType":"A06","value":4}', 1779983665597, 1779983665597, 1779983676456, 1779983676456, 1779983665598, 1779983676457, NULL);
INSERT INTO "WorkflowInstance" ("id", "workflowId", "instanceNo", "title", "category", "status", "initiatorId", "initiatorName", "initiatorOrgId", "initiatorOrgName", "currentStep", "data", "initiatedAt", "startTime", "finishedAt", "endTime", "createdAt", "updatedAt", "deletedAt") VALUES (48, 2, 'LABORHOURREPORT202605290004485875', '张三 - 作业工时 - 2026-05-28', 'LABOR_HOUR_REPORT', 'COMPLETED', 1, '系统管理员', 1, '默认组织', NULL, '{"requestNo":"LABOR202605290004482948","reportMode":"personal","hourType":"A06","value":2}', 1779984288840, 1779984288840, 1779984304650, 1779984304650, 1779984288841, 1779984304651, NULL);
INSERT INTO "WorkflowInstance" ("id", "workflowId", "instanceNo", "title", "category", "status", "initiatorId", "initiatorName", "initiatorOrgId", "initiatorOrgName", "currentStep", "data", "initiatedAt", "startTime", "finishedAt", "endTime", "createdAt", "updatedAt", "deletedAt") VALUES (49, 2, 'LABORHOURREPORT202605290009215686', '张三 - 作业工时 - 2026-05-28', 'LABOR_HOUR_REPORT', 'COMPLETED', 1, '系统管理员', 1, '默认组织', NULL, '{"requestNo":"LABOR202605290009219775","reportMode":"personal","hourType":"A06","value":2}', 1779984561209, 1779984561209, 1779984627721, 1779984627721, 1779984561210, 1779984627722, NULL);
INSERT INTO "WorkflowInstance" ("id", "workflowId", "instanceNo", "title", "category", "status", "initiatorId", "initiatorName", "initiatorOrgId", "initiatorOrgName", "currentStep", "data", "initiatedAt", "startTime", "finishedAt", "endTime", "createdAt", "updatedAt", "deletedAt") VALUES (50, 2, 'LABORHOURREPORT202605290010029268', '张三 - 作业工时 - 2026-05-28', 'LABOR_HOUR_REPORT', 'COMPLETED', 1, '系统管理员', 1, '默认组织', NULL, '{"requestNo":"LABOR202605290010023697","reportMode":"personal","hourType":"A06","value":2}', 1779984602819, 1779984602819, 1779984620961, 1779984620961, 1779984602820, 1779984620962, NULL);
INSERT INTO "WorkflowInstance" ("id", "workflowId", "instanceNo", "title", "category", "status", "initiatorId", "initiatorName", "initiatorOrgId", "initiatorOrgName", "currentStep", "data", "initiatedAt", "startTime", "finishedAt", "endTime", "createdAt", "updatedAt", "deletedAt") VALUES (51, 2, 'LABORHOURREPORT202605290012565560', '张三 - 作业工时 - 2026-05-28', 'LABOR_HOUR_REPORT', 'COMPLETED', 1, '系统管理员', 1, '默认组织', NULL, '{"requestNo":"LABOR202605290012568606","reportMode":"personal","hourType":"A06","value":2}', 1779984776162, 1779984776162, 1779984790829, 1779984790829, 1779984776163, 1779984790830, NULL);
INSERT INTO "WorkflowInstance" ("id", "workflowId", "instanceNo", "title", "category", "status", "initiatorId", "initiatorName", "initiatorOrgId", "initiatorOrgName", "currentStep", "data", "initiatedAt", "startTime", "finishedAt", "endTime", "createdAt", "updatedAt", "deletedAt") VALUES (52, 2, 'LABORHOURREPORT202605290014506990', '张三 - 作业工时 - 2026-05-29', 'LABOR_HOUR_REPORT', 'COMPLETED', 1, '系统管理员', 1, '默认组织', NULL, '{"requestNo":"LABOR202605290014507371","reportMode":"personal","hourType":"A06","value":2}', 1779984890572, 1779984890572, 1779984905221, 1779984905221, 1779984890573, 1779984905221, NULL);
INSERT INTO "WorkflowInstance" ("id", "workflowId", "instanceNo", "title", "category", "status", "initiatorId", "initiatorName", "initiatorOrgId", "initiatorOrgName", "currentStep", "data", "initiatedAt", "startTime", "finishedAt", "endTime", "createdAt", "updatedAt", "deletedAt") VALUES (53, 2, 'LABORHOURREPORT202605290016561554', '团队报工(4人) - 作业工时 - 2026-05-28', 'LABOR_HOUR_REPORT', 'COMPLETED', 1, '系统管理员', 1, '默认组织', NULL, '{"requestNo":"LABOR202605290016561181","reportMode":"team","hourType":"A06","value":2}', 1779985016432, 1779985016432, 1779985563104, 1779985563104, 1779985016434, 1779985563105, NULL);
INSERT INTO "WorkflowInstance" ("id", "workflowId", "instanceNo", "title", "category", "status", "initiatorId", "initiatorName", "initiatorOrgId", "initiatorOrgName", "currentStep", "data", "initiatedAt", "startTime", "finishedAt", "endTime", "createdAt", "updatedAt", "deletedAt") VALUES (54, 2, 'LABORHOURREPORT202605290024339270', '张三 - 作业工时 - 2026-05-28', 'LABOR_HOUR_REPORT', 'COMPLETED', 1, '系统管理员', 1, '默认组织', NULL, '{"requestNo":"LABOR202605290024338974","reportMode":"personal","hourType":"A06","value":1}', 1779985473907, 1779985473907, 1779985488579, 1779985488579, 1779985473908, 1779985488580, NULL);

-- 数据导入: WorkflowNode
INSERT INTO "WorkflowNode" ("id", "workflowId", "nodeCode", "nodeType", "nodeName", "needAllApprove", "approverStrategy", "approverConfig", "ccStrategy", "conditionConfig", "formPermission", "sortOrder", "status", "createdAt", "updatedAt") VALUES (1, 1, '1_node_1779768483248', 'start', '开始', 0, NULL, NULL, NULL, NULL, NULL, 0, 'ACTIVE', 1779768525455, 1779768525455);
INSERT INTO "WorkflowNode" ("id", "workflowId", "nodeCode", "nodeType", "nodeName", "needAllApprove", "approverStrategy", "approverConfig", "ccStrategy", "conditionConfig", "formPermission", "sortOrder", "status", "createdAt", "updatedAt") VALUES (2, 1, '1_node_1779768487334', 'approval', '审批', 0, '[2]', NULL, NULL, NULL, NULL, 1, 'ACTIVE', 1779768525456, 1779768525456);
INSERT INTO "WorkflowNode" ("id", "workflowId", "nodeCode", "nodeType", "nodeName", "needAllApprove", "approverStrategy", "approverConfig", "ccStrategy", "conditionConfig", "formPermission", "sortOrder", "status", "createdAt", "updatedAt") VALUES (3, 1, '1_node_1779768506311', 'approval', '审批', 0, '[1]', NULL, NULL, NULL, NULL, 2, 'ACTIVE', 1779768525457, 1779768525457);
INSERT INTO "WorkflowNode" ("id", "workflowId", "nodeCode", "nodeType", "nodeName", "needAllApprove", "approverStrategy", "approverConfig", "ccStrategy", "conditionConfig", "formPermission", "sortOrder", "status", "createdAt", "updatedAt") VALUES (4, 1, '1_node_1779768518936', 'end', '结束', 0, NULL, NULL, NULL, NULL, NULL, 0, 'ACTIVE', 1779768525458, 1779768525458);
INSERT INTO "WorkflowNode" ("id", "workflowId", "nodeCode", "nodeType", "nodeName", "needAllApprove", "approverStrategy", "approverConfig", "ccStrategy", "conditionConfig", "formPermission", "sortOrder", "status", "createdAt", "updatedAt") VALUES (5, 2, '2_node_1779768483248', 'start', '开始', 0, NULL, NULL, NULL, NULL, NULL, 0, 'ACTIVE', 1779858051327, 1779858051327);
INSERT INTO "WorkflowNode" ("id", "workflowId", "nodeCode", "nodeType", "nodeName", "needAllApprove", "approverStrategy", "approverConfig", "ccStrategy", "conditionConfig", "formPermission", "sortOrder", "status", "createdAt", "updatedAt") VALUES (6, 2, '2_node_1779768487334', 'approval', '审批', 0, '["A002"]', NULL, NULL, NULL, NULL, 0, 'ACTIVE', 1779858051329, 1779858051329);
INSERT INTO "WorkflowNode" ("id", "workflowId", "nodeCode", "nodeType", "nodeName", "needAllApprove", "approverStrategy", "approverConfig", "ccStrategy", "conditionConfig", "formPermission", "sortOrder", "status", "createdAt", "updatedAt") VALUES (7, 2, '2_node_1779768506311', 'approval', '审批', 0, '["A001"]', NULL, NULL, NULL, NULL, 0, 'ACTIVE', 1779858051331, 1779858051331);
INSERT INTO "WorkflowNode" ("id", "workflowId", "nodeCode", "nodeType", "nodeName", "needAllApprove", "approverStrategy", "approverConfig", "ccStrategy", "conditionConfig", "formPermission", "sortOrder", "status", "createdAt", "updatedAt") VALUES (8, 2, '2_node_1779768518936', 'end', '结束', 0, NULL, NULL, NULL, NULL, NULL, 0, 'ACTIVE', 1779858051332, 1779858051332);


-- 提交事务
COMMIT;

-- 恢复触发器
SET session_replication_role = 'origin';

-- 分析表统计信息
ANALYZE;

-- ==========================================
-- 导出完成
-- ==========================================