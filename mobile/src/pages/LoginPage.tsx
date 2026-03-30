import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Toast } from 'antd-mobile';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await authService.login(values);
      setAuth(res.access_token, res.user);
      Toast.show({ content: '登录成功', icon: 'success' });
      navigate('/', { replace: true });
    } catch (err: any) {
      Toast.show({ content: err.message || '登录失败', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '0 24px',
      background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 40%)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: '#22B970', margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 28, fontWeight: 700,
        }}>
          工
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
          精益工时
        </h1>
        <p style={{ fontSize: 14, color: '#999', marginTop: 4 }}>
          移动端工时查询
        </p>
      </div>

      <Form
        onFinish={onFinish}
        layout="vertical"
        footer={
          <Button
            block
            type="submit"
            color="primary"
            loading={loading}
            size="large"
            style={{ borderRadius: 8, height: 48, fontSize: 16 }}
          >
            登录
          </Button>
        }
      >
        <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
          <Input placeholder="请输入用户名" clearable />
        </Form.Item>
        <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
          <Input type="password" placeholder="请输入密码" clearable />
        </Form.Item>
      </Form>
    </div>
  );
}
