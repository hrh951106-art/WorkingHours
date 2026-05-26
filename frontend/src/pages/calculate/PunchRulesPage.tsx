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
  Descriptions,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

// 有排班配置接口
interface ScheduledConfig {
  punchInterval: number;
  workStart: {
    earlyRange: number;
    lateRange: number;
    countType: 'FIRST' | 'LAST' | 'CUSTOM';
    count?: number;
    deviceGroupIds: number[];
  };
  workEnd: {
    earlyRange: number;
    lateRange: number;
    countType: 'FIRST' | 'LAST' | 'CUSTOM';
    count?: number;
    deviceGroupIds: number[];
  };
}

// 未排班配置接口
interface UnscheduledConfig {
  requirePunch: boolean;
  punchInterval: number;
  work: {
    startAfterShiftMins: number;
    endBeforeShiftMins: number;
    deviceGroupIds: number[];
  };
  off: {
    endBeforeShiftMins: number;
    deviceGroupIds: number[];
  };
}

interface DeviceGroupInterval {
  id?: number;
  deviceGroupId: number;
  deviceGroupCode: string;
  deviceGroupName: string;
  beforeShiftMins: number;
  afterShiftMins: number;
}

const PunchRulesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingType, setEditingType] = useState<'attendance' | 'lean'>('attendance');
  const [activeRuleType, setActiveRuleType] = useState<'scheduled' | 'unscheduled'>('scheduled');
  const [activeTab, setActiveTab] = useState<'attendance' | 'lean'>('attendance');
  const [deviceGroupIntervals, setDeviceGroupIntervals] = useState<DeviceGroupInterval[]>([]);
  const [scheduledConfig, setScheduledConfig] = useState<ScheduledConfig>({
    punchInterval: 0,
    workStart: {
      earlyRange: 0,
      lateRange: 0,
      countType: 'FIRST',
      deviceGroupIds: [],
    },
    workEnd: {
      earlyRange: 0,
      lateRange: 0,
      countType: 'LAST',
      deviceGroupIds: [],
    },
  });
  const [unscheduledConfig, setUnscheduledConfig] = useState<UnscheduledConfig>({
    requirePunch: true,
    punchInterval: 0,
    work: {
      startAfterShiftMins: 0,
      endBeforeShiftMins: 0,
      deviceGroupIds: [],
    },
    off: {
      endBeforeShiftMins: 0,
      deviceGroupIds: [],
    },
  });

  // 获取考勤打卡规则
  const { data: attendanceRules, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendancePunchRules'],
    queryFn: () =>
      request
        .get('/calculate/punch-rules')
        .then((res: any) => res.filter((r: any) => r.ruleType === 'ATTENDANCE_PAIRING')),
  });

  // 获取精益打卡规则
  const { data: leanRules, isLoading: leanLoading } = useQuery({
    queryKey: ['leanPunchRules'],
    queryFn: () =>
      request.get('/calculate/punch-rules').then((res: any) => res.filter((r: any) => r.ruleType === 'LEAN_PAIRING')),
  });

  // 获取设备组
  const { data: deviceGroups } = useQuery({
    queryKey: ['device-groups'],
    queryFn: () => request.get('/punch/device-groups').then((res: any) => res),
  });

  // 创建打卡规则
  const createMutation = useMutation({
    mutationFn: (data: any) => request.post('/calculate/punch-rules', data),
    onSuccess: (_, variables) => {
      message.success('创建成功');
      if (variables.ruleType === 'LEAN_PAIRING') {
        queryClient.invalidateQueries({ queryKey: ['leanPunchRules'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['attendancePunchRules'] });
      }
      handleModalClose();
    },
    onError: (error: any) => {
      console.error('创建打卡规则失败:', error);
      console.error('错误响应:', error?.response);
      console.error('错误数据:', error?.response?.data);
      console.error('错误消息:', error?.response?.data?.message);
      console.error('错误状态:', error?.response?.status);

      // 显示详细错误信息
      const errorMsg = error?.response?.data?.message ||
                      error?.message ||
                      '创建失败，请重试';
      message.error(errorMsg);
    },
  });

  // 更新打卡规则
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => request.put(`/calculate/punch-rules/${id}`, data),
    onSuccess: (_, variables) => {
      message.success('更新成功');
      if (variables.data.ruleType === 'LEAN_PAIRING') {
        queryClient.invalidateQueries({ queryKey: ['leanPunchRules'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['attendancePunchRules'] });
      }
      handleModalClose();
    },
    onError: (error: any) => {
      console.error('更新打卡规则失败:', error);
      message.error(error?.response?.data?.message || '更新失败，请重试');
    },
  });

  // 删除打卡规则
  const deleteMutation = useMutation({
    mutationFn: ({ id, type }: { id: number; type: string }) => {
      return request.delete(`/calculate/punch-rules/${id}`).then(() => {
        if (type === 'LEAN_PAIRING') {
          queryClient.invalidateQueries({ queryKey: ['leanPunchRules'] });
        } else {
          queryClient.invalidateQueries({ queryKey: ['attendancePunchRules'] });
        }
      });
    },
    onSuccess: () => {
      message.success('删除成功');
    },
    onError: (error: any) => {
      console.error('删除打卡规则失败:', error);
      message.error(error?.response?.data?.message || '删除失败，请重试');
    },
  });

  const handleModalOpen = async (type: 'attendance' | 'lean', record?: any) => {
    setEditingType(type);
    if (record) {
      setEditingId(record.id);
      if (type === 'lean') {
        setDeviceGroupIntervals(record.deviceGroupIntervals || []);
      } else {
        // 考勤打卡规则：同时加载两种配置

        // 智能判断默认页签：优先显示有配置的页签
        const hasScheduled = record.scheduledConfig !== null && record.scheduledConfig !== undefined;
        const hasUnscheduled = record.unscheduledConfig !== null && record.unscheduledConfig !== undefined;

        if (hasScheduled) {
          setActiveRuleType('scheduled');
        } else if (hasUnscheduled) {
          setActiveRuleType('unscheduled');
        } else {
          setActiveRuleType('scheduled'); // 默认显示有排班
        }

        // 解析并加载有排班配置
        if (record.scheduledConfig) {
          const config = typeof record.scheduledConfig === 'string'
            ? JSON.parse(record.scheduledConfig)
            : record.scheduledConfig;
          setScheduledConfig(config);
        } else {
          // 如果没有配置，使用默认值
          setScheduledConfig({
            punchInterval: 0,
            workStart: {
              earlyRange: 0,
              lateRange: 0,
              countType: 'FIRST',
              deviceGroupIds: [],
            },
            workEnd: {
              earlyRange: 0,
              lateRange: 0,
              countType: 'LAST',
              deviceGroupIds: [],
            },
          });
        }

        // 解析并加载未排班配置
        if (record.unscheduledConfig) {
          const config = typeof record.unscheduledConfig === 'string'
            ? JSON.parse(record.unscheduledConfig)
            : record.unscheduledConfig;
          setUnscheduledConfig(config);
        } else {
          // 如果没有配置，使用默认值
          setUnscheduledConfig({
            requirePunch: true,
            punchInterval: 0,
            work: {
              startAfterShiftMins: 0,
              endBeforeShiftMins: 0,
              deviceGroupIds: [],
            },
            off: {
              endBeforeShiftMins: 0,
              deviceGroupIds: [],
            },
          });
        }
      }
      form.setFieldsValue({
        ...record,
      });
      setIsModalOpen(true);
    } else {
      setEditingId(null);
      setDeviceGroupIntervals([]);
      setActiveRuleType('scheduled');
      form.resetFields();

      // 重置配置
      setScheduledConfig({
        punchInterval: 0,
        workStart: {
          earlyRange: 0,
          lateRange: 0,
          countType: 'FIRST',
          deviceGroupIds: [],
        },
        workEnd: {
          earlyRange: 0,
          lateRange: 0,
          countType: 'LAST',
          deviceGroupIds: [],
        },
      });
      setUnscheduledConfig({
        requirePunch: true,
        punchInterval: 0,
        work: {
          startAfterShiftMins: 0,
          endBeforeShiftMins: 0,
          deviceGroupIds: [],
        },
        off: {
          endBeforeShiftMins: 0,
          deviceGroupIds: [],
        },
      });
      if (type === 'lean') {
        form.setFieldsValue({
          status: 'ACTIVE',
          priority: 1,
          beforeShiftMins: 0,
          afterShiftMins: 0,
          ruleType: 'LEAN_PAIRING',
          configs: [],
        });
      } else {
        form.setFieldsValue({
          status: 'ACTIVE',
          priority: 1,
          ruleType: 'ATTENDANCE_PAIRING', // 考勤打卡规则的类型
        });
      }

      try {
        // 自动生成编码（在设置其他字段之后）
        const res = await request.get('/calculate/punch-rules/new-code');
        form.setFieldsValue({ code: res.code });
      } catch (error) {
        console.error('生成编码失败:', error);
        // 即使生成编码失败，也打开弹窗
      }
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setDeviceGroupIntervals([]);
    form.resetFields();
    // 重置配置
    setScheduledConfig({
      punchInterval: 0,
      workStart: {
        earlyRange: 0,
        lateRange: 0,
        countType: 'FIRST',
        deviceGroupIds: [],
      },
      workEnd: {
        earlyRange: 0,
        lateRange: 0,
        countType: 'LAST',
        deviceGroupIds: [],
      },
    });
    setUnscheduledConfig({
      requirePunch: true,
      punchInterval: 0,
      work: {
        startAfterShiftMins: 0,
        endBeforeShiftMins: 0,
        deviceGroupIds: [],
      },
      off: {
        endBeforeShiftMins: 0,
        deviceGroupIds: [],
      },
    });
  };

  const handleDelete = (id: number, type: string) => {
    deleteMutation.mutate({ id, type });
  };

  const handleAddDeviceGroupInterval = () => {
    const configuredIds = deviceGroupIntervals.map((item) => item.deviceGroupId);
    const availableGroups = deviceGroups?.filter((group: any) => !configuredIds.includes(group.id)) || [];

    if (availableGroups.length === 0) {
      message.warning('没有可用的设备组，所有设备组已配置');
      return;
    }

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
      if (editingType === 'lean') {
        const deviceGroupIds = deviceGroupIntervals.map((item) => item.deviceGroupId);
        const uniqueIds = new Set(deviceGroupIds);
        if (uniqueIds.size !== deviceGroupIds.length) {
          message.error('同一打卡规则中，一个设备组不能配置多个刷卡间隔');
          return;
        }

        const data = {
          ...values,
          ruleType: 'LEAN_PAIRING',
          deviceGroupIntervals,
        };

        console.log('创建精益打卡规则:', data);

        if (editingId) {
          updateMutation.mutate({ id: editingId, data });
        } else {
          createMutation.mutate(data);
        }
      } else {
        // 考勤打卡规则 - 同时保存有排班和未排班配置
        const data = {
          name: values.name,
          code: values.code,
          priority: values.priority || 1,
          status: values.status || 'ACTIVE',
          ruleType: 'ATTENDANCE_PAIRING', // 考勤打卡规则的类型
          // 同时保存两种配置，互不影响
          scheduledConfig: scheduledConfig,
          unscheduledConfig: unscheduledConfig,
        };

        console.log('创建考勤打卡规则:', data);

        if (editingId) {
          updateMutation.mutate({ id: editingId, data });
        } else {
          createMutation.mutate(data);
        }
      }
    }).catch((error) => {
      console.error('表单验证失败:', error);
      message.error('请检查表单填写是否完整');
    });
  };

  // 考勤打卡规则表格列
  const attendanceColumns = [
    { title: '规则名称', dataIndex: 'name', key: 'name', width: 150 },
    { title: '规则编码', dataIndex: 'code', key: 'code', width: 150 },
    {
      title: '配置摘要',
      key: 'configSummary',
      width: 300,
      render: (_: any, record: any) => {
        const parts = [];

        if (record.scheduledConfig) {
          const config = typeof record.scheduledConfig === 'string'
            ? JSON.parse(record.scheduledConfig)
            : record.scheduledConfig;
          parts.push(
            <Tag key="scheduled" color="green">有排班</Tag>,
            <Tag key="scheduled-interval" color="blue">间隔:{config.punchInterval}分钟</Tag>
          );
        }

        if (record.unscheduledConfig) {
          const config = typeof record.unscheduledConfig === 'string'
            ? JSON.parse(record.unscheduledConfig)
            : record.unscheduledConfig;
          parts.push(
            <Tag key="unscheduled" color="orange">未排班</Tag>,
            config.requirePunch && <Tag key="require" color="cyan">需打卡</Tag>
          );
        }

        return <Space size="small" wrap>{parts}</Space>;
      },
    },
    { title: '优先级', dataIndex: 'priority', key: 'priority', width: 100 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) =>
        status === 'ACTIVE' ? <Tag color="success">启用</Tag> : <Tag color="default">禁用</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleModalOpen('attendance', record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个规则吗？"
            onConfirm={() => handleDelete(record.id, record.ruleType)}
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

  // 考勤打卡规则展开内容
  const attendanceExpandedRowRender = (record: any) => {
    return (
      <Card size="small" title="详细配置" style={{ margin: 0 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* 有排班配置 */}
          {record.scheduledConfig && (
            <div>
              <Divider orientation="left" style={{ margin: '0 0 16px 0', fontSize: 14 }}>
                <Tag color="green">有排班配置</Tag>
              </Divider>
              {(() => {
                const config = typeof record.scheduledConfig === 'string'
                  ? JSON.parse(record.scheduledConfig)
                  : record.scheduledConfig;
                return (
                  <Descriptions column={2} size="small" bordered>
                    <Descriptions.Item label="打卡间隔">{config.punchInterval} 分钟</Descriptions.Item>
                    <Descriptions.Item label="早开始范围">{config.workStart?.earlyRange || 0} 分钟</Descriptions.Item>
                    <Descriptions.Item label="晚开始范围">{config.workStart?.lateRange || 0} 分钟</Descriptions.Item>
                    <Descriptions.Item label="上班打卡笔数">
                      {config.workStart?.countType === 'CUSTOM'
                        ? `第${config.workStart?.count}笔`
                        : config.workStart?.countType === 'FIRST' ? '第一笔' : '最后一笔'}
                    </Descriptions.Item>
                    <Descriptions.Item label="早结束范围">{config.workEnd?.earlyRange || 0} 分钟</Descriptions.Item>
                    <Descriptions.Item label="晚结束范围">{config.workEnd?.lateRange || 0} 分钟</Descriptions.Item>
                    <Descriptions.Item label="下班打卡笔数">
                      {config.workEnd?.countType === 'CUSTOM'
                        ? `第${config.workEnd?.count}笔`
                        : config.workEnd?.countType === 'FIRST' ? '第一笔' : '最后一笔'}
                    </Descriptions.Item>
                    <Descriptions.Item label="上班设备组">
                      {config.workStart?.deviceGroupIds?.length || 0} 个
                    </Descriptions.Item>
                    <Descriptions.Item label="下班设备组">
                      {config.workEnd?.deviceGroupIds?.length || 0} 个
                    </Descriptions.Item>
                  </Descriptions>
                );
              })()}
            </div>
          )}

          {/* 未排班配置 */}
          {record.unscheduledConfig && (
            <div>
              <Divider orientation="left" style={{ margin: '0 0 16px 0', fontSize: 14 }}>
                <Tag color="orange">未排班配置</Tag>
              </Divider>
              {(() => {
                const config = typeof record.unscheduledConfig === 'string'
                  ? JSON.parse(record.unscheduledConfig)
                  : record.unscheduledConfig;
                return (
                  <Descriptions column={2} size="small" bordered>
                    <Descriptions.Item label="是否需要打卡">
                      {config.requirePunch ? <Tag color="success">是</Tag> : <Tag>否</Tag>}
                    </Descriptions.Item>
                    <Descriptions.Item label="打卡间隔">{config.punchInterval} 分钟</Descriptions.Item>
                    <Descriptions.Item label="班次后开始">{config.work?.startAfterShiftMins || 0} 分钟</Descriptions.Item>
                    <Descriptions.Item label="班次前结束">{config.work?.endBeforeShiftMins || 0} 分钟</Descriptions.Item>
                    <Descriptions.Item label="班次前结束">{config.off?.endBeforeShiftMins || 0} 分钟</Descriptions.Item>
                    <Descriptions.Item label="上班设备组">{config.work?.deviceGroupIds?.length || 0} 个</Descriptions.Item>
                    <Descriptions.Item label="下班设备组">{config.off?.deviceGroupIds?.length || 0} 个</Descriptions.Item>
                  </Descriptions>
                );
              })()}
            </div>
          )}
        </Space>
      </Card>
    );
  };

  // 精益打卡规则表格列
  const leanColumns = [
    { title: '规则名称', dataIndex: 'name', key: 'name', width: 150 },
    { title: '规则编码', dataIndex: 'code', key: 'code', width: 150 },
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
        return intervals.length > 0 ? <Tag color="purple">{intervals.length}个设备组</Tag> : <Tag>未配置</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) =>
        status === 'ACTIVE' ? <Tag color="success">启用</Tag> : <Tag color="default">禁用</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleModalOpen('lean', record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个规则吗？"
            onConfirm={() => handleDelete(record.id, record.ruleType)}
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
    <>
      <Card
        title="打卡规则管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleModalOpen(activeTab)}
          >
            新建
          </Button>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as 'attendance' | 'lean')}
          items={[
            {
              key: 'attendance',
              label: '考勤打卡规则',
              children: (
                <Table
                  columns={attendanceColumns}
                  dataSource={attendanceRules || []}
                  rowKey="id"
                  loading={attendanceLoading}
                  pagination={false}
                  scroll={{ x: 1000 }}
                  expandable={{
                    expandedRowRender: attendanceExpandedRowRender,
                    defaultExpandAllRows: false,
                  }}
                />
              ),
            },
            {
              key: 'lean',
              label: '精益打卡规则',
              children: (
                <Table
                  columns={leanColumns}
                  dataSource={leanRules || []}
                  rowKey="id"
                  loading={leanLoading}
                  pagination={false}
                  scroll={{ x: 1000 }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* 考勤打卡规则Modal */}
      <Modal
        title={editingId ? '编辑考勤打卡规则' : '新增考勤打卡规则'}
        open={isModalOpen && editingType === 'attendance'}
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
                tooltip="系统自动生成，不可修改"
              >
                <Input placeholder="系统自动生成，保存后显示" disabled={true} />
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

          <Tabs
            activeKey={activeRuleType}
            onChange={(key) => setActiveRuleType(key as 'scheduled' | 'unscheduled')}
            items={[
              {
                key: 'scheduled',
                label: '有排班',
                children: (
                  <ScheduledConfigForm
                    deviceGroups={deviceGroups || []}
                    value={scheduledConfig}
                    onChange={setScheduledConfig}
                  />
                ),
              },
              {
                key: 'unscheduled',
                label: '未排班',
                children: (
                  <UnscheduledConfigForm
                    deviceGroups={deviceGroups || []}
                    value={unscheduledConfig}
                    onChange={setUnscheduledConfig}
                  />
                ),
              },
            ]}
          />
        </Form>
      </Modal>

      {/* 精益打卡规则Modal */}
      <Modal
        title={editingId ? '编辑精益打卡规则' : '新增精益打卡规则'}
        open={isModalOpen && editingType === 'lean'}
        onOk={handleSubmit}
        onCancel={handleModalClose}
        width={1000}
        okButtonProps={{ loading: createMutation.isPending || updateMutation.isPending }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="规则名称"
                rules={[{ required: true, message: '请输入规则名称' }]}
              >
                <Input placeholder="请输入规则名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="code"
                label="规则编码"
                rules={[{ required: true, message: '请输入规则编码' }]}
                tooltip="系统自动生成，不可修改"
              >
                <Input placeholder="系统自动生成，保存后显示" disabled={true} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="priority"
                label="优先级"
                rules={[{ required: true, message: '请输入优先级' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} placeholder="数字越小优先级越高" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="beforeShiftMins" label="全局班前分钟数">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="默认0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="afterShiftMins" label="全局班后分钟数">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="默认0" />
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
                      onChange={(val) => handleUpdateDeviceGroupInterval(record.index, 'beforeShiftMins', val || 0)}
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
                      onChange={(val) => handleUpdateDeviceGroupInterval(record.index, 'afterShiftMins', val || 0)}
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
        </Form>
      </Modal>
    </>
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
      workStart: {
        earlyRange: 0,
        lateRange: 0,
        countType: 'FIRST' as const,
        count: 1,
        deviceGroupIds: [],
      },
      workEnd: {
        earlyRange: 0,
        lateRange: 0,
        countType: 'FIRST' as const,
        count: 1,
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
        message="有排班配置说明"
        description="配置有排班情况下的打卡规则，包括上班卡和下班卡的打卡范围、笔数和刷卡设备。"
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

        <Divider orientation="left">上班卡配置</Divider>
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item label="早开始范围（分钟）">
              <InputNumber
                min={0}
                value={config.workStart.earlyRange}
                onChange={(val) => updateConfig('workStart.earlyRange', val || 0)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="晚开始范围（分钟）">
              <InputNumber
                min={0}
                value={config.workStart.lateRange}
                onChange={(val) => updateConfig('workStart.lateRange', val || 0)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="上班打卡笔数">
              <Select
                value={config.workStart.countType}
                onChange={(val) => updateConfig('workStart.countType', val)}
                style={{ width: '100%' }}
              >
                <Select.Option value="FIRST">第一笔</Select.Option>
                <Select.Option value="LAST">最后一笔</Select.Option>
                <Select.Option value="CUSTOM">自定义</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            {config.workStart.countType === 'CUSTOM' ? (
              <Form.Item label="自定义笔数">
                <InputNumber
                  min={1}
                  value={config.workStart.count || 1}
                  onChange={(val) => updateConfig('workStart.count', val || 1)}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            ) : (
              <Form.Item label="刷卡设备">
                <Select
                  mode="multiple"
                  value={config.workStart.deviceGroupIds}
                  onChange={(val) => updateConfig('workStart.deviceGroupIds', val)}
                  options={deviceGroups.map((group) => ({ label: group.name, value: group.id }))}
                  style={{ width: '100%' }}
                  placeholder="请选择设备组"
                />
              </Form.Item>
            )}
          </Col>
        </Row>
        {config.workStart.countType === 'CUSTOM' && (
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="刷卡设备">
                <Select
                  mode="multiple"
                  value={config.workStart.deviceGroupIds}
                  onChange={(val) => updateConfig('workStart.deviceGroupIds', val)}
                  options={deviceGroups.map((group) => ({ label: group.name, value: group.id }))}
                  style={{ width: '100%' }}
                  placeholder="请选择设备组"
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        <Divider orientation="left">下班卡配置</Divider>
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item label="早结束范围（分钟）">
              <InputNumber
                min={0}
                value={config.workEnd.earlyRange}
                onChange={(val) => updateConfig('workEnd.earlyRange', val || 0)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="晚结束范围（分钟）">
              <InputNumber
                min={0}
                value={config.workEnd.lateRange}
                onChange={(val) => updateConfig('workEnd.lateRange', val || 0)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="下班打卡笔数">
              <Select
                value={config.workEnd.countType}
                onChange={(val) => updateConfig('workEnd.countType', val)}
                style={{ width: '100%' }}
              >
                <Select.Option value="FIRST">第一笔</Select.Option>
                <Select.Option value="LAST">最后一笔</Select.Option>
                <Select.Option value="CUSTOM">自定义</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            {config.workEnd.countType === 'CUSTOM' ? (
              <Form.Item label="自定义笔数">
                <InputNumber
                  min={1}
                  value={config.workEnd.count || 1}
                  onChange={(val) => updateConfig('workEnd.count', val || 1)}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            ) : (
              <Form.Item label="刷卡设备">
                <Select
                  mode="multiple"
                  value={config.workEnd.deviceGroupIds}
                  onChange={(val) => updateConfig('workEnd.deviceGroupIds', val)}
                  options={deviceGroups.map((group) => ({ label: group.name, value: group.id }))}
                  style={{ width: '100%' }}
                  placeholder="请选择设备组"
                />
              </Form.Item>
            )}
          </Col>
        </Row>
        {config.workEnd.countType === 'CUSTOM' && (
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="刷卡设备">
                <Select
                  mode="multiple"
                  value={config.workEnd.deviceGroupIds}
                  onChange={(val) => updateConfig('workEnd.deviceGroupIds', val)}
                  options={deviceGroups.map((group) => ({ label: group.name, value: group.id }))}
                  style={{ width: '100%' }}
                  placeholder="请选择设备组"
                />
              </Form.Item>
            </Col>
          </Row>
        )}
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
        startAfterShiftMins: 0,
        endBeforeShiftMins: 0,
        deviceGroupIds: [],
      },
      off: {
        endBeforeShiftMins: 0,
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
        description="配置未排班情况下的打卡规则，包括是否需要打卡、打卡间隔、上班卡、下班卡配置等。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="是否需要打卡">
              <Switch checked={config.requirePunch} onChange={(val) => updateConfig('requirePunch', val)} />
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

        <Divider orientation="left">上班卡配置</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="班次后未排班开始（分钟）">
              <InputNumber
                min={0}
                value={config.work.startAfterShiftMins}
                onChange={(val) => updateConfig('work.startAfterShiftMins', val || 0)}
                style={{ width: '100%' }}
                placeholder="班次结束后多少分钟"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="班次前未排班结束（分钟）">
              <InputNumber
                min={0}
                value={config.work.endBeforeShiftMins}
                onChange={(val) => updateConfig('work.endBeforeShiftMins', val || 0)}
                style={{ width: '100%' }}
                placeholder="班次开始前多少分钟"
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

        <Divider orientation="left">下班卡配置</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="班次前未排班结束（分钟）">
              <InputNumber
                min={0}
                value={config.off.endBeforeShiftMins}
                onChange={(val) => updateConfig('off.endBeforeShiftMins', val || 0)}
                style={{ width: '100%' }}
                placeholder="班次开始前多少分钟"
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

export default PunchRulesPage;
