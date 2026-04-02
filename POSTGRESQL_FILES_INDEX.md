# PostgreSQL 迁移脚本 - 文件清单

**版本：** 20260402
**生成时间：** 2026-04-02

---

## 📦 生成的文件

### 1. SQL 脚本文件

#### 📄 完整版迁移脚本
**文件：** `backend/scripts/update-employee-fields-20260402.postgres.sql`
**大小：** 约 8 KB
**用途：** 生产环境数据库迁移
**特点：**
- 包含详细注释
- 自动检查约束
- 数据完整性验证
- 统计报告
- 内置回滚脚本

#### 📄 快速版迁移脚本
**文件：** `backend/scripts/quick-update-postgres.sql`
**大小：** 约 1 KB
**用途：** 测试环境或快速部署
**特点：**
- 简洁明了
- 执行快速
- 易于审查

### 2. Shell 脚本文件

#### 🐧 自动化迁移脚本
**文件：** `backend/scripts/migrate-postgres.sh`
**权限：** 可执行 (chmod +x)
**用途：** 自动化数据库迁移
**功能：**
- ✅ 自动备份数据库
- ✅ 测试数据库连接
- ✅ 执行迁移脚本
- ✅ 验证迁移结果
- ✅ 彩色日志输出
- ✅ 错误处理
- ✅ 支持自定义配置

**使用方法：**
```bash
# 标准执行
./scripts/migrate-postgres.sh

# 查看帮助
./scripts/migrate-postgres.sh --help

# 仅备份
./scripts/migrate-postgres.sh --backup-only

# 自动确认
./scripts/migrate-postgres.sh --yes
```

### 3. 文档文件

#### 📖 PostgreSQL 迁移指南
**文件：** `backend/docs/POSTGRESQL_MIGRATION_README.md`
**用途：** 完整的 PostgreSQL 迁移使用指南
**内容：**
- 脚本说明
- 快速开始指南
- Shell 脚本使用说明
- 迁移验证 SQL
- 回滚方案
- 问题排查
- 注意事项

---

## 🚀 快速使用指南

### 场景 1: 生产环境部署（推荐）

```bash
# 1. 配置环境变量
export DB_HOST=your-db-host
export DB_PORT=5432
export DB_NAME=jy_production
export DB_USER=postgres

# 2. 执行自动化脚本
cd backend
./scripts/migrate-postgres.sh --yes
```

### 场景 2: 测试环境部署

```bash
# 使用快速版脚本
cd backend
psql -h localhost -U postgres -d jy_test < scripts/quick-update-postgres.sql
```

### 场景 3: 手动部署

```bash
# 1. 备份
pg_dump -h localhost -U postgres -d jy_production > backup.sql

# 2. 执行迁移
psql -h localhost -U postgres -d jy_production -f scripts/update-employee-fields-20260402.postgres.sql

# 3. 验证
psql -h localhost -U postgres -d jy_production -c "SELECT \"fieldCode\", \"fieldName\", \"dataSourceId\" FROM \"EmployeeInfoTabField\" WHERE \"fieldCode\" IN ('emergencyRelation', 'jobLevel', 'status');"
```

---

## 📋 文件对比

| 特性 | 完整版脚本 | 快速版脚本 | Shell 脚本 |
|-----|-----------|-----------|-----------|
| 注释详细 | ✅ | ❌ | ✅ |
| 约束检查 | ✅ | ❌ | ✅ |
| 数据验证 | ✅ | ❌ | ✅ |
| 统计报告 | ✅ | ❌ | ✅ |
| 自动备份 | ❌ | ❌ | ✅ |
| 自动验证 | ❌ | ❌ | ✅ |
| 错误处理 | ✅ | ❌ | ✅ |
| 彩色日志 | ❌ | ❌ | ✅ |
| 回滚脚本 | ✅ | ❌ | ❌ |
| 推荐环境 | 生产 | 测试 | 生产 |

---

## 📂 文件位置

```
backend/
├── scripts/
│   ├── update-employee-fields-20260402.postgres.sql     # 完整 SQL 脚本
│   ├── quick-update-postgres.sql                        # 快速 SQL 脚本
│   └── migrate-postgres.sh                              # 自动化 Shell 脚本 (可执行)
└── docs/
    └── POSTGRESQL_MIGRATION_README.md                   # PostgreSQL 迁移指南
```

---

## ✅ 使用前检查

- [ ] 已阅读 `POSTGRESQL_MIGRATION_README.md`
- [ ] 已确认数据库类型为 PostgreSQL 12+
- [ ] 已备份数据库（或使用自动化脚本自动备份）
- [ ] 已测试数据库连接
- [ ] 已确认在低峰期执行（生产环境）

---

## 🎯 推荐流程

### 生产环境

1. 阅读 `POSTGRESQL_MIGRATION_README.md` 了解详情
2. 使用 `migrate-postgres.sh` 自动化脚本执行
3. 脚本会自动完成：备份 → 迁移 → 验证
4. 查看日志输出，确认迁移成功

### 测试环境

1. 使用 `quick-update-postgres.sql` 快速执行
2. 手动验证结果
3. 测试应用功能

---

## 📞 需要帮助？

- 查看详细文档：`backend/docs/POSTGRESQL_MIGRATION_README.md`
- 查看脚本帮助：`./scripts/migrate-postgres.sh --help`
- 联系 DBA 团队：____________________

---

**文档生成时间：** 2026-04-02
**维护者：** Claude AI Assistant
