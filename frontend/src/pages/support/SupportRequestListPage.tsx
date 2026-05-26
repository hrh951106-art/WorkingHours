import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Tabs,
  Select,
  Row,
  Col,
  Divider,
} from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import request from '@/utils/request';
import { useNavigate } from 'react-router-dom';

interface SupportRequest {
  id: number;
  instanceId: number;
  instanceNo?: string;
  requestNo?: string;
  title?: string;
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
  applicantId?: number;
  applicantName?: string;
  requesterId?: number;
  requesterName?: string;
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
  };
  result?: any;
}

const SupportRequestListPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('my');
  const [filters, setFilters] = useState({
    status: undefined,
    supportMode: undefined,
  });

  // 获取支援申请列表
  const { data: listData, isLoading, refetch } = useQuery({
    queryKey: ['supportRequests', activeTab, filters],
    queryFn: async () => {
      const params: any = {
        page: 1,
        pageSize: 50,
      };

      if (activeTab === 'my') {
        if (filters.status) params.status = filters.status;
        if (filters.supportMode) params.supportMode = filters.supportMode;
        return request.get('/support/my-requests', { params });
      } else if (activeTab === 'pending') {
        return request.get('/support/pending-approvals', { params });
      } else {
        if (filters.status) params.status = filters.status;
        if (filters.supportMode) params.supportMode = filters.supportMode;
        return request.get('/support/requests', { params });
      }
    },
  });

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

  const columns = [
    {
      title: '申请编号',
      dataIndex: 'instanceNo',
      key: 'instanceNo',
      width: 180,
      ellipsis: true,
      render: (instanceNo: string, record: SupportRequest) => instanceNo || record.requestNo || '-',
    },
    {
      title: '申请标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
      render: (title: string, record: SupportRequest) => title || record?.instance?.title || `支援申请 - ${record.supportAccountName}`,
    },
    {
      title: '支援人员',
      dataIndex: 'supportEmployeeName',
      key: 'supportEmployeeName',
      width: 120,
      render: (name: string, record: SupportRequest) => (
        <div>
          <div>{name}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.supportEmployeeNo}</div>
        </div>
      ),
    },
    {
      title: '支援模式',
      dataIndex: 'supportMode',
      key: 'supportMode',
      width: 100,
      render: getSupportModeTag,
    },
    {
      title: '支援地点',
      dataIndex: 'supportAccountName',
      key: 'supportAccountName',
      width: 150,
      ellipsis: true,
    },
    {
      title: '支援时间',
      key: 'supportTime',
      width: 250,
      render: (_: any, record: SupportRequest) => formatTimeRange(record),
    },
    {
      title: '支援时数',
      dataIndex: 'calculatedHours',
      key: 'calculatedHours',
      width: 100,
      render: (hours: number) => `${hours}小时`,
    },
    {
      title: '申请人',
      dataIndex: 'applicantName',
      key: 'applicantName',
      width: 100,
      render: (name: string, record: SupportRequest) => name || record.requesterName || '-',
    },
    {
      title: '发起人',
      dataIndex: ['instance', 'initiatorName'],
      key: 'initiatorName',
      width: 100,
      render: (name: string, record: SupportRequest) => name || record.requesterName || '-',
    },
    {
      title: '审批状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: getStatusTag,
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
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: SupportRequest) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/support/detail/${record.id}`)}
          >
            查看
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="支援申请管理"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/support/create')}
        >
          创建申请
        </Button>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          setFilters({ status: undefined, supportMode: undefined });
        }}
        items={[
          { key: 'all', label: '全部申请' },
          { key: 'my', label: '我的申请' },
          { key: 'pending', label: '待我审批' },
        ]}
      />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Select
              placeholder="申请状态"
              allowClear
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
            >
              <Select.Option value="PENDING">审批中</Select.Option>
              <Select.Option value="APPROVED">已通过</Select.Option>
              <Select.Option value="REJECTED">已拒绝</Select.Option>
              <Select.Option value="CANCELLED">已取消</Select.Option>
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="支援模式"
              allowClear
              style={{ width: '100%' }}
              value={filters.supportMode}
              onChange={(value) => setFilters({ ...filters, supportMode: value })}
            >
              <Select.Option value="FULL_DAY">整天支援</Select.Option>
              <Select.Option value="TIME_BASED">按时段支援</Select.Option>
            </Select>
          </Col>
          <Col span={6}>
            <Button onClick={() => refetch()}>刷新</Button>
          </Col>
        </Row>
      </Card>

      <Table
        columns={columns}
        dataSource={listData?.items || []}
        loading={isLoading}
        rowKey="id"
        scroll={{ x: 1700 }}
        pagination={{
          total: listData?.total || 0,
          pageSize: listData?.pageSize || 20,
          current: listData?.page || 1,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />
    </Card>
  );
};

export default SupportRequestListPage;
