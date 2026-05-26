# 请在浏览器控制台执行以下命令

## 1. 打开开发者工具
按 F12 或右键点击页面选择"检查"

## 2. 在 Console 控制台中执行以下命令：

```javascript
// 获取token
const token = localStorage.getItem('token');
console.log('Token:', token);

// 获取用户信息
const user = localStorage.getItem('user');
console.log('User:', user ? JSON.parse(user) : null);

// 测试获取数据源
fetch('http://localhost:3001/api/hr/data-sources', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => res.json())
.then(data => {
  console.log('数据源列表:', data);

  // 查找PRODUCT和PROCESS数据源
  const productDS = data.find(ds => ds.code === 'PRODUCT');
  const processDS = data.find(ds => ds.code === 'PROCESS');

  console.log('PRODUCT数据源:', productDS);
  console.log('PROCESS数据源:', processDS);

  // 获取PRODUCT选项
  if (productDS) {
    return fetch(`http://localhost:3001/api/hr/data-sources/${productDS.id}/options`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
})
.then(res => res.json())
.then(productOptions => {
  console.log('PRODUCT数据源选项:', productOptions);
  return fetch('http://localhost:3001/api/hr/data-sources/26/options', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
})
.then(res => res.json())
.then(processOptions => {
  console.log('PROCESS数据源选项:', processOptions);
})
.catch(err => {
  console.error('错误:', err);
});
```

## 3. 复制上面的代码并粘贴到控制台执行
## 4. 查看控制台输出的结果
