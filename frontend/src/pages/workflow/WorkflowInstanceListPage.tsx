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
  DatePicker,
  Row,
  Col,
} from 'antd';
import { EyeOutlined, ReloadOutlined, CheckOutlined, CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import request from '@/utils/request';
import dayjs from 'dayjs';

interface WorkflowInstance {
  id: number;
  instanceNo?: string;
  businessKey?: string;
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
  laborHourReports?: Array<{ id: number; requestNo: string }>;
}

const WorkflowInstanceListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
  const [isForceApproveModalVisible, setIsForceApproveModalVisible] = useState(false);
  const [forceApproveForm] = Form.useForm();
  const [pendingApprovalNode, setPendingApprovalNode] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: undefined,
    category: undefined,
    dateRange: undefined as [dayjs.Dayjs, dayjs.Dayjs] | undefined,
    keyword: undefined as string | undefined,
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

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
      if (filters.dateRange && filters.dateRange.length === 2) {
        params.startDate = filters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = filters.dateRange[1].format('YYYY-MM-DD');
      }
      if (filters.keyword) params.keyword = filters.keyword;

      console.log('=== Fetching workflow instances ===');
      console.log('Params:', params);
      const response = await request.get('/workflow/instances', { params });
      console.log('Response:', response);
      console.log('Response keys:', Object.keys(response || {}));
      console.log('Items:', response?.items);
      console.log('Items length:', response?.items?.length || 0);
      return response;
    },
  });

  // 强制审批 mutation
  const forceApproveMutation = useMutation({
    mutationFn: async ({ instanceId, nodeId, action, comment }: any) => {
      return request.post('/workflow/instances/force-approval', {
        instanceId,
        nodeId,
        action,
        comment,
      });
    },
    onSuccess: () => {
      message.success('强制审批成功');
      setIsForceApproveModalVisible(false);
      forceApproveForm.resetFields();
      setPendingApprovalNode(null);
      queryClient.invalidateQueries({ queryKey: ['workflowInstances'] });
      refetch();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '强制审批失败');
    },
  });

  // 查看表单详情
  const handleViewForm = (record: WorkflowInstance) => {
    // 根据不同的 category 跳转到不同的详情页
    if (record.category === 'LABOR_HOUR_REPORT') {
      // 使用 labor hour report 的 id
      if (record.laborHourReports && record.laborHourReports.length > 0) {
        const reportId = record.laborHourReports[0].id;
        navigate(`/labor-hour-report/${reportId}`);
      } else {
        message.warning('未找到关联的工时报工记录');
      }
    } else if (record.category === 'SUPPORT_REQUEST') {
      // 支援申请的路由（待实现）
      message.warning('支援申请详情页面待实现');
    } else {
      message.warning(`未知的流程分类: ${record.category}`);
    }
  };

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

  // 打开强制审批弹窗
  const handleForceApprove = (record: WorkflowInstance, node: any) => {
    setPendingApprovalNode({ instance: record, node });
    setIsForceApproveModalVisible(true);
  };

  // 从顶部按钮触发强制审批
  const handleBatchForceApprove = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要强制审批的记录');
      return;
    }

    // 获取选中的记录
    const selectedRecords = instancesData?.items?.filter((item: WorkflowInstance) =>
      selectedRowKeys.includes(item.id)
    );

    if (!selectedRecords || selectedRecords.length === 0) {
      message.warning('未找到选中的记录');
      return;
    }

    // 检查是否都是进行中的状态
    const runningRecords = selectedRecords.filter((r: WorkflowInstance) => r.status === 'RUNNING');
    if (runningRecords.length === 0) {
      message.warning('选中的记录中没有进行中的流程');
      return;
    }

    // 取第一条进行中的记录进行强制审批
    const firstRunning = runningRecords[0];
    if (firstRunning.currentNodes && firstRunning.currentNodes.length > 0) {
      setPendingApprovalNode({ instance: firstRunning, node: firstRunning.currentNodes[0] });
      setIsForceApproveModalVisible(true);
    } else {
      message.warning('该流程没有待审批节点');
    }
  };

  // 提交强制审批
  const handleForceApproveSubmit = async () => {
    try {
      const values = await forceApproveForm.validateFields();
      await forceApproveMutation.mutateAsync({
        instanceId: pendingApprovalNode.instance.id,
        nodeId: pendingApprovalNode.node.id,
        action: 'APPROVED', // 强制通过，默认为通过操作
        comment: values.comment,
      });
    } catch (error) {
      // Form validation failed
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

  // 搜索
  const handleSearch = () => {
    refetch();
  };

  // 重置筛选
  const handleReset = () => {
    setFilters({
      status: undefined,
      category: undefined,
      dateRange: undefined,
      keyword: undefined,
    });
  };

  const columns = [
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category: string) => {
        const categoryMap: Record<string, { text: string; color: string }> = {
          SUPPORT_REQUEST: { text: '支援申请', color: 'blue' },
          PRODUCTION_REPORT: { text: '报工申请', color: 'green' },
          LABOR_HOUR_REPORT: { text: '工时报工', color: 'purple' },
        };
        const info = categoryMap[category] || { text: category, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 250,
      ellipsis: true,
      render: (title: string, record: WorkflowInstance) => (
        <a
          onClick={() => handleViewForm(record)}
          style={{ cursor: 'pointer', color: '#1890ff' }}
        >
          {title}
        </a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          RUNNING: { text: '进行中', color: 'blue' },
          COMPLETED: { text: '已完成', color: 'green' },
          CANCELLED: { text: '已取消', color: 'gray' },
          REJECTED: { text: '已驳回', color: 'red' },
          PENDING: { text: '进行中', color: 'blue' },
          APPROVED: { text: '已通过', color: 'green' },
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
      title: '申请人',
      key: 'applicants',
      width: 200,
      render: (_: any, record: WorkflowInstance) => {
        // 尝试从 data 字段解析申请人信息
        try {
          const data = typeof record.data === 'string' ? JSON.parse(record.data) : record.data;
          if (record.category === 'LABOR_HOUR_REPORT') {
            // 工时报工：显示报工模式相关的人员
            if (data.reportMode === 'team') {
              return '团队报工';
            } else {
              return data.employeeName || record.initiatorName || '-';
            }
          }
          return '-';
        } catch {
          return '-';
        }
      },
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
  ];

  return (
    <div>
      <Card
        title="流程管理"
        extra={
          <Space>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleBatchForceApprove}
              disabled={selectedRowKeys.length === 0}
              style={{ marginRight: 8 }}
            >
              强制通过 {selectedRowKeys.length > 0 && `(${selectedRowKeys.length})`}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
              刷新
            </Button>
          </Space>
        }
      >
        {/* 筛选表单 */}
        <Form layout="inline" style={{ marginBottom: 16 }}>
          <Row gutter={12} style={{ width: '100%', alignItems: 'center' }}>
            <Col span={5}>
              <Form.Item label="表单类型" style={{ marginBottom: 0 }}>
                <Select
                  placeholder="选择表单类型"
                  allowClear
                  style={{ width: '100%' }}
                  value={filters.category}
                  onChange={(value) => setFilters({ ...filters, category: value })}
                  options={[
                    { label: '支援申请', value: 'SUPPORT_REQUEST' },
                    { label: '报工申请', value: 'PRODUCTION_REPORT' },
                    { label: '工时报工', value: 'LABOR_HOUR_REPORT' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item label="表单状态" style={{ marginBottom: 0 }}>
                <Select
                  placeholder="选择表单状态"
                  allowClear
                  style={{ width: '100%' }}
                  value={filters.status}
                  onChange={(value) => setFilters({ ...filters, status: value })}
                  options={[
                    { label: '进行中', value: 'RUNNING' },
                    { label: '已完成', value: 'COMPLETED' },
                    { label: '已驳回', value: 'REJECTED' },
                    { label: '已取消', value: 'CANCELLED' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="发起日期" style={{ marginBottom: 0 }}>
                <DatePicker.RangePicker
                  style={{ width: '100%' }}
                  value={filters.dateRange}
                  onChange={(dates) => setFilters({ ...filters, dateRange: dates as [dayjs.Dayjs, dayjs.Dayjs] | undefined })}
                />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item label="工号/姓名" style={{ marginBottom: 0 }}>
                <Input
                  placeholder="输入工号或姓名"
                  allowClear
                  value={filters.keyword}
                  onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                  onPressEnter={handleSearch}
                />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Space style={{ marginLeft: 8 }}>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                  查询
                </Button>
                <Button onClick={handleReset}>
                  重置
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>

        <Table
          columns={columns}
          dataSource={instancesData?.items || []}
          loading={isLoading}
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: (newSelectedRowKeys) => setSelectedRowKeys(newSelectedRowKeys),
            getCheckboxProps: (record: WorkflowInstance) => ({
              disabled: record.status !== 'RUNNING',
              name: record.title,
            }),
          }}
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
        destroyOnClose
        centered
        footer={null}
        styles={{
          body: {
            padding: '24px 12px'
          }
        }}
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
                  {selectedInstance.approvals.map((approval: any, index: number) => {
                    const isForced = approval.approverName && approval.approverName.includes('强制通过');
                    return (
                      <div
                        key={index}
                        style={{
                          padding: '12px',
                          marginBottom: '8px',
                          border: isForced ? '2px solid #ff4d4f' : '1px solid #f0f0f0',
                          borderRadius: '4px',
                          backgroundColor: isForced ? '#fff2f0' : 'transparent',
                        }}
                      >
                        <div style={{ fontWeight: 500, marginBottom: 4 }}>
                          {approval.approverName} - {approval.nodeName}
                          {isForced && (
                            <Tag color="red" style={{ marginLeft: 8 }}>强制通过</Tag>
                          )}
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
                          <div style={{ marginTop: 8, color: '#666' }}>
                            {approval.comment}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        <div style={{ height: '64px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center', flexShrink: 0, padding: '0 20px', margin: '24px -12px -12px -12px', width: 'calc(100% + 24px)' }}>
          <Button onClick={handleDetailModalCancel}>关闭</Button>
        </div>
      </Modal>

      {/* 强制通过弹窗 */}
      <Modal
        title="强制通过"
        open={isForceApproveModalVisible}
        onCancel={() => {
          setIsForceApproveModalVisible(false);
          forceApproveForm.resetFields();
          setPendingApprovalNode(null);
        }}
        width={600}
        destroyOnClose
        centered
        footer={null}
        styles={{
          body: {
            padding: '0'
          }
        }}
      >
        <div style={{ padding: '24px 12px' }}>
          {pendingApprovalNode && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>流程信息</div>
                <div>标题: {pendingApprovalNode.instance.title}</div>
                <div style={{ color: '#ff4d4f', marginTop: 4 }}>
                  ⚠️ 此操作将强制通过所有剩余审批节点
                </div>
              </div>
              <Form form={forceApproveForm} layout="vertical">
                <Form.Item
                  label="备注"
                  name="comment"
                  rules={[{ required: true, message: '请输入备注' }]}
                >
                  <Input.TextArea
                    rows={4}
                    placeholder="请输入备注信息"
                    maxLength={500}
                    showCount
                  />
                </Form.Item>
              </Form>
            </div>
          )}
          <div style={{ height: '64px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center', flexShrink: 0, padding: '0 20px', margin: '24px 0 0 0' }}>
            <Button onClick={() => {
              setIsForceApproveModalVisible(false);
              forceApproveForm.resetFields();
              setPendingApprovalNode(null);
            }}>取消</Button>
            <Button type="primary" onClick={handleForceApproveSubmit} loading={forceApproveMutation.isPending}>确定</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WorkflowInstanceListPage;
