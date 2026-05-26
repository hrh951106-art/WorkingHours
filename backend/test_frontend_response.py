#!/usr/bin/env python3
import json
import subprocess

# 获取token
result = subprocess.run([
    'curl', '-s', '-X', 'POST',
    'http://localhost:3001/api/auth/login',
    '-H', 'Content-Type: application/json',
    '-d', '{"username":"admin","password":"admin123"}'
], capture_output=True, text=True)

login_data = json.loads(result.stdout)
token = login_data['data']['access_token']

print("=" * 60)
print("分析前端请求处理流程")
print("=" * 60)

# 模拟前端请求
result = subprocess.run([
    'curl', '-s', '-X', 'GET',
    'http://localhost:3001/api/account/accounts?type=SUB&usageType=SHIFT&pageSize=5&sortBy=createdAt&sortOrder=desc',
    '-H', f'Authorization: Bearer {token}'
], capture_output=True, text=True)

print("\n1. 后端原始响应:")
print("-" * 60)
response = json.loads(result.stdout)
print(json.dumps(response, indent=2, ensure_ascii=False)[:500])

print("\n2. 前端响应拦截器处理后 (提取 data.data):")
print("-" * 60)
if response.get('success') and 'data' in response:
    processed_data = response['data']
    print(f"类型: {type(processed_data)}")
    print(f"包含字段: {list(processed_data.keys()) if isinstance(processed_data, dict) else 'N/A'}")

    if isinstance(processed_data, dict) and 'items' in processed_data:
        print(f"items 数量: {len(processed_data['items'])}")
        print(f"items 内容:")
        for item in processed_data['items']:
            print(f"  - {item['name']} (id={item['id']})")

    print("\n3. 前端 .then((res) => res.items || []) 处理后:")
    print("-" * 60)
    final_items = processed_data.get('items', []) if isinstance(processed_data, dict) else []
    print(f"最终数据: {final_items}")
    print(f"数据类型: {type(final_items)}")
    print(f"数组长度: {len(final_items)}")

else:
    print(f"错误: {response}")
