import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  message,
  Modal,
  Form,
  Select,
  Input,
} from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
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
  currentNodes?: any[];
  approvals?: any[];
}

const WorkflowInstanceListPage: React.FC = () => {
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
  const [filters, setFilters] = useState({
    status: undefined,
    category: undefined,
  });

  // 获取流程实例列表
  const { data: instancesData, isLoading, refetch } = useQuery({
    queryKey: ['workflowInstances', filters],
    queryFn: async () => {
      const params: any = {
        page: 1,
        pageSize: 50,
      };
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;

      return request.get('/workflow/instances', { params });
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

  // 关闭详情弹窗
  const handleDetailModalCancel = () => {
    setIsDetailModalVisible(false);
    setSelectedInstance(null);
  };

  // 刷新
  const handleRefresh = () => {
    refetch();
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
      title: '发起人',
      dataIndex: 'initiatorName',
      key: 'initiatorName',
      width: 100,
    },
    {
      title: '发起部门',
      dataIndex: 'initiatorOrgName',
      key: 'initiatorOrgName',
      width: 150,
      ellipsis: true,
    },
    {
      title: '发起时间',
      dataIndex: 'initiatedAt',
      key: 'initiatedAt',
      width: 160,
      render: (value: string) => new Date(value).toLocaleString('zh-CN'),
    },
    {
      title: '完成时间',
      dataIndex: 'finishedAt',
      key: 'finishedAt',
      width: 160,
      render: (value?: string) => (value ? new Date(value).toLocaleString('zh-CN') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
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
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="流程实例"
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
                { label: '进行中', value: 'PENDING' },
                { label: '已通过', value: 'APPROVED' },
                { label: '已驳回', value: 'REJECTED' },
                { label: '已取消', value: 'CANCELLED' },
                { label: '已撤回', value: 'WITHDRAWN' },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={instancesData?.items || []}
          loading={isLoading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            current: instancesData?.page || 1,
            total: instancesData?.total || 0,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* 详情弹窗 */}
      <Modal
        title="流程实例详情"
        open={isDetailModalVisible}
        onCancel={handleDetailModalCancel}
        width={800}
        footer={[
          <Button key="close" onClick={handleDetailModalCancel}>
            关闭
          </Button>,
        ]}
      >
        {selectedInstance && (
          <div>
            <Form layout="vertical" disabled>
              <Form.Item label="实例编号">
                <Input value={selectedInstance.instanceNo} />
              </Form.Item>
              <Form.Item label="流程名称">
                <Input value={selectedInstance.workflowName} />
              </Form.Item>
              <Form.Item label="标题">
                <Input value={selectedInstance.title} />
              </Form.Item>
              <Form.Item label="发起人">
                <Input value={`${selectedInstance.initiatorName} (${selectedInstance.initiatorOrgName || '-'})`} />
              </Form.Item>
              <Form.Item label="发起时间">
                <Input value={new Date(selectedInstance.initiatedAt).toLocaleString('zh-CN')} />
              </Form.Item>
              {selectedInstance.finishedAt && (
                <Form.Item label="完成时间">
                  <Input value={new Date(selectedInstance.finishedAt).toLocaleString('zh-CN')} />
                </Form.Item>
              )}
            </Form>

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
                      }}
                    >
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>
                        {approval.approverName} - {approval.nodeName}
                      </div>
                      <div style={{ color: '#666', fontSize: 12 }}>
                        {new Date(approval.approvedAt).toLocaleString('zh-CN')}
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
                        <div style={{ marginTop: 8, color: '#666' }}>{approval.comment}</div>
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

export default WorkflowInstanceListPage;
