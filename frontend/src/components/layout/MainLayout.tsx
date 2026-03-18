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
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useTabsStore } from '@/stores/tabsStore';
import MultipleTabs from './MultipleTabs';

const { Header, Sider, Content } = Layout;

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
  { key: '/attendance/workhour-details', icon: <FileTextOutlined />, label: '工时明细管理', path: '/attendance/workhour-details' },
  { key: '/allocation/line-maintenance', icon: <CalendarOutlined />, label: '开线维护', path: '/allocation/line-maintenance' },
  { key: '/allocation/production-records', icon: <FileTextOutlined />, label: '产量记录', path: '/allocation/production-records' },
  { key: '/allocation/config', icon: <SettingOutlined />, label: '分摊规则', path: '/allocation/config' },
  { key: '/allocation/calculate', icon: <CalculatorOutlined />, label: '分摊计算', path: '/allocation/calculate' },
];

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAuthStore();
  const { addTab, setActiveKey } = useTabsStore();
  const {
    token: { borderRadiusLG },
  } = theme.useToken();

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

  const getSelectedKeys = () => {
    return [location.pathname];
  };

  const getOpenKeys = () => {
    // 没有子菜单，返回空数组
    return [];
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
          zIndex: 100,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '16px 12px' : '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.2s',
          }}
        >
          <div
            style={{
              minWidth: 40,
              height: 40,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              fontWeight: 700,
              color: '#fff',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
              flexShrink: 0,
            }}
          >
            {collapsed ? '工' : '精益'}
          </div>
          {!collapsed && (
            <div
              style={{
                textAlign: 'left',
                marginLeft: 12,
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 600,
                  marginBottom: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                工时管理
              </div>
              <div
                style={{
                  color: '#94a3b8',
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                精益工时系统
              </div>
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
            padding: '0 24px',
            height: 'auto',
            minHeight: 64,
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          {/* 第一行：折叠按钮和用户信息 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: 64,
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

            <Space size={16}>
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
                  color: '#64748b',
                }}
                title="系统管理"
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
                    e.currentTarget.style.background = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Avatar
                    size={32}
                    style={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      border: '2px solid #fff',
                      boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                      flexShrink: 0,
                    }}
                    icon={<UserOutlined />}
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
                        color: '#1e293b',
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
                        color: '#64748b',
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
          </div>

          {/* 第二行：多标签页 */}
          <MultipleTabs />
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
