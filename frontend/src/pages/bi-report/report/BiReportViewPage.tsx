import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  message,
  Row,
  Col,
  Typography,
  Spin,
  Tabs,
  Empty,
  DatePicker,
  Select,
} from 'antd';
import {
  LeftOutlined,
  ReloadOutlined,
  DownloadOutlined,
  PrinterOutlined,
  BarChartOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import request from '@/utils/request';
import ChartPreview from './components/ChartPreview';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

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

interface QueryConfig {
  dimensions: string[];
  measures: string[];
  filters?: Array<{
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

interface BiReport {
  id: number;
  name: string;
  code: string;
  type: string;
  category?: string;
  description?: string;
  status: string;
  config: ReportConfig;
  queryConfig: QueryConfig;
  model: {
    id: number;
    name: string;
    code: string;
    fields: Array<{
      id: number;
      name: string;
      code: string;
      type: string;
      dataType: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

const BiReportViewPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const reportId = params.id ? parseInt(params.id) : undefined;

  const [activeTab, setActiveTab] = useState('chart');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, any>>({});

  // 获取报表详情
  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['biReport', reportId],
    queryFn: async () => {
      if (!reportId) return null;
      return request.get(`/bi-report/reports/${reportId}`);
    },
    enabled: !!reportId,
  });

  // 查询报表数据
  const fetchReportData = async (additionalFilters: Record<string, any> = {}) => {
    if (!report) return;

    setLoading(true);
    try {
      // 构建查询配置
      const filters = [...(report.queryConfig.filters || [])];

      // 添加日期范围过滤
      if (dateRange) {
        const dateField = report.queryConfig.dimensions.find((dim: string) => {
          const field = report.model.fields.find((f: any) => f.code === dim);
          return field?.dataType === 'date';
        });

        if (dateField) {
          filters.push({
            field: dateField,
            operator: 'between',
            value: [dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
          });
        }
      }

      // 添加动态过滤条件
      Object.entries(additionalFilters).forEach(([field, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          filters.push({
            field,
            operator: 'eq',
            value,
          });
        }
      });

      const queryConfig = {
        ...report.queryConfig,
        filters,
      };

      const result = await request.post(`/bi-report/models/${report.model.id}/query`, queryConfig);
      setReportData(result);
    } catch (error: any) {
      message.error(error.response?.data?.message || '查询失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化数据
  useEffect(() => {
    if (report) {
      fetchReportData(dynamicFilters);
    }
  }, [report, dateRange]);

  if (reportLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Empty description="报表不存在" />
      </div>
    );
  }

  // 获取可用于过滤的字段
  const getFilterableFields = () => {
    return report.model.fields.filter((f: any) => f.type === 'dimension');
  };

  // 导出数据
  const handleExport = () => {
    if (!reportData || reportData.length === 0) {
      message.warning('暂无数据可导出');
      return;
    }

    try {
      // 获取所有字段
      const dimensions = report.queryConfig.dimensions || [];
      const measures = report.queryConfig.measures || [];
      const allFields = [...dimensions, ...measures];

      // 构建表头
      const headers = allFields.map((code) => {
        const field = report.model.fields.find((f: any) => f.code === code);
        return field?.name || code;
      });

      // 构建数据行
      const rows = reportData.map((item: any) => {
        return allFields.map((code) => item[code] || '-');
      });

      // 组合CSV内容
      const csvContent = [
        headers.join(','),
        ...rows.map((row: any[]) => row.join(',')),
      ].join('\n');

      // 创建Blob并下载
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${report.name}_${dayjs().format('YYYY-MM-DD')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success('导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败');
    }
  };

  // 打印
  const handlePrint = () => {
    window.print();
  };

  // 刷新数据
  const handleRefresh = () => {
    fetchReportData(dynamicFilters);
    message.success('刷新成功');
  };

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={18}>
            <Title level={4} style={{ margin: 0 }}>
              {report.name}
            </Title>
            <Text type="secondary">{report.description || '暂无描述'}</Text>
          </Col>
          <Col span={6} style={{ textAlign: 'right' }}>
            <Space>
              <Button icon={<LeftOutlined />} onClick={() => navigate('/bi-report/reports')}>
                返回
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
                刷新
              </Button>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                导出
              </Button>
              <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                打印
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 过滤条件 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col>
              <Text strong>筛选条件：</Text>
            </Col>

            {/* 日期范围选择 */}
            {getFilterableFields().some((f: any) => f.dataType === 'date') && (
              <Col>
                <RangePicker
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates)}
                  placeholder={['开始日期', '结束日期']}
                />
              </Col>
            )}

            {/* 动态过滤条件 */}
            {getFilterableFields()
              .filter((f: any) => f.dataType !== 'date')
              .slice(0, 3)
              .map((field: any) => (
                <Col key={field.code}>
                  <Select
                    style={{ width: 150 }}
                    placeholder={field.name}
                    allowClear
                    onChange={(value) => {
                      const newFilters = { ...dynamicFilters, [field.code]: value };
                      setDynamicFilters(newFilters);
                      fetchReportData(newFilters);
                    }}
                    value={dynamicFilters[field.code]}
                  >
                    {/* 这里可以根据实际数据获取选项 */}
                  </Select>
                </Col>
              ))}
          </Row>
        </Card>

        {/* 数据展示 */}
        <Spin spinning={loading}>
          {!reportData || reportData.length === 0 ? (
            <Empty
              description="暂无数据"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ marginTop: 60 }}
            />
          ) : (
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'chart',
                  label: (
                    <span>
                      <BarChartOutlined />
                      图表视图
                    </span>
                  ),
                  children: (
                    <ChartPreview
                      data={reportData}
                      config={report.config}
                      fields={report.model.fields}
                    />
                  ),
                },
                {
                  key: 'table',
                  label: (
                    <span>
                      <TableOutlined />
                      数据表格
                    </span>
                  ),
                  children: (
                    <ChartPreview
                      data={reportData}
                      config={{ ...report.config, chartType: 'table' }}
                      fields={report.model.fields}
                    />
                  ),
                },
              ]}
            />
          )}
        </Spin>

        {/* 报表信息 */}
        <Card size="small" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Text type="secondary">报表类型：</Text>
              <Text strong style={{ marginLeft: 8 }}>
                {report.type === 'table' ? '表格报表' : report.type === 'chart' ? '图表报表' : '仪表板'}
              </Text>
            </Col>
            <Col span={6}>
              <Text type="secondary">数据模型：</Text>
              <Text strong style={{ marginLeft: 8 }}>
                {report.model.name}
              </Text>
            </Col>
            <Col span={6}>
              <Text type="secondary">创建时间：</Text>
              <Text style={{ marginLeft: 8 }}>
                {dayjs(report.createdAt).format('YYYY-MM-DD HH:mm')}
              </Text>
            </Col>
            <Col span={6}>
              <Text type="secondary">更新时间：</Text>
              <Text style={{ marginLeft: 8 }}>
                {dayjs(report.updatedAt).format('YYYY-MM-DD HH:mm')}
              </Text>
            </Col>
          </Row>
        </Card>
      </Card>
    </div>
  );
};

export default BiReportViewPage;
