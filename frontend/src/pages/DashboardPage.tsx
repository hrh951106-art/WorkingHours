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
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalEmployees: number;
  todayScheduled: number;
  todayAttended: number;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // 获取工作台统计数据
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => request.get<DashboardStats>('/system/dashboard/stats'),
  });

  const quickActions = [
    {
      title: '组织管理',
      icon: <ApartmentOutlined />,
      color: '#8b5cf6',
      path: '/hr/organizations',
      description: '管理组织架构',
    },
    {
      title: '人员管理',
      icon: <UserOutlined />,
      color: '#0ea5e9',
      path: '/hr/employees',
      description: '管理员工信息',
    },
    {
      title: '打卡记录',
      icon: <FileTextOutlined />,
      color: '#f59e0b',
      path: '/punch/records',
      description: '查看打卡数据',
    },
    {
      title: '排班管理',
      icon: <CalendarOutlined />,
      color: '#52c41a',
      path: '/shift/schedules',
      description: '管理排班计划',
    },
    {
      title: '工时明细管理',
      icon: <BarChartOutlined />,
      color: '#10b981',
      path: '/attendance/workhour-details',
      description: '查看工时明细',
    },
    {
      title: '开线维护',
      icon: <CheckCircleOutlined />,
      color: '#6366f1',
      path: '/allocation/line-maintenance',
      description: '维护开线计划',
    },
    {
      title: '产量记录',
      icon: <TeamOutlined />,
      color: '#ec4899',
      path: '/allocation/production-records',
      description: '记录产量数据',
    },
    {
      title: '分摊规则',
      icon: <SettingOutlined />,
      color: '#f97316',
      path: '/allocation/config',
      description: '配置分摊规则',
    },
    {
      title: '分摊计算',
      icon: <CalculatorOutlined />,
      color: '#14b8a6',
      path: '/allocation/calculate',
      description: '执行分摊计算',
    },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>
        工作台
      </h1>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card loading={isLoading}>
            <Statistic
              title="总员工数"
              value={stats?.totalEmployees || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#0ea5e9' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card loading={isLoading}>
            <Statistic
              title="今日排班人数"
              value={stats?.todayScheduled || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card loading={isLoading}>
            <Statistic
              title="今日出勤人数"
              value={stats?.todayAttended || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="常用功能">
        <Row gutter={[16, 16]}>
          {quickActions.map((action) => (
            <Col xs={12} sm={8} md={6} lg={6} xl={6} key={action.path}>
              <Card
                hoverable
                style={{ textAlign: 'center', height: '100%' }}
                onClick={() => navigate(action.path)}
                bodyStyle={{ padding: '24px 16px' }}
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
                    fontWeight: 'bold',
                    fontSize: 15,
                    marginBottom: 4,
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
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};

export default DashboardPage;
