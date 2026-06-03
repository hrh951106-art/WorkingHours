# 生产环境部署说明 - 人事���息页签配置优化

## 📋 部署概述

**部署版本：** v1.0.4
**部署时间：** 待定
**部署人员：** 待定
**影响范围：** 人事管理模块 - 新增人员功能

## 🎯 部署目标

1. **优化工作信息页签分组结构**
   - 合并"当前职位"和"组织信息"为"岗位信息"分组
   - 提升用户体验，减少页面层级

2. **修复新增人员字段不显示问题**
   - 修正系统字段的isSystem标志
   - 确保所有配置字段正常显示

## 📦 部署文件

### Git提交信息
```
Commit: d0dd9ac
Message: 优化人事信息页签配置 - 合并岗位信息分组并修复字段显示问题
```

### 包含的文件
1. `backend/prisma/seed-employee-info-tabs.ts` - Seed脚本更新
2. `backend/scripts/postgres-migrations/004-merge-position-groups.sql` - PostgreSQL迁移脚本

## 🚀 部署步骤

### 前置条件检查

```bash
# 1. 确认数据库连接
psql -U jy_user -d jy_production -c "SELECT 1;"

# 2. 备份数据库
pg_dump -U jy_user -d jy_production > backups/jy_production_backup_$(date +%Y%m%d_%H%M%S).sql

# 3. 检查备份文件大小
ls -lh backups/jy_production_backup_*.sql | tail -1
```

### 执行数据库迁移

```bash
# 1. 进入项目目录
cd /path/to/JY/backend

# 2. 执行迁移脚本
psql -U jy_user -d jy_production -f scripts/postgres-migrations/004-merge-position-groups.sql

# 3. 查看执行结果
# 脚本会自动输出验证信息
```

### 验证迁移结果

```sql
-- 连接到生产数据库
psql -U jy_user -d jy_production

-- 验证1：检查分组数量（应该是2个）
SELECT COUNT(*) as group_count
FROM "EmployeeInfoTabGroup"
WHERE "tabId" = (SELECT "id" FROM "EmployeeInfoTab" WHERE "code" = 'work_info');
-- 期望结果: 2

-- 验证2：检查分组名称
SELECT "code", "name", "sort"
FROM "EmployeeInfoTabGroup"
WHERE "tabId" = (SELECT "id" FROM "EmployeeInfoTab" WHERE "code" = 'work_info')
ORDER BY "sort";
-- 期望结果:
-- POSITION_INFO | 岗位信息 | 1
-- EMPLOYMENT_INFO | 雇佣信息 | 2

-- 验证3：检查岗位信息分组字段数量（应该是6个）
SELECT COUNT(*) as field_count
FROM "EmployeeInfoTabField"
WHERE "groupId" = (SELECT "id" FROM "EmployeeInfoTabGroup" WHERE "code" = 'POSITION_INFO');
-- 期望结果: 6

-- 验证4：检查岗位信息字段
SELECT g."name" as group_name, f."fieldCode", f."fieldName", f."sort"
FROM "EmployeeInfoTabField" f
LEFT JOIN "EmployeeInfoTabGroup" g ON f."groupId" = g."id"
WHERE g."code" = 'POSITION_INFO'
ORDER BY f."sort";
-- 期望结果:
-- 岗位信息 | orgId    | 所属组织 | 1
-- 岗位信息 | position | 职位     | 2
-- 岗位信息 | jobLevel | 职级     | 3
-- 岗位信息 | employeeType | 员工类型 | 4
-- 岗位信息 | workLocation | 工作地点 | 5
-- 岗位信息 | workAddress  | 办公地址 | 6

-- 验证5：检查所有工作信息字段的isSystem（应该都是true）
SELECT "fieldCode", "fieldName", "isSystem"
FROM "EmployeeInfoTabField"
WHERE "tabId" = (SELECT "id" FROM "EmployeeInfoTab" WHERE "code" = 'work_info')
ORDER BY "fieldCode";
-- 所有isSystem应该为 true
```

### 重启应用服务（可选）

⚠️ **注意：** 本次部署只修改数据库配置，不需要重启后端服务。

```bash
# 如果需要重启，使用以下命令
# 后端服务
pm2 restart jy-backend

# 前端服务
pm2 restart jy-frontend
```

## ✅ 功能测试

### 测试用例

#### 1. 新增人员页面字段显示测试

**操作步骤：**
1. 访问新增人员页面：`http://your-domain/hr/employees/create`
2. 检查基本信息页签，所有字段应正常显示
3. 切换到工作信息页签

**预期结果：**
- ✅ 工作信息页签显示2个分组：岗位信息、雇佣信息
- ✅ 岗位信息分组包含6个字段：所属组织、职位、职级、员工类型、工作地点、办公地址
- ✅ 雇佣信息分组包含8个字段
- ✅ 所有字段标签正确显示
- ✅ 必填字段有红色星号标识

#### 2. 字段必填验证测试

**操作步骤：**
1. 在新增人员页面，只填写非必填字段
2. 点击"下一步"或"提交保存"

**预期结果：**
- ✅ 所属组织字段显示验证错误（必填）
- ✅ 入职日期字段显示验证错误（必填）
- ✅ 员工状态字段显示验证错误（必填）
- ✅ 错误提示信息清晰

#### 3. 数据保存测试

**操作步骤：**
1. 填写所有必填字段
2. 点击"提交保存"
3. 检查员工列表页面

**预期结果：**
- ✅ 保存成功，无报错
- ✅ 员工列表显示新创建的员工
- ✅ 工作信息数据正确保存

## 🔄 回滚方案

如果部署后发现问题，执行以下回滚步骤：

### 方案1：数据库层面回滚（推荐）

```bash
# 1. 恢复数据库备份
psql -U jy_user -d jy_production < backups/jy_production_backup_YYYYMMDD_HHMMSS.sql

# 2. 验证恢复结果
psql -U jy_user -d jy_production -c "SELECT COUNT(*) FROM \"EmployeeInfoTabGroup\" WHERE \"code\" = 'CURRENT_POSITION';"
# 期望结果: 1（表示旧数据已恢复）
```

### 方案2：手动回滚SQL

```sql
-- 连接到生产数据库
psql -U jy_user -d jy_production

BEGIN;

-- 1. 恢复"当前职位"分组
INSERT INTO "EmployeeInfoTabGroup" ("tabId", "code", "name", "description", "sort", "status", "collapsed", "isSystem")
VALUES (
    (SELECT "id" FROM "EmployeeInfoTab" WHERE "code" = 'work_info'),
    'CURRENT_POSITION',
    '当前职位',
    '当前职位和岗位信息',
    1,
    'ACTIVE',
    false,
    true
)
ON CONFLICT ("tabId", "code") DO NOTHING;

-- 2. 将字段移回"当前职位"分组
UPDATE "EmployeeInfoTabField"
SET "groupId" = (SELECT "id" FROM "EmployeeInfoTabGroup" WHERE "code" = 'CURRENT_POSITION')
WHERE "fieldCode" IN ('position', 'jobLevel', 'employeeType', 'workLocation', 'workAddress');

-- 3. 恢复"组织信息"分组
UPDATE "EmployeeInfoTabGroup"
SET "name" = '组织信息',
    "code" = 'ORG_INFO',
    "description" = '所属组织和部门信息',
    "sort" = 3
WHERE "code" = 'POSITION_INFO';

-- 4. 将所属组织字段移回"组织信息"分组
UPDATE "EmployeeInfoTabField"
SET "groupId" = (SELECT "id" FROM "EmployeeInfoTabGroup" WHERE "code" = 'ORG_INFO')
WHERE "fieldCode" = 'orgId';

-- 5. 恢复字段排序
UPDATE "EmployeeInfoTabField" SET "sort" = 1 WHERE "fieldCode" = 'position' AND "groupId" = (SELECT "id" FROM "EmployeeInfoTabGroup" WHERE "code" = 'CURRENT_POSITION');
UPDATE "EmployeeInfoTabField" SET "sort" = 2 WHERE "fieldCode" = 'jobLevel' AND "groupId" = (SELECT "id" FROM "EmployeeInfoTabGroup" WHERE "code" = 'CURRENT_POSITION');
UPDATE "EmployeeInfoTabField" SET "sort" = 3 WHERE "fieldCode" = 'employeeType' AND "groupId" = (SELECT "id" FROM "EmployeeInfoTabGroup" WHERE "code" = 'CURRENT_POSITION');
UPDATE "EmployeeInfoTabField" SET "sort" = 4 WHERE "fieldCode" = 'workLocation' AND "groupId" = (SELECT "id" FROM "EmployeeInfoTabGroup" WHERE "code" = 'CURRENT_POSITION');
UPDATE "EmployeeInfoTabField" SET "sort" = 5 WHERE "fieldCode" = 'workAddress' AND "groupId" = (SELECT "id" FROM "EmployeeInfoTabGroup" WHERE "code" = 'CURRENT_POSITION');
UPDATE "EmployeeInfoTabField" SET "sort" = 1 WHERE "fieldCode" = 'orgId' AND "groupId" = (SELECT "id" FROM "EmployeeInfoTabGroup" WHERE "code" = 'ORG_INFO');

COMMIT;
```

## 📊 监控指标

部署后需要监控的指标：

1. **错误日志监控**
   ```bash
   # 查看后端错误日志
   tail -f /var/log/jy/backend/error.log | grep -i "employee\|field"
   ```

2. **用户反馈**
   - 新增人员功能是否正常
   - 字段是否正常显示
   - 是否有其他异常

3. **性能监控**
   - 页面加载时间
   - API响应时间

## 📞 联系方式

**部署负责人：** 待定
**技术支持：** 待定
**紧急联系：** 待定

## ✅ 部署检查清单

- [ ] 数据库备份已完成
- [ ] 备份文件已验证
- [ ] 迁移脚本已在测试环境验证
- [ ] 生产环境部署窗口已确认
- [ ] 相关用户已通知
- [ ] 回滚方案已准备
- [ ] 监控工具已就绪

---

**部署完成后请在下方签字确认：**

部署人员：__________ 日期：__________
验收人员：__________ 日期：__________

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
