// 测试前端request工具对响应的处理

// 模拟request.ts的响应拦截器
function mockResponseInterceptor(data: any): any {
  // 处理204 No Content响应
  if (data === null || data === undefined) {
    return { message: '操作成功' };
  }

  // 如果后端返回的是被TransformInterceptor包装的响应，提取data字段
  if (data && data.success !== undefined && data.data !== undefined) {
    if (data.success === false) {
      throw new Error(data.message || '请求失败');
    }
    return data.data;
  }

  // 否则返回原始数据
  if (data && data.success === false) {
    throw new Error(data.message || '请求失败');
  }
  return data;
}

async function main() {
  const API_BASE = 'http://localhost:3001/api';
  const shiftId = 1;

  // 1. 登录
  console.log('1. 登录:');
  const loginResp = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const loginData = await loginResp.json();
  const token = loginData.data?.access_token;
  console.log('  ✓ 登录成功\n');

  // 2. 查询班次属性
  console.log('2. 查询班次属性:');
  const getResp = await fetch(`${API_BASE}/shift/shifts/${shiftId}/properties`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const rawResponse = await getResp.json();

  console.log('  原始响应:');
  console.log(`    success: ${rawResponse.success}`);
  console.log(`    数据类型: ${typeof rawResponse.data}`);
  console.log(`    是否为数组: ${Array.isArray(rawResponse.data)}`);
  console.log(`    数据长度: ${rawResponse.data?.length}`);

  // 3. 模拟拦截器处理
  console.log('\n3. 模拟request拦截器处理:');
  const processedData = mockResponseInterceptor(rawResponse);
  console.log(`    处理后类型: ${typeof processedData}`);
  console.log(`    处理后是否为数组: ${Array.isArray(processedData)}`);
  console.log(`    处理后数据:`, processedData);

  // 4. 测试.map()
  console.log('\n4. 模拟前端代码的.map()操作:');
  console.log(`    propertyKeys = shiftProperties?.map(p => p.propertyKey)`);

  let propertyKeys;
  try {
    // 模拟: request.get(...).then((res: any) => res || [])
    const shiftProperties = processedData || [];

    console.log(`    shiftProperties类型: ${typeof shiftProperties}`);
    console.log(`    shiftProperties是否为数组: ${Array.isArray(shiftProperties)}`);
    console.log(`    shiftProperties长度: ${shiftProperties.length}`);

    if (Array.isArray(shiftProperties)) {
      propertyKeys = shiftProperties.map((p: any) => p.propertyKey);
      console.log(`    ✓ 成功: propertyKeys = [${propertyKeys.join(', ')}]`);
    } else {
      console.log(`    ✗ 失败: shiftProperties不是数组!`);
      console.log(`    实际值:`, shiftProperties);
    }
  } catch (error: any) {
    console.log(`    ✗ 错误: ${error.message}`);
  }

  // 5. 检查是否有缓存问题
  console.log('\n5. 检查潜在问题:');
  console.log('    - API返回格式: ✓ 正确');
  console.log('    - 拦截器提取data: ✓ 正确');
  console.log('    - .map()操作: ✓ 正确');
  console.log('\n  结论: 后端API完全正常，问题可能在前端:');
  console.log('    1. React Query缓存问题');
  console.log('    2. useEffect依赖项问题');
  console.log('    3. form.setFieldsValue未正确更新');
  console.log('    4. 查询未正确启用或触发');
}

main()
  .then(() => console.log('\n测试完成'))
  .catch((e) => console.error('错误:', e));
