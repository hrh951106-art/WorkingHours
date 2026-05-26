// 使用实际账户数据测试
const accounts = [
  {
    id: 7,
    namePath: "大华工厂/W1总装车间/W1总装L2产线//",
    hierarchyValues: [
      {levelId: 4, level: 1, name: "工厂", mappingType: "ORG", mappingValue: "COMPANY", selectedValue: {id: 4, name: "大华工厂", code: "DH", type: "COMPANY"}},
      {levelId: 5, level: 2, name: "车间", mappingType: "ORG", mappingValue: "DEPARTMENT", selectedValue: {id: 5, name: "W1总装车间", code: "DH01", type: "DEPARTMENT"}},
      {levelId: 6, level: 3, name: "产线", mappingType: "ORG", mappingValue: "TEAM", selectedValue: {id: 7, name: "W1总装L2产线", code: "DH01002", type: "TEAM"}},
      {levelId: 7, level: 4, name: "产品", mappingType: "FIELD_A01", mappingValue: null, selectedValue: null},
      {levelId: 8, level: 5, name: "工序", mappingType: "FIELD_A02", mappingValue: null, selectedValue: null}
    ]
  },
  {
    id: 27,
    namePath: "大华工厂/W1总装车间/W1总装L2产线//喷漆",
    hierarchyValues: [] // 空数组
  }
];

const codes = [
  {name: "线体工时", accountLevels: [0,1,2]},
  {name: "工序工时", accountLevels: [0,1,2,4]}
];

function isAccountMatch(account, accountLevels) {
  const hierarchyValues = account.hierarchyValues || [];

  console.log(`  账户${account.id} hierarchyValues长度: ${hierarchyValues.length}`);

  if (hierarchyValues.length === 0) {
    console.log(`  账户${account.id} hierarchyValues为空，无法匹配`);
    return false;
  }

  // 检查配置的每个层级是否都有值
  for (const sortValue of accountLevels) {
    const level = sortValue + 1;
    const levelConfig = hierarchyValues.find(hv => hv.level === level);

    if (!levelConfig) {
      console.log(`  账户${account.id} 找不到level=${level}的配置`);
      return false;
    }

    if (!levelConfig.selectedValue) {
      console.log(`  账户${account.id} level=${level}(${levelConfig.name})的selectedValue为空`);
      return false;
    }

    console.log(`  账户${account.id} level=${level}(${levelConfig.name})有值: ${levelConfig.selectedValue.name || levelConfig.selectedValue.code}`);
  }

  // 找出账户的组织层级（连续的ORG类型层级）
  let accountOrgLevel = 0;
  for (const hv of hierarchyValues) {
    if (hv.mappingType !== 'ORG' && hv.mappingType !== 'ORG_TYPE') {
      continue;
    }
    if (hv.selectedValue) {
      accountOrgLevel = hv.level;
    } else {
      break;
    }
  }

  const configOrgLevels = accountLevels.map(s => s + 1).filter(l => l <= 3);
  const maxConfigOrgLevel = configOrgLevels.length > 0 ? Math.max(...configOrgLevels) : 0;

  console.log(`  账户${account.id} accountOrgLevel=${accountOrgLevel}, maxConfigOrgLevel=${maxConfigOrgLevel}`);

  if (maxConfigOrgLevel > 0 && accountOrgLevel !== maxConfigOrgLevel) {
    console.log(`  账户${account.id} 组织层级不匹配`);
    return false;
  }

  return true;
}

console.log("=== 测试结果 ===\n");

accounts.forEach(account => {
  console.log(`\n账户 ${account.id}: ${account.namePath}`);
  codes.forEach(code => {
    console.log(`\n匹配 ${code.name} [${code.accountLevels}]:`);
    const result = isAccountMatch(account, code.accountLevels);
    console.log(`  结果: ${result ? '✓ 匹配' : '✗ 不匹配'}`);
  });
});
