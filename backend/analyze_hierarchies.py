#!/usr/bin/env python3
import json
import sqlite3

conn = sqlite3.connect('prisma/dev.db')
cursor = conn.cursor()

# 查询账户5的层级信息
cursor.execute("""
    SELECT id, code, path, namePath, hierarchyValues
    FROM LaborAccount
    WHERE id = 5
""")
row = cursor.fetchone()

if row:
    id, code, path, namePath, hv_json = row
    print(f"账户ID: {id}")
    print(f"账户编码: {code}")
    print(f"当前path: {path}")
    print(f"当前namePath: {namePath}")
    print("\n层级详情:")
    print("-" * 80)

    hierarchyValues = json.loads(hv_json)
    hierarchyValues.sort(key=lambda x: x['level'])

    codes = []
    names = []

    for hv in hierarchyValues:
        level = hv['level']
        name = hv['name']
        selected = hv.get('selectedValue')

        code = selected['code'] if selected else ''
        name_val = selected['name'] if selected else ''

        codes.append(code)
        names.append(name_val)

        print(f"Level {level}: {name:8s} - code: '{code:10s}' - name: '{name_val}' - selected: {bool(selected)}")

    print("\n" + "=" * 80)
    print(f"生成的path: {('/'.join(codes))}")
    print(f"生成的namePath: {('/'.join(names))}")

# 检查DeviceAccount的数据
print("\n\n" + "=" * 80)
print("DeviceAccount 当前数据:")
print("=" * 80)

cursor.execute("""
    SELECT id, path, namePath
    FROM DeviceAccount
    ORDER BY id
""")
for row in cursor.fetchall():
    id, path, namePath = row
    print(f"ID {id}: path='{path}', namePath='{namePath}'")

conn.close()
