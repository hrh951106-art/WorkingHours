# 种子数据快速参考

## 快速部署

```bash
# 使用脚本部署（推荐）
cd deployment
./seed-data-deploy.sh production

# 手动执行SQL
psql -h localhost -U postgres -d jy_production \
  -f deployment/postgresql-seed-data.sql

# 使用Prisma
cd backend
npm run prisma:seed:all
```

## 默认账户

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| admin | admin123 | 系统管理员 | 拥有所有权限 |
| hr_admin | hr123 | HR管理员 | 人事管理权限（默认角色） |

⚠️ **生产环境请立即修改默认密码！**

## 数据概览

| 数据类型 | 数量 | 说明 |
|---------|------|------|
| 数据源 | 19 | 性别、民族、婚姻状况、政治面貌、职级、职位、员工类型、学历层次、学历类型、在职状态、紧急联系人关系、家庭成员��系、异动类型、组织类型、工作地点、产品、工序、学历（兼容）、工作状态（兼容） |
| 数据源选项 | 100+ | 各数据源的可选项 |
| 人事页签 | 5 | 基本信息、工作信息、学历、经历、家庭 |
| 页签分组 | 6 | 各页签下的分组 |
| 页签字段 | 33 | 所有页签字段总数 |
| 用户 | 2 | admin, hr_admin |
| 角色 | 2 | ADMIN, HR_ADMIN |
| 组织 | 3 | 集团总部、技术部、人力资源部 |
| 班次 | 1 | 正常班 (08:00-17:30) |
| 班次段 | 3 | 上午、午休、下午 |
| 设备 | 1 | 前台考勤机 |
| 员工 | 2 | 张三、李四（示例数据） |

## 验证SQL

```sql
-- 检查数据完整性
SELECT
  (SELECT COUNT(*) FROM "DataSource") as data_sources,
  (SELECT COUNT(*) FROM "EmployeeInfoTab") as tabs,
  (SELECT COUNT(*) FROM "User") as users,
  (SELECT COUNT(*) FROM "Organization") as orgs,
  (SELECT COUNT(*) FROM "Shift") as shifts,
  (SELECT COUNT(*) FROM "Employee") as employees;
```

## 安全检查清单

- [ ] 修改默认用户密码
- [ ] 删除或更新示例员工数据
- [ ] 更新组织信息为实际名称
- [ ] 配置实际班次
- [ ] 添加实际设备信息
- [ ] 检查数据权限配置

## 常用操作

### 修改密码
```sql
-- 生成新密码的bcrypt哈希
-- node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('newpass', 10));"

UPDATE "User" SET password = '$2b$10$...' WHERE username = 'admin';
```

### 删除示例数据
```sql
UPDATE "Employee" SET status = 'DELETED'
WHERE "employeeNo" IN ('EMP001', 'EMP002');
```

### 查看数据源
```sql
SELECT ds.code, ds.name, ds.type,
       COUNT(dso.id) as option_count
FROM "DataSource" ds
LEFT JOIN "DataSourceOption" dso ON dso."dataSourceId" = ds.id
GROUP BY ds.id
ORDER BY ds.sort;
```

### 查看页签配置
```sql
SELECT t.code, t.name, COUNT(g.id) as group_count, COUNT(f.id) as field_count
FROM "EmployeeInfoTab" t
LEFT JOIN "EmployeeInfoTabGroup" g ON g."tabId" = t.id
LEFT JOIN "EmployeeInfoTabField" f ON f."tabId" = t.id
GROUP BY t.id
ORDER BY t.sort;
```

## 故障排除

### 问题：表不存在
```bash
cd backend
npx prisma migrate deploy
```

### 问题：权限不足
```sql
-- 授予必要权限
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

### 问题：SQL导入中断
```sql
-- 继续执行（SQL已使用 ON CONFLICT）
-- 直接重新执行即可，会更新已存在的记录
```

## 文件说明

| 文件 | 大小 | 说明 |
|------|------|------|
| postgresql-seed-data.sql | 33KB | 完整种子数据SQL |
| seed-data-deploy.sh | 7KB | 自动部署脚本 |
| SEED_DATA_GUIDE.md | 12KB | 详细部署指南 |
| SEED_DATA_QUICK_REFERENCE.md | 本文件 | 快速参考 |

## 获取帮助

- 查看详细指南: `cat deployment/SEED_DATA_GUIDE.md`
- 查看项目文档: `cat README.md`
- 运行脚本帮助: `./deployment/seed-data-deploy.sh --help`

---

**版本**: 1.0.0 | **更新**: 2026-06-02
