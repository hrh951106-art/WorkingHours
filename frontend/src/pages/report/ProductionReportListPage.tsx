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
  Tabs,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
} from 'antd';
import { PlusOutlined, EyeOutlined, SyncOutlined, DownloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import request from '@/utils/request';
import { useNavigate } from 'react-router-dom';
import { exportProductionReports } from '@/utils/export';

interface ProductionReport {
  id: number;
  instanceNo: string;
  reportDate: string;
  reportType: string;
  reporterName: string;
  reporterOrgName: string;
  reporterLineName?: string;
  shiftName?: string;
  productCode: string;
  productName: string;
  processName?: string;
  plannedQty: number;
  actualQty: number;
  qualifiedQty: number;
  unqualifiedQty?: number;
  standardHours: number;
  totalStdHours: number;
  workHours?: number;
  instance: {
    id: number;
    status: string;
    title: string;
    workflowName: string;
    approvals?: any[];
  };
  createdAt: string;
}

const ProductionReportListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ProductionReport | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters] = useState({
    reportType: undefined,
    status: undefined,
    dateRange: undefined,
  });

  // 获取报工申请列表
  const { data: listData, isLoading } = useQuery({
    queryKey: ['productionReports', activeTab, filters],
    queryFn: async () => {
      const params: any = {
        page: 1,
        pageSize: 50,
      };

      if (activeTab === 'my') {
        return request.get('/report/my-requests', { params });
      } else if (activeTab === 'pending') {
        return request.get('/report/pending-approvals', { params });
      } else {
        if (filters.reportType) params.reportType = filters.reportType;
        if (filters.status) params.status = filters.status;
        if (filters.dateRange) {
          params.startDate = filters.dateRange[0].format('YYYY-MM-DD');
          params.endDate = filters.dateRange[1].format('YYYY-MM-DD');
        }
        return request.get('/report/requests', { params });
      }
    },
  });

  // 同步到生产记录
  const syncMutation = useMutation({
    mutationFn: (reportId: number) =>
      request.post(`/report/requests/${reportId}/sync`),
    onSuccess: () => {
      message.success('同步成功');
      queryClient.invalidateQueries({ queryKey: ['productionReports'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '同步失败');
    },
  });

  // 查看详情
  const handleViewDetail = async (record: ProductionReport) => {
    try {
      const report = await request.get(`/report/requests/${record.id}`);
      setSelectedReport(report);
      setIsDetailModalVisible(true);
    } catch (error: any) {
      message.error(error.response?.data?.message || '获取详情失败');
    }
  };

  // 同步到生产记录
  const handleSync = (reportId: number) => {
    Modal.confirm({
      title: '确认同步',
      content: '确定要将此报工数据同步到生产记录表吗？',
      onOk: () => {
        syncMutation.mutate(reportId);
      },
    });
  };

  // 关闭详情弹窗
  const handleDetailModalCancel = () => {
    setIsDetailModalVisible(false);
    setSelectedReport(null);
  };

  // 格式化报工类型标签
  const getReportTypeTag = (type: string) => {
    const config: Record<string, { color: string; text: string }> = {
      正常报工: { color: 'green', text: '正常报工' },
      返工报工: { color: 'orange', text: '返工报工' },
      试生产报工: { color: 'blue', text: '试生产报工' },
    };
    const item = config[type] || { color: 'default', text: type };
    return <Tag color={item.color}>{item.text}</Tag>;
  };

  // 格式化工作流状态标签
  const getWorkflowStatusTag = (status: string) => {
    const config: Record<string, { color: string; text: string }> = {
      PENDING: { color: 'orange', text: '审批中' },
      APPROVED: { color: 'green', text: '已通过' },
      REJECTED: { color: 'red', text: '已拒绝' },
      CANCELLED: { color: 'default', text: '已取消' },
    };
    const item = config[status] || { color: 'default', text: status };
    return <Tag color={item.color}>{item.text}</Tag>;
  };

  // 导出数据
  const handleExport = () => {
    const data = listData?.items || [];
    if (data.length === 0) {
      message.warning('暂无数据可导出');
      return;
    }

    try {
      exportProductionReports(data);
      message.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    }
  };

  const columns = [
    {
      title: '申请编号',
      dataIndex: 'instanceNo',
      key: 'instanceNo',
      width: 150,
    },
    {
      title: '报工日期',
      dataIndex: 'reportDate',
      key: 'reportDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '报工类型',
      dataIndex: 'reportType',
      key: 'reportType',
      width: 100,
      render: getReportTypeTag,
    },
    {
      title: '申请人',
      dataIndex: 'reporterName',
      key: 'reporterName',
      width: 100,
    },
    {
      title: '申请部门',
      dataIndex: 'reporterOrgName',
      key: 'reporterOrgName',
      width: 150,
    },
    {
      title: '产线',
      dataIndex: 'reporterLineName',
      key: 'reporterLineName',
      width: 100,
    },
    {
      title: '班次',
      dataIndex: 'shiftName',
      key: 'shiftName',
      width: 100,
    },
    {
      title: '产品编码',
      dataIndex: 'productCode',
      key: 'productCode',
      width: 120,
    },
    {
      title: '产品名称',
      dataIndex: 'productName',
      key: 'productName',
      width: 150,
    },
    {
      title: '计划数量',
      dataIndex: 'plannedQty',
      key: 'plannedQty',
      width: 100,
      align: 'right' as const,
    },
    {
      title: '实际数量',
      dataIndex: 'actualQty',
      key: 'actualQty',
      width: 100,
      align: 'right' as const,
    },
    {
      title: '合格数量',
      dataIndex: 'qualifiedQty',
      key: 'qualifiedQty',
      width: 100,
      align: 'right' as const,
    },
    {
      title: '标准工时',
      dataIndex: 'totalStdHours',
      key: 'totalStdHours',
      width: 100,
      align: 'right' as const,
      render: (hours: number) => hours.toFixed(2),
    },
    {
      title: '审批状态',
      dataIndex: ['instance', 'status'],
      key: 'workflowStatus',
      width: 100,
      render: getWorkflowStatusTag,
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: ProductionReport) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          {record.instance.status === 'APPROVED' && (
            <Button
              type="link"
              size="small"
              icon={<SyncOutlined />}
              onClick={() => handleSync(record.id)}
            >
              同步
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="报工申请管理"
      extra={
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={!listData?.items || listData.items.length === 0}
          >
            导出Excel
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/report/create')}
          >
            创建报工
          </Button>
        </Space>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          { key: 'all', label: '全部报工' },
          { key: 'my', label: '我的报工' },
          { key: 'pending', label: '待我审批' },
        ]}
      />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Select
              placeholder="报工类型"
              allowClear
              style={{ width: '100%' }}
              value={filters.reportType}
              onChange={(value) => setFilters({ ...filters, reportType: value })}
            >
              <Select.Option value="正常报工">正常报工</Select.Option>
              <Select.Option value="返工报工">返工报工</Select.Option>
              <Select.Option value="试生产报工">试生产报工</Select.Option>
            </Select>
          </Col>
          <Col span={8}>
            <Select
              placeholder="审批状态"
              allowClear
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
            >
              <Select.Option value="PENDING">审批中</Select.Option>
              <Select.Option value="APPROVED">已通过</Select.Option>
              <Select.Option value="REJECTED">已拒绝</Select.Option>
            </Select>
          </Col>
          <Col span={8}>
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              value={filters.dateRange}
              onChange={(value) => setFilters({ ...filters, dateRange: value })}
            />
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={listData?.items || []}
        loading={isLoading}
        rowKey="id"
        scroll={{ x: 2000 }}
        pagination={{
          total: listData?.total || 0,
          pageSize: listData?.pageSize || 20,
          current: listData?.page || 1,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />

      <Modal
        title="报工申请详情"
        open={isDetailModalVisible}
        onCancel={handleDetailModalCancel}
        footer={null}
        width={800}
      >
        {selectedReport && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="申请编号" span={2}>
              {selectedReport.instanceNo}
            </Descriptions.Item>
            <Descriptions.Item label="报工日期">
              {dayjs(selectedReport.reportDate).format('YYYY-MM-DD')}
            </Descriptions.Item>
            <Descriptions.Item label="报工类型">
              {getReportTypeTag(selectedReport.reportType)}
            </Descriptions.Item>
            <Descriptions.Item label="申请人">
              {selectedReport.reporterName}
            </Descriptions.Item>
            <Descriptions.Item label="申请部门">
              {selectedReport.reporterOrgName}
            </Descriptions.Item>
            <Descriptions.Item label="产线">
              {selectedReport.reporterLineName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="班次">
              {selectedReport.shiftName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="产品编码">
              {selectedReport.productCode}
            </Descriptions.Item>
            <Descriptions.Item label="产品名称">
              {selectedReport.productName}
            </Descriptions.Item>
            <Descriptions.Item label="工序">
              {selectedReport.processName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="计划数量">
              {selectedReport.plannedQty}
            </Descriptions.Item>
            <Descriptions.Item label="实际数量">
              {selectedReport.actualQty}
            </Descriptions.Item>
            <Descriptions.Item label="合格数量">
              {selectedReport.qualifiedQty}
            </Descriptions.Item>
            <Descriptions.Item label="不合格数量">
              {selectedReport.unqualifiedQty || 0}
            </Descriptions.Item>
            <Descriptions.Item label="标准工时">
              {selectedReport.standardHours}
            </Descriptions.Item>
            <Descriptions.Item label="总标准工时">
              {selectedReport.totalStdHours.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="实际工时">
              {selectedReport.workHours || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="审批状态" span={2}>
              {getWorkflowStatusTag(selectedReport.instance.status)}
            </Descriptions.Item>
            {selectedReport.instance.approvals && selectedReport.instance.approvals.length > 0 && (
              <Descriptions.Item label="审批记录" span={2}>
                {selectedReport.instance.approvals.map((approval: any, index: number) => (
                  <div key={index} style={{ marginBottom: 8 }}>
                    <Tag color={approval.action === 'APPROVED' ? 'green' : 'red'}>
                      {approval.action === 'APPROVED' ? '同意' : '拒绝'}
                    </Tag>
                    {approval.approverName} - {dayjs(approval.approvedAt).format('YYYY-MM-DD HH:mm')}
                    {approval.comment && `: ${approval.comment}`}
                  </div>
                ))}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </Card>
  );
};

export default ProductionReportListPage;
