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
  Upload,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import type { UploadProps } from 'antd';

const { TextArea } = Input;

interface Product {
  id?: number;
  code: string;
  name: string;
  specification?: string;
  unit?: string;
  status: 'ACTIVE' | 'INACTIVE';
  standardHours?: number;
  conversionFactor?: number;
  description?: string;
  createdById?: number;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

const ProductMaintenancePage: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 查询条件
  const [filters, setFilters] = useState({
    keyword: '',
  });

  // 分页
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  // 获取用户信息
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  // 获取产品列表
  const { data: productsData, isLoading, refetch } = useQuery({
    queryKey: ['products', filters, pagination],
    queryFn: async () => {
      const params = {
        keyword: filters.keyword || undefined,
        page: pagination.current,
        pageSize: pagination.pageSize,
      };
      const response = await request.get('/allocation/products', { params });
      return response;
    },
  });

  // 创建产品
  const createProductMutation = useMutation({
    mutationFn: (data: Product) =>
      request.post('/allocation/products', {
        ...data,
        createdById: user?.id || 1,
        createdByName: user?.name || '系统管理员',
      }),
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
  const updateProductMutation = useMutation({
    mutationFn: ({ id, ...data }: Product) =>
      request.put(`/allocation/products/${id}`, {
        ...data,
        updatedById: user?.id || 1,
        updatedByName: user?.name || '系统管理员',
      }),
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
  const deleteProductMutation = useMutation({
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

  // 导入产品
  const importProductsMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return request.post('/allocation/products/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    onSuccess: () => {
      message.success('导入成功');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '导入失败');
    },
  });

  const handleCreate = () => {
    setEditingProduct(null);
    form.resetFields();
    form.setFieldsValue({
      unit: '件',
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
    deleteProductMutation.mutate(id);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingProduct?.id) {
        updateProductMutation.mutate({
          id: editingProduct.id,
          ...values,
        });
      } else {
        createProductMutation.mutate(values);
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
      keyword: '',
    });
    setPagination({
      current: 1,
      pageSize: 10,
    });
  };

  // 上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    accept: '.xlsx,.xls',
    beforeUpload: (file) => {
      importProductsMutation.mutate(file);
      return false;
    },
    showUploadList: false,
  };

  // 导入模板下载
  const handleDownloadTemplate = () => {
    // 这里可以生成Excel模板并下载
    message.info('模板下载功能开发中');
  };

  const columns = [
    {
      title: '编码',
      dataIndex: 'code',
      key: 'code',
      width: 200,
      fixed: 'left' as const,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 300,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
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
        title="产品维护"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            新增
          </Button>
        }
      >
        {/* 查询条件 */}
        <Form layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item>
            <Input
              placeholder="请输入编码或名称"
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              allowClear
              style={{ width: 250 }}
              onPressEnter={() => refetch()}
              prefix={<SearchOutlined />}
            />
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
          dataSource={productsData?.items || []}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: 680 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: productsData?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination({ current: page, pageSize });
            },
          }}
        />
      </Card>

      {/* 新增/编辑产品Modal */}
      <Modal
        title={editingProduct ? '编辑产品' : '新增产品'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        width={600}
        confirmLoading={createProductMutation.isPending || updateProductMutation.isPending}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
        >
          <Form.Item
            label="编码"
            name="code"
            rules={[
              { required: true, message: '请输入编码' },
              { pattern: /^[A-Za-z0-9\-_]+$/, message: '编码只能包含字母、数字、横线和下划线' },
            ]}
          >
            <Input placeholder="如：PROD-001" disabled={!!editingProduct} />
          </Form.Item>

          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="请输入名称" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductMaintenancePage;
