-- 查询考���代码定义
SELECT '=== 考勤代码定义 ===' as info;
SELECT id, code, name, type, status
FROM AttendanceCode
WHERE code IN ('A04', 'A04_WORKSHOP')
ORDER BY code;

-- 查询定义考勤代码
SELECT '=== 定义考勤代码 ===' as info;
SELECT id, code, name, calcCode, type, status
FROM DefinitionAttendanceCode
WHERE code LIKE '%A04%' OR calcCode LIKE '%A04%'
ORDER BY code;
