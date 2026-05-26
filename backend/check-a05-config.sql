-- 查询 A05 配置
SELECT '=== A05 配置 ===' as info;
SELECT id, configCode, configName, status, 
       effectiveStartTime, effectiveEndTime
FROM AllocationConfig 
WHERE configCode = 'A05';

-- 查询 A05 源配置
SELECT '=== A05 源配置 ===' as info;
SELECT id, configId, sourceType, attendanceCodes, employeeFilter, accountFilter
FROM AllocationSourceConfig
WHERE configId = (SELECT id FROM AllocationConfig WHERE configCode = 'A05');

-- 查询 A05 规则配置
SELECT '=== A05 规则配置 ===' as info;
SELECT id, configId, ruleName, ruleType, allocationBasis, 
       allocationAttendanceCodes, allocationHierarchyLevels, allocationScopeId, sortOrder
FROM AllocationRuleConfig
WHERE configId = (SELECT id FROM AllocationConfig WHERE configCode = 'A05')
ORDER BY sortOrder;
