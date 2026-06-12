import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Form,
  DatePicker,
  Button,
  Space,
  Input,
  Tag,
  Tooltip,
} from 'antd';
import { useQuery } from '@tanstack/react-query';
import { SearchOutlined, DownloadOutlined, UserOutlined, BankOutlined, BarChartOutlined } from '@ant-design/icons';
import request from '@/utils/request';
import dayjs from 'dayjs';
import OrganizationTreeSelect from '@/components/common/OrganizationTreeSelect';

const { RangePicker } = DatePicker;

interface EarnedHoursRecord {
  id: number;
  recordDate: string;
  employeeNo: string;
  employeeName: string;
  orgId: number;
  orgName: string;
  productId: number;
  productCode: string;
  productName: string;
  actualQty: number;
  standardQuantity: number;
  standardHours: number;
  accountPath: string;
  teamAllocatedHours: number; // 团队��摊工时
  teamAllocatedUnit: string; // 团队分摊工时单位
  personalEarnedHours: number; // 个人挣得工时
  personalEarnedUnit: string; // 个人挣得工时单位
  totalEarnedHours: number; // 合计
  source: string; // 数据来源标识
}

const EarnedHoursReportPage: React.FC = () => {
  const [form] = Form.useForm();
  const [searchParams, setSearchParams] = useState<any>({});

  // 获取组织列表
  const { data: orgsData } = useQuery({
    queryKey: ['organizationsForReport'],
    queryFn: () =>
      request.get('/organizations', {
        params: { pageSize: 1000 },
      }).then((res: any) => res.items),
  });

  // 统一查询挣得工时数据
  const { data: reportData, isLoading: reportLoading, refetch: reportRefetch } = useQuery({
    queryKey: ['earnedHoursReport', searchParams],
    queryFn: () =>
      request.get('/earned-hours-allocation/report/unified', {
        params: searchParams,
      }).then((res: any) => res),
    enabled: !!searchParams.startDate,
  });

  // 合并相同员工、日期和劳动力账户的记录
  const mergedData = useMemo(() => {
    if (!reportData?.items) return [];

    const mergeMap = new Map<string, any>();

    reportData.items.forEach((item: any) => {
      const key = `${item.employeeNo}_${item.recordDate}_${item.orgName}`;

      if (mergeMap.has(key)) {
        // 合并记录
        const existing = mergeMap.get(key);
        existing.teamAllocatedHours += item.teamAllocatedHours || 0;
        existing.personalEarnedHours += item.personalEarnedHours || 0;
        // 如果有个人产量数据，优先显示有产量的记录
        if (item.actualQty > 0) {
          existing.actualQty = item.actualQty;
          existing.standardHours = item.standardHours;
          existing.productName = item.productName;
        }
      } else {
        // 新记录
        mergeMap.set(key, { ...item });
      }
    });

    return Array.from(mergeMap.values());
  }, [reportData]);

  const handleSearch = async () => {
    try {
      const values = await form.validateFields();
      const params: any = {};

      if (values.organizationId) params.orgId = values.organizationId;
      if (values.employeeNo) params.employeeNo = values.employeeNo;
      if (values.productId) params.productId = values.productId;
      if (values.dateRange) {
        params.startDate = values.dateRange[0].format('YYYY-MM-DD');
        params.endDate = values.dateRange[1].format('YYYY-MM-DD');
      }

      setSearchParams(params);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setSearchParams({});
  };

  const handleExport = () => {
    console.log('导出功能待实现');
  };

  // 设置默认日期范围为当前月份并自动查询
  useEffect(() => {
    const now = dayjs();
    const startOfMonth = now.startOf('month');
    const endOfMonth = now.endOf('month');

    form.setFieldsValue({
      dateRange: [startOfMonth, endOfMonth],
    });

    // 设置搜索参数并自动执行查询
    setSearchParams({
      startDate: startOfMonth.format('YYYY-MM-DD'),
      endDate: endOfMonth.format('YYYY-MM-DD'),
    });
  }, []);

  // 表格列定义
  const columns = [
    {
      title: '日期',
      dataIndex: 'recordDate',
      key: 'recordDate',
      width: 100,
      fixed: 'left' as const,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '工号',
      dataIndex: 'employeeNo',
      key: 'employeeNo',
      width: 100,
      fixed: 'left' as const,
      render: (no: string) => no || '-',
    },
    {
      title: '姓名',
      dataIndex: 'employeeName',
      key: 'employeeName',
      width: 100,
      fixed: 'left' as const,
      render: (name: string) => (
        <Space>
          <UserOutlined />
          {name || '-'}
        </Space>
      ),
    },
    {
      title: '劳动力账户',
      dataIndex: 'orgName',
      key: 'orgName',
      width: 250,
      ellipsis: { showTitle: false },
      render: (name: string) => (
        <Tooltip placement="topLeft" title={name || '-'}>
          <Space>
            <BankOutlined />
            {name || '-'}
          </Space>
        </Tooltip>
      ),
    },
    {
      title: '产品名称',
      dataIndex: 'productName',
      key: 'productName',
      width: 150,
      ellipsis: { showTitle: false },
      render: (name: string) => (
        <Tooltip placement="topLeft" title={name || '-'}>
          {name || '-'}
        </Tooltip>
      ),
    },
    {
      title: '标准',
      dataIndex: 'standard',
      key: 'standard',
      width: 150,
      align: 'right' as const,
      render: (_, record: any) => {
        const { standardQuantity, standardHours, standardUnit, hasPersonalProduction } = record;
        if (!standardQuantity || !standardHours) return '-';

        // 根据单位显示不同的格式
        if (standardUnit === '元') {
          return `${standardQuantity?.toFixed(0)}件/${standardHours?.toFixed(2)}元`;
        } else {
          return `${standardQuantity?.toFixed(0)}件/${standardHours?.toFixed(2)}小时`;
        }
      },
    },
    {
      title: '团队',
      children: [
        {
          title: '团队产量',
          dataIndex: 'teamProductionQty',
          key: 'teamProductionQty',
          width: 100,
          align: 'right' as const,
          render: (qty: number) => <strong style={{ color: '#1890ff' }}>{qty && qty > 0 ? qty.toFixed(0) : '-'}</strong>,
        },
        {
          title: '团队挣得',
          dataIndex: 'teamProductionEarned',
          key: 'teamProductionEarned',
          width: 120,
          align: 'right' as const,
          render: (hours: number, record: any) => (
            <span style={{ color: '#52c41a', fontSize: '14px', fontWeight: 'bold' }}>
              {hours && hours > 0 ? `${hours.toFixed(2)}${record.teamProductionUnit || '小时'}` : '-'}
            </span>
          ),
        },
        {
          title: '团队分配',
          dataIndex: 'teamAllocatedHours',
          key: 'teamAllocatedHours',
          width: 120,
          align: 'right' as const,
          render: (hours: number, record: any) => (
            <span style={{ color: '#faad14', fontSize: '14px', fontWeight: 'bold' }}>
              {hours && hours > 0 ? `${hours.toFixed(2)}${record.teamAllocatedUnit || '小时'}` : '-'}
            </span>
          ),
        },
      ],
    },
    {
      title: '个人产量',
      dataIndex: 'actualQty',
      key: 'actualQty',
      width: 100,
      align: 'right' as const,
      render: (qty: number) => <strong>{qty && qty > 0 ? qty.toFixed(0) : '-'}</strong>,
    },
    {
      title: '个人挣得',
      dataIndex: 'personalEarnedHours',
      key: 'personalEarnedHours',
      width: 120,
      align: 'right' as const,
      fixed: 'right' as const,
      render: (hours: number, record: EarnedHoursReportItem) => {
        const unit = record.personalEarnedUnit || '小时';
        return (
          <span style={{ color: '#52c41a', fontSize: '14px', fontWeight: 'bold' }}>
            {hours && hours > 0 ? `${hours.toFixed(2)}${unit}` : '-'}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <Card
        title={
          <Space>
            <BarChartOutlined />
            <span>挣得报表</span>
          </Space>
        }
      >
        {/* 查询表单 */}
        <Form form={form} layout="inline" style={{ marginBottom: 16 }}>
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

          <Form.Item label="产品编码" name="productId">
            <Input placeholder="请输入产品编码" style={{ width: 150 }} />
          </Form.Item>

          <Form.Item label="日期范围" name="dateRange" rules={[{ required: true }]}>
            <RangePicker style={{ width: 240 }} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                查询
              </Button>
              <Button icon={<DownloadOutlined />} onClick={handleExport}>
                导出
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {/* 数据表格 */}
        <Table
          columns={columns}
          dataSource={mergedData}
          loading={reportLoading}
          rowKey="id"
          scroll={{ x: 2000 }}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>
    </div>
  );
};

export default EarnedHoursReportPage;
