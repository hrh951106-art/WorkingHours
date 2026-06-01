-- PostgreSQL Data Export
-- Generated from SQLite database: prisma/dev.db

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

BEGIN;

-- Data for table: AccountHierarchyConfig
TRUNCATE TABLE "AccountHierarchyConfig" RESTART IDENTITY CASCADE;

-- Data for table: AccountHierarchyLevelDetail
TRUNCATE TABLE "AccountHierarchyLevelDetail" RESTART IDENTITY CASCADE;

-- Data for table: AllocationConfig
TRUNCATE TABLE "AllocationConfig" RESTART IDENTITY CASCADE;

-- Data for table: AllocationResult
TRUNCATE TABLE "AllocationResult" RESTART IDENTITY CASCADE;

-- Data for table: AllocationRuleConfig
TRUNCATE TABLE "AllocationRuleConfig" RESTART IDENTITY CASCADE;

-- Data for table: AllocationSourceConfig
TRUNCATE TABLE "AllocationSourceConfig" RESTART IDENTITY CASCADE;

-- Data for table: AmountPolicy
TRUNCATE TABLE "AmountPolicy" RESTART IDENTITY CASCADE;

-- Data for table: AmountPolicyGroup
TRUNCATE TABLE "AmountPolicyGroup" RESTART IDENTITY CASCADE;

-- Data for table: AttendancePunchPair
TRUNCATE TABLE "AttendancePunchPair" RESTART IDENTITY CASCADE;

-- Data for table: AttendanceRuleGroup
TRUNCATE TABLE "AttendanceRuleGroup" RESTART IDENTITY CASCADE;

-- Data for table: AttendanceRuleGroupDetail
TRUNCATE TABLE "AttendanceRuleGroupDetail" RESTART IDENTITY CASCADE;

-- Data for table: AuditLog
TRUNCATE TABLE "AuditLog" RESTART IDENTITY CASCADE;

-- Data for table: CalcResult
TRUNCATE TABLE "CalcResult" RESTART IDENTITY CASCADE;

-- Data for table: CalculationAttendanceCode
TRUNCATE TABLE "CalculationAttendanceCode" RESTART IDENTITY CASCADE;

-- Data for table: CustomField
TRUNCATE TABLE "CustomField" RESTART IDENTITY CASCADE;

-- Data for table: DataSource
TRUNCATE TABLE "DataSource" RESTART IDENTITY CASCADE;

-- Data for table: DataSourceOption
TRUNCATE TABLE "DataSourceOption" RESTART IDENTITY CASCADE;

-- Data for table: DefinitionAttendanceCode
TRUNCATE TABLE "DefinitionAttendanceCode" RESTART IDENTITY CASCADE;

-- Data for table: DeviceAccount
TRUNCATE TABLE "DeviceAccount" RESTART IDENTITY CASCADE;

-- Data for table: DeviceGroup
TRUNCATE TABLE "DeviceGroup" RESTART IDENTITY CASCADE;

-- Data for table: EarnedHoursAllocationConfig
TRUNCATE TABLE "EarnedHoursAllocationConfig" RESTART IDENTITY CASCADE;

-- Data for table: EarnedHoursAllocationResult
TRUNCATE TABLE "EarnedHoursAllocationResult" RESTART IDENTITY CASCADE;

-- Data for table: Employee
TRUNCATE TABLE "Employee" RESTART IDENTITY CASCADE;

-- Data for table: EmployeeAttendanceRuleGroup
TRUNCATE TABLE "EmployeeAttendanceRuleGroup" RESTART IDENTITY CASCADE;

-- Data for table: EmployeeCoefficient
TRUNCATE TABLE "EmployeeCoefficient" RESTART IDENTITY CASCADE;

-- Data for table: EmployeeInfoTab
TRUNCATE TABLE "EmployeeInfoTab" RESTART IDENTITY CASCADE;

-- Data for table: EmployeeInfoTabField
TRUNCATE TABLE "EmployeeInfoTabField" RESTART IDENTITY CASCADE;

-- Data for table: EmployeeInfoTabGroup
TRUNCATE TABLE "EmployeeInfoTabGroup" RESTART IDENTITY CASCADE;

-- Data for table: EmployeeLaborAccount
TRUNCATE TABLE "EmployeeLaborAccount" RESTART IDENTITY CASCADE;

-- Data for table: LaborAccount
TRUNCATE TABLE "LaborAccount" RESTART IDENTITY CASCADE;

-- Data for table: LaborHourReportEmployee
TRUNCATE TABLE "LaborHourReportEmployee" RESTART IDENTITY CASCADE;

-- Data for table: LaborHourReportRequest
TRUNCATE TABLE "LaborHourReportRequest" RESTART IDENTITY CASCADE;

-- Data for table: LineShift
TRUNCATE TABLE "LineShift" RESTART IDENTITY CASCADE;

-- Data for table: Organization
TRUNCATE TABLE "Organization" RESTART IDENTITY CASCADE;

-- Data for table: ParticipantConfig
TRUNCATE TABLE "ParticipantConfig" RESTART IDENTITY CASCADE;

-- Data for table: PersonalProductionRecord
TRUNCATE TABLE "PersonalProductionRecord" RESTART IDENTITY CASCADE;

-- Data for table: ProductStandardHourByLevel
TRUNCATE TABLE "ProductStandardHourByLevel" RESTART IDENTITY CASCADE;

-- Data for table: ProductionRecord
TRUNCATE TABLE "ProductionRecord" RESTART IDENTITY CASCADE;

-- Data for table: PunchDevice
TRUNCATE TABLE "PunchDevice" RESTART IDENTITY CASCADE;

-- Data for table: PunchPair
TRUNCATE TABLE "PunchPair" RESTART IDENTITY CASCADE;

-- Data for table: PunchRecord
TRUNCATE TABLE "PunchRecord" RESTART IDENTITY CASCADE;

-- Data for table: PunchRule
TRUNCATE TABLE "PunchRule" RESTART IDENTITY CASCADE;

-- Data for table: Role
TRUNCATE TABLE "Role" RESTART IDENTITY CASCADE;

-- Data for table: Schedule
TRUNCATE TABLE "Schedule" RESTART IDENTITY CASCADE;

-- Data for table: SearchConditionConfig
TRUNCATE TABLE "SearchConditionConfig" RESTART IDENTITY CASCADE;

-- Data for table: Shift
TRUNCATE TABLE "Shift" RESTART IDENTITY CASCADE;

-- Data for table: ShiftProperty
TRUNCATE TABLE "ShiftProperty" RESTART IDENTITY CASCADE;

-- Data for table: ShiftPropertyDefinition
TRUNCATE TABLE "ShiftPropertyDefinition" RESTART IDENTITY CASCADE;

-- Data for table: ShiftSegment
TRUNCATE TABLE "ShiftSegment" RESTART IDENTITY CASCADE;

-- Data for table: SystemConfig
TRUNCATE TABLE "SystemConfig" RESTART IDENTITY CASCADE;

-- Data for table: User
TRUNCATE TABLE "User" RESTART IDENTITY CASCADE;

-- Data for table: UserRole
TRUNCATE TABLE "UserRole" RESTART IDENTITY CASCADE;

-- Data for table: WorkHourResult
TRUNCATE TABLE "WorkHourResult" RESTART IDENTITY CASCADE;

-- Data for table: WorkInfoHistory
TRUNCATE TABLE "WorkInfoHistory" RESTART IDENTITY CASCADE;

-- Data for table: WorkflowApproval
TRUNCATE TABLE "WorkflowApproval" RESTART IDENTITY CASCADE;

-- Data for table: WorkflowDefinition
TRUNCATE TABLE "WorkflowDefinition" RESTART IDENTITY CASCADE;

-- Data for table: WorkflowEdge
TRUNCATE TABLE "WorkflowEdge" RESTART IDENTITY CASCADE;

-- Data for table: WorkflowInstance
TRUNCATE TABLE "WorkflowInstance" RESTART IDENTITY CASCADE;

-- Data for table: WorkflowNode
TRUNCATE TABLE "WorkflowNode" RESTART IDENTITY CASCADE;


COMMIT;

