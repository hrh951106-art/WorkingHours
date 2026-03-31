-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "functionalPermissions" TEXT NOT NULL DEFAULT '[]',
    "dataScopeType" TEXT NOT NULL DEFAULT 'ALL',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    "dataScopeRuleGroups" TEXT,
    "managedOrgDataScope" TEXT,
    "orgDataScope" TEXT
);

-- CreateTable
CREATE TABLE "DataScopeRule" (
    "id" SERIAL PRIMARY KEY,
    "roleId" INTEGER NOT NULL,
    "ruleType" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "orgId" INTEGER,
    "includeChild" BOOLEAN NOT NULL DEFAULT false,
    "condition" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "DataScopeRule_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "roleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" SERIAL PRIMARY KEY,
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
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "Organization_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL PRIMARY KEY,
    "employeeNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "idCard" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "orgId" INTEGER NOT NULL,
    "entryDate" TIMESTAMP NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "customFields" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
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
    CONSTRAINT "Employee_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmployeeChangeLog" (
    "id" SERIAL PRIMARY KEY,
    "employeeId" INTEGER NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "operatorId" INTEGER NOT NULL,
    "operatorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "EmployeeChangeLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" SERIAL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CUSTOM',
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL
);

-- CreateTable
CREATE TABLE "DataSourceOption" (
    "id" SERIAL PRIMARY KEY,
    "dataSourceId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "DataSourceOption_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomField" (
    "id" SERIAL PRIMARY KEY,
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
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CustomField_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmployeeInfoTab" (
    "id" SERIAL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL
);

-- CreateTable
CREATE TABLE "EmployeeInfoTabGroup" (
    "id" SERIAL PRIMARY KEY,
    "tabId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "collapsed" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "EmployeeInfoTabGroup_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "EmployeeInfoTab" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmployeeInfoTabField" (
    "id" SERIAL PRIMARY KEY,
    "tabId" INTEGER NOT NULL,
    "groupId" INTEGER,
    "fieldCode" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "EmployeeInfoTabField_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "EmployeeInfoTabGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmployeeInfoTabField_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "EmployeeInfoTab" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LaborAccount" (
    "id" SERIAL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "namePath" TEXT NOT NULL DEFAULT '',
    "parentId" INTEGER,
    "employeeId" INTEGER,
    "effectiveDate" TIMESTAMP NOT NULL,
    "expiryDate" TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    "hierarchyValues" TEXT DEFAULT '',
    "usageType" TEXT DEFAULT 'SHIFT',
    CONSTRAINT "LaborAccount_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LaborAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LaborAccount_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccountTransfer" (
    "id" SERIAL PRIMARY KEY,
    "scheduleId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "startTime" TIMESTAMP NOT NULL,
    "endTime" TIMESTAMP NOT NULL,
    "hours" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "AccountTransfer_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LaborAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AccountTransfer_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccountHierarchyConfig" (
    "id" SERIAL PRIMARY KEY,
    "level" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "mappingType" TEXT NOT NULL,
    "mappingValue" TEXT,
    "dataSourceId" INTEGER,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" SERIAL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "standardHours" REAL NOT NULL,
    "breakHours" REAL NOT NULL DEFAULT 0,
    "color" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL
);

-- CreateTable
CREATE TABLE "ShiftPropertyDefinition" (
    "id" SERIAL PRIMARY KEY,
    "propertyKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "valueType" TEXT NOT NULL DEFAULT 'TEXT',
    "options" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL
);

-- CreateTable
CREATE TABLE "ShiftProperty" (
    "id" SERIAL PRIMARY KEY,
    "shiftId" INTEGER NOT NULL,
    "propertyKey" TEXT NOT NULL,
    "propertyValue" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "ShiftProperty_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShiftSegment" (
    "id" SERIAL PRIMARY KEY,
    "shiftId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "duration" REAL NOT NULL,
    "accountId" INTEGER,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "ShiftSegment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LaborAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ShiftSegment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" SERIAL PRIMARY KEY,
    "employeeId" INTEGER NOT NULL,
    "shiftId" INTEGER NOT NULL,
    "scheduleDate" TIMESTAMP NOT NULL,
    "adjustedStart" TIMESTAMP,
    "adjustedEnd" TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "cancelReason" TEXT,
    "pushStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    "adjustedSegments" TEXT,
    CONSTRAINT "Schedule_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Schedule_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PunchDevice" (
    "id" SERIAL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ipAddress" TEXT,
    "groupId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PunchDevice_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "DeviceGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PunchRecord" (
    "id" SERIAL PRIMARY KEY,
    "employeeNo" TEXT NOT NULL,
    "punchTime" TIMESTAMP NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "punchType" TEXT NOT NULL,
    "location" TEXT,
    "accountId" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'AUTO',
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "PunchRecord_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LaborAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PunchRecord_employeeNo_fkey" FOREIGN KEY ("employeeNo") REFERENCES "Employee" ("employeeNo") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PunchRecord_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "PunchDevice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeviceAccount" (
    "id" SERIAL PRIMARY KEY,
    "deviceId" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "effectiveDate" TIMESTAMP NOT NULL DEFAULT NOW(),
    "expiryDate" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT "DeviceAccount_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LaborAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DeviceAccount_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "PunchDevice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PunchRule" (
    "id" SERIAL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "conditions" TEXT NOT NULL,
    "beforeShiftMins" INTEGER NOT NULL DEFAULT 0,
    "afterShiftMins" INTEGER NOT NULL DEFAULT 0,
    "configs" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL
);

-- CreateTable
CREATE TABLE "CalcRule" (
    "id" SERIAL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "conditions" TEXT NOT NULL,
    "calcLogic" TEXT NOT NULL,
    "overtimeRules" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL
);

-- CreateTable
CREATE TABLE "AttendanceCode" (
    "id" SERIAL PRIMARY KEY,
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
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL
);

-- CreateTable
CREATE TABLE "CalcResult" (
    "id" SERIAL PRIMARY KEY,
    "employeeNo" TEXT NOT NULL,
    "calcDate" TIMESTAMP NOT NULL,
    "shiftId" INTEGER NOT NULL,
    "shiftName" TEXT,
    "attendanceCodeId" INTEGER,
    "punchInTime" TIMESTAMP,
    "punchOutTime" TIMESTAMP,
    "standardHours" REAL NOT NULL,
    "actualHours" REAL NOT NULL,
    "overtimeHours" REAL NOT NULL DEFAULT 0,
    "leaveHours" REAL NOT NULL DEFAULT 0,
    "absenceHours" REAL NOT NULL DEFAULT 0,
    "accountHours" TEXT NOT NULL DEFAULT '[]',
    "exceptions" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    "accountId" INTEGER,
    "accountName" TEXT,
    CONSTRAINT "CalcResult_employeeNo_fkey" FOREIGN KEY ("employeeNo") REFERENCES "Employee" ("employeeNo") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CalcResult_attendanceCodeId_fkey" FOREIGN KEY ("attendanceCodeId") REFERENCES "AttendanceCode" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeviceGroup" (
    "id" SERIAL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL
);

-- CreateTable
CREATE TABLE "PunchPair" (
    "id" SERIAL PRIMARY KEY,
    "employeeNo" TEXT NOT NULL,
    "pairDate" TIMESTAMP NOT NULL,
    "shiftId" INTEGER NOT NULL,
    "shiftName" TEXT,
    "inPunchId" INTEGER,
    "outPunchId" INTEGER,
    "inPunchTime" TIMESTAMP,
    "outPunchTime" TIMESTAMP,
    "workHours" REAL NOT NULL,
    "sourceGroupId" INTEGER,
    "accountId" INTEGER,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "PunchPair_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "LaborAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PunchPair_outPunchId_fkey" FOREIGN KEY ("outPunchId") REFERENCES "PunchRecord" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PunchPair_inPunchId_fkey" FOREIGN KEY ("inPunchId") REFERENCES "PunchRecord" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PunchPair_employeeNo_fkey" FOREIGN KEY ("employeeNo") REFERENCES "Employee" ("employeeNo") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specification" TEXT,
    "unit" TEXT NOT NULL DEFAULT '件',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "standardHours" REAL NOT NULL,
    "conversionFactor" REAL NOT NULL DEFAULT 1.0,
    "description" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedById" INTEGER,
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProductionLine" (
    "id" SERIAL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orgId" INTEGER NOT NULL,
    "orgName" TEXT NOT NULL,
    "workshopId" INTEGER,
    "workshopName" TEXT,
    "type" TEXT NOT NULL,
    "capacity" REAL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedById" INTEGER,
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP
);

-- CreateTable
CREATE TABLE "LineShift" (
    "id" SERIAL PRIMARY KEY,
    "orgId" INTEGER NOT NULL,
    "orgName" TEXT NOT NULL,
    "lineId" INTEGER,
    "shiftId" INTEGER NOT NULL,
    "shiftName" TEXT NOT NULL,
    "scheduleDate" TIMESTAMP NOT NULL,
    "startTime" TIMESTAMP NOT NULL,
    "endTime" TIMESTAMP NOT NULL,
    "plannedProducts" TEXT NOT NULL,
    "participateInAllocation" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    "delayedShutdownTime" INTEGER,
    CONSTRAINT "LineShift_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductionLine" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductStandardHours" (
    "id" SERIAL PRIMARY KEY,
    "productId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "processId" INTEGER,
    "processName" TEXT,
    "standardHours" REAL NOT NULL,
    "effectiveDate" TIMESTAMP NOT NULL,
    "expiryDate" TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMP,
    CONSTRAINT "ProductStandardHours_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductionRecord" (
    "id" SERIAL PRIMARY KEY,
    "recordDate" TIMESTAMP NOT NULL,
    "orgId" INTEGER NOT NULL,
    "orgName" TEXT NOT NULL,
    "lineId" INTEGER,
    "lineName" TEXT,
    "shiftId" INTEGER NOT NULL,
    "shiftName" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "plannedQty" REAL NOT NULL,
    "actualQty" REAL NOT NULL,
    "qualifiedQty" REAL NOT NULL,
    "unqualifiedQty" REAL,
    "standardHours" REAL NOT NULL,
    "totalStdHours" REAL NOT NULL,
    "workHours" REAL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "recorderId" INTEGER NOT NULL,
    "recorderName" TEXT NOT NULL,
    "recordedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "description" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    CONSTRAINT "ProductionRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductionRecord_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "ProductionLine" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllocationConfig" (
    "id" SERIAL PRIMARY KEY,
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
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedById" INTEGER,
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP NOT NULL,
    "approvedById" INTEGER,
    "approvedByName" TEXT,
    "approvedAt" TIMESTAMP,
    "deletedAt" TIMESTAMP
);

-- CreateTable
CREATE TABLE "AllocationSourceConfig" (
    "id" SERIAL PRIMARY KEY,
    "configId" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'EMPLOYEE_HOURS',
    "employeeFilter" TEXT NOT NULL DEFAULT '{}',
    "accountFilter" TEXT NOT NULL DEFAULT '{}',
    "attendanceCodes" TEXT NOT NULL DEFAULT '[]',
    "description" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "AllocationSourceConfig_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AllocationConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllocationRuleConfig" (
    "id" SERIAL PRIMARY KEY,
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
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP,
    CONSTRAINT "AllocationRuleConfig_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AllocationConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllocationRuleTarget" (
    "id" SERIAL PRIMARY KEY,
    "ruleId" INTEGER NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "targetName" TEXT NOT NULL,
    "targetCode" TEXT,
    "weight" REAL NOT NULL DEFAULT 0,
    "targetAccountId" INTEGER,
    "targetAccountName" TEXT,
    CONSTRAINT "AllocationRuleTarget_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AllocationRuleConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllocationResult" (
    "id" SERIAL PRIMARY KEY,
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
    "sourceHours" REAL NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" INTEGER NOT NULL,
    "targetName" TEXT NOT NULL,
    "targetAccountId" INTEGER,
    "allocationBasis" TEXT NOT NULL,
    "basisValue" REAL NOT NULL,
    "weightValue" REAL NOT NULL,
    "allocationRatio" REAL NOT NULL,
    "allocatedHours" REAL NOT NULL,
    "calcTime" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "deletedAt" TIMESTAMP,
    CONSTRAINT "AllocationResult_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AllocationConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllocationBasis" (
    "id" SERIAL PRIMARY KEY,
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
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    "deletedAt" TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL PRIMARY KEY,
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
    "operationTime" TIMESTAMP NOT NULL DEFAULT NOW(),
    "result" TEXT NOT NULL,
    "errorMsg" TEXT
);

-- CreateTable
CREATE TABLE "AllocationGeneralConfig" (
    "id" SERIAL PRIMARY KEY,
    "actualHoursAllocationCode" TEXT NOT NULL,
    "indirectHoursAllocationCode" TEXT NOT NULL,
    "description" TEXT,
    "updatedById" INTEGER,
    "updatedByName" TEXT,
    "updatedAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- CreateTable
CREATE TABLE "SearchConditionConfig" (
    "id" SERIAL PRIMARY KEY,
    "pageCode" TEXT NOT NULL,
    "pageName" TEXT NOT NULL,
    "fieldCode" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "dataSourceCode" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" SERIAL PRIMARY KEY,
    "configKey" TEXT NOT NULL,
    "configValue" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "updatedById" INTEGER,
    "updatedByName" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL
);

-- CreateTable
CREATE TABLE "WorkInfoHistory" (
    "id" SERIAL PRIMARY KEY,
    "employeeId" INTEGER NOT NULL,
    "effectiveDate" TIMESTAMP NOT NULL DEFAULT NOW(),
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
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "WorkInfoHistory_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkInfoHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmployeeEducation" (
    "id" SERIAL PRIMARY KEY,
    "employeeId" INTEGER NOT NULL,
    "school" TEXT NOT NULL,
    "major" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "educationLevel" TEXT NOT NULL,
    "startDate" TIMESTAMP NOT NULL,
    "endDate" TIMESTAMP,
    "isHighest" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    "degreeNo" TEXT,
    "diplomaNo" TEXT,
    "educationType" TEXT,
    "graduationDate" TIMESTAMP,
    CONSTRAINT "EmployeeEducation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmployeeWorkExperience" (
    "id" SERIAL PRIMARY KEY,
    "employeeId" INTEGER NOT NULL,
    "company" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "startDate" TIMESTAMP NOT NULL,
    "endDate" TIMESTAMP,
    "description" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    "reason" TEXT,
    "salary" TEXT,
    CONSTRAINT "EmployeeWorkExperience_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmployeeFamilyMember" (
    "id" SERIAL PRIMARY KEY,
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
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    "address" TEXT,
    "age" INTEGER,
    CONSTRAINT "EmployeeFamilyMember_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeNo_key" ON "Employee"("employeeNo");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_idCard_key" ON "Employee"("idCard");

-- CreateIndex
CREATE UNIQUE INDEX "DataSource_code_key" ON "DataSource"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DataSourceOption_dataSourceId_value_key" ON "DataSourceOption"("dataSourceId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "CustomField_code_key" ON "CustomField"("code");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeInfoTab_code_key" ON "EmployeeInfoTab"("code");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeInfoTabGroup_tabId_code_key" ON "EmployeeInfoTabGroup"("tabId", "code");

-- CreateIndex
CREATE INDEX "EmployeeInfoTabField_groupId_idx" ON "EmployeeInfoTabField"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeInfoTabField_tabId_fieldCode_key" ON "EmployeeInfoTabField"("tabId", "fieldCode");

-- CreateIndex
CREATE UNIQUE INDEX "LaborAccount_code_key" ON "LaborAccount"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_code_key" ON "Shift"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftPropertyDefinition_propertyKey_key" ON "ShiftPropertyDefinition"("propertyKey");

-- CreateIndex
CREATE INDEX "ShiftPropertyDefinition_status_idx" ON "ShiftPropertyDefinition"("status");

-- CreateIndex
CREATE INDEX "ShiftProperty_shiftId_idx" ON "ShiftProperty"("shiftId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftProperty_shiftId_propertyKey_key" ON "ShiftProperty"("shiftId", "propertyKey");

-- CreateIndex
CREATE UNIQUE INDEX "PunchDevice_code_key" ON "PunchDevice"("code");

-- CreateIndex
CREATE INDEX "DeviceAccount_deviceId_accountId_effectiveDate_expiryDate_idx" ON "DeviceAccount"("deviceId", "accountId", "effectiveDate", "expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "PunchRule_code_key" ON "PunchRule"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CalcRule_code_key" ON "CalcRule"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceCode_code_key" ON "AttendanceCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceGroup_code_key" ON "DeviceGroup"("code");

-- CreateIndex
CREATE INDEX "PunchPair_employeeNo_pairDate_idx" ON "PunchPair"("employeeNo", "pairDate");

-- CreateIndex
CREATE INDEX "PunchPair_shiftId_idx" ON "PunchPair"("shiftId");

-- CreateIndex
CREATE INDEX "PunchPair_accountId_idx" ON "PunchPair"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionLine_code_key" ON "ProductionLine"("code");

-- CreateIndex
CREATE INDEX "LineShift_orgId_scheduleDate_idx" ON "LineShift"("orgId", "scheduleDate");

-- CreateIndex
CREATE INDEX "LineShift_scheduleDate_idx" ON "LineShift"("scheduleDate");

-- CreateIndex
CREATE UNIQUE INDEX "LineShift_orgId_shiftId_scheduleDate_deletedAt_key" ON "LineShift"("orgId", "shiftId", "scheduleDate", "deletedAt");

-- CreateIndex
CREATE INDEX "ProductStandardHours_productId_effectiveDate_expiryDate_status_idx" ON "ProductStandardHours"("productId", "effectiveDate", "expiryDate", "status");

-- CreateIndex
CREATE INDEX "ProductionRecord_recordDate_idx" ON "ProductionRecord"("recordDate");

-- CreateIndex
CREATE INDEX "ProductionRecord_orgId_recordDate_idx" ON "ProductionRecord"("orgId", "recordDate");

-- CreateIndex
CREATE INDEX "ProductionRecord_productId_recordDate_idx" ON "ProductionRecord"("productId", "recordDate");

-- CreateIndex
CREATE INDEX "ProductionRecord_shiftId_recordDate_idx" ON "ProductionRecord"("shiftId", "recordDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionRecord_recordDate_orgId_shiftId_productId_deletedAt_key" ON "ProductionRecord"("recordDate", "orgId", "shiftId", "productId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AllocationConfig_configCode_key" ON "AllocationConfig"("configCode");

-- CreateIndex
CREATE UNIQUE INDEX "AllocationSourceConfig_configId_key" ON "AllocationSourceConfig"("configId");

-- CreateIndex
CREATE INDEX "AllocationRuleConfig_configId_idx" ON "AllocationRuleConfig"("configId");

-- CreateIndex
CREATE INDEX "AllocationRuleConfig_status_idx" ON "AllocationRuleConfig"("status");

-- CreateIndex
CREATE INDEX "AllocationRuleTarget_ruleId_idx" ON "AllocationRuleTarget"("ruleId");

-- CreateIndex
CREATE INDEX "AllocationRuleTarget_targetType_targetId_idx" ON "AllocationRuleTarget"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AllocationResult_batchNo_idx" ON "AllocationResult"("batchNo");

-- CreateIndex
CREATE INDEX "AllocationResult_recordDate_idx" ON "AllocationResult"("recordDate");

-- CreateIndex
CREATE INDEX "AllocationResult_configId_idx" ON "AllocationResult"("configId");

-- CreateIndex
CREATE INDEX "AllocationResult_ruleId_idx" ON "AllocationResult"("ruleId");

-- CreateIndex
CREATE INDEX "AllocationResult_calcResultId_idx" ON "AllocationResult"("calcResultId");

-- CreateIndex
CREATE INDEX "AllocationResult_targetType_targetId_idx" ON "AllocationResult"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AllocationResult_sourceEmployeeNo_idx" ON "AllocationResult"("sourceEmployeeNo");

-- CreateIndex
CREATE INDEX "AllocationResult_calcTime_idx" ON "AllocationResult"("calcTime");

-- CreateIndex
CREATE UNIQUE INDEX "AllocationBasis_basisCode_key" ON "AllocationBasis"("basisCode");

-- CreateIndex
CREATE INDEX "AllocationBasis_status_idx" ON "AllocationBasis"("status");

-- CreateIndex
CREATE INDEX "AuditLog_module_idx" ON "AuditLog"("module");

-- CreateIndex
CREATE INDEX "AuditLog_operatorId_idx" ON "AuditLog"("operatorId");

-- CreateIndex
CREATE INDEX "AuditLog_operationTime_idx" ON "AuditLog"("operationTime");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "SearchConditionConfig_pageCode_idx" ON "SearchConditionConfig"("pageCode");

-- CreateIndex
CREATE UNIQUE INDEX "SearchConditionConfig_pageCode_fieldCode_key" ON "SearchConditionConfig"("pageCode", "fieldCode");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_configKey_key" ON "SystemConfig"("configKey");

-- CreateIndex
CREATE INDEX "SystemConfig_category_idx" ON "SystemConfig"("category");

-- CreateIndex
CREATE INDEX "WorkInfoHistory_employeeId_effectiveDate_idx" ON "WorkInfoHistory"("employeeId", "effectiveDate");

-- CreateIndex
CREATE INDEX "WorkInfoHistory_employeeId_isCurrent_idx" ON "WorkInfoHistory"("employeeId", "isCurrent");

-- CreateIndex
CREATE INDEX "EmployeeEducation_employeeId_idx" ON "EmployeeEducation"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeEducation_employeeId_isHighest_idx" ON "EmployeeEducation"("employeeId", "isHighest");

-- CreateIndex
CREATE INDEX "EmployeeWorkExperience_employeeId_idx" ON "EmployeeWorkExperience"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeWorkExperience_employeeId_startDate_idx" ON "EmployeeWorkExperience"("employeeId", "startDate");

-- CreateIndex
CREATE INDEX "EmployeeFamilyMember_employeeId_idx" ON "EmployeeFamilyMember"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeFamilyMember_employeeId_isEmergency_idx" ON "EmployeeFamilyMember"("employeeId", "isEmergency");


