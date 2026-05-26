-- 将考勤代码改回 A04_WORKSHOP
UPDATE AllocationSourceConfig
SET attendanceCodes = '["A04_WORKSHOP"]'
WHERE configId = 4;

-- 验证
SELECT '修复后的源配置:' as info;
SELECT id, configId, sourceType, attendanceCodes
FROM AllocationSourceConfig
WHERE configId = 4;
