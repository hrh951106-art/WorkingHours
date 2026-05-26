import { useState } from 'react';
import { Table, Button, Space, Tag, Modal, message, Popconfirm, Card, Empty } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import request from '@/utils/request';

interface WorkflowConfigTabProps {
  category: 'SUPPORT_REQUEST' | 'PRODUCTION_REPORT';
  categoryName: string;
}

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

export const WorkflowConfigTab: React.FC<WorkflowConfigTabProps> = ({
  category,
  categoryName,
}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WorkflowDefinition | null>(null);

  // 获取该类别的流程定义列表
  const { data: definitionsData, isLoading } = useQuery({
    queryKey: ['workflowDefinitions', category],
    queryFn: async () => {
      return request.get('/workflow/definitions', {
        params: { category, status: 'PUBLISHED' },
      });
    },
  });

  // 获取所有流程定义（包括草稿）
  const { data: allDefinitionsData } = useQuery({
    queryKey: ['allWorkflowDefinitions', category],
    queryFn: async () => {
      return request.get('/workflow/definitions', {
        params: { category },
      });
    },
  });

  // 删除流程定义
  const deleteMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/workflow/definitions/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['workflowDefinitions'] });
      queryClient.invalidateQueries({ queryKey: ['allWorkflowDefinitions'] });
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
      queryClient.invalidateQueries({ queryKey: ['allWorkflowDefinitions'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '发布失败');
    },
  });

  // 创建新流程
  const handleCreate = () => {
    navigate(`/workflow/designer?category=${category}`);
  };

  // 设计流程
  const handleDesign = (record: WorkflowDefinition) => {
    navigate(`/workflow/designer?category=${category}&id=${record.id}`);
  };

  // 查看流程
  const handleView = (record: WorkflowDefinition) => {
    Modal.info({
      title: '流程详情',
      width: 800,
      content: (
        <div>
          <p><strong>流程名称：</strong>{record.name}</p>
          <p><strong>流程编码：</strong>{record.code}</p>
          <p><strong>版本：</strong>v{record.version}</p>
          <p><strong>状态：</strong>
            <Tag color={record.status === 'PUBLISHED' ? 'green' : 'default'}>
              {record.status === 'PUBLISHED' ? '已发布' : '草稿'}
            </Tag>
          </p>
          <p><strong>描述：</strong>{record.description || '无'}</p>
          <p><strong>创建时间：</strong>{new Date(record.createdAt).toLocaleString('zh-CN')}</p>
          {record.publishedAt && (
            <p><strong>发布时间：</strong>{new Date(record.publishedAt).toLocaleString('zh-CN')}</p>
          )}
        </div>
      ),
    });
  };

  // 删除记录
  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  // 发布流程
  const handlePublish = (id: number) => {
    publishMutation.mutate(id);
  };

  const columns = [
    {
      title: '流程名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '流程编码',
      dataIndex: 'code',
      key: 'code',
      width: 180,
      ellipsis: true,
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      width: 80,
      render: (version: number) => `v${version}`,
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
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 250,
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
      width: 260,
      fixed: 'right' as const,
      render: (_: any, record: WorkflowDefinition) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleView(record)}>
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
        title={`${categoryName}流程配置`}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            创建流程
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={allDefinitionsData?.items || []}
          loading={isLoading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            current: allDefinitionsData?.page || 1,
            total: allDefinitionsData?.total || 0,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>
    </div>
  );
};
