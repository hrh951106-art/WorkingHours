import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authService } from '@/services';
import { useAuthStore } from '@/stores/authStore';
import { useTabsStore } from '@/stores/tabsStore';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { closeAllTabs } = useTabsStore();

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setAuth(data.access_token, data.user);
      // 登录成功后重置所有标签页，只保留工作台
      closeAllTabs();
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
        background: `
          linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%),
          radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)
        `,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 动态背景装饰 */}
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          top: '-200px',
          left: '-200px',
          animation: 'float 8s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
          bottom: '-100px',
          right: '-100px',
          animation: 'float 10s ease-in-out infinite',
        }}
      />

      <Card
        style={{
          width: 440,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          boxShadow: 'var(--shadow-s3)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo 区域 */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div
            style={{
              width: 80,
              height: 80,
              margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #00B365 0%, rgba(255, 255, 255, 0.2) 50%, #00994F 100%)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              fontWeight: 700,
              color: '#fff',
              boxShadow: 'var(--shadow-s2)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            工
          </div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              marginBottom: 8,
              background: 'linear-gradient(135deg, #1e293b 0%, #00B365 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.5px',
            }}
          >
            精益工时管理系统
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, margin: 0 }}>
            <ThunderboltOutlined style={{ marginRight: 8, color: 'var(--color-primary)' }} />
            智能工时管理平台
          </p>
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
              prefix={<UserOutlined style={{ color: 'var(--color-primary)' }} />}
              placeholder="用户名"
              style={{
                borderRadius: 'var(--radius-md)',
                height: 48,
                fontSize: 15,
                border: '1px solid var(--color-border-1)',
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'var(--color-primary)' }} />}
              placeholder="密码"
              style={{
                borderRadius: 'var(--radius-md)',
                height: 48,
                fontSize: 15,
                border: '1px solid var(--color-border-1)',
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loginMutation.isPending}
              style={{
                height: 48,
                borderRadius: 'var(--radius-md)',
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              登 录
            </Button>
          </Form.Item>
        </Form>

        <div
          style={{
            textAlign: 'center',
            marginTop: 24,
            padding: '16px 24px',
            background: 'var(--color-bg-light)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-1)',
          }}
        >
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 8 }}>
            默认登录账号
          </div>
          <div style={{ color: 'var(--color-text-primary)', fontSize: 14, fontWeight: 500 }}>
            admin / admin123
          </div>
        </div>
      </Card>

      {/* 底部版权信息 */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: 13,
          zIndex: 1,
        }}
      >
        © 2024 精益工时管理系统 | 智能工时解决方案
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(30px, -30px) scale(1.05);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: var(--shadow-s2);
          }
          50% {
            transform: scale(1.05);
            box-shadow: var(--shadow-s3);
          }
        }

        .ant-input:focus,
        .ant-input-password:focus {
          border-color: var(--color-primary) !important;
          box-shadow: var(--shadow-s1) !important;
        }

        .ant-input:hover,
        .ant-input-password:hover {
          border-color: var(--color-primary) !important;
        }

        .ant-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-s3) !important;
        }

        .ant-btn-primary:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
