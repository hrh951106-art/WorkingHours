# 生产环境部署信息

## 部署时间
2026-03-18 17:36

## 服务状态
✅ 所有服务已成功部署并运行

## 访问地址

### 前端
- **本地访问**: http://localhost:5174
- **网络访问**: http://10.43.22.57:5174

### 后端API
- **API地址**: http://localhost:3001
- **API文档**: http://localhost:3001/api-docs

## 服务进程

### 后端服务
- **PID文件**: `backend/backend-prod.pid`
- **日志文件**: `logs/backend-prod.log`
- **启动命令**:
```bash
cd backend
export DATABASE_URL="file:./prod.db"
export NODE_ENV=production
node dist/main
```

### 前端服务
- **PID文件**: `frontend/frontend-prod.pid`
- **日志文件**: `logs/frontend-prod.log`
- **启动命令**:
```bash
cd frontend
npx vite preview --host 0.0.0.0 --port 5174
```

## 数据库信息

### 生产数据库
- **文件位置**: `backend/prod.db`
- **数据库类型**: SQLite
- **初始化状态**: ✅ 已完成

### 种子数据
- ✅ 数据源（组织类型、学历、工作状态）
- ✅ 角色（系统管理员、HR管理员）
- ✅ 用户（admin、hr_admin）
- ✅ 组织（集团总部、技术部、人力资源部）
- ✅ 员工（张三、李四）
- ✅ 班次（正常班）
- ✅ 设备（前台考勤机）

## 默认账户

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| admin | admin123 | 系统管理员 | 拥有所有权限 |
| hr_admin | hr123 | HR管理员 | 人事管理权限 |

⚠️ **生产环境请立即修改这些密码！**

## API验证

### 已验证的API
- ✅ 用户登录 (`POST /api/auth/login`)
- ✅ 获取数据源列表 (`GET /api/hr/data-sources`)
- ✅ 获取组织列表 (`GET /api/hr/organizations`)

### 可用的API模块
- Auth（认证）
- HR（人事管理）
- Account（劳动力账户）
- Punch（打卡管理）
- Shift（排班管理）
- Calculate（计算管理）
- Attendance（考勤管理）
- System（系统管理）
- Allocation（工时分摊）

## 环境配置

### 后端环境变量
```env
NODE_ENV=production
PORT=3001
DATABASE_URL="file:./prod.db"
JWT_SECRET="jy-production-jwt-secret-key-2024-change-me-min-32-chars-long"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:5173"
LOG_LEVEL="info"
```

## 文件结构

### 构建产物
- **后端**: `backend/dist/`
- **前端**: `frontend/dist/`

### 日志文件
- **后端日志**: `logs/backend-prod.log`
- **前端日志**: `logs/frontend-prod.log`

## 停止服务

### 停止所有服务
```bash
# 方式一：使用停止脚本
./stop-services.sh

# 方式二：手动停止
kill $(cat backend/backend-prod.pid)
kill $(cat frontend/frontend-prod.pid)
```

### 仅停止后端
```bash
kill $(cat backend/backend-prod.pid)
```

### 仅停止前端
```bash
kill $(cat frontend/frontend-prod.pid)
```

## 重新启动

### 启动后端
```bash
cd backend
export DATABASE_URL="file:./prod.db"
export NODE_ENV=production
nohup node dist/main > ../logs/backend-prod.log 2>&1 &
echo $! > backend-prod.pid
```

### 启动前端
```bash
cd frontend
npx vite preview --host 0.0.0.0 --port 5174 > ../logs/frontend-prod.log 2>&1 &
echo $! > frontend-prod.pid
```

## 备份建议

### 数据库备份
```bash
# 备份数据库
cp backend/prod.db backups/prod.db.$(date +%Y%m%d_%H%M%S)

# 定期备份（crontab）
0 2 * * * cp /path/to/backend/prod.db /path/to/backups/prod.db.$(date +\%Y\%m\%d)
```

## 监控建议

### 检查服务状态
```bash
# 检查进程
ps aux | grep "node dist/main"
ps aux | grep "vite preview"

# 检查端口
lsof -i :3001  # 后端
lsof -i :5174  # 前端

# 查看日志
tail -f logs/backend-prod.log
tail -f logs/frontend-prod.log
```

## 性能优化建议

### 后端优化
1. 使用PM2管理进程
2. 配置Nginx反向代理
3. 启用Gzip压缩
4. 使用PostgreSQL替代SQLite

### 前端优化
1. 配置CDN加速
2. 启用HTTP/2
3. 配置浏览器缓存策略
4. 使用Nginx托管静态文件

## 安全建议

1. ✅ 修改默认密码
2. ⚠️ 配置防火墙规则
3. ⚠️ 使用HTTPS（生产环境必须）
4. ⚠️ 定期更新依赖包
5. ⚠️ 配置日志轮转
6. ⚠️ 设置数据库备份策略

## 故障排查

### 服务无法启动
1. 检查端口占用：`lsof -i :3001` 或 `lsof -i :5174`
2. 查看错误日志：`tail -50 logs/backend-prod.log`
3. 检查环境变量：`cat backend/.env`

### API请求失败
1. 确认后端服务运行：`curl http://localhost:3001/api/auth/health`
2. 检查CORS配置
3. 查看后端日志

### 数据库问题
1. 检查数据库文件是否存在：`ls -la backend/prod.db`
2. 验证数据库权限
3. 检查数据库连接配置

## 更新部署

### 更新后端
```bash
cd backend
git pull
npm install
npm run build
kill $(cat backend-prod.pid)
# 重新启动服务
```

### 更新前端
```bash
cd frontend
git pull
npm install
npm run build
kill $(cat frontend-prod.pid)
# 重新启动服务
```

## 联系方式

如有问题，请联系技术支持团队。

---
**文档版本**: 1.0.0  
**最后更新**: 2026-03-18 17:36
