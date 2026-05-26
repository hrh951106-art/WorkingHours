-- 查看 CalcResult 表中的直接工时（A02_LINE）
SELECT '=== CalcResult 直接工时数据 ===' as info;
SELECT id, employeeNo, calcDate, shiftId, attendanceCodeId, accountId, accountName, actualHours
FROM CalcResult
WHERE calcDate >= 1778630400000 AND calcDate < 1778803200000
ORDER BY accountId, employeeNo;

-- 查看 A02_LINE 考勤代码 ID
SELECT '=== A02_LINE 考勤代码 ID ===' as info;
SELECT id, code, name
FROM DefinitionAttendanceCode
WHERE code = 'A02_LINE';
