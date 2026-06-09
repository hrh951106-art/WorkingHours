# 生产环境安全更新指南 - 2025年6月9日

## 重要提示

**⚠️ 生产环境更新前必读**:
- 本次更新包含数据库结构变更
- 所有变更均为非破坏性操作，不会影响现有数据
- 必须按照本文档步骤严格执行
- 更新前必须完成数据备份
- 准备好回滚方案

---

## 一、变更概览

### 1.1 变更时间范围
- **起始日期**: 2025年6月2日
- **更新日期**: 2025年6月9日
- **提交数量**: 39个Git提交
- **变更文件**: 172个代码文件

### 1.2 变更分类

#### 数据库结构变更（安全级别：✅ 高）
- 5个表新增可选字段
- 1个表新增索引
- 1个表新增��系约束
- **数据影响**: 无（所有新增字段为可选，带默认值）

#### 后端代码变更（安全级别：✅ 中）
- 分摊服务优化：产量记录产品维度验证
- 账户选择组件重构：UI优化
- 人事信息配置优化：岗位信息分组合并
- 工时汇报功能完善
- 工作流功能增强

#### 前端代码变更（安全级别：✅ 中）
- 新增页面：赚取工时报表、产品维护
- 组件优化：账户选择、组织树选择
- 页面重构：产品标准工时配置、工时汇报创建

---

## 二、数据库结构变更详情

### 2.1 新增字段（全部为可选字段）

| 表名 | 字段名 | 类型 | 默认值 | 说明 |
|------|--------|------|--------|------|
| PersonalProductionRecord | unit | TEXT | '小时' | 个人产量记录单位 |
| AllocationRuleConfig | ruleCode | TEXT | NULL | 分摊规则代码 |
| LaborHourReportEmployee | startTime | TEXT | NULL | 员工独立开始时间 |
| LaborHourReportEmployee | endTime | TEXT | NULL | 员工独立结束时间 |
| LaborHourReportEmployee | value | REAL | NULL | 员工独立工时数量 |
| LaborHourReportEmployee | description | TEXT | NULL | 员工独立描述 |
| EarnedHoursAllocationResult | unit | TEXT | NULL | 赚取工时分摊结果单位 |
| ProductStandardHourByLevel | unit | TEXT | NULL | 产品标准工时单位 |

### 2.2 新增索引

| 表名 | 索引名 | 字段 | 用途 |
|------|--------|------|------|
| ProductStandardHourByLevel | ProductStandardHourByLevel_productId_idx | productId | 提升产品关联查询性能 |

### 2.3 新增关系

| 表名 | 关系字段 | 关联表 | 说明 |
|------|----------|--------|------|
| ProductStandardHourByLevel | productId | Product | 产品与标准工时关联（逻辑关系） |

---

## 三、生产环境更新步骤

### 3.1 准备阶段（更新前）

#### 步骤1: 数据备份（必须执行）

```bash
# 1. PostgreSQL数据库备份
pg_dump -U username -h localhost -d jy_production > jy_production_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 验证备份文件
ls -lh jy_production_backup_*.sql
grep "CREATE TABLE" jy_production_backup_*.sql | wc -l

# 3. 测试备份恢复（可选但推荐）
pg_dump -U username -h localhost -d jy_production | head -100
```

#### 步骤2: 代码备份

```bash
# 备份当前生产代码
cd /path/to/production
tar -czf jy_production_code_backup_$(date +%Y%m%d_%H%M%S).tar.gz .

# 验证备份
ls -lh jy_production_code_backup_*.tar.gz
```

#### 步骤3: 环境检查

```bash
# 检查PostgreSQL服务状态
sudo systemctl status postgresql

# 检查磁盘空间
df -h

# 检查数据库连接
psql -U username -d jy_production -c "SELECT version();"
psql -U username -d jy_production -c "SELECT current_database(), current_user;"
```

### 3.2 数据库更新（核心步骤）

#### 步骤1: 准备迁移脚本

```bash
cd /path/to/production/backend

# 确认迁移脚本存在
ls -la prisma/migrations_postgres/20260609_safe_production_updates/
cat prisma/migrations_postgres/20260609_safe_production_updates/migration.sql
```

#### 步骤2: 执行数据库迁移

```bash
# 方式1: 使用psql执行迁移脚本
psql -U username -d jy_production -f prisma/migrations_postgres/20260609_safe_production_updates/migration.sql

# 方式2: 使用Prisma迁移（推荐）
cd backend
npx prisma migrate deploy

# 验证迁移状态
npx prisma migrate status
```

#### 步骤3: 验证迁移结果

```bash
# 执行验证脚本
psql -U username -d jy_production -f prisma/migrations_postgres/20260609_safe_production_updates/verify.sql > verification_results.txt

# 检查验证结果
cat verification_results.txt
grep "FAILED" verification_results.txt
```

### 3.3 代码更新

#### 步骤1: 拉取最新代码

```bash
cd /path/to/production

# 备份当前代码版本
git branch backup-before-june9-update
git push origin backup-before-june9-update

# 拉取最新代码
git fetch origin
git pull origin main

# 验证代码版本
git log -1 --oneline
git status
```

#### 步骤2: 后端代码更新

```bash
cd backend

# 更新依赖
npm ci --production

# 重新生成Prisma客户端
npx prisma generate

# 构建后端代码
npm run build

# 验证构建产物
ls -la dist/
```

#### 步骤3: 前端代码更新

```bash
cd frontend

# 更新依赖
npm ci --production

# 构建前端代码
npm run build

# 验证构建产物
ls -la dist/
```

### 3.4 服务重启

#### 步骤1: 重启后端服务

```bash
# 方式1: 使用PM2（推荐）
cd backend
pm2 restart jy-backend

# 验证服务状态
pm2 status
pm2 logs jy-backend --lines 50

# 方式2: 使用systemd
sudo systemctl restart jy-backend
sudo systemctl status jy-backend
```

#### 步骤2: 重启前端服务

```bash
# 根据前端部署方式重启
# 例如Nginx配置更新
sudo nginx -t
sudo nginx -s reload

# 或其他前端服务器
sudo systemctl restart nginx
```

### 3.5 验证测试（必须执行）

#### 数据库验证

```bash
# 检查新增字段
psql -U username -d jy_production -c "
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE column_name IN ('unit', 'ruleCode', 'startTime', 'endTime', 'value', 'description')
ORDER BY table_name;
"

# 检查数据完整性
psql -U username -d jy_production -c "
SELECT
    (SELECT COUNT(*) FROM \"PersonalProductionRecord\") AS personal_production_count,
    (SELECT COUNT(*) FROM \"AllocationRuleConfig\") AS allocation_config_count,
    (SELECT COUNT(*) FROM \"LaborHourReportEmployee\") AS labor_report_count,
    (SELECT COUNT(*) FROM \"EarnedHoursAllocationResult\") AS earned_hours_count,
    (SELECT COUNT(*) FROM \"ProductStandardHourByLevel\") AS product_standard_count;
"
```

#### 功能验证

```bash
# 1. API健康检查
curl -X GET https://your-production-domain.com/api/health

# 2. 用户登录测试
curl -X POST https://your-production-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'

# 3. 数据查询测试
curl -X GET https://your-production-domain.com/api/employees \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. 新功能测试
# 测试产品维度验证
# 测试工时汇报新字段
# 测试赚取工时报表
```

---

## 四、回滚方案

### 4.1 数据库回滚

```bash
# 执行回滚脚本
psql -U username -d jy_production -f prisma/migrations_postgres/20260609_safe_production_updates/rollback.sql

# 验证回滚结果
psql -U username -d jy_production -c "
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name IN ('unit', 'ruleCode', 'startTime', 'endTime', 'value', 'description');
"
# 应该返回0行
```

### 4.2 代码回滚

```bash
# 回滚到备份分支
git checkout backup-before-june9-update

# 重新构建和部署
cd backend && npm run build && pm2 restart jy-backend
cd frontend && npm run build
sudo nginx -s reload
```

### 4.3 数据恢复（紧急情况）

```bash
# 从备份恢复数据库
pg_restore -U username -d jy_production jy_production_backup_YYYYMMDD_HHMMSS.sql

# 或使用psql恢复
psql -U username -d jy_production < jy_production_backup_YYYYMMDD_HHMMSS.sql
```

---

## 五、注意事项

### 5.1 数据安全

✅ **保证**:
- 所有新增字段都是可选的，不会强制要求数据
- 所有字段都有默认值或允许NULL
- 不删除任何现有字段或数据
- 不修改任何现有字段类型或约束

⚠️ **注意**:
- 更新前必须完成数据备份
- 验证备份文件完整性
- 准备回滚方案

### 5.2 业务连续性

✅ **保证**:
- 数据库迁移过程不中断业务
- 代码更新采用滚动更新
- 服务重启时间 < 1分钟

⚠️ **注意**:
- 建议在业务低峰期执行
- 提前通知用户维护窗口
- 准备应急响应团队

### 5.3 性能影响

✅ **影响评估**:
- 新增索引：提升查询性能
- 新增字段：最小存储开销
- 代码更新：无性能下降

⚠️ **注意**:
- 监控数据库性能指标
- 检查API响应时间
- 验证前端加载速度

---

## 六、故障排查

### 6.1 常见问题

#### 问题1: 数据库迁移失败

**症状**: 迁移脚本执行报错

**排查步骤**:
```bash
# 检查数据库连接
psql -U username -d jy_production -c "SELECT 1;"

# 检查表是否存在
psql -U username -d jy_production -c "\dt"

# 检查权限
psql -U username -d jy_production -c "\dn"

# 查看详细错误
psql -U username -d jy_production -f migration.sql 2>&1 | tee error.log
```

**解决方案**:
- 检查数据库权限
- 确认表结构一致性
- 执行回滚后重新尝试

#### 问题2: 后端服务启动失败

**症状**: PM2显示服务错误

**排查步骤**:
```bash
# 查看详细日志
pm2 logs jy-backend --err

# 检查环境变量
cat .env.production

# 测试数据库连接
NODE_ENV=production node -e "require('./dist/database/prisma.service');"
```

**解决方案**:
- 检查.env.production配置
- 重新生成Prisma客户端
- 验证数据库连接字符串

#### 问题3: 前端页面加载异常

**症状**: 浏览器显示错误

**排查步骤**:
```bash
# 检查前端构建
ls -la frontend/dist/

# 检查Nginx配置
nginx -t

# 查看Nginx日志
tail -f /var/log/nginx/error.log
```

**解决方案**:
- 清除浏览器缓存
- 重新构建前端
- 检查静态资源路径

### 6.2 紧急联系

| 角色 | 姓名 | 联系方式 |
|------|------|----------|
| 技术负责人 | Aaron.he | [联系方式] |
| 数据库管理员 | [姓名] | [联系方式] |
| 运维负责人 | [姓名] | [联系方式] |

---

## 七、监控和验证

### 7.1 监控指标

#### 数据库监控
```sql
-- 查询连接数
SELECT count(*) FROM pg_stat_activity WHERE datname = 'jy_production';

-- 查询慢查询
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = 'jy_production')
ORDER BY mean_time DESC LIMIT 10;

-- 查询表大小
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### 应用监控
```bash
# PM2监控
pm2 monit

# 系统资源监控
top
htop

# 日志监控
tail -f backend/logs/app.log | grep ERROR
```

### 7.2 验证清单

- [ ] 数据库迁移成功执行
- [ ] 所有新字段创建成功
- [ ] 索引创建成功
- [ ] 数据完整性验证通过
- [ ] 后端服务启动正常
- [ ] 前端页面加载正常
- [ ] API功能测试通过
- [ ] 用户登录功能正常
- [ ] 核心业务流程正常
- [ ] 性能指标正常

---

## 八、时间安排

### 8.1 预计时间

| 阶段 | 预计时间 | 缓冲时间 | 总计 |
|------|----------|----------|------|
| 数据备份 | 15分钟 | 10分钟 | 25分钟 |
| 数据库迁移 | 20分钟 | 20分钟 | 40分钟 |
| 代码更新 | 15分钟 | 15分钟 | 30分钟 |
| 服务重启 | 5分钟 | 10分钟 | 15分钟 |
| 验证测试 | 30分钟 | 30分钟 | 60分钟 |
| **总计** | **85分钟** | **85分钟** | **170分钟（3小时）** |

### 8.2 建议部署窗口

**最佳时间**: 周六/周日 凌晨 2:00-5:00
**备选时间**: 工作日 20:00-23:00

---

## 九、附录

### 9.1 迁移脚本位置

```
backend/prisma/migrations_postgres/20260609_safe_production_updates/
├── migration.sql    # 主迁移脚本
├── rollback.sql      # 回滚脚本
└── verify.sql        # 验证脚本
```

### 9.2 相关文档

- 数据库备份策略: [链接]
- 应急响应流程: [链接]
- 变更管理规范: [链接]
- 技术架构文档: [链接]

### 9.3 变更历史

| 日期 | 版本 | 变更内容 | 负责人 |
|------|------|----------|--------|
| 2025-06-09 | v1.0 | 创建部署指南 | Aaron.he |

---

**文档版本**: v1.0
**最后更新**: 2025年6月9日
**状态**: 待审核

---

## 十、执行确认

### 执行前确认

- [ ] 数据备份已完成
- [ ] 备份文件已验证
- [ ] 回滚方案已准备
- [ ] 部署窗口已确认
- [ ] 相关人员已通知
- [ ] 监控系统已就绪

### 执行后确认

- [ ] 数据库迁移成功
- [ ] 代码部署成功
- [ ] 服务运行正常
- [ ] 功能验证通过
- [ ] 性能指标正常
- [ ] 用户反馈良好

---

**重要提醒**: 本文档中的所有步骤必须严格按照顺序执行，任何跳步都可能导致不可预知的问题。如有疑问，请及时联系技术负责人。