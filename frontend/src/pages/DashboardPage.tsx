import { Row, Col, Collapse } from 'antd';
import {
  UserOutlined,
  ApartmentOutlined,
  FileTextOutlined,
  CalendarOutlined,
  SettingOutlined,
  CalculatorOutlined,
  BarChartOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  SmileOutlined,
  PlusSquareOutlined,
  FormOutlined,
  HistoryOutlined,
  BranchesOutlined,
  DatabaseOutlined,
  TableOutlined,
  LineChartOutlined,
  PieChartOutlined,
  DashboardOutlined,
  AccountBookOutlined,
  ClockCircleOutlined,
  SolutionOutlined,
  CheckSquareOutlined,
  AuditOutlined,
  CustomerServiceOutlined,
  FileSearchOutlined,
  FileAddOutlined,
  FundProjectionScreenOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTabsStore } from '@/stores/tabsStore';
import { useAuthStore } from '@/stores/authStore';

interface QuickAction {
  title: string;
  icon: React.ReactNode;
  color: string;
  path: string;
  description: string;
}

interface Category {
  title: string;
  icon: React.ReactNode;
  color: string;
  items: QuickAction[];
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { addTab } = useTabsStore();
  const { user } = useAuthStore();

  // 定义应用分类
  const categories: Category[] = [
    {
      title: '人力资源',
      icon: <UserOutlined />,
      color: '#1890ff',
      items: [
        {
          title: '组织管理',
          icon: <ApartmentOutlined />,
          color: '#1890ff',
          path: '/hr/organizations',
          description: '管理组织架构',
        },
        {
          title: '人员管理',
          icon: <SolutionOutlined />,
          color: '#52c41a',
          path: '/hr/employees',
          description: '管理员工信息',
        },
      ],
    },
    {
      title: '打卡管理',
      icon: <FileTextOutlined />,
      color: '#fa8c16',
      items: [
        {
          title: '打卡记录',
          icon: <FileTextOutlined />,
          color: '#fa8c16',
          path: '/punch/records',
          description: '查看打卡数据',
        },
        {
          title: '考勤卡',
          icon: <DashboardOutlined />,
          color: '#9254de',
          path: '/attendance/attendance-card',
          description: '查看员工排班与打卡记录',
        },
      ],
    },
    {
      title: '排班管理',
      icon: <CalendarOutlined />,
      color: '#13c2c2',
      items: [
        {
          title: '排班管理',
          icon: <CalendarOutlined />,
          color: '#13c2c2',
          path: '/shift/schedules',
          description: '管理排班计划',
        },
      ],
    },
    {
      title: '考勤管理',
      icon: <ClockCircleOutlined />,
      color: '#722ed1',
      items: [
        {
          title: '工时明细管理',
          icon: <BarChartOutlined />,
          color: '#722ed1',
          path: '/attendance/workhour-details',
          description: '查看工时明细',
        },
      ],
    },
    {
      title: '分摊管理',
      icon: <AccountBookOutlined />,
      color: '#00B365',
      items: [
        {
          title: '产量记录',
          icon: <TeamOutlined />,
          color: '#faad14',
          path: '/allocation/new-production-records',
          description: '记录产量数据',
        },
        {
          title: '分摊规则',
          icon: <SettingOutlined />,
          color: '#00B365',
          path: '/allocation/config',
          description: '配置分摊规则',
        },
        {
          title: '分摊结果查询',
          icon: <SearchOutlined />,
          color: '#2f54eb',
          path: '/allocation/results',
          description: '查询分摊结果',
        },
        {
          title: '开线维护',
          icon: <CheckCircleOutlined />,
          color: '#eb2f96',
          path: '/allocation/line-maintenance',
          description: '维护开线计划',
        },
        {
          title: '分摊计算',
          icon: <CalculatorOutlined />,
          color: '#f5222d',
          path: '/allocation/calculate',
          description: '执行分摊计算',
        },
      ],
    },
    {
      title: '账户管理',
      icon: <AccountBookOutlined />,
      color: '#1890ff',
      items: [
        {
          title: '账户管理',
          icon: <AccountBookOutlined />,
          color: '#1890ff',
          path: '/account/accounts',
          description: '管理劳动力账户',
        },
        {
          title: '层级配置',
          icon: <BranchesOutlined />,
          color: '#13c2c2',
          path: '/account/hierarchy-levels',
          description: '配置账户层级',
        },
      ],
    },
    {
      title: '系统设置',
      icon: <SettingOutlined />,
      color: '#595959',
      items: [
        {
          title: '系统设置',
          icon: <SettingOutlined />,
          color: '#595959',
          path: '/system/settings',
          description: '系统参数配置',
        },
        {
          title: '菜单管理',
          icon: <FundProjectionScreenOutlined />,
          color: '#1890ff',
          path: '/system/menus',
          description: '管理菜单配置',
        },
        {
          title: '角色权限',
          icon: <AuditOutlined />,
          color: '#722ed1',
          path: '/system/roles',
          description: '管理角色和权限',
        },
      ],
    },
    {
      title: '流程审批',
      icon: <CheckSquareOutlined />,
      color: '#52c41a',
      items: [
        {
          title: '审批流程',
          icon: <CheckSquareOutlined />,
          color: '#52c41a',
          path: '/approval/workflows',
          description: '配置审批流程',
        },
        {
          title: '我的申请',
          icon: <FormOutlined />,
          color: '#1890ff',
          path: '/approval/my-requests',
          description: '查看我的申请',
        },
      ],
    },
    {
      title: '工作流管理',
      icon: <BranchesOutlined />,
      color: '#fa8c16',
      items: [
        {
          title: '工作流管理',
          icon: <BranchesOutlined />,
          color: '#fa8c16',
          path: '/workflow/definitions',
          description: '管理工作流定义',
        },
      ],
    },
    {
      title: '服务台',
      icon: <CustomerServiceOutlined />,
      color: '#eb2f96',
      items: [
        {
          title: '服务台',
          icon: <CustomerServiceOutlined />,
          color: '#eb2f96',
          path: '/support/requests',
          description: '提交和查看服务请求',
        },
      ],
    },
    {
      title: '报表中心',
      icon: <PieChartOutlined />,
      color: '#722ed1',
      items: [
        {
          title: '数据源管理',
          icon: <DatabaseOutlined />,
          color: '#722ed1',
          path: '/bi-report/datasource',
          description: '管理数据库表',
        },
        {
          title: '数据模型',
          icon: <TableOutlined />,
          color: '#13c2c2',
          path: '/bi-report/models',
          description: '创建数据模型',
        },
        {
          title: '报表管理',
          icon: <PieChartOutlined />,
          color: '#1890ff',
          path: '/bi-report/reports',
          description: '创建BI报表',
        },
      ],
    },
    {
      title: '工时报表',
      icon: <BarChartOutlined />,
      color: '#faad14',
      items: [
        {
          title: '工时报表',
          icon: <FileSearchOutlined />,
          color: '#faad14',
          path: '/labor-hour-report/reports',
          description: '查看工时统计报表',
        },
      ],
    },
    {
      title: '表单申请',
      icon: <FileAddOutlined />,
      color: '#f5222d',
      items: [
        {
          title: '员工创建',
          icon: <UserOutlined />,
          color: '#52c41a',
          path: '/hr/employee-create',
          description: '创建新员工',
        },
        {
          title: '请假申请',
          icon: <FileAddOutlined />,
          color: '#1890ff',
          path: '/approval/leave-request',
          description: '提交请假申请',
        },
        {
          title: '加班申请',
          icon: <ClockCircleOutlined />,
          color: '#fa8c16',
          path: '/approval/overtime-request',
          description: '提交加班申请',
        },
        {
          title: '补卡申请',
          icon: <FileTextOutlined />,
          color: '#722ed1',
          path: '/approval/punch-supplement',
          description: '提交补卡申请',
        },
        {
          title: '服务请求',
          icon: <CustomerServiceOutlined />,
          color: '#eb2f96',
          path: '/support/create',
          description: '提交服务请求',
        },
      ],
    },
  ];

  const handleNavigate = (path: string, title: string) => {
    addTab({
      key: path,
      label: title,
      path: path,
      closable: true,
    });
    navigate(path);
  };

  return (
    <div>
      {/* 欢迎语 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00B365 0%, #00994F 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
            }}
          >
            <SmileOutlined style={{ color: '#fff' }} />
          </div>
          <div>
            <div
              style={{
                color: 'var(--color-text-primary)',
                fontSize: 20,
                fontWeight: 500,
                marginBottom: 4,
              }}
            >
              {user?.name || '用户'}，欢迎来到盖雅智能工时管理系统
            </div>
            <div
              style={{
                color: 'var(--color-text-secondary)',
                fontSize: 14,
              }}
            >
              {user?.roles && user.roles.length > 0
                ? `当前角色：${user.roles.map((r) => r.name).join('、')}`
                : ''}
            </div>
          </div>
        </div>
      </div>

      {/* 功能模块入口 */}
      <h2
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 16,
        }}
      >
        常用功能
      </h2>

      <Collapse
        defaultActiveKey={['1', '2', '3', '4']}
        bordered={false}
        style={{
          background: 'transparent',
        }}
        items={categories.map((category, index) => ({
          key: String(index + 1),
          label: (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 18,
                  color: category.color,
                }}
              >
                {category.icon}
              </span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                }}
              >
                {category.title}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  marginLeft: 8,
                }}
              >
                ({category.items.length})
              </span>
            </div>
          ),
          children: (
            <Row gutter={[16, 16]}>
              {category.items.map((action) => (
                <Col xs={12} sm={8} md={6} lg={6} xl={4} key={action.path}>
                  <div
                    style={{
                      background: 'var(--color-bg-white)',
                      border: '1px solid var(--color-border-1)',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px 16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => handleNavigate(action.path, action.title)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-s2)';
                      e.currentTarget.style.borderColor = action.color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = 'var(--color-border-1)';
                    }}
                  >
                    <div
                      style={{
                        fontSize: 32,
                        color: action.color,
                        marginBottom: 12,
                      }}
                    >
                      {action.icon}
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        marginBottom: 4,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {action.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {action.description}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          ),
          style: {
            marginBottom: 16,
            background: 'var(--color-bg-white)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-1)',
          },
        }))}
      />
    </div>
  );
};

export default DashboardPage;
