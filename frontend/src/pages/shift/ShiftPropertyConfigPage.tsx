import { useState } from 'react';
import { Card, Table, Button, Space, message, Modal, Form, Input, Select, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

interface PropertyDefinition {
  id?: number;
  propertyKey: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  sortOrder: number;
  valueType?: string;
  options?: any;
}

const ShiftPropertyConfigPage: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<PropertyDefinition | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取班次属性定义列表
  const { data: definitions = [], isLoading } = useQuery({
    queryKey: ['shiftPropertyDefinitions'],
    queryFn: () =>
      request.get('/shift/property-definitions').then((res: any) => res || []),
  });

  // 创建属性定义
  const createMutation = useMutation({
    mutationFn: (data: PropertyDefinition) =>
      request.post('/shift/property-definitions', data),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['shiftPropertyDefinitions'] });
      handleCancel();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '创建失败');
    },
  });

  // 更新属性定义
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: PropertyDefinition) =>
      request.put(`/shift/property-definitions/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['shiftPropertyDefinitions'] });
      handleCancel();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '更新失败');
    },
  });

  // 删除属性定义
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      request.delete(`/shift/property-definitions/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['shiftPropertyDefinitions'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '删除失败');
    },
  });

  const handleCreate = () => {
    setEditingDefinition(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'ACTIVE',
      sortOrder: 0,
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record: PropertyDefinition) => {
    setEditingDefinition(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingDefinition?.id) {
        updateMutation.mutate({
          id: editingDefinition.id,
          ...values,
        });
      } else {
        createMutation.mutate(values);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingDefinition(null);
    form.resetFields();
  };

  const columns = [
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
    },
    {
      title: '属性代码',
      dataIndex: 'propertyKey',
      key: 'propertyKey',
      width: 150,
    },
    {
      title: '属性名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          'ACTIVE': { text: '启用', color: 'green' },
          'INACTIVE': { text: '停用', color: 'red' },
        };
        const statusInfo = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={statusInfo.color === 'green' ? '#52c41a' : statusInfo.color === 'red' ? '#ff4d4f' : '#999'}>
          {statusInfo.text}
        </Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: PropertyDefinition) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，是否继续？"
            onConfirm={() => record.id && handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="班次属性配置"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增属性
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={definitions}
          rowKey="id"
          loading={isLoading}
          pagination={false}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingDefinition ? '编辑属性' : '新增属性'}
        open={isModalVisible}
        onCancel={handleCancel}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="属性代码"
            name="propertyKey"
            rules={[
              { required: true, message: '请输入属性代码' },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: '属性代码只能包含字母、数字、下划线和连字符' },
            ]}
            tooltip="属性的唯一标识，用于系统内部引用"
          >
            <Input placeholder="如：MORNING_SHIFT" disabled={!!editingDefinition} />
          </Form.Item>

          <Form.Item
            label="属性名称"
            name="name"
            rules={[{ required: true, message: '请输入属性名称' }]}
            tooltip="属性的显示名称"
          >
            <Input placeholder="如：早班" />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
            tooltip="属性的详细说明"
          >
            <Input.TextArea placeholder="请输入描述" rows={3} />
          </Form.Item>

          <Form.Item
            label="状态"
            name="status"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select>
              <Select.Option value="ACTIVE">启用</Select.Option>
              <Select.Option value="INACTIVE">停用</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="排序"
            name="sortOrder"
            tooltip="数值越小排序越靠前"
          >
            <Input type="number" placeholder="0" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ShiftPropertyConfigPage;
