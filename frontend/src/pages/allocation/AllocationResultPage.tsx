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
  Tabs,
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
  unit?: string; // 单位字段
  config?: {
    configCode: string;
    configName: string;
  };
  rule?: {
    ruleCode?: string;
    ruleName?: string;
  };
  // 挣得工时专用字段
  totalEarnedHours?: number; // 总挣得工时（新增）
  productionRecord?: {
    productName: string;
    productCode: string;
    actualQty: number;
    totalStdHours: number;
    lineName: string;
    shiftName: string;
  } | null;
  ruleName?: string;
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

// 挣得工时汇总数据结构
interface EarnedHoursSummaryItem {
  batchNo: string;
  recordDate: string;
  ruleName: string;
  sourceAccountId: number | null;
  sourceAccountName: string | null;
  actualQty: number;
  totalStdHours: number;
  allocationBasis: string;
  details: AllocationResult[];
}

const AllocationResultPage: React.FC = () => {
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchParams, setSearchParams] = useState<any>({});
  const location = useLocation();
  const [autoSearched, setAutoSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('indirect'); // 'indirect' | 'earned'

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
    queryKey: ['allocationResults', activeTab, page, pageSize, searchParams],
    queryFn: () => {
      const endpoint = activeTab === 'earned'
        ? '/earned-hours-allocation/results'
        : '/allocation/results';

      // 挣得工时不使用分页，一次性获取所有数据用于汇总
      const params = activeTab === 'earned'
        ? { ...searchParams }
        : { page, pageSize, ...searchParams };

      return request.get(endpoint, { params }).then((res: any) => res);
    },
  });

  // 获取结果汇总
  const { data: summaryData } = useQuery({
    queryKey: ['allocationResultsSummary', activeTab, searchParams],
    queryFn: () => {
      const endpoint = activeTab === 'earned'
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

  // 对挣得工时结果进行汇总（按批次+日期+产量账户）
  const earnedHoursSummaryList = useMemo(() => {
    if (!resultsData?.items || resultsData.items.length === 0) return [];

    const map = new Map<string, EarnedHoursSummaryItem>();

    resultsData.items.forEach((item: AllocationResult) => {
      // 挣得工时按批次+日期+产量账户分组
      const key = `${item.batchNo}_${item.recordDate}_${item.sourceAccountId}`;

      if (!map.has(key)) {
        map.set(key, {
          batchNo: item.batchNo,
          recordDate: item.recordDate,
          ruleName: item.ruleName || '-',
          sourceAccountId: item.sourceAccountId,
          sourceAccountName: item.sourceAccountName,
          actualQty: item.productionRecord?.actualQty || 0,
          totalStdHours: item.totalEarnedHours || item.productionRecord?.totalStdHours || 0, // 优先使用 totalEarnedHours
          allocationBasis: item.allocationBasis,
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
    PRODUCTION_LINE_AVERAGE: '产线平均',
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
      width: 200,
      ellipsis: true,
      render: (_: string, record: SummaryItem) => {
        const configCode = record.details?.[0]?.config?.configCode;
        const configName = record.details?.[0]?.config?.configName;
        if (configCode && configName) {
          return `${configCode}-${configName}`;
        }
        return configName || '-';
      },
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
      render: (name: string, record: AllocationResult) => {
        // 如果 name 是 'N/A' 或空，尝试从 sourceCalcResult.employee.name 获取
        const displayName = (!name || name === 'N/A')
          ? (record.sourceCalcResult?.employee?.name || '-')
          : name;
        return (
          <Space>
            <UserOutlined />
            {displayName}
          </Space>
        );
      },
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
      title: '分得',
      dataIndex: 'allocatedHours',
      key: 'allocatedHours',
      width: 100,
      align: 'right' as const,
      render: (hours: number) => <strong style={{ color: '#1890ff' }}>{hours.toFixed(2)}</strong>,
    },
  ];

  // 挣得工时汇总列定义
  const earnedHoursSummaryColumns = [
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
      width: 200,
      ellipsis: true,
      render: (_: string, record: EarnedHoursSummaryItem) => {
        const configCode = record.details?.[0]?.config?.configCode;
        const configName = record.details?.[0]?.config?.configName;
        if (configCode && configName) {
          return `${configCode}-${configName}`;
        }
        return configName || '-';
      },
    },
    {
      title: '记录日期',
      dataIndex: 'recordDate',
      key: 'recordDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '产量的劳动力账户',
      dataIndex: 'sourceAccountName',
      key: 'sourceAccountName',
      width: 250,
      ellipsis: true,
      render: (name: string) => (
        <Space>
          <BankOutlined />
          {name || '-'}
        </Space>
      ),
    },
    {
      title: '产量',
      dataIndex: 'actualQty',
      key: 'actualQty',
      width: 100,
      align: 'right' as const,
      render: (qty: number) => <strong>{qty?.toFixed(0) || '-'}</strong>,
    },
    {
      title: '挣得',
      dataIndex: 'totalStdHours',
      key: 'totalStdHours',
      width: 120,
      align: 'right' as const,
      render: (hours: number, record: EarnedHoursSummaryItem) => {
        const unit = record.details?.[0]?.unit || '小时';
        return <strong style={{ color: '#52c41a' }}>{hours?.toFixed(2) || '-'} {unit}</strong>;
      },
    },
    {
      title: '分摊方式',
      dataIndex: 'allocationBasis',
      key: 'allocationBasis',
      width: 120,
      render: (basis: string) => {
        const map: Record<string, string> = {
          ACTUAL_HOURS: '按实际工时比例',
          ACTUAL_HOURS_COEFFICIENT: '按实际工时系数比例',
          AVERAGE: '按人员平均分摊',
        };
        return map[basis] || basis;
      },
    },
  ];

  // 挣得工时明细列定义
  const earnedHoursDetailColumns = [
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
      title: '目标账户',
      dataIndex: 'targetAccountName',
      key: 'targetAccountName',
      width: 200,
      ellipsis: true,
      render: (name: string) => {
        if (!name) return '-';
        return <Tag color="green">{name}</Tag>;
      },
    },
    {
      title: (record: any) => {
        // 根据第一条记录的分摊方式决定标题
        if (record && record.allocationBasis === 'ACTUAL_HOURS_COEFFICIENT') {
          return '实际工时系数';
        }
        return '实际工时';
      },
      dataIndex: 'sourceHours',
      key: 'sourceHours',
      width: 120,
      align: 'right' as const,
      render: (hours: number, record: AllocationResult) => {
        const value = hours?.toFixed(2) || '-';
        if (record.allocationBasis === 'ACTUAL_HOURS_COEFFICIENT') {
          return <span style={{ color: '#52c41a' }}>{value}</span>;
        }
        return value;
      },
    },
    {
      title: '分摊比例',
      dataIndex: 'allocationRatio',
      key: 'allocationRatio',
      width: 100,
      align: 'right' as const,
      render: (ratio: number, record: AllocationResult) => {
        if (!ratio && record.allocationBasis === 'AVERAGE') {
          return '平均分摊';
        }
        return ratio ? `${(ratio * 100).toFixed(2)}%` : '-';
      },
    },
    {
      title: '分得',
      dataIndex: 'allocatedHours',
      key: 'allocatedHours',
      width: 100,
      align: 'right' as const,
      render: (hours: number, record: AllocationResult) => {
        const unit = record.unit || '小时';
        return <strong style={{ color: '#1890ff' }}>{hours?.toFixed(2) || '-'} {unit}</strong>;
      },
    },
  ];

  return (
    <div>
      <AntCard title="分配结果">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            setPage(1);
            setSearchParams({});
            form.resetFields();
            setAutoSearched(false);
          }}
          items={[
            {
              key: 'indirect',
              label: '间接工时',
              children: (
                <>
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
                    columns={summaryColumns}
                    dataSource={summaryList}
                    loading={isLoading}
                    rowKey={(record) => `${record.batchNo}_${record.recordDate}_${record.sourceEmployeeNo}_${record.sourceAccountId}`}
                    scroll={{ x: 1200 }}
                    pagination={{
                      current: page,
                      pageSize,
                      total: summaryList.length || 0,
                      showSizeChanger: true,
                      showTotal: (total) => `共 ${total} 条记录`,
                      onChange: (newPage, newPageSize) => {
                        setPage(newPage);
                        setPageSize(newPageSize || 10);
                      },
                    }}
                    expandable={{
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
                    }}
                  />
                </>
              ),
            },
            {
              key: 'earned',
              label: '挣得工时',
              children: (
                <>
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
                    columns={earnedHoursSummaryColumns}
                    dataSource={earnedHoursSummaryList}
                    loading={isLoading}
                    rowKey={(record) => `${record.batchNo}_${record.recordDate}_${record.sourceAccountId}`}
                    scroll={{ x: 1400 }}
                    pagination={{
                      current: page,
                      pageSize,
                      total: earnedHoursSummaryList.length || 0,
                      showSizeChanger: true,
                      showTotal: (total) => `共 ${total} 条记录`,
                      onChange: (newPage, newPageSize) => {
                        setPage(newPage);
                        setPageSize(newPageSize || 10);
                      },
                    }}
                    expandable={{
                      expandedRowRender: (record: EarnedHoursSummaryItem) => {
                        // 检查分摊方式，动态创建明细列定义
                        const firstDetail = record.details[0];
                        const isCoefficientMode = firstDetail?.allocationBasis === 'ACTUAL_HOURS_COEFFICIENT';

                        // 创建明细列定义的副本，修改"实际工时"列的标题
                        const detailColumns = [
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
                            title: '目标账户',
                            dataIndex: 'targetAccountName',
                            key: 'targetAccountName',
                            width: 200,
                            ellipsis: true,
                            render: (name: string) => {
                              if (!name) return '-';
                              return <Tag color="green">{name}</Tag>;
                            },
                          },
                          {
                            title: isCoefficientMode ? '实际工时系数' : '实际工时',
                            dataIndex: 'sourceHours',
                            key: 'sourceHours',
                            width: 120,
                            align: 'right' as const,
                            render: (hours: number, detail: AllocationResult) => {
                              const value = hours?.toFixed(2) || '-';
                              if (detail.allocationBasis === 'ACTUAL_HOURS_COEFFICIENT') {
                                return <span style={{ color: '#52c41a' }}>{value}</span>;
                              }
                              return value;
                            },
                          },
                          {
                            title: '分摊比例',
                            dataIndex: 'allocationRatio',
                            key: 'allocationRatio',
                            width: 100,
                            align: 'right' as const,
                            render: (ratio: number, detail: AllocationResult) => {
                              if (!ratio && detail.allocationBasis === 'AVERAGE') {
                                return '平均分摊';
                              }
                              return ratio ? `${(ratio * 100).toFixed(2)}%` : '-';
                            },
                          },
                          {
                            title: '分得',
                            dataIndex: 'allocatedHours',
                            key: 'allocatedHours',
                            width: 100,
                            align: 'right' as const,
                            render: (hours: number, detail: AllocationResult) => {
                              const unit = detail.unit || record.details?.[0]?.unit || '小时';
                              return <strong style={{ color: '#1890ff' }}>{hours?.toFixed(2) || '-'} {unit}</strong>;
                            },
                          },
                        ];

                        return (
                          <div style={{ margin: -16, padding: 16, backgroundColor: '#fafafa' }}>
                            <Table
                              columns={detailColumns}
                              dataSource={record.details}
                              pagination={false}
                              rowKey="id"
                              size="small"
                              title={() => {
                                const unit = record.details?.[0]?.unit || '小时';
                                const total = record.details.reduce((sum, item) => sum + item.allocatedHours, 0);
                                return <strong>分摊明细 - 共 {record.details.length} 人，分得总计 {total.toFixed(2)} {unit}</strong>;
                              }}
                            />
                          </div>
                        );
                      },
                      expandRowByClick: true,
                    }}
                  />
                </>
              ),
            },
          ]}
        />
      </AntCard>
    </div>
  );
};

export default AllocationResultPage;
