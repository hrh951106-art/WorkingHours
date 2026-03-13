import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Form,
  Select,
  DatePicker,
  Button,
  Space,
  Row,
  Col,
  Card as AntCard,
  Statistic,
  Input,
  Tag,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import { SearchOutlined, DownloadOutlined, UserOutlined, BankOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import request from '@/utils/request';
import dayjs from 'dayjs';
import OrganizationTreeSelect from '@/components/common/OrganizationTreeSelect';

const { RangePicker } = DatePicker;

interface AllocationResult {
  id: number;
  batchNo: string;
  recordDate: string;
  calcResultId: number;
  configId: number;
  configVersion: number;
  ruleId: number;
  // 源工时信息
  sourceEmployeeNo: string | null;
  sourceEmployeeName: string | null;
  sourceAccountId: number | null;
  sourceAccountName: string | null;
  attendanceCodeId: number | null;
  attendanceCode: string | null;
  sourceHours: number;
  // 源工时详细信息（新增）
  sourceCalcResult?: {
    id: number;
    shiftId: number;
    shiftName: string | null;
    calcDate: string;
  } | null;
  // 分摊目标信息
  targetType: string;
  targetId: number;
  targetName: string;
  targetAccountId: number | null;
  targetAccountName: string | null;
  // 分摊计算信息
  allocationBasis: string;
  basisValue: number;
  weightValue: number;
  allocationRatio: number;
  allocatedHours: number;
  calcTime: string;
  config?: {
    configCode: string;
    configName: string;
  };
}

const AllocationResultPage: React.FC = () => {
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchParams, setSearchParams] = useState<any>({});
  const location = useLocation();
  const [autoSearched, setAutoSearched] = useState(false);

  // 获取分摊配置列表
  const { data: configsData } = useQuery({
    queryKey: ['allocationConfigsForRules'],
    queryFn: () =>
      request.get('/allocation/configs', {
        params: { status: 'ACTIVE', pageSize: 100 },
      }).then((res: any) => res.items),
  });

  // 页面加载时，检查是否有传递的参数
  useEffect(() => {
    if (location.state && !autoSearched) {
      const { startDate, endDate, batchNo } = location.state as any;

      if (startDate && endDate) {
        form.setFieldsValue({
          dateRange: [dayjs(startDate), dayjs(endDate)],
          batchNo: batchNo || '',
        });

        // 自动执行查询
        const params: any = {
          startDate,
          endDate,
        };
        if (batchNo) params.batchNo = batchNo;

        setSearchParams(params);
        setAutoSearched(true);
      }
    }
  }, [location.state, form, autoSearched]);

  // 获取结果列表
  const { data: resultsData, isLoading, refetch } = useQuery({
    queryKey: ['allocationResults', page, pageSize, searchParams],
    queryFn: () =>
      request.get('/allocation/results', {
        params: { page, pageSize, ...searchParams },
      }).then((res: any) => res),
  });

  // 获取结果汇总
  const { data: summaryData } = useQuery({
    queryKey: ['allocationResultsSummary', searchParams],
    queryFn: () =>
      request.get('/allocation/results/summary', {
        params: searchParams,
      }).then((res: any) => res),
  });

  const handleSearch = async () => {
    try {
      const values = await form.validateFields();
      const params: any = {};

      if (values.batchNo) params.batchNo = values.batchNo;
      if (values.organizationId) params.organizationId = values.organizationId;
      if (values.employeeNo) params.employeeNo = values.employeeNo;
      if (values.dateRange) {
        params.startDate = values.dateRange[0].format('YYYY-MM-DD');
        params.endDate = values.dateRange[1].format('YYYY-MM-DD');
      }

      setSearchParams(params);
      setPage(1);
      setAutoSearched(true); // 标记已执行过查询
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setSearchParams({});
    setPage(1);
    setAutoSearched(false);
  };

  const handleExport = () => {
    // TODO: 实现导出功能
    console.log('导出功能待实现');
  };

  const dimensionTypeMap: Record<string, string> = {
    LINE: '产线',
    WORKSHOP: '车间',
    TEAM: '班组',
    WORK_CENTER: '工作中心',
    ACCOUNT: '账户',
    COST_CENTER: '成本中心',
  };

  const allocationBasisMap: Record<string, string> = {
    ACTUAL_HOURS: '实际工时',
    STD_HOURS: '标准工时',
    ACTUAL_YIELDS: '实际产量',
    EQUIVALENT_YIELDS: '当量产量',
    PRODUCT_STD_HOURS: '产品标准工时',
    EMPLOYEE_COUNT: '人员数量',
    FIXED_VALUE: '固定值',
  };

  const columns = [
    {
      title: '批次号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 160,
      fixed: 'left' as const,
      render: (batchNo: string) => (
        <Tag color="blue" style={{ fontFamily: 'monospace' }}>
          {batchNo}
        </Tag>
      ),
    },
    {
      title: '记录日期',
      dataIndex: 'recordDate',
      key: 'recordDate',
      width: 110,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '源员工信息',
      children: [
        {
          title: '工号',
          dataIndex: 'sourceEmployeeNo',
          key: 'sourceEmployeeNo',
          width: 100,
          render: (no: string | null) => no || '-',
        },
        {
          title: '姓名',
          dataIndex: 'sourceEmployeeName',
          key: 'sourceEmployeeName',
          width: 100,
          render: (name: string | null) => (
            <Space>
              <UserOutlined />
              {name || '-'}
            </Space>
          ),
        },
      ],
    },
    {
      title: '源工时详情',
      children: [
        {
          title: '日期',
          dataIndex: 'sourceCalcResult',
          key: 'sourceDate',
          width: 110,
          render: (calcResult: any) => {
            if (!calcResult || !calcResult.calcDate) return '-';
            return dayjs(calcResult.calcDate).format('YYYY-MM-DD');
          },
        },
        {
          title: '班次',
          dataIndex: 'sourceCalcResult',
          key: 'sourceShift',
          width: 100,
          render: (calcResult: any) => {
            if (!calcResult) return '-';
            return calcResult.shiftName || `班次${calcResult.shiftId}`;
          },
        },
      ],
    },
    {
      title: '源工时信息',
      children: [
        {
          title: '出勤代码',
          dataIndex: 'attendanceCode',
          key: 'attendanceCode',
          width: 100,
          render: (code: string | null) => code || '-',
        },
        {
          title: '源账户',
          dataIndex: 'sourceAccountName',
          key: 'sourceAccountName',
          width: 150,
          ellipsis: true,
          render: (name: string | null) => (
            <Space>
              <BankOutlined />
              {name || '-'}
            </Space>
          ),
        },
        {
          title: '源工时',
          dataIndex: 'sourceHours',
          key: 'sourceHours',
          width: 90,
          align: 'right' as const,
          render: (hours: number) => hours.toFixed(2),
        },
      ],
    },
    {
      title: '分摊目标',
      children: [
        {
          title: '类型',
          dataIndex: 'targetType',
          key: 'targetType',
          width: 90,
          render: (type: string) => dimensionTypeMap[type] || type,
        },
        {
          title: '对象名称',
          dataIndex: 'targetName',
          key: 'targetName',
          width: 120,
          ellipsis: true,
        },
        {
          title: '目标账户',
          dataIndex: 'targetAccountName',
          key: 'targetAccountName',
          width: 200,
          ellipsis: true,
          render: (accountName: string | null, record: AllocationResult) => {
            if (!accountName && !record.targetAccountId) return '-';
            if (!accountName) return <Tag color="green">账户ID: {record.targetAccountId}</Tag>;
            return <Tag color="green">{accountName}</Tag>;
          },
        },
      ],
    },
    {
      title: '分摊依据',
      children: [
        {
          title: '依据类型',
          dataIndex: 'allocationBasis',
          key: 'allocationBasis',
          width: 120,
          render: (basis: string) => allocationBasisMap[basis] || basis,
        },
        {
          title: '依据值',
          dataIndex: 'basisValue',
          key: 'basisValue',
          width: 90,
          align: 'right' as const,
          render: (value: number) => value.toFixed(2),
        },
        {
          title: '权重值',
          dataIndex: 'weightValue',
          key: 'weightValue',
          width: 90,
          align: 'right' as const,
          render: (value: number) => value.toFixed(2),
        },
        {
          title: '分摊比例',
          dataIndex: 'allocationRatio',
          key: 'allocationRatio',
          width: 100,
          align: 'right' as const,
          render: (ratio: number) => `${(ratio * 100).toFixed(2)}%`,
        },
      ],
    },
    {
      title: '分摊工时',
      dataIndex: 'allocatedHours',
      key: 'allocatedHours',
      width: 100,
      fixed: 'right' as const,
      align: 'right' as const,
      render: (hours: number) => <strong style={{ color: '#1890ff' }}>{hours.toFixed(2)}</strong>,
    },
    {
      title: '计算时间',
      dataIndex: 'calcTime',
      key: 'calcTime',
      width: 160,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
  ];

  return (
    <div>
      <AntCard title="工时分摊结果查询">
        <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item label="批次号" name="batchNo">
            <Input placeholder="请输入批次号" style={{ width: 180 }} />
          </Form.Item>

          <Form.Item label="组织" name="organizationId">
            <OrganizationTreeSelect
              placeholder="请选择组织"
              allowClear
              style={{ width: 250 }}
            />
          </Form.Item>

          <Form.Item label="员工工号" name="employeeNo">
            <Input placeholder="请输入员工工号" style={{ width: 120 }} />
          </Form.Item>

          <Form.Item label="日期范围" name="dateRange">
            <RangePicker style={{ width: 240 }} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                查询
              </Button>
              <Button onClick={handleReset}>
                重置
              </Button>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                导出
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {summaryData && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Statistic
                title="源工时总计"
                value={summaryData.total?.sourceHours || 0}
                precision={2}
                suffix="小时"
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="分摊工时总计"
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
                title="涉及对象数"
                value={summaryData.byTarget?.length || 0}
                suffix="个"
              />
            </Col>
          </Row>
        )}

        <Table
          columns={columns}
          dataSource={resultsData?.items || []}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: 2400 }}
          pagination={{
            current: page,
            pageSize,
            total: resultsData?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (newPage, newPageSize) => {
              setPage(newPage);
              setPageSize(newPageSize || 10);
            },
          }}
        />
      </AntCard>
    </div>
  );
};

export default AllocationResultPage;
