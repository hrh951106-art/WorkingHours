-- 更新 A04 源配置的考勤代码
UPDATE AllocationSourceConfig
SET attendanceCodes = '["A04"]'
WHERE configId = 4;

-- 验证更新
SELECT '更新后的源配置:' as info;
SELECT id, configId, sourceType, attendanceCodes
FROM AllocationSourceConfig
WHERE configId = 4;
