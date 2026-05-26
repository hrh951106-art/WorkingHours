# WorkHourResult 数据查询工具使用说明

## 概述
本工具用于查询 WorkHourResult 表的详细数据，包括每一笔记录的出勤代码、时数、日期、金额等信息。

## 文件说明

### 1. query-workhour-result-details.ts
简单的查询脚本，显示所有数据的基本信息和统计。

### 2. query-workhour-result-detailed.ts
功能完整的查询脚本，支持多种过滤条件和详细统计分析。

## 使用方法

### 基本查询（查询所有数据）
```bash
cd backend
npx tsx query-workhour-result-detailed.ts
```

### 按员工编号过滤
```bash
npx tsx query-workhour-result-detailed.ts --employee 202604003
```

### 按日期范围过滤
```bash
npx tsx query-workhour-result-detailed.ts --start 2026-05-12 --end 2026-05-14
```

### 按出勤代码过滤
```bash
npx tsx query-workhour-result-detailed.ts --code A02_LINE
```

### 组合过滤条��
```bash
npx tsx query-workhour-result-detailed.ts --employee 202604003 --start 2026-05-12 --end 2026-05-14 --code AC_001
```

### 限制返回记录数
```bash
npx tsx query-workhour-result-detailed.ts --limit 10
```

## 命令行参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| `--employee` | 员工编号 | `--employee 202604003` |
| `--start` | 开始日期（YYYY-MM-DD） | `--start 2026-05-01` |
| `--end` | 结束日期（YYYY-MM-DD） | `--end 2026-05-31` |
| `--code` | 出勤代码 | `--code A02_LINE` |
| `--limit` | 返回记录数限制 | `--limit 50` |

## 查询结果说明

### 详细记录
每条记录包含以下字段：
- **ID**: 记录ID
- **员工编号**: 员工工号
- **员工ID**: 员工内部ID
- **日期**: 计算日期
- **班次**: 班次名称（如：一段班、8小时两段班、正常班等）
- **开始时间**: 工作开始时间
- **结束时间**: 工作结束时间
- **出勤代码**: 出勤代码（如：A02_LINE、A04_WORKSHOP、AC_001等）
- **工时**: 工作小时数
- **金额**: 计算金额
- **账户**: 劳动力账户路径

### 统计分析
查询结果包含以下统计信息：

1. **总计信息**
   - 总计工时
   - 总计金额

2. **按出勤代码统计**
   - 记录数
   - 总工时
   - 总金额
   - 平均工时

3. **按员工统计**
   - 每个员工的记录数
   - 总工时
   - 总金额
   - 平均工时

4. **按班次统计**
   - 每个班次的记录数
   - 总工时
   - 总金额
   - 平均工时

5. **按日期统计**
   - 每天的记录数
   - 总工时
   - 总金额
   - 平均工时

6. **按账户统计**
   - 每个账户的记录数
   - 总工时
   - 总金额

## 出勤代码说明

根据当前数据，系统中存在以下出勤代码：

| 出勤代码 | 说明 | 平均工时 |
|---------|------|---------|
| A02_LINE | 产线工时 | 2.49小时 |
| A04_WORKSHOP | 车间工时 | 4.38小时 |
| AC_001 | 加班/其他工时 | 4.67小时 |

## 数据示例

### 示例1：查询员工 202604003 在 5月12日的所有工时记录
```bash
npx tsx query-workhour-result-detailed.ts --employee 202604003 --start 2026-05-12 --end 2026-05-12
```

### 示例2：查询所有 AC_001 出勤代码的记录
```bash
npx tsx query-workhour-result-detailed.ts --code AC_001
```

### 示例3：查询 5月份所有数据，限制前100条
```bash
npx tsx query-workhour-result-detailed.ts --start 2026-05-01 --end 2026-05-31 --limit 100
```

## 当前数据概览

根据最新查询结果：
- **总记录数**: 19 条
- **总工时**: 67.92 小时
- **总金额**: 1268.40 元
- **员工数量**: 3 人
- **日期范围**: 2026-05-09 至 2026-05-14
- **出勤代码类型**: 3 种

## 注意事项

1. 日期格式必须为 `YYYY-MM-DD`
2. 员工编号必须存在于系统中
3. 出勤代码区分大小写
4. 如遇问题，请检查数据库连接是否正常
5. 建议使用限制参数（--limit）来控制返回记录数，避免数据量过大

## 技术支持

如有问题或需要添加新的查询功能，请联系开发团队。
