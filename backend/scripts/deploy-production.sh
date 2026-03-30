#!/bin/bash

# =====================================================
# 生产环境一键部署脚本
# 版本: v1.0
# 日期: 2026-03-30
# 说明: 自动化执行数据库迁移和代码部署
# =====================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置变量
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-jy}"
DB_USER="${DB_USER:-postgres}"
BACKUP_DIR="/data/backups"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/jy-deploy-$(date +%Y%m%d-%H%M%S).log"

# 日志函数
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# 检查前置条件
check_prerequisites() {
    log "检查前置条件..."

    # 检查是否为 root 用户
    if [ "$EUID" -eq 0 ]; then
        error "请不要使用 root 用户执行此脚本"
    fi

    # 检查 psql 是否可用
    if ! command -v psql &> /dev/null; then
        error "未找到 psql 命令，请先安装 PostgreSQL 客户端"
    fi

    # 检查数据库连接
    if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; then
        error "无法连接到数据库，请检查连接配置"
    fi

    log "前置条件检查通过"
}

# 数据库备份
backup_database() {
    log "开始数据库备份..."

    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/${DB_NAME}-before-update-$(date +%Y%m%d-%H%M%S).sql"

    log "备份数据库到: $BACKUP_FILE"
    PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
        -d "$DB_NAME" -f "$BACKUP_FILE"

    if [ $? -eq 0 ]; then
        log "数据库备份成功"
    else
        error "数据库备份失败"
    fi
}

# 执行数据库迁移
migrate_database() {
    log "开始数据库迁移..."

    # 执行表结构变更
    log "执行表结构变更..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
        -d "$DB_NAME" -f "$SCRIPT_DIR/01-add-shift-property-tables.sql"

    if [ $? -ne 0 ]; then
        error "表结构变更失败"
    fi

    # 初始化员工信息页签和数据源
    log "初始化员工信息页签和数据源..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
        -d "$DB_NAME" -f "$SCRIPT_DIR/02-init-employee-tabs-and-fields.sql"

    if [ $? -ne 0 ]; then
        error "员工信息页签和数据源初始化失败"
    fi

    # 初始化所有内置字段配置
    log "初始化所有内置字段配置..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
        -d "$DB_NAME" -f "$SCRIPT_DIR/02b-init-employee-fields-detail.sql"

    if [ $? -ne 0 ]; then
        error "内置字段配置初始化失败"
    fi

    # 初始化班次属性基础数据
    log "初始化班次属性基础数据..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
        -d "$DB_NAME" -f "$SCRIPT_DIR/03-init-shift-property-data.sql"

    if [ $? -ne 0 ]; then
        error "班次属性基础数据初始化失败"
    fi

    log "数据库迁移成功"
}

# 验证迁移
verify_migration() {
    log "验证迁移结果..."

    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
        -d "$DB_NAME" -f "$SCRIPT_DIR/05-verify-migration.sql" > /tmp/verify-output.txt 2>&1

    log "验证结果已保存到: /tmp/verify-output.txt"
    log "请检查验证结果，确认数据迁移成功"
}

# 部署后端
deploy_backend() {
    log "开始部署后端服务..."

    cd "$BACKEND_DIR"

    # 停止服务
    log "停止后端服务..."
    pm2 stop jy-backend || warn "后端服务未运行"

    # 拉取最新代码
    log "拉取最新代码..."
    git pull origin main

    # 安装依赖
    log "安装依赖..."
    npm install --production

    # 构建项目
    log "构建项目..."
    npm run build

    # 启动服务
    log "启动后端服务..."
    pm2 start jy-backend

    # 等待服务启动
    sleep 5

    # 检查服务状态
    if pm2 status jy-backend | grep -q "online"; then
        log "后端服务启动成功"
    else
        error "后端服务启动失败，请检查日志"
    fi
}

# 部署前端
deploy_frontend() {
    log "开始部署前端服务..."

    cd "$FRONTEND_DIR"

    # 拉取最新代码
    log "拉取最新代码..."
    git pull origin main

    # 安装依赖
    log "安装依赖..."
    npm install

    # 构建生产版本
    log "构建生产版本..."
    npm run build

    # 部署到服务器
    if [ -n "$DEPLOY_SERVER" ]; then
        log "部署到远程服务器..."
        rsync -avz --delete dist/ "$DEPLOY_SERVER:$WEB_ROOT/"
    else
        log "部署到本地目录..."
        sudo cp -r dist/* "$WEB_ROOT/"
    fi

    log "前端服务部署成功"
}

# 主函数
main() {
    log "=========================================="
    log "生产环境一键部署脚本 v1.0"
    log "=========================================="
    log "数据库: $DB_HOST:$DB_PORT/$DB_NAME"
    log "备份目录: $BACKUP_DIR"
    log "=========================================="

    # 读取环境变量
    if [ -f .env.production ]; then
        source .env.production
    fi

    # 检查前置条件
    check_prerequisites

    # 确认部署
    read -p "是否继续部署？(yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log "部署已取消"
        exit 0
    fi

    # 执行部署步骤
    backup_database
    migrate_database
    verify_migration

    # 部署应用（可选）
    read -p "是否部署应用代码？(yes/no): " deploy_confirm
    if [ "$deploy_confirm" = "yes" ]; then
        deploy_backend
        deploy_frontend
    fi

    log "=========================================="
    log "部署完成！"
    log "=========================================="
    log "日志文件: $LOG_FILE"
    log "备份文件: $BACKUP_FILE"
    log "=========================================="

    # 显示部署后检查清单
    echo ""
    log "请执行以下检查："
    log "1. 检查后端服务状态: pm2 status jy-backend"
    log "2. 检查前端页面访问: http://your-server/"
    log "3. 检查班次属性配置功能"
    log "4. 检查工时基础配置页面"
    log "5. 检查开线维护和产量记录的班次过滤功能"
    log ""
}

# 执行主函数
main "$@"
