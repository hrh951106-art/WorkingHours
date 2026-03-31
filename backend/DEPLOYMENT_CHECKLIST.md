# JY系统生产部署检查清单

> **版本**: v1.0.0
> **更新日期**: 2025-03-31
> **用途**: 生产环境部署完整检查清单

---

## 📋 部署前准备

### 服务器环境检查

- [ ] **操作系统**: Linux (Ubuntu 20.04+ / CentOS 7+)
- [ ] **Node.js**: 18.x 或更高版本
- [ ] **npm**: 9.x 或更高版本
- [ ] **PostgreSQL**: 14.x 或更高版本
- [ ] **内存**: 至少 4GB RAM
- [ ] **磁盘**: 至少 20GB 可用空间
- [ ] **网络**: 服务器已配置静态IP

### 软件安装验证

```bash
# 检查Node.js版本
node --version   # 应该 >= 18.x

# 检查npm版本
npm --version    # 应该 >= 9.x

# 检查PostgreSQL版本
psql --version   # 应该 >= 14.x

# 检查Git版本
git --version    # 应该 >= 2.x
```

### 网络和防火墙

- [ ] PostgreSQL端口 5432 已开放（内部网络）
- [ ] 应用端口 3000 已开放（或配置反向代理）
- [ ] SSH端口 22 已配置安全策略
- [ ] 防火墙规则已配置

---

## 🗄️ 数据库部署

### PostgreSQL安装与配置

- [ ] PostgreSQL已安装
- [ ] PostgreSQL服务已启动
- [ ] 已配置PostgreSQL认证（pg_hba.conf）
- [ ] 已配置PostgreSQL监听地址（postgresql.conf）

```bash
# 验证PostgreSQL状态
sudo systemctl status postgresql
```

### 数据库创建

- [ ] 已创建数据库用户 `jy_admin`
- [ ] 已设置强密码（至少16位，包含大小写字母、数字、特殊字符）
- [ ] 已创建数据库 `jy_production`
- [ ] 已授予用户完整权限

```sql
-- 验证数据库创建
\l jy_production
\du jy_admin
```

### 数据库迁移执行

- [ ] **选择迁移方式**:
  - [ ] 方式A: 使用 `init_production.sql`（推荐 - 一次性初始化）
  - [ ] 方式B: 分步执行（表结构 + 种子数据）

- [ ] 表结构迁移成功
- [ ] 种子数据导入成功
- [ ] 重复数据清理完成
- [ ] 索引创建成功
- [ ] 序列重置完成

```bash
# 方式A: 执行完整初始化脚本
psql -U jy_admin -d jy_production -f prisma/migrations_postgres/20250331_init/init_production.sql

# 验证迁移成功
psql -U jy_admin -d jy_production -c "SELECT COUNT(*) FROM \"User\";"
```

### 数据库验证

- [ ] 运行 `verify-deployment.sql` 验证脚本
- [ ] 所有验证检查通过
- [ ] 数据完整性检查通过（无孤立记录）
- [ ] 无重复数据
- [ ] 索引已正确创建
- [ ] 序列状态正常

```bash
# 运行验证脚本
psql -U jy_admin -d jy_production -f scripts/verify-deployment.sql
```

---

## 📦 应用部署

### 代码部署

- [ ] 已克隆/拉取最新代码
- [ ] 已切换到正确的分支（main 或 production）
- [ ] 代码提交记录完整

```bash
# 验证代码
git log -1 --oneline
git status
```

### 依赖安装

- [ ] 已运行 `npm ci` 安装依赖
- [ ] 无依赖安装错误或警告
- [ ] package-lock.json 文件完整

```bash
# 安装依赖
npm ci --production=false

# 验证关键依赖
npm list @nestjs/core @prisma/client
```

### 环境配置

- [ ] 已复制 `.env.production.example` 为 `.env.production`
- [ ] **DATABASE_URL** 已正确配置
- [ ] **JWT_SECRET** 已设置为强随机字符串（至少32字符）
- [ ] **PORT** 已配置（默认3000）
- [ ] **NODE_ENV** 设置为 `production`
- [ ] **LOG_LEVEL** 已配置（info 或 warn）
- [ ] `.env.production` 文件权限设置为 600

```bash
# 生成强JWT密钥
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 设置文件权限
chmod 600 .env.production
```

### 应用构建

- [ ] 已运行 `npm run prisma:generate` 生成Prisma客户端
- [ ] 已运行 `npm run build` 构建应用
- [ ] 构建无错误或警告
- [ ] dist/ 目录已生成
- [ ] 构建产物大小合理

```bash
# 构建应用
npm run prisma:generate
npm run build

# 验证构建
ls -lh dist/src/
```

---

## 🚀 应用启动

### 启动配置

- [ ] **选择启动方式**:
  - [ ] 直接启动 (npm run start:prod)
  - [ ] PM2进程管理（推荐）

- [ ] PM2已安装（如果使用PM2）
- [ ] PM2配置文件已创建（ecosystem.config.js）

```bash
# 安装PM2
npm install -g pm2

# 验证PM2安装
pm2 --version
```

### 应用启动

- [ ] 应用已启动
- [ ] 进程运行正常
- [ ] 无启动错误
- [ ] 日志输出正常

```bash
# 使用PM2启动
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status
pm2 logs jy-backend --lines 50
```

### 开机自启

- [ ] PM2开机自启已配置
- [ ] PM2启动脚本已保存
- [ ] 系统重启后应用能自动启动

```bash
# 配置开机自启
pm2 save
pm2 startup
```

---

## ✅ 功能验证

### 基础功能测试

- [ ] **健康检查接口**: `GET http://localhost:3000/health` 返回200
- [ ] **API文档可访问**: `GET http://localhost:3000/api` (如果启用)
- [ ] **数据库连接正常**: 应用日志显示数据库连接成功

### 用户认证测试

- [ ] **默认账号可以登录**: admin / admin123
- [ ] **JWT token生成正常**
- [ ] **token验证功能正常**
- [ ] **登出功能正常**

```bash
# 测试登录
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 核心模块测试

- [ ] **用户管理**: 可以查看用户列表
- [ ] **角色管理**: 可以查看角色列表
- [ ] **组织管理**: 可以查看组织架构
- [ ] **人事页签**: 可以查看5个系统页签
  - [ ] basic_info (基本信息)
  - [ ] work_info (工作信息)
  - [ ] education_info (学历信息)
  - [ ] work_experience (工作经历)
  - [ ] family_info (家庭信息)

### API接口测试

- [ ] 用户相关接口正常
- [ ] 组织架构接口正常
- [ ] 员工信息接口正常
- [ ] 系统配置接口正常

```bash
# 运行接口测试（如果有测试脚本）
npm run test:e2e
```

---

## 🔒 安全配置

### 密码安全

- [ ] 默认管理员密码已修改
- [ ] 测试账号已禁用或删除
- [ ] 密码策略已配置（可选）

```sql
-- 修改管理员密码
UPDATE "User"
SET password = '$2b$10$新的bcrypt哈希值'
WHERE username = 'admin';
```

### JWT配置

- [ ] JWT_SECRET已更换为强随机字符串
- [ ] JWT过期时间已配置（建议7天）
- [ ] JWT刷新机制已配置（可选）

### 数据库安全

- [ ] 数据库用户权限已收紧
- [ ] 远程访问已限制（仅本地或特定IP）
- [ ] SSL连接已配置（生产环境推荐）
- [ ] 数据库备份已配置

```sql
-- 收紧数据库权限
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO jy_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO jy_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO jy_admin;
```

### 应用安全

- [ ] CORS已正确配置
- [ ] Helmet安全头已启用
- [ ] Rate Limiting已配置（可选）
- [ ] 请求大小限制已配置
- [ ] 日志中不记录敏感信息

### 网络安全

- [ ] HTTPS已配置（使用Nginx等反向代理）
- [ ] SSL证书已安装
- [ ] 防火墙规则已配置
- [ ] SSH访问已限制
- [ ] Fail2Ban已配置（推荐）

---

## 📊 性能优化

### 数据库优化

- [ ] 连接池已配置
- [ ] 查询缓存已启用（可选）
- [ ] 慢查询日志已启用
- [ ] 表统计信息已更新

```sql
-- 更新统计信息
ANALYZE;

-- 启用自动清理
ALTER DATABASE jy_production SET autovacuum = ON;
```

### 应用优化

- [ ] 集群模式已配置（PM2 -i max）
- [ ] 日志级别已设置为 info 或 warn
- [ ] 日志轮转已配置
- [ ] 静态资源CDN已配置（可选）

```bash
# 配置PM2日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 💾 备份策略

### 数据库备份

- [ ] **每日自动备份已配置** (cron job)
- [ ] 备份文件存储位置已设置
- [ ] 备份保留策略已配置（至少7天）
- [ ] 备份测试已执行
- [ ] 恢复流程已验证

```bash
# 配置每日自动备份（添加到crontab）
0 2 * * * pg_dump -U jy_admin -d jy_production -F c -f /backup/jy_production_$(date +\%Y\%m\%d).dump

# 验证备份文件
ls -lh /backup/
```

### 应用备份

- [ ] 应用代码备份策略已配置
- [ ] 配置文件备份已配置
- [ ] 上传文件备份已配置（如果有）

---

## 📝 监控和日志

### 日志配置

- [ ] 应用日志目录已创建
- [ ] 日志级别已正确配置
- [ ] 错误日志已配置
- [ ] 访问日志已配置
- [ ] PM2日志轮转已配置

```bash
# 查看日志
pm2 logs jy-backend
tail -f /var/log/jy-backend/error.log
```

### 监控配置

- [ ] **应用监控**（推荐）:
  - [ ] PM2监控
  - [ ] New Relic / DataDog（可选）

- [ ] **数据库监控**:
  - [ ] 连接数监控
  - [ ] 慢查询监控
  - [ ] 磁盘空间监控

- [ ] **服务器监控**:
  - [ ] CPU使用率
  - [ ] 内存使用率
  - [ ] 磁盘空间
  - [ ] 网络流量

### 告警配置

- [ ] 应用崩溃告警已配置
- [ ] 数据库连接失败告警已配置
- [ ] 磁盘空间不足告警已配置
- [ ] 告警通知渠道已配置（邮件/短信/钉钉等）

---

## 📚 文档和交接

### 部署文档

- [ ] 部署操作记录已保存
- [ ] 配置文件已备份
- [ ] 密码信息已安全存储
- [ ] 部署检查清单已完成

### 运维文档

- [ ] 启动/停止/重启操作文档
- [ ] 备份/恢复操作文档
- [ ] 故障排查手册
- [ ] 应急响应流程

### 交接清单

- [ ] 部署人员已签字确认
- [ ] 运维人员已接受培训
- [ ] 权限已正确交接
- [ ] 联系方式已更新

---

## 🎯 部署后验证（最终检查）

### 关键指标验证

- [ ] 应用正常运行时间 > 10分钟
- [ ] 无错误日志输出
- [ ] 数据库连接池使用正常
- [ ] API响应时间 < 500ms（平均值）
- [ ] 内存使用稳定
- [ ] CPU使用率正常

### 压力测试（可选）

- [ ] 并发用户测试
- [ ] 数据库连接池测试
- [ ] 内存泄漏测试
- [ ] 长时间运行稳定性测试

---

## ✍️ 签字确认

| 角色 | 姓名 | 签字 | 日期 |
|------|------|------|------|
| 部署工程师 | | | |
| 数据库管理员 | | | |
| 运维工程师 | | | |
| 技术负责人 | | | |
| 业务验收人 | | | |

---

## 📞 联系方式

| 角色 | 姓名 | 电话 | 邮箱 |
|------|------|------|------|
| 技术负责人 | | | |
| 运维负责人 | | | |
| 数据库DBA | | | |
| 值班电话 | | | |

---

## 📋 附录

### A. 常用命令速查

```bash
# 应用操作
pm2 start jy-backend      # 启动
pm2 stop jy-backend       # 停止
pm2 restart jy-backend    # 重启
pm2 logs jy-backend       # 查看日志
pm2 monit                 # 监控

# 数据库操作
psql -U jy_admin -d jy_production    # 连接数据库
pg_dump -U jy_admin jy_production > backup.sql  # 备份
psql -U jy_admin jy_production < backup.sql    # 恢复

# 日志查看
tail -f /var/log/jy-backend/error.log
tail -f /var/log/postgresql/postgresql-14-main.log
```

### B. 故障排查步骤

1. **应用无法启动**
   - 检查 .env.production 配置
   - 检查数据库连接
   - 查看应用日志

2. **数据库连接失败**
   - 检查PostgreSQL服务状态
   - 检查连接字符串
   - 检查防火墙规则

3. **API返回500错误**
   - 查看应用错误日志
   - 检查数据库查询
   - 检查环境变量配置

### C. 应急联系方式

- 7x24小时值班电话:
- 技术负责人:
- 运维团队:

---

**清单完成日期**: _______________

**部署状态**: □ 成功  □ 失败  □ 部分成功

**备注**:
