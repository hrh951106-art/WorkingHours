import { useState } from 'react';
import { Card, Form, Select, Button, message, Spin, Space, Divider, Typography } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

const { Title, Text } = Typography;

const GeneralConfig: React.FC = () => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取劳动力账户层级配置
  const { data: hierarchyLevels = [], isLoading: levelsLoading } = useQuery({
    queryKey: ['hierarchy-levels'],
    queryFn: () =>
      request.get('/account/hierarchy-config/levels').then((res: any) => res || []),
  });

  // 获取系统配置
  const { data: systemConfigs = [], isLoading: configsLoading } = useQuery({
    queryKey: ['systemConfigs'],
    queryFn: () =>
      request.get('/hr/system-configs').then((res: any) => res || []),
  });

  // 保存配置
  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      const configs = [
        {
          configKey: 'productionLineHierarchyLevel',
          configValue: values.productionLineHierarchyLevel || '',
          category: 'WORK_HOURS',
          description: '产线对应层级',
        },
      ];

      // 更新或创建每个配置
      await Promise.all(
        configs.map((config) => {
          const existing = systemConfigs.find((c: any) => c.configKey === config.configKey);
          if (existing) {
            return request.put(`/hr/system-configs/${config.configKey}`, {
              configValue: config.configValue,
              description: config.description,
            });
          } else {
            return request.post('/hr/system-configs', config);
          }
        })
      );
    },
    onSuccess: () => {
      message.success('保存成功');
      queryClient.invalidateQueries({ queryKey: ['systemConfigs'] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '保存失败';
      message.error(errorMsg);
    },
  });

  // 初始化表单数据
  const getInitialValues = () => {
    const productionLineConfig = systemConfigs.find(
      (c: any) => c.configKey === 'productionLineHierarchyLevel'
    );

    return {
      productionLineHierarchyLevel: productionLineConfig?.configValue || undefined,
    };
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      saveMutation.mutate(values);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  if (levelsLoading || configsLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Card
        title="工时管理基础配置"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => queryClient.invalidateQueries({ queryKey: ['systemConfigs'] })}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saveMutation.isPending}
            >
              保存配置
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={getInitialValues()}
        >
          <Title level={5}>产线配置</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            配置产线对应的组织层级，用于开线维护和产量记录中的组织筛选
          </Text>

          <Form.Item
            name="productionLineHierarchyLevel"
            label="产线对应层级"
            tooltip="选择后，开线维护和产量记录中的组织选择将限制为该类型的组织"
          >
            <Select
              placeholder="请选择产线对应的层级"
              allowClear
              showSearch
              optionFilterProp="label"
            >
              {hierarchyLevels.map((level: any) => (
                <Select.Option key={level.id} value={String(level.id)} label={level.name}>
                  {level.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Divider />

          <Title level={5}>配置说明</Title>
          <div style={{ background: '#f0f5ff', padding: 16, borderRadius: 8 }}>
            <Text>
              • <strong>产线对应层级</strong>：配置后，新增开线维护和产量记录时，组织选择将自动过滤为该类型的组织，不再需要手动从组织树中选择<br />
              • 配置前请确保已在"劳动力账户 - 层级配置"中创建相应的组织层级<br />
              • 修改此配置后，仅在新增开线和产量记录时生效，已存在的记录不受影响
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default GeneralConfig;
