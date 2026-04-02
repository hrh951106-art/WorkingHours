# 员工信息系统字段修复 - 变更摘要

**版本：** 20260402
**发布日期：** 2026-04-02

---

## 🐛 Bug 修复

### 1. 修复隐藏字段导致员工创建失败
- **问题：** 性别字段隐藏后数据库仍要求必填
- **影响：** 无法创建新员工
- **修复：**
  - 数据库：`Employee.name` 和 `Employee.gender` 改为可选
  - 后端：跳过隐藏字段的验证逻辑
  - 只验证"启用 + 显示 + 必填"的字段

### 2. 修复民族和紧急联系人关系字段显示错误
- **问题：** 字段在编辑模式显示为文本输入框，而非下拉选择
- **影响：** 用户无法正确选择民族和紧急联系人关系
- **修复：**
  - 在 `EmployeeDetailPage.tsx` 的 `renderSystemField` 函数添加相应 case
  - 确保使用正确的数据源选项

### 3. 修复日期字段显示格式
- **问题：** 日期显示为 `2026-03-01T00:00:00.000Z`（ISO 格式）
- **影响：** 用户体验差，日期显示不直观
- **修复：**
  - 扩展日期字段识别，支持驼峰命名（entryDate, hireDate 等）
  - 统一格式化为 `YYYY-MM-DD`

---

## 🔧 技术改进

### 后端优化
- 优化员工创建验证逻辑，支持动态字段配置
- 系统字段带数据源时返回 `SELECT_SINGLE` 类型

### 前端优化
- 统一系统字段和自定义字段的渲染逻辑
- 优化日期格式化函数性能

---

## 📦 部署清单

### 数据库变更
```sql
-- Employee 表结构变更
ALTER TABLE Employee MODIFY COLUMN name TEXT;
ALTER TABLE Employee MODIFY COLUMN gender TEXT;

-- 更新数据源关联
UPDATE EmployeeInfoTabField SET dataSourceId = 19 WHERE fieldCode = 'emergencyRelation';
UPDATE EmployeeInfoTabField SET dataSourceId = 13 WHERE fieldCode = 'jobLevel';
UPDATE EmployeeInfoTabField SET dataSourceId = 15 WHERE fieldCode = 'status';
```

### 文件变更
```
backend/
├── prisma/schema.prisma                              [修改] Employee.name/gender 可选
├── src/modules/hr/hr.service.ts                      [修改] 跳过隐藏字段验证
├── src/modules/hr/dto/employee.dto.ts                [修改] name 可选
└── src/modules/hr/employee-info-tab.service.ts      [修改] 系统字段类型判断

frontend/
└── src/pages/hr/EmployeeDetailPage.tsx               [修改] 字段渲染和日期格式化
```

---

## ✅ 测试清单

- [ ] 创建员工（不填姓名和性别）→ 成功
- [ ] 编辑员工 → 民族字段显示下拉选择
- [ ] 编辑员工 → 紧急联系人关系字段显示下拉选择
- [ ] 查看员工详情 → 所有日期显示为 `YYYY-MM-DD` 格式
- [ ] 工号、入职日期、所属组织 → 必填验证正常

---

## 📄 相关文档

- [完整部署指南](./DEPLOYMENT_GUIDE_20260402.md)
- [数据库迁移脚本](./backend/scripts/update-employee-fields-20260402.sql)

---

**影响范围：** 员工管理模块
**风险评估：** 低
**停机时间：** 约1-2秒（数据库迁移）
**回滚难度：** 低（有完整回滚方案）
