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
  Input,
  Descriptions,
  Tabs,
} from 'antd';
import { EyeOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
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
  currentNodes?: number[];
  approvals?: any[];
}

const PendingApprovalPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isApprovalModalVisible, setIsApprovalModalVisible] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
  const [approvalForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('pending');

  // 获取待审批列表
  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: async () => {
      return request.get('/workflow/instances', {
        params: {
          status: 'PENDING',
          page: 1,
          pageSize: 100,
        },
      });
    },
  });

  // 获取已审批列表
  const { data: approvedData, isLoading: approvedLoading } = useQuery({
    queryKey: ['approvedList'],
    queryFn: async () => {
      return request.get('/workflow/instances', {
        params: {
          status: 'APPROVED,REJECTED',
          page: 1,
          pageSize: 50,
        },
      });
    },
  });

  // 审批操作
  const approvalMutation = useMutation({
    mutationFn: (values: any) => {
      return request.post('/workflow/instances/approval', {
        instanceId: selectedInstance?.id,
        action: values.action,
        comment: values.comment,
      });
    },
    onSuccess: () => {
      message.success('操作成功');
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] });
      queryClient.invalidateQueries({ queryKey: ['approvedList'] });
      handleApprovalModalCancel();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '操作失败');
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

  // 打开审批弹窗
  const handleOpenApproval = (record: WorkflowInstance) => {
    setSelectedInstance(record);
    approvalForm.resetFields();
    setIsApprovalModalVisible(true);
  };

  // 关闭详情弹窗
  const handleDetailModalCancel = () => {
    setIsDetailModalVisible(false);
    setSelectedInstance(null);
  };

  // 关闭审批弹窗
  const handleApprovalModalCancel = () => {
    setIsApprovalModalVisible(false);
    setSelectedInstance(null);
    approvalForm.resetFields();
  };

  // 提交审批
  const handleApprovalSubmit = async (action: 'APPROVED' | 'REJECTED') => {
    try {
      const values = await approvalForm.validateFields();
      approvalMutation.mutate({ ...values, action });
    } catch (error) {
      console.error('表单验证失败:', error);
    }
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
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
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
          {activeTab === 'pending' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                style={{ color: 'green' }}
                onClick={() => handleOpenApproval(record)}
              >
                审批
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'pending',
      label: `待审批 (${pendingData?.total || 0})`,
      children: null,
    },
    {
      key: 'approved',
      label: `已审批 (${approvedData?.total || 0})`,
      children: null,
    },
  ];

  return (
    <div>
      <Card
        title="审批中心"
        extra={
          <Button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] });
              queryClient.invalidateQueries({ queryKey: ['approvedList'] });
            }}
          >
            刷新
          </Button>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />

        <Table
          columns={columns}
          dataSource={activeTab === 'pending' ? (pendingData?.items || []) : (approvedData?.items || [])}
          loading={activeTab === 'pending' ? pendingLoading : approvedLoading}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            current: 1,
            total: activeTab === 'pending' ? (pendingData?.total || 0) : (approvedData?.total || 0),
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
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="实例编号">{selectedInstance.instanceNo}</Descriptions.Item>
              <Descriptions.Item label="流程名称">{selectedInstance.workflowName}</Descriptions.Item>
              <Descriptions.Item label="标题" span={2}>
                {selectedInstance.title}
              </Descriptions.Item>
              <Descriptions.Item label="发起人">{selectedInstance.initiatorName}</Descriptions.Item>
              <Descriptions.Item label="发起部门">{selectedInstance.initiatorOrgName || '-'}</Descriptions.Item>
              <Descriptions.Item label="发起时间" span={2}>
                {dayjs(selectedInstance.initiatedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

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

      {/* 审批弹窗 */}
      <Modal
        title="审批处理"
        open={isApprovalModalVisible}
        onCancel={handleApprovalModalCancel}
        footer={[
          <Button key="cancel" onClick={handleApprovalModalCancel}>
            取消
          </Button>,
          <Button
            key="reject"
            danger
            icon={<CloseOutlined />}
            onClick={() => handleApprovalSubmit('REJECTED')}
            loading={approvalMutation.isPending}
          >
            驳回
          </Button>,
          <Button
            key="approve"
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => handleApprovalSubmit('APPROVED')}
            loading={approvalMutation.isPending}
          >
            通过
          </Button>,
        ]}
      >
        <Form form={approvalForm} layout="vertical">
          <Form.Item label="流程标题">
            <Input value={selectedInstance?.title} disabled />
          </Form.Item>
          <Form.Item label="发起人">
            <Input value={selectedInstance?.initiatorName} disabled />
          </Form.Item>
          <Form.Item
            label="审批意见"
            name="comment"
            rules={[{ required: true, message: '请输入审批意见' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="请输入审批意见"
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PendingApprovalPage;
