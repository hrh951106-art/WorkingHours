import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  message,
  Modal,
  Tooltip,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import ParticipantConfigModal from '@/components/workflow/ParticipantConfigModal';

interface WorkflowParticipant {
  id: number;
  code: string;
  name: string;
  type: string;
  description?: string;
  participants: string;
  status: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const WorkflowParticipantListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [modalVisible, setModalVisible] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  // 获取参与人配置列表
  const { data: listData, isLoading } = useQuery({
    queryKey: ['workflowParticipants'],
    queryFn: async () => {
      return request.get('/workflow/participants');
    },
  });

  // 创建参与人配置
  const createMutation = useMutation({
    mutationFn: (data: any) => request.post('/workflow/participants', data),
    onSuccess: () => {
      message.success('创建成功');
      setModalVisible(false);
      setEditData(null);
      queryClient.invalidateQueries({ queryKey: ['workflowParticipants'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '创建失败');
    },
  });

  // 更新参与人配置
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      request.put(`/workflow/participants/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      setModalVisible(false);
      setEditData(null);
      queryClient.invalidateQueries({ queryKey: ['workflowParticipants'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '更新失败');
    },
  });

  // 删除参与人配置
  const deleteMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/workflow/participants/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['workflowParticipants'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '删除失败');
    },
  });

  // 更新状态
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      request.put(`/workflow/participants/${id}/status`, { status }),
    onSuccess: () => {
      message.success('状态更新成功');
      queryClient.invalidateQueries({ queryKey: ['workflowParticipants'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '状态更新失败');
    },
  });

  // 打开新增弹窗
  const handleAdd = () => {
    setEditData(null);
    setModalVisible(true);
  };

  // 打开编辑弹窗
  const handleEdit = (record: WorkflowParticipant) => {
    setEditData(record);
    setModalVisible(true);
  };

  // 保存配置
  const handleSave = (data: any) => {
    if (editData) {
      updateMutation.mutate({ id: editData.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // 格式化状态标签
  const getStatusTag = (status: string) => {
    return status === 'ACTIVE' ? (
      <Tag color="success" icon={<CheckCircleOutlined />}>启用</Tag>
    ) : (
      <Tag color="default" icon={<StopOutlined />}>停用</Tag>
    );
  };

  // 解析参与人数据
  const parseParticipants = (participantsStr: string) => {
    try {
      const participants = JSON.parse(participantsStr);
      return participants.map((p: any) => {
        if (p.type === 'FIXED_USER') {
          return <Tag color="blue">固定人员: {p.userNames?.join('、')}</Tag>;
        } else if (p.type === 'ORG_MANAGER') {
          return <Tag color="green">{p.orgLevelName}</Tag>;
        }
        return '-';
      });
    } catch {
      return '-';
    }
  };

  // 删除确认
  const handleDelete = (id: number, name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除参与人配置"${name}"吗？`,
      onOk: () => {
        deleteMutation.mutate(id);
      },
    });
  };

  // 切换状态
  const handleToggleStatus = (record: WorkflowParticipant) => {
    const newStatus = record.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    Modal.confirm({
      title: '确认操作',
      content: `确定要${newStatus === 'ACTIVE' ? '启用' : '停用'}"${record.name}"吗？`,
      onOk: () => {
        statusMutation.mutate({ id: record.id, status: newStatus });
      },
    });
  };

  const columns = [
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 80,
      sorter: (a: WorkflowParticipant, b: WorkflowParticipant) => a.sortOrder - b.sortOrder,
    },
    {
      title: '配置代码',
      dataIndex: 'code',
      key: 'code',
      width: 150,
    },
    {
      title: '配置名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '参与人配置',
      dataIndex: 'participants',
      key: 'participants',
      ellipsis: true,
      render: (participants: string) => (
        <Tooltip title={parseParticipants(participants)}>
          <Space>{parseParticipants(participants)}</Space>
        </Tooltip>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record: WorkflowParticipant) => (
        <Button
          type="text"
          size="small"
          onClick={() => handleToggleStatus(record)}
        >
          {getStatusTag(status)}
        </Button>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: WorkflowParticipant) => (
        <Space size="small">
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
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id, record.name)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title="流程参与人配置"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新增配置
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={listData || []}
          loading={isLoading}
          rowKey="id"
          pagination={false}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <ParticipantConfigModal
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditData(null);
        }}
        onOk={handleSave}
        editData={editData}
        title={editData ? '编辑参与人配置' : '新增参与人配置'}
      />
    </>
  );
};

export default WorkflowParticipantListPage;
