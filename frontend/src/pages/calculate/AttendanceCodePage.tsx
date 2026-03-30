import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Space,
  message,
  Tag,
  Popconfirm,
  Row,
  Col,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CalculatorOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import { ModernPageLayout } from '@/components/common/ModernPageLayout';

const { Option } = Select;

const AttendanceCodePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [includeOutside, setIncludeOutside] = useState(false);
  const [onlyOutside, setOnlyOutside] = useState(false);
  const [showInDetailPage, setShowInDetailPage] = useState(false);

  const { data: attendanceCodes, isLoading } = useQuery({
    queryKey: ['attendanceCodes'],
    queryFn: () => request.get('/calculate/attendance-codes').then((res: any) => res),
  });

  // 获取劳动力账户层级配置
  const { data: hierarchyLevels } = useQuery({
    queryKey: ['accountHierarchyLevels'],
    queryFn: () =>
      request.get('/account/hierarchy-config/levels').then((res: any) => {
        // 按sort排序并返回
        const levels = res || [];
        return levels.sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0));
      }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => request.post('/calculate/attendance-codes', data),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['attendanceCodes'] });
      handleModalClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      request.put(`/calculate/attendance-codes/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['attendanceCodes'] });
      handleModalClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/calculate/attendance-codes/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['attendanceCodes'] });
    },
  });

  const handleModalOpen = (record?: any) => {
    if (record) {
      setEditingId(record.id);
      const formValues = {
        ...record,
      };
      // 解析 accountLevels JSON 字符串为数组
      if (record.accountLevels) {
        try {
          formValues.accountLevels = JSON.parse(record.accountLevels);
        } catch {
          formValues.accountLevels = [];
        }
      }
      form.setFieldsValue(formValues);
      setIncludeOutside(record.includeOutside);
      setOnlyOutside(record.onlyOutside);
      setShowInDetailPage(record.showInDetailPage || false);
    } else {
      setEditingId(null);
      form.resetFields();
      setIncludeOutside(false);
      setOnlyOutside(false);
      setShowInDetailPage(false);
    }
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingId(null);
    form.resetFields();
    setIncludeOutside(false);
    setOnlyOutside(false);
    setShowInDetailPage(false);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 将 accountLevels 数组转换为 JSON 字符串
      const data = {
        ...values,
        accountLevels: values.accountLevels ? JSON.stringify(values.accountLevels) : '[]',
      };

      if (editingId) {
        updateMutation.mutate({ id: editingId, data });
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleIncludeOutsideChange = (checked: boolean) => {
    setIncludeOutside(checked);
    if (checked) {
      setOnlyOutside(false);
      form.setFieldValue('onlyOutside', false);
    }
  };

  const handleOnlyOutsideChange = (checked: boolean) => {
    setOnlyOutside(checked);
    if (checked) {
      setIncludeOutside(false);
      form.setFieldValue('includeOutside', false);
    }
  };

  const columns = [
    { title: '编码', dataIndex: 'code', key: 'code', width: 120 },
    { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const typeMap: any = {
          LEAN_HOURS: { text: '精益工时', color: 'blue' },
        };
        const config = typeMap[type] || { text: type, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      render: (unit: string) => (unit === 'HOURS' ? '小时' : '分钟'),
    },
    {
      title: '劳动力账户层级',
      dataIndex: 'accountLevels',
      key: 'accountLevels',
      width: 200,
      render: (levels: string) => {
        try {
          const parsed = JSON.parse(levels || '[]');
          if (parsed.length === 0) {
            return <Tag type="secondary">全部层级</Tag>;
          }

          // 根据层级sort值查找层级名称
          const levelNames = parsed.map((sortValue: number) => {
            const level = hierarchyLevels?.find((l: any) => l.sort === sortValue);
            return level ? level.name : `层级${sortValue + 1}`;
          });

          return <Tag color="blue">{levelNames.join(', ')}</Tag>;
        } catch {
          return <Tag type="secondary">全部层级</Tag>;
        }
      },
    },
    {
      title: '扣用餐',
      dataIndex: 'deductMeal',
      key: 'deductMeal',
      width: 80,
      render: (deduct: boolean) => (deduct ? <Tag color="orange">是</Tag> : <Tag>否</Tag>),
    },
    {
      title: '包含班外',
      dataIndex: 'includeOutside',
      key: 'includeOutside',
      width: 80,
      render: (include: boolean) => (include ? <Tag color="green">是</Tag> : <Tag>否</Tag>),
    },
    {
      title: '仅班外',
      dataIndex: 'onlyOutside',
      key: 'onlyOutside',
      width: 80,
      render: (only: boolean) => (only ? <Tag color="purple">是</Tag> : <Tag>否</Tag>),
    },
    {
      title: '工时明细显示',
      dataIndex: 'showInDetailPage',
      key: 'showInDetailPage',
      width: 100,
      render: (show: boolean) => (show ? <Tag color="cyan">是</Tag> : <Tag>否</Tag>),
    },
    {
      title: '计算工时',
      dataIndex: 'calculateHours',
      key: 'calculateHours',
      width: 100,
      render: (calculate: boolean) => (calculate ? <Tag color="green">是</Tag> : <Tag color="red">否</Tag>),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: number) => <Tag color="blue">{priority}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
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
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleModalOpen(record)}
            style={{ padding: 0 }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="出勤代码正在使用中，无法删除"
            onConfirm={() => {}}
            okText="确认"
            cancelText="取消"
            disabled={true}
          >
            <Button type="link" danger icon={<DeleteOutlined />} disabled style={{ padding: 0 }}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ModernPageLayout
      title="出勤代码定义"
      description="配置出勤代码规则，用于工时计算。可以设置是否扣用餐时间、是否包含班外时数等参数"
      breadcrumb={[
        { label: '计算管理', path: '/calculate' },
        { label: '出勤代码', path: '/calculate/config/attendance-codes' },
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
            height: 40,
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
          }}
        >
          新建出勤代码
        </Button>
      }
      stats={[
        {
          title: '出勤代码总数',
          value: attendanceCodes?.length || 0,
          prefix: <CalculatorOutlined style={{ color: '#22B970' }} />,
          color: '#22B970',
        },
        {
          title: '启用中',
          value: attendanceCodes?.filter((c: any) => c.status === 'ACTIVE').length || 0,
          color: '#10b981',
        },
      ]}
    >
      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #e2e8f0',
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <Table
          columns={columns}
          dataSource={attendanceCodes || []}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={editingId ? '编辑出勤代码' : '新建出勤代码'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleModalClose}
        width={600}
        okText="确认"
        cancelText="取消"
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            label="编码"
            name="code"
            rules={[{ required: true, message: '请输入编码' }]}
          >
            <Input placeholder="自动生成，可手动修改" />
          </Form.Item>

          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="请输入出勤代码名称" />
          </Form.Item>

          <Form.Item
            label="类型"
            name="type"
            initialValue="LEAN_HOURS"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select>
              <Option value="LEAN_HOURS">精益工时</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="单位"
            name="unit"
            initialValue="HOURS"
            rules={[{ required: true, message: '请选择单位' }]}
          >
            <Select>
              <Option value="HOURS">小时</Option>
              <Option value="MINUTES">分钟</Option>
            </Select>
          </Form.Item>

          <Form.Item label="劳动力账户层级" name="accountLevels" tooltip="留空表示适用于全部层级，否则仅适用于选中的层级">
            <Select
              mode="multiple"
              placeholder="选择层级，留空表示全部层级"
              options={hierarchyLevels?.map((level: any) => ({
                label: level.name,
                value: level.sort,
              }))}
              tokenSeparators={[',']}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item
            label="是否扣用餐"
            name="deductMeal"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="包含班外时数"
            name="includeOutside"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch onChange={handleIncludeOutsideChange} disabled={onlyOutside} />
          </Form.Item>

          <Form.Item
            label="仅计算班外时数"
            name="onlyOutside"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch onChange={handleOnlyOutsideChange} disabled={includeOutside} />
          </Form.Item>

          <Form.Item
            label="是否在工时明细管理页面显示"
            name="showInDetailPage"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="是否计算工时"
            name="calculateHours"
            valuePropName="checked"
            initialValue={true}
            tooltip="关闭后，该出勤代码将不参与工时计算"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="优先级"
            name="priority"
            initialValue={0}
            rules={[{ required: true, message: '请输入优先级' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="状态"
            name="status"
            initialValue="ACTIVE"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select>
              <Option value="ACTIVE">启用</Option>
              <Option value="INACTIVE">禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </ModernPageLayout>
  );
};

export default AttendanceCodePage;
