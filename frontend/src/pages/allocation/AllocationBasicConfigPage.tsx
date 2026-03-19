import { useState } from 'react';
import { Card, Form, Select, Button, message, Spin, Space, Divider, Typography, Row, Col } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

const { Title, Text } = Typography;

const AllocationBasicConfigPage: React.FC = () => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取劳动力账户层级配置
  const { data: hierarchyLevels = [], isLoading: levelsLoading } = useQuery({
    queryKey: ['hierarchy-levels'],
    queryFn: () =>
      request.get('/account/hierarchy-config/levels').then((res: any) => res || []),
  });

  // 获取所有班次
  const { data: allShifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['allShifts'],
    queryFn: () =>
      request.get('/shift/shifts').then((res: any) => res?.items || res || []),
  });

  // 获取系统配置
  const { data: systemConfigs = [], isLoading: configsLoading } = useQuery({
    queryKey: ['allocationSystemConfigs'],
    queryFn: () =>
      request.get('/hr/system-configs').then((res: any) => res || []),
  });

  // 获取出勤代码列表（用于工时代码配置）
  const { data: attendanceCodes = [], isLoading: codesLoading } = useQuery({
    queryKey: ['attendanceCodes'],
    queryFn: () =>
      request.get('/allocation/attendance-codes').then((res: any) => res || []),
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
        {
          configKey: 'productionLineShiftIds',
          configValue: values.productionLineShiftIds?.join(',') || '',
          category: 'WORK_HOURS',
          description: '产线班次',
        },
        {
          configKey: 'actualHoursAllocationCode',
          configValue: values.actualHoursAllocationCode || '',
          category: 'ALLOCATION',
          description: '按实际工时方式分配的工时代码',
        },
        {
          configKey: 'indirectHoursAllocationCode',
          configValue: values.indirectHoursAllocationCode || '',
          category: 'ALLOCATION',
          description: '间接工时分配后的工时代码',
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
      queryClient.invalidateQueries({ queryKey: ['allocationSystemConfigs'] });
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
    const shiftsConfig = systemConfigs.find(
      (c: any) => c.configKey === 'productionLineShiftIds'
    );
    const actualHoursCodeConfig = systemConfigs.find(
      (c: any) => c.configKey === 'actualHoursAllocationCode'
    );
    const indirectHoursCodeConfig = systemConfigs.find(
      (c: any) => c.configKey === 'indirectHoursAllocationCode'
    );

    const shiftIds = shiftsConfig?.configValue
      ? shiftsConfig.configValue.split(',').map((id: string) => parseInt(id))
      : [];

    return {
      productionLineHierarchyLevel: productionLineConfig?.configValue || undefined,
      productionLineShiftIds: shiftIds,
      actualHoursAllocationCode: actualHoursCodeConfig?.configValue || undefined,
      indirectHoursAllocationCode: indirectHoursCodeConfig?.configValue || undefined,
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

  if (levelsLoading || configsLoading || shiftsLoading || codesLoading) {
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
              onClick={() => queryClient.invalidateQueries({ queryKey: ['allocationSystemConfigs'] })}
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
            配置产线对应的组织层级和可用班次，用于开线维护和产量记录中的筛选
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

          <Form.Item
            name="productionLineShiftIds"
            label="产线班次"
            tooltip="选择后，开线维护和产量记录中的班次选择将限制为选中的班次"
            rules={[{ type: 'array', message: '请选择产线班次' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择产线班次"
              allowClear
              showSearch
              optionFilterProp="label"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {allShifts.map((shift: any) => (
                <Select.Option
                  key={shift.id}
                  value={shift.id}
                  label={`${shift.name} (${shift.code})`}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{shift.name}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>
                      {shift.code} | {shift.startTime} - {shift.endTime}
                    </div>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Divider />

          <Title level={5}>工时代码配置</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            配置工时分配过程中的工时代码，用于标识不同类型的工时记录
          </Text>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="actualHoursAllocationCode"
                label="按实际工时方式分配的工时代码"
                tooltip="用于标识按实际工时比例分配间接工时后生成的工时记录"
                rules={[{ required: true, message: '请选择工时代码' }]}
              >
                <Select
                  placeholder="请选择工时代码"
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {attendanceCodes.map((code: any) => (
                    <Select.Option
                      key={code.code}
                      value={code.code}
                      label={`${code.name} (${code.code})`}
                    >
                      {code.name} ({code.code})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="indirectHoursAllocationCode"
                label="间接工时分配后的工时代码"
                tooltip="用于标识间接工时分配完成后生成的工时记录代码"
                rules={[{ required: true, message: '请选择工时代码' }]}
              >
                <Select
                  placeholder="请选择工时代码"
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {attendanceCodes.map((code: any) => (
                    <Select.Option
                      key={code.code}
                      value={code.code}
                      label={`${code.name} (${code.code})`}
                    >
                      {code.name} ({code.code})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Title level={5}>配置说明</Title>
          <div style={{ background: '#f0f5ff', padding: 16, borderRadius: 8 }}>
            <Text>
              • <strong>产线对应层级</strong>：配置后，新增开线维护和产量记录时，组织选择将自动过滤为该类型的组织，不再需要手动从组织树中选择<br />
              • <strong>产线班次</strong>：配置后，开线维护和产量记录中的班次选择将限制为选中的班次，避免选择错误的班次<br />
              • 配置前请确保已在"劳动力账户 - 层级配置"中创建相应的组织层级<br />
              • 修改此配置后，仅在新增开线和产量记录时生效，已存在的记录不受影响
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default AllocationBasicConfigPage;
