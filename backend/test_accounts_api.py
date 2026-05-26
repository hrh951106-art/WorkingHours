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
print(f"Token: {token[:50]}...")
print()

# 测试1: 获取所有账户
print("=" * 60)
print("测试1: 获取所有账户（AmountPolicyPage中使用）")
print("=" * 60)
result = subprocess.run([
    'curl', '-s', '-X', 'GET',
    'http://localhost:3001/api/account/accounts?pageSize=1000',
    '-H', f'Authorization: Bearer {token}'
], capture_output=True, text=True)

data = json.loads(result.stdout)
items = data.get('data', {}).get('items', [])
print(f"总账户数: {len(items)}")

shift_accounts = [a for a in items if a.get('usageType') == 'SHIFT']
print(f"SHIFT类型账户数: {len(shift_accounts)}")
print("SHIFT账户列表（前5个）:")
for acc in shift_accounts[:5]:
    print(f"  - {acc['name']} (id={acc['id']}, type={acc['type']}, usageType={acc.get('usageType')})")

print()

# 测试2: 获取SHIFT类型的子账户
print("=" * 60)
print("测试2: 获取SHIFT类型的子账户（AccountSelect中使用）")
print("=" * 60)
result = subprocess.run([
    'curl', '-s', '-X', 'GET',
    'http://localhost:3001/api/account/accounts?type=SUB&usageType=SHIFT&pageSize=5&sortBy=createdAt&sortOrder=desc',
    '-H', f'Authorization: Bearer {token}'
], capture_output=True, text=True)

data = json.loads(result.stdout)
items = data.get('data', {}).get('items', [])
print(f"账户数: {len(items)}")
print("账户列表:")
for acc in items:
    print(f"  - {acc['name']} (id={acc['id']}, type={acc['type']}, usageType={acc.get('usageType')})")
