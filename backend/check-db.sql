-- 检查 DefinitionAttendanceCode 表中的 ATTENDANCE_HOURS 类型
SELECT 'DefinitionAttendanceCode 表:' as table_name;
SELECT id, code, name, type, status, calculateHours 
FROM DefinitionAttendanceCode 
WHERE type = 'ATTENDANCE_HOURS';

-- 检查 CalculationAttendanceCode 表中的 ATTENDANCE_HOURS 类型  
SELECT 'CalculationAttendanceCode 表:' as table_name;
SELECT id, code, name, type, status 
FROM CalculationAttendanceCode 
WHERE type = 'ATTENDANCE_HOURS';

-- 检查考勤规则组的出勤代码关联
SELECT '考勤规则组配置:' as table_name;
SELECT * FROM _AttendanceRuleGroupDefinitionAttendanceCode LIMIT 10;
