import ReactDOM from 'react-dom/client';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import './index.css';
import './styles/theme.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          // 主色调 - 使用现代绿色
          colorPrimary: '#22B970',
          colorPrimaryHover: '#1ea864',
          colorPrimaryActive: '#178c52',
          colorSuccess: '#10b981',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          colorInfo: '#3b82f6',

          // 圆角
          borderRadius: 8,
          borderRadiusLG: 12,
          borderRadiusSM: 6,

          // 字体大小
          fontSize: 14,
          fontSizeLG: 16,
          fontSizeSM: 12,

          // 间距
          marginXS: 4,
          marginSM: 8,
          marginMD: 16,
          marginLG: 24,
          marginXL: 32,

          paddingXS: 4,
          paddingSM: 8,
          paddingMD: 16,
          paddingLG: 24,
          paddingXL: 32,

          // 阴影
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
        components: {
          Layout: {
            headerBg: '#ffffff',
            headerHeight: 64,
            headerPadding: '0 24px',
            siderBg: '#1e293b',
            bodyBg: '#f8fafc',
          },
          Menu: {
            darkItemBg: '#1e293b',
            darkItemSelectedBg: '#22B970',
            darkItemHoverBg: 'rgba(255, 255, 255, 0.2)',
          },
          Card: {
            colorBgContainer: '#ffffff',
            boxShadowTertiary: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
          },
          Table: {
            borderColor: '#e2e8f0',
            headerBg: '#f8fafc',
            headerColor: '#64748b',
          },
          Input: {
            colorBgContainer: '#ffffff',
            colorBorder: '#e2e8f0',
            hoverBorderColor: '#22B970',
            activeBorderColor: '#22B970',
          },
          Button: {
            colorPrimary: '#22B970',
            colorPrimaryHover: '#1ea864',
            colorPrimaryActive: '#178c52',
            primaryShadow: '0 2px 0 rgba(0, 0, 0, 0.045)',
          },
        },
      }}
    >
      <AntdApp>
        <RouterProvider router={router} />
      </AntdApp>
    </ConfigProvider>
  </QueryClientProvider>,
);
