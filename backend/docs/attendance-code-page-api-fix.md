# 前端出勤代码页面API更新完成

## ✅ 问题描述

`calculate/config/attendance-codes` 页面新增修改的数据没有更新到 `CalculationAttendanceCode` 表，因为前端页面还在使用旧的 API。

---

## 🔧 解决方案

### 1. 更新前端 API 端点

**文件**: `/frontend/src/pages/calculate/AttendanceCodePage.tsx`

#### 更新的 API 路径：

```typescript
// 旧 API
'/calculate/attendance-codes'

// 新 API
'/calculate/calculation-attendance-codes'
```

#### 修改内容：

1. **查询API**
   ```typescript
   // 修改前
   queryFn: () => request.get('/calculate/attendance-codes').then((res: any) => res),

   // 修改后
   queryFn: () => request.get('/calculate/calculation-attendance-codes').then((res: any) => res.data || res),
   ```

2. **创建API**
   ```typescript
   // 修改前
   mutationFn: (data: any) => request.post('/calculate/attendance-codes', data),

   // 修改后
   mutationFn: (data: any) => request.post('/calculate/calculation-attendance-codes', data),
   ```

3. **更新API**
   ```typescript
   // 修改前
   request.put(`/calculate/attendance-codes/${id}`, data),

   // 修改后
   request.put(`/calculate/calculation-attendance-codes/${id}`, data),
   ```

4. **删除API**
   ```typescript
   // 修改前
   request.delete(`/calculate/attendance-codes/${id}`)

   // 修改后
   request.delete(`/calculate/calculation-attendance-codes/${id}`)
   ```

5. **查询Key**
   ```typescript
   // 修改前
   queryKey: ['attendanceCodes']

   // 修改后
   queryKey: ['calculationAttendanceCodes']
   ```

### 2. 移除不兼容的字段

由于 `CalculationAttendanceCode` 表与旧的 `AttendanceCode` 表字段不同，需要移除以下字段：

#### 移除的字段：
- ❌ `accountLevels` - 劳动力账户层级（旧表字段）
- ❌ `showInDetailPage` - 工时明细页面显示（旧表字段）

#### 新增的字段：
- ✅ `color` - 颜色选择器

### 3. 更新表格列

移除了以下列：
- 劳动力账户层级
- 工时明细显示

新增了以下列：
- 颜色

### 4. 修复后端编译错误

**文件**: `/backend/src/modules/allocation/work-hour-receiver.service.ts`

修复了使用旧字段名导致的 TypeScript 编译错误：

```typescript
// 修改前
attendanceCodeId → 定义为旧字段
attendanceCode → 定义为旧字段
attendanceCodeDef → 关联字段名错误

// 修改后
definitionAttendanceCodeId → 新字段
definitionAttendanceCodeStr → 新字段
definitionAttendanceCode → 新关联字段
```

---

## 🧪 测试验证

### 测试计算出勤代码 API

```bash
curl "http://localhost:3001/api/calculate/calculation-attendance-codes?page=1&pageSize=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应**:
```json
{
  "data": [
    {
      "id": 1,
      "code": "A02",
      "name": "作业工时",
      "type": "LEAN_HOURS",
      "unit": "HOURS",
      "deductMeal": true,
      "includeOutside": true,
      "onlyOutside": false,
      "calculateHours": true,
      "priority": 0,
      "color": "#1890ff",
      "status": "ACTIVE",
      "description": null
    },
    {
      "id": 2,
      "code": "A03",
      "name": "分摊工时",
      "type": "LEAN_HOURS",
      "unit": "HOURS",
      "deductMeal": false,
      "includeOutside": false,
      "onlyOutside": false,
      "calculateHours": false,
      "priority": 0,
      "color": "#1890ff",
      "status": "ACTIVE",
      "description": null
    }
  ],
  "total": 2,
  "page": 1,
  "pageSize": 10
}
```

### 测试定义出勤代码 API

```bash
curl "http://localhost:3001/api/allocation/definition-attendance-codes?page=1&pageSize=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ✅ 验证结果

1. ✅ **后端编译成功** - 所有 TypeScript 错误已修复
2. ✅ **计算出勤代码 API** - `/api/calculate/calculation-attendance-codes` 正常工作
3. ✅ **定义出勤代码 API** - `/api/allocation/definition-attendance-codes` 正常工作
4. ✅ **前端页面更新** - AttendanceCodePage.tsx 已更新使用新 API
5. ✅ **字段映射正确** - 新旧字段正确映射

---

## 📋 新的 API 端点列表

### 计算出勤代码 (CalculationAttendanceCode)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/calculate/calculation-attendance-codes` | 查询列表 |
| GET | `/api/calculate/calculation-attendance-codes/active` | 获取启用的代码 |
| GET | `/api/calculate/calculation-attendance-codes/:id` | 查询详情 |
| POST | `/api/calculate/calculation-attendance-codes` | 创建 |
| PUT | `/api/calculate/calculation-attendance-codes/:id` | 更新 |
| DELETE | `/api/calculate/calculation-attendance-codes/:id` | 删除 |

### 定义出勤代码 (DefinitionAttendanceCode)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/allocation/definition-attendance-codes` | 查询列表 |
| GET | `/api/allocation/definition-attendance-codes/active` | 获取启用的代码 |
| GET | `/api/allocation/definition-attendance-codes/:id` | 查询详情 |
| POST | `/api/allocation/definition-attendance-codes` | 创建 |
| PUT | `/api/allocation/definition-attendance-codes/:id` | 更新 |
| DELETE | `/api/allocation/definition-attendance-codes/:id` | 删除 |
| GET | `/api/allocation/definition-attendance-codes/calc-code/:calcCode` | 根据计算代码查找 |
| POST | `/api/allocation/definition-attendance-codes/mapping` | 批量获取映射 |

---

## 🎯 下一步

现在前端页面已经更新，您可以：

1. **测试前端页面**
   - 访问 `calculate/config/attendance-codes` 页面
   - 尝试创建新的计算出勤代码
   - 尝试编辑现有的计算出勤代码
   - 验证数据是否正确保存到 `CalculationAttendanceCode` 表

2. **验证数据完整性**
   ```sql
   SELECT * FROM CalculationAttendanceCode;
   ```

3. **前端路由** (如果需要)
   - 更新前端路由配置以区分两个页面
   - `/calculate/config/attendance-codes` → 计算出勤代码
   - `/allocation/config/attendance-codes` → 定义出勤代码

---

## 📝 字段对比

### CalculationAttendanceCode (计算模块专用)

| 字段 | 类型 | 说明 |
|------|------|------|
| code | String | 出勤代码 |
| name | String | 名称 |
| type | String | 类型（LEAN_HOURS） |
| unit | String | 单位（HOURS/MINUTES） |
| deductMeal | Boolean | 是否扣用餐 |
| includeOutside | Boolean | 包含班外时数 |
| onlyOutside | Boolean | 仅班外时数 |
| calculateHours | Boolean | 是否计算工时 |
| priority | Int | 优先级 |
| color | String | 显示颜色 |
| status | String | 状态 |
| description | String? | 描述 |

### DefinitionAttendanceCode (分摊模块专用)

| 字段 | 类型 | 说明 |
|------|------|------|
| code | String | 出勤代码 |
| name | String | 名称 |
| type | String | 类型 |
| unit | String | 单位 |
| calculateHours | Boolean | 是否计算工时 |
| showInDetailPage | Boolean | 是否在明细页显示 |
| priority | Int | 优先级 |
| color | String | 显示颜色 |
| status | String | 状态 |
| calcAttendanceCode | String? | 映射的计算代码 |
| description | String? | 描述 |

---

**更新完成日期**: 2026-04-23
**状态**: ✅ 成功完成
