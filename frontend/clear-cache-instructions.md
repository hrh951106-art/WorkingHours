# 清除缓存并刷新数据

## 步骤1：清除浏览器缓存
1. 打开浏览器（Chrome/Edge/Safari）
2. 按 `Ctrl+Shift+Delete` (Windows/Linux) 或 `Cmd+Shift+Delete` (Mac)
3. 选择"缓存的图片和文件"
4. 点击"清除数据"

## 步骤2：清除React Query缓存
1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签
3. 执行以下命令：
```javascript
// 清除所有React Query缓存
localStorage.clear();
sessionStorage.clear();
location.reload();
```

## 步骤3：强制刷新页面
1. 按 `Ctrl+F5` (Windows/Linux) 或 `Cmd+Shift+R` (Mac)
2. 或者在地址栏输入：`http://localhost:5174` 并按回车

## 步骤4：验证数据
1. 打开产品配置页面
2. 应该看到：大桶、中桶、小桶
3. 打开工序配置页面
4. 应该看到：裁剪、缝制、熨烫、包装、质检、组装、焊接、喷涂

## 如果仍然显示旧数据

### 方法1：在浏览器Console手动获取API数据
```javascript
// 这个命令会清除缓存并重新获取数据
fetch('http://localhost:3001/api/hr/data-sources/25/options', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(res => res.json())
.then(data => {
  console.log('PRODUCT数据源选项（应该显示3个）：', data);
  console.log('数据内容：', data.map(item => item.label));
});

fetch('http://localhost:3001/api/hr/data-sources/26/options', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(res => res.json())
.then(data => {
  console.log('PROCESS数据源选项（应该显示8个）：', data);
  console.log('数据内容：', data.map(item => item.label));
});
```

### 方法2：使用debug页面
在浏览器中打开：
`http://localhost:5174/debug-datasource.html`

这个页面会直接调用API并显示原始数据，不受前端缓存影响。

## 查看后端日志
后端已添加调试日志，每次调用API时会显示：
- 数据源ID和代码
- DataSourceOption表中的数据数量
- 实际返回的数据标签

查看后端日志：
```bash
tail -f /tmp/backend-new.log | grep "getDataSourceOptions"
```
