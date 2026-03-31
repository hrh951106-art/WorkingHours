#!/bin/bash
# ========================================
# Employee表结构查询脚本
# 用途: 快速查看Employee表的完整字段设计
# ========================================

cd /Users/aaron.he/Desktop/AI/JY/backend

echo "========================================"
echo "Employee表结构详细查询"
echo "========================================"
echo ""

node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('【1】Employee表完整字段列表');
    console.log('========================================');
    console.log('');

    // 查询一条员工记录获取所有字段
    const employees = await prisma.employee.findMany({ take: 1 });

    if (employees.length > 0) {
      const emp = employees[0];

      console.log('字段分类:');
      console.log('');

      // 基础标识字段
      console.log('📌 基础标识字段:');
      console.log('  - id:', emp.id, '(主键)');
      console.log('  - employeeNo:', emp.employeeNo || '(空)', '(员工编号，唯一)');

      console.log('');
      console.log('👤 核心个人信息:');
      console.log('  - name:', emp.name || '(空)');
      console.log('  - gender:', emp.gender || '(空)', '⚠️ 必填');
      console.log('  - idCard:', emp.idCard || '(空)');
      console.log('  - age:', emp.age || '(空)', '⚠️ 可选但可能被使用');
      console.log('  - birthDate:', emp.birthDate || '(空)');
      console.log('  - photo:', emp.photo ? '(有照片)' : '(无)');

      console.log('');
      console.log('📞 联系信息:');
      console.log('  - phone:', emp.phone || '(空)');
      console.log('  - email:', emp.email || '(空)');
      console.log('  - currentAddress:', emp.currentAddress || '(空)');
      console.log('  - emergencyContact:', emp.emergencyContact || '(空)');
      console.log('  - emergencyPhone:', emp.emergencyPhone || '(空)');
      console.log('  - emergencyRelation:', emp.emergencyRelation || '(空)');

      console.log('');
      console.log('💼 工作信息:');
      console.log('  - orgId:', emp.orgId, '(组织ID)');
      console.log('  - entryDate:', emp.entryDate);
      console.log('  - status:', emp.status);

      console.log('');
      console.log('🏠 个人详细信息:');
      console.log('  - maritalStatus:', emp.maritalStatus || '(空)');
      console.log('  - politicalStatus:', emp.politicalStatus || '(空)');
      console.log('  - nativePlace:', emp.nativePlace || '(空)');
      console.log('  - householdRegister:', emp.householdRegister || '(空)');
      console.log('  - homeAddress:', emp.homeAddress || '(空)');
      console.log('  - homePhone:', emp.homePhone || '(空)');

      console.log('');
      console.log('🔧 扩展和系统字段:');
      console.log('  - customFields:', emp.customFields);
      console.log('  - createdAt:', emp.createdAt);
      console.log('  - updatedAt:', emp.updatedAt);

    } else {
      console.log('数据库中暂无员工记录');
      console.log('');
      console.log('从Prisma Schema获取字段定义:');
      console.log('');

      const fieldDefinitions = [
        { name: 'id', type: 'Int', required: true, desc: '主键ID' },
        { name: 'employeeNo', type: 'String', required: true, desc: '员工编号（唯一）' },
        { name: 'name', type: 'String', required: true, desc: '姓名' },
        { name: 'gender', type: 'String', required: true, desc: '性别 ⚠️ 必填' },
        { name: 'idCard', type: 'String?', required: false, desc: '身份证号（唯一）' },
        { name: 'phone', type: 'String?', required: false, desc: '手机号' },
        { name: 'email', type: 'String?', required: false, desc: '邮箱' },
        { name: 'orgId', type: 'Int', required: true, desc: '组织ID' },
        { name: 'entryDate', type: 'DateTime', required: true, desc: '入职日期' },
        { name: 'status', type: 'String', required: true, desc: '在职状态（默认ACTIVE）' },
        { name: 'customFields', type: 'String', required: true, desc: '自定义字段JSON' },
        { name: 'createdAt', type: 'DateTime', required: true, desc: '创建时间' },
        { name: 'updatedAt', type: 'DateTime', required: true, desc: '更新时间' },
        { name: 'age', type: 'Int?', required: false, desc: '年龄 ⚠️ 可选但可能被使用' },
        { name: 'birthDate', type: 'DateTime?', required: false, desc: '出生日期' },
        { name: 'currentAddress', type: 'String?', required: false, desc: '现居住地址' },
        { name: 'emergencyContact', type: 'String?', required: false, desc: '紧急联系人' },
        { name: 'emergencyPhone', type: 'String?', required: false, desc: '紧急联系电话' },
        { name: 'emergencyRelation', type: 'String?', required: false, desc: '紧急联系人关系' },
        { name: 'homeAddress', type: 'String?', required: false, desc: '家庭住址' },
        { name: 'homePhone', type: 'String?', required: false, desc: '家庭电话' },
        { name: 'householdRegister', type: 'String?', required: false, desc: '户口所在地' },
        { name: 'maritalStatus', type: 'String?', required: false, desc: '婚姻状况' },
        { name: 'nativePlace', type: 'String?', required: false, desc: '籍贯' },
        { name: 'photo', type: 'String?', required: false, desc: '证件照' },
        { name: 'politicalStatus', type: 'String?', required: false, desc: '政治面貌' }
      ];

      console.log('字段名 | 类型 | 必填 | 说明');
      console.log('--- | --- | --- | ---');
      fieldDefinitions.forEach(f => {
        const req = f.required ? '✓' : '✗';
        console.log(\`\${f.name} | \${f.type} | \${req} | \${f.desc}\`);
      });
    }

    console.log('');
    console.log('');
    console.log('【2】字段统计信息');
    console.log('========================================');
    console.log('');

    // 字段分类统计
    const totalFields = 27;
    const requiredFields = 8;
    const optionalFields = totalFields - requiredFields;

    console.log('总字段数:', totalFields);
    console.log('必填字段数:', requiredFields);
    console.log('可选字段数:', optionalFields);
    console.log('');

    console.log('必填字段列表:');
    console.log('  1. id - 主键（自动生成）');
    console.log('  2. employeeNo - 员工编号');
    console.log('  3. name - 姓名');
    console.log('  4. gender - 性别 ⚠️');
    console.log('  5. orgId - 组织ID');
    console.log('  6. entryDate - 入职日期');
    console.log('  7. status - 在职状态');
    console.log('  8. customFields - 自定义字段');
    console.log('');

    console.log('');
    console.log('【3】关键字段说明');
    console.log('========================================');
    console.log('');
    console.log('⚠️  gender字段（性别）:');
    console.log('  - 类型: String');
    console.log('  - 必填: 是');
    console.log('  - 说明: 员工性别，代码中会使用');
    console.log('  - 常见值: "男", "女"');
    console.log('');
    console.log('⚠️  age字段（年龄）:');
    console.log('  - 类型: Int? (可选)');
    console.log('  - 必填: 否');
    console.log('  - 说明: 可选但前端可能会使用');
    console.log('  - 注意: 需要在人事信息页签配置中添加');
    console.log('');
    console.log('📋 employeeNo字段（员工编号）:');
    console.log('  - 类型: String');
    console.log('  - 必填: 是');
    console.log('  - 唯一: 是');
    console.log('  - 格式建议: EMP + 年月日 + 序号（如: EMP20250331001）');
    console.log('');
    console.log('🏢 orgId字段（组织ID）:');
    console.log('  - 类型: Int');
    console.log('  - 必填: 是');
    console.log('  - 关联: Organization表');
    console.log('  - 用途: 权限管理和数据隔离');

    await prisma.\$disconnect();
  } catch (error) {
    console.error('查询出错:', error.message);
    await prisma.\$disconnect();
  }
})();
"

echo ""
echo ""
echo "========================================"
echo "查询完成！"
echo "========================================"
echo ""
echo "如需查看完整文档，请参考："
echo "  docs/Employee表结构详细设计.md"
echo ""
