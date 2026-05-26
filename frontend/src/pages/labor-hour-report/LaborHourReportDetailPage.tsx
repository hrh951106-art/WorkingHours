import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  Tag,
  message,
  Descriptions,
  Divider,
  Input,
  Radio,
  Spin,
  Timeline,
} from 'antd';
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';
import request from '@/utils/request';
import { useAuthStore } from '@/stores/authStore';

interface LaborHourReport {
  id: number;
  requestNo: string;
  workflowCode: string;
  title: string;
  reportDate: string;
  reportMode: string;
  employeeId: number;
  employeeName: string;
  employeeNo: string;
  hourType: string;
  hourTypeName: string;
  startTime: string;
  endTime: string;
  value: number;
  unit: string;
  description?: string;
  accountId: number;
  accountCode: string;
  accountName: string;
  status: string;
  requesterId: number;
  requesterName: string;
  approverId?: number;
  approverName?: string;
  approvedAt?: string;
  approvalComment?: string;
  createdAt: string;
  updatedAt: string;
  instanceId?: number;
  employees?: Array<{
    id: number;
    employeeNo: string;
    employeeName: string;
  }>;
  instance?: {
    id: number;
    instanceNo: string;
    status: string;
    currentStep: string;
    initiatorId: number;
    initiatorName: string;
    initiatedAt: string;
    approvals?: any[];
    definition?: {
      nodes?: any[];
    };
  };
}

const LaborHourReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [selectedReport, setSelectedReport] = useState<LaborHourReport | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | null>(null);
  const [approvalComment, setApprovalComment] = useState('');

  // 获取工时报工详情
  const { data: detail, isLoading, refetch } = useQuery({
    queryKey: ['laborHourReportDetail', id],
    queryFn: async () => {
      const response = await request.get(`/labor-hour-report/requests/${id}`);
      return response.data || response;
    },
  });

  // 当数据加载成功后，设置selectedReport
  useEffect(() => {
    if (detail) {
      setSelectedReport(detail);
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
  const canApprove = (report: LaborHourReport) => {
    if (!user || !report.instance || report.instance.status !== 'RUNNING') {
      return false;
    }

    try {
      // 获取当前节点名称
      const currentStep = report.instance.currentStep;

      // 查找当前节点的所有审批记录
      const currentApprovals = report.instance.approvals?.filter((approval: any) => {
        const isCurrentNode = approval.nodeName === currentStep;
        const isNotApproved = !approval.action || approval.action === '';
        return isCurrentNode && isNotApproved;
      });

      if (!currentApprovals || currentApprovals.length === 0) {
        return false;
      }

      // 检查当前用户是否是当前节点的审批人之一
      return currentApprovals.some((approval: any) => {
        // 如果没有审批人（自动通过），则不能审批
        if (approval.approverId === 0) {
          return false;
        }

        // 检查当前用户是否是审批人
        let approvers: any[] = [];
        try {
          approvers = approval.approvers ? JSON.parse(approval.approvers) : [];
        } catch {
          approvers = [];
        }

        // 直接匹配approverId或从approvers列表中查找
        const isDirectApprover = approval.approverId === user.id;
        const isInApproversList = approvers.some((a: any) => a.id === user.id);

        return isDirectApprover || isInApproversList;
      });
    } catch {
      return false;
    }
  };

  // 处理审批操作
  const handleApproval = (action: 'approve' | 'reject') => {
    if (!selectedReport?.instanceId) return;

    const approvalAction = action === 'approve' ? 'APPROVED' : 'REJECTED';

    if (action === 'reject' && !approvalComment.trim()) {
      message.warning('退回时必须填写审批意见');
      return;
    }

    approvalMutation.mutate({
      instanceId: selectedReport.instanceId,
      action: approvalAction,
      comment: approvalComment || undefined,
    });
  };

  // 格式化申请状态标签
  const getStatusTag = (status: string) => {
    const config: Record<string, { color: string; text: string }> = {
      PENDING: { color: 'orange', text: '审批中' },
      RUNNING: { color: 'orange', text: '审批中' },
      APPROVED: { color: 'green', text: '已通过' },
      COMPLETED: { color: 'green', text: '已完成' },
      REJECTED: { color: 'red', text: '已拒绝' },
      WITHDRAWN: { color: 'default', text: '已撤回' },
    };
    const item = config[status] || { color: 'default', text: status };
    return <Tag color={item.color}>{item.text}</Tag>;
  };

  // 构建审批流程时间轴
  const buildApprovalTimeline = () => {
    if (!selectedReport?.instance) {
      return null;
    }

    if (!selectedReport.instance.definition || !selectedReport.instance.definition.nodes) {
      return null;
    }

    const timelineItems: any[] = [];
    const workflowNodes = selectedReport.instance.definition.nodes.filter((node: any) => node.nodeType === 'approval');
    const approvals = selectedReport.instance.approvals || [];

    // 1. 添加申请节点
    const applicantName = selectedReport.reportMode === 'team'
      ? `${selectedReport.requesterName}(团队报工)`
      : selectedReport.employeeName;

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
              {dayjs(selectedReport.createdAt).format('YYYY-MM-DD HH:mm')}
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
                {applicantName?.charAt(0)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#262626' }}>
                {applicantName}
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
              <div style={{ fontSize: 12, color: '#666' }}>
                {hasApproved || hasRejected
                  ? dayjs(nodeApprovals.find((a: any) => a.action)?.approvedAt).format('YYYY-MM-DD HH:mm')
                  : '-'}
              </div>
            </div>

            {/* 审批人列表 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {nodeApprovals.map((approval: any) => {
                // 解析审批人列表
                let approvers: any[] = [];
                try {
                  approvers = approval.approvers ? JSON.parse(approval.approvers) : [];
                } catch {
                  approvers = [];
                }

                // 如果没有审批人（自动通过）
                if (approvers.length === 0 && approval.approverId === 0) {
                  return (
                    <div
                      key={approval.id}
                      style={{
                        padding: '6px 10px',
                        background: '#f6ffed',
                        borderRadius: '6px',
                        border: '1px solid #b7eb8f',
                        width: '100%',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: '#52c41a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: 500,
                          }}
                        >
                          ✓
                        </div>
                        <div style={{ fontSize: 12, color: '#262626' }}>
                          无审批人（自动通过）
                        </div>
                        <Tag color="green" style={{ fontSize: 10, padding: '0 4px', marginLeft: 'auto' }}>已通过</Tag>
                      </div>
                    </div>
                  );
                }

                // 显示所有审批人
                return (
                  <div key={approval.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {approvers.map((approver: any, idx: number) => {
                      // 检查该审批人是否已审批
                      const isDirectApprover = approval.approverId === approver.id;
                      const hasAction = isDirectApprover && approval.action;
                      const isApproved = approval.action === 'APPROVED';
                      const isRejected = approval.action === 'REJECTED';

                      const bgColor = hasAction ? (isApproved ? '#f6ffed' : '#fff1f0') : '#e6f7ff';
                      const borderColor = hasAction ? (isApproved ? '#b7eb8f' : '#ffccc7') : '#91d5ff';
                      const statusTag = hasAction
                        ? (isApproved ? <Tag color="green" style={{ fontSize: 10, padding: '0 4px' }}>已通过</Tag>
                          : <Tag color="red" style={{ fontSize: 10, padding: '0 4px' }}>已退回</Tag>)
                        : <Tag color="blue" style={{ fontSize: 10, padding: '0 4px' }}>待审批</Tag>;

                      return (
                        <div
                          key={`${approval.id}-${idx}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            padding: '6px 10px',
                            background: bgColor,
                            borderRadius: '6px',
                            border: `1px solid ${borderColor}`,
                            width: '100%',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                            <div
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: hasAction ? (isApproved ? '#52c41a' : '#ff4d4f') : '#1890ff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '11px',
                                fontWeight: 500,
                              }}
                            >
                              {approver.name?.charAt(0) || '?'}
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 400, color: '#262626' }}>
                              {approver.name}
                            </div>
                          </div>
                          {statusTag}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* 审批意见 */}
            {nodeApprovals.some((a: any) => a.comment) && (
              <div style={{ marginTop: 8, padding: '6px 10px', background: '#fafafa', borderRadius: '4px', fontSize: 12 }}>
                <span style={{ color: '#666' }}>审批意见：</span>
                {nodeApprovals.find((a: any) => a.comment)?.comment}
              </div>
            )}
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

  if (!selectedReport) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <p>加载失败</p>
        <Button onClick={() => navigate('/labor-hour-report/list')}>返回列表</Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="工时报工详情"
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/labor-hour-report/list')}>
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
                {selectedReport.requestNo}
              </Descriptions.Item>
              <Descriptions.Item label="报工模式" span={1}>
                {selectedReport.reportMode === 'personal' ? (
                  <Tag color="blue">个人报工</Tag>
                ) : (
                  <Tag color="green">团队报工</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="发起人" span={1}>
                {selectedReport.requesterName}
              </Descriptions.Item>
              <Descriptions.Item label="申请标题" span={1}>
                {selectedReport.title}
              </Descriptions.Item>
              <Descriptions.Item label="申请时间" span={1}>
                {dayjs(selectedReport.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="申请状态" span={1}>
                {getStatusTag(selectedReport.status)}
              </Descriptions.Item>
            </Descriptions>

            {/* 团队报工：显示员工列表 */}
            {selectedReport.reportMode === 'team' && selectedReport.employees && selectedReport.employees.length > 0 && (
              <>
                <Divider orientation="left">报工人员 ({selectedReport.employees.length}人)</Divider>
                <div style={{
                  background: '#fafafa',
                  padding: '12px',
                  borderRadius: '6px',
                  marginBottom: 16,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px'
                }}>
                  {selectedReport.employees.map((emp) => (
                    <Tag key={emp.id} style={{ padding: '4px 8px', fontSize: 13, marginBottom: 0 }}>
                      {emp.employeeName} ({emp.employeeNo})
                    </Tag>
                  ))}
                </div>
              </>
            )}

            {/* 个人报工：显示申请人 */}
            {selectedReport.reportMode === 'personal' && (
              <>
                <Divider orientation="left">报工人员</Divider>
                <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="员工编号">
                    {selectedReport.employeeNo}
                  </Descriptions.Item>
                  <Descriptions.Item label="员工姓名">
                    {selectedReport.employeeName}
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}

            {/* 表单详细信息 */}
            <Card size="small" title="详细信息" bordered={false}>
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="报工日期">
                  {dayjs(selectedReport.reportDate).format('YYYY-MM-DD')}
                </Descriptions.Item>
                <Descriptions.Item label="工时类型">
                  {selectedReport.hourTypeName}
                </Descriptions.Item>
                <Descriptions.Item label="工时代码">
                  {selectedReport.hourType}
                </Descriptions.Item>
                <Descriptions.Item label="开始时间">
                  {selectedReport.startTime}
                </Descriptions.Item>
                <Descriptions.Item label="结束时间">
                  {selectedReport.endTime}
                </Descriptions.Item>
                <Descriptions.Item label="工时数量">
                  {selectedReport.value} {selectedReport.unit}
                </Descriptions.Item>
                {selectedReport.description && (
                  <Descriptions.Item label="详细描述" span={2}>
                    {selectedReport.description || '-'}
                  </Descriptions.Item>
                )}
              </Descriptions>

              {/* 报工归属 */}
              <Divider orientation="left" style={{ margin: '16px 0' }}>报工归属</Divider>
              <div style={{ background: '#fafafa', padding: '12px', borderRadius: '6px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: '#fff',
                    borderRadius: '4px',
                    border: '1px solid #e8e8e8',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>
                      {selectedReport.accountName}
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      代码：{selectedReport.accountCode}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* 右侧：审批流程 */}
          <div style={{ width: '380px', minWidth: '380px' }}>
            <Divider orientation="left">审批信息</Divider>

            {/* 审批流程时间轴 */}
            {selectedReport.instance ? (
              <Timeline items={buildApprovalTimeline()} style={{ marginTop: 16 }} />
            ) : (
              <div style={{ padding: '16px', background: '#fafafa', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#999' }}>无审批流程信息</div>
              </div>
            )}

            {/* 审批操作 */}
            {canApprove(selectedReport) && (
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

export default LaborHourReportDetailPage;
