#!/bin/bash
# ========================================
# API响应结构调试脚本
# ========================================

echo "========================================"
echo "检查API响应结构"
echo "========================================"
echo ""

# 调用API并格式化输出
echo "调用API: curl -s http://localhost:3001/api/hr/employee-info-tabs/for-display"
echo ""

curl -s http://localhost:3001/api/hr/employee-info-tabs/for-display | python3 -c "
import sys
import json

data = json.load(sys.stdin)

# 查找basic_info页签
for tab in data:
    if tab.get('code') == 'basic_info':
        print('========================================')
        print('基本信息页签结构分析')
        print('========================================')
        print()

        # 统计groups中的字段
        print('【分组中的字段】')
        total_fields = 0
        for idx, group in enumerate(tab.get('groups', [])):
            fields = group.get('fields', [])
            total_fields += len(fields)
            print(f'')
            print(f'分组 {idx + 1}: {group.get(\"name\")} ({group.get(\"code\")})')
            print(f'  字段数量: {len(fields)}')
            print(f'  字段列表:')
            for field in fields:
                field_code = field.get('fieldCode')
                field_name = field.get('fieldName')
                field_type = field.get('type')
                is_hidden = field.get('isHidden')
                hidden_mark = ' (隐藏)' if is_hidden else ''
                print(f'    - {field_code} ({field_name}) type={field_type}{hidden_mark}')

        print(f'')
        print(f'分组中的字段总数: {total_fields}')

        # 统计未分组的字段
        ungrouped_fields = tab.get('fields', [])
        print(f'')
        print(f'【未分组字段】')
        print(f'字段数量: {len(ungrouped_fields)}')
        for field in ungrouped_fields:
            print(f'  - {field.get(\"fieldCode\")} ({field.get(\"fieldName\")})')

        print(f'')
        print('========================================')
        print(f'总计: {total_fields + len(ungrouped_fields)} 个字段')
        print('========================================')

        # 检查特定字段
        print(f'')
        print('【检查特定字段是否存在】')
        target_fields = ['gender', 'nation', 'maritalStatus', 'politicalStatus', 'birthDate']
        found_fields = []

        for group in tab.get('groups', []):
            for field in group.get('fields', []):
                if field.get('fieldCode') in target_fields:
                    found_fields.append({
                        'code': field.get('fieldCode'),
                        'name': field.get('fieldName'),
                        'type': field.get('type'),
                        'group': group.get('name'),
                        'isHidden': field.get('isHidden')
                    })

        for field_code in target_fields:
            found = False
            for field in found_fields:
                if field['code'] == field_code:
                    status = '✅ 找到'
                    if field['isHidden']:
                        status = '⚠️  找到但隐藏'
                    print(f'{field_code:15} {status} 在分组: {field[\"group\"]} type={field[\"type\"]}')
                    found = True
                    break
            if not found:
                print(f'{field_code:15} ❌ 未找到')

        break
"
