# PostgreSQL 迁移脚本总览

## 脚本清单

本目录包含 PostgreSQL 生产环境的所有迁移脚本。

### 必须执行的脚本（按顺序）

1. **003-init-datasources.sql**
   - 初始化所有数据源及选项
   - 创建 13 个内置数据源
   - 创建所有必需的选项数据
   - **必须首先执行**

2. **004-fix-employee-field-types.sql**
   - 修复系统字段的 fieldType
   - 将 'SELECT' 类型改为 'SYSTEM'
   - **必须执行**，否则员工详情页面字段显示为空

3. **005-verify-datasources.sql**
   - 验证数据源配置完整性
   - 识别缺失的数据源
   - 生成配置报告
   - **建议执行**，用于验证

---

## 快速执行

### 一键执行所有脚本

```bash
#!/bin/bash
# 一键执行脚本

DB_HOST="localhost"
DB_PORT="5432"
DB_USER="jy_user"
DB_NAME="jy_production"

echo "================================================"
echo "PostgreSQL 数据迁移 - 一键执行"
echo "================================================"
echo ""

# 检查数据库连接
echo "1. 检查数据库连接..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT NOW();" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✓ 数据库连接成功"
else
    echo "   ✗ 数据库连接失败，请检查配置"
    exit 1
fi

echo ""
echo "2. 执行迁移脚本..."
echo ""

# 执行 003：初始化数据源
echo "   [1/3] 初始化数据源..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
  -f 003-init-datasources.sql > /tmp/003.log 2>&1
if [ $? -eq 0 ]; then
    echo "   ✓ 数据源初始化完成"
else
    echo "   ✗ 数据源初始化失败"
    echo "   查看日志: cat /tmp/003.log"
    exit 1
fi

# 执行 004：修复字段类型
echo "   [2/3] 修复字段类型..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
  -f 004-fix-employee-field-types.sql > /tmp/004.log 2>&1
if [ $? -eq 0 ]; then
    echo "   ✓ 字段类型修复完成"
else
    echo "   ✗ 字段类型修复失败"
    echo "   查看日志: cat /tmp/004.log"
    exit 1
fi

# 执行 005：验证配置
echo "   [3/3] 验证配置..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
  -f 005-verify-datasources.sql > /tmp/005.log 2>&1
if [ $? -eq 0 ]; then
    echo "   ✓ 配置验证完成"
else
    echo "   ✗ 配置验证失败"
    echo "   查看日志: cat /tmp/005.log"
    exit 1
fi

echo ""
echo "================================================"
echo "所有迁移脚本执行完成！"
echo "================================================"
echo ""
echo "查看验证报告："
echo "  cat /tmp/005.log"
echo ""
```

保存为 `run-all-migrations.sh`，然后执行：

```bash
chmod +x run-all-migrations.sh
./run-all-migrations.sh
```

### 单独执行

```bash
# 只执行数据源初始化
psql -U jy_user -d jy_production -f 003-init-datasources.sql

# 只执行字段类型修复
psql -U jy_user -d jy_production -f 004-fix-employee-field-types.sql

# 只执行配置验证
psql -U jy_user -d jy_production -f 005-verify-datasources.sql
```

---

## 脚本详解

### 003-init-datasources.sql

**功能**：初始化所有数据源

**创建的数据源**：
- 性别 (gender)
- 民族 (nation)
- 婚姻状况 (marital_status)
- 政治面貌 (political_status)
- 职级 (JOB_LEVEL)
- 职位 (POSITION)
- 员工类型 (EMPLOYEE_TYPE)
- 学历层次 (education_level)
- 学历类型 (education_type)
- 在职状态 (employment_status)
- 紧急联系人关系 (emergency_relation)
- 家庭成员关系 (family_relation)
- 异动类型 (change_type)

**特点**：
- 使用 INSERT ... ON CONFLICT DO NOTHING
- 可以重复执行
- 只插入不存在的数据

### 004-fix-employee-field-types.sql

**功能**：修复系统字段类型

**修复的字段**：
- position (职位)
- employeeType (员工类型)
- resignationReason (离职原因)
- nation (民族)
- educationLevel (学历层次)
- educationType (学历类型)

**修复内容**：
- 将 fieldType 从 'SELECT' 改为 'SYSTEM'
- 这些字段存储在表字段中，不是 customFields

### 005-verify-datasources.sql

**功能**：验证数据源配置

**验证内容**：
- 检查数据源是否存在
- 统计选项数量
- 识别缺失的数据源
- 生成配置报告

---

## 执行前检查

### 1. 数据库存在

```bash
psql -U postgres -c "\l" | grep jy_production
```

### 2. 数据库用户权限

```bash
psql -U postgres -c "
  SELECT use.* FROM pg_user use
  JOIN pg_auth_mapping ams ON ams.rolname = use.usename
  WHERE ams.rolname = 'jy_user'
  AND ams.oid = (SELECT oid FROM pg_roles WHERE rolname = 'current_user');
"
```

### 3. 表结构已创建

```bash
psql -U jy_user -d jy_production -c "\dt"
```

---

## 执行后验证

### 验证数据源数量

```bash
psql -U jy_user -d jy_production -c "
  SELECT COUNT(*) AS data_source_count
  FROM \"DataSource\";
  -- 预期结果：13
"
```

### 验证字段类型

```bash
psql -U jy_user -d jy_production -c "
  SELECT
    \"fieldCode\",
    \"fieldName\",
    \"fieldType\"
  FROM \"EmployeeInfoTabField\"
  WHERE \"fieldCode\" IN ('position', 'employeeType', 'nation')
  ORDER BY \"fieldCode\";
  -- 预期结果：所有 fieldType = 'SYSTEM'
"
```

### 验证数据源选项

```bash
psql -U jy_user -d jy_production -c "
  SELECT
    ds.code,
    ds.name,
    COUNT(dso.id) AS option_count
  FROM \"DataSource\" ds
  LEFT JOIN \"DataSourceOption\" dso
    ON dso.\"dataSourceId\" = ds.id
    AND dso.\"isActive\" = true
  WHERE ds.code IN ('gender', 'JOB_LEVEL', 'POSITION')
  GROUP BY ds.code, ds.name
  ORDER BY ds.code;
  -- 预期结果：
  --   gender: 2 个选项
  --   JOB_LEVEL: 8 个选项
  --   POSITION: 12 个选项
"
```

---

## 故障排除

### 问题 1：脚本执行失败

**错误**：`relation "DataSource" does not exist`

**原因**：数据库表结构未创建

**解决**：
```bash
cd backend
DATABASE_URL="postgresql://..." npm run prisma:push
```

### 问题 2：权限错误

**错误**：`permission denied for table DataSource`

**原因**：数据库用户权限不足

**解决**：
```bash
psql -U postgres -c "
  GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO jy_user;
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO jy_user;
"
```

### 问题 3：重复执行失败

**错误**：`duplicate key value violates unique constraint`

**原因**：数据已存在

**解决**：脚本已使用 ON CONFLICT，不应该出现此错误。如果出现，说明脚本有问题，请检查。

---

## 回滚方案

如果需要回滚数据源修改：

```sql
-- 删除所有数据源（谨慎执行）
BEGIN;

DELETE FROM "DataSourceOption"
WHERE "dataSourceId" IN (
  SELECT id FROM "DataSource" WHERE code IN (
    'gender', 'nation', 'marital_status', 'political_status',
    'JOB_LEVEL', 'POSITION', 'EMPLOYEE_TYPE',
    'education_level', 'education_type'
  )
);

DELETE FROM "DataSource"
WHERE code IN (
  'gender', 'nation', 'marital_status', 'political_status',
  'JOB_LEVEL', 'POSITION', 'EMPLOYEE_TYPE',
  'education_level', 'education_type'
);

COMMIT;

-- 重新执行初始化脚本
psql -U jy_user -d jy_production -f 003-init-datasources.sql
```

---

## 更新日志

| 日期 | 版本 | 说明 |
|------|------|------|
| 2026-03-31 | v1.0.0 | 初始版本，包含完整的数据源初始化和字段类型修复 |

---

**注意事项**：
1. 执行前务必备份数据库
2. 建议在测试环境先验证
3. 按顺序执行脚本
4. 执行完成后进行验证
