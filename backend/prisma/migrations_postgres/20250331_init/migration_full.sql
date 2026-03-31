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



-- ========================================
-- 种子数据 (Seed Data)
-- 生成时间: 2026-03-31T10:20:38+08:00
-- ========================================


INSERT INTO "DataSource" VALUES (1, 'ORG_TYPE', '组织类型', 'BUILTIN', '组织架构类型选项', true, 'ACTIVE', 1, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (2, 1, '工厂', 'COMPANY', 2, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (3, 1, '车间', 'DEPARTMENT', 3, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (1, 1, '集团', 'GROUP', 1, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (5, 1, '岗位', 'POSITION', 5, false, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (4, 1, '产线', 'TEAM', 4, true, NOW(), NOW());
INSERT INTO "DataSource" VALUES (2, 'EDUCATION', '学历', 'CUSTOM', '员工学历选项', false, 'ACTIVE', 2, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (8, 2, '本科', 'BACHELOR', 3, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (7, 2, '大专', 'COLLEGE', 2, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (10, 2, '博士', 'DOCTOR', 5, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (6, 2, '高中', 'HIGH_SCHOOL', 1, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (9, 2, '硕士', 'MASTER', 4, true, NOW(), NOW());
INSERT INTO "DataSource" VALUES (3, 'WORK_STATUS', '工作状态', 'CUSTOM', '员工工作状态', false, 'ACTIVE', 3, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (11, 3, '在职', 'ACTIVE', 1, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (13, 3, '请假', 'LEAVE', 3, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (12, 3, '试用期', 'PROBATION', 2, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (14, 3, '离职', 'RESIGNED', 4, true, NOW(), NOW());
INSERT INTO "DataSource" VALUES (4, 'Job', '岗位', 'CUSTOM', NULL, false, 'ACTIVE', 0, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (17, 4, '标签', 'A01', 0, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (18, 4, '配料', 'A02', 0, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (19, 4, '前加工', 'A03', 0, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (20, 4, '操作工', 'A04', 0, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (21, 4, '维修工', 'A05', 0, true, NOW(), NOW());
INSERT INTO "DataSource" VALUES (5, 'DeviceType', '设备类型', 'CUSTOM', NULL, false, 'ACTIVE', 0, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (15, 5, '直接设备', 'A01', 0, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (16, 5, '间接设备', 'A02', 0, true, NOW(), NOW());
INSERT INTO "DataSource" VALUES (6, 'Locition', '工位', 'CUSTOM', NULL, false, 'ACTIVE', 0, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (22, 6, '工位1', 'A01', 0, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (23, 6, '工位2', 'A02', 0, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (24, 6, '工位3', 'A03', 0, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (25, 6, '工位4', 'A04', 0, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (26, 6, '工位5', 'A05', 0, true, NOW(), NOW());
INSERT INTO "DataSource" VALUES (7, 'EmpType', '人员类型', 'CUSTOM', NULL, false, 'ACTIVE', 0, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (27, 7, '直接', 'A01', 0, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (28, 7, '车间间接', 'A02', 0, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (29, 7, '工厂间接', 'A03', 0, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (30, 7, '辅助', 'A04', 0, true, NOW(), NOW());
INSERT INTO "DataSource" VALUES (9, 'gender', '性别', 'BUILTIN', '员工性别', true, 'ACTIVE', 1, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (34, 9, '女', 'female', 2, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (33, 9, '男', 'male', 1, true, NOW(), NOW());
INSERT INTO "DataSource" VALUES (10, 'nation', '民族', 'BUILTIN', '员工民族', true, 'ACTIVE', 2, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (35, 10, '汉族', 'han', 1, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (36, 10, '回族', 'hui', 2, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (37, 10, '满族', 'manchu', 3, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (39, 10, '蒙古族', 'mongol', 5, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (42, 10, '其他', 'other', 99, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (40, 10, '藏族', 'tibetan', 6, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (38, 10, '维吾尔族', 'uygur', 4, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (41, 10, '壮族', 'zhuang', 7, true, NOW(), NOW());
INSERT INTO "DataSource" VALUES (11, 'marital_status', '婚姻状况', 'BUILTIN', '员工婚姻状况', true, 'ACTIVE', 3, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (45, 11, '离异', 'divorced', 3, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (44, 11, '已婚', 'married', 2, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (43, 11, '未婚', 'unmarried', 1, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (46, 11, '丧偶', 'widowed', 4, true, NOW(), NOW());
INSERT INTO "DataSource" VALUES (12, 'political_status', '政治面貌', 'BUILTIN', '员工政治面貌', true, 'ACTIVE', 4, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (50, 12, '民主党派', 'democratic_party', 4, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (48, 12, '团员', 'league_member', 2, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (49, 12, '群众', 'mass', 3, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (51, 12, '无党派人士', 'none', 5, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (47, 12, '党员', 'party_member', 1, true, NOW(), NOW());
INSERT INTO "DataSource" VALUES (13, 'job_level', '职级', 'BUILTIN', '员工职级', true, 'ACTIVE', 5, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (57, 13, 'M1', 'M1', 6, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (58, 13, 'M2', 'M2', 7, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (59, 13, 'M3', 'M3', 8, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (60, 13, 'M4', 'M4', 9, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (61, 13, 'M5', 'M5', 10, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (52, 13, 'P1', 'P1', 1, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (53, 13, 'P2', 'P2', 2, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (54, 13, 'P3', 'P3', 3, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (55, 13, 'P4', 'P4', 4, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (56, 13, 'P5', 'P5', 5, true, NOW(), NOW());
INSERT INTO "DataSource" VALUES (14, 'employee_type', '员工类型', 'BUILTIN', '员工类型', true, 'ACTIVE', 6, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (67, 14, '顾问', 'consultant', 6, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (62, 14, '正式员工', 'formal', 1, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (64, 14, '实习生', 'intern', 3, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (65, 14, '劳务派遣', 'labor_dispatch', 4, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (66, 14, '外包人员', 'outsourcing', 5, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (68, 14, '兼职', 'part_time', 7, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (63, 14, '试用期员工', 'probation', 2, true, NOW(), NOW());
INSERT INTO "DataSource" VALUES (15, 'employment_status', '在职状态', 'BUILTIN', '员工在职状态', true, 'ACTIVE', 7, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (69, 15, '在职', 'active', 1, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (70, 15, '试用期', 'probation', 2, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (71, 15, '离职', 'resigned', 3, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (73, 15, '退休', 'retired', 5, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (74, 15, '开除', 'terminated', 6, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (72, 15, '停薪留职', 'unpaid_leave', 4, true, NOW(), NOW());
INSERT INTO "DataSource" VALUES (16, 'resignation_reason', '离职原因', 'BUILTIN', '员工离职原因', true, 'ACTIVE', 8, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (76, 16, '公司原因', 'company', 2, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (78, 16, '合同到期', 'contract_expired', 4, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (80, 16, '严重违纪', 'misconduct', 6, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (81, 16, '协商解除', 'mutual_agreement', 7, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (75, 16, '个人原因', 'personal', 1, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (79, 16, '试用期不合格', 'probation_failed', 5, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (77, 16, '退休', 'retirement', 3, true, NOW(), NOW());
INSERT INTO "DataSource" VALUES (17, 'education_level', '学历层次', 'BUILTIN', '最高学历层次', true, 'ACTIVE', 9, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (84, 17, '本科', 'bachelor', 3, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (85, 17, '专科', 'college', 4, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (82, 17, '博士研究生', 'doctor', 1, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (86, 17, '高中', 'high_school', 5, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (83, 17, '硕士研究生', 'master', 2, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (87, 17, '初中', 'middle_school', 6, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (89, 17, '其他', 'other', 8, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (88, 17, '小学', 'primary_school', 7, true, NOW(), NOW());
INSERT INTO "DataSource" VALUES (18, 'education_type', '学历类型', 'BUILTIN', '学历类型', true, 'ACTIVE', 10, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (93, 18, '函授', 'correspondence', 4, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (94, 18, '夜大', 'evening_university', 5, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (90, 18, '全日制', 'full_time', 1, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (91, 18, '在职', 'in_service', 2, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (96, 18, '网教', 'online_education', 7, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (97, 18, '其他', 'other', 8, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (92, 18, '自考', 'self_taught', 3, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (95, 18, '电大', 'tv_university', 6, true, NOW(), NOW());
INSERT INTO "DataSource" VALUES (19, 'family_relation', '家庭关系', 'BUILTIN', '家庭成员关系', true, 'ACTIVE', 11, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (103, 19, '兄弟', 'brother', 6, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (102, 19, '女儿', 'daughter', 5, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (99, 19, '父亲', 'father', 2, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (105, 19, '祖父', 'grandfather', 8, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (106, 19, '祖母', 'grandmother', 9, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (100, 19, '母亲', 'mother', 3, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (107, 19, '其他', 'other', 99, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (104, 19, '姐妹', 'sister', 7, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (101, 19, '儿子', 'son', 4, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (98, 19, '配偶', 'spouse', 1, true, NOW(), NOW());
INSERT INTO "DataSource" VALUES (20, 'POSITION', '职位', 'CUSTOM', '员工职位选项', true, 'ACTIVE', 1, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (116, 20, '助理', 'ASSISTANT', 9, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (108, 20, 'CEO', 'CEO', 1, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (110, 20, 'CFO', 'CFO', 3, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (111, 20, 'COO', 'COO', 4, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (109, 20, 'CTO', 'CTO', 2, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (112, 20, '总监', 'DIRECTOR', 5, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (117, 20, '实习生', 'INTERN', 10, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (113, 20, '经理', 'MANAGER', 6, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (115, 20, '专员', 'SPECIALIST', 8, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (114, 20, '主管', 'SUPERVISOR', 7, true, NOW(), NOW());
INSERT INTO "DataSource" VALUES (21, 'JOB_LEVEL', '职级', 'CUSTOM', '员工职级选项', true, 'ACTIVE', 2, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (118, 21, 'M1 (初级)', 'M1', 1, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (119, 21, 'M2 (中级)', 'M2', 2, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (120, 21, 'M3 (高级)', 'M3', 3, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (121, 21, 'M4 (专家)', 'M4', 4, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (122, 21, 'P1 (初级专员)', 'P1', 5, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (123, 21, 'P2 (专员)', 'P2', 6, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (124, 21, 'P3 (高级专员)', 'P3', 7, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (125, 21, 'P4 (资深专员)', 'P4', 8, true, NOW(), NOW());
INSERT INTO "DataSource" VALUES (22, 'EMPLOYEE_TYPE', '员工类型', 'CUSTOM', '员工类型选项', true, 'ACTIVE', 3, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (128, 22, '合同工', 'CONTRACT', 3, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (126, 22, '全职', 'FULL_TIME', 1, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (129, 22, '实习生', 'INTERN', 4, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (130, 22, '外包', 'OUTSOURCING', 5, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (127, 22, '兼职', 'PART_TIME', 2, true, NOW(), NOW());
INSERT INTO "DataSource" VALUES (23, 'change_type', '异动类型', 'SELECT_SINGLE', '员工工作信息异动类型，包括入职、调岗、晋升、降职、离职等', false, 'ACTIVE', 0, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (134, 23, '降职', 'DEMOTION', 4, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (131, 23, '入职', 'ENTRY', 1, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (138, 23, '长期病假', 'LONG_TERM_SICK_LEAVE', 8, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (133, 23, '晋升', 'PROMOTION', 3, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (136, 23, '复职', 'REINSTATEMENT', 6, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (135, 23, '离职', 'RESIGNATION', 5, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (132, 23, '调岗', 'TRANSFER', 2, true, NOW(), NOW());
INSERT INTO "DataSourceOption" VALUES (137, 23, '停薪留职', 'UNPAID_LEAVE', 7, true, NOW(), NOW());
INSERT INTO "Role" VALUES (1, 'ADMIN', '系统管理员', '拥有系统所有权限', '["*"]', 'ALL', NULL, NULL, NULL, false, 'ACTIVE', NOW(), NOW());
INSERT INTO "Role" VALUES (2, 'HR_ADMIN', 'HR管理员', '人事管理相关权限', '["hr:org:view","hr:org:edit","hr:emp:view","hr:emp:edit","hr:emp:delete"]', 'CUSTOM', NULL, NULL, '[{"rules":[{"field":"employeeNo","value":"bachelor","operator":"=="}]}]', false, 'ACTIVE', NOW(), NOW());
INSERT INTO "User" VALUES (1, 'admin', '$2b$10$FBZ1/bn6oCA0CGvjzSWMxOo7MnNbsAkpoAhhfHtsk/DowgY08PovC', '系统管理员', NULL, 'ACTIVE', NOW(), NOW());
INSERT INTO "User" VALUES (2, 'hr_admin', '$2b$10$ZEOkPHHq8xdvnwAIk6wKwuiX4n.Lx7GSdrdLIbJwZNJ2O2n1WpTcO', 'HR管理员', NULL, 'ACTIVE', NOW(), NOW());
INSERT INTO "User" VALUES (3, 'A0001', '$2b$10$GIhaR1GMwSRoJRW0L3s8du6CYf6whxbs6TjKjlRsLR5UPd/3SUs4W', 'Aaron.he', 'Aaron.he@gaiaworks.cn', 'ACTIVE', NOW(), NOW());
INSERT INTO "User" VALUES (4, 'A0002', '$2b$10$TOZmH9C.V19NTcr01Lx5SeoChH5uTHKN.hSwJ24I2pm0ezMFUR7YS', '小P', '13862547208@163.com', 'ACTIVE', NOW(), NOW());
INSERT INTO "User" VALUES (5, 'A0003', '$2b$10$X.I7s7ev5OB7kLKr.pwdVOGOCKgWVwHdkXtHCu/KvMebu9ZgsepH6', 'Aaron.he', 'Aaron.he@gaiaworks.cn', 'ACTIVE', NOW(), NOW());
INSERT INTO "User" VALUES (6, 'A0004', '$2b$10$cZfWtmJK9aA3d3tSW68j4uAr8ysPQvmx1DPoL7H6U9wAt0pwInqSK', 'Aaron.he', 'Aaron.he@gaiaworks.cn', 'ACTIVE', NOW(), NOW());
INSERT INTO "User" VALUES (7, 'A0005', '$2b$10$uWABVUokbY1V539jF7mGeuDE5LAWl7.4lXABy9TPLRDRe1BeBevmG', '张三', 'Aaron.he@gaiaworks.cn', 'ACTIVE', NOW(), NOW());
INSERT INTO "UserRole" VALUES (1, 1, 1, NOW());
INSERT INTO "UserRole" VALUES (2, 2, 2, NOW());
INSERT INTO "Organization" VALUES (1, 'ROOT', '集团总部', NULL, 'GROUP', 4, '李四', 1, '2026-03-05T07:36:57.265Z', NULL, 'ACTIVE', NOW(), NOW());
INSERT INTO "Organization" VALUES (2, 'TECH', '技术部', 1, 'DEPARTMENT', NULL, '技术总监', 2, '2026-03-05T07:36:57.270Z', NULL, 'ACTIVE', NOW(), NOW());
INSERT INTO "Organization" VALUES (3, 'HR', '人力资源部', 1, 'DEPARTMENT', NULL, 'HR总监', 2, '2026-03-05T07:36:57.273Z', NULL, 'INACTIVE', NOW(), NOW());
INSERT INTO "Organization" VALUES (4, 'TEST01', '测试组织', NULL, 'COMPANY', NULL, NULL, 1, '2025-03-05T00:00:00.000Z', NULL, 'INACTIVE', NOW(), NOW());
INSERT INTO "Organization" VALUES (5, 'A01', '富阳工厂', 1, 'COMPANY', NULL, NULL, 2, '2025-02-28T16:00:00.000Z', NULL, 'ACTIVE', NOW(), NOW());
INSERT INTO "Organization" VALUES (6, 'A0101', 'W1总装车间', 5, 'DEPARTMENT', NULL, NULL, 3, '2026-01-05T00:00:00.000Z', NULL, 'ACTIVE', NOW(), NOW());
INSERT INTO "Organization" VALUES (7, 'A010101', 'L1线体', 6, 'TEAM', NULL, NULL, 4, '2026-03-05T19:58:24.205Z', NULL, 'ACTIVE', NOW(), NOW());
INSERT INTO "Organization" VALUES (8, 'A010102', 'L2线体', 6, 'TEAM', NULL, NULL, 4, '2026-03-05T19:58:52.464Z', NULL, 'ACTIVE', NOW(), NOW());
INSERT INTO "Organization" VALUES (9, 'A0102', 'W2总装车间', 5, 'DEPARTMENT', NULL, NULL, 3, '2026-03-01T00:00:00.000Z', NULL, 'ACTIVE', NOW(), NOW());
INSERT INTO "Organization" VALUES (10, 'A010201', 'L3线体', 9, 'TEAM', NULL, NULL, 4, '2026-03-12T13:36:58.058Z', NULL, 'ACTIVE', NOW(), NOW());
INSERT INTO "Organization" VALUES (11, 'A010202', 'L4线体', 9, 'TEAM', NULL, NULL, 4, '2026-03-01T00:00:00.000Z', NULL, 'ACTIVE', NOW(), NOW());
INSERT INTO "Employee" VALUES (1, 'EMP001', '张三', 'MALE', '310101199001011234', '13800138001', 'zhangsan@example.com', 2, '2023-01-01T00:00:00.000Z', 'ACTIVE', '{}', NOW(), NOW(), NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "Employee" VALUES (2, 'EMP002', '李四', 'FEMALE', '310101199002022345', '13800138002', 'lisi@example.com', 2, '2023-03-01T00:00:00.000Z', 'ACTIVE', '{}', NOW(), NOW(), NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "Employee" VALUES (3, 'A01', '张三', 'MALE', NULL, NULL, NULL, 8, '2026-03-01T00:00:00.000Z', 'ACTIVE', '{}', NOW(), NOW(), NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "Employee" VALUES (4, 'A02', '李四', 'MALE', NULL, NULL, NULL, 7, '2026-03-01T00:00:00.000Z', '111', '{"dept_id":"11111","position":"COO","jobLevel":"M3","employeeType":"PART_TIME","hireDate":"2026-02-28T16:00:00.000Z"}', NOW(), NOW(), NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "Employee" VALUES (5, 'A0001', 'Aaron.he', 'male', NULL, NULL, 'Aaron.he@gaiaworks.cn', 7, '2025-01-01T00:00:00.000Z', 'ACTIVE', '{"A06":"A01"}', NOW(), NOW(), NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "Employee" VALUES (6, 'A0002', '小P', 'female', NULL, NULL, '13862547208@163.com', 7, '2025-01-01T00:00:00.000Z', 'ACTIVE', '{"A06":"A01"}', NOW(), NOW(), NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "Employee" VALUES (7, 'A0003', 'Aaron.he', 'male', NULL, NULL, 'Aaron.he@gaiaworks.cn', 7, '2025-01-01T00:00:00.000Z', 'ACTIVE', '{"A06":"A02"}', NOW(), NOW(), NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO "Employee" VALUES (8, 'A0004', 'Aaron.he', 'male', NULL, NULL, 'Aaron.he@gaiaworks.cn', 10, '2025-01-01T00:00:00.000Z', 'ACTIVE', '{"A06":"A02"}', NOW(), NOW(), 1, '1999-01-01T00:00:00.000Z', NULL, '张三', '15851492871', 'other', NULL, NULL, NULL, 'unmarried', NULL, NULL, NULL);
INSERT INTO "Employee" VALUES (9, 'A0005', '张三', 'female', NULL, NULL, 'Aaron.he@gaiaworks.cn', 9, '2025-01-01T00:00:00.000Z', 'ACTIVE', '{"changeType":"REINSTATEMENT","orgId":5,"position":"CEO","jobLevel":"M4","employeeType":"CONTRACT","workLocation":"","workAddress":"","hireDate":"2025-01-01T00:00:00.000Z"}', NOW(), NOW(), 1, '1999-01-01T00:00:00.000Z', NULL, '张三', '15851492871', 'other', NULL, NULL, NULL, 'married', '苏州', NULL, 'party_member');
INSERT INTO "Shift" VALUES (1, 'NORMAL', '早班', 'NORMAL', 8, 1.5, '#1890ff', 'ACTIVE', NOW(), NOW());
INSERT INTO "Shift" VALUES (2, 'TEST1', '晚班', 'NORMAL', 8, 1, NULL, 'ACTIVE', NOW(), NOW());
INSERT INTO "Shift" VALUES (3, 'A000001', '早班', 'NORMAL', 10, 0, '#6366f1', 'ACTIVE', NOW(), NOW());
INSERT INTO "ShiftProperty" VALUES (1, 1, 'A0001', '是', NULL, 0, NOW(), NOW());
INSERT INTO "ShiftProperty" VALUES (2, 2, 'A0002', '是', NULL, 0, NOW(), NOW());
INSERT INTO "PunchDevice" VALUES (1, 'DEV001', '前台考勤机', 'FACE', NULL, NULL, 'NORMAL', NOW(), NOW());
INSERT INTO "PunchDevice" VALUES (2, 'A01', '设备1', 'FINGERPRINT', NULL, 1, 'NORMAL', NOW(), NOW());
INSERT INTO "PunchDevice" VALUES (3, 'A02', 'L2线体设备', 'FINGERPRINT', NULL, 1, 'NORMAL', NOW(), NOW());
INSERT INTO "PunchDevice" VALUES (4, 'L201', 'L2工位设备1', 'FINGERPRINT', NULL, 2, 'NORMAL', NOW(), NOW());
INSERT INTO "PunchDevice" VALUES (5, 'L202', 'L2工位设备2', 'FINGERPRINT', NULL, 2, 'NORMAL', NOW(), NOW());
INSERT INTO "PunchDevice" VALUES (6, 'L101', 'L1工位设备1', 'FINGERPRINT', NULL, 2, 'NORMAL', NOW(), NOW());
INSERT INTO "PunchDevice" VALUES (7, 'L102', 'L1工位设备2', 'FINGERPRINT', NULL, 2, 'NORMAL', NOW(), NOW());
INSERT INTO "PunchDevice" VALUES (8, 'W1', 'W1总装车间设备', 'FINGERPRINT', NULL, NULL, 'NORMAL', NOW(), NOW());
INSERT INTO "PunchDevice" VALUES (9, 'G01', '富阳工厂设备', 'FINGERPRINT', NULL, NULL, 'NORMAL', NOW(), NOW());
INSERT INTO "EmployeeInfoTab" VALUES (5, 'basic_info', '基本信息', '员工基本个人信息', true, 1, 'ACTIVE', NOW(), NOW());
INSERT INTO "EmployeeInfoTabGroup" VALUES (4, 5, 'emergency_contact', '紧急联系人', '紧急情况联系人', 4, 'ACTIVE', false, true, NOW(), NOW());
INSERT INTO "EmployeeInfoTabGroup" VALUES (1, 5, 'personal_info', '个人信息', '个人基本资料', 1, 'ACTIVE', false, true, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (97, 5, 1, 'A05', '设备类型', 'CUSTOM', true, true, 1, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (99, 5, 1, 'A06', '人员类型', 'CUSTOM', true, false, 4, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (32, 5, 1, 'age', '年龄', 'SYSTEM', true, false, 6, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (31, 5, 1, 'birth_date', '出生日期', 'SYSTEM', true, false, 3, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (38, 5, 1, 'current_address', '现居住地址', 'SYSTEM', false, true, 13, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (41, 5, 1, 'email', '邮箱', 'SYSTEM', true, false, 14, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (42, 5, 4, 'emergency_contact', '紧急联系人', 'SYSTEM', true, false, 0, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (43, 5, 4, 'emergency_phone', '紧急联系电话', 'SYSTEM', true, false, 1, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (44, 5, 4, 'emergency_relation', '紧急联系人关系', 'SYSTEM', true, false, 2, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (29, 5, 1, 'gender', '性别', 'SYSTEM', true, false, 5, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (45, 5, 4, 'home_address', '家庭住址', 'SYSTEM', false, false, 3, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (46, 5, 4, 'home_phone', '家庭电话', 'SYSTEM', false, false, 4, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (37, 5, 1, 'household_register', '户口所在地', 'SYSTEM', false, true, 11, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (30, 5, 1, 'id_card', '身份证号', 'SYSTEM', true, true, 7, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (34, 5, 1, 'marital_status', '婚姻状况', 'SYSTEM', true, false, 9, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (40, 5, 1, 'mobile', '手机号码', 'SYSTEM', false, false, 12, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (28, 5, 1, 'name', '姓名', 'SYSTEM', true, false, 2, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (33, 5, 1, 'nation', '民族', 'SYSTEM', false, false, 0, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (36, 5, 1, 'native_place', '籍贯', 'SYSTEM', false, false, 8, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (39, 5, 1, 'photo', '照片', 'SYSTEM', false, false, 15, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (35, 5, 1, 'political_status', '政治面貌', 'SYSTEM', false, false, 10, NOW(), NOW());
INSERT INTO "EmployeeInfoTab" VALUES (6, 'work_info', '工作信息', '员工工作相关信息', true, 2, 'ACTIVE', NOW(), NOW());
INSERT INTO "EmployeeInfoTabGroup" VALUES (6, 6, 'entry_info', '入职信息', '入职相关信息', 2, 'ACTIVE', false, true, NOW(), NOW());
INSERT INTO "EmployeeInfoTabGroup" VALUES (5, 6, 'position_info', '职位信息', '职位相关信息', 1, 'ACTIVE', false, true, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (27, 6, 6, 'employee_no', '工号', 'SYSTEM', true, false, 0, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (51, 6, 5, 'employee_type', '员工类型', 'SYSTEM', true, false, 5, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (54, 6, 6, 'entry_date', '入职日期', 'SYSTEM', true, false, 1, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (55, 6, 6, 'hire_date', '受雇日期', 'SYSTEM', true, false, 2, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (50, 6, 5, 'job_level', '职级', 'SYSTEM', true, false, 4, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (47, 6, 5, 'org_id', '所属组织', 'SYSTEM', true, false, 1, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (49, 6, 5, 'position', '职位', 'SYSTEM', true, false, 3, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (57, 6, 6, 'probation_end', '试用期结束', 'SYSTEM', false, false, 4, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (58, 6, 6, 'probation_months', '试用期月数', 'SYSTEM', false, false, 5, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (56, 6, 6, 'probation_start', '试用期开始', 'SYSTEM', false, false, 3, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (59, 6, 6, 'regular_date', '转正日期', 'SYSTEM', false, false, 6, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (61, 6, 6, 'resignation_date', '离职日期', 'SYSTEM', false, false, 8, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (62, 6, 6, 'resignation_reason', '离职原因', 'SYSTEM', false, false, 9, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (60, 6, 6, 'status', '在职状态', 'SYSTEM', true, false, 7, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (53, 6, 5, 'work_address', '办公地址', 'SYSTEM', false, false, 7, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (52, 6, 5, 'work_location', '工作地点', 'SYSTEM', false, false, 6, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (63, 6, 6, 'work_years', '工作年限', 'SYSTEM', false, false, 10, NOW(), NOW());
INSERT INTO "EmployeeInfoTab" VALUES (7, 'education_info', '学历信息', '员工教育背景信息', true, 3, 'ACTIVE', NOW(), NOW());
INSERT INTO "EmployeeInfoTabGroup" VALUES (7, 7, 'highest_education', '最高学历', '最高学历信息', 1, 'ACTIVE', false, true, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (69, 7, 7, 'degree_no', '学位证书号', 'SYSTEM', false, false, 6, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (70, 7, 7, 'diploma_no', '毕业证书号', 'SYSTEM', false, false, 7, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (64, 7, 7, 'education_level', '学历层次', 'SYSTEM', true, false, 1, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (65, 7, 7, 'education_type', '学历类型', 'SYSTEM', false, false, 2, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (66, 7, 7, 'graduate_school', '毕业院校', 'SYSTEM', false, false, 3, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (68, 7, 7, 'graduation_date', '毕业时间', 'SYSTEM', false, false, 5, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (67, 7, 7, 'major', '专业', 'SYSTEM', false, false, 4, NOW(), NOW());
INSERT INTO "EmployeeInfoTab" VALUES (8, 'work_experience', '工作经历', '员工过往工作经历', true, 4, 'ACTIVE', NOW(), NOW());
INSERT INTO "EmployeeInfoTabGroup" VALUES (8, 8, 'work_experience_group', '工作经历', '工作经历多字段组', 1, 'INACTIVE', false, true, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (71, 8, 8, 'exp_company', '公司名称', 'SYSTEM', true, false, 1, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (77, 8, 8, 'exp_description', '工作描述', 'SYSTEM', false, false, 7, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (74, 8, 8, 'exp_end', '结束时间', 'SYSTEM', true, false, 4, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (72, 8, 8, 'exp_position', '职位', 'SYSTEM', true, false, 2, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (76, 8, 8, 'exp_reason', '离职原因', 'SYSTEM', false, false, 6, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (75, 8, 8, 'exp_salary', '离职时薪资', 'SYSTEM', false, false, 5, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (73, 8, 8, 'exp_start', '开始时间', 'SYSTEM', true, false, 3, NOW(), NOW());
INSERT INTO "EmployeeInfoTab" VALUES (9, 'family_info', '家庭信息', '员工家庭成员信息', true, 5, 'ACTIVE', NOW(), NOW());
INSERT INTO "EmployeeInfoTabGroup" VALUES (9, 9, 'family_info_group', '家庭成员', '家庭成员多字段组', 1, 'INACTIVE', false, true, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (83, 9, 9, 'member_address', '居住地址', 'SYSTEM', false, false, 6, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (80, 9, 9, 'member_age', '年龄', 'SYSTEM', false, false, 3, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (78, 9, 9, 'member_name', '成员姓名', 'SYSTEM', true, false, 1, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (82, 9, 9, 'member_phone', '联系电话', 'SYSTEM', false, false, 5, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (79, 9, 9, 'member_relation', '关系', 'SYSTEM', true, false, 2, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (81, 9, 9, 'member_work', '工作单位', 'SYSTEM', false, false, 4, NOW(), NOW());
INSERT INTO "EmployeeInfoTab" VALUES (19, 'BASIC_INFO', '基本信息', '员工的基本个人信息', true, 1, 'ACTIVE', NOW(), NOW());
INSERT INTO "EmployeeInfoTabGroup" VALUES (17, 19, 'CONTACT_INFO', '联系方式', '电话、邮箱、地址等联系方式', 2, 'ACTIVE', false, true, NOW(), NOW());
INSERT INTO "EmployeeInfoTabGroup" VALUES (18, 19, 'PERSONAL_DETAILS', '个人详情', '出生日期、婚姻状况、政治面貌等', 3, 'ACTIVE', true, true, NOW(), NOW());
INSERT INTO "EmployeeInfoTabGroup" VALUES (16, 19, 'PERSONAL_INFO', '个人资料', '姓名、性别、身份证等基本资料', 1, 'ACTIVE', false, true, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (146, 19, 18, 'age', '年龄', 'NUMBER', false, false, 2, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (145, 19, 18, 'birthDate', '出生日期', 'DATE', false, false, 1, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (141, 19, 17, 'currentAddress', '现居住地址', 'TEXT', false, false, 3, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (140, 19, 17, 'email', '电子邮箱', 'TEXT', false, false, 2, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (142, 19, 17, 'emergencyContact', '紧急联系人', 'TEXT', false, false, 4, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (143, 19, 17, 'emergencyPhone', '紧急联系电话', 'TEXT', false, false, 5, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (144, 19, 17, 'emergencyRelation', '紧急联系人关系', 'TEXT', false, false, 6, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (134, 19, 16, 'employeeNo', '员工编号', 'TEXT', true, false, 1, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (136, 19, 16, 'gender', '性别', 'SELECT', true, false, 3, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (150, 19, 18, 'householdRegister', '户口所在地', 'TEXT', false, false, 6, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (137, 19, 16, 'idCard', '身份证号', 'TEXT', false, false, 4, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (147, 19, 18, 'maritalStatus', '婚姻状况', 'SELECT', false, false, 3, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (135, 19, 16, 'name', '姓名', 'TEXT', true, false, 2, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (148, 19, 18, 'nativePlace', '籍贯', 'TEXT', false, false, 4, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (139, 19, 17, 'phone', '手机号码', 'TEXT', false, false, 1, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (138, 19, 16, 'photo', '照片', 'IMAGE', false, false, 5, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (149, 19, 18, 'politicalStatus', '政治面貌', 'SELECT', false, false, 5, NOW(), NOW());
INSERT INTO "EmployeeInfoTab" VALUES (20, 'WORK_INFO', '工作信息', '员工的工作相关信息，包括职位、职级、异动历史等', true, 2, 'ACTIVE', NOW(), NOW());
INSERT INTO "EmployeeInfoTabGroup" VALUES (19, 20, 'CURRENT_POSITION', '当前职位', '当前职位和岗位信息', 1, 'ACTIVE', false, true, NOW(), NOW());
INSERT INTO "EmployeeInfoTabGroup" VALUES (20, 20, 'EMPLOYMENT_INFO', '雇佣信息', '入职日期、员工类型、试用期等', 2, 'ACTIVE', false, true, NOW(), NOW());
INSERT INTO "EmployeeInfoTabGroup" VALUES (21, 20, 'ORG_INFO', '组织信息', '所属组织和部门信息', 3, 'ACTIVE', false, true, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (153, 20, 19, 'employeeType', '员工类型', 'SELECT', false, false, 3, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (156, 20, 20, 'entryDate', '入职日期', 'DATE', true, false, 1, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (157, 20, 20, 'hireDate', '受雇日期', 'DATE', false, false, 2, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (152, 20, 19, 'jobLevel', '职级', 'TEXT', false, false, 2, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (164, 20, 21, 'orgId', '所属组织', 'ORG_SELECT', true, false, 1, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (151, 20, 19, 'position', '职位', 'TEXT', false, false, 1, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (159, 20, 20, 'probationEnd', '试用期结束', 'DATE', false, false, 4, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (160, 20, 20, 'probationMonths', '试用期月数', 'NUMBER', false, false, 5, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (158, 20, 20, 'probationStart', '试用期开始', 'DATE', false, false, 3, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (161, 20, 20, 'regularDate', '转正日期', 'DATE', false, false, 6, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (163, 20, 20, 'status', '员工状态', 'SELECT', true, false, 8, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (155, 20, 19, 'workAddress', '办公地址', 'TEXT', false, false, 5, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (154, 20, 19, 'workLocation', '工作地点', 'TEXT', false, false, 4, NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (162, 20, 20, 'workYears', '工作年限', 'NUMBER', false, false, 7, NOW(), NOW());
INSERT INTO "EmployeeInfoTab" VALUES (21, 'EDUCATION', '学历信息', '员工的教育背景和学历信息', true, 3, 'ACTIVE', NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (165, 21, NULL, 'educations', '学历列表', 'CHILD_TABLE', false, false, 1, NOW(), NOW());
INSERT INTO "EmployeeInfoTab" VALUES (22, 'WORK_EXPERIENCE', '工作经历', '员工过往的工作经历', true, 4, 'ACTIVE', NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (166, 22, NULL, 'workExperiences', '工作经历列表', 'CHILD_TABLE', false, false, 1, NOW(), NOW());
INSERT INTO "EmployeeInfoTab" VALUES (23, 'FAMILY_INFO', '家庭信息', '员工家庭成员信息', true, 5, 'ACTIVE', NOW(), NOW());
INSERT INTO "EmployeeInfoTabField" VALUES (167, 23, NULL, 'familyMembers', '家庭成员列表', 'CHILD_TABLE', false, false, 1, NOW(), NOW());
INSERT INTO "CustomField" VALUES (1, 'A01', '工作状态', 'SELECT_SINGLE', 3, NULL, false, NULL, '默认分组', 0, false, 'ACTIVE', NOW(), NOW());
INSERT INTO "CustomField" VALUES (2, 'A02', '学历', 'SELECT_SINGLE', 2, NULL, false, NULL, '默认分组', 0, false, 'ACTIVE', NOW(), NOW());
INSERT INTO "CustomField" VALUES (3, 'A03', '岗位', 'SELECT_SINGLE', 4, NULL, false, NULL, '默认分组', 0, false, 'ACTIVE', NOW(), NOW());
INSERT INTO "CustomField" VALUES (4, 'A04', '工位', 'SELECT_SINGLE', 6, NULL, false, NULL, '默认分组', 0, false, 'ACTIVE', NOW(), NOW());
INSERT INTO "CustomField" VALUES (5, 'A05', '设备类型', 'SELECT_SINGLE', 5, NULL, false, NULL, '默认分组', 0, false, 'ACTIVE', NOW(), NOW());
INSERT INTO "CustomField" VALUES (6, 'A06', '人员类型', 'SELECT_SINGLE', 7, NULL, true, NULL, '默认分组', 0, false, 'ACTIVE', NOW(), NOW());
INSERT INTO "CustomField" VALUES (7, 'gender', '性别', 'SELECT_SINGLE', 9, NULL, true, NULL, '基本信息', 1, true, 'ACTIVE', NOW(), NOW());
INSERT INTO "CustomField" VALUES (8, 'nation', '民族', 'SELECT_SINGLE', 10, NULL, false, NULL, '基本信息', 2, true, 'ACTIVE', NOW(), NOW());
INSERT INTO "CustomField" VALUES (9, 'marital_status', '婚姻状况', 'SELECT_SINGLE', 11, NULL, true, NULL, '基本信息', 3, true, 'ACTIVE', NOW(), NOW());
INSERT INTO "CustomField" VALUES (10, 'political_status', '政治面貌', 'SELECT_SINGLE', 12, NULL, false, NULL, '基本信息', 4, true, 'ACTIVE', NOW(), NOW());
INSERT INTO "CustomField" VALUES (11, 'job_level', '职级', 'SELECT_SINGLE', 13, NULL, true, NULL, '工作信息', 5, true, 'ACTIVE', NOW(), NOW());
INSERT INTO "CustomField" VALUES (12, 'employee_type', '员工类型', 'SELECT_SINGLE', 14, NULL, true, NULL, '工作信息', 6, true, 'ACTIVE', NOW(), NOW());
INSERT INTO "CustomField" VALUES (13, 'employment_status', '在职状态', 'SELECT_SINGLE', 15, NULL, true, NULL, '工作信息', 7, true, 'ACTIVE', NOW(), NOW());
INSERT INTO "CustomField" VALUES (14, 'resignation_reason', '离职原因', 'SELECT_SINGLE', 16, NULL, false, NULL, '工作信息', 8, true, 'ACTIVE', NOW(), NOW());
INSERT INTO "CustomField" VALUES (15, 'education_level', '学历层次', 'SELECT_SINGLE', 17, NULL, true, NULL, '学历信息', 9, true, 'ACTIVE', NOW(), NOW());
INSERT INTO "CustomField" VALUES (16, 'education_type', '学历类型', 'SELECT_SINGLE', 18, NULL, true, NULL, '学历信息', 10, true, 'ACTIVE', NOW(), NOW());
INSERT INTO "CustomField" VALUES (17, 'family_relation', '家庭关系', 'SELECT_SINGLE', 19, NULL, true, NULL, '家庭信息', 11, true, 'ACTIVE', NOW(), NOW());
-- ========================================
-- 重置序列
-- ========================================

SELECT setval('"User_id_seq"', (SELECT MAX(id) FROM "User"), true);
SELECT setval('"Role_id_seq"', (SELECT MAX(id) FROM "Role"), true);
SELECT setval('"UserRole_id_seq"', (SELECT MAX(id) FROM "UserRole"), true);
SELECT setval('"Organization_id_seq"', (SELECT MAX(id) FROM "Organization"), true);
SELECT setval('"Employee_id_seq"', (SELECT MAX(id) FROM "Employee"), true);
SELECT setval('"DataSource_id_seq"', (SELECT MAX(id) FROM "DataSource"), true);
SELECT setval('"Shift_id_seq"', (SELECT MAX(id) FROM "Shift"), true);
SELECT setval('"ShiftProperty_id_seq"', (SELECT MAX(id) FROM "ShiftProperty"), true);
SELECT setval('"PunchDevice_id_seq"', (SELECT MAX(id) FROM "PunchDevice"), true);
SELECT setval('"EmployeeInfoTab_id_seq"', (SELECT MAX(id) FROM "EmployeeInfoTab"), true);
SELECT setval('"EmployeeInfoTabGroup_id_seq"', (SELECT MAX(id) FROM "EmployeeInfoTabGroup"), true);
SELECT setval('"EmployeeInfoTabField_id_seq"', (SELECT MAX(id) FROM "EmployeeInfoTabField"), true);
SELECT setval('"CustomField_id_seq"', (SELECT MAX(id) FROM "CustomField"), true);

