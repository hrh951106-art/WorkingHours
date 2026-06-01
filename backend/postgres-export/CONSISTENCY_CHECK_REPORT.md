# PostgreSQL导出文件全面一致性检查报告

**检查时间**: 2026-06-01 19:13:25
**Schema文件**: postgres-export/01-schema.sql
**Data文件**: postgres-export/02-data.sql

---

## 📊 检查摘要

- **总表数**: 87
- **通过检查**: 71
- **发现问题**: 30

## ⚠️ 发现问题

### Schema-Data不匹配详情

1. `AllocationConfig.approvedAt: Data值不是字符串格式: 1779896434903`
2. `AllocationSourceConfig.createdAt: Data值不是字符串格式: "fieldType":"select"`
3. `AllocationSourceConfig.updatedAt: Data值不是字符串格式: "operator":"eq"`
4. `AttendancePunchPair.workStartPunchTime: Data值不是字符串格式: "employeeNo":"202605002"`
5. `AttendancePunchPair.workEndPunchTime: Data值不是字符串格式: "deviceId":12`
6. `AttendancePunchPair.createdAt: Data值不是字符串格式: "location":null`
7. `AttendancePunchPair.updatedAt: Data值不是字符串格式: "source":"MANUAL"`
8. `AttendanceRuleGroupDetail.createdAt: Data值不是字符串格式: 4]'`
9. `EarnedHoursAllocationConfig.approvedAt: Data值不是字符串格式: 1780293449684`
10. `LaborAccount.createdAt: Data值不是字符串格式: "name":"苏州工厂"`
11. `LaborAccount.updatedAt: Data值不是字符串格式: "value":"SZ"}`
12. `LaborHourReportRequest.approvedAt: Data值不是字符串格式: 1780295797709`
13. `ParticipantConfig.createdAt: Data值不是字符串格式: 0`
14. `PersonalProductionRecord.recordedAt: Data值不是字符串格式: 1779938191736`
15. `ProductionRecord.recordedAt: Data值不是字符串格式: 1780294168811`
16. `Role.createdAt: Data值不是字符串格式: "hr:emp:delete"]'`
17. `SearchConditionConfig.createdAt: Data值不是字符串格式: "schedule-management"`
18. `SearchConditionConfig.updatedAt: Data值不是字符串格式: "punch-records"`
19. `WorkHourResult.startTime: Data值不是字符串格式: "localStartTime":null`
20. `WorkHourResult.endTime: Data值不是字符串格式: "localEndTime":null}'`
21. `WorkflowApproval.approvedAt: Data值不是字符串格式: 1780295797691`
22. `WorkflowDefinition.publishedAt: Data值不是字符串格式: "position":{"x":36.70702633550877`
23. `WorkflowDefinition.createdAt: Data值不是字符串格式: "position":{"x":252.76865527586367`
24. `WorkflowDefinition.updatedAt: Data值不是字符串格式: "y":212.88371175003405}`
25. `WorkflowDefinition.deletedAt: Data值不是字符串格式: "data":{"label":"审批"`
26. `WorkflowInstance.initiatedAt: Data值不是字符串格式: "reportMode":"team"`
27. `WorkflowInstance.startTime: Data值不是字符串格式: "hourType":"A04"`
28. `WorkflowInstance.finishedAt: Data值不是字符串格式: "value":8}'`
29. `WorkflowInstance.endTime: Data值不是字符串格式: 1780295781044`
30. `WorkflowInstance.updatedAt: Data值不是字符串格式: 1780295797700`

## ✅ 通过检查的表

- **AccountHierarchyConfig** (14个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **AccountHierarchyLevelDetail** (11个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **AllocationBasis** (14个字段, 3个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt, deletedAt
- **AllocationGeneralConfig** (8个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: updatedAt, createdAt
- **AllocationResult** (26个字段, 4个TIMESTAMP字段)
  - TIMESTAMP字段: recordDate, calcTime, createdAt, deletedAt
- **AllocationRuleConfig** (17个字段, 5个TIMESTAMP字段)
  - TIMESTAMP字段: effectiveStartTime, effectiveEndTime, createdAt, updatedAt, deletedAt
- **AllocationRuleTarget** (9个字段)
- **AllocationWorkHour** (20个字段, 4个TIMESTAMP字段)
  - TIMESTAMP字段: recordDate, calcTime, createdAt, deletedAt
- **AmountPolicy** (19个字段, 3个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt, deletedAt
- **AmountPolicyGroup** (14个字段, 3个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt, deletedAt
- **AttendanceCode** (15个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **AttendanceRuleGroup** (13个字段, 3个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt, deletedAt
- **AuditLog** (14个字段, 1个TIMESTAMP字段)
  - TIMESTAMP字段: operationTime
- **BiReport** (14个字段, 3个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt, deletedAt
- **BiReportAccessLog** (8个字段, 1个TIMESTAMP字段)
  - TIMESTAMP字段: accessTime
- **BiReportParameter** (15个字段, 3个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt, deletedAt
- **BiReportWidget** (18个字段, 3个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt, deletedAt
- **CalcResult** (23个字段, 5个TIMESTAMP字段)
  - TIMESTAMP字段: calcDate, punchInTime, punchOutTime, createdAt, updatedAt
- **CalcRule** (10个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **CalculationAttendanceCode** (22个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **CustomField** (14个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **DataScopeRule** (10个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **DataSource** (10个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **DataSourceOption** (8个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **DefinitionAttendanceCode** (19个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **DeviceAccount** (10个字段, 4个TIMESTAMP字段)
  - TIMESTAMP字段: effectiveDate, expiryDate, createdAt, updatedAt
- **DeviceGroup** (7个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **EarnedHoursAllocationResult** (22个字段, 4个TIMESTAMP字段)
  - TIMESTAMP字段: recordDate, calcTime, createdAt, deletedAt
- **Employee** (26个字段, 4个TIMESTAMP字段)
  - TIMESTAMP字段: entryDate, createdAt, updatedAt, birthDate
- **EmployeeAttendanceRuleGroup** (11个字段, 4个TIMESTAMP字段)
  - TIMESTAMP字段: effectiveDate, expiryDate, createdAt, updatedAt
- **EmployeeChangeLog** (8个字段, 1个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt
- **EmployeeCoefficient** (15个字段, 4个TIMESTAMP字段)
  - TIMESTAMP字段: effectiveDate, expiryDate, createdAt, updatedAt
- **EmployeeEducation** (16个字段, 5个TIMESTAMP字段)
  - TIMESTAMP字段: startDate, endDate, createdAt, updatedAt, graduationDate
- **EmployeeFamilyMember** (15个字段, 3个TIMESTAMP字段)
  - TIMESTAMP字段: dateOfBirth, createdAt, updatedAt
- **EmployeeInfoTab** (9个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **EmployeeInfoTabField** (13个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **EmployeeInfoTabGroup** (11个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **EmployeeLaborAccount** (10个字段, 4个TIMESTAMP字段)
  - TIMESTAMP字段: effectiveDate, expiryDate, createdAt, updatedAt
- **EmployeeWorkExperience** (11个字段, 4个TIMESTAMP字段)
  - TIMESTAMP字段: startDate, endDate, createdAt, updatedAt
- **LaborHourReportEmployee** (6个字段, 1个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt
- **LineShift** (18个字段, 6个TIMESTAMP字段)
  - TIMESTAMP字段: scheduleDate, startTime, endTime, createdAt, updatedAt, deletedAt
- **Organization** (13个字段, 4个TIMESTAMP字段)
  - TIMESTAMP字段: effectiveDate, expiryDate, createdAt, updatedAt
- **Process** (9个字段, 3个TIMESTAMP字段)
  - TIMESTAMP字段: deletedAt, createdAt, updatedAt
- **Product** (16个字段, 3个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt, deletedAt
- **ProductStandardHourByLevel** (15个字段, 4个TIMESTAMP字段)
  - TIMESTAMP字段: effectiveDate, expiryDate, createdAt, deletedAt
- **ProductStandardHours** (14个字段, 4个TIMESTAMP字段)
  - TIMESTAMP字段: effectiveDate, expiryDate, createdAt, deletedAt
- **ProductionLine** (18个字段, 3个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt, deletedAt
- **ProductionReportRequest** (31个字段, 5个TIMESTAMP字段)
  - TIMESTAMP字段: reportDate, approvedAt, createdAt, updatedAt, deletedAt
- **PunchDevice** (9个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **PunchPair** (27个字段, 7个TIMESTAMP字段)
  - TIMESTAMP字段: pairDate, inPunchTime, outPunchTime, workStartPunchTime, workEndPunchTime, createdAt, updatedAt
- **PunchRecord** (9个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: punchTime, createdAt
- **PunchRule** (14个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **PunchRuleDeviceGroupInterval** (10个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **ReportDataModel** (17个字段, 3个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt, deletedAt
- **ReportModelField** (19个字段, 3个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt, deletedAt
- **ReportModelRelation** (14个字段, 3个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt, deletedAt
- **Schedule** (12个字段, 5个TIMESTAMP字段)
  - TIMESTAMP字段: scheduleDate, adjustedStart, adjustedEnd, createdAt, updatedAt
- **Shift** (10个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **ShiftProperty** (8个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **ShiftPropertyDefinition** (10个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **ShiftSegment** (11个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **SupportRequest** (26个字段, 3个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt, deletedAt
- **SupportResult** (8个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **SystemConfig** (9个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **User** (8个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **UserRole** (4个字段, 1个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt
- **WorkInfoHistory** (26个字段, 9个TIMESTAMP字段)
  - TIMESTAMP字段: effectiveDate, endDate, hireDate, probationStart, probationEnd, regularDate, resignationDate, createdAt, updatedAt
- **WorkflowCcRecord** (8个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **WorkflowEdge** (8个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **WorkflowNode** (15个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt
- **WorkflowParticipant** (9个字段, 2个TIMESTAMP字段)
  - TIMESTAMP字段: createdAt, updatedAt

---

## 🔍 检查项目

1. **Schema定义检查**: 验证所有DateTime字段正确定义为TIMESTAMP类型
2. **Data格式检查**: 验证时间戳数据为字符串格式 (YYYY-MM-DD HH:MM:SS)
3. **字段存在性**: 验证schema中的字段在data文件中都存在
4. **值格式匹配**: 验证TIMESTAMP字段的值格式正确

---

## 📁 检查的文件

- postgres-export/01-schema.sql (83 KB) - 表结构定义
- postgres-export/02-data.sql (698 KB) - 数据导入

---

**检查脚本**: comprehensive-check.py
