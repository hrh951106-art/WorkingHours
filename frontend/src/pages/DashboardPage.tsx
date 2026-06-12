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
  TransactionOutlined,
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
      title: '考勤管理',
      icon: <ClockCircleOutlined />,
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
      title: '精益工时',
      icon: <AccountBookOutlined />,
      color: '#00B365',
      items: [
        {
          title: '工时管理',
          icon: <BarChartOutlined />,
          color: '#722ed1',
          path: '/attendance/workhour-details',
          description: '查看工时明细',
        },
        {
          title: '产量记录',
          icon: <TeamOutlined />,
          color: '#faad14',
          path: '/allocation/new-production-records',
          description: '记录产量数据',
        },
        // 分配规则已移动到系统配置下
        // {
        //   title: '分配规则',
        //   icon: <SettingOutlined />,
        //   color: '#00B365',
        //   path: '/system/work-hour-management/allocation-config',
        //   description: '配置分摊规则',
        // },
        {
          title: '分摊结果查询',
          icon: <SearchOutlined />,
          color: '#2f54eb',
          path: '/allocation/results',
          description: '查询分摊结果',
        },
        {
          title: '挣得报表',
          icon: <FundProjectionScreenOutlined />,
          color: '#52c41a',
          path: '/allocation/earned-hours-report',
          description: '实时计算挣得工时',
        },
        {
          title: '开线维护',
          icon: <CheckCircleOutlined />,
          color: '#eb2f96',
          path: '/allocation/line-maintenance',
          description: '维护开线计划',
        },
        // 分配计算入口已隐藏 - 使用规则列表中的计算按钮
        // {
        //   title: '分配计算',
        //   icon: <CalculatorOutlined />,
        //   color: '#f5222d',
        //   path: '/allocation/calculate',
        //   description: '执行分摊计算',
        // },
      ],
    },
    {
      title: '申请与审批',
      icon: <CheckSquareOutlined />,
      color: '#52c41a',
      items: [
        {
          title: '支援申请',
          icon: <CustomerServiceOutlined />,
          color: '#eb2f96',
          path: '/support/create',
          description: '提交支援申请',
        },
        {
          title: '工时报工',
          icon: <FileSearchOutlined />,
          color: '#faad14',
          path: '/labor-hour-report/create',
          description: '提交工时报工',
        },
        {
          title: '流程管理',
          icon: <TransactionOutlined />,
          color: '#722ed1',
          path: '/workflow/instances',
          description: '查看所有流程并强制审批',
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
                  fontSize: 22,
                  color: category.color,
                }}
              >
                {category.icon}
              </span>
              <span
                style={{
                  fontSize: 16,
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
                      border: '2px solid var(--color-border-2)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '28px 20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      minHeight: 140,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      fontFamily: 'PingFang SC, -apple-system, BlinkMacSystemFont, sans-serif',
                    }}
                    onClick={() => handleNavigate(action.path, action.title)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-6px)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-s3)';
                      e.currentTarget.style.borderColor = action.color;
                      e.currentTarget.style.borderWidth = '2px';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-s1)';
                      e.currentTarget.style.borderColor = 'var(--color-border-2)';
                      e.currentTarget.style.borderWidth = '2px';
                    }}
                  >
                    <div
                      style={{
                        fontSize: 48,
                        color: action.color,
                        marginBottom: 12,
                      }}
                    >
                      {action.icon}
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 17,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {action.title}
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
