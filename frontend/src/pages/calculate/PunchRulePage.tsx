import { useState } from 'react';
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
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import { ModernPageLayout } from '@/components/common/ModernPageLayout';

const PunchRulePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

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
      form.setFieldsValue({
        ...record,
        configs: JSON.parse(record.configs || '[]'),
      });
    } else {
      setEditingId(null);
      form.resetFields();
      form.setFieldsValue({
        status: 'ACTIVE',
        priority: 1,
        beforeShiftMins: 0,
        afterShiftMins: 0,
        configs: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingId(null);
    form.resetFields();
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (!values.configs || values.configs.length === 0) {
        message.warning('请至少添加一套设备组配置');
        return;
      }

      const data = {
        ...values,
        configs: values.configs,
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
      title: '配置数',
      dataIndex: 'configs',
      key: 'configs',
      width: 100,
      render: (configs: string) => {
        try {
          const parsed = JSON.parse(configs || '[]');
          return <Tag color="purple">{parsed.length}套</Tag>;
        } catch {
          return <Tag>0套</Tag>;
        }
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
            background: 'linear-gradient(135deg, #22B970 0%, rgba(255, 255, 255, 0.2) 100%)',
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
          color: '#22B970',
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
        width={800}
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
              >
                <Input placeholder="请输入规则编码" />
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
              <Form.Item name="beforeShiftMins" label="班前分钟数">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="默认0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="afterShiftMins" label="班后分钟数">
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

          <Form.Item
            name="configs"
            label="设备组配置"
            rules={[{ required: true, message: '请添加设备组配置' }]}
          >
            <Select
              mode="multiple"
              placeholder="选择设备组"
              options={deviceGroups?.map((group: any) => ({
                label: group.name,
                value: group.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </ModernPageLayout>
  );
};

export default PunchRulePage;
