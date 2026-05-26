import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  message,
  Modal,
  Typography,
  Row,
  Col,
  Input,
  Select,
  Tabs,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  BarChartOutlined,
  TableOutlined,
  DashboardOutlined,
  CopyOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Search } = Input;

interface BiReport {
  id: number;
  name: string;
  code: string;
  type: string;
  category?: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  model?: {
    id: number;
    name: string;
    code: string;
  };
}

const BiReportListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState('all');

  // 获取报表列表
  const { data: listData, isLoading } = useQuery({
    queryKey: ['biReports', activeTab, searchKeyword, typeFilter, statusFilter],
    queryFn: async () => {
      const params: any = {};

      if (activeTab === 'my') {
        // 我的报表
      } else if (activeTab === 'published') {
        params.status = 'PUBLISHED';
      } else {
        if (searchKeyword) params.keyword = searchKeyword;
        if (typeFilter) params.type = typeFilter;
        if (statusFilter) params.status = statusFilter;
      }

      return request.get('/bi-report/reports', { params });
    },
  });

  // 删除报表
  const deleteMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/bi-report/reports/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['biReports'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '删除失败');
    },
  });

  // 发布报表
  const publishMutation = useMutation({
    mutationFn: (id: number) => request.post(`/bi-report/reports/${id}/publish`),
    onSuccess: () => {
      message.success('发布成功');
      queryClient.invalidateQueries({ queryKey: ['biReports'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '发布失败');
    },
  });

  // 复制报表
  const duplicateMutation = useMutation({
    mutationFn: (id: number) => request.post(`/bi-report/reports/${id}/duplicate`),
    onSuccess: () => {
      message.success('复制成功');
      queryClient.invalidateQueries({ queryKey: ['biReports'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '复制失败');
    },
  });

  // 删除报表
  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个报表吗？',
      onOk: () => {
        deleteMutation.mutate(id);
      },
    });
  };

  // 发布报表
  const handlePublish = (id: number) => {
    Modal.confirm({
      title: '确认发布',
      content: '发布后报表将正式上线，确定继续吗？',
      onOk: () => {
        publishMutation.mutate(id);
      },
    });
  };

  // 复制报表
  const handleDuplicate = (id: number) => {
    duplicateMutation.mutate(id);
  };

  const columns = [
    {
      title: '报表名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: BiReport) => {
        let icon = <TableOutlined />;
        if (record.type === 'chart') icon = <BarChartOutlined />;
        if (record.type === 'dashboard') icon = <DashboardOutlined />;

        return (
          <Space>
            {icon}
            <Text strong>{name}</Text>
          </Space>
        );
      },
    },
    {
      title: '报表代码',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const config: Record<string, { text: string; color: string }> = {
          table: { text: '表格', color: 'green' },
          chart: { text: '图表', color: 'blue' },
          dashboard: { text: '仪表板', color: 'purple' },
        };
        const item = config[type] || { text: type, color: 'default' };
        return <Tag color={item.color}>{item.text}</Tag>;
      },
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (category?: string) => category || '-',
    },
    {
      title: '数据模型',
      key: 'model',
      render: (_: any, record: BiReport) => record.model?.name || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { text: string; color: string }> = {
          DRAFT: { text: '草稿', color: 'default' },
          PUBLISHED: { text: '已发布', color: 'success' },
          ARCHIVED: { text: '已归档', color: 'warning' },
        };
        const item = config[status] || { text: status, color: 'default' };
        return <Tag color={item.color}>{item.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 300,
      render: (_: any, record: BiReport) => (
        <Space size="small" wrap>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/bi-report/reports/${record.id}`)}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/bi-report/reports/${record.id}/edit`)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleDuplicate(record.id)}
          >
            复制
          </Button>
          {record.status === 'DRAFT' && (
            <Button
              type="link"
              size="small"
              icon={<SendOutlined />}
              onClick={() => handlePublish(record.id)}
            >
              发布
            </Button>
          )}
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={18}>
            <Title level={4}>报表管理</Title>
            <Text type="secondary">创建和管理BI报表，支持表格、图表和仪表板</Text>
          </Col>
          <Col span={6} style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/bi-report/reports/create')}
            >
              创建报表
            </Button>
          </Col>
        </Row>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          style={{ marginBottom: 16 }}
          items={[
            { key: 'all', label: '全部报表' },
            { key: 'published', label: '已发布' },
            { key: 'my', label: '我的报表' },
          ]}
        />

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Search
              placeholder="搜索报表名称或代码"
              allowClear
              enterButton
              size="large"
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </Col>
          <Col span={8}>
            <Select
              placeholder="报表类型"
              allowClear
              style={{ width: '100%' }}
              size="large"
              onChange={setTypeFilter}
            >
              <Select.Option value="table">表格报表</Select.Option>
              <Select.Option value="chart">图表报表</Select.Option>
              <Select.Option value="dashboard">仪表板</Select.Option>
            </Select>
          </Col>
          <Col span={8}>
            <Select
              placeholder="状态筛选"
              allowClear
              style={{ width: '100%' }}
              size="large"
              onChange={setStatusFilter}
            >
              <Select.Option value="DRAFT">草稿</Select.Option>
              <Select.Option value="PUBLISHED">已发布</Select.Option>
              <Select.Option value="ARCHIVED">已归档</Select.Option>
            </Select>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={listData?.items || []}
          loading={isLoading}
          rowKey="id"
          pagination={{
            total: listData?.total || 0,
            pageSize: listData?.pageSize || 20,
            current: listData?.page || 1,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>
    </div>
  );
};

export default BiReportListPage;
