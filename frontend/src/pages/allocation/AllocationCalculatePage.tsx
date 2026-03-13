import { useState } from 'react';
import {
  Card,
  Form,
  Select,
  DatePicker,
  Button,
  Table,
  Space,
  message,
  Statistic,
  Row,
  Col,
  Alert,
  Tag,
  Progress,
  Divider,
} from 'antd';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PlayCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import request from '@/utils/request';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

interface AllocationResult {
  id: number;
  batchNo: string;
  recordDate: string;
  hourType: string;
  totalHours: number;
  allocationObjectName: string;
  allocationBasis: string;
  basisValue: number;
  weightValue: number;
  allocatedHours: number;
  calcTime: string;
}

const AllocationCalculatePage: React.FC = () => {
  const [form] = Form.useForm();
  const [currentBatchNo, setCurrentBatchNo] = useState<string | null>(null);
  const [resultPage, setResultPage] = useState(1);
  const [resultPageSize, setResultPageSize] = useState(10);
  const navigate = useNavigate();

  // 设置表单初始值
  const initialValues = {
    dateRange: [dayjs().subtract(7, 'day'), dayjs()],
  };

  // 获取生效的配置列表
  const { data: activeConfigs, isLoading: configsLoading } = useQuery({
    queryKey: ['activeAllocationConfigs'],
    queryFn: () =>
      request.get('/allocation/configs', {
        params: { status: 'ACTIVE', pageSize: 100 },
      }).then((res: any) => res.items),
  });

  // 执行分摊计算
  const calculateMutation = useMutation({
    mutationFn: (data: any) =>
      request.post('/allocation/calculate', data),
    onSuccess: (res: any, variables: any) => {
      message.success('分摊计算完成');

      // 跳转到分摊结果页面，并传递参数
      navigate('/allocation/results', {
        state: {
          startDate: variables.startDate,
          endDate: variables.endDate,
          batchNo: res.batchNo,
        },
      });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '计算失败');
    },
  });

  // 获取计算结果
  const { data: resultsData, isLoading: resultsLoading, refetch } = useQuery({
    queryKey: ['allocationResults', currentBatchNo, resultPage, resultPageSize],
    queryFn: () =>
      request.get('/allocation/results', {
        params: {
          batchNo: currentBatchNo,
          page: resultPage,
          pageSize: resultPageSize,
        },
      }).then((res: any) => res),
    enabled: !!currentBatchNo,
  });

  // 获取结果汇总
  const { data: summaryData } = useQuery({
    queryKey: ['allocationResultsSummary', currentBatchNo],
    queryFn: () =>
      request.get('/allocation/results/summary', {
        params: { batchNo: currentBatchNo },
      }).then((res: any) => res),
    enabled: !!currentBatchNo,
  });

  const handleExecute = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        configId: values.configId,
        startDate: values.dateRange[0].format('YYYY-MM-DD'),
        endDate: values.dateRange[1].format('YYYY-MM-DD'),
        executeById: 1,
        executeByName: 'Admin',
      };
      calculateMutation.mutate(data);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const resultColumns = [
    {
      title: '记录日期',
      dataIndex: 'recordDate',
      key: 'recordDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    { title: '工时类型', dataIndex: 'hourType', key: 'hourType', width: 120 },
    {
      title: '待分摊工时',
      dataIndex: 'totalHours',
      key: 'totalHours',
      width: 120,
      render: (hours: number) => hours.toFixed(2),
    },
    { title: '分摊对象', dataIndex: 'allocationObjectName', key: 'allocationObjectName', width: 150 },
    {
      title: '分摊依据',
      dataIndex: 'allocationBasis',
      key: 'allocationBasis',
      width: 150,
      render: (basis: string) => {
        const basisMap: Record<string, string> = {
          ACTUAL_HOURS: '实际工时',
          STD_HOURS: '标准工时',
          ACTUAL_YIELD: '实际产量',
          PRODUCT_STD_HOURS: '产品标准工时',
          EMPLOYEE_COUNT: '人员数量',
          FIXED_VALUE: '固定值',
        };
        return basisMap[basis] || basis;
      },
    },
    {
      title: '依据值',
      dataIndex: 'basisValue',
      key: 'basisValue',
      width: 100,
      render: (value: number) => value.toFixed(2),
    },
    {
      title: '权重',
      dataIndex: 'weightValue',
      key: 'weightValue',
      width: 100,
      render: (value: number) => `${(value * 100).toFixed(1)}%`,
    },
    {
      title: '分摊工时',
      dataIndex: 'allocatedHours',
      key: 'allocatedHours',
      width: 120,
      render: (hours: number) => <strong>{hours.toFixed(2)}</strong>,
    },
    {
      title: '计算时间',
      dataIndex: 'calcTime',
      key: 'calcTime',
      width: 180,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  return (
    <div>
      <Card title="执行间接工时分摊计算">
        <Form form={form} layout="inline" initialValues={initialValues}>
          <Form.Item
            label="分摊配置"
            name="configId"
            rules={[{ required: true, message: '请选择分摊配置' }]}
          >
            <Select
              placeholder="请选择生效的配置"
              style={{ width: 300 }}
              loading={configsLoading}
            >
              {activeConfigs?.map((config: any) => (
                <Select.Option key={config.id} value={config.id}>
                  {config.configName} ({config.configCode})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="计算日期范围"
            name="dateRange"
            rules={[{ required: true, message: '请选择日期范围' }]}
          >
            <RangePicker style={{ width: 300 }} />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleExecute}
              loading={calculateMutation.isPending}
            >
              执行计算
            </Button>
          </Form.Item>
        </Form>

        {calculateMutation.isPending && (
          <Alert
            message="正在执行分摊计算，请稍候..."
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}

        {currentBatchNo && (
          <Alert
            message={
              <Space>
                <span>当前批次号：{currentBatchNo}</span>
                <Button size="small" icon={<SyncOutlined />} onClick={handleRefresh}>
                  刷新
                </Button>
              </Space>
            }
            type="success"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      {summaryData && (
        <Card title="分摊结果汇总" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="总待分摊工时"
                value={summaryData.total?.totalHours || 0}
                precision={2}
                suffix="小时"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="总已分摊工时"
                value={summaryData.total?.allocatedHours || 0}
                precision={2}
                suffix="小时"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="分摊记录数"
                value={summaryData.total?.recordCount || 0}
                suffix="条"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="分摊对象数"
                value={summaryData.byDimension?.length || 0}
                suffix="个"
              />
            </Col>
          </Row>

          <Divider />

          <Row gutter={16}>
            <Col span={12}>
              <Card title="按对象汇总" size="small">
                <Table
                  columns={[
                    { title: '对象名称', dataIndex: 'allocationObjectName', width: 150 },
                    {
                      title: '待分摊工时',
                      dataIndex: '_sum',
                      children: [
                        {
                          title: '总额',
                          dataIndex: ['_sum', 'totalHours'],
                          width: 100,
                          render: (val: any) => val?.toFixed(2) || '0.00',
                        },
                      ],
                    },
                    {
                      title: '已分摊工时',
                      dataIndex: '_sum',
                      children: [
                        {
                          title: '总额',
                          dataIndex: ['_sum', 'allocatedHours'],
                          width: 100,
                          render: (val: any) => val?.toFixed(2) || '0.00',
                        },
                      ],
                    },
                  ]}
                  dataSource={summaryData.byDimension || []}
                  rowKey="allocationObjectId"
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="按工时类型汇总" size="small">
                <Table
                  columns={[
                    { title: '工时类型', dataIndex: 'hourType', width: 150 },
                    {
                      title: '待分摊工时',
                      dataIndex: '_sum',
                      children: [
                        {
                          title: '总额',
                          dataIndex: ['_sum', 'totalHours'],
                          width: 100,
                          render: (val: any) => val?.toFixed(2) || '0.00',
                        },
                      ],
                    },
                    {
                      title: '已分摊工时',
                      dataIndex: '_sum',
                      children: [
                        {
                          title: '总额',
                          dataIndex: ['_sum', 'allocatedHours'],
                          width: 100,
                          render: (val: any) => val?.toFixed(2) || '0.00',
                        },
                      ],
                    },
                  ]}
                  dataSource={summaryData.byHourType || []}
                  rowKey="hourType"
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      {currentBatchNo && (
        <Card title="分摊结果明细" style={{ marginTop: 16 }}>
          <Table
            columns={resultColumns}
            dataSource={resultsData?.items || []}
            loading={resultsLoading}
            rowKey="id"
            scroll={{ x: 1400 }}
            pagination={{
              current: resultPage,
              pageSize: resultPageSize,
              total: resultsData?.total || 0,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (newPage, newPageSize) => {
                setResultPage(newPage);
                setResultPageSize(newPageSize || 10);
              },
            }}
          />
        </Card>
      )}
    </div>
  );
};

export default AllocationCalculatePage;
