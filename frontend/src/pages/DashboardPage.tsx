import { Card, Row, Col, Statistic } from 'antd';
import {
  UserOutlined,
  ApartmentOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  CalendarOutlined,
  SettingOutlined,
  CalculatorOutlined,
  BarChartOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';
import { useNavigate } from 'react-router-dom';
import { useTabsStore } from '@/stores/tabsStore';
import { useAuthStore } from '@/stores/authStore';

interface DashboardStats {
  totalEmployees: number;
  todayScheduled: number;
  todayAttended: number;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { addTab } = useTabsStore();
  const { user } = useAuthStore();

  // 获取工作台统计数据
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => request.get<DashboardStats>('/system/dashboard/stats'),
  });

  const quickActions = [
    {
      title: '组织管理',
      icon: <ApartmentOutlined />,
      color: '#22B970',
      path: '/hr/organizations',
      description: '管理组织架构',
    },
    {
      title: '人员管理',
      icon: <UserOutlined />,
      color: '#22B970',
      path: '/hr/employees',
      description: '管理员工信息',
    },
    {
      title: '打卡记录',
      icon: <FileTextOutlined />,
      color: '#22B970',
      path: '/punch/records',
      description: '查看打卡数据',
    },
    {
      title: '排班管理',
      icon: <CalendarOutlined />,
      color: '#22B970',
      path: '/shift/schedules',
      description: '管理排班计划',
    },
    {
      title: '工时明细管理',
      icon: <BarChartOutlined />,
      color: '#22B970',
      path: '/attendance/workhour-details',
      description: '查看工时明细',
    },
    {
      title: '开线维护',
      icon: <CheckCircleOutlined />,
      color: '#22B970',
      path: '/allocation/line-maintenance',
      description: '维护开线计划',
    },
    {
      title: '产量记录',
      icon: <TeamOutlined />,
      color: '#22B970',
      path: '/allocation/production-records',
      description: '记录产量数据',
    },
    {
      title: '分摊规则',
      icon: <SettingOutlined />,
      color: '#22B970',
      path: '/allocation/config',
      description: '配置分摊规则',
    },
    {
      title: '分摊计算',
      icon: <CalculatorOutlined />,
      color: '#22B970',
      path: '/allocation/calculate',
      description: '执行分摊计算',
    },
    {
      title: '分摊结果查询',
      icon: <SearchOutlined />,
      color: '#22B970',
      path: '/allocation/results',
      description: '查询分摊结果',
    },
  ];

  return (
    <div>
      {/* 欢迎语 */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #22B970 0%, #178c52 100%)',
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
                color: '#1e293b',
                fontSize: 24,
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              {user?.name || '用户'}，欢迎来到盖雅智能工时管理系统
            </div>
            <div
              style={{
                color: '#64748b',
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

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} md={8}>
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: '24px',
              border: '1px solid #e2e8f0',
            }}
          >
            <Statistic
              title={
                <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>
                  总员工数
                </span>
              }
              value={stats?.totalEmployees || 0}
              prefix={<UserOutlined style={{ color: '#22B970' }} />}
              valueStyle={{
                color: '#22B970',
                fontSize: 28,
                fontWeight: 'bold',
              }}
            />
          </div>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: '24px',
              border: '1px solid #e2e8f0',
            }}
          >
            <Statistic
              title={
                <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>
                  今日排班人数
                </span>
              }
              value={stats?.todayScheduled || 0}
              prefix={<ClockCircleOutlined style={{ color: '#22B970' }} />}
              valueStyle={{
                color: '#22B970',
                fontSize: 28,
                fontWeight: 'bold',
              }}
            />
          </div>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: '24px',
              border: '1px solid #e2e8f0',
            }}
          >
            <Statistic
              title={
                <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>
                  今日出勤人数
                </span>
              }
              value={stats?.todayAttended || 0}
              prefix={<CheckCircleOutlined style={{ color: '#22B970' }} />}
              valueStyle={{
                color: '#22B970',
                fontSize: 28,
                fontWeight: 'bold',
              }}
            />
          </div>
        </Col>
      </Row>

      {/* 功能模块入口 */}
      <h2
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: '#1e293b',
          marginBottom: 16,
        }}
      >
        常用功能
      </h2>
      <Row gutter={[16, 16]}>
        {quickActions.map((action) => (
          <Col xs={12} sm={8} md={6} lg={6} xl={6} key={action.path}>
            <div
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '24px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s',
              }}
              onClick={() => {
                // 添加标签页并导航
                addTab({
                  key: action.path,
                  label: action.title,
                  path: action.path,
                  closable: true,
                });
                navigate(action.path);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                e.currentTarget.style.borderColor = '#22B970';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  color: action.color,
                  marginBottom: 12,
                }}
              >
                {action.icon}
              </div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 15,
                  marginBottom: 4,
                  color: '#1e293b',
                }}
              >
                {action.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#64748b',
                }}
              >
                {action.description}
              </div>
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default DashboardPage;
