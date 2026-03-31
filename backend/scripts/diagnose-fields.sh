#!/bin/bash
# ========================================
# 快速诊断：性别和年龄字段问题
# ========================================

cd /Users/aaron.he/Desktop/AI/JY/backend

echo "========================================"
echo "诊断：性别和年龄字段问题"
echo "========================================"
echo ""

echo "【1】检查数据库中是否包含gender和age字段"
echo "----------------------------------------"

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // 检查Employee表
    const employees = await prisma.employee.findMany({ take: 1 });
    if (employees.length > 0) {
      const emp = employees[0];
      console.log('Employee表字段示例：');
      console.log('  - gender:', emp.gender, '(类型:', typeof emp.gender, ')');
      console.log('  - age:', emp.age, '(类型:', typeof emp.age, ')');
    } else {
      console.log('数据库中没有员工记录');
    }

    // 检查人事信息页签配置
    const tabs = await prisma.employeeInfoTab.findMany({
      where: { code: 'basic_info' },
      include: {
        fields: true
      }
    });

    if (tabs.length > 0) {
      const tab = tabs[0];
      console.log('');
      console.log('基本信息页签配置：');
      console.log('  页签ID:', tab.id);
      console.log('  字段总数:', tab.fields.length);

      const genderField = tab.fields.find(f => f.fieldCode === 'gender');
      const ageField = tab.fields.find(f => f.fieldCode === 'age');

      console.log('');
      console.log('关键字段检查：');
      console.log('  gender字段:', genderField ? '✓ 存在' : '✗ 缺失');
      if (genderField) {
        console.log('    - 字段名称:', genderField.fieldName);
        console.log('    - 字段类型:', genderField.fieldType);
        console.log('    - 是否必填:', genderField.isRequired ? '是' : '否');
      }

      console.log('  age字段:', ageField ? '✓ 存在' : '✗ 缺失');
      if (ageField) {
        console.log('    - 字段名称:', ageField.fieldName);
        console.log('    - 字段类型:', ageField.fieldType);
        console.log('    - 是否必填:', ageField.isRequired ? '是' : '否');
      }

      // 查找相似字段
      if (!genderField || !ageField) {
        console.log('');
        console.log('可能的相关字段：');
        tab.fields.forEach(f => {
          if (f.fieldCode.toLowerCase().includes('gender') || f.fieldCode.toLowerCase().includes('age')) {
            console.log('  -', f.fieldCode, '(', f.fieldName, ')');
          }
        });
      }
    } else {
      console.log('未找到basic_info页签配置');
    }

    await prisma.\$disconnect();
  } catch (error) {
    console.error('查询出错:', error.message);
    await prisma.\$disconnect();
  }
})();
"

echo ""
echo ""
echo "【2】检查API接口返回的数据"
echo "----------------------------------------"

# 测试API接口
if curl -s http://localhost:3001/api/hr/employees?page=1&pageSize=1 > /dev/null 2>&1; then
    echo "测试API: GET /api/hr/employees?page=1&pageSize=1"
    echo ""
    curl -s http://localhost:3001/api/hr/employees?page=1&pageSize=1 | node -e "
      const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
      if (data.items && data.items.length > 0) {
        const emp = data.items[0];
        console.log('API返回的字段：');
        console.log('  - name:', emp.name);
        console.log('  - gender:', emp.gender, '(类型:', typeof emp.gender, ')');
        console.log('  - age:', emp.age, '(类型:', typeof emp.age, ')');
        console.log('');
        console.log('所有字段:', Object.keys(emp).join(', '));
      } else {
        console.log('API返回的数据为空');
      }
    "
else
    echo "⚠️  后端服务未启动，无法测试API"
    echo "   请先启动后端服务: npm run start:dev"
fi

echo ""
echo ""
echo "【3】常见问题排查建议"
echo "----------------------------------------"
echo ""
echo "问题1: 前端提示字段不存在"
echo "  原因: 人事信息页签配置中缺少字段"
echo "  解决: 运行 SQL 修复脚本添加缺失字段"
echo ""
echo "问题2: 字段代码大小写不匹配"
echo "  原因: 数据库中可能是 'Gender' 或 'GENDER'"
echo "  解决: 统一使用小写 'gender' 和 'age'"
echo ""
echo "问题3: 生产环境和开发环境数据不一致"
echo "  原因: 生产环境可能缺少种子数据"
echo "  解决: 在生产环境运行 init_production.sql"
echo ""
echo "========================================"
echo "诊断完成！"
echo "========================================"
echo ""
echo "如需修复，请运行："
echo "  psql -U username -d database_name -f scripts/fix-employee-fields.sql"
echo ""
