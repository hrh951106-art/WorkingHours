import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Dropdown, Avatar, Button, Space, Badge } from 'antd';
import {
  UserOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  CalculatorOutlined,
  FileTextOutlined,
  LogoutOutlined,
  SettingOutlined,
  BellOutlined,
  ApartmentOutlined,
  DashboardOutlined,
  TeamOutlined,
  PieChartOutlined,
  SearchOutlined,
  EditOutlined,
  DatabaseOutlined,
  PlayCircleOutlined,
  FundOutlined,
} from '@ant-design/icons';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useTabsStore } from '@/stores/tabsStore';
import MultipleTabs from './MultipleTabs';

const { Header, Content } = Layout;

interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  path?: string;
  children?: Omit<MenuItem, 'children'>[];
}

const menuItems: MenuItem[] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '工作台', path: '/dashboard' },
  { key: '/hr/organizations', icon: <ApartmentOutlined />, label: '组织管理', path: '/hr/organizations' },
  { key: '/hr/employees', icon: <UserOutlined />, label: '人员管理', path: '/hr/employees' },
  { key: '/punch/records', icon: <FileTextOutlined />, label: '打卡记录', path: '/punch/records' },
  { key: '/shift/schedules', icon: <CalendarOutlined />, label: '排班管理', path: '/shift/schedules' },
  { key: '/calculate/pairing-results', icon: <PlayCircleOutlined />, label: '摆卡结果', path: '/calculate/pairing-results' },
  { key: '/calculate/work-hour-results', icon: <CalculatorOutlined />, label: '工时结果', path: '/calculate/work-hour-results' },
  { key: '/calculate/config/punch-rules', icon: <SettingOutlined />, label: '打卡规则', path: '/calculate/config/punch-rules' },
  { key: '/calculate/config/attendance-codes', icon: <FundOutlined />, label: '出勤代码', path: '/calculate/config/attendance-codes' },
  { key: '/attendance/workhour-details', icon: <FileTextOutlined />, label: '工时明细管理', path: '/attendance/workhour-details' },
  { key: '/allocation/line-maintenance', icon: <CalendarOutlined />, label: '开线维护', path: '/allocation/line-maintenance' },
  { key: '/allocation/production-records', icon: <FileTextOutlined />, label: '产量记录', path: '/allocation/production-records' },
  { key: '/allocation/config', icon: <SettingOutlined />, label: '分摊规则', path: '/allocation/config' },
  { key: '/allocation/calculate', icon: <CalculatorOutlined />, label: '分摊计算', path: '/allocation/calculate' },
  { key: '/allocation/results', icon: <PieChartOutlined />, label: '分摊结果查询', path: '/allocation/results' },
  { key: '/hr/data-source-management', icon: <DatabaseOutlined />, label: '查找项管理', path: '/hr/data-source-management' },
  { key: '/hr/custom-field-config', icon: <EditOutlined />, label: '自定义字段配置', path: '/hr/custom-field-config' },
  { key: '/hr/employee-info-config', icon: <TeamOutlined />, label: '人事信息配置', path: '/hr/employee-info-config' },
  { key: '/hr/search-conditions-config', icon: <SearchOutlined />, label: '查询条件配置', path: '/hr/search-conditions-config' },
];

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const { addTab, setActiveKey } = useTabsStore();

  const handleMenuClick = ({ key }: { key: string }) => {
    const findItem = (items: MenuItem[], targetKey: string): MenuItem | null => {
      for (const item of items) {
        if (item.key === targetKey) return item;
        if (item.children) {
          const found = findItem(item.children, targetKey);
          if (found) return found;
        }
      }
      return null;
    };

    const item = findItem(menuItems, key);
    if (item && item.path) {
      // 添加标签（工作台不可关闭，其他可关闭）
      addTab({
        key: item.key,
        label: item.label,
        path: item.path,
        closable: item.key !== '/dashboard',
      });
      navigate(item.path);
    }
  };

  // 监听路由变化，同步更新标签
  useEffect(() => {
    const path = location.pathname;
    const findItem = (items: MenuItem[], targetPath: string): MenuItem | null => {
      for (const item of items) {
        if (item.path === targetPath) return item;
        if (item.children) {
          const found = findItem(item.children, targetPath);
          if (found) return found;
        }
      }
      return null;
    };

    const item = findItem(menuItems, path);
    if (item) {
      addTab({
        key: item.key,
        label: item.label,
        path: item.path,
        closable: item.key !== '/dashboard',
      });
      setActiveKey(item.key);
    }
  }, [location.pathname, addTab, setActiveKey]);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
    } as any,
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    } as any,
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Header
        style={{
          padding: '0 24px',
          height: 64,
          background: '#22B970',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginRight: 24,
            gap: 12,
            minWidth: '150px',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: 'block' }}
            >
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#fff',
                lineHeight: '24px',
                letterSpacing: '0.5px',
              }}
            >
              精益管理
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'rgba(255, 255, 255, 0.75)',
                lineHeight: '14px',
                fontWeight: 400,
              }}
            >
              LEAN MANAGEMENT
            </div>
          </div>
        </div>

        {/* 标签页栏 */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'flex-end',
            height: '100%',
            minWidth: 0,
            overflow: 'hidden',
            marginRight: 8,
          }}
        >
          <MultipleTabs />
        </div>

        {/* 右侧操作区 */}
        <Space size={16}>
          <Badge count={0}>
            <Button
              type="text"
              icon={<BellOutlined />}
              style={{
                fontSize: 18,
                color: '#ffffff',
              }}
              className="header-text-btn"
            />
          </Badge>

          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={() => {
              addTab({
                key: '/system/settings',
                label: '系统管理',
                path: '/system/settings',
                closable: true,
              });
              navigate('/system/settings');
            }}
            style={{
              fontSize: 18,
              color: '#ffffff',
            }}
            title="系统管理"
            className="header-text-btn"
          />

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 12px',
                borderRadius: 8,
                transition: 'background 0.2s',
                minWidth: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Avatar
                size={32}
                style={{
                  background: '#ffffff',
                  border: '2px solid #fff',
                  boxShadow: '0 2px 8px rgba(255, 255, 255, 0.3)',
                  flexShrink: 0,
                }}
                icon={<UserOutlined style={{ color: '#22B970' }} />}
              />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 2,
                  minWidth: 0,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 500,
                    lineHeight: '20px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user?.name || '用户'}
                </div>
                <div
                  style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: 12,
                    lineHeight: '16px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user?.roles && user.roles.length > 0
                    ? user.roles.map((r) => r.name).join(', ')
                    : '用户'}
                </div>
              </div>
            </div>
          </Dropdown>
        </Space>
      </Header>

      <Content
        style={{
          padding: '24px',
          minHeight: 'calc(100vh - 64px)',
          background: '#f8fafc',
          overflow: 'auto',
        }}
      >
        <Outlet />
      </Content>
    </Layout>
  );
};

export default MainLayout;
