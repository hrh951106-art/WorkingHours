import { ReactNode } from 'react';
import { Card, Space, Button, Breadcrumb, Typography, Row, Col, Statistic } from 'antd';
import {
  ArrowLeftOutlined,
  HomeOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface ModernPageLayoutProps {
  title: string;
  description?: string;
  breadcrumb?: Array<{ label: string; path: string }>;
  extra?: ReactNode;
  children: ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  actions?: ReactNode;
  stats?: Array<{
    title: string;
    value: number | string;
    suffix?: string;
    prefix?: ReactNode;
    color?: string;
  }>;
}

interface StatItem {
  title: string;
  value: number | string;
  suffix?: string;
  prefix?: ReactNode;
  color?: string;
}

export const ModernPageLayout: React.FC<ModernPageLayoutProps> = ({
  title,
  description,
  breadcrumb,
  extra,
  children,
  showBack,
  onBack,
  actions,
  stats,
}) => {
  return (
    <div style={{ paddingBottom: 24 }}>
      {/* 页面头部 */}
      <div style={{ marginBottom: 24 }}>
        {breadcrumb && (
          <Breadcrumb
            style={{ marginBottom: 12 }}
            items={[
              { href: '/', title: <HomeOutlined /> },
              ...breadcrumb.map((item: any) => ({
                title: item.label,
              })),
            ]}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            {showBack && (
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={onBack}
                style={{ marginBottom: 8, color: '#64748b' }}
              >
                返回
              </Button>
            )}
            <Title level={3} style={{ margin: 0, marginBottom: 8, color: '#1e293b' }}>
              {title}
            </Title>
            {description && (
              <Text type="secondary" style={{ fontSize: 14 }}>
                {description}
              </Text>
            )}
          </div>

          <Space>{extra}</Space>
        </div>

        {/* 操作按钮 */}
        {actions && (
          <Card
            style={{
              marginBottom: 16,
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              background: '#f8fafc',
            }}
            bodyStyle={{ padding: '12px 16px' }}
          >
            <Space>{actions}</Space>
          </Card>
        )}

        {/* 统计卡片 */}
        {stats && stats.length > 0 && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            {stats.map((stat: StatItem, index: number) => (
              <Col span={6} key={index}>
                <Card
                  style={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    background: `linear-gradient(135deg, ${stat.color || '#6366f1'}15 0%, ${stat.color || '#6366f1'}05 100%)`,
                  }}
                  bodyStyle={{ padding: '20px' }}
                >
                  <Statistic
                    title={stat.title}
                    value={stat.value}
                    suffix={stat.suffix}
                    prefix={stat.prefix}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>

      {/* 主要内容 */}
      {children}
    </div>
  );
};
