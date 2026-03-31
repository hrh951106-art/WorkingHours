# WorkInfoHistory表结构详细设计文档

> **表名**: WorkInfoHistory
> **说明**: 员工工作信息变更历史表
> **数据库**: SQLite (开发) / PostgreSQL (生产)
> **更新时间**: 2025-03-31

---

## 📊 表结构概览

WorkInfoHistory表用于记录员工工作信息的所有变更历史，包括职位变动、部门调动、升职加薪、离职等。每次工作信息变更时，都会创建新的历史记录。

### 表关系图

```
WorkInfoHistory (工作信息历史)
├── Employee (员工) - 多对一 (必须关联)
└── Organization (组织) - 多对一 (可选关联)
```

---

## 📋 字段详细设计

### 1️⃣ 基础标识字段

| 字段名 | 类型 | 必填 | 默认值 | 约束 | 说明 |
|--------|------|------|--------|------|------|
| **id** | `Int` | ✓ | AUTOINCREMENT | PRIMARY KEY | 主键ID，自增 |
| **employeeId** | `Int` | ✓ | - | FOREIGN KEY | 员工ID，关联Employee表 |

**设计说明**:
- `id`: 自增主键，唯一标识每条历史记录
- `employeeId`: 外键关联Employee表，使用 `ON DELETE CASCADE`，删除员工时自动删除历史记录

---

### 2️⃣ 时间维度字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| **effectiveDate** | `DateTime` | ✓ | now() | 生效日期，工作信息变更的生效时间 |
| **endDate** | `DateTime` | ✗ | NULL | 结束日期，当前记录的失效时间 |
| **createdAt** | `DateTime` | ✓ | now() | 记录创建时间 |
| **updatedAt** | `DateTime` | ✓ | now() | 记录更新时间 |

**设计说明**:
- `effectiveDate`: 记录此工作信息的生效时间点
- `endDate`: 当产生新的工作信息变更时，前一记录的endDate被设置为新记录的effectiveDate
- 通过 `effectiveDate` 和 `endDate` 构成时间区间，确保工作信息连续性

**时间线示例**:
```
员工A的工作信息时间线:
2023-01-01 ──────────────────────────────────> 2025-12-31
   ↓                    ↓                      ↓
[入职记录]           [升职记录]              [当前记录]
effectiveDate:      effectiveDate:         effectiveDate:
2023-01-01          2024-03-01             2025-01-01
endDate:            endDate:               endDate: NULL (当前)
2024-03-01           2025-01-01
```

---

### 3️⃣ 变更信息字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| **changeType** | `String` | ✗ | NULL | 变更类型：入职/升职/调岗/离职等 |
| **reason** | `String` | ✗ | NULL | 变更原因 |

**changeType 枚举值建议**:
- `ENTRY`: 入职
- `PROBATION`: 试用期
- `REGULAR`: 转正
- `PROMOTION`: 升职
- `DEMOTION`: 降职
- `TRANSFER`: 调岗
- `RESIGNATION`: 离职
- `RETIRE`: 退休
- `OTHER`: 其他

---

### 4️⃣ 职位信息字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| **position** | `String` | ✗ | NULL | 职位名称（如：软件工程师、产品经理） |
| **jobLevel** | `String` | ✗ | NULL | 职级（如：P5、P6、P7或初级、中级、高级） |
| **employeeType** | `String` | ✗ | NULL | 员工类型（如：正式、实习、劳务派遣） |
| **workLocation** | `String` | ✗ | NULL | 工作地点（如：北京、上海、远程） |
| **workAddress** | `String` | ✗ | NULL | 办公地址（详细地址） |

**设计说明**:
- 这些字段与Employee表中的字段对应，但存储的是历史值
- 每次变更时，保存旧值到WorkInfoHistory，新值更新到Employee

---

### 5️⃣ 入职和试用期字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| **hireDate** | `DateTime` | ✗ | NULL | 受雇日期（合同签订日期） |
| **probationStart** | `DateTime` | ✗ | NULL | 试用期开始日期 |
| **probationEnd** | `DateTime` | ✗ | NULL | 试用期结束日期 |
| **probationMonths** | `Int` | ✗ | NULL | 试用期月数（通常3-6个月） |
| **regularDate** | `DateTime` | ✗ | NULL | 转正日期 |

**设计说明**:
- `hireDate`: 通常与 `entryDate` 接近，但可能不同（entryDate是实际上班日期）
- 试用期相关字段用于跟踪员工转正进度

---

### 6️⃣ 离职信息字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| **resignationDate** | `DateTime` | ✗ | NULL | 离职日期 |
| **resignationReason** | `String` | ✗ | NULL | 离职原因 |

**resignationReason 枚举值建议**:
- `PERSONAL`: 个人原因
- `COMPANY`: 公司原因
- `SALARY`: 薪资原因
- `DEVELOPMENT`: 职业发展
- `FAMILY`: 家庭原因
- `HEALTH`: 健康原因
- `OTHER`: 其他

---

### 7️⃣ 统计字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| **workYears** | `Int` | ✗ | NULL | 工作年限（累计工作年数） |

---

### 8️⃣ 组织关联字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| **orgId** | `Int` | ✗ | NULL | 组织ID，外键关联Organization表 |

**设计说明**:
- 可选字段，用于记录员工调岗时的组织变动
- 如果为NULL，表示没有明确的组织归属

---

### 9️⃣ 状态标识字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| **isCurrent** | `Boolean` | ✓ | false | 是否当前记录（true=当前有效的工作信息） |

**设计说明**:
- 每个员工最多只有一条 `isCurrent=true` 的记录
- 当创建新的工作信息记录时，需要将之前的 `isCurrent` 设置为 `false`
- 查询员工当前工作信息时，只需找到 `isCurrent=true` 的记录

---

### 🔟 扩展字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| **customFields** | `String` | ✓ | "{}" | 自定义字段，JSON格式存储 |

**customFields 示例**:
```json
{
  "bonus": "年度奖20万",
  "stockOptions": "5000股",
  "specialAllowance": "交通补贴500元/月",
  "notes": "特殊引进人才"
}
```

---

## 📐 数据库表结构SQL

### SQLite版本 (开发环境)

```sql
CREATE TABLE "WorkInfoHistory" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeId INTEGER NOT NULL,
    effectiveDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    endDate DATETIME,
    changeType TEXT,
    position TEXT,
    jobLevel TEXT,
    employeeType TEXT,
    workLocation TEXT,
    workAddress TEXT,
    hireDate DATETIME,
    probationStart DATETIME,
    probationEnd DATETIME,
    probationMonths INTEGER,
    regularDate DATETIME,
    resignationDate DATETIME,
    resignationReason TEXT,
    workYears INTEGER,
    orgId INTEGER,
    isCurrent BOOLEAN NOT NULL DEFAULT 0,
    reason TEXT,
    customFields TEXT NOT NULL DEFAULT '{}',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employeeId) REFERENCES "Employee"(id) ON DELETE CASCADE,
    FOREIGN KEY (orgId) REFERENCES "Organization"(id)
);

CREATE INDEX idx_workinfo_employee_effective ON "WorkInfoHistory"(employeeId, effectiveDate);
CREATE INDEX idx_workinfo_employee_current ON "WorkInfoHistory"(employeeId, isCurrent);
```

### PostgreSQL版本 (生产环境)

```sql
CREATE TABLE "WorkInfoHistory" (
    id SERIAL PRIMARY KEY,
    "employeeId" INTEGER NOT NULL,
    "effectiveDate" TIMESTAMP NOT NULL DEFAULT NOW(),
    "endDate" TIMESTAMP,
    "changeType" TEXT,
    "position" TEXT,
    "jobLevel" TEXT,
    "employeeType" TEXT,
    "workLocation" TEXT,
    "workAddress" TEXT,
    "hireDate" TIMESTAMP,
    "probationStart" TIMESTAMP,
    "probationEnd" TIMESTAMP,
    "probationMonths" INTEGER,
    "regularDate" TIMESTAMP,
    "resignationDate" TIMESTAMP,
    "resignationReason" TEXT,
    "workYears" INTEGER,
    "orgId" INTEGER,
    "isCurrent" BOOLEAN NOT NULL DEFAULT FALSE,
    "reason" TEXT,
    "customFields" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL,
    CONSTRAINT "WorkInfoHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkInfoHistory_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX idx_workinfo_employee_effective ON "WorkInfoHistory"("employeeId", "effectiveDate");
CREATE INDEX idx_workinfo_employee_current ON "WorkInfoHistory"("employeeId", "isCurrent");
```

---

## 🗂️ 索引设计

### 1. 复合索引：employeeId + effectiveDate

```sql
CREATE INDEX idx_workinfo_employee_effective ON "WorkInfoHistory"("employeeId", "effectiveDate");
```

**用途**:
- 快速查询某个员工的所有工作信息历史，按时间排序
- 支持时间区间查询
- 生成工作信息变更时间轴

**查询示例**:
```sql
-- 查询员工的所有工作信息历史
SELECT * FROM "WorkInfoHistory"
WHERE "employeeId" = 123
ORDER BY "effectiveDate" DESC;
```

### 2. 复合索引：employeeId + isCurrent

```sql
CREATE INDEX idx_workinfo_employee_current ON "WorkInfoHistory"("employeeId", "isCurrent");
```

**用途**:
- 快速查找员工的当前工作信息
- `isCurrent=true` 的记录即为当前生效的工作信息

**查询示例**:
```sql
-- 查询员工的当前工作信息
SELECT * FROM "WorkInfoHistory"
WHERE "employeeId" = 123
  AND "isCurrent" = true;
```

---

## 🔍 常用查询示例

### 1. 查询员工的当前工作信息

```sql
SELECT
    w.*,
    e.name AS employeeName,
    e.employeeNo,
    o.name AS organizationName
FROM "WorkInfoHistory" w
INNER JOIN "Employee" e ON e.id = w."employeeId"
LEFT JOIN "Organization" o ON o.id = w."orgId"
WHERE w."employeeId" = ?
  AND w."isCurrent" = true;
```

### 2. 查询员工的工作信息变更历史

```sql
SELECT
    w.*,
    e.name AS employeeName,
    e.employeeNo
FROM "WorkInfoHistory" w
INNER JOIN "Employee" e ON e.id = w."employeeId"
WHERE w."employeeId" = ?
ORDER BY w."effectiveDate" DESC;
```

### 3. 查询特定时间范围内的变更记录

```sql
SELECT
    w.*,
    e.name AS employeeName,
    o.name AS organizationName
FROM "WorkInfoHistory" w
INNER JOIN "Employee" e ON e.id = w."employeeId"
LEFT JOIN "Organization" o ON o.id = w."orgId"
WHERE w."effectiveDate" >= '2024-01-01'
  AND w."effectiveDate" < '2025-01-01'
ORDER BY w."effectiveDate" DESC;
```

### 4. 统计变更类型分布

```sql
SELECT
    w."changeType",
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM "WorkInfoHistory"), 2) AS percentage
FROM "WorkInfoHistory" w
GROUP BY w."changeType"
ORDER BY count DESC;
```

### 5. 查询即将到期的试用期

```sql
SELECT
    w.*,
    e.name AS employeeName,
    e.employeeNo,
    DATEDIFF(w."probationEnd", CURRENT_DATE) AS daysRemaining
FROM "WorkInfoHistory" w
INNER JOIN "Employee" e ON e.id = w."employeeId"
WHERE w."isCurrent" = true
  AND w."probationEnd" IS NOT NULL
  AND w."probationEnd" > CURRENT_DATE
  AND w."probationEnd" <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY w."probationEnd";
```

---

## 📝 业务逻辑说明

### 1. 创建新员工时的初始化

```sql
-- 新员工入职时，创建第一条工作信息记录
INSERT INTO "WorkInfoHistory" (
    "employeeId",
    "effectiveDate",
    "position",
    "jobLevel",
    "employeeType",
    "orgId",
    "hireDate",
    "probationStart",
    "probationEnd",
    "probationMonths",
    "isCurrent",
    "changeType",
    "reason"
) VALUES (
    123,                    -- employeeId
    '2024-01-15',          -- effectiveDate (入职日期)
    '软件工程师',           -- position
    'P5',                  -- jobLevel
    '正式',                -- employeeType
    5,                     -- orgId (技术部)
    '2024-01-15',          -- hireDate
    '2024-01-15',          -- probationStart
    '2024-04-15',          -- probationEnd (3个月)
    3,                     -- probationMonths
    true,                  -- isCurrent
    'ENTRY',               -- changeType (入职)
    '新员工入职'            -- reason
);
```

### 2. 员工转正时的更新

```sql
-- 步骤1: 将当前记录的isCurrent设置为false，并设置endDate
UPDATE "WorkInfoHistory"
SET "isCurrent" = false,
    "endDate" = '2024-04-15'
WHERE "employeeId" = 123
  AND "isCurrent" = true;

-- 步骤2: 创建新的转正记录
INSERT INTO "WorkInfoHistory" (
    "employeeId",
    "effectiveDate",
    "position",
    "jobLevel",
    "orgId",
    "regularDate",
    "isCurrent",
    "changeType",
    "reason"
) VALUES (
    123,
    '2024-04-15',          -- 转正生效日期
    '软件工程师',           -- position (可能不变)
    'P6',                  -- jobLevel (升职)
    5,                     -- orgId (技术部)
    '2024-04-15',          -- regularDate
    true,
    'REGULAR',             -- changeType (转正)
    '试用期表现优异，按期转正'
);
```

### 3. 员工调岗时的更新

```sql
-- 步骤1: 将当前记录设置为历史
UPDATE "WorkInfoHistory"
SET "isCurrent" = false,
    "endDate" = '2024-06-01'
WHERE "employeeId" = 123
  AND "isCurrent" = true;

-- 步骤2: 创建新的调岗记录
INSERT INTO "WorkInfoHistory" (
    "employeeId",
    "effectiveDate",
    "position",
    "orgId",
    "isCurrent",
    "changeType",
    "reason"
) VALUES (
    123,
    '2024-06-01',          -- 调岗生效日期
    '高级软件工程师',       -- 新职位
    8,                     -- 新部门 (产品部)
    true,
    'TRANSFER',            -- changeType (调岗)
    '岗位调整，调往产品部'
);
```

### 4. 员工离职时的处理

```sql
-- 步骤1: 将当前记录设置为历史
UPDATE "WorkInfoHistory"
SET "isCurrent" = false,
    "endDate" = '2024-12-31'
WHERE "employeeId" = 123
  AND "isCurrent" = true;

-- 步骤2: 创建离职记录
INSERT INTO "WorkInfoHistory" (
    "employeeId",
    "effectiveDate",
    "resignationDate",
    "resignationReason",
    "isCurrent",
    "changeType",
    "reason"
) VALUES (
    123,
    '2024-12-31',          -- 离职生效日期
    '2024-12-31',          -- resignationDate
    'PERSONAL',            -- resignationReason (个人原因)
    false,                 -- 离职后isCurrent为false
    'RESIGNATION',         -- changeType (离职)
    '个人发展原因申请离职'
);

-- 步骤3: 更新Employee表状态
UPDATE "Employee"
SET status = 'RESIGNED'
WHERE id = 123;
```

---

## ⚠️ 重要注意事项

### 1. **isCurrent字段管理**
- 每个员工最多只有一条 `isCurrent=true` 的记录
- 创建新记录时，必须先将旧记录的 `isCurrent` 设置为 `false`
- 离职后，不再有 `isCurrent=true` 的记录

### 2. **时间连续性**
- `effectiveDate` 必须大于上一条记录的 `effectiveDate`
- 创建新记录时，应将上一条记录的 `endDate` 设置为新记录的 `effectiveDate`
- 当前记录的 `endDate` 为 NULL

### 3. **数据完整性**
- `employeeId` 必须关联有效的 Employee 记录
- `orgId` 可选，但如果提供，必须关联有效的 Organization 记录
- 删除 Employee 时，所有相关的 WorkInfoHistory 记录会级联删除

### 4. **与Employee表的同步**
- WorkInfoHistory 存储历史快照
- Employee 表存储当前状态
- 部分字段在两个表中都存在（如 position, orgId）
- 每次变更时，需要同时更新两个表

---

## 🔧 生产环境检查清单

### ✅ 表存在性检查

```sql
-- 检查表是否存在
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'WorkInfoHistory'
);
```

### ✅ 字段完整性检查

```sql
-- 检查所有必需字段
SELECT COUNT(*) AS missing_fields
FROM (VALUES
    ('id'),
    ('employeeId'),
    ('effectiveDate'),
    ('isCurrent'),
    ('customFields'),
    ('createdAt'),
    ('updatedAt')
) AS required_fields(field)
LEFT JOIN information_schema.columns c ON c.column_name = required_fields.field
    AND c.table_name = 'WorkInfoHistory'
WHERE c.column_name IS NULL;
```

### ✅ 索引检查

```sql
-- 检查关键索引
SELECT
    indexname,
    CASE WHEN indexname IS NOT NULL THEN '✓ 存在' ELSE '✗ 缺失' END AS status
FROM (VALUES
    ('idx_workinfo_employee_effective'),
    ('idx_workinfo_employee_current')
) AS required_indexes(indexname)
LEFT JOIN pg_indexes p ON p.indexname = required_indexes.indexname
    AND p.tablename = 'WorkInfoHistory';
```

### ✅ 外键约束检查

```sql
-- 检查外键约束
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'WorkInfoHistory'
  AND tc.constraint_type = 'FOREIGN KEY';
```

---

## 🛠️ 故障排查

### 问题1: 生产环境报错 "relation WorkInfoHistory does not exist"

**原因**: 表未创建

**解决**:
```bash
# 运行完整的迁移脚本
psql -U username -d database_name -f prisma/migrations_postgres/20250331_init/init_production.sql
```

### 问题2: 查询性能慢

**原因**: 缺少索引

**解决**:
```sql
-- 创建必要的索引
CREATE INDEX IF NOT EXISTS idx_workinfo_employee_effective
ON "WorkInfoHistory"("employeeId", "effectiveDate");

CREATE INDEX IF NOT EXISTS idx_workinfo_employee_current
ON "WorkInfoHistory"("employeeId", "isCurrent");
```

### 问题3: isCurrent字段有多个true值

**原因**: 数据一致性错误

**解决**:
```sql
-- 查找问题员工
SELECT "employeeId", COUNT(*) AS current_count
FROM "WorkInfoHistory"
WHERE "isCurrent" = true
GROUP BY "employeeId"
HAVING COUNT(*) > 1;

-- 修复：保留最新的一条，其他设置为false
WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (PARTITION BY "employeeId" ORDER BY "effectiveDate" DESC) AS rn
    FROM "WorkInfoHistory"
    WHERE "isCurrent" = true
)
UPDATE "WorkInfoHistory"
SET "isCurrent" = false
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
```

---

## 📚 相关文档

- [Employee表结构详细设计.md](./Employee表结构详细设计.md) - 员工主表设计
- [数据库迁移脚本](../prisma/migrations_postgres/20250331_init/init_production.sql) - 完整迁移脚本

---

**文档版本**: v1.0.0
**最后更新**: 2025-03-31
**维护者**: JY开发团队
