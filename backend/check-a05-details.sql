-- 查询范围配置 ID=5
SELECT '=== 范围配置（ID=5）===' as info;
SELECT id, level, name, mappingType, mappingValue
FROM AccountHierarchyConfig
WHERE id = 5;

-- 查询 A04_WORKSHOP 工时数据
SELECT '=== A04_WORKSHOP 工时数据 ===' as info;
SELECT employeeNo, calcAttendanceCode, definitionAttendanceCodeStr, calcDate, workHours, 
       shiftId, accountId, accountName
FROM WorkHourResult
WHERE definitionAttendanceCodeStr = 'A04_WORKSHOP'
  AND calcDate >= 1778630400000 AND calcDate < 1778803200000
ORDER BY employeeNo, shiftId;

-- 查询工厂 ID=4 的组织
SELECT '=== 工厂 ID=4 ===' as info;
SELECT id, code, name, parentId, type
FROM Organization
WHERE id = 4;
