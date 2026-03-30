# 员工信息多记录支持架构说明

## 已完成的工作

### 1. 数据库表结构

创建了4个新的子表来支持多条记录：

- **WorkInfoHistory** - 工作信息历史（支持时间轴）
  - 字段：生效日期、职位、职级、员工类型、组织、工作地点、办公地址、是否当前生效
  - 支持按生效日期查询历史版本

- **EmployeeEducation** - 学历信息
  - 字段：毕业院校、专业、学位、学历层次、入学日期、毕业日期、是否最高学历
  - 支持多条学历记录

- **EmployeeWorkExperience** - 工作经历
  - 字段：公司名称、职位、开始日期、结束日期、工作描述
  - 支持多条工作经历

- **EmployeeFamilyMember** - 家庭成员
  - 字段：关系、姓名、性别、身份证号、联系电话、工作单位、出生日期、是否紧急联系人
  - 支持多条家庭成员记录

### 2. 后端API接口

已在 `hr.controller.ts` 中添加完整的CRUD接口：

#### 工作信息历史
- GET `/api/hr/employees/:id/work-info-history` - 获取列表
- POST `/api/hr/employees/:id/work-info-history` - 创建记录
- PUT `/api/hr/work-info-history/:id` - 更新记录
- DELETE `/api/hr/work-info-history/:id` - 删除记录

#### 学历信息
- GET `/api/hr/employees/:id/educations` - 获取列表
- POST `/api/hr/employees/:id/educations` - 创建记录
- PUT `/api/hr/educations/:id` - 更新记录
- DELETE `/api/hr/educations/:id` - 删除记录

#### 工作经历
- GET `/api/hr/employees/:id/work-experiences` - 获取列表
- POST `/api/hr/employees/:id/work-experiences` - 创建记录
- PUT `/api/hr/work-experiences/:id` - 更新记录
- DELETE `/api/hr/work-experiences/:id` - 删除记录

#### 家庭成员
- GET `/api/hr/employees/:id/family-members` - 获取列表
- POST `/api/hr/employees/:id/family-members` - 创建记录
- PUT `/api/hr/family-members/:id` - 更新记录
- DELETE `/api/hr/family-members/:id` - 删除记录

### 3. 工作信息数据结构

修改了 `GET /api/hr/employees/:id/work-info/:version` 接口，返回结构化数据：

\`\`\`typescript
{
  // 基本信息（来自Employee表）
  id: number,
  employeeNo: string,
  name: string,
  gender: string,
  // ...
  
  // 当前工作信息（来自WorkInfoHistory表）
  currentWorkInfo: {
    id: number,
    effectiveDate: Date,
    position: string,
    jobLevel: string,
    employeeType: string,
    orgId: number,
    workLocation: string,
    workAddress: string,
    org: Organization  // 关联的组织信息
  },
  
  // 学历列表（来自EmployeeEducation表）
  educations: Array<{
    id: number,
    school: string,
    major: string,
    degree: string,
    // ...
  }>,
  
  // 工作经历列表（来自EmployeeWorkExperience表）
  workExperiences: Array<{
    id: number,
    company: string,
    position: string,
    startDate: Date,
    endDate: Date,
    // ...
  }>,
  
  // 家庭成员列表（来自EmployeeFamilyMember表）
  familyMembers: Array<{
    id: number,
    relationship: string,
    name: string,
    // ...
  }]
}
\`\`\`

## 前端使用说明

### 获取工作信息数据

\`\`\`typescript
// 获取当前工作信息（包含所有子表数据）
const { data: currentWorkInfo } = useQuery({
  queryKey: ['workInfo', id, 'current'],
  queryFn: () => request.get(`/hr/employees/${id}/work-info/current`),
});

// 访问数据
const basicInfo = {
  employeeNo: currentWorkInfo.employeeNo,
  name: currentWorkInfo.name,
  // ...
};

const currentPositionInfo = currentWorkInfo.currentWorkInfo;
const educations = currentWorkInfo.educations;
const workExperiences = currentWorkInfo.workExperiences;
const familyMembers = currentWorkInfo.familyMembers;
\`\`\`

### CRUD操作示例

\`\`\`typescript
// 创建学历
await request.post(`/hr/employees/${employeeId}/educations`, {
  school: '清华大学',
  major: '计算机科学',
  degree: '学士',
  educationLevel: '本科',
  startDate: '2015-09-01',
  endDate: '2019-06-30',
  isHighest: true
});

// 更新学历
await request.put(`/hr/educations/${educationId}`, {
  school: '北京大学',
  major: '软件工程',
  // ...
});

// 删除学历
await request.delete(`/hr/educations/${educationId}`);
\`\`\`

## 数据迁移

已创建迁移脚本 `scripts/migrate-employee-data.ts`，将现有员工数据从 `customFields` 迁移到新的子表中。

运行迁移：
\`\`\`bash
cd backend
npx ts-node scripts/migrate-employee-data.ts
\`\`\`

## 后续工作

前端需要修改 `EmployeeDetailPage.tsx`，根据页签类型从不同的数据源读取和显示数据：

1. **工作信息页签**：显示 `currentWorkInfo` 和历史版本列表
2. **学历页签**：显示 `educations` 列表，支持增删改
3. **工作经历页签**：显示 `workExperiences` 列表，支持增删改
4. **家庭信息页签**：显示 `familyMembers` 列表，支持增删改
