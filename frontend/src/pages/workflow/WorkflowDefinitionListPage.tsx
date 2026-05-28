import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  message,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, CheckOutlined, ApartmentOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

interface WorkflowDefinition {
  id: number;
  code: string;
  name: string;
  category: string;
  version: number;
  description?: string;
  status: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

const WorkflowDefinitionListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WorkflowDefinition | null>(null);
  const [form] = Form.useForm();
  const [filters, setFilters] = useState({
    category: undefined,
    status: undefined,
  });

  // 获取流程定义列表
  const { data: definitionsData, isLoading } = useQuery({
    queryKey: ['workflowDefinitions', filters],
    queryFn: async () => {
      const params: any = {
        page: 1,
        pageSize: 20,
      };
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;

      const result = await request.get('/workflow/definitions', { params });
      console.log('流程定义列表返回数据:', result);
      return result;
    },
  });

  // 打印表格数据
  useEffect(() => {
    console.log('definitionsData:', definitionsData);
    console.log('items:', definitionsData?.items);
  }, [definitionsData]);

  // 删除流程定义
  const deleteMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/workflow/definitions/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['workflowDefinitions'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '删除失败');
    },
  });

  // 发布流程定义
  const publishMutation = useMutation({
    mutationFn: (id: number) => request.post(`/workflow/definitions/${id}/publish`),
    onSuccess: () => {
      message.success('发布成功');
      queryClient.invalidateQueries({ queryKey: ['workflowDefinitions'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '发布失败');
    },
  });

  // 新增记录
  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  // 编辑记录
  const handleEdit = (record: WorkflowDefinition) => {
    setEditingRecord(record);
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      category: record.category,
      description: record.description,
    });
    setIsModalVisible(true);
  };

  // 设计流程
  const handleDesign = (record: WorkflowDefinition) => {
    // 导航到流程设计器页面（使用 embed 路径，不带主布局）
    window.location.href = `/embed/workflow/designer?category=${record.category}&id=${record.id}`;
  };

  // 删除记录
  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  // 发布流程
  const handlePublish = (id: number) => {
    publishMutation.mutate(id);
  };

  // 取消弹窗
  const handleModalCancel = () => {
    setIsModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  // 提交表单
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      // TODO: 实现保存逻辑
      message.success(editingRecord ? '更新成功' : '新增成功');
      queryClient.invalidateQueries({ queryKey: ['workflowDefinitions'] });
      handleModalCancel();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const columns = [
    {
      title: '流程编码',
      dataIndex: 'code',
      key: 'code',
      width: 150,
    },
    {
      title: '流程名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => {
        const categoryMap: Record<string, { text: string; color: string }> = {
          SUPPORT_REQUEST: { text: '支援申请', color: 'blue' },
          PRODUCTION_REPORT: { text: '报工申请', color: 'green' },
        };
        const info = categoryMap[category] || { text: category, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '版本',
      dataIndex: 'versionString',
      key: 'version',
      width: 80,
      render: (versionString: string) => `v${versionString}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          DRAFT: { text: '草稿', color: 'default' },
          PUBLISHED: { text: '已发布', color: 'green' },
          ARCHIVED: { text: '已归档', color: 'gray' },
        };
        const info = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '系统流程',
      dataIndex: 'isSystem',
      key: 'isSystem',
      width: 100,
      render: (isSystem: boolean) => (isSystem ? <Tag color="purple">是</Tag> : <Tag>否</Tag>),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (value: string) => new Date(value).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      fixed: 'right' as const,
      render: (_: any, record: WorkflowDefinition) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />}>
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<ApartmentOutlined />}
            onClick={() => handleDesign(record)}
          >
            设计
          </Button>
          {record.status === 'DRAFT' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                编辑
              </Button>
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handlePublish(record.id)}
              >
                发布
              </Button>
              {!record.isSystem && (
                <Popconfirm
                  title="确认删除"
                  description="确定要删除这个流程定义吗？"
                  onConfirm={() => handleDelete(record.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              )}
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="流程定义"
        extra={
          <Space>
            <Select
              placeholder="选择分类"
              allowClear
              style={{ width: 150 }}
              value={filters.category}
              onChange={(value) => setFilters({ ...filters, category: value })}
              options={[
                { label: '支援申请', value: 'SUPPORT_REQUEST' },
                { label: '报工申请', value: 'PRODUCTION_REPORT' },
              ]}
            />
            <Select
              placeholder="选择状态"
              allowClear
              style={{ width: 120 }}
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              options={[
                { label: '草稿', value: 'DRAFT' },
                { label: '已发布', value: 'PUBLISHED' },
                { label: '已归档', value: 'ARCHIVED' },
              ]}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={definitionsData?.items || []}
          loading={isLoading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            current: definitionsData?.page || 1,
            total: definitionsData?.total || 0,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingRecord ? '编辑流程定义' : '新增流程定义'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="流程编码"
            name="code"
            rules={[{ required: true, message: '请输入流程编码' }]}
          >
            <Input placeholder="请输入流程编码" disabled={!!editingRecord} />
          </Form.Item>

          <Form.Item
            label="流程名称"
            name="name"
            rules={[{ required: true, message: '请输入流程名称' }]}
          >
            <Input placeholder="请输入流程名称" />
          </Form.Item>

          <Form.Item
            label="流程分类"
            name="category"
            rules={[{ required: true, message: '请选择流程分类' }]}
          >
            <Select
              placeholder="请选择流程分类"
              options={[
                { label: '支援申请', value: 'SUPPORT_REQUEST' },
                { label: '报工申请', value: 'PRODUCTION_REPORT' },
              ]}
            />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea rows={4} placeholder="请输入描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WorkflowDefinitionListPage;
