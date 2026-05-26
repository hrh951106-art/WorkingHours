import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  message,
  Modal,
  Descriptions,
  Popconfirm,
  Tabs,
} from 'antd';
import { EyeOutlined, RollbackOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import request from '@/utils/request';

interface WorkflowInstance {
  id: number;
  instanceNo: string;
  workflowName: string;
  category: string;
  title: string;
  status: string;
  initiatorId: number;
  initiatorName: string;
  initiatorOrgName?: string;
  initiatedAt: string;
  finishedAt?: string;
  currentNodes?: number[];
  approvals?: any[];
}

const MyApplicationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  // 获取我的申请列表
  const { data: applicationsData, isLoading } = useQuery({
    queryKey: ['myApplications', activeTab],
    queryFn: async () => {
      const statusMap: Record<string, string> = {
        pending: 'PENDING',
        completed: 'APPROVED,REJECTED,CANCELLED,WITHDRAWN',
        all: '',
      };

      const params: any = {
        page: 1,
        pageSize: 50,
      };

      if (statusMap[activeTab]) {
        params.status = statusMap[activeTab];
      }

      return request.get('/workflow/instances', { params });
    },
  });

  // 撤回申请
  const withdrawMutation = useMutation({
    mutationFn: (instanceId: number) =>
      request.post(`/workflow/instances/${instanceId}/withdraw`),
    onSuccess: () => {
      message.success('撤回成功');
      queryClient.invalidateQueries({ queryKey: ['myApplications'] });
      setIsDetailModalVisible(false);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '撤回失败');
    },
  });

  // 查看详情
  const handleViewDetail = async (record: WorkflowInstance) => {
    try {
      const instance = await request.get(`/workflow/instances/${record.id}`);
      setSelectedInstance(instance);
      setIsDetailModalVisible(true);
    } catch (error: any) {
      message.error(error.response?.data?.message || '获取详情失败');
    }
  };

  // 撤回申请
  const handleWithdraw = (instanceId: number) => {
    withdrawMutation.mutate(instanceId);
  };

  // 关闭详情弹窗
  const handleDetailModalCancel = () => {
    setIsDetailModalVisible(false);
    setSelectedInstance(null);
  };

  const columns = [
    {
      title: '实例编号',
      dataIndex: 'instanceNo',
      key: 'instanceNo',
      width: 180,
    },
    {
      title: '流程名称',
      dataIndex: 'workflowName',
      key: 'workflowName',
      width: 150,
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
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          PENDING: { text: '进行中', color: 'blue' },
          APPROVED: { text: '已通过', color: 'green' },
          REJECTED: { text: '已驳回', color: 'red' },
          CANCELLED: { text: '已取消', color: 'gray' },
          WITHDRAWN: { text: '已撤回', color: 'orange' },
        };
        const info = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '发起时间',
      dataIndex: 'initiatedAt',
      key: 'initiatedAt',
      width: 160,
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '完成时间',
      dataIndex: 'finishedAt',
      key: 'finishedAt',
      width: 160,
      render: (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: WorkflowInstance) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          {record.status === 'PENDING' && (
            <Popconfirm
              title="确认撤回"
              description="确定要撤回这个申请吗？"
              onConfirm={() => handleWithdraw(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                icon={<RollbackOutlined />}
                danger
              >
                撤回
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'pending',
      label: '进行中',
      children: null,
    },
    {
      key: 'completed',
      label: '已完成',
      children: null,
    },
    {
      key: 'all',
      label: '全部',
      children: null,
    },
  ];

  return (
    <div>
      <Card
        title="我的申请"
        extra={
          <Button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['myApplications'] });
            }}
          >
            刷新
          </Button>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

        <Table
          columns={columns}
          dataSource={applicationsData?.items || []}
          loading={isLoading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            current: 1,
            total: applicationsData?.total || 0,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title="申请详情"
        open={isDetailModalVisible}
        onCancel={handleDetailModalCancel}
        width={900}
        footer={[
          selectedInstance?.status === 'PENDING' ? (
            <Popconfirm
              key="withdraw"
              title="确认撤回"
              description="确定要撤回这个申请吗？"
              onConfirm={() => selectedInstance && handleWithdraw(selectedInstance.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<RollbackOutlined />} loading={withdrawMutation.isPending}>
                撤回申请
              </Button>
            </Popconfirm>
          ) : null,
          <Button key="close" onClick={handleDetailModalCancel}>
            关闭
          </Button>,
        ]}
      >
        {selectedInstance && (
          <div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="实例编号">{selectedInstance.instanceNo}</Descriptions.Item>
              <Descriptions.Item label="流程名称">{selectedInstance.workflowName}</Descriptions.Item>
              <Descriptions.Item label="标题" span={2}>
                {selectedInstance.title}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag
                  color={
                    selectedInstance.status === 'PENDING'
                      ? 'blue'
                      : selectedInstance.status === 'APPROVED'
                      ? 'green'
                      : selectedInstance.status === 'REJECTED'
                      ? 'red'
                      : selectedInstance.status === 'WITHDRAWN'
                      ? 'orange'
                      : 'gray'
                  }
                >
                  {
                    {
                      PENDING: '进行中',
                      APPROVED: '已通过',
                      REJECTED: '已驳回',
                      CANCELLED: '已取消',
                      WITHDRAWN: '已撤回',
                    }[selectedInstance.status]
                  }
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="发起时间">
                {dayjs(selectedInstance.initiatedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              {selectedInstance.finishedAt && (
                <Descriptions.Item label="完成时间" span={2}>
                  {dayjs(selectedInstance.finishedAt).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* 表单数据 */}
            <div style={{ marginTop: 24 }}>
              <h3>申请信息</h3>
              <div style={{ marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 4 }}>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {JSON.stringify(JSON.parse(selectedInstance.formData || '{}'), null, 2)}
                </pre>
              </div>
            </div>

            {/* 审批记录 */}
            {selectedInstance.approvals && selectedInstance.approvals.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h3>审批记录</h3>
                <div style={{ marginTop: 16 }}>
                  {selectedInstance.approvals.map((approval: any, index: number) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px',
                        marginBottom: '8px',
                        border: '1px solid #f0f0f0',
                        borderRadius: '4px',
                        backgroundColor: index === 0 ? '#f6ffed' : 'transparent',
                      }}
                    >
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>
                        {approval.approverName} - {approval.nodeName}
                      </div>
                      <div style={{ color: '#666', fontSize: 12 }}>
                        {dayjs(approval.approvedAt).format('YYYY-MM-DD HH:mm:ss')}
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <Tag
                          color={
                            approval.action === 'APPROVED'
                              ? 'green'
                              : approval.action === 'REJECTED'
                              ? 'red'
                              : 'orange'
                          }
                        >
                          {approval.action === 'APPROVED'
                            ? '通过'
                            : approval.action === 'REJECTED'
                            ? '驳回'
                            : '撤回'}
                        </Tag>
                      </div>
                      {approval.comment && (
                        <div style={{ marginTop: 8, color: '#666' }}>
                          <strong>审批意见：</strong>{approval.comment}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyApplicationsPage;
