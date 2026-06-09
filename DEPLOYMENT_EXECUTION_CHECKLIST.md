# 生产环境部署执行清单 - 2025年6月9日

## ⚠️ 执行前必读

1. **数据安全**: 本次更新不会影响生产环境现有数据
2. **回滚准备**: 已准备完整回滚方案
3. **执行时间**: 预计3小时（含验证）
4. **维护窗口**: 建议业务低峰期执行

---

## 📋 部署前检查清单

### 环境检查
- [ ] PostgreSQL服务运行正常
- [ ] 磁盘空间充足（至少10GB可用）
- [ ] 备份存储空间充足
- [ ] 网络连接稳定

### 人员准备
- [ ] 技术负责人在场
- [ ] 数据库管理员在场
- [ ] 运维负责人在场
- [ ] 应急响应团队待命

### 文档准备
- [ ] 部署指南已阅读
- [ ] 回滚方案已准备
- [ ] 应急联系方式已确认

---

## 🔧 关键问题修复（执行前必须完成）

### ❗ 问题1: Prisma Provider配置错误

**当前状态**: `backend/prisma/schema.prisma` 中 `provider = "sqlite"`
**生产要求**: `provider = "postgresql"`

**修复步骤**:
```bash
cd /Users/aaron.he/Desktop/AI/JY

# 备份schema文件
cp backend/prisma/schema.prisma backend/prisma/schema.prisma.backup_before_fix

# 修复provider配置
sed -i.bak 's/provider = "sqlite"/provider = "postgresql"/' backend/prisma/schema.prisma

# 验证修复
grep -A 2 "datasource db" backend/prisma/schema.prisma

# 重新生成Prisma客户端
cd backend
npx prisma generate
```

**验证**: 看到 `provider = "postgresql"` 即为成功

---

## 🚀 部署执行步骤

### 阶段1: 数据备份（30分钟）

```bash
# 1. 创建备份目录
mkdir -p /path/to/backups/$(date +%Y%m%d)
cd /path/to/backups/$(date +%Y%m%d)

# 2. PostgreSQL数据库备份
pg_dump -U username -h localhost -d jy_production > jy_production_backup.sql
ls -lh jy_production_backup.sql

# 3. 代码备份
cd /path/to/production
tar -czf /path/to/backups/$(date +%Y%m%d)/jy_production_code.tar.gz .

# 4. 验证备份
md5sum jy_production_backup.sql
tar -tzf /path/to/backups/$(date +%Y%m%d)/jy_production_code.tar.gz | head -20
```

**检查点**:
- [ ] 备份文件大小合理
- [ ] 备份文件可以打开
- [ ] MD5校验通过

---

### 阶段2: 数据库迁移（40分钟）

```bash
cd /path/to/production/backend

# 1. 验证迁移脚本
cat prisma/migrations_postgres/20260609_safe_production_updates/migration.sql

# 2. 测试数据库连接
psql -U username -d jy_production -c "SELECT current_database(), current_user;"

# 3. 执行迁移（方式1: 直接执行SQL）
psql -U username -d jy_production -f prisma/migrations_postgres/20260609_safe_production_updates/migration.sql > migration.log 2>&1

# 4. 执行迁移（方式2: 使用Prisma CLI - 推荐）
npx prisma migrate deploy --skip-seed

# 5. 验证迁移结果
psql -U username -d jy_production -f prisma/migrations_postgres/20260609_safe_production_updates/verify.sql > verification.log 2>&1

# 6. 检查验证结果
cat verification.log
grep "FAILED" verification.log # 应该没有输出
```

**检查点**:
- [ ] 迁移脚本执行无错误
- [ ] 验证脚本显示PASSED
- [ ] 新字段创建成功
- [ ] 索引创建成功
- [ ] 数据完整性保持

---

### 阶段3: 代码更新（30分钟）

```bash
# 1. 拉取最新代码
cd /path/to/production
git fetch origin
git pull origin main

# 2. 验证代码版本
git log -1 --oneline
git status

# 3. 后端代码更新
cd backend
npm ci --production
npx prisma generate
npm run build

# 4. 前端代码更新
cd ../frontend
npm ci --production
npm run build

# 5. 验证构建产物
ls -la backend/dist/
ls -la frontend/dist/
```

**检查点**:
- [ ] 代码拉取成功
- [ ] 依赖安装无错误
- [ ] 构建过程无错误
- [ ] 构建产物完整

---

### 阶段4: 服务重启（15分钟）

```bash
# 1. 重启后端服务
cd backend
pm2 restart jy-backend

# 2. 检查服务状态
pm2 status
pm2 logs jy-backend --lines 50

# 3. 重启前端服务
sudo nginx -t
sudo nginx -s reload

# 4. 检查前端服务
curl -I https://your-production-domain.com
```

**检查点**:
- [ ] 后端服务启动成功
- [ ] 前端服务正常
- [ ] 日志无错误信息
- [ ] API响应正常

---

### 阶段5: 验证测试（60分钟）

```bash
# 1. 数据库验证
psql -U username -d jy_production -c "
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE column_name IN ('unit', 'ruleCode', 'startTime', 'endTime', 'value', 'description')
ORDER BY table_name;
"

# 2. API健康检查
curl -X GET https://your-production-domain.com/api/health

# 3. 用户登录测试
curl -X POST https://your-production-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'

# 4. 数据查询测试
curl -X GET https://your-production-domain.com/api/employees \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. 新功能测试
# 5.1 产品维度验证
# 5.2 工时汇报新字段
# 5.3 赚取工时报表
# 5.4 账户选择组件
# 5.5 人事信息配置
```

**检查点**:
- [ ] 新增字段查询成功
- [ ] API健康检查通过
- [ ] 用户登录功能正常
- [ ] 核心业务流程正常
- [ ] 新功能测试通过
- [ ] 性能指标正常

---

## 🔄 回滚方案

### 数据库回滚

```bash
cd /path/to/production/backend

# 执行回滚脚本
psql -U username -d jy_production -f prisma/migrations_postgres/20260609_safe_production_updates/rollback.sql

# 验证回滚
psql -U username -d jy_production -c "
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name IN ('unit', 'ruleCode', 'startTime', 'endTime', 'value', 'description');
"
# 应该返回0行
```

### 代码回滚

```bash
cd /path/to/production

# 回滚到备份分支
git checkout backup-before-june9-update

# 重新构建
cd backend && npm run build && pm2 restart jy-backend
cd frontend && npm run build
sudo nginx -s reload
```

### 数据恢复（紧急）

```bash
# 从备份恢复数据库
pg_restore -U username -d jy_production /path/to/backups/YYYYMMDD/jy_production_backup.sql

# 或使用psql
psql -U username -d jy_production < /path/to/backups/YYYYMMDD/jy_production_backup.sql
```

---

## 📊 监控指标

### 数据库监控

```sql
-- 连接数监控
SELECT count(*) FROM pg_stat_activity WHERE datname = 'jy_production';

-- 慢查询监控
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = 'jy_production')
ORDER BY mean_time DESC LIMIT 10;

-- 表大小监控
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 应用监控

```bash
# PM2监控
pm2 monit

# 系统资源监控
top -bn1 | head -20

# 日志监控
tail -f backend/logs/app.log | grep ERROR
```

---

## 📞 应急联系

| 角色 | 姓名 | 联系方式 | 职责 |
|------|------|----------|------|
| 技术负责人 | Aaron.he | [待填写] | 总体协调、决策 |
| 数据库管理员 | [待填写] | [待填写] | 数据库问题处理 |
| 运维负责人 | [待填写] | [待填写] | 服务器、网络问题 |
| 前端负责人 | [待填写] | [待填写] | 前端问题处理 |
| 后端负责人 | [待填写] | [待填写] | 后端问题处理 |

---

## ✅ 最终确认

### 执行前确认
- [ ] Prisma provider已修复为postgresql
- [ ] 数据备份已完成并验证
- [ ] 代码备份已完成
- [ ] 迁移脚本已准备
- [ ] 回滚方案已准备
- [ ] 人员已到位
- [ ] 维护窗口已确认

### 执行后确认
- [ ] 数据库迁移成功
- [ ] 代码部署成功
- [ ] 服务运行正常
- [ ] 功能验证通过
- [ ] 性能指标正常
- [ ] 用户反馈良好
- [ ] 监控正常

---

## 📝 执行记录

| 时间 | 阶段 | 状态 | 执行人 | 备注 |
|------|------|------|--------|------|
|      | 数据备份 |      |        |      |
|      | 数据库迁移 |      |        |      |
|      | 代码更新 |      |        |      |
|      | 服务重启 |      |        |      |
|      | 验证测试 |      |        |      |

---

## 📚 相关文档

1. **PRODUCTION_DEPLOYMENT_GUIDE_JUNE_2025.md** - 完整部署指南
2. **SCHEMA_PROVIDER_FIX_GUIDE.md** - Prisma Provider修复指南
3. **backend/prisma/migrations_postgres/20260609_safe_production_updates/** - 迁移脚本

---

**执行时间**: [填写实际执行时间]
**执行人**: [填写执行人]
**验证人**: [填写验证人]
**状态**: [PENDING/IN_PROGRESS/COMPLETED/ROLLBACK]

---

## ⚠️ 重要提醒

1. **数据安全第一**: 任何时候数据安全都是第一位
2. **严格执行步骤**: 不要跳过任何验证步骤
3. **及时沟通**: 遇到问题立即报告，不要隐瞒
4. **准备回滚**: 如果出现问题，立即执行回滚
5. **记录详细**: 详细记录每个步骤的执行情况

---

**祝部署顺利！🎉**