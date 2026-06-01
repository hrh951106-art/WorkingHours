#!/usr/bin/env python3
"""
SQLite到PostgreSQL转换工具
将SQLite数据库分离为表结构文件和数据文件
"""

import sqlite3
import os
import re
from datetime import datetime as dt

def convert_sqlite_to_postgres():
    db_path = 'prisma/dev.db'
    output_dir = 'postgres-export'

    print("=== SQLite到PostgreSQL转换（表结构与数据分离）===")
    print(f"数据库: {db_path}")
    print(f"输出目录: {output_dir}")
    print()

    # 创建输出目录
    os.makedirs(output_dir, exist_ok=True)

    schema_file = os.path.join(output_dir, '01-schema.sql')
    data_file = os.path.join(output_dir, '02-data.sql')

    # 连接SQLite数据库
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 获取所有表名
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    tables = [row[0] for row in cursor.fetchall()]

    print(f"找到 {len(tables)} 个表")
    print()

    # 写入Schema文件
    with open(schema_file, 'w', encoding='utf-8') as f:
        f.write("-- =====================================================\n")
        f.write("-- PostgreSQL Schema Export (表结构定义)\n")
        f.write(f"-- 生成时间: {dt.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("-- =====================================================\n\n")
        f.write("SET client_encoding = 'UTF8';\n")
        f.write("SET standard_conforming_strings = on;\n\n")
        f.write("DROP SCHEMA IF EXISTS public CASCADE;\n")
        f.write("CREATE SCHEMA public;\n\n")
        f.write("GRANT ALL ON SCHEMA public TO postgres;\n")
        f.write("GRANT ALL ON SCHEMA public TO public;\n\n")

        # 处理每个表
        for i, table in enumerate(tables, 1):
            print(f"[{i}/{len(tables)}] 处理表结构: {table}")

            f.write(f"\n-- =====================================================\n")
            f.write(f"-- Table: {table}\n")
            f.write(f"-- =====================================================\n\n")
            f.write(f'DROP TABLE IF EXISTS "{table}" CASCADE;\n\n')

            # 获取CREATE TABLE语句
            cursor.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{table}'")
            result = cursor.fetchone()

            if result and result[0]:
                create_sql = result[0]

                # 转换SQLite语法到PostgreSQL
                create_sql = re.sub(r'CREATE TABLE IF NOT EXISTS', 'CREATE TABLE', create_sql)
                create_sql = re.sub(r'INTEGER PRIMARY KEY AUTOINCREMENT', 'SERIAL PRIMARY KEY', create_sql)

                # 获取列信息
                cursor.execute(f"PRAGMA table_info('{table}')")
                columns = cursor.fetchall()

                f.write(f'CREATE TABLE "{table}" (\n')

                column_defs = []
                primary_keys = []

                for col in columns:
                    col_name = col[1]
                    col_type = col[2]
                    not_null = col[3]
                    default_val = col[4]
                    is_pk = col[5]

                    # 转换类型
                    pg_type = col_type
                    if col_type == 'INTEGER':
                        if is_pk:
                            pg_type = 'SERIAL'
                        else:
                            pg_type = 'INTEGER'
                    elif col_type == 'TEXT':
                        pg_type = 'TEXT'
                    elif col_type == 'REAL':
                        pg_type = 'DOUBLE PRECISION'
                    elif col_type == 'BLOB':
                        pg_type = 'BYTEA'
                    elif col_type == 'DATETIME':
                        pg_type = 'TIMESTAMP'
                    elif col_type == 'BOOLEAN':
                        pg_type = 'BOOLEAN'

                    col_def = f'  "{col_name}" {pg_type}'
                    if not_null:
                        col_def += ' NOT NULL'
                    if default_val and not is_pk:
                        if default_val == 'CURRENT_TIMESTAMP':
                            col_def += ' DEFAULT CURRENT_TIMESTAMP'
                        elif default_val in ('TRUE', 'FALSE'):
                            col_def += f' DEFAULT {default_val.lower()}'
                        else:
                            col_def += f" DEFAULT {default_val}"

                    column_defs.append(col_def)
                    if is_pk:
                        primary_keys.append(col_name)

                # 写入列定义
                f.write(',\n'.join(column_defs))

                # 写入主键
                if primary_keys:
                    f.write(',\n  PRIMARY KEY (' + ', '.join([f'"{pk}"' for pk in primary_keys]) + ')')

                f.write('\n);\n\n')

                # 处理索引
                cursor.execute(
                    f"SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='{table}' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%'"
                )
                indexes = cursor.fetchall()

                for idx_name, idx_sql in indexes:
                    if idx_sql:
                        # 简化索引创建语句
                        idx_sql = re.sub(r'CREATE UNIQUE INDEX', 'CREATE UNIQUE INDEX', idx_sql)
                        idx_sql = re.sub(r'CREATE INDEX', 'CREATE INDEX', idx_sql)
                        f.write(f'{idx_sql};\n')

                f.write('\n')

        f.write('\n-- Schema导出完成\n')

    # 写入Data文件
    with open(data_file, 'w', encoding='utf-8') as f:
        f.write("-- =====================================================\n")
        f.write("-- PostgreSQL Data Export (数据导入)\n")
        f.write(f"-- 生成时间: {dt.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("-- =====================================================\n\n")
        f.write("SET client_encoding = 'UTF8';\n")
        f.write("SET standard_conforming_strings = on;\n\n")
        f.write("BEGIN;\n\n")

        for i, table in enumerate(tables, 1):
            print(f"[{i}/{len(tables)}] 处理数据: {table}")

            f.write(f"\n-- Data for table: {table}\n")

            # 获取行数
            cursor.execute(f"SELECT COUNT(*) FROM '{table}'")
            row_count = cursor.fetchone()[0]

            if row_count > 0:
                print(f"  导出 {row_count} 条记录")
                f.write(f'TRUNCATE TABLE "{table}" RESTART IDENTITY CASCADE;\n')

                # 获取所有数据
                cursor.execute(f"SELECT * FROM '{table}'")
                rows = cursor.fetchall()

                # 获取列名
                cursor.execute(f"PRAGMA table_info('{table}')")
                columns = [col[1] for col in cursor.fetchall()]

                # 生成INSERT语句
                for row in rows:
                    values = []
                    for value in row:
                        if value is None:
                            values.append('NULL')
                        elif isinstance(value, str):
                            # 转义单引号
                            escaped = value.replace("'", "''")
                            values.append(f"'{escaped}'")
                        elif isinstance(value, bool):
                            values.append('true' if value else 'false')
                        elif isinstance(value, int):
                            # 检查是否是时间戳字段（通过字段名判断）
                            time_keywords = ['time', 'date', 'created', 'updated', 'start', 'end',
                                           'effective', 'expiry', 'report', 'production', 'work', 'calc',
                                           'punch', 'schedule', 'adjusted', 'operation', 'graduation']
                            if any(keyword in col_name.lower() for keyword in time_keywords):
                                # 转换Unix时间戳（毫秒）到PostgreSQL TIMESTAMP格式
                                if value > 0:
                                    # 毫秒时间戳转秒
                                    timestamp_dt = dt.fromtimestamp(value / 1000)
                                    values.append(f"'{timestamp_dt.strftime('%Y-%m-%d %H:%M:%S')}'")
                                else:
                                    values.append('NULL')
                            else:
                                values.append(str(value))
                        elif isinstance(value, float):
                            values.append(str(value))
                        else:
                            values.append(f"'{str(value)}'")

                    cols = ', '.join([f'"{col}"' for col in columns])
                    vals = ', '.join(values)
                    f.write(f'INSERT INTO "{table}" ({cols}) VALUES ({vals});\n')

                f.write('\n')
            else:
                print(f"  表为空，跳过")
                f.write(f'-- 表 {table} 无数据\n\n')

        # 写入重置序列的代码
        f.write('\n-- 重置序列\n')
        f.write("DO $$\n")
        f.write("DECLARE\n")
        f.write("  table_name text;\n")
        f.write("  column_name text;\n")
        f.write("  max_id bigint;\n")
        f.write("BEGIN\n")
        f.write("  FOR table_name, column_name IN\n")
        f.write("    SELECT table_name, column_name\n")
        f.write("    FROM information_schema.columns\n")
        f.write("    WHERE table_schema = 'public'\n")
        f.write("      AND column_default LIKE 'nextval%'\n")
        f.write("  LOOP\n")
        f.write("    EXECUTE format(\n")
        f.write("      'SELECT COALESCE(MAX(%I), 0) FROM %I.%I',\n")
        f.write("      column_name,\n")
        f.write("      'public',\n")
        f.write("      table_name\n")
        f.write("    ) INTO max_id;\n\n")
        f.write("    IF max_id > 0 THEN\n")
        f.write("      EXECUTE format(\n")
        f.write("        'SELECT setval(pg_get_serial_sequence(\'\'%I\'\', \\'%I\\'), %s, true)',\n")
        f.write("        table_name,\n")
        f.write("        column_name,\n")
        f.write("        max_id\n")
        f.write("      );\n")
        f.write("    END IF;\n")
        f.write("  END LOOP;\n")
        f.write("END $$;\n\n")

        f.write('COMMIT;\n\n')
        f.write('-- 数据导出完成\n')

    conn.close()

    # 显示文件大小
    schema_size = os.path.getsize(schema_file) / 1024
    data_size = os.path.getsize(data_file) / 1024

    print()
    print("=== 转换完成 ===")
    print(f"✅ Schema文件: {schema_file} ({schema_size:.1f} KB)")
    print(f"✅ Data文件: {data_file} ({data_size:.1f} KB)")
    print()
    print("使用方法:")
    print("  步骤1: 创建数据库")
    print("    createdb jy_production")
    print()
    print("  步骤2: 导入表结构")
    print("    psql -d jy_production -f postgres-export/01-schema.sql")
    print()
    print("  步骤3: 导入数据（可选）")
    print("    psql -d jy_production -f postgres-export/02-data.sql")
    print()
    print("独立使用:")
    print("  - 只更新结构: psql -d jy_production -f 01-schema.sql")
    print("  - 只同步数据: psql -d jy_production -f 02-data.sql")

if __name__ == '__main__':
    try:
        convert_sqlite_to_postgres()
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()
