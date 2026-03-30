import { useNavigate } from 'react-router-dom';
import { NavBar, Grid, Avatar, Card } from 'antd-mobile';
import {
  ClockCircleOutline,
  FileOutline,
  UserOutline,
} from 'antd-mobile-icons';
import { useAuthStore } from '@/stores/authStore';

export default function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  const menus = [
    {
      icon: <ClockCircleOutline style={{ fontSize: 28, color: '#22B970' }} />,
      label: '打卡记录',
      path: '/punch-records',
    },
    {
      icon: <FileOutline style={{ fontSize: 28, color: '#3b82f6' }} />,
      label: '工时结果',
      path: '/work-hours',
    },
    {
      icon: <UserOutline style={{ fontSize: 28, color: '#f59e0b' }} />,
      label: '个人考勤',
      path: '/attendance',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <NavBar
        backIcon={false}
        right={
          <span onClick={handleLogout} style={{ fontSize: 14, color: '#999' }}>
            退出
          </span>
        }
        style={{ background: '#22B970', color: '#fff', '--border-bottom': 'none' } as any}
      >
        精益工时
      </NavBar>

      {/* 用户信息卡片 */}
      <Card style={{ margin: 12, borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar
            style={{ '--size': '48px', '--border-radius': '12px', background: '#22B970', color: '#fff', fontSize: 20 }}
          >
            {user?.name?.charAt(0) || 'U'}
          </Avatar>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{user?.name || '用户'}</div>
            <div style={{ fontSize: 13, color: '#999', marginTop: 2 }}>{user?.username}</div>
          </div>
        </div>
      </Card>

      {/* 功能入口 */}
      <Card style={{ margin: 12, borderRadius: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>功能</div>
        <Grid columns={3} gap={8}>
          {menus.map((item) => (
            <Grid.Item key={item.path} onClick={() => navigate(item.path)}>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '12px 0', borderRadius: 8, cursor: 'pointer',
              }}>
                {item.icon}
                <span style={{ fontSize: 13, marginTop: 8, color: '#333' }}>{item.label}</span>
              </div>
            </Grid.Item>
          ))}
        </Grid>
      </Card>
    </div>
  );
}
