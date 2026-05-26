import { Card, Table, Typography, Empty } from 'antd';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TableOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface Field {
  id: number;
  name: string;
  code: string;
  type: string;
  dataType: string;
  description?: string;
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

interface ChartPreviewProps {
  data: any[];
  config: ReportConfig;
  fields: Field[];
}

// 颜色配置
const COLORS = [
  '#1890ff',
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#fa8c16',
  '#13c2c2',
  '#eb2f96',
  '#2f54eb',
  '#fa541c',
];

// 渲染图表
const renderChart = (data: any[], config: ReportConfig, fields: Field[]) => {
  const { chartType = 'bar', xAxis, yAxis = [] } = config;

  if (!xAxis || yAxis.length === 0) {
    return (
      <Empty
        description="请配置X轴和Y轴字段"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ marginTop: 60 }}
      />
    );
  }

  const xField = fields.find((f) => f.code === xAxis);
  const yFields = yAxis.map((code) => fields.find((f) => f.code === code)).filter(Boolean);

  // 准备图表数据
  const chartData = data.map((item) => {
    const result: any = {
      [xAxis]: item[xAxis] || '-',
    };

    yFields.forEach((field: any) => {
      result[field.code] = item[field.code] || 0;
    });

    return result;
  });

  // 获取字段名称
  const getXAxisName = () => xField?.name || xAxis;
  const getYAxisName = (code: string) => {
    const field = fields.find((f) => f.code === code);
    return field?.name || code;
  };

  // 柱状图
  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxis} label={{ value: getXAxisName(), position: 'insideBottom', offset: -5 }} />
          <YAxis label={{ value: '数值', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          {yFields.map((field: any, index) => (
            <Bar
              key={field.code}
              dataKey={field.code}
              name={getYAxisName(field.code)}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // 折线图
  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxis} label={{ value: getXAxisName(), position: 'insideBottom', offset: -5 }} />
          <YAxis label={{ value: '数值', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          {yFields.map((field: any, index) => (
            <Line
              key={field.code}
              type="monotone"
              dataKey={field.code}
              name={getYAxisName(field.code)}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // 面积图
  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxis} label={{ value: getXAxisName(), position: 'insideBottom', offset: -5 }} />
          <YAxis label={{ value: '数值', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          {yFields.map((field: any, index) => (
            <Area
              key={field.code}
              type="monotone"
              dataKey={field.code}
              name={getYAxisName(field.code)}
              fill={COLORS[index % COLORS.length]}
              stroke={COLORS[index % COLORS.length]}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // 饼图
  if (chartType === 'pie') {
    const pieData = chartData.map((item) => ({
      name: item[xAxis],
      value: yAxis.length > 0 ? item[yAxis[0]] : 0,
    }));

    return (
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // 散点图
  if (chartType === 'scatter') {
    if (yAxis.length < 2) {
      return (
        <Empty
          description="散点图需要至少两个Y轴字段"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ marginTop: 60 }}
        />
      );
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xAxis} label={{ value: getXAxisName(), position: 'insideBottom', offset: -5 }} />
          <YAxis label={{ value: getYAxisName(yAxis[0]), angle: -90, position: 'insideLeft' }} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Legend />
          <Scatter
            name={getYAxisName(yAxis[0])}
            data={chartData}
            x={xAxis}
            y={yAxis[0]}
            fill={COLORS[0]}
          />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  return <Empty description="暂无图表数据" />;
};

// 渲染表格
const renderTable = (data: any[], config: ReportConfig, fields: Field[]) => {
  // 确定要显示的列
  const { xAxis, yAxis = [] } = config;
  const displayFields = [xAxis, ...yAxis].filter(Boolean).slice(0, 10);

  const columns = displayFields.map((code) => {
    const field = fields.find((f) => f.code === code);
    return {
      title: field?.name || code,
      dataIndex: code,
      key: code,
      width: 150,
    };
  });

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey={(record, index) => index}
      size="small"
      scroll={{ x: 'max-content', y: 400 }}
      pagination={{
        pageSize: 20,
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条`,
      }}
    />
  );
};

const ChartPreview: React.FC<ChartPreviewProps> = ({ data, config, fields }) => {
  const reportType = config.chartType;

  return (
    <Card>
      <Title level={5} style={{ marginBottom: 16 }}>
        数据预览
      </Title>

      {data && data.length > 0 ? (
        <div>
          {/* 图表预览 */}
          {reportType !== 'table' && (
            <div style={{ marginBottom: 24 }}>{renderChart(data, config, fields)}</div>
          )}

          {/* 表格预览 */}
          <div>
            <Title level={5} style={{ marginBottom: 12, fontSize: 14 }}>
              <TableOutlined /> 详细数据
            </Title>
            {renderTable(data, config, fields)}
          </div>
        </div>
      ) : (
        <Empty
          description="暂无数据"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ marginTop: 60 }}
        />
      )}
    </Card>
  );
};

export default ChartPreview;
