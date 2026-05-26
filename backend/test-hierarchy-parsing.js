// 测试层级编码解析
const hierarchyValues = [
  {"levelId":4,"level":1,"name":"工厂","mappingType":"ORG","mappingValue":"COMPANY","selectedValue":{"id":4,"name":"大华工厂","code":"DH","type":"COMPANY"}},
  {"levelId":5,"level":2,"name":"车间","mappingType":"ORG","mappingValue":"DEPARTMENT","selectedValue":{"id":5,"name":"W1总装车间","code":"DH01","type":"DEPARTMENT"}},
  {"levelId":6,"level":3,"name":"产线","mappingType":"ORG","mappingValue":"TEAM","selectedValue":{"id":6,"name":"W1总装L1产线","code":"DH0101","type":"TEAM"}},
  {"levelId":7,"level":4,"name":"产品","mappingType":"FIELD_A01","mappingValue":null,"selectedValue":null},
  {"levelId":8,"level":5,"name":"工序","mappingType":"FIELD_A02","mappingValue":null,"selectedValue":{"id":64,"name":"喷漆","code":"A02"}}
];

console.log('测试层级编码解析:');
console.log('输入 hierarchyValues:', JSON.stringify(hierarchyValues, null, 2));

const codes = [];
hierarchyValues
  .sort((a, b) => a.level - b.level)
  .forEach((hierarchy, index) => {
    const code = hierarchy.selectedValue?.code ?? '';
    console.log(`层级 ${index + 1}: ${hierarchy.name}`);
    console.log(`  selectedValue:`, JSON.stringify(hierarchy.selectedValue));
    console.log(`  code: "${code}"`);
    codes.push(code);
  });

const result = codes.join('/');
console.log('\n最终生成的层级编码:', result);
console.log('期望的层级编码:    DH/DH01/DH0101//A02');
console.log('是否匹配:', result === 'DH/DH01/DH0101//A02');
