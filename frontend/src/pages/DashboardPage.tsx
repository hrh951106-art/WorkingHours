import { Card, Row, Col, Statistic } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ApartmentOutlined,
  FileTextOutlined,
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
      title: '员工管理',
      icon: <UserOutlined />,
      color: '#0ea5e9',
      path: '/hr/employees',
    },
    {
      title: '组织管理',
      icon: <ApartmentOutlined />,
      color: '#8b5cf6',
      path: '/hr/organizations',
    },
    {
      title: '排班管理',
      icon: <ClockCircleOutlined />,
      color: '#52c41a',
      path: '/shift/schedules',
    },
    {
      title: '工时计算',
      icon: <CheckCircleOutlined />,
      color: '#faad14',
      path: '/calculate',
    },
    {
      title: '工时明细管理',
      icon: <FileTextOutlined />,
      color: '#f59e0b',
      path: '/allocation/workhour-details',
    },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>
        工作台
      </h1>

      <Row gutter={[16, 16]}>
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

      <Card
        title="快速操作"
        style={{ marginTop: 24 }}
      >
        <Row gutter={[16, 16]}>
          {quickActions.map((action) => (
            <Col xs={12} sm={8} md={4} key={action.path}>
              <Card
                hoverable
                style={{ textAlign: 'center', cursor: 'pointer' }}
                onClick={() => navigate(action.path)}
              >
                <div style={{ fontSize: 32, color: action.color }}>
                  {action.icon}
                </div>
                <div style={{ marginTop: 8, fontWeight: 'bold', fontSize: 14 }}>
                  {action.title}
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
