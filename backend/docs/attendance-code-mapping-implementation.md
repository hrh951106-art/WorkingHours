# 出勤代码关联配置完整解决方案

## 📋 问题说明

当前系统中，工时模块（分摊模块）需要接收计算管理模块的工时数据，但两个模块使用不同的出勤代码体系：

- **计算管理模块**：使用 `CALCULATION` 类型的出勤代码（如 A01, A02, A03）
- **工时/分摊模块**：使用 `DEFINITION` 类型的出勤代码（如 NORMAL_WORK, PRODUCTION_WORK）

需要建立两个体系之间的映射关系。

---

## 🎯 解决方案概述

### 核心机制

通过 `AttendanceCode` 表的 `calcAttendanceCode` 字段建立映射：

```prisma
model AttendanceCode {
  category         String  // CALCULATION 或 DEFINITION
  calcAttendanceCode String? // 当category=DEFINITION时，映射的CALCULATION代码
}
```

### 数据流程

```
1. 计算管理：使用 A01 计算出 8 小时工时
2. 推送服务：查找 calcAttendanceCode='A01' 的 DEFINITION 代码
3. 找到映射：code='NORMAL_WORK', category='DEFINITION'
4. 存储数据：将工时存储为 NORMAL_WORK（DEFINITION类型）
5. 分摊使用：分摊计算读取 DEFINITION 类型的工时数据
```

---

## ✅ 当前状态

### 已完成

1. ✅ 数据库表结构：
   - `AttendanceCode` 表已有 `calcAttendanceCode` 字段
   - `WorkHourResult` 表使用 ID 关联

2. ✅ 推送服务：
   - `WorkHourPushService` 已实现映射逻辑
   - 接收服务 `WorkHourReceiverService` 已完成

3. ✅ 前端页面：
   - `AttendanceCodeDefinitionPage.tsx` 已存在
   - 但使用的是 `mappingCode` 字段（需要改为 `calcAttendanceCode`）

### 需要完善

1. 🔧 统一字段命名：
   - 前端使用 `mappingCode`
   - 后端schema使用 `calcAttendanceCode`
   - 需要统一为 `calcAttendanceCode`

2. 🔧 添加 category 支持：
   - 前端没有 `category` 字段选择
   - 需要添加分类选择功能

3. 🔧 创建初始数据：
   - 需要创建 DEFINITION 类型的示例出勤代码
   - 配置与 CALCULATION 代码的映射关系

---

## 🔧 实施步骤

### 步骤1：统一后端字段名

确认后端 DTO 和 API 使用正确的字段名：

```typescript
// attendance-code.dto.ts
export class CreateAttendanceCodeDto {
  code: string;
  name: string;
  category: string;  // ✅ 必需：CALCULATION 或 DEFINITION
  calcAttendanceCode?: string;  // ✅ 当 category='DEFINITION' 时使用
}
```

### 步骤2：修改前端页面

更新 `AttendanceCodeDefinitionPage.tsx`：

```typescript
// 1. 添加 category 字段
interface AttendanceCode {
  id: number;
  code: string;
  name: string;
  category: string;  // ✅ 新增
  calcAttendanceCode: string | null;  // ✅ 从 mappingCode 改名
  unit: string;
  showInDetailPage: boolean;
  calculateHours: boolean;
  color: string;
  status: string;
}

// 2. 表单中添加分类选择
<Form.Item
  label="分类"
  name="category"
  rules={[{ required: true, message: '请选择分类' }]}
  initialValue="DEFINITION"
  tooltip="DEFINITION-分摊模块使用，CALCULATION-计算模块使用"
>
  <Select
    placeholder="请选择分类"
    options={[
      { label: '出勤代码定义（分摊模块）', value: 'DEFINITION' },
      { label: '工时计算（计算模块）', value: 'CALCULATION' },
    ]}
  />
</Form.Item>

// 3. 修改映射字段名
<Form.Item
  label="映射的计算出勤代码"
  name="calcAttendanceCode"  // ✅ 从 mappingCode 改名
  tooltip="仅当分类为 DEFINITION 时有效，选择映射的CALCULATION类型出勤代码"
>
  <Select
    placeholder="请选择映射的计算代码"
    allowClear
    showSearch
    disabled={form.getFieldValue('category') !== 'DEFINITION'}
  >
    {calculationCodes?.map((code) => (
      <Select.Option key={code.id} value={code.code}>
        {code.name} ({code.code})
      </Select.Option>
    ))}
  </Select>
</Form.Item>
```

### 步骤3：创建初始示例数据

创建SQL脚本来初始化DEFINITION类型的出勤代码：

```sql
-- 创建 DEFINITION 类型的出勤代码
INSERT INTO AttendanceCode (
  code, name, category, calcAttendanceCode,
  type, unit, calculateHours, showInDetailPage,
  priority, color, status
) VALUES
-- 正常工时
('NORMAL_WORK', '正常工时', 'DEFINITION', 'A01',
 'LEAN_HOURS', 'HOURS', 1, 1,
 1, '#52c41a', 'ACTIVE'),

-- 生产工时
('PRODUCTION_WORK', '生产工时', 'DEFINITION', 'A02',
 'LEAN_HOURS', 'HOURS', 1, 1,
 2, '#1890ff', 'ACTIVE'),

-- 分摊工时
('ALLOCATION_WORK', '分摊工时', 'DEFINITION', 'A03',
 'LEAN_HOURS', 'HOURS', 1, 1,
 3, '#faad14', 'ACTIVE'),

-- 加班工时
('OVERTIME_WORK', '加班工时', 'DEFINITION', 'A04',
 'LEAN_HOURS', 'HOURS', 1, 1,
 4, '#f5222d', 'ACTIVE'),

-- 请假工时
('LEAVE_WORK', '请假工时', 'DEFINITION', 'A05',
 'LEAN_HOURS', 'HOURS', 0, 1,
 5, '#722ed1', 'ACTIVE');
```

### 步骤4：验证映射关系

```bash
# 查询所有映射关系
sqlite3 backend/prisma/dev.db << 'EOF'
.mode column
.headers on
SELECT
  def.code AS definition_code,
  def.name AS definition_name,
  def.calc_attendance_code AS calc_code,
  calc.name AS calc_name
FROM AttendanceCode def
LEFT JOIN AttendanceCode calc
  ON def.calc_attendance_code = calc.code
WHERE def.category = 'DEFINITION';
EOF
```

预期输出：

```
definition_code  definition_name    calc_code  calc_name
---------------  ------------------  ---------  ----------
NORMAL_WORK     正常工时             A01        正常工时
PRODUCTION_WORK 生产工时             A02        作业工时
ALLOCATION_WORK 分摊工时             A03        分摊工时
OVERTIME_WORK   加班工时             NULL       NULL
LEAVE_WORK      请假工时             NULL       NULL
```

---

## 📝 配置使用指南

### 场景1：创建新的分摊出勤代码

1. 访问 `/calculate/attendance-code-definition` 页面
2. 点击"新增"
3. 填写表单：
   - **分类**：选择"出勤代码定义（分摊模块）"
   - **编码**：如 `SPECIAL_WORK`
   - **名称**：如"特殊工时"
   - **映射的计算出勤代码**：选择对应的计算代码（如 `A06`）
   - 其他字段按需填写
4. 保存

### 场景2：修改映射关系

1. 找到已有的DEFINITION类型出勤代码
2. 点击"编辑"
3. 修改"映射的计算出勤代码"字段
4. 保存

### 场景3：查看当前映射关系

在页面列表中，应该显示：
- 编码
- 名称
- **分类**（新增列，显示 DEFINITION/CALCULATION）
- **映射代码**（显示映射的 calcAttendanceCode）
- 状态

---

## ⚠️ 重要提示

### 1. 字段命名统一

**必须确保前后端使用相同的字段名**：

| 层级 | 字段名 | 说明 |
|------|--------|------|
| Database | `calc_attendance_code` | SQLite列名 |
| Prisma | `calcAttendanceCode` | 驼峰命名 |
| API DTO | `calcAttendanceCode` | 传递给前端 |
| Frontend | `calcAttendanceCode` | 表单字段 |

### 2. category 字段约束

```typescript
// ✅ 正确
{
  category: 'DEFINITION',
  calcAttendanceCode: 'A01'  // 有效
}

{
  category: 'CALCULATION',
  calcAttendanceCode: null   // CALCULATION 不需要映射
}

// ❌ 错误
{
  category: 'DEFINITION',
  calcAttendanceCode: null   // DEFINITION 应该有映射
}

{
  category: 'CALCULATION',
  calcAttendanceCode: 'A01'  // CALCULATION 不应该有映射
}
```

### 3. 推送服务逻辑

```typescript
// WorkHourPushService 推送逻辑
const codeMapping = new Map<string, { id: number; code: string }>();

// 只映射 category='DEFINITION' 的代码
const definitionCodes = await prisma.attendanceCode.findMany({
  where: {
    category: 'DEFINITION',
    calcAttendanceCode: { not: null },
  },
});

definitionCodes.forEach((code) => {
  if (code.calcAttendanceCode) {
    codeMapping.set(code.calcAttendanceCode, {
      id: code.id,
      code: code.code
    });
  }
});
```

---

## 🎯 完整测试流程

### 1. 创建测试数据

```bash
# 使用API创建DEFINITION类型的出勤代码
curl -X POST http://localhost:3001/api/calculate/attendance-code-definitions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "NORMAL_WORK",
    "name": "正常工时",
    "category": "DEFINITION",
    "calcAttendanceCode": "A01",
    "type": "LEAN_HOURS",
    "unit": "HOURS",
    "calculateHours": true,
    "showInDetailPage": true,
    "color": "#52c41a",
    "status": "ACTIVE"
  }'
```

### 2. 验证映射查询

```bash
# 查询映射关系
curl -X GET "http://localhost:3001/api/calculate/attendance-code-definitions" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. 测试推送功能

```bash
# 触发工时推送
curl -X POST http://localhost:3001/api/calculate/work-hours/push \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-04-01",
    "endDate": "2026-04-30"
  }'
```

### 4. 验证存储结果

```bash
# 查询 WorkHourResult 表
curl -X GET "http://localhost:3001/api/allocation/work-hours?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN"
```

检查返回的数据中：
- `attendanceCode`: 应该是 'NORMAL_WORK'（DEFINITION类型）
- `calcAttendanceCode`: 应该是 'A01'（CALCULATION类型）

---

## 📊 数据一致性检查

### 定期检查脚本

```sql
-- 检查孤立的映射（DEFINITION代码映射的计算代码不存在）
SELECT
  def.code AS definition_code,
  def.calc_attendance_code AS mapped_calc_code
FROM AttendanceCode def
WHERE def.category = 'DEFINITION'
  AND def.calc_attendance_code IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM AttendanceCode calc
    WHERE calc.code = def.calc_attendance_code
      AND calc.category = 'CALCULATION'
  );

-- 检查未映射的DEFINITION代码
SELECT code, name
FROM AttendanceCode
WHERE category = 'DEFINITION'
  AND (calc_attendance_code IS NULL OR calc_attendance_code = '');
```

---

## 总结

通过以上配置，实现了：

1. ✅ **清晰的数据分类**：CALCULATION 和 DEFINITION
2. ✅ **灵活的映射机制**：通过 calcAttendanceCode 字段
3. ✅ **数据完整性**：数据库级别约束
4. ✅ **高性能查询**：基于ID的关联

关键点：
- **category** 字段区分代码类型
- **calcAttendanceCode** 字段建立映射关系
- **DEFINITION** 类型的代码才是分摊模块使用的
- **推送服务**自动处理映射转换
