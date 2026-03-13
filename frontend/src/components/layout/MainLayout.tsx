import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Dropdown, Avatar, theme, Button, Space, Badge } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  UserOutlined,
  ApartmentOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  CalculatorOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  BellOutlined,
  ControlOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

const { Header, Sider, Content } = Layout;

interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  path?: string;
  children?: Omit<MenuItem, 'children'>[];
}

const menuItems: MenuItem[] = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '工作台',
    path: '/dashboard',
  },
  {
    key: '/hr',
    icon: <TeamOutlined />,
    label: '人事管理',
    children: [
      { key: '/hr/organizations', icon: <ApartmentOutlined />, label: '组织管理', path: '/hr/organizations' },
      { key: '/hr/employees', icon: <UserOutlined />, label: '人员管理', path: '/hr/employees' },
    ],
  },
  {
    key: '/account',
    icon: <ApartmentOutlined />,
    label: '劳动力账户',
    path: '/account',
  },
  {
    key: '/punch',
    icon: <ClockCircleOutlined />,
    label: '打卡管理',
    children: [
      { key: '/punch/devices', icon: <ClockCircleOutlined />, label: '设备管理', path: '/punch/devices' },
      { key: '/punch/records', icon: <FileTextOutlined />, label: '打卡记录', path: '/punch/records' },
      { key: '/punch/device-groups', icon: <SettingOutlined />, label: '设备组管理', path: '/punch/device-groups' },
    ],
  },
  {
    key: '/shift',
    icon: <CalendarOutlined />,
    label: '排班管理',
    children: [
      { key: '/shift/shifts', icon: <ClockCircleOutlined />, label: '班次管理', path: '/shift/shifts' },
      { key: '/shift/schedules', icon: <CalendarOutlined />, label: '排班管理', path: '/shift/schedules' },
    ],
  },
  {
    key: '/calculate',
    icon: <CalculatorOutlined />,
    label: '计算管理',
    children: [
      { key: '/calculate/config/punch-rules', icon: <SettingOutlined />, label: '打卡规则', path: '/calculate/config/punch-rules' },
      { key: '/calculate/config/attendance-codes', icon: <SettingOutlined />, label: '出勤代码', path: '/calculate/config/attendance-codes' },
      { key: '/calculate/pairing-results', icon: <CalculatorOutlined />, label: '摆卡结果', path: '/calculate/pairing-results' },
      { key: '/calculate/work-hour-results', icon: <ClockCircleOutlined />, label: '工时结果', path: '/calculate/work-hour-results' },
    ],
  },
  {
    key: '/allocation',
    icon: <PieChartOutlined />,
    label: '工时管理',
    children: [
      { key: '/allocation/config', icon: <SettingOutlined />, label: '分摊规则', path: '/allocation/config' },
      { key: '/allocation/calculate', icon: <CalculatorOutlined />, label: '分摊计算', path: '/allocation/calculate' },
      { key: '/allocation/results', icon: <FileTextOutlined />, label: '分摊结果查询', path: '/allocation/results' },
      { key: '/allocation/line-maintenance', icon: <CalendarOutlined />, label: '开线维护', path: '/allocation/line-maintenance' },
      { key: '/allocation/product-config', icon: <SettingOutlined />, label: '基础配置', path: '/allocation/product-config' },
      { key: '/allocation/production-records', icon: <FileTextOutlined />, label: '产量记录', path: '/allocation/production-records' },
      { key: '/attendance/workhour-details', icon: <FileTextOutlined />, label: '工时明细管理', path: '/attendance/workhour-details' },
    ],
  },
  {
    key: '/system',
    icon: <ControlOutlined />,
    label: '系统配置',
    children: [
      { key: '/system/users', icon: <UserOutlined />, label: '用户管理', path: '/system/users' },
      { key: '/system/roles', icon: <SettingOutlined />, label: '角色管理', path: '/system/roles' },
      { key: '/hr/config', icon: <SettingOutlined />, label: '人事基础配置', path: '/hr/config' },
    ],
  },
];

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const {
    token: { borderRadiusLG },
  } = theme.useToken();

  const handleMenuClick = ({ key }: { key: string }) => {
    const findPath = (items: MenuItem[], targetKey: string): string | null => {
      for (const item of items) {
        if (item.key === targetKey && item.path) return item.path;
        if (item.children) {
          const path = findPath(item.children, targetKey);
          if (path) return path;
        }
      }
      return null;
    };

    const path = findPath(menuItems, key);
    if (path) navigate(path);
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const getSelectedKeys = () => {
    return [location.pathname];
  };

  const getOpenKeys = () => {
    const path = location.pathname;
    const openKeys: string[] = [];
    menuItems.forEach((item) => {
      if (item.children) {
        const hasActive = item.children.some((child) => path.startsWith(child.key));
        if (hasActive) openKeys.push(item.key);
      }
    });
    return openKeys;
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
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        trigger={null}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: collapsed ? 0 : 12,
              fontSize: 20,
              fontWeight: 700,
              color: '#fff',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
            }}
          >
            {collapsed ? '工' : '精益'}
          </div>
          {!collapsed && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 2 }}>
                工时管理
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12 }}>精益工时系统</div>
            </div>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          onClick={handleMenuClick}
          items={menuItems as any}
          style={{
            background: 'transparent',
            border: 'none',
          }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'all 0.2s' }}>
        <Header
          style={{
            padding: '0 32px',
            height: 64,
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: 18,
                color: '#64748b',
              }}
            />
          </div>

          <Space size={20}>
            <Badge count={0}>
              <Button
                type="text"
                icon={<BellOutlined />}
                style={{
                  fontSize: 18,
                  color: '#64748b',
                }}
              />
            </Badge>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar
                  size={36}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    border: '2px solid #fff',
                    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                  }}
                  icon={<UserOutlined />}
                />
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#1e293b', fontSize: 14, fontWeight: 500 }}>
                    {user?.name || '用户'}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>
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
            margin: '24px',
            padding: '24px',
            minHeight: 'calc(100vh - 112px)',
            background: '#ffffff',
            borderRadius: borderRadiusLG,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
