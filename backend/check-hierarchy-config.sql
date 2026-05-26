-- 查看 AccountHierarchyConfig 表
.schema AccountHierarchyConfig

-- 查看 scopeId=5 的配置
SELECT * FROM AccountHierarchyConfig WHERE id = 5;

-- 查看所有配置
SELECT id, configName, level FROM AccountHierarchyConfig;
