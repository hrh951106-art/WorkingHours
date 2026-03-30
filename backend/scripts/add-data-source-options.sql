-- 添加所有数据源选项

PRAGMA foreign_keys = OFF;

-- 民族选项
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'han', '汉族', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'nation';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'hui', '回族', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'nation';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'manchu', '满族', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'nation';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'uygur', '维吾尔族', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'nation';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'mongol', '蒙古族', 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'nation';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'tibetan', '藏族', 6, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'nation';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'zhuang', '壮族', 7, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'nation';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'other', '其他', 99, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'nation';

-- 婚姻状况选项
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'unmarried', '未婚', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'marital_status';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'married', '已婚', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'marital_status';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'divorced', '离异', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'marital_status';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'widowed', '丧偶', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'marital_status';

-- 政治面貌选项
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'party_member', '党员', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'political_status';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'league_member', '团员', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'political_status';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'mass', '群众', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'political_status';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'democratic_party', '民主党派', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'political_status';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'none', '无党派人士', 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'political_status';

-- 职级选项
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'P1', 'P1', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'job_level';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'P2', 'P2', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'job_level';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'P3', 'P3', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'job_level';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'P4', 'P4', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'job_level';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'P5', 'P5', 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'job_level';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'M1', 'M1', 6, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'job_level';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'M2', 'M2', 7, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'job_level';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'M3', 'M3', 8, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'job_level';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'M4', 'M4', 9, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'job_level';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'M5', 'M5', 10, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'job_level';

-- 员工类型选项
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'formal', '正式员工', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'employee_type';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'probation', '试用期员工', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'employee_type';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'intern', '实习生', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'employee_type';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'labor_dispatch', '劳务派遣', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'employee_type';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'outsourcing', '外包人员', 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'employee_type';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'consultant', '顾问', 6, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'employee_type';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'part_time', '兼职', 7, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'employee_type';

-- 在职状态选项
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'active', '在职', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'employment_status';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'probation', '试用期', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'employment_status';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'resigned', '离职', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'employment_status';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'unpaid_leave', '停薪留职', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'employment_status';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'retired', '退休', 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'employment_status';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'terminated', '开除', 6, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'employment_status';

-- 离职原因选项
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'personal', '个人原因', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'resignation_reason';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'company', '公司原因', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'resignation_reason';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'retirement', '退休', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'resignation_reason';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'contract_expired', '合同到期', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'resignation_reason';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'probation_failed', '试用期不合格', 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'resignation_reason';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'misconduct', '严重违纪', 6, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'resignation_reason';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'mutual_agreement', '协商解除', 7, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'resignation_reason';

-- 学历层次选项
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'doctor', '博士研究生', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'education_level';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'master', '硕士研究生', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'education_level';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'bachelor', '本科', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'education_level';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'college', '专科', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'education_level';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'high_school', '高中', 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'education_level';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'middle_school', '初中', 6, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'education_level';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'primary_school', '小学', 7, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'education_level';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'other', '其他', 8, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'education_level';

-- 学历类型选项
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'full_time', '全日制', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'education_type';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'in_service', '在职', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'education_type';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'self_taught', '自考', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'education_type';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'correspondence', '函授', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'education_type';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'evening_university', '夜大', 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'education_type';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'tv_university', '电大', 6, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'education_type';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'online_education', '网教', 7, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'education_type';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'other', '其他', 8, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'education_type';

-- 家庭关系选项
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'spouse', '配偶', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'family_relation';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'father', '父亲', 2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'family_relation';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'mother', '母亲', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'family_relation';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'son', '儿子', 4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'family_relation';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'daughter', '女儿', 5, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'family_relation';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'brother', '兄弟', 6, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'family_relation';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'sister', '姐妹', 7, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'family_relation';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'grandfather', '祖父', 8, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'family_relation';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'grandmother', '祖母', 9, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'family_relation';
INSERT OR IGNORE INTO DataSourceOption (dataSourceId, value, label, sort, isActive, createdAt, updatedAt)
SELECT id, 'other', '其他', 99, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM DataSource WHERE code = 'family_relation';

PRAGMA foreign_keys = ON;

SELECT '数据源选项添加完成！' AS result;
SELECT COUNT(*) AS '总选项数' FROM DataSourceOption WHERE dataSourceId IN (SELECT id FROM DataSource WHERE code IN ('gender', 'nation', 'marital_status', 'political_status', 'job_level', 'employee_type', 'employment_status', 'resignation_reason', 'education_level', 'education_type', 'family_relation'));
