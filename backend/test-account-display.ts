// 测试账户路径显示逻辑

const namePath = "大华工厂/W1总装车间/W1总装L1产线//";

console.log("原始namePath:", namePath);
console.log("层级数量:", namePath.split('/').filter(p => p !== '').length);

// 当前的前端处理逻辑
const cleaned = namePath.replace(/\/+/g, '/').replace(/\/$/, '');
console.log("当前前端显示:", cleaned);
console.log("处理后层级:", cleaned.split('/').filter(p => p !== '').length);

// 问题：replace(/\/$/, '') 删除了结尾的斜杠
// 实际上 "大华工厂/W1总装车间/W1总装L1产线//" 表示5个层级
// 但处理后只剩下3个层级了

// 正确的处理方式应该是：只替换连续的斜杠，但保留层级结构
const correctCleaned = namePath.replace(/\/+/g, '/');
console.log("\n正确的处理:", correctCleaned);
console.log("层级数量:", correctCleaned.split('/').length);
