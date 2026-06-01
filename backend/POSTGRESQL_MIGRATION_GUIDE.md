# PostgreSQL 迁移指南

## 概述

本指南详细说明如何将现有SQLite数据库迁移到PostgreSQL生产环境。

## 迁移文件

项目已生成以下PostgreSQL兼容文件：
- `postgres-export/schema.sql` - 数据库表结构
- `postgres-export/data.sql` - 完整数据导出

## 快速迁移步骤

### 步骤1: 安装PostgreSQL

\`\`\`bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# 验证安装
psql --version
\`\`\`

### 步骤2: 创建数据库

\`\`\`bash
sudo -u postgres psql

CREATE DATABASE jy_production;
CREATE USER jy_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;
\q
\`\`\`

### 步骤3: 导入数据

\`\`\`bash
# 导入表结构
psql -h localhost -U jy_user -d jy_production -f postgres-export/schema.sql

# 导入数据
psql -h localhost -U jy_user -d jy_production -f postgres-export/data.sql
\`\`\`

### 步骤4: 验证迁移

\`\`\`bash
psql -h localhost -U jy_user -d jy_production
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- 预期: 87个表
\q
\`\`\`

## 完整部署说明

详见 `DEPLOYMENT_GUIDE.md`

---
**文档版本**: 1.0
**更新日期**: 2026-06-01
