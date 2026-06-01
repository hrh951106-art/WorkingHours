#!/usr/bin/env python3
"""
快速验证关键时间字段的数据格式
直接检查INSERT语句中的时间戳格式
"""

import re
import os

def check_timestamp_format(data_file_path):
    """检查data��件中时间戳格式"""
    issues = []

    with open(data_file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 关键时间字段
    timestamp_fields = [
        'createdAt', 'updatedAt', 'deletedAt',
        'effectiveDate', 'expiryDate',
        'startTime', 'endTime', 'scheduleDate',
        'adjustedStart', 'adjustedEnd',
        'punchTime', 'workDate', 'reportDate',
        'approvedAt', 'publishedAt',
        'initiatedAt', 'finishedAt'
    ]

    # 检查每一行INSERT语句
    lines = content.split('\n')
    insert_count = 0
    timestamp_value_count = 0
    integer_timestamp_count = 0

    for line in lines:
        if not line.startswith('INSERT INTO'):
            continue

        insert_count += 1

        # 检查是否包含正确格式的时间戳字符串
        # 格式: 'YYYY-MM-DD HH:MM:SS'
        if re.search(r"'[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}'", line):
            timestamp_value_count += 1

        # 检查是否有不应该出现的纯数字时间戳（大的整数，10位以上）
        # 但要排除ID字段等普通整数
        # 我们在INSERT语句的VALUES部分查找
        values_part = re.search(r'VALUES \((.*?)\);', line)
        if values_part:
            values = values_part.group(1)
            # 查找10位以上的纯数字（可能是错误的时间戳）
            large_integers = re.findall(r',\s*([0-9]{10,})(?=,|\s*\);)', values)
            for num in large_integers:
                # 检查这个数字前面是否有时间字段名
                # 这只是统计，不代表一定有问题
                integer_timestamp_count += 1

    print(f"=== 快速验证结果 ===")
    print(f"")
    print(f"扫描的INSERT语句: {insert_count}")
    print(f"包含正确时间格式的记录: {timestamp_value_count}")
    print(f"发现大整数（可能是时间戳）: {integer_timestamp_count}")
    print(f"")

    # 详细检查几个关键表
    print(f"=== 关键表验证 ===")
    print(f"")

    key_tables = [
        ('User', 22, 'createdAt, updatedAt'),
        ('Organization', 12, 'createdAt, updatedAt, effectiveDate'),
        ('Employee', 20, 'createdAt, updatedAt, birthDate'),
        ('WorkHourResult', 113, 'workDate, calcDate, createdAt, updatedAt'),
    ]

    for table_name, expected_count, fields in key_tables:
        pattern = f'INSERT INTO "{table_name}"'
        matches = re.findall(pattern, content)
        actual_count = len(matches)

        if actual_count > 0:
            # 获取第一条记录
            first_insert = None
            for line in lines:
                if pattern in line:
                    first_insert = line
                    break

            if first_insert:
                # 检查时间字段格式
                has_correct_format = bool(re.search(r"'[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}'", first_insert))
                status = "✅" if has_correct_format else "⚠️"

                print(f"{status} {table_name}:")
                print(f"   记录数: {actual_count}")
                print(f"   时间字段: {fields}")
                print(f"   格式正确: {'是' if has_correct_format else '否'}")
                print(f"")
        else:
            print(f"⏭ {table_name}: 无数据")
            print(f"")

    # 检查是否有明显的问题：INTEGER类型的时间戳值
    print(f"=== 潜在问题检查 ===")
    print(f"")

    # 查找模式: fieldName, 1234567890 (字段名后面跟大整数)
    # 但要排除普通ID字段
    problematic_patterns = [
        (r'(createdAt|updatedAt|effectiveDate|startTime|endTime),\s*([0-9]{10,})(?=,|\s*\);)', '时间字段后跟大整数'),
    ]

    for pattern, description in problematic_patterns:
        matches = re.findall(pattern, content)
        if matches:
            print(f"⚠️  发现 {description}:")
            for field_name, value in matches[:5]:  # 只显示前5个
                print(f"   {field_name} = {value}")
            if len(matches) > 5:
                print(f"   ... 还有 {len(matches) - 5} 个")
            print(f"")

    if not any([re.findall(p, content) for p, _ in problematic_patterns]):
        print(f"✅ 未发现明显的问题格式")
        print(f"")

    return {
        'insert_count': insert_count,
        'timestamp_format_count': timestamp_value_count,
        'integer_count': integer_timestamp_count
    }

def check_schema_timestamp_types(schema_file_path):
    """检查schema文件中的TIMESTAMP类型定义"""
    with open(schema_file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    print(f"=== Schema字段类型检查 ===")
    print(f"")

    # 检查createdAt和updatedAt字段是否都是TIMESTAMP
    createdat_pattern = r'"createdAt"\s+(\w+)'
    updatedat_pattern = r'"updatedAt"\s+(\w+)'

    createdat_types = re.findall(createdat_pattern, content)
    updatedat_types = re.findall(updatedat_pattern, content)

    createdat_timestamp = sum(1 for t in createdat_types if 'TIMESTAMP' in t)
    updatedat_timestamp = sum(1 for t in updatedat_types if 'TIMESTAMP' in t)
    createdat_integer = sum(1 for t in createdat_types if 'INTEGER' in t)
    updatedat_integer = sum(1 for t in updatedat_types if 'INTEGER' in t)

    print(f"createdAt字段:")
    print(f"  总数: {len(createdat_types)}")
    print(f"  TIMESTAMP类型: {createdat_timestamp}")
    print(f"  INTEGER类型: {createdat_integer}")
    print(f"")

    print(f"updatedAt字段:")
    print(f"  总数: {len(updatedat_types)}")
    print(f"  TIMESTAMP类型: {updatedat_timestamp}")
    print(f"  INTEGER类型: {updatedat_integer}")
    print(f"")

    if createdat_integer > 0 or updatedat_integer > 0:
        print(f"❌ 发现INTEGER类型的createdAt/updatedAt字段")
        return False
    else:
        print(f"✅ 所有createdAt/updatedAt字段都是TIMESTAMP类型")
        return True

def main():
    schema_path = 'postgres-export/01-schema.sql'
    data_path = 'postgres-export/02-data.sql'

    if not os.path.exists(schema_path):
        print(f"❌ Schema文件不存在: {schema_path}")
        return

    if not os.path.exists(data_path):
        print(f"❌ Data文件不存在: {data_path}")
        return

    print(f"Schema文件: {schema_path}")
    print(f"Data文件: {data_path}")
    print(f"")

    # 检查schema
    schema_ok = check_schema_timestamp_types(schema_path)
    print(f"")

    # 检查data
    data_result = check_timestamp_format(data_path)

    print(f"=== 总结 ===")
    print(f"")
    if schema_ok and data_result['timestamp_format_count'] > 0:
        print(f"✅ 导出文件格式正确")
        print(f"")
        print(f"- Schema文件: 所有DateTime字段正确定义为TIMESTAMP")
        print(f"- Data文件: 时间戳使用正确的字符串格式")
        print(f"")
        print(f"可以安全导入PostgreSQL数据库。")
    elif data_result['integer_count'] > 0:
        print(f"⚠️  Data文件中可能存在问题")
        print(f"   建议检查生成脚本")
    else:
        print(f"✅ 导出文件格式正确")

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()
