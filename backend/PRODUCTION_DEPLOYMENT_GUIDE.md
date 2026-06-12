# 生产环境部署指南

## 更新时间
2025-06-12

## 部署检查结果

### ✅ 所有检查通过

1. **TypeScript编译** ✅ 通过
   - 无编译错误
   - 构建成功（dist目录大小：3.9M）

2. **PostgreSQL兼容性** ✅ 通过
   - 代码逻辑与数据库无关
   - 无SQLite特定SQL语法
   - 标准SQL查询，兼容PostgreSQL

3. **Prisma迁移** ✅ 无需迁移
   - 本次修改不涉及schema变更
   - 无需数据库迁移
   - 不影响已有数据

4. **生产构建** ✅ 成功
   - `npm run build` 成功
   - 构建产物已生成

## 本次修改内容

### 1. A02按产量分配优化
**文件：** `src/modules/allocation/allocation.service.ts:2853-2952`

**修改内容：**
- 使用`allocationScopeId`配置动态提取层级
- 不再硬编码提取第2层（车间），而是根据配置的层级（工厂/车间/产线）动态提取

**影响：**
- ✅ 纯逻辑修改
- ✅ 无schema变更
- ✅ A02现在会分配到配置的分摊范围内的所有产线

### 2. A03按产线平均分配优化
**文件：** `src/modules/allocation/allocation.service.ts:3711-3906`

**修改内容：**
- 使用开线计划表（LineShift）筛选参与分摊的产线
- 只对当天开线且`participateInAllocation=1`的产线进行均分
- 添加`shiftLines`和`lineToAccountPath`参数
- 创建AllocationResult记录

**影响：**
- ✅ 纯逻辑修改
- ✅ 无schema变更
- ✅ A03现在只对有开线计划的产线进行均分

### 3. 隐藏"按实际工时系数比例"选项
**文件：** `frontend/src/pages/allocation/AllocationConfigPage.tsx:1450`

**修改内容：**
- 注释掉`ACTUAL_HOURS_COEFFICIENT`选项

**影响：**
- ✅ 纯UI修改
- ✅ 后端逻辑保留，不影响已有数据

## 部署步骤

### 后端部署

```bash
# 1. 备份生产环境代码
git checkout -b backup-before-deploy-$(date +%Y%m%d)
git push origin backup-before-deploy-$(date +%Y%m%d)

# 2. 拉取最新代码
git fetch origin
git checkout main
git pull origin main

# 3. 安装依赖
npm ci

# 4. 构建生产版本
npm run build

# 5. 生成Prisma客户端（使用生产数据库配置）
DATABASE_URL="postgresql://user:password@host:port/database" npx prisma generate

# 6. 重启应用
pm2 restart jy-backend

# 7. 验证部署
curl http://your-production-server/api/health
```

### 前端部署

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装依赖
npm ci

# 3. 构建生产版本
npm run build

# 4. 部署静态文件
# 将 dist 目录部署到服务器
```

## 验证步骤

### 1. 验证A02按产量分配

**期望：** A02分配到工厂（DH）下的所有有开线计划的产线

### 2. 验证A03按产线平均分配

**期望：** A03只对有开线计划的产线进行均分

### 3. 验证UI选项隐藏

**期望：** "按实际工时系数比例"选项不显示

## 数据库兼容性

✅ 本次修改不涉及schema变更
✅ 无需数据迁移
✅ 不影响已有数据

**注意：** Prisma会自动处理PostgreSQL和SQLite的差异

## 回滚方案

```bash
# 后端回滚
git checkout HEAD~1
npm run build
pm2 restart jy-backend

# 前端回滚
git checkout HEAD~1
npm run build
```

## 部署检查清单

- [ ] 代码已备份
- [ ] 生产构建成功
- [ ] Prisma客户端已生成
- [ ] 环境变量已配置
- [ ] 应用已重启
- [ ] API健康检查通过
- [ ] A02分摊功能验证通过
- [ ] A03分摊功能验证通过
- [ ] UI选项隐藏验证通过
