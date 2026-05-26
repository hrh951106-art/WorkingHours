import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  message,
  Row,
  Col,
  Form,
  Input,
  Select,
  Tabs,
  Divider,
  Spin,
  Typography,
  Alert,
} from 'antd';
import {
  SaveOutlined,
  EyeOutlined,
  LeftOutlined,
  BarChartOutlined,
  TableOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import request from '@/utils/request';
import FieldSelector from './components/FieldSelector';
import DimensionMeasurePanel from './components/DimensionMeasurePanel';
import FilterConfigPanel from './components/FilterConfigPanel';
import ChartPreview from './components/ChartPreview';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface ModelField {
  id: number;
  name: string;
  code: string;
  type: string;
  dataType: string;
  description?: string;
}

interface DataModel {
  id: number;
  name: string;
  code: string;
  fields: ModelField[];
}

interface QueryConfig {
  dimensions: string[];
  measures: string[];
  filters: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  orderBy?: Array<{
    field: string;
    direction: 'ASC' | 'DESC';
  }>;
  limit?: number;
}

interface ReportConfig {
  chartType?: string;
  xAxis?: string;
  yAxis?: string[];
  groupBy?: string;
  aggregations?: Array<{
    field: string;
    aggregation: string;
  }>;
}

const BiReportDesignerPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const isEdit = !!params.id;
  const reportId = params.id ? parseInt(params.id) : undefined;

  // 监听表单字段变化
  const watchedModelId = Form.useWatch('modelId', form);

  // 状态管理
  const [selectedModel, setSelectedModel] = useState<DataModel | null>(null);
  const [selectedFields, setSelectedFields] = useState<{
    dimensions: string[];
    measures: string[];
  }>({
    dimensions: [],
    measures: [],
  });
  const [filters, setFilters] = useState<any[]>([]);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    chartType: 'bar',
  });
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('design');

  // 获取数据模型列表
  const { data: modelsData, isLoading: modelsLoading } = useQuery({
    queryKey: ['biDataModels'],
    queryFn: async () => {
      return request.get('/bi-report/models', {
        params: { status: 'ACTIVE', pageSize: 100 },
      });
    },
  });

  // 获取报表详情（编辑模式）
  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ['biReport', reportId],
    queryFn: async () => {
      if (!reportId) return null;
      return request.get(`/bi-report/reports/${reportId}`);
    },
    enabled: !!reportId,
  });

  // 初始化表单数据（编辑模式）
  useEffect(() => {
    if (reportData) {
      form.setFieldsValue({
        name: reportData.name,
        code: reportData.code,
        modelId: reportData.modelId,
        type: reportData.type,
        category: reportData.category,
        description: reportData.description,
      });

      setSelectedFields({
        dimensions: reportData.queryConfig?.dimensions || [],
        measures: reportData.queryConfig?.measures || [],
      });
      setFilters(reportData.queryConfig?.filters || []);
      setReportConfig(reportData.config || {});
    }
  }, [reportData, form]);

  // 获取模型字段
  useEffect(() => {
    if (watchedModelId) {
      const model = modelsData?.items?.find((m: DataModel) => m.id === watchedModelId);
      if (model) {
        // 如果模型没有字段信息，需要获取详情
        if (!model.fields || model.fields.length === 0) {
          request.get(`/bi-report/models/${watchedModelId}`).then((detail) => {
            setSelectedModel(detail);
          }).catch(() => {
            setSelectedModel(model);
          });
        } else {
          setSelectedModel(model);
        }
      } else {
        setSelectedModel(null);
      }
    } else {
      setSelectedModel(null);
    }
  }, [watchedModelId, modelsData]);

  // 创建报表
  const createMutation = useMutation({
    mutationFn: (data: any) => request.post('/bi-report/reports', data),
    onSuccess: () => {
      message.success('报表创建成功');
      navigate('/bi-report/reports');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '创建失败');
    },
  });

  // 更新报表
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      request.put(`/bi-report/reports/${id}`, data),
    onSuccess: () => {
      message.success('报表更新成功');
      queryClient.invalidateQueries({ queryKey: ['biReport', reportId] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '更新失败');
    },
  });

  // 预览报表数据
  const handlePreview = async () => {
    if (!selectedModel) {
      message.warning('请先选择数据模型');
      return;
    }

    if (selectedFields.dimensions.length === 0 && selectedFields.measures.length === 0) {
      message.warning('请至少选择一个维度或度量');
      return;
    }

    setLoadingPreview(true);
    try {
      const queryConfig: QueryConfig = {
        dimensions: selectedFields.dimensions,
        measures: selectedFields.measures,
        filters,
        limit: 100,
      };

      const result = await request.post(`/bi-report/models/${selectedModel.id}/query`, queryConfig);
      setPreviewData(result);
      setActiveTab('preview');
    } catch (error: any) {
      message.error(error.response?.data?.message || '预览失败');
    } finally {
      setLoadingPreview(false);
    }
  };

  // 保存报表
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      if (!selectedModel) {
        message.warning('请选择数据模型');
        return;
      }

      if (selectedFields.dimensions.length === 0 && selectedFields.measures.length === 0) {
        message.warning('请至少选择一个维度或度量');
        return;
      }

      const queryConfig: QueryConfig = {
        dimensions: selectedFields.dimensions,
        measures: selectedFields.measures,
        filters,
      };

      const data = {
        ...values,
        queryConfig,
        config: reportConfig,
        status: 'DRAFT',
      };

      if (isEdit && reportId) {
        updateMutation.mutate({ id: reportId, data });
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  if (reportLoading && isEdit) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={18}>
            <Title level={4} style={{ margin: 0 }}>
              {isEdit ? '编辑报表' : '创建报表'}
            </Title>
            <Text type="secondary">通过拖拽字段配置报表，实时预览数据</Text>
          </Col>
          <Col span={6} style={{ textAlign: 'right' }}>
            <Space>
              <Button icon={<LeftOutlined />} onClick={() => navigate('/bi-report/reports')}>
                返回
              </Button>
              <Button icon={<EyeOutlined />} onClick={handlePreview} loading={loadingPreview}>
                预览
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={createMutation.isPending || updateMutation.isPending}
              >
                保存
              </Button>
            </Space>
          </Col>
        </Row>

        <Divider />

        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="报表名称"
                name="name"
                rules={[{ required: true, message: '请输入报表名称' }]}
              >
                <Input placeholder="请输入报表名称" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="报表代码"
                name="code"
                rules={[{ required: true, message: '请输入报表代码' }]}
              >
                <Input placeholder="请输入报表代码（英文）" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="数据模型"
                name="modelId"
                rules={[{ required: true, message: '请选择数据模型' }]}
              >
                <Select
                  placeholder="请选择数据模型"
                  loading={modelsLoading}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {modelsData?.items?.map((model: DataModel) => (
                    <Option key={model.id} value={model.id} label={model.name}>
                      {model.name} ({model.code})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="报表类型"
                name="type"
                rules={[{ required: true, message: '请选择报表类型' }]}
              >
                <Select placeholder="请选择报表类型">
                  <Option value="table">
                    <Space>
                      <TableOutlined />
                      表格报表
                    </Space>
                  </Option>
                  <Option value="chart">
                    <Space>
                      <BarChartOutlined />
                      图表报表
                    </Space>
                  </Option>
                  <Option value="dashboard">
                    <Space>
                      <DashboardOutlined />
                      仪表板
                    </Space>
                  </Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="分类" name="category">
                <Input placeholder="请输入分类（可选）" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="描述" name="description">
                <TextArea rows={2} placeholder="请输入报表描述（可选）" maxLength={500} />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {!selectedModel ? (
          <Alert
            message="请先选择数据模型"
            description="选择数据模型后，即可开始配置报表"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : (
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'design',
                label: '设计',
                children: (
                  <Row gutter={16}>
                    <Col span={6}>
                      <FieldSelector
                        fields={selectedModel.fields}
                        selectedFields={selectedFields}
                        onFieldSelect={(fieldCode, fieldType) => {
                          setSelectedFields((prev) => ({
                            ...prev,
                            [fieldType]: [...prev[fieldType], fieldCode],
                          }));
                        }}
                      />
                    </Col>

                    <Col span={12}>
                      <DimensionMeasurePanel
                        fields={selectedModel.fields}
                        selectedFields={selectedFields}
                        onFieldRemove={(fieldCode, fieldType) => {
                          setSelectedFields((prev) => ({
                            ...prev,
                            [fieldType]: prev[fieldType].filter((f) => f !== fieldCode),
                          }));
                        }}
                        onFieldReorder={(fieldType, newFields) => {
                          setSelectedFields((prev) => ({
                            ...prev,
                            [fieldType]: newFields,
                          }));
                        }}
                      />
                      <FilterConfigPanel
                        fields={selectedModel.fields}
                        filters={filters}
                        onFiltersChange={setFilters}
                      />
                    </Col>

                    <Col span={6}>
                      <Card title="图表配置" size="small" style={{ marginBottom: 16 }}>
                        <Form layout="vertical">
                          <Form.Item label="图表类型">
                            <Select
                              value={reportConfig.chartType}
                              onChange={(value) =>
                                setReportConfig((prev) => ({ ...prev, chartType: value }))
                              }
                            >
                              <Option value="bar">柱状图</Option>
                              <Option value="line">折线图</Option>
                              <Option value="pie">饼图</Option>
                              <Option value="area">面积图</Option>
                              <Option value="scatter">散点图</Option>
                            </Select>
                          </Form.Item>

                          {selectedFields.dimensions.length > 0 && (
                            <Form.Item label="X轴（维度）">
                              <Select
                                value={reportConfig.xAxis}
                                onChange={(value) =>
                                  setReportConfig((prev) => ({ ...prev, xAxis: value }))
                                }
                                placeholder="选择X轴字段"
                              >
                                {selectedFields.dimensions.map((dim) => {
                                  const field = selectedModel.fields.find((f) => f.code === dim);
                                  return (
                                    <Option key={dim} value={dim}>
                                      {field?.name || dim}
                                    </Option>
                                  );
                                })}
                              </Select>
                            </Form.Item>
                          )}

                          {selectedFields.measures.length > 0 && (
                            <Form.Item label="Y轴（度量）">
                              <Select
                                mode="multiple"
                                value={reportConfig.yAxis}
                                onChange={(value) =>
                                  setReportConfig((prev) => ({ ...prev, yAxis: value }))
                                }
                                placeholder="选择Y轴字段"
                              >
                                {selectedFields.measures.map((mea) => {
                                  const field = selectedModel.fields.find((f) => f.code === mea);
                                  return (
                                    <Option key={mea} value={mea}>
                                      {field?.name || mea}
                                    </Option>
                                  );
                                })}
                              </Select>
                            </Form.Item>
                          )}
                        </Form>
                      </Card>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'preview',
                label: '预览',
                children: (
                  <Spin spinning={loadingPreview}>
                    {previewData ? (
                      <ChartPreview
                        data={previewData}
                        config={reportConfig}
                        fields={selectedModel.fields}
                      />
                    ) : (
                      <Alert
                        message="暂无预览数据"
                        description="请先配置维度和度量，然后点击预览按钮"
                        type="info"
                        showIcon
                      />
                    )}
                  </Spin>
                ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
};

export default BiReportDesignerPage;
