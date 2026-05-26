#!/usr/bin/env python3
"""
修复 LaborAccount 和 DeviceAccount 表中缺少空层级占位符的 path 字段
"""
import json
import sqlite3

def fix_path_from_hierarchy(hierarchy_values_json):
    """根据 hierarchyValues 生成正确的 path"""
    try:
        hierarchy_values = json.loads(hierarchy_values_json)
        hierarchy_values.sort(key=lambda x: x['level'])

        codes = []
        for hv in hierarchy_values:
            selected = hv.get('selectedValue')
            code = selected['code'] if selected else ''
            codes.append(code)

        return '/'.join(codes)
    except:
        return None

def main():
    conn = sqlite3.connect('prisma/dev.db')
    cursor = conn.cursor()

    print("=" * 80)
    print("修复 LaborAccount 表的 path 字段")
    print("=" * 80)

    # 查询所有有问题的 LaborAccount
    cursor.execute("""
        SELECT id, code, path, hierarchyValues
        FROM LaborAccount
        WHERE hierarchyValues IS NOT NULL AND hierarchyValues != '{}'
    """)

    labor_updates = []
    for row in cursor.fetchall():
        id, code, current_path, hv_json = row
        correct_path = fix_path_from_hierarchy(hv_json)

        if correct_path and correct_path != current_path:
            print(f"账户 {id} ({code}):")
            print(f"  当前path: {current_path}")
            print(f"  正确path: {correct_path}")
            labor_updates.append((correct_path, id))
            print()

    # 更新 LaborAccount
    if labor_updates:
        print(f"准备更新 {len(labor_updates)} 条 LaborAccount 记录...")
        cursor.executemany(
            "UPDATE LaborAccount SET path = ? WHERE id = ?",
            labor_updates
        )
        print(f"✅ 已更新 {cursor.rowcount} 条记录")
    else:
        print("没有需要更新的 LaborAccount 记录")

    print("\n" + "=" * 80)
    print("修复 DeviceAccount 表的 path 字段")
    print("=" * 80)

    # 查询所有 DeviceAccount，通过关联的 LaborAccount 的 hierarchyValues 来修复
    cursor.execute("""
        SELECT da.id, da.path, da.accountId, la.hierarchyValues
        FROM DeviceAccount da
        LEFT JOIN LaborAccount la ON da.accountId = la.id
        WHERE la.hierarchyValues IS NOT NULL AND la.hierarchyValues != '{}'
    """)

    device_updates = []
    for row in cursor.fetchall():
        id, current_path, account_id, hv_json = row
        correct_path = fix_path_from_hierarchy(hv_json)

        if correct_path and correct_path != current_path:
            print(f"DeviceAccount {id} (accountId={account_id}):")
            print(f"  当前path: {current_path}")
            print(f"  正确path: {correct_path}")
            device_updates.append((correct_path, id))
            print()

    # 更新 DeviceAccount
    if device_updates:
        print(f"准备更新 {len(device_updates)} 条 DeviceAccount 记录...")
        cursor.executemany(
            "UPDATE DeviceAccount SET path = ? WHERE id = ?",
            device_updates
        )
        print(f"✅ 已更新 {cursor.rowcount} 条记录")
    else:
        print("没有需要更新的 DeviceAccount 记录")

    conn.commit()

    # 验证修复结果
    print("\n" + "=" * 80)
    print("验证修复结果")
    print("=" * 80)

    cursor.execute("SELECT id, path, namePath FROM DeviceAccount ORDER BY id")
    print("\nDeviceAccount 数据:")
    for row in cursor.fetchall():
        id, path, namePath = row
        print(f"  ID {id}: path='{path}', namePath='{namePath}'")

    conn.close()
    print("\n✅ 修复完成！")

if __name__ == '__main__':
    main()
