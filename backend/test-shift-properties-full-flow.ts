// 完整测试：模拟前端保存并查询班次属性的流程

async function loginAndGetToken(API_BASE: string) {
  const loginResp = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const loginData = await loginResp.json();
  return loginData.data?.access_token;
}

async function main() {
  const API_BASE = 'http://localhost:3001/api';
  const shiftId = 1;

  console.log('=== 完整测试：班次属性保存与查询流程 ===\n');

  // 1. 登录
  const token = await loginAndGetToken(API_BASE);
  console.log('✓ 登录成功\n');

  // 2. 删除所有现有属性（模拟前端"不选择任何属性"的情况）
  console.log('步骤1: 删除所有属性（保存空数组）');
  const deleteResp = await fetch(`${API_BASE}/shift/shifts/${shiftId}/properties`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ properties: [] }),
  });

  if (deleteResp.ok) {
    console.log('  ✓ 删除成功');
  } else {
    console.log('  ✗ 删除失败:', await deleteResp.text());
  }

  // 3. 查询验证属性是否被删除
  console.log('\n步骤2: 查询验证（应该是空数组）');
  const query1 = await fetch(`${API_BASE}/shift/shifts/${shiftId}/properties`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data1 = await query1.json();
  const props1 = data1.data || data1;
  console.log(`  属性数量: ${props1.length}`);
  console.log(`  属性: ${JSON.stringify(props1)}`);

  // 4. 保存属性（模拟前端选择属性A01和A02）
  console.log('\n步骤3: 保存属性（A01, A02）');
  const saveResp = await fetch(`${API_BASE}/shift/shifts/${shiftId}/properties`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      properties: [
        { propertyKey: 'A01', propertyValue: '是', description: '生产早班' },
        { propertyKey: 'A02', propertyValue: '是', description: '生产晚班' },
      ],
    }),
  });

  if (saveResp.ok) {
    const saveResult = await saveResp.json();
    console.log('  ✓ 保存成功');
    console.log(`  返回数据类型: ${Array.isArray(saveResult.data) ? '数组' : typeof saveResult.data}`);
    console.log(`  返回数据长度: ${saveResult.data?.length || 0}`);

    // 检查返回的数据
    if (Array.isArray(saveResult.data)) {
      console.log('  返回的属性:');
      saveResult.data.forEach((p: any) => {
        console.log(`    - ${p.propertyKey}: ${p.propertyValue}`);
      });
    }
  } else {
    console.log('  ✗ 保存失败:', await saveResp.text());
  }

  // 5. 立即查询验证（模拟前端重新打开页面）
  console.log('\n步骤4: 立即查询验证（模拟重新打开页面）');
  await new Promise(resolve => setTimeout(resolve, 100)); // 等待100ms模拟网络延迟

  const query2 = await fetch(`${API_BASE}/shift/shifts/${shiftId}/properties`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data2 = await query2.json();
  const props2 = data2.data || data2;
  console.log(`  属性数量: ${props2.length}`);
  console.log(`  属性: ${JSON.stringify(props2, null, 2).split('\n').join('\n  ')}`);

  // 6. 模拟前端request拦截器处理
  console.log('\n步骤5: 模拟前端request拦截器');
  let processedData = data2;
  if (data2 && data2.success !== undefined && data2.data !== undefined) {
    processedData = data2.data;
  }

  console.log(`  处理后数据类型: ${typeof processedData}`);
  console.log(`  处理后是否为数组: ${Array.isArray(processedData)}`);
  console.log(`  处理后数据长度: ${processedData?.length || 0}`);

  // 7. 测试.map()操作
  console.log('\n步骤6: 测试前端.map()操作');
  try {
    const shiftProperties = processedData || [];
    const propertyKeys = shiftProperties.map((p: any) => p.propertyKey);
    console.log(`  ✓ 成功提取propertyKeys: [${propertyKeys.join(', ')}]`);
  } catch (error: any) {
    console.log(`  ✗ 失败: ${error.message}`);
  }

  // 8. 再次保存（模拟用户修改属性）
  console.log('\n步骤7: 再次保存（只保留A01）');
  const updateResp = await fetch(`${API_BASE}/shift/shifts/${shiftId}/properties`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      properties: [
        { propertyKey: 'A01', propertyValue: '是', description: '生产早班' },
      ],
    }),
  });

  if (updateResp.ok) {
    console.log('  ✓ 保存成功');
  } else {
    console.log('  ✗ 保存失败:', await updateResp.text());
  }

  // 9. 最终查询验证
  console.log('\n步骤8: 最终查询验证');
  const query3 = await fetch(`${API_BASE}/shift/shifts/${shiftId}/properties`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data3 = await query3.json();
  const props3 = data3.data || data3;
  console.log(`  属性数量: ${props3.length}`);
  console.log(`  属性: ${JSON.stringify(props3)}`);

  // 10. 总结
  console.log('\n=== 测试总结 ===');
  const finalProps = props3.map((p: any) => p.propertyKey);
  const expectedProps = ['A01'];

  if (finalProps.length === expectedProps.length &&
      finalProps.every((p: string) => expectedProps.includes(p))) {
    console.log('✅ 测试通过：属性保存和查询正常工作');
  } else {
    console.log('❌ 测试失败：属性保存或查询有问题');
    console.log(`   期望: [${expectedProps.join(', ')}]`);
    console.log(`   实际: [${finalProps.join(', ')}]`);
  }

  console.log('\n可能的前端问题:');
  console.log('1. React Query缓存了旧的空数组');
  console.log('2. invalidateQueries没有触发重新查询');
  console.log('3. 查询的enabled条件不满足');
  console.log('4. useEffect没有正确更新表单');
}

main()
  .then(() => console.log('\n测试完成'))
  .catch((e) => {
    console.error('错误:', e);
    console.error(e.stack);
  });
