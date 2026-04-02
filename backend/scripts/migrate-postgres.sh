#!/bin/bash

# ====================================================================
# PostgreSQL 数据库迁移执行脚本
# 版本：20260402
# ====================================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置项（请根据实际情况修改）
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-jy_production}"
DB_USER="${DB_USER:-postgres}"

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATION_SCRIPT="$SCRIPT_DIR/update-employee-fields-20260402.postgres.sql"
BACKUP_DIR="$SCRIPT_DIR/../backups"

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."

    if ! command -v psql &> /dev/null; then
        log_error "psql 未安装，请先安装 PostgreSQL 客户端"
        exit 1
    fi

    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump 未安装，请先安装 PostgreSQL 客户端"
        exit 1
    fi

    log_info "✓ 依赖检查通过"
}

# 备份数据库
backup_database() {
    log_info "备份数据库..."

    # 创建备份目录
    mkdir -p "$BACKUP_DIR"

    # 生成备份文件名
    BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_backup_$(date +%Y%m%d_%H%M%S).sql"

    # 执行备份
    log_info "备份数据库到: $BACKUP_FILE"
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"

    if [ $? -eq 0 ]; then
        log_info "✓ 数据库备份成功: $BACKUP_FILE"
    else
        log_error "数据库备份失败"
        exit 1
    fi
}

# 测试数据库连接
test_connection() {
    log_info "测试数据库连接..."

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
        log_info "✓ 数据库连接成功"
    else
        log_error "数据库连接失败"
        log_error "请检查配置: DB_HOST=$DB_HOST, DB_PORT=$DB_PORT, DB_NAME=$DB_NAME, DB_USER=$DB_USER"
        exit 1
    fi
}

# 执行迁移
run_migration() {
    log_info "执行数据库迁移..."

    if [ ! -f "$MIGRATION_SCRIPT" ]; then
        log_error "迁移脚本不存在: $MIGRATION_SCRIPT"
        exit 1
    fi

    # 显示迁移脚本内容
    log_info "迁移脚本: $MIGRATION_SCRIPT"
    echo ""

    # 执行迁移
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_SCRIPT"

    if [ $? -eq 0 ]; then
        log_info "✓ 数据库迁移成功"
    else
        log_error "数据库迁移失败"
        log_error "请查看错误信息，可能需要执行回滚"
        exit 1
    fi
}

# 验证迁移结果
verify_migration() {
    log_info "验证迁移结果..."

    # 检查 Employee 表结构
    log_info "检查 Employee 表结构..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT
        column_name,
        is_nullable,
        data_type
    FROM information_schema.columns
    WHERE table_name = 'Employee'
      AND column_name IN ('name', 'gender')
    ORDER BY ordinal_position;
    "

    # 检查数据源更新
    log_info "检查数据源更新..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT
        f.\"fieldCode\",
        f.\"fieldName\",
        f.\"dataSourceId\",
        ds.code as \"dataSourceCode\"
    FROM \"EmployeeInfoTabField\" f
    LEFT JOIN \"DataSource\" ds ON f.\"dataSourceId\" = ds.id
    WHERE f.\"fieldCode\" IN ('emergencyRelation', 'jobLevel', 'status')
    ORDER BY f.\"fieldCode\";
    "

    # 统计数据
    log_info "统计数据状态..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT
        COUNT(*) as total_employees,
        COUNT(CASE WHEN \"name\" IS NULL THEN 1 END) as null_name_count,
        COUNT(CASE WHEN \"gender\" IS NULL THEN 1 END) as null_gender_count
    FROM \"Employee\";
    "

    log_info "✓ 验证完成"
}

# 显示帮助信息
show_help() {
    cat << EOF
PostgreSQL 数据库迁移脚本

用法: $0 [选项]

选项:
    -h, --help              显示此帮助信息
    -b, --backup-only       仅备份数据库
    -m, --migrate-only      仅执行迁移（不备份）
    -v, --verify-only       仅验证迁移结果
    -y, --yes               自动确认所有提示

环境变量:
    DB_HOST                 数据库主机 (默认: localhost)
    DB_PORT                 数据库端口 (默认: 5432)
    DB_NAME                 数据库名称 (默认: jy_production)
    DB_USER                 数据库用户 (默认: postgres)

示例:
    # 标准流程（备份 + 迁移 + 验证）
    $0

    # 仅备份
    $0 --backup-only

    # 使用自定义数据库配置
    DB_HOST=192.168.1.100 DB_NAME=mydb $0

EOF
}

# 主函数
main() {
    local BACKUP_ONLY=false
    local MIGRATE_ONLY=false
    local VERIFY_ONLY=false
    local AUTO_YES=false

    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -b|--backup-only)
                BACKUP_ONLY=true
                shift
                ;;
            -m|--migrate-only)
                MIGRATE_ONLY=true
                shift
                ;;
            -v|--verify-only)
                VERIFY_ONLY=true
                shift
                ;;
            -y|--yes)
                AUTO_YES=true
                shift
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # 显示配置
    log_info "========================================="
    log_info "PostgreSQL 数据库迁移工具"
    log_info "========================================="
    log_info "数据库配置:"
    log_info "  主机: $DB_HOST"
    log_info "  端口: $DB_PORT"
    log_info "  数据库: $DB_NAME"
    log_info "  用户: $DB_USER"
    log_info "========================================="

    # 确认执行
    if [ "$AUTO_YES" = false ]; then
        echo ""
        read -p "是否继续? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "已取消"
            exit 0
        fi
    fi

    echo ""

    # 检查依赖
    check_dependencies

    # 仅备份模式
    if [ "$BACKUP_ONLY" = true ]; then
        backup_database
        log_info "备份完成"
        exit 0
    fi

    # 仅验证模式
    if [ "$VERIFY_ONLY" = true ]; then
        verify_migration
        exit 0
    fi

    # 仅迁移模式
    if [ "$MIGRATE_ONLY" = true ]; then
        test_connection
        run_migration
        verify_migration
        log_info "迁移完成（未备份）"
        exit 0
    fi

    # 标准流程：备份 + 迁移 + 验证
    backup_database
    test_connection
    run_migration
    verify_migration

    # 完成
    log_info "========================================="
    log_info "✓ 数据库迁移全部完成！"
    log_info "========================================="
    log_info "下一步:"
    log_info "  1. 重启后端服务"
    log_info "  2. 执行功能测试"
    log_info "  3. 监控应用日志"
    log_info "========================================="
}

# 执行主函数
main "$@"
