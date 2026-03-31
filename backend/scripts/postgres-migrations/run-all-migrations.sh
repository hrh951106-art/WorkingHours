#!/bin/bash
# ================================================================
# PostgreSQL 数据迁移 - 一键执行脚本
# ================================================================
# 功能：按顺序执行所有数据库迁移脚本
# 使用：./run-all-migrations.sh
# ================================================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置（可根据实际情况修改）
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-jy_user}"
DB_NAME="${DB_NAME:-jy_production}"

# 日志文件
LOG_DIR="/tmp/jy-migrations"
mkdir -p $LOG_DIR

# 当前目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 辅助函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 打印标题
print_header() {
    echo ""
    echo "================================================"
    echo "PostgreSQL 数据迁移 - 一键执行"
    echo "================================================"
    echo ""
    echo "数据库配置："
    echo "  主机: $DB_HOST"
    echo "  端口: $DB_PORT"
    echo "  用户: $DB_USER"
    echo "  数据库: $DB_NAME"
    echo ""
    echo "日志目录: $LOG_DIR"
    echo "================================================"
    echo ""
}

# 检查数据库连接
check_database() {
    log_info "检查数据库连接..."

    if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT NOW();" > /dev/null 2>&1; then
        log_info "✓ 数据库连接成功"
        return 0
    else
        log_error "✗ 数据库连接失败"
        echo ""
        echo "请检查："
        echo "  1. PostgreSQL 服务是否启动"
        echo "  2. 数据库用户名和密码是否正确"
        echo "  3. 数据库是否已创建"
        echo ""
        echo "测试连接命令："
        echo "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
        return 1
    fi
}

# 检查表结构
check_tables() {
    log_info "检查表结构..."

    TABLE_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('DataSource', 'EmployeeInfoTabField');
    " 2>/dev/null)

    if [ "$TABLE_COUNT" = "2" ]; then
        log_info "✓ 表结构已创建"
        return 0
    else
        log_warn "表结构未完全创建，建议先执行数据库推送"
        echo ""
        echo "执行以下命令："
        echo "  cd backend"
        echo "  DATABASE_URL=\"postgresql://...\" npm run prisma:push"
        echo ""
        read -p "是否继续执行迁移？(y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "用户取消执行"
            return 1
        fi
    fi
}

# 执行迁移脚本
run_migration() {
    local script=$1
    local order=$2
    local name=$3

    log_info "[$order/3] 执行 $name..."

    local log_file="$LOG_DIR/${script}.log"

    if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
        -f "$SCRIPT_DIR/$script" > "$log_file" 2>&1; then
        log_info "✓ $name 执行成功"
        return 0
    else
        log_error "✗ $name 执行失败"
        echo ""
        echo "查看日志："
        echo "  cat $log_file"
        echo ""
        echo "最近20行错误："
        tail -20 "$log_file"
        return 1
    fi
}

# 显示报告
show_report() {
    echo ""
    echo "================================================"
    echo "执行报告"
    echo "================================================"
    echo ""

    # 数据源统计
    echo "数据源配置："
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT
        ds.code AS \"数据源\",
        ds.name AS \"名称\",
        COUNT(dso.id) AS \"选项数\"
    FROM \"DataSource\" ds
    LEFT JOIN \"DataSourceOption\" dso
      ON dso.\"dataSourceId\" = ds.id
      AND dso.\"isActive\" = true
    WHERE ds.code IN (
        'gender', 'nation', 'marital_status', 'political_status',
        'JOB_LEVEL', 'POSITION', 'EMPLOYEE_TYPE',
        'education_level', 'education_type'
    )
    GROUP BY ds.code, ds.name
    ORDER BY ds.code;
    "

    echo ""
    echo "字段类型验证："
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
    SELECT
        \"fieldCode\" AS \"字段代码\",
        \"fieldName\" AS \"字段名称\",
        \"fieldType\" AS \"字段类型\",
        CASE
            WHEN \"fieldType\" = 'SYSTEM' THEN '✓'
            ELSE '✗'
        END AS \"状态\"
    FROM \"EmployeeInfoTabField\"
    WHERE \"fieldCode\" IN (
        'position', 'employeeType', 'nation',
        'educationLevel', 'educationType'
    )
    ORDER BY \"fieldCode\";
    "

    echo ""
    echo "================================================"
    echo ""
    echo "详细日志："
    echo "  $LOG_DIR/"
    echo ""
}

# 主流程
main() {
    print_header

    # 1. 检查数据库连接
    if ! check_database; then
        exit 1
    fi

    echo ""

    # 2. 检查表结构
    if ! check_tables; then
        exit 1
    fi

    echo ""

    # 3. 执行迁移脚本
    echo "开始执行迁移脚本..."
    echo ""

    if ! run_migration "003-init-datasources.sql" "1" "数据源初始化"; then
        log_error "数据源初始化失败，终止执行"
        exit 1
    fi

    if ! run_migration "004-fix-employee-field-types.sql" "2" "字段类型修复"; then
        log_error "字段类型修复失败，终止执行"
        exit 1
    fi

    if ! run_migration "005-verify-datasources.sql" "3" "配置验证"; then
        log_warn "配置验证失败（非致命）"
    fi

    # 4. 显示报告
    show_report

    log_info "所有迁移脚本执行完成！"
    echo ""
}

# 执行主流程
main "$@"
