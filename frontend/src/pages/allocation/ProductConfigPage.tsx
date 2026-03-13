import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Popconfirm,
  Tag,
  Tabs,
  Row,
  Col,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

const { TextArea } = Input;

// ============ 产品配置组件 ============
interface Product {
  id?: number;
  code: string;
  name: string;
  standardHours: number;
  conversionFactor: number;
  unit?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const ProductConfigTab: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 查询条件
  const [filters, setFilters] = useState({
    code: '',
    name: '',
    status: null as string | null,
  });

  // 获取产品列表
  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['products', filters],
    queryFn: () =>
      request.get('/allocation/products', {
        params: {
          code: filters.code || undefined,
          name: filters.name || undefined,
          status: filters.status || undefined,
        },
      }).then((res: any) => res?.items || []),
  });

  // 创建产品
  const createMutation = useMutation({
    mutationFn: (data: Product) =>
      request.post('/allocation/products', data),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      handleCancel();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '创建失败');
    },
  });

  // 更新产品
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Product) =>
      request.put(`/allocation/products/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      handleCancel();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '更新失败');
    },
  });

  // 删除产品
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      request.delete(`/allocation/products/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '删除失败');
    },
  });

  const handleCreate = () => {
    setEditingProduct(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'ACTIVE',
      conversionFactor: 1.0,
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record: Product) => {
    setEditingProduct(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 获取当前用户信息
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (editingProduct?.id) {
        updateMutation.mutate({
          id: editingProduct.id,
          ...values,
          updatedById: user?.id,
          updatedByName: user?.name,
        });
      } else {
        createMutation.mutate({
          ...values,
          createdById: user?.id || 1,
          createdByName: user?.name || '系统管理员',
        });
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingProduct(null);
    form.resetFields();
  };

  // 重置查询
  const handleResetFilters = () => {
    setFilters({
      code: '',
      name: '',
      status: null,
    });
  };

  const columns = [
    {
      title: '产品编码',
      dataIndex: 'code',
      key: 'code',
      width: 150,
    },
    {
      title: '产品名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '标准工时',
      dataIndex: 'standardHours',
      key: 'standardHours',
      width: 120,
      render: (hours: number) => `${hours} 小时`,
    },
    {
      title: '转换系数',
      dataIndex: 'conversionFactor',
      key: 'conversionFactor',
      width: 120,
      render: (factor: number) => factor ? factor.toFixed(4) : '-',
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
      render: (unit: string) => unit || '-',
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
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: Product) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个产品吗？"
            onConfirm={() => record.id && handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
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
        title="产品配置"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增产品
          </Button>
        }
      >
        {/* 查询条件 */}
        <Form layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item label="产品编码">
            <Input
              placeholder="请输入产品编码"
              value={filters.code}
              onChange={(e) => setFilters({ ...filters, code: e.target.value })}
              allowClear
              style={{ width: 200 }}
            />
          </Form.Item>
          <Form.Item label="产品名称">
            <Input
              placeholder="请输入产品名称"
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
              allowClear
              style={{ width: 200 }}
            />
          </Form.Item>
          <Form.Item label="状态">
            <Select
              placeholder="请选择状态"
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              allowClear
              style={{ width: 120 }}
            >
              <Select.Option value="ACTIVE">启用</Select.Option>
              <Select.Option value="INACTIVE">停用</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={() => refetch()}
              >
                查询
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleResetFilters}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Table
          columns={columns}
          dataSource={products}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: 1000 }}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title={editingProduct ? '编辑产品' : '新增产品'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        width={600}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="产品编码"
            name="code"
            rules={[
              { required: true, message: '请输入产品编码' },
              { pattern: /^[A-Z0-9_-]+$/, message: '产品编码只能包含大写字母、数字、下划线和连字符' },
            ]}
          >
            <Input placeholder="如：PROD-001" />
          </Form.Item>

          <Form.Item
            label="产品名称"
            name="name"
            rules={[{ required: true, message: '请输入产品名称' }]}
          >
            <Input placeholder="请输入产品名称" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="标准工时（小时）"
                name="standardHours"
                rules={[{ required: true, message: '请输入标准工时' }]}
                tooltip="生产一个单位产品所需的标准工时"
              >
                <InputNumber
                  min={0}
                  precision={2}
                  step={0.1}
                  style={{ width: '100%' }}
                  placeholder="如：2.5"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="转换系数"
                name="conversionFactor"
                rules={[{ required: true, message: '请输入转换系数' }]}
                tooltip="用于将实际产量转换为同效产量，默认为1.0"
              >
                <InputNumber
                  min={0}
                  precision={4}
                  step={0.1}
                  style={{ width: '100%' }}
                  placeholder="如：1.0000"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="单位"
            name="unit"
            tooltip="可选，产品计量单位，如：件、台、套等"
          >
            <Input placeholder="如：件" />
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
        </Form>
      </Modal>
    </div>
  );
};

// ============ 通用配置组件 ============
const GeneralConfigTab: React.FC = () => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取通用配置
  const { data: config, isLoading } = useQuery({
    queryKey: ['allocationGeneralConfig'],
    queryFn: () =>
      request.get('/allocation/general-config').then((res: any) => res || {}),
  });

  // 获取出勤代码列表
  const { data: attendanceCodes } = useQuery({
    queryKey: ['attendanceCodesForConfig'],
    queryFn: () =>
      request.get('/allocation/attendance-codes').then((res: any) => res || []),
  });

  // 更新配置
  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      request.put('/allocation/general-config', data),
    onSuccess: () => {
      message.success('保存成功');
      queryClient.invalidateQueries({ queryKey: ['allocationGeneralConfig'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '保存失败');
    },
  });

  // 当配置加载完成后设置表单值
  if (config && !form.isFieldsTouched()) {
    form.setFieldsValue(config);
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      updateMutation.mutate(values);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  return (
    <div>
      <Card
        title="通用配置"
        extra={
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSubmit}
            loading={updateMutation.isPending}
          >
            保存配置
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            actualHoursAllocationCode: null,
            indirectHoursAllocationCode: null,
          }}
        >
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="按实际工时方式分配的工时代码"
                name="actualHoursAllocationCode"
                tooltip="用于标识按实际工时比例分配间接工时后生成的工时记录"
                rules={[{ required: true, message: '请选择工时代码' }]}
              >
                <Select
                  placeholder="请选择工时代码"
                  loading={isLoading}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={attendanceCodes?.map((code: any) => ({
                    label: `${code.name} (${code.code})`,
                    value: code.code,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="间接工时分配后的工时代码"
                name="indirectHoursAllocationCode"
                tooltip="用于标识间接工时分配完成后生成的工时记录代码"
                rules={[{ required: true, message: '请选择工时代码' }]}
              >
                <Select
                  placeholder="请选择工时代码"
                  loading={isLoading}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={attendanceCodes?.map((code: any) => ({
                    label: `${code.name} (${code.code})`,
                    value: code.code,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
};

// ============ 主页面组件 ============
const ProductConfigPage: React.FC = () => {
  const tabItems = [
    {
      key: 'product',
      label: '产品配置',
      children: <ProductConfigTab />,
    },
    {
      key: 'general',
      label: '通用配置',
      children: <GeneralConfigTab />,
    },
  ];

  return (
    <div>
      <Tabs items={tabItems} />
    </div>
  );
};

export default ProductConfigPage;
