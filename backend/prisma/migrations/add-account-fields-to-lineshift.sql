-- =====================================================
-- 开线维护表结构调整
-- 添加劳动力账户字段，调整产线组织字段含义
-- =====================================================

-- 1. 添加劳动力账户相关字段
ALTER TABLE LineShift ADD COLUMN accountId INTEGER;
ALTER TABLE LineShift ADD COLUMN accountName TEXT;
ALTER TABLE LineShift ADD COLUMN accountPath TEXT;

-- 2. 创建索引
CREATE INDEX LineShift_accountId_idx ON LineShift(accountId);

-- 3. 添加注释说明
-- LineShift 表字段说明：
-- - orgId: WH1001配置的最高层级的组织ID（如配置"1,2,3"，则存储层级1工厂的ID）
-- - orgName: WH1001配置的最高层级的组织名称
-- - accountId: 产线劳动力账户ID
-- - accountName: 产线劳动力账户名称（完整路径，如"工厂/车间/产线"）
-- - accountPath: 产线劳动力账户路径（code路径）

-- 4. 示例数据更新（如果已有数据）
-- UPDATE LineShift
-- SET accountId = orgId,
--     accountName = orgName,
--     accountPath = (SELECT code FROM LaborAccount WHERE id = orgId)
-- WHERE accountId IS NULL;
