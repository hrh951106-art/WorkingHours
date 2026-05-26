-- 查询 A04 配置
SELECT '=== A04 配置 ===' as info;
SELECT id, configCode, configName, status, 
       effectiveStartTime, effectiveEndTime
FROM AllocationConfig 
WHERE configCode = 'A04';

-- 查询 A04 源配置
SELECT '=== A04 源配置 ===' as info;
SELECT id, configId, sourceType, attendanceCodes, employeeFilter, accountFilter
FROM AllocationSourceConfig
WHERE configId = 4;

-- 查询 A04 规则配置
SELECT '=== A04 规则配置 ===' as info;
SELECT id, configId, ruleName, ruleType, allocationBasis, 
       allocationAttendanceCodes, allocationHierarchyLevels, allocationScopeId
FROM AllocationRuleConfig
WHERE configId = 4;

-- 查询范围配置 ID=5
SELECT '=== 范围配置 ID=5 ===' as info;
SELECT * FROM AllocationScopeConfig WHERE id = 5;

-- 查询有 A04_WORKSHOP 考勤代码的工时数据
SELECT '=== A04_WORKSHOP 工时数据（前10条） ===' as info;
SELECT employeeNo, calcAttendanceCode, calcDate, workHours, attendanceCode
FROM WorkHourResult
WHERE attendanceCode = 'A04_WORKSHOP' AND deletedAt IS NULL
ORDER BY calcDate DESC
LIMIT 10;

-- 统计 A04_WORKSHOP 工时数量
SELECT '=== A04_WORKSHOP 统计 ===' as info;
SELECT COUNT(*) as total_count, SUM(workHours) as total_hours
FROM WorkHourResult
WHERE attendanceCode = 'A04_WORKSHOP' AND deletedAt IS NULL;

-- 查询所有考勤代码
SELECT '=== 所有考勤代码统计 ===' as info;
SELECT attendanceCode, COUNT(*) as count, SUM(workHours) as total_hours
FROM WorkHourResult
WHERE deletedAt IS NULL
GROUP BY attendanceCode
ORDER BY count DESC;
