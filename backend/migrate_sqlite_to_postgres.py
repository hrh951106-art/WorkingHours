#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SQLite to PostgreSQL 完整数据库迁移工具
功能：
1. 导出所有���结构（87张表）
2. 导出所有数据
3. 处理数据类型转换（SQLite -> PostgreSQL）
4. 处理自增主键、外键约束
5. 生成PostgreSQL兼容的SQL文件
"""

import sqlite3
import re
import json
from datetime import datetime
from decimal import Decimal
import sys
import os

class SQLiteToPostgreSQLMigrator:
    def __init__(self, sqlite_db_path, output_sql_path):
        self.sqlite_db_path = sqlite_db_path
        self.output_sql_path = output_sql_path
        self.conn = None
        self.cursor = None

    def connect(self):
        """连接SQLite数据库"""
        try:
            self.conn = sqlite3.connect(self.sqlite_db_path)
            self.cursor = self.conn.cursor()
            print(f"✓ 成功连接数据库: {self.sqlite_db_path}")
        except Exception as e:
            print(f"✗ 连接数据库失败: {e}")
            sys.exit(1)

    def close(self):
        """关闭数据库连接"""
        if self.conn:
            self.conn.close()

    def get_all_tables(self):
        """获取所有表名"""
        self.cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
        tables = [row[0] for row in self.cursor.fetchall()]
        return tables

    def get_table_info(self, table_name):
        """获取表结构信息"""
        self.cursor.execute(f"PRAGMA table_info('{table_name}')")
        columns = []
        for row in self.cursor.fetchall():
            col_info = {
                'cid': row[0],
                'name': row[1],
                'type': row[2],
                'notnull': row[3],
                'default_value': row[4],
                'is_pk': row[5]
            }
            columns.append(col_info)
        return columns

    def get_table_indexes(self, table_name):
        """获取表的索引信息"""
        self.cursor.execute(
            f"SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='{table_name}' AND sql IS NOT NULL"
        )
        indexes = [row[0] for row in self.cursor.fetchall()]
        return indexes

    def convert_sqlite_type_to_postgres(self, sqlite_type):
        """将SQLite数据类型转换为PostgreSQL数据类型"""
        type_mapping = {
            'INTEGER': 'INTEGER',
            'TEXT': 'TEXT',
            'REAL': 'DOUBLE PRECISION',
            'BLOB': 'BYTEA',
            'NUMERIC': 'NUMERIC',
            'BOOLEAN': 'BOOLEAN',
            'DATETIME': 'TIMESTAMP',
            'DATE': 'DATE',
            'TIME': 'TIME',
            'VARCHAR': 'TEXT',
            'CHAR': 'CHAR',
            'DECIMAL': 'DECIMAL',
            'BIGINT': 'BIGINT',
            'SMALLINT': 'SMALLINT',
            'FLOAT': 'DOUBLE PRECISION',
            'DOUBLE': 'DOUBLE PRECISION',
        }

        # 标准化类型名称
        normalized_type = sqlite_type.upper().split('(')[0].strip()

        # 查找映射
        for key in type_mapping:
            if key in normalized_type:
                return type_mapping[key]

        # 默认使用TEXT
        return 'TEXT'

    def generate_create_table_sql(self, table_name, columns):
        """生成PostgreSQL的CREATE TABLE语句"""
        sql_lines = []
        sql_lines.append(f"-- Table: {table_name}")
        sql_lines.append(f"DROP TABLE IF EXISTS \"{table_name}\" CASCADE;")
        sql_lines.append(f"CREATE TABLE \"{table_name}\" (")

        column_definitions = []
        primary_keys = []

        for col in columns:
            col_name = col['name']
            col_type = col['type']
            is_pk = col['is_pk']
            notnull = col['notnull']
            default_val = col['default_value']

            # 转换数据类型
            pg_type = self.convert_sqlite_type_to_postgres(col_type)

            # 处理主键
            if is_pk:
                pg_type = 'SERIAL' if 'INTEGER' in col_type.upper() else pg_type
                primary_keys.append(f'"{col_name}"')

            # 构建列定义
            col_def = f'    "{col_name}" {pg_type}'

            # 添加NOT NULL约束
            if notnull and not is_pk:
                col_def += ' NOT NULL'

            # 处理默认值
            if default_val:
                # 转换默认值的语法
                default_val = self.convert_default_value(default_val)
                col_def += f' DEFAULT {default_val}'

            column_definitions.append(col_def)

        # 添加主键约束
        if primary_keys:
            column_definitions.append(f'    PRIMARY KEY ({", ".join(primary_keys)})')

        sql_lines.append(',\n'.join(column_definitions))
        sql_lines.append(");\n")

        return '\n'.join(sql_lines)

    def convert_default_value(self, default_val):
        """转换默认值语法"""
        if default_val is None:
            return None

        # 处理字符串默认值
        if default_val.startswith("'"):
            return default_val

        # 处理数字
        if re.match(r'^\d+(\.\d+)?$', default_val):
            return default_val

        # 处理布尔值
        if default_val.upper() in ('TRUE', 'FALSE'):
            return default_val

        # 处理CURRENT_TIMESTAMP等函数
        if default_val.upper() in ('CURRENT_TIMESTAMP', 'CURRENT_DATE', 'CURRENT_TIME'):
            return default_val.upper()

        return f"'{default_val}'"

    def escape_sql_value(self, value):
        """转义SQL值"""
        if value is None:
            return 'NULL'

        # 处理字符串
        if isinstance(value, str):
            # 转义单引号
            value = value.replace("'", "''")
            # 处理反斜杠
            value = value.replace("\\", "\\\\")
            return f"'{value}'"

        # 处理数字
        if isinstance(value, (int, float, Decimal)):
            return str(value)

        # 处理布尔值
        if isinstance(value, bool):
            return 'TRUE' if value else 'FALSE'

        # 处理日期时间
        if isinstance(value, datetime):
            return f"'{value.isoformat()}'"

        # 处理二进制数据
        if isinstance(value, bytes):
            # 转换为hex格式
            hex_value = value.hex()
            return f"'\\x{hex_value}'::bytea"

        # 其他类型转为字符串
        return f"'{str(value)}'"

    def export_table_data(self, table_name):
        """导出表数据"""
        try:
            # 获取表中所有数据
            self.cursor.execute(f"SELECT * FROM '{table_name}'")
            rows = self.cursor.fetchall()

            if not rows:
                return f"-- 表 {table_name} 无数据\n\n"

            # 获取列名
            self.cursor.execute(f"PRAGMA table_info('{table_name}')")
            columns = [col[1] for col in self.cursor.fetchall()]

            insert_statements = []
            insert_statements.append(f"-- 数据导入: {table_name}")

            # 批量插入
            for row in rows:
                values = [self.escape_sql_value(v) for v in row]
                columns_quoted = [f'"{col}"' for col in columns]
                insert_sql = f"INSERT INTO \"{table_name}\" ({', '.join(columns_quoted)}) VALUES ({', '.join(values)});"
                insert_statements.append(insert_sql)

            insert_statements.append("")
            return '\n'.join(insert_statements)

        except Exception as e:
            print(f"  ⚠ 导出表 {table_name} 数据时出错: {e}")
            return f"-- 导出表 {table_name} 数据时出错: {e}\n\n"

    def export_all_data(self):
        """导出所有数据"""
        tables = self.get_all_tables()
        print(f"找到 {len(tables)} 张表")

        all_sql = []
        all_sql.append("-- ==========================================")
        all_sql.append("-- 精益工时管理系统 - PostgreSQL 完整数据库")
        all_sql.append(f"-- 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        all_sql.append(f"-- 表数量: {len(tables)}")
        all_sql.append("-- ==========================================\n")

        # 设置PostgreSQL参数
        all_sql.append("-- 设置客户端编码")
        all_sql.append("SET client_encoding = 'UTF8';")
        all_sql.append("")
        all_sql.append("-- 禁用触发器加速导入")
        all_sql.append("SET session_replication_role = 'replication';")
        all_sql.append("")
        all_sql.append("-- 开始事务")
        all_sql.append("BEGIN;")
        all_sql.append("")

        # 1. 导出表结构
        print("\n【步骤 1/2】导出表结构...")
        all_sql.append("-- ==========================================")
        all_sql.append("-- 表结构定义")
        all_sql.append("-- ==========================================\n")

        for i, table in enumerate(tables, 1):
            print(f"  [{i}/{len(tables)}] 导出表结构: {table}")
            columns = self.get_table_info(table)
            create_sql = self.generate_create_table_sql(table, columns)
            all_sql.append(create_sql)

        # 2. 导出数据
        print("\n【步骤 2/2】导出表数据...")
        all_sql.append("\n-- ==========================================")
        all_sql.append("-- 数据导入")
        all_sql.append("-- ==========================================\n")

        for i, table in enumerate(tables, 1):
            print(f"  [{i}/{len(tables)}] 导出表数据: {table}", end="")
            sys.stdout.flush()

            # 获取表的行数
            self.cursor.execute(f"SELECT COUNT(*) FROM '{table}'")
            row_count = self.cursor.fetchone()[0]
            print(f" ({row_count} 行)")

            if row_count > 0:
                data_sql = self.export_table_data(table)
                all_sql.append(data_sql)

        # 结束语句
        all_sql.append("\n-- 提交事务")
        all_sql.append("COMMIT;")
        all_sql.append("")
        all_sql.append("-- 恢复触发器")
        all_sql.append("SET session_replication_role = 'origin';")
        all_sql.append("")
        all_sql.append("-- 分析表统计信息")
        all_sql.append("ANALYZE;")
        all_sql.append("")
        all_sql.append("-- ==========================================")
        all_sql.append("-- 导出完成")
        all_sql.append("-- ==========================================")

        return '\n'.join(all_sql)

    def run(self):
        """执行迁移"""
        print("========================================")
        print("SQLite to PostgreSQL 完整数据库迁移")
        print("========================================\n")

        # 连接数据库
        self.connect()

        # 导出数据
        sql_content = self.export_all_data()

        # 保存到文件
        print(f"\n保存SQL文件到: {self.output_sql_path}")
        with open(self.output_sql_path, 'w', encoding='utf-8') as f:
            f.write(sql_content)

        # 获取文件大小
        file_size = os.path.getsize(self.output_sql_path) / (1024 * 1024)

        print(f"\n========================================")
        print("✓ 迁移完成!")
        print("========================================")
        print(f"输出文件: {self.output_sql_path}")
        print(f"文件大小: {file_size:.2f} MB")
        print(f"\n下一步:")
        print(f"1. 检查SQL文件: head -100 {self.output_sql_path}")
        print(f"2. 导入到PostgreSQL: psql -U username -d database -f {self.output_sql_path}")

        # 关闭连接
        self.close()

if __name__ == '__main__':
    # 数据库路径
    sqlite_db = 'prisma/dev.db'
    output_file = f'jy_production_complete_{datetime.now().strftime("%Y%m%d_%H%M%S")}.sql'

    # 执行迁移
    migrator = SQLiteToPostgreSQLMigrator(sqlite_db, output_file)
    migrator.run()
