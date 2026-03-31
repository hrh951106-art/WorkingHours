// 测试前端字段映射逻辑

function mapFieldName(code: string): string {
  // 如果已经是驼峰格式，直接返回
  if (!code.includes('_')) {
    return code;
  }

  const fieldMapping: Record<string, string> = {
    employee_no: 'employeeNo',
    marital_status: 'maritalStatus',
    political_status: 'politicalStatus',
    job_level: 'jobLevel',
    employee_type: 'employeeType',
    // ... 其他映射
  };
  return fieldMapping[code] || code;
}

// 测试用例
const testCases = [
  { fieldCode: 'maritalStatus', expected: 'maritalStatus', desc: '驼峰格式' },
  { fieldCode: 'marital_status', expected: 'maritalStatus', desc: '下划线格式' },
  { fieldCode: 'politicalStatus', expected: 'politicalStatus', desc: '驼峰格式' },
  { fieldCode: 'political_status', expected: 'politicalStatus', desc: '下划线格式' },
  { fieldCode: 'jobLevel', expected: 'jobLevel', desc: '驼峰格式' },
  { fieldCode: 'job_level', expected: 'jobLevel', desc: '下划线格式' },
];

console.log('测试 mapFieldName 函数:\n');
console.log('========================================');

testCases.forEach(test => {
  const result = mapFieldName(test.fieldCode);
  const passed = result === test.expected;
  const status = passed ? '✓' : '✗';
  console.log(`${status} ${test.desc}: ${test.fieldCode} -> ${result} (期望: ${test.expected})`);
});

// 测试数组包含检查
console.log('\n\n测试数组包含检查:\n');
console.log('========================================');

const basicInfoFields = [
  'employeeNo', 'employee_no', 'name', 'gender',
  'maritalStatus', 'marital_status',
  'politicalStatus', 'political_status'
];

const fieldCodesToTest = [
  'maritalStatus',
  'marital_status',
  'politicalStatus',
  'political_status',
  'gender',
  'unknownField'
];

fieldCodesToTest.forEach(fieldCode => {
  const included = basicInfoFields.includes(fieldCode);
  const status = included ? '✓' : '✗';
  console.log(`${status} basicInfoFields.includes('${fieldCode}'): ${included}`);
});
