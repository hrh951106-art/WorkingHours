-- =====================================================
-- PostgreSQL Schema Export (表结构定义)
-- 生成时间: 2026-06-01 18:09:12
-- =====================================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;


-- =====================================================
-- Table: AccountHierarchyConfig
-- =====================================================

DROP TABLE IF EXISTS "AccountHierarchyConfig" CASCADE;

CREATE TABLE "AccountHierarchyConfig" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "AccountHierarchyConfig_code_key" ON "AccountHierarchyConfig"("code");


-- =====================================================
-- Table: AccountHierarchyLevelDetail
-- =====================================================

DROP TABLE IF EXISTS "AccountHierarchyLevelDetail" CASCADE;

CREATE TABLE "AccountHierarchyLevelDetail" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "AccountHierarchyLevelDetail_configId_idx" ON "AccountHierarchyLevelDetail"("configId");


-- =====================================================
-- Table: AllocationBasis
-- =====================================================

DROP TABLE IF EXISTS "AllocationBasis" CASCADE;

CREATE TABLE "AllocationBasis" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "AllocationBasis_basisCode_key" ON "AllocationBasis"("basisCode");
CREATE INDEX "AllocationBasis_status_idx" ON "AllocationBasis"("status");


-- =====================================================
-- Table: AllocationConfig
-- =====================================================

DROP TABLE IF EXISTS "AllocationConfig" CASCADE;

CREATE TABLE "AllocationConfig" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "AllocationConfig_configCode_key" ON "AllocationConfig"("configCode");


-- =====================================================
-- Table: AllocationGeneralConfig
-- =====================================================

DROP TABLE IF EXISTS "AllocationGeneralConfig" CASCADE;

CREATE TABLE "AllocationGeneralConfig" (
  "id" SERIAL NOT NULL,
  "actualHoursAllocationCode" TEXT NOT NULL,
  "indirectHoursAllocationCode" TEXT NOT NULL,
  "description" TEXT,
  "updatedById" INTEGER,
  "updatedByName" TEXT,
  "updatedAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);



-- =====================================================
-- Table: AllocationResult
-- =====================================================

DROP TABLE IF EXISTS "AllocationResult" CASCADE;

CREATE TABLE "AllocationResult" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "AllocationResult_batchNo_idx" ON "AllocationResult"("batchNo");
CREATE INDEX "AllocationResult_recordDate_idx" ON "AllocationResult"("recordDate");
CREATE INDEX "AllocationResult_configId_idx" ON "AllocationResult"("configId");
CREATE INDEX "AllocationResult_ruleId_idx" ON "AllocationResult"("ruleId");
CREATE INDEX "AllocationResult_calcResultId_idx" ON "AllocationResult"("calcResultId");
CREATE INDEX "AllocationResult_targetType_targetId_idx" ON "AllocationResult"("targetType", "targetId");
CREATE INDEX "AllocationResult_sourceEmployeeNo_idx" ON "AllocationResult"("sourceEmployeeNo");
CREATE INDEX "AllocationResult_calcTime_idx" ON "AllocationResult"("calcTime");


-- =====================================================
-- Table: AllocationRuleConfig
-- =====================================================

DROP TABLE IF EXISTS "AllocationRuleConfig" CASCADE;

CREATE TABLE "AllocationRuleConfig" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "AllocationRuleConfig_configId_idx" ON "AllocationRuleConfig"("configId");
CREATE INDEX "AllocationRuleConfig_status_idx" ON "AllocationRuleConfig"("status");


-- =====================================================
-- Table: AllocationRuleTarget
-- =====================================================

DROP TABLE IF EXISTS "AllocationRuleTarget" CASCADE;

CREATE TABLE "AllocationRuleTarget" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "AllocationRuleTarget_ruleId_idx" ON "AllocationRuleTarget"("ruleId");
CREATE INDEX "AllocationRuleTarget_targetType_targetId_idx" ON "AllocationRuleTarget"("targetType", "targetId");


-- =====================================================
-- Table: AllocationSourceConfig
-- =====================================================

DROP TABLE IF EXISTS "AllocationSourceConfig" CASCADE;

CREATE TABLE "AllocationSourceConfig" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "AllocationSourceConfig_configId_key" ON "AllocationSourceConfig"("configId");


-- =====================================================
-- Table: AllocationWorkHour
-- =====================================================

DROP TABLE IF EXISTS "AllocationWorkHour" CASCADE;

CREATE TABLE "AllocationWorkHour" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "AllocationWorkHour_batchNo_idx" ON "AllocationWorkHour"("batchNo");
CREATE INDEX "AllocationWorkHour_recordDate_idx" ON "AllocationWorkHour"("recordDate");
CREATE INDEX "AllocationWorkHour_configId_idx" ON "AllocationWorkHour"("configId");
CREATE INDEX "AllocationWorkHour_sourceEmployeeNo_idx" ON "AllocationWorkHour"("sourceEmployeeNo");
CREATE INDEX "AllocationWorkHour_calcTime_idx" ON "AllocationWorkHour"("calcTime");
CREATE INDEX "AllocationWorkHour_deletedAt_idx" ON "AllocationWorkHour"("deletedAt");
CREATE INDEX "AllocationWorkHour_definitionAttendanceCodeId_idx" ON "AllocationWorkHour"("definitionAttendanceCodeId");


-- =====================================================
-- Table: AmountPolicy
-- =====================================================

DROP TABLE IF EXISTS "AmountPolicy" CASCADE;

CREATE TABLE "AmountPolicy" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "AmountPolicy_code_key" ON "AmountPolicy"("code");
CREATE INDEX "AmountPolicy_status_idx" ON "AmountPolicy"("status");
CREATE INDEX "AmountPolicy_priority_idx" ON "AmountPolicy"("priority");
CREATE INDEX "AmountPolicy_deletedAt_idx" ON "AmountPolicy"("deletedAt");


-- =====================================================
-- Table: AmountPolicyGroup
-- =====================================================

DROP TABLE IF EXISTS "AmountPolicyGroup" CASCADE;

CREATE TABLE "AmountPolicyGroup" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "AmountPolicyGroup_code_key" ON "AmountPolicyGroup"("code");
CREATE INDEX "AmountPolicyGroup_status_idx" ON "AmountPolicyGroup"("status");
CREATE INDEX "AmountPolicyGroup_deletedAt_idx" ON "AmountPolicyGroup"("deletedAt");


-- =====================================================
-- Table: AttendanceCode
-- =====================================================

DROP TABLE IF EXISTS "AttendanceCode" CASCADE;

CREATE TABLE "AttendanceCode" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "AttendanceCode_code_key" ON "AttendanceCode"("code");


-- =====================================================
-- Table: AttendancePunchPair
-- =====================================================

DROP TABLE IF EXISTS "AttendancePunchPair" CASCADE;

CREATE TABLE "AttendancePunchPair" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "AttendancePunchPair_employeeNo_punchDate_idx" ON "AttendancePunchPair"("employeeNo", "punchDate");
CREATE INDEX "AttendancePunchPair_punchDate_idx" ON "AttendancePunchPair"("punchDate");
CREATE INDEX "AttendancePunchPair_status_idx" ON "AttendancePunchPair"("status");
CREATE INDEX "AttendancePunchPair_accountId_idx" ON "AttendancePunchPair"("accountId");


-- =====================================================
-- Table: AttendanceRuleGroup
-- =====================================================

DROP TABLE IF EXISTS "AttendanceRuleGroup" CASCADE;

CREATE TABLE "AttendanceRuleGroup" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "AttendanceRuleGroup_code_key" ON "AttendanceRuleGroup"("code");
CREATE INDEX "AttendanceRuleGroup_status_idx" ON "AttendanceRuleGroup"("status");
CREATE INDEX "AttendanceRuleGroup_isDefault_idx" ON "AttendanceRuleGroup"("isDefault");
CREATE INDEX "AttendanceRuleGroup_deletedAt_idx" ON "AttendanceRuleGroup"("deletedAt");


-- =====================================================
-- Table: AttendanceRuleGroupDetail
-- =====================================================

DROP TABLE IF EXISTS "AttendanceRuleGroupDetail" CASCADE;

CREATE TABLE "AttendanceRuleGroupDetail" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "AttendanceRuleGroupDetail_ruleGroupId_idx" ON "AttendanceRuleGroupDetail"("ruleGroupId");


-- =====================================================
-- Table: AuditLog
-- =====================================================

DROP TABLE IF EXISTS "AuditLog" CASCADE;

CREATE TABLE "AuditLog" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");
CREATE INDEX "AuditLog_operatorId_idx" ON "AuditLog"("operatorId");
CREATE INDEX "AuditLog_operationTime_idx" ON "AuditLog"("operationTime");
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");


-- =====================================================
-- Table: BiReport
-- =====================================================

DROP TABLE IF EXISTS "BiReport" CASCADE;

CREATE TABLE "BiReport" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "BiReport_code_key" ON "BiReport"("code");
CREATE INDEX "BiReport_status_idx" ON "BiReport"("status");
CREATE INDEX "BiReport_category_idx" ON "BiReport"("category");
CREATE INDEX "BiReport_deletedAt_idx" ON "BiReport"("deletedAt");
CREATE INDEX "BiReport_modelId_idx" ON "BiReport"("modelId");


-- =====================================================
-- Table: BiReportAccessLog
-- =====================================================

DROP TABLE IF EXISTS "BiReportAccessLog" CASCADE;

CREATE TABLE "BiReportAccessLog" (
  "id" SERIAL NOT NULL,
  "reportId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "userName" TEXT,
  "accessType" TEXT NOT NULL,
  "accessTime" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  PRIMARY KEY ("id")
);

CREATE INDEX "BiReportAccessLog_reportId_idx" ON "BiReportAccessLog"("reportId");
CREATE INDEX "BiReportAccessLog_userId_idx" ON "BiReportAccessLog"("userId");
CREATE INDEX "BiReportAccessLog_accessTime_idx" ON "BiReportAccessLog"("accessTime");


-- =====================================================
-- Table: BiReportParameter
-- =====================================================

DROP TABLE IF EXISTS "BiReportParameter" CASCADE;

CREATE TABLE "BiReportParameter" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "BiReportParameter_reportId_idx" ON "BiReportParameter"("reportId");
CREATE INDEX "BiReportParameter_status_idx" ON "BiReportParameter"("status");
CREATE INDEX "BiReportParameter_deletedAt_idx" ON "BiReportParameter"("deletedAt");


-- =====================================================
-- Table: BiReportWidget
-- =====================================================

DROP TABLE IF EXISTS "BiReportWidget" CASCADE;

CREATE TABLE "BiReportWidget" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "BiReportWidget_reportId_idx" ON "BiReportWidget"("reportId");
CREATE INDEX "BiReportWidget_status_idx" ON "BiReportWidget"("status");
CREATE INDEX "BiReportWidget_deletedAt_idx" ON "BiReportWidget"("deletedAt");


-- =====================================================
-- Table: CalcResult
-- =====================================================

DROP TABLE IF EXISTS "CalcResult" CASCADE;

CREATE TABLE "CalcResult" (
  "id" SERIAL NOT NULL,
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



-- =====================================================
-- Table: CalcRule
-- =====================================================

DROP TABLE IF EXISTS "CalcRule" CASCADE;

CREATE TABLE "CalcRule" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "CalcRule_code_key" ON "CalcRule"("code");


-- =====================================================
-- Table: CalculationAttendanceCode
-- =====================================================

DROP TABLE IF EXISTS "CalculationAttendanceCode" CASCADE;

CREATE TABLE "CalculationAttendanceCode" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "CalculationAttendanceCode_code_key" ON "CalculationAttendanceCode"("code");
CREATE INDEX "CalculationAttendanceCode_status_idx" ON "CalculationAttendanceCode"("status");
CREATE INDEX "CalculationAttendanceCode_priority_idx" ON "CalculationAttendanceCode"("priority");


-- =====================================================
-- Table: CustomField
-- =====================================================

DROP TABLE IF EXISTS "CustomField" CASCADE;

CREATE TABLE "CustomField" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "CustomField_code_key" ON "CustomField"("code");


-- =====================================================
-- Table: DataScopeRule
-- =====================================================

DROP TABLE IF EXISTS "DataScopeRule" CASCADE;

CREATE TABLE "DataScopeRule" (
  "id" SERIAL NOT NULL,
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



-- =====================================================
-- Table: DataSource
-- =====================================================

DROP TABLE IF EXISTS "DataSource" CASCADE;

CREATE TABLE "DataSource" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "DataSource_code_key" ON "DataSource"("code");


-- =====================================================
-- Table: DataSourceOption
-- =====================================================

DROP TABLE IF EXISTS "DataSourceOption" CASCADE;

CREATE TABLE "DataSourceOption" (
  "id" SERIAL NOT NULL,
  "dataSourceId" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "sort" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DataSourceOption_dataSourceId_value_key" ON "DataSourceOption"("dataSourceId", "value");


-- =====================================================
-- Table: DefinitionAttendanceCode
-- =====================================================

DROP TABLE IF EXISTS "DefinitionAttendanceCode" CASCADE;

CREATE TABLE "DefinitionAttendanceCode" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "DefinitionAttendanceCode_code_key" ON "DefinitionAttendanceCode"("code");
CREATE INDEX "DefinitionAttendanceCode_status_idx" ON "DefinitionAttendanceCode"("status");
CREATE INDEX "DefinitionAttendanceCode_priority_idx" ON "DefinitionAttendanceCode"("priority");


-- =====================================================
-- Table: DeviceAccount
-- =====================================================

DROP TABLE IF EXISTS "DeviceAccount" CASCADE;

CREATE TABLE "DeviceAccount" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "DeviceAccount_deviceId_idx" ON "DeviceAccount"("deviceId");
CREATE INDEX "DeviceAccount_accountId_idx" ON "DeviceAccount"("accountId");
CREATE INDEX "DeviceAccount_effectiveDate_idx" ON "DeviceAccount"("effectiveDate");
CREATE INDEX "DeviceAccount_path_idx" ON "DeviceAccount"("path");
CREATE INDEX "DeviceAccount_namePath_idx" ON "DeviceAccount"("namePath");
CREATE UNIQUE INDEX "DeviceAccount_deviceId_accountId_effectiveDate_key" ON "DeviceAccount"("deviceId", "accountId", "effectiveDate");


-- =====================================================
-- Table: DeviceGroup
-- =====================================================

DROP TABLE IF EXISTS "DeviceGroup" CASCADE;

CREATE TABLE "DeviceGroup" (
  "id" SERIAL NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeviceGroup_code_key" ON "DeviceGroup"("code");


-- =====================================================
-- Table: EarnedHoursAllocationConfig
-- =====================================================

DROP TABLE IF EXISTS "EarnedHoursAllocationConfig" CASCADE;

CREATE TABLE "EarnedHoursAllocationConfig" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "EarnedHoursAllocationConfig_code_key" ON "EarnedHoursAllocationConfig"("code");
CREATE INDEX "EarnedHoursAllocationConfig_status_idx" ON "EarnedHoursAllocationConfig"("status");
CREATE INDEX "EarnedHoursAllocationConfig_orgId_idx" ON "EarnedHoursAllocationConfig"("orgId");
CREATE INDEX "EarnedHoursAllocationConfig_deletedAt_idx" ON "EarnedHoursAllocationConfig"("deletedAt");
CREATE INDEX "EarnedHoursAllocationConfig_code_idx" ON "EarnedHoursAllocationConfig"("code");


-- =====================================================
-- Table: EarnedHoursAllocationResult
-- =====================================================

DROP TABLE IF EXISTS "EarnedHoursAllocationResult" CASCADE;

CREATE TABLE "EarnedHoursAllocationResult" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "EarnedHoursAllocationResult_batchNo_idx" ON "EarnedHoursAllocationResult"("batchNo");
CREATE INDEX "EarnedHoursAllocationResult_recordDate_idx" ON "EarnedHoursAllocationResult"("recordDate");
CREATE INDEX "EarnedHoursAllocationResult_configId_idx" ON "EarnedHoursAllocationResult"("configId");
CREATE INDEX "EarnedHoursAllocationResult_ruleName_idx" ON "EarnedHoursAllocationResult"("ruleName");
CREATE INDEX "EarnedHoursAllocationResult_sourceEmployeeNo_idx" ON "EarnedHoursAllocationResult"("sourceEmployeeNo");
CREATE INDEX "EarnedHoursAllocationResult_calcTime_idx" ON "EarnedHoursAllocationResult"("calcTime");
CREATE INDEX "EarnedHoursAllocationResult_deletedAt_idx" ON "EarnedHoursAllocationResult"("deletedAt");


-- =====================================================
-- Table: Employee
-- =====================================================

DROP TABLE IF EXISTS "Employee" CASCADE;

CREATE TABLE "Employee" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "Employee_employeeNo_key" ON "Employee"("employeeNo");
CREATE UNIQUE INDEX "Employee_idCard_key" ON "Employee"("idCard");


-- =====================================================
-- Table: EmployeeAttendanceRuleGroup
-- =====================================================

DROP TABLE IF EXISTS "EmployeeAttendanceRuleGroup" CASCADE;

CREATE TABLE "EmployeeAttendanceRuleGroup" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "EmployeeAttendanceRuleGroup_employeeNo_idx" ON "EmployeeAttendanceRuleGroup"("employeeNo");
CREATE INDEX "EmployeeAttendanceRuleGroup_ruleGroupId_idx" ON "EmployeeAttendanceRuleGroup"("ruleGroupId");
CREATE INDEX "EmployeeAttendanceRuleGroup_effectiveDate_idx" ON "EmployeeAttendanceRuleGroup"("effectiveDate");
CREATE UNIQUE INDEX "EmployeeAttendanceRuleGroup_employeeNo_ruleGroupId_effectiveDate_key" ON "EmployeeAttendanceRuleGroup"("employeeNo", "ruleGroupId", "effectiveDate");


-- =====================================================
-- Table: EmployeeChangeLog
-- =====================================================

DROP TABLE IF EXISTS "EmployeeChangeLog" CASCADE;

CREATE TABLE "EmployeeChangeLog" (
  "id" SERIAL NOT NULL,
  "employeeId" INTEGER NOT NULL,
  "fieldName" TEXT NOT NULL,
  "oldValue" TEXT,
  "newValue" TEXT,
  "operatorId" INTEGER NOT NULL,
  "operatorName" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);



-- =====================================================
-- Table: EmployeeCoefficient
-- =====================================================

DROP TABLE IF EXISTS "EmployeeCoefficient" CASCADE;

CREATE TABLE "EmployeeCoefficient" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "EmployeeCoefficient_employeeNo_idx" ON "EmployeeCoefficient"("employeeNo");
CREATE INDEX "EmployeeCoefficient_coefficientType_idx" ON "EmployeeCoefficient"("coefficientType");
CREATE INDEX "EmployeeCoefficient_effectiveDate_idx" ON "EmployeeCoefficient"("effectiveDate");
CREATE UNIQUE INDEX "EmployeeCoefficient_employeeNo_coefficientType_effectiveDate_key" ON "EmployeeCoefficient"("employeeNo", "coefficientType", "effectiveDate");


-- =====================================================
-- Table: EmployeeEducation
-- =====================================================

DROP TABLE IF EXISTS "EmployeeEducation" CASCADE;

CREATE TABLE "EmployeeEducation" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "EmployeeEducation_employeeId_idx" ON "EmployeeEducation"("employeeId");
CREATE INDEX "EmployeeEducation_employeeId_isHighest_idx" ON "EmployeeEducation"("employeeId", "isHighest");


-- =====================================================
-- Table: EmployeeFamilyMember
-- =====================================================

DROP TABLE IF EXISTS "EmployeeFamilyMember" CASCADE;

CREATE TABLE "EmployeeFamilyMember" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "EmployeeFamilyMember_employeeId_idx" ON "EmployeeFamilyMember"("employeeId");
CREATE INDEX "EmployeeFamilyMember_employeeId_isEmergency_idx" ON "EmployeeFamilyMember"("employeeId", "isEmergency");


-- =====================================================
-- Table: EmployeeInfoTab
-- =====================================================

DROP TABLE IF EXISTS "EmployeeInfoTab" CASCADE;

CREATE TABLE "EmployeeInfoTab" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "EmployeeInfoTab_code_key" ON "EmployeeInfoTab"("code");


-- =====================================================
-- Table: EmployeeInfoTabField
-- =====================================================

DROP TABLE IF EXISTS "EmployeeInfoTabField" CASCADE;

CREATE TABLE "EmployeeInfoTabField" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "EmployeeInfoTabField_groupId_idx" ON "EmployeeInfoTabField"("groupId");
CREATE INDEX "EmployeeInfoTabField_dataSourceId_idx" ON "EmployeeInfoTabField"("dataSourceId");
CREATE UNIQUE INDEX "EmployeeInfoTabField_tabId_fieldCode_key" ON "EmployeeInfoTabField"("tabId", "fieldCode");


-- =====================================================
-- Table: EmployeeInfoTabGroup
-- =====================================================

DROP TABLE IF EXISTS "EmployeeInfoTabGroup" CASCADE;

CREATE TABLE "EmployeeInfoTabGroup" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "EmployeeInfoTabGroup_tabId_code_key" ON "EmployeeInfoTabGroup"("tabId", "code");


-- =====================================================
-- Table: EmployeeLaborAccount
-- =====================================================

DROP TABLE IF EXISTS "EmployeeLaborAccount" CASCADE;

CREATE TABLE "EmployeeLaborAccount" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "EmployeeLaborAccount_employeeNo_idx" ON "EmployeeLaborAccount"("employeeNo");
CREATE INDEX "EmployeeLaborAccount_accountId_idx" ON "EmployeeLaborAccount"("accountId");
CREATE INDEX "EmployeeLaborAccount_effectiveDate_idx" ON "EmployeeLaborAccount"("effectiveDate");
CREATE INDEX "EmployeeLaborAccount_employeeId_idx" ON "EmployeeLaborAccount"("employeeId");
CREATE UNIQUE INDEX "EmployeeLaborAccount_employeeNo_accountId_effectiveDate_key" ON "EmployeeLaborAccount"("employeeNo", "accountId", "effectiveDate");


-- =====================================================
-- Table: EmployeeWorkExperience
-- =====================================================

DROP TABLE IF EXISTS "EmployeeWorkExperience" CASCADE;

CREATE TABLE "EmployeeWorkExperience" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "EmployeeWorkExperience_employeeId_idx" ON "EmployeeWorkExperience"("employeeId");
CREATE INDEX "EmployeeWorkExperience_employeeId_startDate_idx" ON "EmployeeWorkExperience"("employeeId", "startDate");


-- =====================================================
-- Table: LaborAccount
-- =====================================================

DROP TABLE IF EXISTS "LaborAccount" CASCADE;

CREATE TABLE "LaborAccount" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "LaborAccount_code_key" ON "LaborAccount"("code");
CREATE INDEX "LaborAccount_code_idx" ON "LaborAccount"("code");
CREATE INDEX "LaborAccount_path_idx" ON "LaborAccount"("path");
CREATE INDEX "LaborAccount_accountPath_idx" ON "LaborAccount"("accountPath");
CREATE INDEX "LaborAccount_orgId_idx" ON "LaborAccount"("orgId");
CREATE INDEX "LaborAccount_employeeId_idx" ON "LaborAccount"("employeeId");
CREATE INDEX "LaborAccount_status_idx" ON "LaborAccount"("status");
CREATE INDEX "LaborAccount_effectiveDate_idx" ON "LaborAccount"("effectiveDate");


-- =====================================================
-- Table: LaborHourReportEmployee
-- =====================================================

DROP TABLE IF EXISTS "LaborHourReportEmployee" CASCADE;

CREATE TABLE "LaborHourReportEmployee" (
  "id" SERIAL NOT NULL,
  "requestId" INTEGER NOT NULL,
  "employeeId" INTEGER NOT NULL,
  "employeeNo" TEXT NOT NULL,
  "employeeName" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

CREATE INDEX "LaborHourReportEmployee_requestId_idx" ON "LaborHourReportEmployee"("requestId");
CREATE INDEX "LaborHourReportEmployee_employeeId_idx" ON "LaborHourReportEmployee"("employeeId");


-- =====================================================
-- Table: LaborHourReportRequest
-- =====================================================

DROP TABLE IF EXISTS "LaborHourReportRequest" CASCADE;

CREATE TABLE "LaborHourReportRequest" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "LaborHourReportRequest_requestNo_key" ON "LaborHourReportRequest"("requestNo");
CREATE INDEX "LaborHourReportRequest_status_idx" ON "LaborHourReportRequest"("status");
CREATE INDEX "LaborHourReportRequest_requestNo_idx" ON "LaborHourReportRequest"("requestNo");
CREATE INDEX "LaborHourReportRequest_employeeNo_idx" ON "LaborHourReportRequest"("employeeNo");
CREATE INDEX "LaborHourReportRequest_reportDate_idx" ON "LaborHourReportRequest"("reportDate");
CREATE INDEX "LaborHourReportRequest_reportMode_idx" ON "LaborHourReportRequest"("reportMode");
CREATE INDEX "LaborHourReportRequest_instanceId_idx" ON "LaborHourReportRequest"("instanceId");


-- =====================================================
-- Table: LineShift
-- =====================================================

DROP TABLE IF EXISTS "LineShift" CASCADE;

CREATE TABLE "LineShift" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "LineShift_orgId_scheduleDate_idx" ON "LineShift"("orgId", "scheduleDate");
CREATE INDEX "LineShift_scheduleDate_idx" ON "LineShift"("scheduleDate");
CREATE UNIQUE INDEX "LineShift_orgId_shiftId_scheduleDate_deletedAt_key" ON "LineShift"("orgId", "shiftId", "scheduleDate", "deletedAt");
CREATE INDEX "LineShift_accountId_idx" ON "LineShift"("accountId");


-- =====================================================
-- Table: Organization
-- =====================================================

DROP TABLE IF EXISTS "Organization" CASCADE;

CREATE TABLE "Organization" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");


-- =====================================================
-- Table: ParticipantConfig
-- =====================================================

DROP TABLE IF EXISTS "ParticipantConfig" CASCADE;

CREATE TABLE "ParticipantConfig" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "ParticipantConfig_code_key" ON "ParticipantConfig"("code");
CREATE INDEX "ParticipantConfig_type_idx" ON "ParticipantConfig"("type");
CREATE INDEX "ParticipantConfig_status_idx" ON "ParticipantConfig"("status");
CREATE INDEX "ParticipantConfig_sortOrder_idx" ON "ParticipantConfig"("sortOrder");


-- =====================================================
-- Table: PersonalProductionRecord
-- =====================================================

DROP TABLE IF EXISTS "PersonalProductionRecord" CASCADE;

CREATE TABLE "PersonalProductionRecord" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "PersonalProductionRecord_recordDate_idx" ON "PersonalProductionRecord"("recordDate");
CREATE INDEX "PersonalProductionRecord_employeeNo_recordDate_idx" ON "PersonalProductionRecord"("employeeNo", "recordDate");
CREATE INDEX "PersonalProductionRecord_productId_recordDate_idx" ON "PersonalProductionRecord"("productId", "recordDate");
CREATE INDEX "PersonalProductionRecord_shiftId_recordDate_idx" ON "PersonalProductionRecord"("shiftId", "recordDate");
CREATE INDEX "PersonalProductionRecord_orgId_recordDate_idx" ON "PersonalProductionRecord"("orgId", "recordDate");
CREATE UNIQUE INDEX "PersonalProductionRecord_recordDate_employeeNo_productId_deletedAt_key" ON "PersonalProductionRecord"("recordDate", "employeeNo", "productId", "deletedAt");


-- =====================================================
-- Table: Process
-- =====================================================

DROP TABLE IF EXISTS "Process" CASCADE;

CREATE TABLE "Process" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "Process_code_key" ON "Process"("code");
CREATE INDEX "Process_status_idx" ON "Process"("status");
CREATE INDEX "Process_deletedAt_idx" ON "Process"("deletedAt");


-- =====================================================
-- Table: Product
-- =====================================================

DROP TABLE IF EXISTS "Product" CASCADE;

CREATE TABLE "Product" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");


-- =====================================================
-- Table: ProductStandardHourByLevel
-- =====================================================

DROP TABLE IF EXISTS "ProductStandardHourByLevel" CASCADE;

CREATE TABLE "ProductStandardHourByLevel" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "ProductStandardHourByLevel_productId_effectiveDate_expiryDate_status_idx" ON "ProductStandardHourByLevel"("productId", "effectiveDate", "expiryDate", "status");
CREATE INDEX "ProductStandardHourByLevel_accountLevel_idx" ON "ProductStandardHourByLevel"("accountLevel");


-- =====================================================
-- Table: ProductStandardHours
-- =====================================================

DROP TABLE IF EXISTS "ProductStandardHours" CASCADE;

CREATE TABLE "ProductStandardHours" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "ProductStandardHours_productId_effectiveDate_expiryDate_status_idx" ON "ProductStandardHours"("productId", "effectiveDate", "expiryDate", "status");


-- =====================================================
-- Table: ProductionLine
-- =====================================================

DROP TABLE IF EXISTS "ProductionLine" CASCADE;

CREATE TABLE "ProductionLine" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "ProductionLine_code_key" ON "ProductionLine"("code");


-- =====================================================
-- Table: ProductionRecord
-- =====================================================

DROP TABLE IF EXISTS "ProductionRecord" CASCADE;

CREATE TABLE "ProductionRecord" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "ProductionRecord_recordDate_idx" ON "ProductionRecord"("recordDate");
CREATE INDEX "ProductionRecord_orgId_recordDate_idx" ON "ProductionRecord"("orgId", "recordDate");
CREATE INDEX "ProductionRecord_productId_recordDate_idx" ON "ProductionRecord"("productId", "recordDate");
CREATE INDEX "ProductionRecord_shiftId_recordDate_idx" ON "ProductionRecord"("shiftId", "recordDate");
CREATE UNIQUE INDEX "ProductionRecord_recordDate_orgId_shiftId_deletedAt_key" ON "ProductionRecord"("recordDate", "orgId", "shiftId", "deletedAt");


-- =====================================================
-- Table: ProductionReportRequest
-- =====================================================

DROP TABLE IF EXISTS "ProductionReportRequest" CASCADE;

CREATE TABLE "ProductionReportRequest" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "ProductionReportRequest_requestNo_key" ON "ProductionReportRequest"("requestNo");
CREATE INDEX "ProductionReportRequest_status_idx" ON "ProductionReportRequest"("status");
CREATE INDEX "ProductionReportRequest_requestNo_idx" ON "ProductionReportRequest"("requestNo");
CREATE INDEX "ProductionReportRequest_employeeNo_idx" ON "ProductionReportRequest"("employeeNo");
CREATE INDEX "ProductionReportRequest_reportDate_idx" ON "ProductionReportRequest"("reportDate");
CREATE INDEX "ProductionReportRequest_deletedAt_idx" ON "ProductionReportRequest"("deletedAt");


-- =====================================================
-- Table: PunchDevice
-- =====================================================

DROP TABLE IF EXISTS "PunchDevice" CASCADE;

CREATE TABLE "PunchDevice" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "PunchDevice_code_key" ON "PunchDevice"("code");


-- =====================================================
-- Table: PunchPair
-- =====================================================

DROP TABLE IF EXISTS "PunchPair" CASCADE;

CREATE TABLE "PunchPair" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "PunchPair_employeeNo_pairDate_idx" ON "PunchPair"("employeeNo", "pairDate");
CREATE INDEX "PunchPair_shiftId_idx" ON "PunchPair"("shiftId");


-- =====================================================
-- Table: PunchRecord
-- =====================================================

DROP TABLE IF EXISTS "PunchRecord" CASCADE;

CREATE TABLE "PunchRecord" (
  "id" SERIAL NOT NULL,
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



-- =====================================================
-- Table: PunchRule
-- =====================================================

DROP TABLE IF EXISTS "PunchRule" CASCADE;

CREATE TABLE "PunchRule" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "PunchRule_code_key" ON "PunchRule"("code");


-- =====================================================
-- Table: PunchRuleDeviceGroupInterval
-- =====================================================

DROP TABLE IF EXISTS "PunchRuleDeviceGroupInterval" CASCADE;

CREATE TABLE "PunchRuleDeviceGroupInterval" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "PunchRuleDeviceGroupInterval_deviceGroupId_idx" ON "PunchRuleDeviceGroupInterval"("deviceGroupId");
CREATE INDEX "PunchRuleDeviceGroupInterval_status_idx" ON "PunchRuleDeviceGroupInterval"("status");


-- =====================================================
-- Table: ReportDataModel
-- =====================================================

DROP TABLE IF EXISTS "ReportDataModel" CASCADE;

CREATE TABLE "ReportDataModel" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "ReportDataModel_code_key" ON "ReportDataModel"("code");
CREATE INDEX "ReportDataModel_status_idx" ON "ReportDataModel"("status");
CREATE INDEX "ReportDataModel_category_idx" ON "ReportDataModel"("category");
CREATE INDEX "ReportDataModel_deletedAt_idx" ON "ReportDataModel"("deletedAt");


-- =====================================================
-- Table: ReportModelField
-- =====================================================

DROP TABLE IF EXISTS "ReportModelField" CASCADE;

CREATE TABLE "ReportModelField" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "ReportModelField_modelId_idx" ON "ReportModelField"("modelId");
CREATE INDEX "ReportModelField_status_idx" ON "ReportModelField"("status");
CREATE INDEX "ReportModelField_deletedAt_idx" ON "ReportModelField"("deletedAt");


-- =====================================================
-- Table: ReportModelRelation
-- =====================================================

DROP TABLE IF EXISTS "ReportModelRelation" CASCADE;

CREATE TABLE "ReportModelRelation" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "ReportModelRelation_modelId_idx" ON "ReportModelRelation"("modelId");
CREATE INDEX "ReportModelRelation_status_idx" ON "ReportModelRelation"("status");
CREATE INDEX "ReportModelRelation_deletedAt_idx" ON "ReportModelRelation"("deletedAt");


-- =====================================================
-- Table: Role
-- =====================================================

DROP TABLE IF EXISTS "Role" CASCADE;

CREATE TABLE "Role" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");


-- =====================================================
-- Table: Schedule
-- =====================================================

DROP TABLE IF EXISTS "Schedule" CASCADE;

CREATE TABLE "Schedule" (
  "id" SERIAL NOT NULL,
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



-- =====================================================
-- Table: SearchConditionConfig
-- =====================================================

DROP TABLE IF EXISTS "SearchConditionConfig" CASCADE;

CREATE TABLE "SearchConditionConfig" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "SearchConditionConfig_configCode_idx" ON "SearchConditionConfig"("configCode");
CREATE INDEX "SearchConditionConfig_pageCode_idx" ON "SearchConditionConfig"("pageCode");
CREATE UNIQUE INDEX "SearchConditionConfig_configCode_fieldCode_key" ON "SearchConditionConfig"("configCode", "fieldCode");


-- =====================================================
-- Table: Shift
-- =====================================================

DROP TABLE IF EXISTS "Shift" CASCADE;

CREATE TABLE "Shift" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "Shift_code_key" ON "Shift"("code");


-- =====================================================
-- Table: ShiftProperty
-- =====================================================

DROP TABLE IF EXISTS "ShiftProperty" CASCADE;

CREATE TABLE "ShiftProperty" (
  "id" SERIAL NOT NULL,
  "shiftId" INTEGER NOT NULL,
  "propertyKey" TEXT NOT NULL,
  "propertyValue" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX "ShiftProperty_shiftId_idx" ON "ShiftProperty"("shiftId");
CREATE UNIQUE INDEX "ShiftProperty_shiftId_propertyKey_key" ON "ShiftProperty"("shiftId", "propertyKey");


-- =====================================================
-- Table: ShiftPropertyDefinition
-- =====================================================

DROP TABLE IF EXISTS "ShiftPropertyDefinition" CASCADE;

CREATE TABLE "ShiftPropertyDefinition" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "ShiftPropertyDefinition_propertyKey_key" ON "ShiftPropertyDefinition"("propertyKey");
CREATE INDEX "ShiftPropertyDefinition_status_idx" ON "ShiftPropertyDefinition"("status");


-- =====================================================
-- Table: ShiftSegment
-- =====================================================

DROP TABLE IF EXISTS "ShiftSegment" CASCADE;

CREATE TABLE "ShiftSegment" (
  "id" SERIAL NOT NULL,
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



-- =====================================================
-- Table: SupportRequest
-- =====================================================

DROP TABLE IF EXISTS "SupportRequest" CASCADE;

CREATE TABLE "SupportRequest" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "SupportRequest_requestNo_key" ON "SupportRequest"("requestNo");
CREATE INDEX "SupportRequest_status_idx" ON "SupportRequest"("status");
CREATE INDEX "SupportRequest_requestNo_idx" ON "SupportRequest"("requestNo");
CREATE INDEX "SupportRequest_requesterId_idx" ON "SupportRequest"("requesterId");
CREATE INDEX "SupportRequest_deletedAt_idx" ON "SupportRequest"("deletedAt");
CREATE INDEX "SupportRequest_supportEmployeeId_idx" ON "SupportRequest"("supportEmployeeId");
CREATE INDEX "SupportRequest_supportAccountId_idx" ON "SupportRequest"("supportAccountId");


-- =====================================================
-- Table: SupportResult
-- =====================================================

DROP TABLE IF EXISTS "SupportResult" CASCADE;

CREATE TABLE "SupportResult" (
  "id" SERIAL NOT NULL,
  "requestId" INTEGER NOT NULL,
  "result" TEXT NOT NULL,
  "attachments" TEXT NOT NULL DEFAULT '[]',
  "createdBy" INTEGER NOT NULL,
  "createdByName" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX "SupportResult_requestId_idx" ON "SupportResult"("requestId");


-- =====================================================
-- Table: SystemConfig
-- =====================================================

DROP TABLE IF EXISTS "SystemConfig" CASCADE;

CREATE TABLE "SystemConfig" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "SystemConfig_configKey_key" ON "SystemConfig"("configKey");
CREATE INDEX "SystemConfig_category_idx" ON "SystemConfig"("category");


-- =====================================================
-- Table: User
-- =====================================================

DROP TABLE IF EXISTS "User" CASCADE;

CREATE TABLE "User" (
  "id" SERIAL NOT NULL,
  "username" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");


-- =====================================================
-- Table: UserRole
-- =====================================================

DROP TABLE IF EXISTS "UserRole" CASCADE;

CREATE TABLE "UserRole" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "roleId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");


-- =====================================================
-- Table: WorkHourResult
-- =====================================================

DROP TABLE IF EXISTS "WorkHourResult" CASCADE;

CREATE TABLE "WorkHourResult" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "WorkHourResult_employeeNo_workDate_idx" ON "WorkHourResult"("employeeNo", "workDate");
CREATE INDEX "WorkHourResult_workDate_idx" ON "WorkHourResult"("workDate");
CREATE INDEX "WorkHourResult_calcDate_idx" ON "WorkHourResult"("calcDate");
CREATE INDEX "WorkHourResult_accountId_idx" ON "WorkHourResult"("accountId");
CREATE INDEX "WorkHourResult_status_idx" ON "WorkHourResult"("status");
CREATE INDEX "WorkHourResult_employeeId_idx" ON "WorkHourResult"("employeeId");
CREATE INDEX "WorkHourResult_orgId_idx" ON "WorkHourResult"("orgId");


-- =====================================================
-- Table: WorkInfoHistory
-- =====================================================

DROP TABLE IF EXISTS "WorkInfoHistory" CASCADE;

CREATE TABLE "WorkInfoHistory" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "WorkInfoHistory_employeeId_effectiveDate_idx" ON "WorkInfoHistory"("employeeId", "effectiveDate");
CREATE INDEX "WorkInfoHistory_employeeId_isCurrent_idx" ON "WorkInfoHistory"("employeeId", "isCurrent");


-- =====================================================
-- Table: WorkflowApproval
-- =====================================================

DROP TABLE IF EXISTS "WorkflowApproval" CASCADE;

CREATE TABLE "WorkflowApproval" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "WorkflowApproval_instanceId_idx" ON "WorkflowApproval"("instanceId");
CREATE INDEX "WorkflowApproval_approverId_idx" ON "WorkflowApproval"("approverId");
CREATE INDEX "WorkflowApproval_status_idx" ON "WorkflowApproval"("status");


-- =====================================================
-- Table: WorkflowCcRecord
-- =====================================================

DROP TABLE IF EXISTS "WorkflowCcRecord" CASCADE;

CREATE TABLE "WorkflowCcRecord" (
  "id" SERIAL NOT NULL,
  "instanceId" INTEGER NOT NULL,
  "step" TEXT NOT NULL,
  "ccUserId" INTEGER NOT NULL,
  "ccUserName" TEXT NOT NULL,
  "hasRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX "WorkflowCcRecord_instanceId_idx" ON "WorkflowCcRecord"("instanceId");
CREATE INDEX "WorkflowCcRecord_ccUserId_idx" ON "WorkflowCcRecord"("ccUserId");


-- =====================================================
-- Table: WorkflowDefinition
-- =====================================================

DROP TABLE IF EXISTS "WorkflowDefinition" CASCADE;

CREATE TABLE "WorkflowDefinition" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "WorkflowDefinition_status_idx" ON "WorkflowDefinition"("status");
CREATE INDEX "WorkflowDefinition_category_idx" ON "WorkflowDefinition"("category");
CREATE INDEX "WorkflowDefinition_code_idx" ON "WorkflowDefinition"("code");
CREATE INDEX "WorkflowDefinition_deletedAt_idx" ON "WorkflowDefinition"("deletedAt");
CREATE UNIQUE INDEX "WorkflowDefinition_code_version_key" ON "WorkflowDefinition"("code", "version");


-- =====================================================
-- Table: WorkflowEdge
-- =====================================================

DROP TABLE IF EXISTS "WorkflowEdge" CASCADE;

CREATE TABLE "WorkflowEdge" (
  "id" SERIAL NOT NULL,
  "workflowId" INTEGER NOT NULL,
  "sourceNodeId" INTEGER NOT NULL,
  "targetNodeId" INTEGER NOT NULL,
  "condition" TEXT,
  "label" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX "WorkflowEdge_workflowId_idx" ON "WorkflowEdge"("workflowId");
CREATE INDEX "WorkflowEdge_sourceNodeId_idx" ON "WorkflowEdge"("sourceNodeId");
CREATE INDEX "WorkflowEdge_targetNodeId_idx" ON "WorkflowEdge"("targetNodeId");


-- =====================================================
-- Table: WorkflowInstance
-- =====================================================

DROP TABLE IF EXISTS "WorkflowInstance" CASCADE;

CREATE TABLE "WorkflowInstance" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "WorkflowInstance_instanceNo_key" ON "WorkflowInstance"("instanceNo");
CREATE INDEX "WorkflowInstance_workflowId_idx" ON "WorkflowInstance"("workflowId");
CREATE INDEX "WorkflowInstance_instanceNo_idx" ON "WorkflowInstance"("instanceNo");
CREATE INDEX "WorkflowInstance_status_idx" ON "WorkflowInstance"("status");
CREATE INDEX "WorkflowInstance_deletedAt_idx" ON "WorkflowInstance"("deletedAt");


-- =====================================================
-- Table: WorkflowNode
-- =====================================================

DROP TABLE IF EXISTS "WorkflowNode" CASCADE;

CREATE TABLE "WorkflowNode" (
  "id" SERIAL NOT NULL,
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

CREATE UNIQUE INDEX "WorkflowNode_nodeCode_key" ON "WorkflowNode"("nodeCode");
CREATE INDEX "WorkflowNode_workflowId_idx" ON "WorkflowNode"("workflowId");
CREATE INDEX "WorkflowNode_nodeCode_idx" ON "WorkflowNode"("nodeCode");


-- =====================================================
-- Table: WorkflowParticipant
-- =====================================================

DROP TABLE IF EXISTS "WorkflowParticipant" CASCADE;

CREATE TABLE "WorkflowParticipant" (
  "id" SERIAL NOT NULL,
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

CREATE INDEX "WorkflowParticipant_workflowId_idx" ON "WorkflowParticipant"("workflowId");
CREATE INDEX "WorkflowParticipant_nodeId_idx" ON "WorkflowParticipant"("nodeId");


-- Schema导出完成
