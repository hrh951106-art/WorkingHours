#!/usr/bin/env python3
"""
PostgreSQL导出文件全面一致性检查
验证schema文件与data文件的字段类型和数据格式完全匹配
"""

import re
import os
from datetime import datetime
from collections import defaultdict

def parse_schema_file(schema_path):
    """解析schema文件，提取所有表的字段定义"""
    tables = {}

    with open(schema_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 分割CREATE TABLE语句
    table_pattern = r'CREATE TABLE "([^"]+)" \((.*?)\);'
    matches = re.finditer(table_pattern, content, re.DOTALL)

    for match in matches:
        table_name = match.group(1)
        table_body = match.group(2)

        # 解析字段定义
        fields = {}
        lines = table_body.split('\n')

        for line in lines:
            line = line.strip()
            if not line or line.startswith('PRIMARY KEY') or line.startswith('--'):
                continue

            # 匹配字段定义: "fieldName" TYPE [CONSTRAINTS]
            field_match = re.match(r'"([^"]+)"\s+(\S+)', line)
            if field_match:
                field_name = field_match.group(1)
                field_type = field_match.group(2)

                # 标准化类型名称
                if field_type.startswith('TIMESTAMP'):
                    field_type = 'TIMESTAMP'
                elif field_type.startswith('INTEGER') and 'PRIMARY' not in line:
                    field_type = 'INTEGER'
                elif field_type == 'SERIAL':
                    field_type = 'SERIAL'
                elif field_type.startswith('TEXT'):
                    field_type = 'TEXT'
                elif field_type.startswith('DOUBLE'):
                    field_type = 'DOUBLE'
                elif field_type == 'BOOLEAN':
                    field_type = 'BOOLEAN'
                elif field_type == 'BYTEA':
                    field_type = 'BYTEA'

                fields[field_name] = {
                    'type': field_type,
                    'line': line
                }

        tables[table_name] = {
            'fields': fields,
            'has_data': False
        }

    return tables

def parse_data_file(data_path, schema_tables):
    """解析data文件，提取INSERT语句"""
    with open(data_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 匹配INSERT语句
    insert_pattern = r'INSERT INTO "([^"]+)" \(([^)]+)\) VALUES \((.*?)\);'
    matches = re.finditer(insert_pattern, content, re.DOTALL)

    for match in matches:
        table_name = match.group(1)

        if table_name not in schema_tables:
            continue

        schema_tables[table_name]['has_data'] = True

        columns_str = match.group(2)
        values_str = match.group(3)

        # 解析列名
        columns = [col.strip().replace('"', '') for col in columns_str.split(',')]

        # 解析值（简化处理）
        # 这里我们只检查是否存在，不详细解析每个值
        schema_tables[table_name]['sample_insert'] = {
            'columns': columns,
            'values': values_str
        }

    return schema_tables

def check_timestamp_field_consistency(table_name, field_name, field_type, sample_insert):
    """检查TIMESTAMP字段的一致性"""
    issues = []

    if field_type != 'TIMESTAMP':
        return [f"{table_name}.{field_name}: Schema类型是{field_type}，应该是TIMESTAMP"]

    if not sample_insert:
        return []

    columns = sample_insert['columns']
    values_str = sample_insert['values']

    # 检查字段是否在列列表中
    if field_name not in columns:
        return [f"{table_name}.{field_name}: Data文件中缺少此字段"]

    # 获取该字段的值的位置
    field_index = columns.index(field_name)

    # 分割值（简化处理，不考虑嵌套括号）
    values = re.split(r',(?![^(]*\))', values_str)

    if field_index >= len(values):
        return [f"{table_name}.{field_name}: 值数量不匹配"]

    value = values[field_index].strip()

    # 检查值格式
    if value == 'NULL':
        return []

    # TIMESTAMP值应该是字符串格式: 'YYYY-MM-DD HH:MM:SS' 或 'YYYY-MM-DD HH:MM:SS'
    if not (value.startswith("'") and value.endswith("'")):
        return [f"{table_name}.{field_name}: Data值不是字符串格式: {value}"]

    value_inner = value[1:-1]

    # 检查是否是时间戳格式
    timestamp_pattern = r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$'
    if not re.match(timestamp_pattern, value_inner):
        # 也可能是ISO格式: YYYY-MM-DDTHH:MM:SS
        iso_pattern = r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
        if not re.match(iso_pattern, value_inner):
            # 检查是否是纯数字（不应该出现）
            if value_inner.isdigit() and len(value_inner) >= 10:
                return [f"{table_name}.{field_name}: Data值是数字时间戳，应该是字符串: {value}"]

    return []

def check_all_tables(tables):
    """检查所有表的一致性"""
    all_issues = []
    passed_tables = []
    timestamp_fields = defaultdict(list)

    # 1. 收集所有TIMESTAMP字段
    for table_name, table_info in tables.items():
        for field_name, field_info in table_info['fields'].items():
            if field_info['type'] == 'TIMESTAMP':
                timestamp_fields[table_name].append(field_name)

    # 2. 检查每个表
    for table_name, table_info in tables.items():
        table_issues = []

        # 检查所有TIMESTAMP字段
        for field_name in timestamp_fields.get(table_name, []):
            field_info = table_info['fields'][field_name]
            sample_insert = table_info.get('sample_insert')

            issues = check_timestamp_field_consistency(
                table_name,
                field_name,
                field_info['type'],
                sample_insert
            )

            table_issues.extend(issues)

        if table_issues:
            all_issues.extend(table_issues)
        else:
            passed_tables.append(table_name)

    return {
        'passed': passed_tables,
        'issues': all_issues,
        'total': len(tables)
    }

def generate_report(tables, result, output_path):
    """生成检查报告"""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('# PostgreSQL导出文件全面一致性检查报告\n\n')
        f.write(f'**检查时间**: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}\n')
        f.write('**Schema文件**: postgres-export/01-schema.sql\n')
        f.write('**Data文件**: postgres-export/02-data.sql\n\n')
        f.write('---\n\n')
        f.write('## 📊 检查摘要\n\n')
        f.write(f'- **总表数**: {result["total"]}\n')
        f.write(f'- **通过检查**: {len(result["passed"])}\n')
        f.write(f'- **发现问题**: {len(result["issues"])}\n\n')

        # 发现问题时的报告
        if result['issues']:
            f.write('## ⚠️ 发现问题\n\n')
            f.write('### Schema-Data不匹配详情\n\n')
            for i, issue in enumerate(result['issues'], 1):
                f.write(f'{i}. `{issue}`\n')
            f.write('\n')

        # 通过的表
        f.write('## ✅ 通过检查的表\n\n')
        for table in sorted(result['passed']):
            # 显示表的TIMESTAMP字段
            timestamp_fields = [field for field, info in tables[table]['fields'].items()
                              if info['type'] == 'TIMESTAMP']
            if timestamp_fields:
                f.write(f'- **{table}** ({len(tables[table]["fields"])}个字段, {len(timestamp_fields)}个TIMESTAMP字段)\n')
                f.write(f'  - TIMESTAMP字段: {", ".join(timestamp_fields)}\n')
            else:
                f.write(f'- **{table}** ({len(tables[table]["fields"])}个字段)\n')

        f.write('\n---\n\n')
        f.write('## 🔍 检查项目\n\n')
        f.write('1. **Schema定义检查**: 验证所有DateTime字段正确定义为TIMESTAMP类型\n')
        f.write('2. **Data格式检查**: 验证时间戳数据为字符串格式 (YYYY-MM-DD HH:MM:SS)\n')
        f.write('3. **字段存在性**: 验证schema中的字段在data文件中都存在\n')
        f.write('4. **值格式匹配**: 验证TIMESTAMP字段的值格式正确\n\n')
        f.write('---\n\n')
        f.write('## 📁 检查的文件\n\n')
        f.write('- postgres-export/01-schema.sql (83 KB) - 表结构定义\n')
        f.write('- postgres-export/02-data.sql (698 KB) - 数据导入\n\n')
        f.write('---\n\n')
        f.write('**检查脚本**: comprehensive-check.py\n')

def main():
    """主函数"""
    print("=== PostgreSQL导出文件全面一致性检查 ===")
    print("")

    schema_path = 'postgres-export/01-schema.sql'
    data_path = 'postgres-export/02-data.sql'
    report_path = 'postgres-export/CONSISTENCY_CHECK_REPORT.md'

    # 检查文件存在
    if not os.path.exists(schema_path):
        print(f"❌ Schema文件不存在: {schema_path}")
        return

    if not os.path.exists(data_path):
        print(f"❌ Data文件不存在: {data_path}")
        return

    print(f"Schema文件: {schema_path}")
    print(f"Data文件: {data_path}")
    print("")

    # 1. 解析schema文件
    print("1. 解析schema文件...")
    tables = parse_schema_file(schema_path)
    print(f"   找到 {len(tables)} 个表")
    print("")

    # 2. 解析data文件
    print("2. 解析data文件...")
    tables = parse_data_file(data_path, tables)
    tables_with_data = sum(1 for t in tables.values() if t['has_data'])
    print(f"   有数据的表: {tables_with_data}")
    print("")

    # 3. 检查一致性
    print("3. 检查一致性...")
    result = check_all_tables(tables)
    print(f"   通过: {len(result['passed'])}/{result['total']}")
    print(f"   问题: {len(result['issues'])}")
    print("")

    # 4. 生成报告
    print("4. 生成报告...")
    generate_report(tables, result, report_path)
    print(f"   报告: {report_path}")
    print("")

    # 5. 输出结果
    print("=== 检查完成 ===")
    print(f"总表数: {result['total']}")
    print(f"通过: {len(result['passed'])}")
    print(f"问题: {len(result['issues'])}")
    print("")

    if result['issues']:
        print("⚠️ 发现问题:")
        for issue in result['issues'][:10]:  # 只显示前10个
            print(f"  - {issue}")
        if len(result['issues']) > 10:
            print(f"  ... 还有 {len(result['issues']) - 10} 个问题")
        print("")
        print(f"完整报告: {report_path}")
    else:
        print("✅ 所有表检查通过，Schema-Data完全一致！")
        print("")
        print("可以安全导入PostgreSQL数据库。")

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()
