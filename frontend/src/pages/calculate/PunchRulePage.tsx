import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Modal,
  message,
  Space,
  Tag,
  Alert,
  Row,
  Col,
  Popconfirm,
  Divider,
  Tabs,
  Switch,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import { ModernPageLayout } from '@/components/common/ModernPageLayout';

interface DeviceGroupInterval {
  id?: number;
  deviceGroupId: number;
  deviceGroupCode: string;
  deviceGroupName: string;
  beforeShiftMins: number;
  afterShiftMins: number;
}

// 有排班配置接口
interface ScheduledConfig {
  punchInterval: number;
  shiftStart: {
    earlyStart: {
      range: number;
      count: number;
      deviceGroupIds: number[];
    };
    lateStart: {
      range: number;
      count: number;
      deviceGroupIds: number[];
    };
  };
  shiftEnd: {
    earlyEnd: {
      range: number;
      count: number;
      deviceGroupIds: number[];
    };
    lateEnd: {
      range: number;
      count: number;
      deviceGroupIds: number[];
    };
  };
}

// 未排班配置接口
interface UnscheduledConfig {
  requirePunch: boolean;
  punchInterval: number;
  work: {
    startAfterShift: boolean;
    endBeforeShift: boolean;
    deviceGroupIds: number[];
  };
  off: {
    endRange: number;
    deviceGroupIds: number[];
  };
}

const PunchRulePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deviceGroupIntervals, setDeviceGroupIntervals] = useState<DeviceGroupInterval[]>([]);
  const [activeTab, setActiveTab] = useState('lean_pairing'); // lean_pairing | scheduled | unscheduled

  // 获取打卡规则
  const { data: punchRules, isLoading } = useQuery({
    queryKey: ['punchRules'],
    queryFn: () => request.get('/calculate/punch-rules').then((res: any) => res),
  });

  // 获取设备组（用于打卡规则配置）
  const { data: deviceGroups } = useQuery({
    queryKey: ['device-groups'],
    queryFn: () => request.get('/punch/device-groups').then((res: any) => res),
  });

  // 创建打卡规则
  const createMutation = useMutation({
    mutationFn: (data: any) => request.post('/calculate/punch-rules', data),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['punchRules'] });
      handleModalClose();
    },
    onError: (error: any) => {
      console.error('创建打卡规则失败:', error);
      message.error(error?.response?.data?.message || '创建失败，请重试');
    },
  });

  // 更新打卡规则
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      request.put(`/calculate/punch-rules/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['punchRules'] });
      handleModalClose();
    },
    onError: (error: any) => {
      console.error('更新打卡规则失败:', error);
      message.error(error?.response?.data?.message || '更新失败，请重试');
    },
  });

  // 删除打卡规则
  const deleteMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/calculate/punch-rules/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['punchRules'] });
    },
    onError: (error: any) => {
      console.error('删除打卡规则失败:', error);
      message.error(error?.response?.data?.message || '删除失败，请重试');
    },
  });

  const handleModalOpen = (record?: any) => {
    if (record) {
      setEditingId(record.id);
      setDeviceGroupIntervals(record.deviceGroupIntervals || []);
      // 设置当前选中的tab
      setActiveTab(record.ruleType || 'lean_pairing');
      form.setFieldsValue({
        ...record,
        configs: JSON.parse(record.configs || '[]'),
        scheduledConfig: record.scheduledConfig,
        unscheduledConfig: record.unscheduledConfig,
      });
    } else {
      setEditingId(null);
      setDeviceGroupIntervals([]);
      setActiveTab('lean_pairing');
      form.resetFields();
      form.setFieldsValue({
        status: 'ACTIVE',
        priority: 1,
        beforeShiftMins: 0,
        afterShiftMins: 0,
        configs: [],
        ruleType: 'lean_pairing',
      });
    }
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setDeviceGroupIntervals([]);
    form.resetFields();
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleAddDeviceGroupInterval = () => {
    // 从设备组列表中选择一个未配置的设备组
    const configuredIds = deviceGroupIntervals.map(item => item.deviceGroupId);
    const availableGroups = deviceGroups?.filter((group: any) => !configuredIds.includes(group.id)) || [];

    if (availableGroups.length === 0) {
      message.warning('没有可用的设备组，所有设备组已配置');
      return;
    }

    // 使用第一个可用设备组
    const group = availableGroups[0];
    const newInterval: DeviceGroupInterval = {
      deviceGroupId: group.id,
      deviceGroupCode: group.code,
      deviceGroupName: group.name,
      beforeShiftMins: 0,
      afterShiftMins: 0,
    };

    setDeviceGroupIntervals([...deviceGroupIntervals, newInterval]);
  };

  const handleRemoveDeviceGroupInterval = (index: number) => {
    const newIntervals = deviceGroupIntervals.filter((_, i) => i !== index);
    setDeviceGroupIntervals(newIntervals);
  };

  const handleUpdateDeviceGroupInterval = (index: number, field: keyof DeviceGroupInterval, value: any) => {
    const newIntervals = [...deviceGroupIntervals];
    newIntervals[index] = { ...newIntervals[index], [field]: value };
    setDeviceGroupIntervals(newIntervals);
  };

  const handleDeviceGroupChange = (index: number, deviceGroupId: number) => {
    const deviceGroup = deviceGroups?.find((group: any) => group.id === deviceGroupId);
    if (!deviceGroup) return;

    const newIntervals = [...deviceGroupIntervals];
    newIntervals[index] = {
      ...newIntervals[index],
      deviceGroupId,
      deviceGroupCode: deviceGroup.code,
      deviceGroupName: deviceGroup.name,
    };
    setDeviceGroupIntervals(newIntervals);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      // 检查设备组是否重复配置（仅针对精益成对打卡类型）
      if (activeTab === 'lean_pairing') {
        const deviceGroupIds = deviceGroupIntervals.map((item) => item.deviceGroupId);
        const uniqueIds = new Set(deviceGroupIds);
        if (uniqueIds.size !== deviceGroupIds.length) {
          message.error('同一打卡规则中，一个设备组不能配置多个刷卡间隔');
          return;
        }
      }

      // 根据当前选中�� tab 设置 ruleType
      const data = {
        ...values,
        ruleType: activeTab,
        deviceGroupIntervals: activeTab === 'lean_pairing' ? deviceGroupIntervals : [],
      };

      if (editingId) {
        updateMutation.mutate({ id: editingId, data });
      } else {
        createMutation.mutate(data);
      }
    });
  };

  const columns = [
    { title: '规则名称', dataIndex: 'name', key: 'name', width: 150 },
    { title: '规则编码', dataIndex: 'code', key: 'code', width: 150 },
    {
      title: '规则类型',
      dataIndex: 'ruleType',
      key: 'ruleType',
      width: 120,
      render: (ruleType: string) => {
        const typeMap: Record<string, { text: string; color: string }> = {
          lean_pairing: { text: '精益成对打卡', color: 'blue' },
          scheduled: { text: '有排班', color: 'green' },
          unscheduled: { text: '未排班', color: 'orange' },
        };
        const type = typeMap[ruleType] || { text: ruleType, color: 'default' };
        return <Tag color={type.color}>{type.text}</Tag>;
      },
    },
    { title: '优先级', dataIndex: 'priority', key: 'priority', width: 100 },
    {
      title: '班前/班后',
      key: 'beforeAfter',
      width: 150,
      render: (_: any, record: any) => (
        <span>
          {record.beforeShiftMins > 0 && <Tag color="blue">班前{record.beforeShiftMins}分钟</Tag>}
          {record.afterShiftMins > 0 && <Tag color="green">班后{record.afterShiftMins}分钟</Tag>}
          {record.beforeShiftMins === 0 && record.afterShiftMins === 0 && <Tag>未配置</Tag>}
        </span>
      ),
    },
    {
      title: '设备组间隔配置',
      key: 'deviceGroupIntervals',
      width: 200,
      render: (_: any, record: any) => {
        const intervals = record.deviceGroupIntervals || [];
        return intervals.length > 0 ? (
          <Tag color="purple">{intervals.length}个设备组</Tag>
        ) : (
          <Tag>未配置</Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) =>
        status === 'ACTIVE' ? (
          <Tag color="success">启用</Tag>
        ) : (
          <Tag color="default">禁用</Tag>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleModalOpen(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个规则吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ModernPageLayout
      title="打卡规则配置"
      description="配置收卡范围和设备组的摆卡间隔，支持配置多套设备组和摆卡间隔，系统按优先级顺序应用"
      breadcrumb={[
        { label: '计算管理', path: '/calculate' },
        { label: '打卡规则', path: '/calculate/config/punch-rules' },
      ]}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleModalOpen()}
          style={{
            background: 'linear-gradient(135deg, #00B365 0%, rgba(255, 255, 255, 0.2) 100%)',
            border: 'none',
            borderRadius: 8,
            fontWeight: 500,
          }}
        >
          新增规则
        </Button>
      }
      stats={[
        {
          title: '规则总数',
          value: punchRules?.length || 0,
          color: '#00B365',
        },
        {
          title: '启用中',
          value: punchRules?.filter((r: any) => r.status === 'ACTIVE').length || 0,
          color: '#10b981',
        },
      ]}
    >
      <Alert
        message="打卡规则说明"
        description="打卡规则用于配置收卡范围（班前班后分钟数）和设备组的摆卡间隔。可配置多套设备组配置，系统会按优先级顺序匹配规则。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #e2e8f0',
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <Table
          columns={columns}
          dataSource={punchRules || []}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={editingId ? '编辑打卡规则' : '新增打卡规则'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleModalClose}
        width={1200}
        okButtonProps={{ loading: createMutation.isPending || updateMutation.isPending }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="name"
                label="规则名称"
                rules={[{ required: true, message: '请输入规则名称' }]}
              >
                <Input placeholder="请输入规则名称" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="code"
                label="规则编码"
                rules={[{ required: true, message: '请输入规则编码' }]}
              >
                <Input placeholder="请输入规则编码" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="priority"
                label="优先级"
                rules={[{ required: true, message: '请输入优先级' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} placeholder="数字越小优先级越高" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="status"
            label="状态"
            initialValue="ACTIVE"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select>
              <Select.Option value="ACTIVE">启用</Select.Option>
              <Select.Option value="INACTIVE">禁用</Select.Option>
            </Select>
          </Form.Item>

          <Divider />

          <Form.Item name="ruleType" label="规则类型" initialValue="lean_pairing" hidden>
            <Input />
          </Form.Item>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'scheduled',
                label: '有排班',
                children: (
                  <Form.Item name={['scheduledConfig']} label=" ">
                    <ScheduledConfigForm deviceGroups={deviceGroups || []} />
                  </Form.Item>
                ),
              },
              {
                key: 'unscheduled',
                label: '未排班',
                children: (
                  <Form.Item name={['unscheduledConfig']} label=" ">
                    <UnscheduledConfigForm deviceGroups={deviceGroups || []} />
                  </Form.Item>
                ),
              },
              {
                key: 'lean_pairing',
                label: '精益成对打卡',
                children: (
                  <>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="beforeShiftMins" label="全局班前分钟数">
                          <InputNumber min={0} style={{ width: '100%' }} placeholder="默认0" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="afterShiftMins" label="全局班后分钟数">
                          <InputNumber min={0} style={{ width: '100%' }} placeholder="默认0" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider orientation="left">设备组间隔配置</Divider>
                    <Alert
                      message="设备组间隔配置说明"
                      description="针对特定设备组配置独立的刷卡间隔。如未配置，将使用全局间隔。设备组和间隔均为非必选项。"
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />

                    <Button
                      type="dashed"
                      onClick={handleAddDeviceGroupInterval}
                      block
                      icon={<PlusOutlined />}
                      style={{ marginBottom: 16 }}
                    >
                      添加设备组间隔配置
                    </Button>

                    {deviceGroupIntervals.length > 0 && (
                      <Table
                        dataSource={deviceGroupIntervals.map((item, index) => ({ ...item, index }))}
                        rowKey="index"
                        pagination={false}
                        size="small"
                        columns={[
                          {
                            title: '设备组',
                            dataIndex: 'deviceGroupName',
                            width: 200,
                            render: (_: any, record: any) => (
                              <Select
                                style={{ width: '100%' }}
                                value={record.deviceGroupId}
                                onChange={(value) => handleDeviceGroupChange(record.index, value)}
                                options={deviceGroups?.map((group: any) => ({
                                  label: group.name,
                                  value: group.id,
                                  disabled: deviceGroupIntervals.some(
                                    (item, idx) => idx !== record.index && item.deviceGroupId === group.id
                                  ),
                                }))}
                              />
                            ),
                          },
                          {
                            title: '班前间隔(分钟)',
                            dataIndex: 'beforeShiftMins',
                            width: 150,
                            render: (value: number, record: any) => (
                              <InputNumber
                                min={0}
                                style={{ width: '100%' }}
                                value={value}
                                onChange={(val) =>
                                  handleUpdateDeviceGroupInterval(record.index, 'beforeShiftMins', val || 0)
                                }
                                placeholder="0"
                              />
                            ),
                          },
                          {
                            title: '班后间隔(分钟)',
                            dataIndex: 'afterShiftMins',
                            width: 150,
                            render: (value: number, record: any) => (
                              <InputNumber
                                min={0}
                                style={{ width: '100%' }}
                                value={value}
                                onChange={(val) =>
                                  handleUpdateDeviceGroupInterval(record.index, 'afterShiftMins', val || 0)
                                }
                                placeholder="0"
                              />
                            ),
                          },
                          {
                            title: '操作',
                            width: 80,
                            render: (_: any, record: any) => (
                              <Button
                                type="link"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => handleRemoveDeviceGroupInterval(record.index)}
                              >
                                删除
                              </Button>
                            ),
                          },
                        ]}
                      />
                    )}
                  </>
                ),
              },
            ]}
          />
        </Form>
      </Modal>
    </ModernPageLayout>
  );
};

// 有排班配置组件
interface ScheduledConfigFormProps {
  deviceGroups: any[];
  value?: ScheduledConfig;
  onChange?: (value: ScheduledConfig) => void;
}

const ScheduledConfigForm: React.FC<ScheduledConfigFormProps> = ({ deviceGroups, value, onChange }) => {
  const [config, setConfig] = useState<ScheduledConfig>(
    value || {
      punchInterval: 0,
      shiftStart: {
        earlyStart: { range: 0, count: 0, deviceGroupIds: [] },
        lateStart: { range: 0, count: 0, deviceGroupIds: [] },
      },
      shiftEnd: {
        earlyEnd: { range: 0, count: 0, deviceGroupIds: [] },
        lateEnd: { range: 0, count: 0, deviceGroupIds: [] },
      },
    }
  );

  React.useEffect(() => {
    if (value) {
      setConfig(value);
    }
  }, [value]);

  const updateConfig = (path: string, fieldValue: any) => {
    const newConfig = { ...config };
    const keys = path.split('.');
    let current: any = newConfig;
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = fieldValue;
    setConfig(newConfig);
    onChange?.(newConfig);
  };

  return (
    <div>
      <Alert
        message="有排班配置说明"
        description="配置有排班情况下的打卡规则，包括排班开始和结束时的早/晚打卡范围、笔数和刷卡设备。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form layout="vertical">
        <Form.Item label="打卡间隔（分钟）">
          <InputNumber
            min={0}
            value={config.punchInterval}
            onChange={(val) => updateConfig('punchInterval', val || 0)}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Divider orientation="left">排班开始配置</Divider>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="早开始范围（分钟）">
              <InputNumber
                min={0}
                value={config.shiftStart.earlyStart.range}
                onChange={(val) => updateConfig('shiftStart.earlyStart.range', val || 0)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="早开始打卡笔数">
              <InputNumber
                min={0}
                value={config.shiftStart.earlyStart.count}
                onChange={(val) => updateConfig('shiftStart.earlyStart.count', val || 0)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="早开始刷卡设备">
              <Select
                mode="multiple"
                value={config.shiftStart.earlyStart.deviceGroupIds}
                onChange={(val) => updateConfig('shiftStart.earlyStart.deviceGroupIds', val)}
                options={deviceGroups.map((group) => ({ label: group.name, value: group.id }))}
                style={{ width: '100%' }}
                placeholder="请选择设备组"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="晚开始范围（分钟）">
              <InputNumber
                min={0}
                value={config.shiftStart.lateStart.range}
                onChange={(val) => updateConfig('shiftStart.lateStart.range', val || 0)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="晚开始打卡笔数">
              <InputNumber
                min={0}
                value={config.shiftStart.lateStart.count}
                onChange={(val) => updateConfig('shiftStart.lateStart.count', val || 0)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="晚开始刷卡设备">
              <Select
                mode="multiple"
                value={config.shiftStart.lateStart.deviceGroupIds}
                onChange={(val) => updateConfig('shiftStart.lateStart.deviceGroupIds', val)}
                options={deviceGroups.map((group) => ({ label: group.name, value: group.id }))}
                style={{ width: '100%' }}
                placeholder="请选择设备组"
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">排班结束配置</Divider>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="早结束范围（分钟）">
              <InputNumber
                min={0}
                value={config.shiftEnd.earlyEnd.range}
                onChange={(val) => updateConfig('shiftEnd.earlyEnd.range', val || 0)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="早结束打卡笔数">
              <InputNumber
                min={0}
                value={config.shiftEnd.earlyEnd.count}
                onChange={(val) => updateConfig('shiftEnd.earlyEnd.count', val || 0)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="早结束刷卡设备">
              <Select
                mode="multiple"
                value={config.shiftEnd.earlyEnd.deviceGroupIds}
                onChange={(val) => updateConfig('shiftEnd.earlyEnd.deviceGroupIds', val)}
                options={deviceGroups.map((group) => ({ label: group.name, value: group.id }))}
                style={{ width: '100%' }}
                placeholder="请选择设备组"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="晚结束范围（分钟）">
              <InputNumber
                min={0}
                value={config.shiftEnd.lateEnd.range}
                onChange={(val) => updateConfig('shiftEnd.lateEnd.range', val || 0)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="晚结束打卡笔数">
              <InputNumber
                min={0}
                value={config.shiftEnd.lateEnd.count}
                onChange={(val) => updateConfig('shiftEnd.lateEnd.count', val || 0)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="晚结束刷卡设备">
              <Select
                mode="multiple"
                value={config.shiftEnd.lateEnd.deviceGroupIds}
                onChange={(val) => updateConfig('shiftEnd.lateEnd.deviceGroupIds', val)}
                options={deviceGroups.map((group) => ({ label: group.name, value: group.id }))}
                style={{ width: '100%' }}
                placeholder="请选择设备组"
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

// 未排班配置组件
interface UnscheduledConfigFormProps {
  deviceGroups: any[];
  value?: UnscheduledConfig;
  onChange?: (value: UnscheduledConfig) => void;
}

const UnscheduledConfigForm: React.FC<UnscheduledConfigFormProps> = ({ deviceGroups, value, onChange }) => {
  const [config, setConfig] = useState<UnscheduledConfig>(
    value || {
      requirePunch: true,
      punchInterval: 0,
      work: {
        startAfterShift: false,
        endBeforeShift: false,
        deviceGroupIds: [],
      },
      off: {
        endRange: 0,
        deviceGroupIds: [],
      },
    }
  );

  React.useEffect(() => {
    if (value) {
      setConfig(value);
    }
  }, [value]);

  const updateConfig = (path: string, fieldValue: any) => {
    const newConfig = { ...config };
    const keys = path.split('.');
    let current: any = newConfig;
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = fieldValue;
    setConfig(newConfig);
    onChange?.(newConfig);
  };

  return (
    <div>
      <Alert
        message="未排班配置说明"
        description="配置未排班情况下的打卡规则，包括是否需要打卡、打卡间隔、上班/下班配置等。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="是否需要打卡">
              <Switch
                checked={config.requirePunch}
                onChange={(val) => updateConfig('requirePunch', val)}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="打卡间隔（分钟）">
              <InputNumber
                min={0}
                value={config.punchInterval}
                onChange={(val) => updateConfig('punchInterval', val || 0)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">未排班上班配置</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="班次后未排班开始">
              <Switch
                checked={config.work.startAfterShift}
                onChange={(val) => updateConfig('work.startAfterShift', val)}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="班次前未排班结束">
              <Switch
                checked={config.work.endBeforeShift}
                onChange={(val) => updateConfig('work.endBeforeShift', val)}
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="刷卡设备">
          <Select
            mode="multiple"
            value={config.work.deviceGroupIds}
            onChange={(val) => updateConfig('work.deviceGroupIds', val)}
            options={deviceGroups.map((group) => ({ label: group.name, value: group.id }))}
            style={{ width: '100%' }}
            placeholder="请选择设备组"
          />
        </Form.Item>

        <Divider orientation="left">未排班下班配置</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="未排班结束范围（分钟）">
              <InputNumber
                min={0}
                value={config.off.endRange}
                onChange={(val) => updateConfig('off.endRange', val || 0)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="刷卡设备">
              <Select
                mode="multiple"
                value={config.off.deviceGroupIds}
                onChange={(val) => updateConfig('off.deviceGroupIds', val)}
                options={deviceGroups.map((group) => ({ label: group.name, value: group.id }))}
                style={{ width: '100%' }}
                placeholder="请选择设备组"
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default PunchRulePage;
