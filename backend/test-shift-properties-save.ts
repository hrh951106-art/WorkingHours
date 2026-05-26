import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const shiftId = 1;
  const API_BASE = 'http://localhost:3001/api';

  // 1. 登录获取token
  console.log('1. 登录获取token:');
  const loginResponse = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123',
    }),
  });

  if (!loginResponse.ok) {
    console.log('  登录失败');
    return;
  }

  const loginData = await loginResponse.json();
  console.log(`  Login response structure: ${JSON.stringify(loginData, null, 2)}`);

  // Check response structure - the data is nested under "data"
  const token = loginData.data?.access_token;
  if (!token) {
    console.log('  无法获取token');
    return;
  }
  console.log('  登录成功');

  // 2. 查询当前属性
  console.log('\n2. 查询班次属性:');
  const getResponse = await fetch(`${API_BASE}/shift/shifts/${shiftId}/properties`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (getResponse.ok) {
    const properties = await getResponse.json();
    console.log(`  当前属性数量: ${properties.length}`);
    console.log(`  当前属性: ${JSON.stringify(properties, null, 2)}`);
  } else {
    console.log(`  查询失败: ${getResponse.status} ${getResponse.statusText}`);
    const error = await getResponse.text();
    console.log(`  错误信息: ${error}`);
  }

  // 3. 保存属性
  console.log('\n3. 保存班次属性:');
  const saveResponse = await fetch(`${API_BASE}/shift/shifts/${shiftId}/properties`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      properties: [
        {
          propertyKey: 'A01',
          propertyValue: '是',
          description: '生产早班',
        },
        {
          propertyKey: 'A02',
          propertyValue: '是',
          description: '生产晚班',
        },
      ],
    }),
  });

  if (saveResponse.ok) {
    const result = await saveResponse.json();
    console.log(`  保存成功!`);
    console.log(`  返回数据: ${JSON.stringify(result, null, 2)}`);
  } else {
    console.log(`  保存失败: ${saveResponse.status} ${saveResponse.statusText}`);
    const error = await saveResponse.text();
    console.log(`  错误信息: ${error}`);
  }

  // 4. 再次查询验证
  console.log('\n4. 再次查询验证:');
  await new Promise(resolve => setTimeout(resolve, 500));

  const verifyResponse = await fetch(`${API_BASE}/shift/shifts/${shiftId}/properties`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (verifyResponse.ok) {
    const properties = await verifyResponse.json();
    console.log(`  保存后属性数量: ${properties.length}`);
    console.log(`  保存后属性: ${JSON.stringify(properties, null, 2)}`);
  } else {
    console.log(`  查询失败: ${verifyResponse.status}`);
  }

  // 5. 直接查询数据库验证
  console.log('\n5. 直接查询数据库验证:');
  const dbProperties = await prisma.shiftProperty.findMany({
    where: { shiftId },
  });

  console.log(`  数据库中的属性: ${dbProperties.length} 条`);
  if (dbProperties.length > 0) {
    dbProperties.forEach((prop) => {
      console.log(`    - ${prop.propertyKey}: ${prop.propertyValue} (${prop.description || '-'}) [ID: ${prop.id}]`);
    });
  } else {
    console.log('    (无)');
  }
}

main()
  .then(() => console.log('\n测试完成'))
  .catch((e) => {
    console.error('错误:', e);
    console.error(e.stack);
  })
  .finally(() => prisma.$disconnect());
