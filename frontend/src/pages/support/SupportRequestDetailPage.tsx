import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  Tag,
  message,
  Descriptions,
  Timeline,
  Divider,
  Input,
  Radio,
  Spin,
} from 'antd';
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';
import request from '@/utils/request';
import { useAuthStore } from '@/stores/authStore';

interface SupportRequest {
  id: number;
  instanceId: number;
  instanceNo: string;
  supportMode: 'FULL_DAY' | 'TIME_BASED';
  supportEmployeeId: number;
  supportEmployeeName: string;
  supportEmployeeNo: string;
  supportAccountId: number;
  supportAccountName: string;
  description: string;
  calculatedHours: number;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  // 申请人：表单中选择的员工
  applicantId: number;
  applicantName: string;
  // 发起人：提交表单的人
  initiatorId: number;
  initiatorName: string;
  requesterId: number;
  requesterName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  instance?: {
    id: number;
    instanceNo: string;
    workflowId: number;
    workflowName: string;
    category: string;
    title: string;
    status: string;
    currentNodes: string;
    initiatorId: number;
    initiatorName: string;
    initiatedAt: string;
    approvals?: any[];
    definition?: {
      id: number;
      name: string;
      nodes?: any[];
    };
  };
  result?: any;
}

const SupportRequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
  const [approvalComment, setApprovalComment] = useState('');

  // 获取支援申请详情
  const { data: detail, isLoading, error, refetch } = useQuery({
    queryKey: ['supportRequestDetail', id],
    queryFn: async () => {
      console.log('=== 请求支援申请详情 ===');
      console.log('请求ID:', id);
      try {
        const response = await request.get(`/support/requests/${id}`);
        console.log('详情响应:', response);
        return response;
      } catch (err: any) {
        console.error('详情请求失败:', err);
        console.error('错误响应:', err.response);
        throw err;
      }
    },
    onError: (err: any) => {
      console.error('查询错误:', err);
      message.error(err.response?.data?.message || '获取详情失败');
    },
  });

  // 当数据加载成功后，设置selectedRequest
  useEffect(() => {
    if (detail) {
      console.log('设置selectedRequest:', detail);
      setSelectedRequest(detail);
    }
  }, [detail]);

  // 审批操作
  const approvalMutation = useMutation({
    mutationFn: (data: { instanceId: number; action: 'APPROVED' | 'REJECTED'; comment?: string }) => {
      return request.post('/workflow/instances/approval', {
        instanceId: data.instanceId,
        action: data.action,
        comment: data.comment,
      });
    },
    onSuccess: () => {
      message.success('操作成功');
      setApprovalAction(null);
      setApprovalComment('');
      refetch();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '操作失败');
    },
  });

  // 判断当前用户是否可以审批
  const canApprove = (request: SupportRequest) => {
    if (!user || !request.instance || request.instance.status !== 'PENDING') {
      return false;
    }

    try {
      const currentNodes = JSON.parse(request.instance.currentNodes || '[]');
      return request.instance.approvals?.some((approval: any) => {
        const isCurrentNode = currentNodes.includes(approval.nodeId);
        const isNotApproved = !approval.action;
        const isCurrentUser = approval.approverId === user.id;
        return isCurrentNode && isNotApproved && isCurrentUser;
      });
    } catch {
      return false;
    }
  };

  // 处理审批操作
  const handleApproval = (action: 'approve' | 'reject') => {
    if (!selectedRequest) return;

    const approvalAction = action === 'approve' ? 'APPROVED' : 'REJECTED';

    if (action === 'reject' && !approvalComment.trim()) {
      message.warning('退回时必须填写审批意见');
      return;
    }

    approvalMutation.mutate({
      instanceId: selectedRequest.instanceId,
      action: approvalAction,
      comment: approvalComment || undefined,
    });
  };

  // 格式化支援模式标签
  const getSupportModeTag = (mode: string) => {
    return mode === 'FULL_DAY' ?
      <Tag color="blue">整天支援</Tag> :
      <Tag color="green">按时段支援</Tag>;
  };

  // 格式化申请状态标签
  const getStatusTag = (status: string) => {
    const config: Record<string, { color: string; text: string }> = {
      PENDING: { color: 'orange', text: '审批中' },
      APPROVED: { color: 'green', text: '已通过' },
      REJECTED: { color: 'red', text: '已拒绝' },
      CANCELLED: { color: 'default', text: '已取消' },
    };
    const item = config[status] || { color: 'default', text: status };
    return <Tag color={item.color}>{item.text}</Tag>;
  };

  // 格式化时间显示
  const formatTimeRange = (record: SupportRequest) => {
    if (record.supportMode === 'FULL_DAY') {
      return record.startDate && record.endDate ?
        `${dayjs(record.startDate).format('YYYY-MM-DD')} ~ ${dayjs(record.endDate).format('YYYY-MM-DD')}` :
        '-';
    } else {
      return record.startTime && record.endTime ?
        `${dayjs(record.startTime).format('YYYY-MM-DD HH:mm')} ~ ${dayjs(record.endTime).format('YYYY-MM-DD HH:mm')}` :
        '-';
    }
  };

  // 构建审批流程时间轴
  const buildApprovalTimeline = () => {
    if (!selectedRequest?.instance?.workflow?.nodes) {
      return null;
    }

    const timelineItems: any[] = [];
    const workflowNodes = selectedRequest.instance.workflow.nodes.filter((node: any) => node.nodeType === 'approval');
    const approvals = selectedRequest.instance.approvals || [];

    // 1. 添加申请节点
    const applicantAvatar = selectedRequest.applicantName
      ? selectedRequest.applicantName.charAt(0).toUpperCase()
      : '?';

    timelineItems.push({
      key: 'application',
      color: 'green',
      dot: <EyeOutlined style={{ fontSize: '16px', color: 'green' }} />,
      title: (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontWeight: 500, fontSize: 13 }}>
              提交申请
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>
              {dayjs(selectedRequest.createdAt).format('YYYY-MM-DD HH:mm')}
            </div>
          </div>
          {/* 申请人卡片 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              padding: '8px 10px',
              background: '#f6ffed',
              borderRadius: '6px',
              border: '1px solid #b7eb8f',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                {applicantAvatar}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#262626' }}>
                {selectedRequest.applicantName}
              </div>
            </div>
            <Tag color="green" style={{ fontSize: 11, padding: '1px 6px' }}>已发起</Tag>
          </div>
        </div>
      ),
    });

    // 2. 按节点顺序添加所有审批节点
    workflowNodes.forEach((node: any, nodeIndex: number) => {
      // 查找该节点的所有审批记录
      const nodeApprovals = approvals.filter((a: any) => a.nodeId === node.id);

      // 判断节点状态
      const hasApproved = nodeApprovals.some((a: any) => a.action === 'APPROVED');
      const hasRejected = nodeApprovals.some((a: any) => a.action === 'REJECTED');
      const allApproved = nodeApprovals.length > 0 && nodeApprovals.every((a: any) => a.action === 'APPROVED');
      const isPending = nodeApprovals.length > 0 && nodeApprovals.some((a: any) => !a.action) && !hasRejected && !hasApproved;
      const isFuture = nodeApprovals.length === 0;

      let color = 'gray';
      if (hasApproved) color = 'green';
      else if (hasRejected) color = 'red';
      else if (isPending) color = 'blue';
      else if (isFuture) color = 'gray';

      let dot = null;
      if (allApproved) dot = <CheckOutlined style={{ fontSize: '14px', color: 'green' }} />;
      else if (hasRejected) dot = <CloseOutlined style={{ fontSize: '14px', color: 'red' }} />;
      else if (isPending) dot = <div style={{ width: 8, height: 8, borderRadius: '50%', border: '2px solid #1890ff', background: '#fff' }} />;
      else if (isFuture) dot = <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d9d9d9' }} />;

      timelineItems.push({
        key: `node-${node.id}`,
        color,
        dot,
        title: (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>
                {node.nodeName} {node.needAllApprove && <Tag color="orange" style={{ fontSize: 10, marginLeft: 4 }}>会签</Tag>}
              </div>
              {allApproved && nodeApprovals[0]?.approvedAt && (
                <div style={{ fontSize: 12, color: '#666' }}>
                  {dayjs(nodeApprovals[0].approvedAt).format('YYYY-MM-DD HH:mm')}
                </div>
              )}
            </div>

            {/* 显示所有审批人 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {node.approvers && node.approvers.length > 0 ? (
                // 显示审批人列表
                node.approvers.map((approver: any, approverIndex: number) => {
                  const isApproved = approver.status === 'approved';
                  const isRejected = approver.status === 'rejected';
                  const isPending = approver.status === 'pending';

                  const avatarChar = approver.name ? approver.name.charAt(0).toUpperCase() : '?';

                  return (
                    <div
                      key={approver.id || approverIndex}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        padding: '8px 10px',
                        background: isPending ? '#f0f5ff' : isApproved ? '#f6ffed' : '#fff1f0',
                        borderRadius: '6px',
                        border: `1px solid ${isPending ? '#adc6ff' : isApproved ? '#b7eb8f' : '#ffccc7'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: isPending
                              ? 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)'
                              : isApproved
                              ? 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)'
                              : 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '13px',
                            fontWeight: 500,
                          }}
                        >
                          {avatarChar}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#262626' }}>
                          {approver.name}
                        </div>
                      </div>
                      <div>
                        {isPending && <Tag color="blue" style={{ fontSize: 11, padding: '1px 6px' }}>待审批</Tag>}
                        {isApproved && <Tag color="green" style={{ fontSize: 11, padding: '1px 6px' }}>已通过</Tag>}
                        {isRejected && <Tag color="red" style={{ fontSize: 11, padding: '1px 6px' }}>已退回</Tag>}
                      </div>
                      {isPending && approver.approvedAt && (
                        <div style={{ fontSize: 12, color: '#666' }}>
                          {dayjs(approver.approvedAt).format('YYYY-MM-DD HH:mm')}
                        </div>
                      )}
                      {approver.comment && (
                        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                          审批意见：{approver.comment}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                // 没有审批人信息
                <div
                  style={{
                    padding: '8px 10px',
                    background: '#fafafa',
                    borderRadius: '6px',
                    border: '1px dashed #d9d9d9',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#999' }}>
                    暂无审批人信息
                  </div>
                </div>
              )}
            </div>
          </div>
        ),
      });
    });

    return timelineItems;
  };

  if (isLoading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!selectedRequest) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <p>加载失败</p>
        <Button onClick={() => navigate('/support/list')}>返回列表</Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="支援申请详情"
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/support/list')}>
            返回列表
          </Button>
        }
      >
        <div style={{ display: 'flex', gap: '24px' }}>
          {/* 左侧：表单信息 */}
          <div style={{ flex: 1 }}>
            <Divider orientation="left">表单信息</Divider>

            {/* 基础信息 */}
            <Descriptions bordered column={3} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="申请编号" span={1}>
                {selectedRequest.instanceNo}
              </Descriptions.Item>
              <Descriptions.Item label="发起人" span={1}>
                {selectedRequest.initiatorName || selectedRequest.requesterName}
              </Descriptions.Item>
              <Descriptions.Item label="申请人" span={1}>
                {selectedRequest.applicantName}
              </Descriptions.Item>
              <Descriptions.Item label="申请标题" span={1}>
                {selectedRequest.instance?.title}
              </Descriptions.Item>
              <Descriptions.Item label="申请时间" span={1}>
                {dayjs(selectedRequest.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="申请状态" span={1}>
                {getStatusTag(selectedRequest.status)}
              </Descriptions.Item>
            </Descriptions>

            {/* 表单详细信息 */}
            <Card size="small" title="详细信息" bordered={false}>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="支援模式">
                  {getSupportModeTag(selectedRequest.supportMode)}
                </Descriptions.Item>
                <Descriptions.Item label="支援人员">
                  {selectedRequest.supportEmployeeName}
                </Descriptions.Item>
                <Descriptions.Item label="员工编号">
                  {selectedRequest.supportEmployeeNo}
                </Descriptions.Item>
                <Descriptions.Item label="支援地点">
                  {selectedRequest.supportAccountName}
                </Descriptions.Item>
                {selectedRequest.supportMode === 'FULL_DAY' ? (
                  <>
                    <Descriptions.Item label="开始日期">
                      {selectedRequest.startDate ? dayjs(selectedRequest.startDate).format('YYYY-MM-DD') : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="结束日期">
                      {selectedRequest.endDate ? dayjs(selectedRequest.endDate).format('YYYY-MM-DD') : '-'}
                    </Descriptions.Item>
                  </>
                ) : (
                  <>
                    <Descriptions.Item label="开始时间">
                      {selectedRequest.startTime ? dayjs(selectedRequest.startTime).format('YYYY-MM-DD HH:mm') : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="结束时间">
                      {selectedRequest.endTime ? dayjs(selectedRequest.endTime).format('YYYY-MM-DD HH:mm') : '-'}
                    </Descriptions.Item>
                  </>
                )}
                <Descriptions.Item label="支援时数">
                  {selectedRequest.calculatedHours}小时
                </Descriptions.Item>
                <Descriptions.Item label="-">
                  -
                </Descriptions.Item>
                {selectedRequest.description && (
                  <Descriptions.Item label="详细描述" span={2}>
                    {selectedRequest.description || '-'}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          </div>

          {/* 右侧：审批流程 */}
          <div style={{ width: '320px', minWidth: '320px' }}>
            <Divider orientation="left">审批流程</Divider>
            {selectedRequest.instance?.approvals && selectedRequest.instance.approvals.length > 0 ? (
              <Timeline mode="left" style={{ marginTop: 16, marginLeft: '-8px' }}>
                {buildApprovalTimeline()?.map((item: any) => (
                  <Timeline.Item key={item.key} color={item.color} dot={item.dot}>
                    {item.title}
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>暂无审批记录</div>
            )}

            {/* 审批操作 */}
            {canApprove(selectedRequest) && (
              <>
                <Divider orientation="left">审批操作</Divider>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Radio.Group
                    value={approvalAction}
                    onChange={(e) => setApprovalAction(e.target.value)}
                  >
                    <Radio value="approve">
                      <CheckOutlined style={{ color: 'green' }} /> 同意
                    </Radio>
                    <Radio value="reject" style={{ marginLeft: 16 }}>
                      <CloseOutlined style={{ color: 'red' }} /> 退回
                    </Radio>
                  </Radio.Group>
                  <Input.TextArea
                    placeholder="请输入审批意见（退回时必填）"
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    rows={3}
                    maxLength={500}
                    showCount
                  />
                  <Space>
                    <Button
                      type="primary"
                      disabled={!approvalAction}
                      loading={approvalMutation.isPending}
                      onClick={() => approvalAction && handleApproval(approvalAction)}
                    >
                      提交审批
                    </Button>
                    <Button onClick={() => {
                      setApprovalAction(null);
                      setApprovalComment('');
                    }}>
                      取消
                    </Button>
                  </Space>
                </Space>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SupportRequestDetailPage;
