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
  Typography,
  Row,
  Col,
  Input,
  Select,
  Alert,
  Tabs,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  TableOutlined,
  ThunderboltOutlined,
  LinkOutlined,
  CalculatorOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Search } = Input;

interface DataModel {
  id: number;
  name: string;
  code: string;
  type: string;
  sourceTable?: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  dataSource?: {
    id: number;
    name: string;
  };
  fields?: Array<{
    id: number;
    name: string;
    code: string;
    type: string;
  }>;
}

const DataModelListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [isGenerateModalVisible, setIsGenerateModalVisible] = useState(false);

  // 获取数据模型列表
  const { data: listData, isLoading } = useQuery({
    queryKey: ['biDataModels', searchKeyword, statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (searchKeyword) params.keyword = searchKeyword;
      if (statusFilter) params.status = statusFilter;

      return request.get('/bi-report/models', { params });
    },
  });

  // 删除模型
  const deleteMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/bi-report/models/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['biDataModels'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '删除失败');
    },
  });

  // 查看详情
  const handleViewDetail = (id: number) => {
    navigate(`/bi-report/models/${id}`);
  };

  // 生成内置模型
  const generateMutation = useMutation({
    mutationFn: () => request.post('/bi-report/models/generate-builtin'),
    onSuccess: (result: any) => {
      const { success, failed, skipped } = result;
      const messages = [];
      if (success.length > 0) {
        messages.push(`成功生成 ${success.length} 个模型`);
      }
      if (skipped.length > 0) {
        messages.push(`${skipped.length} 个模型已存在，跳过`);
      }
      if (failed.length > 0) {
        messages.push(`${failed.length} 个模型生成失败`);
      }

      message.success(messages.join('，'));
      queryClient.invalidateQueries({ queryKey: ['biDataModels'] });
      setIsGenerateModalVisible(false);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '生成失败');
    },
  });

  // 删除模型
  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个数据模型吗？',
      onOk: () => {
        deleteMutation.mutate(id);
      },
    });
  };

  const columns = [
    {
      title: '模型名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: DataModel) => (
        <Space>
          <TableOutlined />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: '模型代码',
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
          table: { text: '数据表', color: 'green' },
          sql: { text: 'SQL查询', color: 'blue' },
          api: { text: 'API接口', color: 'orange' },
        };
        const item = config[type] || { text: type, color: 'default' };
        return <Tag color={item.color}>{item.text}</Tag>;
      },
    },
    {
      title: '源表',
      dataIndex: 'sourceTable',
      key: 'sourceTable',
      render: (table: string) => table || '-',
    },
    {
      title: '字段数',
      key: 'fieldCount',
      render: (_: any, record: DataModel) => record.fields?.length || 0,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config: Record<string, { text: string; color: string }> = {
          ACTIVE: { text: '启用', color: 'success' },
          INACTIVE: { text: '禁用', color: 'default' },
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
      width: 200,
      render: (_: any, record: DataModel) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record.id)}
          >
            查看
          </Button>
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
            <Title level={4}>数据模型管理</Title>
            <Text type="secondary">系统内置的通用数据模型，基于数据源表自动生成</Text>
          </Col>
          <Col span={6} style={{ textAlign: 'right' }}>
            <Space>
              <Button
                icon={<ApartmentOutlined />}
                onClick={() => navigate('/bi-report/models/process/create')}
              >
                数据处理流程
              </Button>
              <Button
                icon={<LinkOutlined />}
                onClick={() => navigate('/bi-report/models/composite/create')}
              >
                创建复合模型
              </Button>
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={() => setIsGenerateModalVisible(true)}
                loading={generateMutation.isPending}
              >
                生成内置模型
              </Button>
            </Space>
          </Col>
        </Row>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Search
              placeholder="搜索模型名称或代码"
              allowClear
              enterButton
              size="large"
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="状态筛选"
              allowClear
              style={{ width: '100%' }}
              size="large"
              onChange={setStatusFilter}
            >
              <Select.Option value="ACTIVE">启用</Select.Option>
              <Select.Option value="INACTIVE">禁用</Select.Option>
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

      {/* 生成内置模型确认弹窗 */}
      <Modal
        title="生成内置数据模型"
        open={isGenerateModalVisible}
        onOk={() => generateMutation.mutate()}
        onCancel={() => setIsGenerateModalVisible(false)}
        confirmLoading={generateMutation.isPending}
        width={600}
      >
        <Alert
          message="系统将基于已配置元数据的数据源表自动生成内置数据模型"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>操作说明：</Text>
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              <li>自动为所有配置了元数据的表创建数据模型</li>
              <li>自动导入表字段，智能识别维度和度量</li>
              <li>使用表的中文信息作为模型名称和描述</li>
              <li>如果模型已存在，则跳过生成</li>
            </ul>
          </div>

          <Alert
            message="提示"
            description="生成过程可能需要几秒钟，请耐心等待。完成后可在模型列表中查看生成的模型。"
            type="warning"
            showIcon
          />
        </Space>
      </Modal>
    </div>
  );
};

export default DataModelListPage;
