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
  Row,
  Col,
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
      console.log('=== LaborHourReport Detail (Component) ===');
      console.log('detail:', detail);
      console.log('detail keys:', Object.keys(detail));
      console.log('detail.instance:', detail.instance);
      console.log('detail.instance?.definition:', detail.instance?.definition);
      console.log('detail.instance?.definition?.nodes:', detail.instance?.definition?.nodes);
      console.log('detail.instance?.approvals:', detail.instance?.approvals);
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
    console.log('=== buildApprovalTimeline ===');
    console.log('selectedReport:', selectedReport);
    console.log('selectedReport?.instance:', selectedReport?.instance);

    if (!selectedReport?.instance) {
      console.log('No instance, returning null');
      return null;
    }

    console.log('selectedReport.instance.definition:', selectedReport.instance.definition);
    console.log('selectedReport.instance.definition.nodes:', selectedReport.instance.definition?.nodes);

    if (!selectedReport.instance.definition || !selectedReport.instance.definition.nodes) {
      console.log('No definition or nodes, returning null');
      return null;
    }

    const timelineItems: any[] = [];
    const workflowNodes = selectedReport.instance.definition.nodes.filter((node: any) => node.nodeType === 'approval');
    const approvals = selectedReport.instance.approvals || [];

    console.log('workflowNodes:', workflowNodes);
    console.log('workflowNodes length:', workflowNodes.length);
    console.log('approvals:', approvals);
    console.log('approvals length:', approvals.length);

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
                      // 检查审批记录的状态
                      const hasAction = !!approval.action; // 审批记录是否有操作
                      const isApproved = approval.action === 'APPROVED';
                      const isRejected = approval.action === 'REJECTED';
                      const isForced = approval.approverName && approval.approverName.includes('强制通过'); // 是否强制通过

                      // 如果审批记录已操作，所有人都显示相同的状态
                      const bgColor = hasAction ? (isApproved ? '#f6ffed' : '#fff1f0') : '#e6f7ff';
                      const borderColor = hasAction ? (isApproved ? '#b7eb8f' : '#ffccc7') : '#91d5ff';

                      // 状态标签
                      let statusTag;
                      if (hasAction) {
                        if (isApproved) {
                          statusTag = isForced
                            ? <Tag color="red" style={{ fontSize: 10, padding: '0 4px' }}>强制通过</Tag>
                            : <Tag color="green" style={{ fontSize: 10, padding: '0 4px' }}>已通过</Tag>;
                        } else {
                          statusTag = <Tag color="red" style={{ fontSize: 10, padding: '0 4px' }}>已退回</Tag>;
                        }
                      } else {
                        statusTag = <Tag color="blue" style={{ fontSize: 10, padding: '0 4px' }}>待审批</Tag>;
                      }

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
                            {hasAction && isForced && (
                              <Tag color="orange" style={{ fontSize: 9, padding: '0 4px' }}>管理员操作</Tag>
                            )}
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

    console.log('timelineItems:', timelineItems);
    console.log('timelineItems length:', timelineItems.length);

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
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/workflow/instances')}>
            返回列表
          </Button>
        }
      >
        {/* 概要信息 */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '8px',
          padding: '20px 24px',
          marginBottom: '24px',
          color: 'white',
        }}>
          <Row gutter={[16, 12]}>
            <Col span={4}>
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>申请编号</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{selectedReport.requestNo}</div>
            </Col>
            <Col span={4}>
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>表单编号</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                {selectedReport.instance?.instanceNo || selectedReport.workflowCode}
              </div>
            </Col>
            <Col span={4}>
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>发起人</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{selectedReport.requesterName}</div>
            </Col>
            <Col span={4}>
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>发起时间</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                {dayjs(selectedReport.createdAt).format('YYYY-MM-DD HH:mm')}
              </div>
            </Col>
            <Col span={4}>
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>申请状态</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                {getStatusTag(selectedReport.status)}
              </div>
            </Col>
          </Row>
        </div>

        <div style={{ display: 'flex', gap: '24px' }}>
          {/* 左侧：表单信息 */}
          <div style={{ flex: 1 }}>
            {/* 报工模式 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>报工模式</div>
                {selectedReport.reportMode === 'personal' ? (
                  <Tag color="blue">个人报工</Tag>
                ) : (
                  <Tag color="green">团队报工</Tag>
                )}
              </Col>
              <Col span={12}></Col>
            </Row>

            {/* 团队报工：显示组织 */}
            {selectedReport.reportMode === 'team' && selectedReport.employees && selectedReport.employees.length > 0 && (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={24}>
                  <div style={{ fontWeight: 500, marginBottom: 8 }}>报工人员</div>
                  <div style={{
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    padding: '12px',
                    background: '#fafafa',
                    minHeight: '60px'
                  }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
                      共 {selectedReport.employees.length} 人
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedReport.employees.map((emp) => (
                        <Tag key={emp.id} style={{ marginBottom: 0, padding: '4px 10px', fontSize: 13 }}>
                          {emp.employeeName} ({emp.employeeNo})
                        </Tag>
                      ))}
                    </div>
                  </div>
                </Col>
              </Row>
            )}

            {/* 个人报工：显示员工信息 */}
            {selectedReport.reportMode === 'personal' && (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={12}>
                  <div style={{ fontWeight: 500, marginBottom: 8 }}>报工人员</div>
                  <div>{selectedReport.employeeName}</div>
                </Col>
                <Col span={12}>
                  <div style={{ fontWeight: 500, marginBottom: 8 }}>员工编号</div>
                  <div>{selectedReport.employeeNo}</div>
                </Col>
              </Row>
            )}

            {/* 工时信息 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>报工日期</div>
                <div>{dayjs(selectedReport.reportDate).format('YYYY-MM-DD')}</div>
              </Col>
              <Col span={12}>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>工时类型</div>
                <div>{selectedReport.hourTypeName}</div>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>开始时间</div>
                <div>{selectedReport.startTime}</div>
              </Col>
              <Col span={12}>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>结束时间</div>
                <div>{selectedReport.endTime}</div>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>工时数量</div>
                <div>{selectedReport.value} {selectedReport.unit}</div>
              </Col>
              <Col span={12}>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>单位</div>
                <div>{selectedReport.unit}</div>
              </Col>
            </Row>

            {/* 报工归属 */}
            <Row gutter={16} style={{ marginBottom: selectedReport.description ? 16 : 0 }}>
              <Col span={24}>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>报工归属</div>
                <div style={{
                  background: '#fafafa',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #e8e8e8'
                }}>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>
                    {selectedReport.accountName}
                  </div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    代码：{selectedReport.accountCode}
                  </div>
                </div>
              </Col>
            </Row>

            {/* 详细描述 */}
            {selectedReport.description && (
              <Row gutter={16}>
                <Col span={24}>
                  <div style={{ fontWeight: 500, marginBottom: 8 }}>详细描述</div>
                  <div style={{
                    background: '#fafafa',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #e8e8e8',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedReport.description}
                  </div>
                </Col>
              </Row>
            )}
          </div>

          {/* 右侧：审批流程 */}
          <div style={{ width: '380px', minWidth: '380px' }}>
            <Divider orientation="left">审批信息</Divider>

            {/* 审批流程时间轴 */}
            {selectedReport.instance ? (
              <Timeline mode="left" style={{ marginTop: 16, marginLeft: '-8px' }}>
                {buildApprovalTimeline()?.map((item: any) => (
                  <Timeline.Item key={item.key} color={item.color} dot={item.dot}>
                    {item.title}
                  </Timeline.Item>
                ))}
              </Timeline>
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
