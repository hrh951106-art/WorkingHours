-- LineShift 开线计划完整数据查询
-- 包含：开线计划、产线组织、劳动力账户的完整关联信息

-- 1. 基础表结构说明
-- LineShift: 开线计划表 (orgId -> Organization.id)
-- Organization: 组织表 (产线，parentId指向车间)
-- LaborAccount: 劳动力账户表 (通过name字段与组织名称匹配)
-- Shift: 班次表

-- ============================================
-- 查询1: LineShift 基础信息
-- ============================================
SELECT '========== 1. LineShift 基础信息 ==========' as info;

SELECT
  ls.id as LineShift_ID,
  ls.orgId as 产线组织ID,
  ls.shiftId as 班次ID,
  ls.scheduleDate,
  date(ls.scheduleDate/1000, 'unixepoch') as 日期,
  ls.participateInAllocation as 参与分摊,
  ls.status as 状态
FROM LineShift ls
WHERE ls.scheduleDate >= 1778630400000
  AND ls.scheduleDate < 1778803200000
ORDER BY ls.id;

-- ============================================
-- 查询2: 产线组织信息
-- ============================================
SELECT '' as info;
SELECT '========== 2. 产线组织信息 (Organization) ==========' as info;

SELECT
  org.id as 组织ID,
  org.code as 组织代码,
  org.name as 组织名称,
  org.parentId as 父级ID_车间,
  parentOrg.name as 所属车间
FROM Organization org
LEFT JOIN Organization parentOrg ON org.parentId = parentOrg.id
WHERE org.id IN (7, 8, 9, 10)
ORDER BY org.id;

-- ============================================
-- 查询3: 产线级劳动力账户（用于直接工时 A02_LINE）
-- ============================================
SELECT '' as info;
SELECT '========== 3. 产线级劳动力账户 ==========' as info;

SELECT
  la.id as 账户ID,
  la.name as 账户名称,
  la.code as 账户代码,
  la.path as 路径,
  -- 提取产线名称
  CASE
    WHEN la.name LIKE '%W1总装车间L1产线%' THEN 'W1总装车间L1产线'
    WHEN la.name LIKE '%W1总装车间L2产线%' THEN 'W1总装车间L2产线'
    WHEN la.name LIKE '%W2总装车间L1产线%' THEN 'W2总装车间L1产线'
    WHEN la.name LIKE '%W2总装车间L2产线%' THEN 'W2总装车间L2产线'
  END as 对应产线
FROM LaborAccount la
WHERE la.name LIKE '%W1总装车间L1产线%'
   OR la.name LIKE '%W1总装车间L2产线%'
   OR la.name LIKE '%W2总装车间L1产线%'
   OR la.name LIKE '%W2总装车间L2产线%'
  AND la.name NOT LIKE '%间接设备%'
  AND la.name NOT LIKE '%(合并)%'
ORDER BY
  CASE
    WHEN la.name LIKE '%W1总装车间L1产线%' THEN 1
    WHEN la.name LIKE '%W1总装车间L2产线%' THEN 2
    WHEN la.name LIKE '%W2总装车间L1产线%' THEN 3
    WHEN la.name LIKE '%W2总装车间L2产线%' THEN 4
  END,
  la.id;

-- ============================================
-- 查询4: 车间级劳动力账户（用于源工时 A04_WORKSHOP）
-- ============================================
SELECT '' as info;
SELECT '========== 4. 车间级劳动力账户 ==========' as info;

SELECT
  la.id as 账户ID,
  la.name as 账户名称,
  la.code as 账户代码,
  -- 提取车间名称
  CASE
    WHEN la.name LIKE '%W1总装车间%' AND la.name NOT LIKE '%产线%' THEN 'W1总装车间'
    WHEN la.name LIKE '%W2总装车间%' AND la.name NOT LIKE '%产线%' THEN 'W2总装车间'
  END as 对应车间,
  -- 层级信息
  json_extract(json_extract(la.hierarchyValues, '$[0]'), '$.name') as 第1层,
  json_extract(json_extract(la.hierarchyValues, '$[1]'), '$.name') as 第2层,
  json_extract(json_extract(la.hierarchyValues, '$[2]'), '$.selectedValue') as 第3层_产线
FROM LaborAccount la
WHERE la.id IN (83, 84)
ORDER BY la.id;

-- ============================================
-- 查询5: LineShift 与账户的完整关联
-- ============================================
SELECT '' as info;
SELECT '========== 5. LineShift 与账户完整关联 ==========' as info;

SELECT
  ls.id as LS_ID,
  ls.orgId as 产线OrgID,
  org.name as 产线名称,
  parentOrg.name as 车间,
  s.name as 班次,
  CASE WHEN ls.participateInAllocation = 1 THEN '✅' ELSE '❌' END as 分摊,

  -- 产线级账户示例（取ID最小的）
  (SELECT MIN(la.id)
   FROM LaborAccount la
   WHERE la.name LIKE '%' || org.name || '%'
     AND la.name NOT LIKE '%间接设备%'
     AND la.name NOT LIKE '%(合并)%'
  ) as 产线账户ID,

  -- 车间级账户
  (SELECT la2.id
   FROM LaborAccount la2
   WHERE la2.name = '大华富阳工厂/' || parentOrg.name
  ) as 车间账户ID,

  -- 账户名称示例
  (SELECT la3.name
   FROM LaborAccount la3
   WHERE la3.id = (
     SELECT MIN(la.id)
     FROM LaborAccount la
     WHERE la.name LIKE '%' || org.name || '%'
       AND la.name NOT LIKE '%间接设备%'
       AND la.name NOT LIKE '%(合并)%'
   )
  ) as 产线账户示例
FROM LineShift ls
JOIN Organization org ON ls.orgId = org.id
JOIN Organization parentOrg ON org.parentId = parentOrg.id
JOIN Shift s ON ls.shiftId = s.id
WHERE ls.scheduleDate >= 1778630400000
  AND ls.scheduleDate < 1778803200000
ORDER BY ls.scheduleDate, parentOrg.id, org.id, ls.id;

-- ============================================
-- 查询6: 实际工时数据使用的账户
-- ============================================
SELECT '' as info;
SELECT '========== 6. 实际工时数据示例 ==========' as info;

SELECT
  wh.id,
  wh.employeeNo,
  wh.definitionAttendanceCodeStr,
  wh.accountId,
  la.name as accountName,
  wh.workHours,
  wh.shiftId
FROM WorkHourResult wh
LEFT JOIN LaborAccount la ON wh.accountId = la.id
WHERE wh.calcDate = 1778716800000
  AND wh.definitionAttendanceCodeStr IN ('A02_LINE', 'A04_WORKSHOP')
ORDER BY wh.definitionAttendanceCodeStr, wh.employeeNo, wh.accountId;
