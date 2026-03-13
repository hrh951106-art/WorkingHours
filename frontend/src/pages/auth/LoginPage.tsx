import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authService } from '@/services';
import { useAuthStore } from '@/stores/authStore';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setAuth(data.access_token, data.user);
      message.success('登录成功');
      navigate('/dashboard');
    },
    onError: (error: any) => {
      console.error('登录失败:', error);
      const errorMsg = error?.response?.data?.message || error?.message || '登录失败，请检查用户名和密码';
      message.error(errorMsg);
    },
  });

  const onFinish = (values: { username: string; password: string }) => {
    loginMutation.mutate(values);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card
        style={{
          width: 400,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          borderRadius: 16,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 8 }}>
            精益工时管理系统
          </h1>
          <p style={{ color: '#666' }}>请登录您的账号</p>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          size="large"
          initialValues={{
            username: 'admin',
            password: 'admin123',
          }}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loginMutation.isPending}
              style={{ height: 44, borderRadius: 8 }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16, color: '#999', fontSize: 12 }}>
          <p>默认账号: admin / admin123</p>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
