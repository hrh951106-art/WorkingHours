# 数据安全说明 - 执行迁移是否会覆盖已配置的数据

## 📋 快速回答

**❌ 不会覆盖您的已配置数据！**

迁移脚本只修改**系统预设的配置**，不会影响您在人事信息配置页面中的**自定义配置**。

---

## 🔍 详细说明

### ✅ 不会被覆盖的数据（您的自定义配置）

迁移脚本**不会**修改以下数据：

1. **自定义页签**
   - 您在人事信息配置页面创建的新页签
   - 识别标志：`isSystem = false`

2. **自定义分组**
   - 您在系统页签中添加的新分组
   - 识别标志：`isSystem = false`

3. **自定义字段**
   - 您添加的自定义字段
   - 识别标志：`fieldType = 'CUSTOM'` 或 `isSystem = false`

4. **其他页签配置**
   - 基本信息页签
   - 学历信息页签
   - 工作经历页签
   - 家庭信息页签

5. **已有员工数据**
   - 所有已录入的员工信息
   - 所有员工的字段值

### ✅ 会被修改的数据（只有3个系统分组）

迁移脚本**只会**修改工作信息页签的**系统预设分组**：

1. **"当前职位"分组** → 将被删除
   - 这是一个系统预设分组
   - 识别标志：`code = 'CURRENT_POSITION'`, `isSystem = true`
   - 其中的5个字段会被移动到"岗位信息"分组

2. **"组织信息"分组** → 将改名为"岗位信息"
   - 这是一个系统预设分组
   - 识别标志：`code = 'ORG_INFO'`, `isSystem = true`
   - 其中的1个字段（所属组织）会保留

3. **"雇佣信息"分组** → 只调整排序
   - 这是一个系统预设分组
   - 识别标志：`code = 'EMPLOYMENT_INFO'`, `isSystem = true`
   - 其中的8个字段保持不变

### ✅ 会被修改的字段（只有系统字段）

迁移脚本**只会**修改系统字段的`isSystem`标志：

- **修改前的字段状态**：`isSystem = false`（这是初始数据的bug）
- **修改后的字段状态**：`isSystem = true`（正确的状态）
- **影响范围**：只影响工作信息页签的系统字段
- **字段值**：不会改变任何字段的其他属性（名称、类型、排序等）

---

## 🔬 如何检查您的配置

### 方法1：运行检查脚本（推荐）

在执行迁移前，运行检查脚本查看现有配置：

```bash
# 连接到生产数据库
psql -U jy_user -d jy_production

# 执行检查脚本
\i backend/scripts/postgres-migrations/CHECK-existing-config.sql
```

检查脚本会输出：
- ✅ 所有页签列表
- ✅ 工作信息页签的所有分组
- ✅ 每个分组的字段数量
- ⚠️  自定义配置的警告（如果有）

### 方法2：手动查询自定义配置

```sql
-- 查看是否有自定义页签
SELECT * FROM "EmployeeInfoTab" WHERE "isSystem" = false;

-- 查看是否有自定义分组（工作信息页签）
SELECT * FROM "EmployeeInfoTabGroup"
WHERE "tabId" = (SELECT id FROM "EmployeeInfoTab" WHERE code = 'work_info')
  AND "isSystem" = false;

-- 查看是否有自定义字段（工作信息页签）
SELECT * FROM "EmployeeInfoTabField"
WHERE "tabId" = (SELECT id FROM "EmployeeInfoTab" WHERE code = 'work_info')
  AND "isSystem" = false;
```

---

## 🛡️ 安全保障措施

### 1. 自动备份

**安全迁移脚本**（推荐使用）会自动备份：

```sql
-- 创建临时备份表
CREATE TEMPORARY TABLE employee_info_tab_groups_backup AS
SELECT * FROM "EmployeeInfoTabGroup"
WHERE "code" IN ('CURRENT_POSITION', 'ORG_INFO', 'EMPLOYMENT_INFO');

CREATE TEMPORARY TABLE employee_info_tab_fields_backup AS
SELECT * FROM "EmployeeInfoTabField"
WHERE "tabId" = (SELECT id FROM "EmployeeInfoTab" WHERE code = 'work_info');
```

### 2. 检测自定义配置

脚本会自动检测并警告：

```
⚠️  警告：发现自定义配置
自定义分组数量: 2
自定义字段数量: 5
这些自定义配置不会被修改
```

### 3. 事务保护

所有操作都在一个事务中执行：

```sql
BEGIN;
-- 执行迁移
-- 如果出错，自动回滚
COMMIT;
```

### 4. 一键回滚

如果迁移后发现问题，可以立即回滚：

```bash
psql -U jy_user -d jy_production -f ROLLBACK-004-merge-position-groups.sql
```

回滚脚本会：
- ✅ 恢复"当前职位"分组
- ✅ 将"岗位信息"改回"组织信息"
- ✅ 字段移回原分组
- ✅ 恢复原始排序

---

## 📊 实际影响示例

### 示例场景1：纯系统配置（无自定义）

**迁移前：**
```
工作信息（系统页签）
├── 当前职位（系统分组）- 5个字段
├── 雇佣信息（系统分组）- 8个字段
└── 组织信息（系统分组）- 1个字段
```

**迁移后：**
```
工作信息（系统页签）
├── 岗位信息（系统分组）- 6个字段 ✅ 合并后
└── 雇佣信息（系统分组）- 8个字段
```

**影响：**
- ✅ 分组从3个变成2个
- ✅ 字段总数不变（14个）
- ✅ 所有字段属性不变

### 示例场景2：有自定义分组

**迁移前：**
```
工作信息（系统页签）
├── 当前职位（系统分组）- 5个字段
├── 雇佣信息（系统分组）- 8个字段
├── 组织信息（系统分组）- 1个字段
└── 我的自定义分组（自定义分组）- 3个字段 ⚠️
```

**迁移后：**
```
工作信息（系统页签）
├── 岗位信息（系统分组）- 6个字段 ✅
├── 雇佣信息（系统分组）- 8个字段
└── 我的自定义分组（自定义分组）- 3个字段 ⚠️ 保持不变
```

**影响：**
- ✅ 自定义分组**不受影响**
- ✅ 自定义字段**不受影响**
- ✅ 只修改系统分组

---

## ✅ 推荐的部署流程

### 步骤1：检查现有配置（5分钟）

```bash
# 1. 连接数据库
psql -U jy_user -d jy_production

# 2. 运行检查脚本
\i backend/scripts/postgres-migrations/CHECK-existing-config.sql

# 3. 查看输出，确认哪些数据会被修改
```

### 步骤2：备份数据库（5分钟）

```bash
# 创建备份
pg_dump -U jy_user -d jy_production \
  > backups/jy_production_backup_$(date +%Y%m%d_%H%M%S).sql

# 验证备份文件
ls -lh backups/jy_production_backup_*.sql | tail -1
```

### 步骤3：执行迁移（1分钟）

```bash
# 使用安全迁移脚本
psql -U jy_user -d jy_production \
  -f backend/scripts/postgres-migrations/004-merge-position-groups-SAFE.sql

# 查看执行结果
# 脚本会自动输出验证信息
```

### 步骤4：验证结果（5分钟）

```sql
-- 验证1：分组数量
SELECT COUNT(*) FROM "EmployeeInfoTabGroup"
WHERE "tabId" = (SELECT id FROM "EmployeeInfoTab" WHERE code = 'work_info');
-- 期望: 2

-- 验证2：自定义分组是否还在
SELECT * FROM "EmployeeInfoTabGroup"
WHERE "tabId" = (SELECT id FROM "EmployeeInfoTab" WHERE code = 'work_info')
  AND "isSystem" = false;
-- 期望: 您的自定义分组依然存在
```

### 步骤5：功能测试（10分钟）

1. 访问新增人员页面
2. 检查工作信息页签
3. 确认字段正常显示
4. 测试数据保存

---

## 🔄 如果需要回滚

```bash
# 执行回滚脚本
psql -U jy_user -d jy_production \
  -f backend/scripts/postgres-migrations/ROLLBACK-004-merge-position-groups.sql

# 验证回滚结果
# 分组应该恢复到3个：当前职位、雇佣信息、组织信息
```

---

## ❓ 常见问题

### Q1：我在人事信息配置页面添加的新分组会被删除吗？

**A：不会。** 迁移脚本只会删除系统预设的"当前职位"分组（`code = 'CURRENT_POSITION'`），不会删除任何自定义分组。

### Q2：我调整过的字段顺序会被重置吗？

**A：部分会。**
- ✅ 系统字段的顺序会按新结构调整（这是本次修改的目的）
- ❌ 自定义字段的顺序**不会**被改变

### Q3：我修改过的字段名称会被改回来吗？

**A：不会。** 迁移脚本不修改字段的`name`属性，只修改分组结构和`isSystem`标志。

### Q4：我的自定义字段类型会被影响吗？

**A：不会。** 自定义字段的所有属性（类型、名称、排序等）都不会被修改。

### Q5：已录入的员工数据会丢失吗？

**A：完全不会。** 迁移脚本只修改页签配置表，不接触员工数据表（`Employee`、`EmployeeEducation`、`EmployeeWorkExperience`等）。

---

## 📞 如有疑问

如果您对数据安全仍有疑虑，可以：

1. **先在测试环境验证**
   ```bash
   # 在测试数据库执行迁移
   psql -U jy_user -d jy_test -f CHECK-existing-config.sql
   psql -U jy_user -d jy_test -f 004-merge-position-groups-SAFE.sql
   ```

2. **联系技术支持**确认

3. **查看Git提交历史**了解具体修改
   ```bash
   git log --oneline -2
   git show HEAD --stat
   ```

---

## ✅ 总结

**您的自定义配置是安全的！**

- ✅ 自定义页签：不受影响
- ✅ 自定义分组：不受影响
- ✅ 自定义字段：不受影响
- ✅ 已有员工数据：不受影响
- ✅ 只修改系统预设的3个分组
- ✅ 只修改系统字段的isSystem标志
- ✅ 提供完整的回滚方案

**推荐部署方式：**
1. 先运行检查脚本
2. 备份数据库
3. 使用安全迁移脚本
4. 验证结果
5. 如有问题，立即回滚

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
