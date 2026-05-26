// 测试班次属性API响应格式
async function main() {
  const API_BASE = 'http://localhost:3001/api';
  const shiftId = 1;

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

  const loginData = await loginResponse.json();
  const token = loginData.data?.access_token;
  console.log('  登录成功\n');

  // 2. 测试班次属性API响应
  console.log('2. 查询班次属性API:');
  const getResponse = await fetch(`${API_BASE}/shift/shifts/${shiftId}/properties`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const responseData = await getResponse.json();
  console.log('  原始响应:');
  console.log('  ' + JSON.stringify(responseData, null, 2).split('\n').join('\n  '));

  // 3. 模拟request拦截器处理
  console.log('\n3. 模拟request拦截器处理:');
  let processedData = responseData;
  if (responseData && responseData.success !== undefined && responseData.data !== undefined) {
    console.log('  检测到包装格式，提取data字段');
    processedData = responseData.data;
  }
  console.log('  处理后的数据:');
  console.log('  ' + JSON.stringify(processedData, null, 2).split('\n').join('\n  '));

  // 4. 测试.map()
  console.log('\n4. 测试.map()操作:');
  console.log(`  processedData类型: ${Array.isArray(processedData) ? '数组' : typeof processedData}`);
  console.log(`  processedData长度: ${processedData?.length}`);

  if (Array.isArray(processedData)) {
    console.log('  是数组，可以.map():');
    const propertyKeys = processedData.map((p: any) => p.propertyKey);
    console.log(`  结果: ${JSON.stringify(propertyKeys)}`);
  } else {
    console.log('  不是数组，.map()会失败!');
  }

  // 5. 检查是否有其他shift也有properties
  console.log('\n5. 检查其他班次的属性:');

  for (let i = 2; i <= 3; i++) {
    const resp = await fetch(`${API_BASE}/shift/shifts/${i}/properties`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await resp.json();
    const props = data.data || data;
    console.log(`  班次 ${i}: ${props.length} 个属性`);
  }
}

main()
  .then(() => console.log('\n测试完成'))
  .catch((e) => console.error('错误:', e));
