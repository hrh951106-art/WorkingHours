// 在浏览器Console中执行��代码来测试手动保存属性
// 请确保已登录并且有admin权限

async function testManualSave() {
  const shiftId = 3; // 测试班次ID=3
  const token = localStorage.getItem('token');

  console.log('🧪 手动测试保存班次属性...');
  console.log('token:', token ? '已登录' : '未登录');

  try {
    // 1. 查询当前属性
    console.log('\n1️⃣ 查询当前属性:');
    const getResp = await fetch(`http://localhost:3001/api/shift/shifts/${shiftId}/properties`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const currentData = await getResp.json();
    console.log('当前属性:', currentData);

    // 2. 保存属性
    console.log('\n2️⃣ 保存新属性 (A01):');
    const saveResp = await fetch(`http://localhost:3001/api/shift/shifts/${shiftId}/properties`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        properties: [
          { propertyKey: 'A01', propertyValue: '是' },
          { propertyKey: 'A02', propertyValue: '是' },
        ],
      }),
    });

    console.log('响应状态:', saveResp.status);
    const saveResult = await saveResp.json();
    console.log('保存结果:', saveResult);

    // 3. 再次查询验证
    console.log('\n3️⃣ 验证保存结果:');
    await new Promise(r => setTimeout(r, 500)); // 等待500ms
    const verifyResp = await fetch(`http://localhost:3001/api/shift/shifts/${shiftId}/properties`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const verifyData = await verifyResp.json();
    console.log('保存后的属性:', verifyData);

    if (verifyData.data && verifyData.data.length > 0) {
      console.log('✅ 测试成功！属性已保存');
    } else {
      console.log('❌ 测试失败！属性未保存');
    }

  } catch (error) {
    console.error('❌ 测试出错:', error);
  }
}

// 执行测试
testManualSave();
