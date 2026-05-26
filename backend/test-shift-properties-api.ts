import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const shiftId = 1; // 使用第一个班次
  const API_BASE = 'http://localhost:3001';
  const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtcGxveWVlTm8iOiJhZG1pbiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NzI2ODAwNDIsImV4cCI6MTc3Mjc2NjQ0Mn0.HuqrrufQ2Q_ca-QWZg-k_lHehW_Fto9hRT0nFlUT_mo';

  console.log('=== 测试班次属性API ===\n');

  // 1. 查询当前属性
  console.log('1. 查询班次属性:');
  const getResponse = await fetch(`${API_BASE}/shift/shifts/${shiftId}/properties`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
    },
  });

  if (getResponse.ok) {
    const properties = await getResponse.json();
    console.log(`  当前属性: ${JSON.stringify(properties, null, 2)}`);
  } else {
    console.log(`  查询失败: ${getResponse.status}`);
  }

  // 2. 保存属性
  console.log('\n2. 保存班次属性:');
  const saveResponse = await fetch(`${API_BASE}/shift/shifts/${shiftId}/properties`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
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
    console.log(`  保存成功: ${JSON.stringify(result, null, 2)}`);
  } else {
    console.log(`  保存失败: ${saveResponse.status}`);
    const error = await saveResponse.text();
    console.log(`  错误信息: ${error}`);
  }

  // 3. 再次查询验证
  console.log('\n3. 再次查询验证:');
  await new Promise(resolve => setTimeout(resolve, 500)); // 等待一下

  const verifyResponse = await fetch(`${API_BASE}/shift/shifts/${shiftId}/properties`, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
    },
  });

  if (verifyResponse.ok) {
    const properties = await verifyResponse.json();
    console.log(`  保存后属性: ${JSON.stringify(properties, null, 2)}`);
  } else {
    console.log(`  查询失败: ${verifyResponse.status}`);
  }

  // 4. 直接查询数据库验证
  console.log('\n4. 直接查询数据库:');
  const dbProperties = await prisma.shiftProperty.findMany({
    where: { shiftId },
  });

  console.log(`  数据库中的属性: ${dbProperties.length} 条`);
  dbProperties.forEach((prop) => {
    console.log(`    - ${prop.propertyKey}: ${prop.propertyValue}`);
  });
}

main()
  .then(() => console.log('\n测试完成'))
  .catch((e) => console.error('错误:', e))
  .finally(() => prisma.$disconnect());
