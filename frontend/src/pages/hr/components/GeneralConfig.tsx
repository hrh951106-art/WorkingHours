import { useState } from 'react';
import { Card, Typography, Empty } from 'antd';

const { Title, Text, Paragraph } = Typography;

const GeneralConfig: React.FC = () => {
  return (
    <div>
      <Card title="通用配置">
        <Empty
          description="暂无配置项"
          style={{ padding: '60px 0' }}
        />
        <div style={{ marginTop: 24, padding: 16, background: '#f0f5ff', borderRadius: 8 }}>
          <Title level={5}>配置说明</Title>
          <Paragraph>
            <Text>
              • <strong>产线配置</strong>：已移至"工时管理 - 通用配置"页面，包括产线对应层级和产线班次配置<br />
              • 请前往"工时管理"菜单下的"通用配置"进行相关设置
            </Text>
          </Paragraph>
        </div>
      </Card>
    </div>
  );
};

export default GeneralConfig;
