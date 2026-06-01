-- PostgreSQL Schema Export
-- Generated from SQLite database: prisma/dev.db

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- Table: AccountHierarchyConfig
DROP TABLE IF EXISTS "AccountHierarchyConfig" CASCADE;

-- Table: AccountHierarchyLevelDetail
DROP TABLE IF EXISTS "AccountHierarchyLevelDetail" CASCADE;

-- Table: AllocationBasis
DROP TABLE IF EXISTS "AllocationBasis" CASCADE;

-- Table: AllocationConfig
DROP TABLE IF EXISTS "AllocationConfig" CASCADE;

-- Table: AllocationGeneralConfig
DROP TABLE IF EXISTS "AllocationGeneralConfig" CASCADE;

-- Table: AllocationResult
DROP TABLE IF EXISTS "AllocationResult" CASCADE;

-- Table: AllocationRuleConfig
DROP TABLE IF EXISTS "AllocationRuleConfig" CASCADE;

-- Table: AllocationRuleTarget
DROP TABLE IF EXISTS "AllocationRuleTarget" CASCADE;

-- Table: AllocationSourceConfig
DROP TABLE IF EXISTS "AllocationSourceConfig" CASCADE;

-- Table: AllocationWorkHour
DROP TABLE IF EXISTS "AllocationWorkHour" CASCADE;

-- Table: AmountPolicy
DROP TABLE IF EXISTS "AmountPolicy" CASCADE;

-- Table: AmountPolicyGroup
DROP TABLE IF EXISTS "AmountPolicyGroup" CASCADE;

-- Table: AttendanceCode
DROP TABLE IF EXISTS "AttendanceCode" CASCADE;

-- Table: AttendancePunchPair
DROP TABLE IF EXISTS "AttendancePunchPair" CASCADE;

-- Table: AttendanceRuleGroup
DROP TABLE IF EXISTS "AttendanceRuleGroup" CASCADE;

-- Table: AttendanceRuleGroupDetail
DROP TABLE IF EXISTS "AttendanceRuleGroupDetail" CASCADE;

-- Table: AuditLog
DROP TABLE IF EXISTS "AuditLog" CASCADE;

-- Table: BiReport
DROP TABLE IF EXISTS "BiReport" CASCADE;

-- Table: BiReportAccessLog
DROP TABLE IF EXISTS "BiReportAccessLog" CASCADE;

-- Table: BiReportParameter
DROP TABLE IF EXISTS "BiReportParameter" CASCADE;

-- Table: BiReportWidget
DROP TABLE IF EXISTS "BiReportWidget" CASCADE;

-- Table: CalcResult
DROP TABLE IF EXISTS "CalcResult" CASCADE;

-- Table: CalcRule
DROP TABLE IF EXISTS "CalcRule" CASCADE;

-- Table: CalculationAttendanceCode
DROP TABLE IF EXISTS "CalculationAttendanceCode" CASCADE;

-- Table: CustomField
DROP TABLE IF EXISTS "CustomField" CASCADE;

-- Table: DataScopeRule
DROP TABLE IF EXISTS "DataScopeRule" CASCADE;

-- Table: DataSource
DROP TABLE IF EXISTS "DataSource" CASCADE;

-- Table: DataSourceOption
DROP TABLE IF EXISTS "DataSourceOption" CASCADE;

-- Table: DefinitionAttendanceCode
DROP TABLE IF EXISTS "DefinitionAttendanceCode" CASCADE;

-- Table: DeviceAccount
DROP TABLE IF EXISTS "DeviceAccount" CASCADE;

-- Table: DeviceGroup
DROP TABLE IF EXISTS "DeviceGroup" CASCADE;

-- Table: EarnedHoursAllocationConfig
DROP TABLE IF EXISTS "EarnedHoursAllocationConfig" CASCADE;

-- Table: EarnedHoursAllocationResult
DROP TABLE IF EXISTS "EarnedHoursAllocationResult" CASCADE;

-- Table: Employee
DROP TABLE IF EXISTS "Employee" CASCADE;

-- Table: EmployeeAttendanceRuleGroup
DROP TABLE IF EXISTS "EmployeeAttendanceRuleGroup" CASCADE;

-- Table: EmployeeChangeLog
DROP TABLE IF EXISTS "EmployeeChangeLog" CASCADE;

-- Table: EmployeeCoefficient
DROP TABLE IF EXISTS "EmployeeCoefficient" CASCADE;

-- Table: EmployeeEducation
DROP TABLE IF EXISTS "EmployeeEducation" CASCADE;

-- Table: EmployeeFamilyMember
DROP TABLE IF EXISTS "EmployeeFamilyMember" CASCADE;

-- Table: EmployeeInfoTab
DROP TABLE IF EXISTS "EmployeeInfoTab" CASCADE;

-- Table: EmployeeInfoTabField
DROP TABLE IF EXISTS "EmployeeInfoTabField" CASCADE;

-- Table: EmployeeInfoTabGroup
DROP TABLE IF EXISTS "EmployeeInfoTabGroup" CASCADE;

-- Table: EmployeeLaborAccount
DROP TABLE IF EXISTS "EmployeeLaborAccount" CASCADE;

-- Table: EmployeeWorkExperience
DROP TABLE IF EXISTS "EmployeeWorkExperience" CASCADE;

-- Table: LaborAccount
DROP TABLE IF EXISTS "LaborAccount" CASCADE;

-- Table: LaborHourReportEmployee
DROP TABLE IF EXISTS "LaborHourReportEmployee" CASCADE;

-- Table: LaborHourReportRequest
DROP TABLE IF EXISTS "LaborHourReportRequest" CASCADE;

-- Table: LineShift
DROP TABLE IF EXISTS "LineShift" CASCADE;

-- Table: Organization
DROP TABLE IF EXISTS "Organization" CASCADE;

-- Table: ParticipantConfig
DROP TABLE IF EXISTS "ParticipantConfig" CASCADE;

-- Table: PersonalProductionRecord
DROP TABLE IF EXISTS "PersonalProductionRecord" CASCADE;

-- Table: Process
DROP TABLE IF EXISTS "Process" CASCADE;

-- Table: Product
DROP TABLE IF EXISTS "Product" CASCADE;

-- Table: ProductStandardHourByLevel
DROP TABLE IF EXISTS "ProductStandardHourByLevel" CASCADE;

-- Table: ProductStandardHours
DROP TABLE IF EXISTS "ProductStandardHours" CASCADE;

-- Table: ProductionLine
DROP TABLE IF EXISTS "ProductionLine" CASCADE;

-- Table: ProductionRecord
DROP TABLE IF EXISTS "ProductionRecord" CASCADE;

-- Table: ProductionReportRequest
DROP TABLE IF EXISTS "ProductionReportRequest" CASCADE;

-- Table: PunchDevice
DROP TABLE IF EXISTS "PunchDevice" CASCADE;

-- Table: PunchPair
DROP TABLE IF EXISTS "PunchPair" CASCADE;

-- Table: PunchRecord
DROP TABLE IF EXISTS "PunchRecord" CASCADE;

-- Table: PunchRule
DROP TABLE IF EXISTS "PunchRule" CASCADE;

-- Table: PunchRuleDeviceGroupInterval
DROP TABLE IF EXISTS "PunchRuleDeviceGroupInterval" CASCADE;

-- Table: ReportDataModel
DROP TABLE IF EXISTS "ReportDataModel" CASCADE;

-- Table: ReportModelField
DROP TABLE IF EXISTS "ReportModelField" CASCADE;

-- Table: ReportModelRelation
DROP TABLE IF EXISTS "ReportModelRelation" CASCADE;

-- Table: Role
DROP TABLE IF EXISTS "Role" CASCADE;

-- Table: Schedule
DROP TABLE IF EXISTS "Schedule" CASCADE;

-- Table: SearchConditionConfig
DROP TABLE IF EXISTS "SearchConditionConfig" CASCADE;

-- Table: Shift
DROP TABLE IF EXISTS "Shift" CASCADE;

-- Table: ShiftProperty
DROP TABLE IF EXISTS "ShiftProperty" CASCADE;

-- Table: ShiftPropertyDefinition
DROP TABLE IF EXISTS "ShiftPropertyDefinition" CASCADE;

-- Table: ShiftSegment
DROP TABLE IF EXISTS "ShiftSegment" CASCADE;

-- Table: SupportRequest
DROP TABLE IF EXISTS "SupportRequest" CASCADE;

-- Table: SupportResult
DROP TABLE IF EXISTS "SupportResult" CASCADE;

-- Table: SystemConfig
DROP TABLE IF EXISTS "SystemConfig" CASCADE;

-- Table: User
DROP TABLE IF EXISTS "User" CASCADE;

-- Table: UserRole
DROP TABLE IF EXISTS "UserRole" CASCADE;

-- Table: WorkHourResult
DROP TABLE IF EXISTS "WorkHourResult" CASCADE;

-- Table: WorkInfoHistory
DROP TABLE IF EXISTS "WorkInfoHistory" CASCADE;

-- Table: WorkflowApproval
DROP TABLE IF EXISTS "WorkflowApproval" CASCADE;

-- Table: WorkflowCcRecord
DROP TABLE IF EXISTS "WorkflowCcRecord" CASCADE;

-- Table: WorkflowDefinition
DROP TABLE IF EXISTS "WorkflowDefinition" CASCADE;

-- Table: WorkflowEdge
DROP TABLE IF EXISTS "WorkflowEdge" CASCADE;

-- Table: WorkflowInstance
DROP TABLE IF EXISTS "WorkflowInstance" CASCADE;

-- Table: WorkflowNode
DROP TABLE IF EXISTS "WorkflowNode" CASCADE;

-- Table: WorkflowParticipant
DROP TABLE IF EXISTS "WorkflowParticipant" CASCADE;

