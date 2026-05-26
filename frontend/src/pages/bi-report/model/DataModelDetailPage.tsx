import { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Tag,
  message,
  Row,
  Col,
  Typography,
  Table,
  Tabs,
  Modal,
  Form,
  Input,
  Select,
  Alert,
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  EyeOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  CalculatorOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface ModelField {
  id: number;
  name: string;
  code: string;
  type: 'dimension' | 'measure';
  dataType: string;
  aggregation?: string;
  description?: string;
  sourceExpr?: string;
  sourceType?: string;
}

const DataModelDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('fields');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isAddCalcFieldModalVisible, setIsAddCalcFieldModalVisible] = useState(false);
  const [calcFieldForm] = Form.useForm();

  // 获取模型详情
  const { data: model, isLoading } = useQuery({
    queryKey: ['biDataModelDetail', id],
    queryFn: async () => {
      return request.get(`/bi-report/models/${id}`);
    },
  });

  // 查看数据预览
  const handlePreviewData = async () => {
    try {
      setIsPreviewLoading(true);
      const result = await request.post(`/bi-report/models/${id}/query`, {
        dimensions: model?.fields
          ?.filter((f: ModelField) => f.type === 'dimension')
          .map((f: ModelField) => f.code) || [],
        measures:
          model?.fields
            ?.filter((f: ModelField) => f.type === 'measure')
            .map((f: ModelField) => ({
              field: f.code,
              aggregation: f.aggregation || 'sum',
            })) || [],
        limit: 20,
      });
      setPreviewData(result.data || []);
      setActiveTab('preview');
      message.success('数据加载成功');
    } catch (error: any) {
      message.error(error.response?.data?.message || '预览失败');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // 添加计算字段
  const handleAddCalcField = async () => {
    try {
      const values = await calcFieldForm.validateFields();
      await request.post(`/bi-report/models/${id}/fields`, {
        ...values,
        sourceType: 'calculated',
      });
      message.success('计算字段添加成功');
      setIsAddCalcFieldModalVisible(false);
      calcFieldForm.resetFields();
      // 刷新模型数据
      queryClient.invalidateQueries({ queryKey: ['biDataModelDetail', id] });
    } catch (error: any) {
      message.error(error.response?.data?.message || '添加失败');
    }
  };

  // 字段表格列
  const fieldColumns = [
    {
      title: '字段名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string, record: ModelField) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.code}
          </Text>
        </Space>
      ),
    },
    {
      title: '字段类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'dimension' ? 'blue' : 'green'}>
          {type === 'dimension' ? '维度' : '度量'}
        </Tag>
      ),
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 100,
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: '聚合函数',
      dataIndex: 'aggregation',
      key: 'aggregation',
      width: 100,
      render: (agg?: string) => agg || '-',
    },
    {
      title: '来源类型',
      dataIndex: 'sourceType',
      key: 'sourceType',
      width: 100,
      render: (type?: string) => {
        if (type === 'calculated') return <Tag color="orange">计算字段</Tag>;
        if (type === 'column') return <Tag color="default">数据库列</Tag>;
        return <Tag>其他</Tag>;
      },
    },
    {
      title: '来源',
      dataIndex: 'sourceExpr',
      key: 'sourceExpr',
      ellipsis: true,
      render: (expr?: string) => expr || '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc?: string) => desc || '-',
    },
  ];

  if (isLoading || !model) {
    return <div style={{ padding: 24 }}>加载中...</div>;
  }

  const isBaseModel = model.type === 'table' && model.sourceTable && !model.sourceTable.includes('JOIN');
  const isCompositeModel = model.type === 'sql' || (model.sourceTable && model.sourceTable.includes('JOIN'));

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={18}>
            <Title level={4} style={{ margin: 0 }}>
              {model.name}
            </Title>
            <Space wrap>
              <Text type="secondary">模型代码：</Text>
              <Tag color="blue">{model.code}</Tag>
              <Text type="secondary">类型：</Text>
              <Tag color={isBaseModel ? 'green' : 'orange'}>
                {isBaseModel ? '基础模型' : '复合模型'}
              </Tag>
              {model.sourceTable && (
                <>
                  <Text type="secondary">源表：</Text>
                  <Tag>{model.sourceTable}</Tag>
                </>
              )}
              <Text type="secondary">字段数：</Text>
              <Tag>{model.fields?.length || 0}</Tag>
            </Space>
          </Col>
          <Col span={6} style={{ textAlign: 'right' }}>
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/bi-report/models')}>
                返回
              </Button>
              <Button icon={<EyeOutlined />} onClick={handlePreviewData}>
                预览数据
              </Button>
            </Space>
          </Col>
        </Row>

        <Divider style={{ marginTop: 16, marginBottom: 16 }} />

        {model.description && (
          <Alert
            message={model.description}
            type="info"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}

        {isCompositeModel && (
          <Alert
            message="复合模型"
            description="此模型是通过JOIN多个基础模型创建的复合模型，可以跨表查询数据"
            type="warning"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        )}

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'fields',
              label: `字段列表 (${model.fields?.length || 0})`,
              children: (
                <div>
                  <Space style={{ marginBottom: 16 }}>
                    <Button
                      type="primary"
                      icon={<CalculatorOutlined />}
                      onClick={() => setIsAddCalcFieldModalVisible(true)}
                    >
                      添加计算字段
                    </Button>
                    <Text type="secondary">
                      创建基于SQL表达式的自定义维度和度量
                    </Text>
                  </Space>

                  <Table
                    columns={fieldColumns}
                    dataSource={model.fields || []}
                    rowKey="id"
                    pagination={false}
                    size="small"
                  />
                </div>
              ),
            },
            {
              key: 'preview',
              label: '数据预览',
              children: (
                <div>
                  {previewData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <EyeOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                      <div style={{ color: '#999', marginBottom: 16 }}>
                        点击右上角"预览数据"按钮查看模型数据
                      </div>
                      <Button type="primary" icon={<EyeOutlined />} onClick={handlePreviewData}>
                        预览数据
                      </Button>
                    </div>
                  ) : (
                    <Table
                      columns={model.fields?.map((f: ModelField) => ({
                        title: f.name,
                        dataIndex: f.code,
                        key: f.code,
                        width: 150,
                        ellipsis: true,
                      })) || []}
                      dataSource={previewData}
                      rowKey={(record, index) => index}
                      loading={isPreviewLoading}
                      pagination={{ pageSize: 10 }}
                      size="small"
                      scroll={{ x: 1200 }}
                    />
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* 添加计算字段弹窗 */}
      <Modal
        title="添加计算字段"
        open={isAddCalcFieldModalVisible}
        onOk={handleAddCalcField}
        onCancel={() => {
          setIsAddCalcFieldModalVisible(false);
          calcFieldForm.resetFields();
        }}
        width={700}
      >
        <Form form={calcFieldForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="字段名称"
                name="name"
                rules={[{ required: true, message: '请输入字段名称' }]}
              >
                <Input placeholder="如：全名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="字段代码"
                name="code"
                rules={[
                  { required: true, message: '请输入字段代码' },
                  { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '只能包含字母、数字和下划线' },
                ]}
              >
                <Input placeholder="如：fullName" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="字段类型"
                name="type"
                rules={[{ required: true, message: '请选择字段类型' }]}
              >
                <Select placeholder="请选择字段类型">
                  <Option value="dimension">维度（Dimension）</Option>
                  <Option value="measure">度量（Measure）</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="数据类型"
                name="dataType"
                rules={[{ required: true, message: '请选择数据类型' }]}
              >
                <Select placeholder="请选择数据类型">
                  <Option value="string">字符串</Option>
                  <Option value="number">数字</Option>
                  <Option value="date">日期</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
          >
            {({ getFieldValue }) =>
              getFieldValue('type') === 'measure' ? (
                <Form.Item
                  label="聚合函数"
                  name="aggregation"
                  initialValue="sum"
                >
                  <Select>
                    <Option value="sum">求和</Option>
                    <Option value="avg">平均</Option>
                    <Option value="count">计数</Option>
                    <Option value="max">最大</Option>
                    <Option value="min">最小</Option>
                  </Select>
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item
            label="SQL表达式"
            name="sourceExpr"
            rules={[{ required: true, message: '请输入SQL表达式' }]}
            extra={
              <div>
                <div>使用SQL表达式定义计算逻辑，可引用其他字段：</div>
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  <li>字符串：CONCAT(firstName, ' ', lastName)</li>
                  <li>数值：workHours * hourlyRate</li>
                  <li>日期：YEAR(workDate)</li>
                </ul>
              </div>
            }
          >
            <TextArea
              rows={3}
              placeholder="例如：CONCAT(firstName, ' ', lastName) 或 workHours * hourlyRate"
            />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <TextArea rows={2} placeholder="描述此计算字段的用途" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DataModelDetailPage;
