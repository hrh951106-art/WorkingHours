import json

with open('/tmp/test-line-shifts.json') as f:
    data = json.load(f)['data']
    print('✅ 接口返回数据:')
    print(f'总记录数: {data["total"]}')
    print()
    for item in data['items']:
        print(f'ID={item["id"]}: {item["orgName"]} - {item["shiftName"]}')
        print(f'  accountId: {item.get("accountId")}')
        print(f'  accountName: {item.get("accountName")}')
        print(f'  lineAccountId: {item.get("lineAccountId")}')
        print(f'  lineAccountName: {item.get("lineAccountName")}')
        print()
