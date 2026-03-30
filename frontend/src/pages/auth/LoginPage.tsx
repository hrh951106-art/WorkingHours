import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined, ThunderboltOutlined } from '@ant-design/icons';
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
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          borderRadius: 24,
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
              background: 'linear-gradient(135deg, #22B970 0%, rgba(255, 255, 255, 0.2) 50%, #178c52 100%)',
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              fontWeight: 700,
              color: '#fff',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
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
              background: 'linear-gradient(135deg, #1e293b 0%, #22B970 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.5px',
            }}
          >
            精益工时管理系统
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            <ThunderboltOutlined style={{ marginRight: 4, color: '#22B970' }} />
            智能工时管理平台
          </p>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          size="large"
          initialValues={{
            username: 'admin',
            password: '1qaz2wsx',
          }}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#22B970' }} />}
              placeholder="用户名"
              style={{
                borderRadius: 12,
                height: 48,
                fontSize: 15,
                border: '2px solid #e2e8f0',
                transition: 'all 0.3s',
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#22B970' }} />}
              placeholder="密码"
              style={{
                borderRadius: 12,
                height: 48,
                fontSize: 15,
                border: '2px solid #e2e8f0',
                transition: 'all 0.3s',
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
                height: 50,
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #22B970 0%, rgba(255, 255, 255, 0.2) 100%)',
                border: 'none',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
                transition: 'all 0.3s',
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
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
            borderRadius: 12,
            border: '1px solid rgba(99, 102, 241, 0.1)',
          }}
        >
          <div style={{ color: '#64748b', fontSize: 13, marginBottom: 4 }}>
            默认登录账号
          </div>
          <div style={{ color: '#1e293b', fontSize: 14, fontWeight: 600 }}>
            admin / 1qaz2wsx
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
            box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 12px 32px rgba(99, 102, 241, 0.6);
          }
        }

        .ant-input:focus,
        .ant-input-password:focus {
          border-color: #22B970 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
        }

        .ant-input:hover,
        .ant-input-password:hover {
          border-color: #22B970 !important;
        }

        .ant-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.5) !important;
        }

        .ant-btn-primary:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
