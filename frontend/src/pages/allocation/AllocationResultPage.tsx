import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Form,
  Select,
  DatePicker,
  Button,
  Space,
  Card as AntCard,
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
  rule?: {
    ruleName: string;
  };
}

// 汇总数据结构
interface SummaryItem {
  batchNo: string;
  recordDate: string;
  sourceEmployeeNo: string;
  sourceEmployeeName: string;
  sourceAccountId: number | null;
  sourceAccountName: string | null;
  sourceHours: number;
  allocationBasis: string;
  configName: string;
  ruleName: string;
  details: AllocationResult[];
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

  // 判断是否为挣得工时结果
  const isEarnedHours = location.state?.allocationType === 'earned';

  // 获取结果列表
  const { data: resultsData, isLoading, refetch } = useQuery({
    queryKey: ['allocationResults', page, pageSize, searchParams],
    queryFn: () => {
      const endpoint = isEarnedHours
        ? '/earned-hours-allocation/results'
        : '/allocation/results';

      return request.get(endpoint, {
        params: { page, pageSize, ...searchParams },
      }).then((res: any) => res);
    },
  });

  // 获取结果汇总
  const { data: summaryData } = useQuery({
    queryKey: ['allocationResultsSummary', searchParams],
    queryFn: () => {
      const endpoint = isEarnedHours
        ? '/earned-hours-allocation/results/summary'
        : '/allocation/results/summary';

      return request.get(endpoint, {
        params: searchParams,
      }).then((res: any) => res);
    },
  });

  // 对结果进行汇总（按批次+日期+员工）
  const summaryList = useMemo(() => {
    if (!resultsData?.items || resultsData.items.length === 0) return [];

    const map = new Map<string, SummaryItem>();

    resultsData.items.forEach((item: AllocationResult) => {
      const key = `${item.batchNo}_${item.recordDate}_${item.sourceEmployeeNo}_${item.sourceAccountId}`;

      if (!map.has(key)) {
        map.set(key, {
          batchNo: item.batchNo,
          recordDate: item.recordDate,
          sourceEmployeeNo: item.sourceEmployeeNo || '-',
          sourceEmployeeName: item.sourceEmployeeName || '-',
          sourceAccountId: item.sourceAccountId,
          sourceAccountName: item.sourceAccountName,
          sourceHours: item.sourceHours,
          allocationBasis: item.allocationBasis,
          configName: item.config?.configName || '-',
          ruleName: item.rule?.ruleName || '-',
          details: [item],
        });
      } else {
        const existing = map.get(key)!;
        existing.details.push(item);
      }
    });

    return Array.from(map.values());
  }, [resultsData?.items]);

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

  const allocationBasisMap: Record<string, string> = {
    ACTUAL_HOURS: '实际工时',
    STD_HOURS: '标准工时',
    ACTUAL_YIELDS: '实际产量',
    EQUIVALENT_YIELDS: '当量产量',
    PRODUCT_STD_HOURS: '产品标准工时',
    EMPLOYEE_COUNT: '人员数量',
    FIXED_VALUE: '固定值',
  };

  // 汇总列表列定义
  const summaryColumns = [
    {
      title: '批次号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 180,
      fixed: 'left' as const,
      render: (batchNo: string) => (
        <Tag color="blue" style={{ fontFamily: 'monospace' }}>
          {batchNo}
        </Tag>
      ),
    },
    {
      title: '分摊规则',
      dataIndex: 'ruleName',
      key: 'ruleName',
      width: 150,
      ellipsis: true,
    },
    {
      title: '分摊日期',
      dataIndex: 'recordDate',
      key: 'recordDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '工号',
      dataIndex: 'sourceEmployeeNo',
      key: 'sourceEmployeeNo',
      width: 100,
      render: (no: string) => no || '-',
    },
    {
      title: '姓名',
      dataIndex: 'sourceEmployeeName',
      key: 'sourceEmployeeName',
      width: 100,
      render: (name: string) => (
        <Space>
          <UserOutlined />
          {name || '-'}
        </Space>
      ),
    },
    {
      title: '待分摊工时',
      dataIndex: 'sourceHours',
      key: 'sourceHours',
      width: 120,
      align: 'right' as const,
      render: (hours: number) => <strong>{hours.toFixed(2)}</strong>,
    },
    {
      title: '劳动力账户',
      dataIndex: 'sourceAccountName',
      key: 'sourceAccountName',
      width: 200,
      ellipsis: true,
      render: (name: string) => (
        <Space>
          <BankOutlined />
          {name || '-'}
        </Space>
      ),
    },
    {
      title: '分摊方式',
      dataIndex: 'allocationBasis',
      key: 'allocationBasis',
      width: 120,
      render: (basis: string) => allocationBasisMap[basis] || basis,
    },
  ];

  // 明细列表列定义
  const detailColumns = [
    {
      title: '分摊目标',
      dataIndex: 'targetName',
      key: 'targetName',
      width: 150,
    },
    {
      title: '目标账户',
      dataIndex: 'targetAccountName',
      key: 'targetAccountName',
      width: 200,
      ellipsis: true,
      render: (name: string, record: AllocationResult) => {
        if (!name && !record.targetAccountId) return '-';
        if (!name) return <Tag color="green">账户ID: {record.targetAccountId}</Tag>;
        return <Tag color="green">{name}</Tag>;
      },
    },
    {
      title: '分摊依据值',
      dataIndex: 'basisValue',
      key: 'basisValue',
      width: 100,
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
    {
      title: '分摊工时',
      dataIndex: 'allocatedHours',
      key: 'allocatedHours',
      width: 100,
      align: 'right' as const,
      render: (hours: number) => <strong style={{ color: '#1890ff' }}>{hours.toFixed(2)}</strong>,
    },
  ];

  // 挣得工时分摊结果列定义（保持原有结构）
  const earnedHoursColumns = [
    {
      title: '批次号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 180,
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
      title: '产品信息',
      children: [
        {
          title: '产品名称',
          dataIndex: 'sourceProductName',
          key: 'sourceProductName',
          width: 120,
        },
        {
          title: '产量',
          dataIndex: 'actualQty',
          key: 'actualQty',
          width: 90,
          align: 'right' as const,
          render: (qty: number) => qty?.toFixed(0) || '-',
        },
      ],
    },
    {
      title: '分摊对象',
      dataIndex: 'targetName',
      key: 'targetName',
      width: 120,
      render: (name: string) => (
        <Space>
          <UserOutlined />
          {name}
        </Space>
      ),
    },
    {
      title: '分摊依据',
      children: [
        {
          title: '类型',
          dataIndex: 'allocationBasis',
          key: 'allocationBasis',
          width: 100,
          render: (basis: string) => {
            const map: Record<string, string> = {
              ACTUAL_HOURS: '实际工时',
              AVERAGE: '平均分摊',
            };
            return map[basis] || basis;
          },
        },
        {
          title: '工时',
          dataIndex: 'basisValue',
          key: 'basisValue',
          width: 90,
          align: 'right' as const,
          render: (value: number, record: any) => record.workHours?.toFixed(2) || value?.toFixed(2) || '-',
        },
        {
          title: '比例',
          dataIndex: 'allocationRatio',
          key: 'allocationRatio',
          width: 90,
          align: 'right' as const,
          render: (ratio: number) => ratio ? `${(ratio * 100).toFixed(2)}%` : '-',
        },
      ],
    },
    {
      title: '分得工时',
      dataIndex: 'allocatedHours',
      key: 'allocatedHours',
      width: 100,
      fixed: 'right' as const,
      align: 'right' as const,
      render: (hours: number) => <strong style={{ color: '#52c41a' }}>{hours?.toFixed(2) || '-'}</strong>,
    },
    {
      title: '计算时间',
      dataIndex: 'calcTime',
      key: 'calcTime',
      width: 160,
      render: (time: string) => time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
  ];

  return (
    <div>
      <AntCard title="工时管理结果查询">
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

        <Table
          columns={isEarnedHours ? earnedHoursColumns : summaryColumns}
          dataSource={isEarnedHours ? resultsData?.items || [] : summaryList}
          loading={isLoading}
          rowKey={isEarnedHours ? 'id' : (record) => `${record.batchNo}_${record.recordDate}_${record.sourceEmployeeNo}_${record.sourceAccountId}`}
          scroll={{ x: isEarnedHours ? 1500 : 1200 }}
          pagination={{
            current: page,
            pageSize,
            total: isEarnedHours ? (resultsData?.total || 0) : (summaryList.length || 0),
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (newPage, newPageSize) => {
              setPage(newPage);
              setPageSize(newPageSize || 10);
            },
          }}
          expandable={
            !isEarnedHours
              ? {
                  expandedRowRender: (record: SummaryItem) => (
                    <div style={{ margin: -16, padding: 16, backgroundColor: '#fafafa' }}>
                      <Table
                        columns={detailColumns}
                        dataSource={record.details}
                        pagination={false}
                        rowKey="id"
                        size="small"
                        title={() => <strong>分摊明细 ({record.details.length} 条)</strong>}
                      />
                    </div>
                  ),
                  expandRowByClick: true,
                }
              : undefined
          }
        />
      </AntCard>
    </div>
  );
};

export default AllocationResultPage;
