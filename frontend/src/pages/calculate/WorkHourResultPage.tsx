import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Form,
  message,
  Space,
  Row,
  Col,
  Select,
  Tag,
  DatePicker,
  Switch,
  Tooltip,
  Collapse,
  Tabs,
} from 'antd';
import {
  ReloadOutlined,
  CalculatorOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import { ModernPageLayout } from '@/components/common/ModernPageLayout';
import DynamicSearchConditions from '@/components/common/DynamicSearchConditions';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

// 定义结果类型
type ResultType = 'attendance-punch' | 'attendance-work-hour' | 'lean-punch' | 'lean-work-hour';

const WorkHourResultPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ResultType>('attendance-punch');
  const [selectedDateRange, setSelectedDateRange] = useState<{
    start: dayjs.Dayjs;
    end: dayjs.Dayjs;
  }>({
    start: dayjs().startOf('month'),
    end: dayjs().endOf('month'),
  });
  const [dynamicFilters, setDynamicFilters] = useState<any>({});
  const [includeAllocation, setIncludeAllocation] = useState(false);
  const [searchForm] = useState<any>(null);

  // 获取员工列表
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => request.get('/hr/employees').then((res: any) => res.items || []),
  });

  // 获取精益摆卡结果
  const { data: leanPunchResults, isLoading: leanPunchLoading } = useQuery({
    queryKey: ['leanPunchResults', selectedDateRange.start.format('YYYY-MM-DD'), selectedDateRange.end.format('YYYY-MM-DD'), dynamicFilters],
    queryFn: () =>
      request
        .get('/punch/pair-results', {
          params: {
            startDate: selectedDateRange.start.format('YYYY-MM-DD'),
            endDate: selectedDateRange.end.format('YYYY-MM-DD'),
            ...dynamicFilters,
            pageSize: 1000,
          },
        })
        .then((res: any) => res),
    enabled: activeTab === 'lean-punch',
  });

  // 获取考勤摆卡结果
  const { data: attendancePunchResults, isLoading: attendancePunchLoading } = useQuery({
    queryKey: ['attendancePunchResults', selectedDateRange.start.format('YYYY-MM-DD'), selectedDateRange.end.format('YYYY-MM-DD'), dynamicFilters],
    queryFn: () =>
      request
        .get('/punch/attendance-punch/results', {
          params: {
            startDate: selectedDateRange.start.format('YYYY-MM-DD'),
            endDate: selectedDateRange.end.format('YYYY-MM-DD'),
            ...dynamicFilters,
            pageSize: 1000,
          },
        })
        .then((res: any) => res),
    enabled: activeTab === 'attendance-punch',
  });

  // 获取精益工时计算结果
  const { data: leanWorkHourResults, isLoading: leanWorkHourLoading } = useQuery({
    queryKey: ['calcResults', selectedDateRange.start.format('YYYY-MM-DD'), selectedDateRange.end.format('YYYY-MM-DD'), dynamicFilters, includeAllocation],
    queryFn: () =>
      request
        .get('/calculate/results', {
          params: {
            startDate: selectedDateRange.start.format('YYYY-MM-DD'),
            endDate: selectedDateRange.end.format('YYYY-MM-DD'),
            ...dynamicFilters,
            pageSize: 1000,
            includeAllocation: includeAllocation,
          },
        })
        .then((res: any) => res),
    enabled: activeTab === 'lean-work-hour',
  });

  // 获取考勤工时计算结果
  const { data: attendanceWorkHourResults, isLoading: attendanceWorkHourLoading } = useQuery({
    queryKey: ['attendanceWorkHourResults', selectedDateRange.start.format('YYYY-MM-DD'), selectedDateRange.end.format('YYYY-MM-DD'), dynamicFilters],
    queryFn: () =>
      request
        .get('/calculate/work-hour-results', {
          params: {
            startDate: selectedDateRange.start.format('YYYY-MM-DD'),
            endDate: selectedDateRange.end.format('YYYY-MM-DD'),
            ...dynamicFilters,
            pageSize: 1000,
          },
        })
        .then((res: any) => res),
    enabled: activeTab === 'attendance-work-hour',
  });

  // 根据当前选中的tab返回对应的数据
  const getCurrentData = () => {
    switch (activeTab) {
      case 'attendance-punch':
        return attendancePunchResults;
      case 'attendance-work-hour':
        return attendanceWorkHourResults;
      case 'lean-punch':
        return leanPunchResults;
      case 'lean-work-hour':
        return leanWorkHourResults;
      default:
        return leanWorkHourResults;
    }
  };

  const results = getCurrentData();
  const isLoading =
    (activeTab === 'attendance-punch' && attendancePunchLoading) ||
    (activeTab === 'attendance-work-hour' && attendanceWorkHourLoading) ||
    (activeTab === 'lean-punch' && leanPunchLoading) ||
    (activeTab === 'lean-work-hour' && leanWorkHourLoading);

  // 手动触发计算
  const calculateMutation = useMutation({
    mutationFn: (data: any) => request.post('/calculate/calculate/batch', data),
    onSuccess: (res: any) => {
      message.success(`计算成功！${res.message}，成功${res.successCount}条，失败${res.failCount}条`);
      queryClient.invalidateQueries({ queryKey: ['calcResults'] });
    },
  });

  const handleCalculate = () => {
    calculateMutation.mutate({
      startDate: selectedDateRange.start.format('YYYY-MM-DD'),
      endDate: selectedDateRange.end.format('YYYY-MM-DD'),
      ...(dynamicFilters.employeeNo && { employeeNos: [dynamicFilters.employeeNo] }),
    });
  };

  const handleSearch = (values: any) => {
    setDynamicFilters(values);
  };

  const handleReset = () => {
    setDynamicFilters({});
  };

  // 精益摆卡结果列定义
  const leanPunchColumns = [
    {
      title: '员工号',
      dataIndex: 'employeeNo',
      key: 'employeeNo',
      width: 120,
      fixed: 'left' as const,
    },
    {
      title: '员工姓名',
      dataIndex: ['employee', 'name'],
      key: 'employeeName',
      width: 120,
      fixed: 'left' as const,
    },
    {
      title: '排班日期',
      dataIndex: 'punchDate',
      key: 'punchDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '班次',
      dataIndex: 'shiftName',
      key: 'shiftName',
      width: 150,
    },
    {
      title: '上班打卡时间',
      dataIndex: 'workStartPunchTime',
      key: 'workStartPunchTime',
      width: 150,
      render: (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '下班打卡时间',
      dataIndex: 'workEndPunchTime',
      key: 'workEndPunchTime',
      width: 150,
      render: (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '规则名称',
      dataIndex: 'ruleName',
      key: 'ruleName',
      width: 150,
    },
    {
      title: '子劳动力账户',
      dataIndex: 'accountName',
      key: 'subAccount',
      width: 200,
      render: (accountName: string, record: any) => {
        if (!accountName) {
          return <Tag color="default">-</Tag>;
        }
        return <Tag color="purple">{accountName}</Tag>;
      },
    },
  ];

  // 考勤摆卡结果列定义
  const attendancePunchColumns = [
    {
      title: '员工号',
      dataIndex: 'employeeNo',
      key: 'employeeNo',
      width: 120,
      fixed: 'left' as const,
    },
    {
      title: '员工姓名',
      dataIndex: ['employee', 'name'],
      key: 'employeeName',
      width: 120,
      fixed: 'left' as const,
    },
    {
      title: '打卡日期',
      dataIndex: 'punchDate',
      key: 'punchDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '班次',
      dataIndex: 'workStartShiftName',
      key: 'workStartShiftName',
      width: 150,
    },
    {
      title: '上班打卡时间',
      dataIndex: 'workStartPunchTime',
      key: 'workStartPunchTime',
      width: 150,
      render: (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '下班打卡时间',
      dataIndex: 'workEndPunchTime',
      key: 'workEndPunchTime',
      width: 150,
      render: (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '规则名称',
      dataIndex: 'ruleName',
      key: 'ruleName',
      width: 150,
    },
    {
      title: '连续班次',
      dataIndex: 'isContinuousShift',
      key: 'isContinuousShift',
      width: 100,
      render: (isContinuous: boolean) => (
        <Tag color={isContinuous ? 'blue' : 'default'}>
          {isContinuous ? '是' : '否'}
        </Tag>
      ),
    },
  ];

  // 精益工时结果列定义
  const leanWorkHourColumns = [
    {
      title: '员工号',
      dataIndex: 'employeeNo',
      key: 'employeeNo',
      width: 120,
      fixed: 'left' as const,
    },
    {
      title: '员工姓名',
      dataIndex: ['employee', 'name'],
      key: 'employeeName',
      width: 120,
      fixed: 'left' as const,
    },
    {
      title: '排班日期',
      dataIndex: 'calcDate',
      key: 'calcDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '班次',
      dataIndex: 'shiftName',
      key: 'shiftName',
      width: 120,
    },
    {
      title: '出勤代码',
      dataIndex: 'calculationAttendanceCode', // ✅ 修改为使用新的计算出勤代码字段
      key: 'calculationAttendanceCode',
      width: 150,
      render: (calculationAttendanceCode: any, record: any) => {
        if (!calculationAttendanceCode) {
          return <Tag color="default">未配置</Tag>;
        }

        // 检查是否为间接工时（分摊后的工时）
        const isIndirect = record.accountName?.includes('_间接工时') ||
                          calculationAttendanceCode.name?.includes('间接');

        return (
          <Tag
            color={isIndirect ? 'orange' : 'blue'}
            style={{ fontSize: 12, padding: '2px 8px' }}
          >
            {calculationAttendanceCode.name}
            {isIndirect && <span style={{ marginLeft: 4 }}>*</span>}
          </Tag>
        );
      },
    },
    {
      title: '开始时间',
      dataIndex: 'punchInTime',
      key: 'punchInTime',
      width: 150,
      render: (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '结束时间',
      dataIndex: 'punchOutTime',
      key: 'punchOutTime',
      width: 150,
      render: (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '实际时长',
      dataIndex: 'actualHours',
      key: 'actualHours',
      width: 100,
      render: (hours: number) => (
        <span style={{ fontWeight: 600, color: '#00B365' }}>
          {hours.toFixed(2)} 小时
        </span>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number) => (
        <span style={{ fontWeight: 600, color: '#FA8C16' }}>
          {amount ? `¥${amount.toFixed(2)}` : '-'}
        </span>
      ),
    },
    {
      title: '劳动力账户',
      dataIndex: 'accountName',
      key: 'accountName',
      width: 200,
      render: (accountName: string) => {
        if (!accountName) return <Tag>-</Tag>;
        const isIndirect = accountName.includes('_间接工时') || accountName.includes('_间接设备');
        return <Tag color={isIndirect ? 'orange' : 'purple'}>{accountName}</Tag>;
      },
    },
    ...(includeAllocation ? [{
      title: (
        <Tooltip title="显示该工时是否已被分摊以及分摊的详细信息">
          <span>分摊信息 <InfoCircleOutlined /></span>
        </Tooltip>
      ),
      key: 'allocation',
      width: 200,
      render: (_: any, record: any) => {
        // 如果有allocationResults字段，显示分摊信息
        if (record.allocationResults && record.allocationResults.length > 0) {
          return (
            <Tooltip
              title={
                <div>
                  <div>配置: {record.allocationResults[0]?.config?.configName || '-'}</div>
                  {record.allocationResults.map((ar: any, idx: number) => (
                    <div key={idx}>
                      {ar.targetName}: {ar.allocatedHours?.toFixed(2)}h ({(ar.allocationRatio * 100).toFixed(1)}%)
                    </div>
                  ))}
                </div>
              }
            >
              <Tag color="green">已分摊 ({record.totalAllocatedHours?.toFixed(2)}h)</Tag>
            </Tooltip>
          );
        }
        return <Tag>-</Tag>;
      },
    }] : []),
  ];

  // 考勤工时结果列定义
  const attendanceWorkHourColumns = [
    {
      title: '员工号',
      dataIndex: 'employeeNo',
      key: 'employeeNo',
      width: 120,
      fixed: 'left' as const,
    },
    {
      title: '员工姓名',
      dataIndex: ['employee', 'name'],
      key: 'employeeName',
      width: 120,
      fixed: 'left' as const,
    },
    {
      title: '排班日期',
      dataIndex: 'calcDate',
      key: 'calcDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '班次',
      dataIndex: 'shiftName',
      key: 'shiftName',
      width: 120,
    },
    {
      title: '出勤代码',
      dataIndex: 'calculationAttendanceCode', // ✅ 与精益工时保持一致
      key: 'calculationAttendanceCode',
      width: 150,
      render: (calculationAttendanceCode: any) => {
        if (!calculationAttendanceCode) {
          return <Tag color="default">未配置</Tag>;
        }
        return (
          <Tag color="green" style={{ fontSize: 12, padding: '2px 8px' }}>
            {calculationAttendanceCode.name}
          </Tag>
        );
      },
    },
    {
      title: '开始时间',
      dataIndex: 'punchInTime', // ✅ 与精益工时保持一致
      key: 'punchInTime',
      width: 150,
      render: (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '结束时间',
      dataIndex: 'punchOutTime', // ✅ 与精益工时保持一致
      key: 'punchOutTime',
      width: 150,
      render: (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '实际时长',
      dataIndex: 'actualHours', // ✅ 与精益工时保持一致
      key: 'actualHours',
      width: 100,
      render: (hours: number) => (
        <span style={{ fontWeight: 600, color: '#00B365' }}>
          {hours?.toFixed(2)} 小时
        </span>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number) => (
        <span style={{ fontWeight: 600, color: '#FA8C16' }}>
          {amount ? `¥${amount.toFixed(2)}` : '-'}
        </span>
      ),
    },
    {
      title: '劳动力账户',
      dataIndex: 'accountName',
      key: 'accountName',
      width: 200,
      render: (accountName: string) => {
        if (!accountName) return <Tag>-</Tag>;
        return <Tag color="purple">{accountName}</Tag>;
      },
    },
  ];

  // 根据当前选中的tab返回对应的列
  const getColumns = () => {
    switch (activeTab) {
      case 'attendance-punch':
        return attendancePunchColumns;
      case 'attendance-work-hour':
        return attendanceWorkHourColumns;
      case 'lean-punch':
        return leanPunchColumns;
      case 'lean-work-hour':
        return leanWorkHourColumns;
      default:
        return leanWorkHourColumns;
    }
  };

  const columns = getColumns();

  return (
    <ModernPageLayout
      title={
        activeTab === 'attendance-punch' || activeTab === 'lean-punch'
          ? '摆卡结果'
          : '工时结果'
      }
      description={
        activeTab === 'attendance-punch'
          ? '查看考勤摆卡结果，基于考勤打卡规则配对'
          : activeTab === 'attendance-work-hour'
          ? '查看考勤工时计算结果，基于考勤打卡数据计算'
          : activeTab === 'lean-punch'
          ? '查看精益摆卡结果，基于精益打卡规则配对'
          : '查看精益工时计算结果，包含实际工时、标准工时等详细信息'
      }
      breadcrumb={[
        { label: '计算管理', path: '/calculate' },
        { label: '结果查询', path: '/calculate/work-hour-results' },
      ]}
     stats={[
        {
          title:
            activeTab === 'attendance-punch' || activeTab === 'lean-punch' ? '摆卡结果数' :
            '工时结果数',
          value: results?.items?.length || 0,
          prefix: <CalculatorOutlined style={{ color: '#00B365' }} />,
          color: '#00B365',
        },
        ...(activeTab === 'lean-work-hour' ? [{
          title: '总工时',
          value: `${(results?.items?.reduce((sum: number, item: any) => sum + (item.actualHours || 0), 0) || 0).toFixed(2)} 小时`,
          color: '#10b981',
        }] : []),
        ...(activeTab === 'attendance-work-hour' ? [{
          title: '总工时',
          value: `${(results?.items?.reduce((sum: number, item: any) => sum + (item.actualHours || 0), 0) || 0).toFixed(2)} 小时`,
          color: '#10b981',
        }] : []),
        ...(includeAllocation && activeTab === 'lean-work-hour' ? [{
          title: '分摊源工时',
          value: results?.items?.filter((item: any) => item.isAllocationSource).length || 0,
          color: '#f59e0b',
        },
        {
          title: '分摊总工时',
          value: `${(results?.items?.reduce((sum: number, item: any) => sum + (item.totalAllocatedHours || 0), 0) || 0).toFixed(2)} 小时`,
          color: '#f59e0b',
        }] : []),
      ]}
    >
      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          marginBottom: 16,
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <div style={{ marginBottom: 24 }}>
          <DynamicSearchConditions
            pageCode={
              activeTab === 'attendance-punch' || activeTab === 'lean-punch' ? 'punch-results' :
              activeTab === 'attendance-work-hour' || activeTab === 'lean-work-hour' ? 'work-hour-results' :
              'work-hour-results'
            }
            onSearch={handleSearch}
            onReset={handleReset}
            loading={isLoading}
            form={searchForm}
            initialValues={dynamicFilters}
            fixedFilters={{ dateRange: selectedDateRange }}
            onFixedFilterChange={(key: string, value: any) => {
              if (key === 'dateRange' && value && value[0] && value[1]) {
                setSelectedDateRange({ start: value[0], end: value[1] });
              }
            }}
            extraActions={
              <Space>
                <Form.Item
                  label={
                    <Tooltip title="开启后会在结果中显示工时分摊的详细信息">
                      <span>显示分摊信息 <InfoCircleOutlined /></span>
                    </Tooltip>
                  }
                  style={{ marginBottom: 0 }}
                >
                  <Switch
                    checked={includeAllocation}
                    onChange={setIncludeAllocation}
                    checkedChildren="显示"
                    unCheckedChildren="隐藏"
                  />
                </Form.Item>
                <Button
                  type="primary"
                  icon={<CalculatorOutlined />}
                  onClick={handleCalculate}
                  loading={calculateMutation.isPending}
                  style={{
                    background: 'linear-gradient(135deg, #00B365 0%, rgba(255, 255, 255, 0.2) 100%)',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 500,
                  }}
                >
                  重新计算工时
                </Button>
                <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['calcResults'] })}>
                  刷新
                </Button>
              </Space>
            }
          />
        </div>
      </Card>

      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #e2e8f0',
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as ResultType)}
          items={[
            {
              key: 'attendance-punch',
              label: '考勤摆卡结果',
              children: null,
            },
            {
              key: 'attendance-work-hour',
              label: '考勤工时结果',
              children: null,
            },
            {
              key: 'lean-punch',
              label: '精益摆卡结果',
              children: null,
            },
            {
              key: 'lean-work-hour',
              label: '精益工时结果',
              children: null,
            },
          ]}
          style={{ marginBottom: 16 }}
        />
        <Table
          columns={columns}
          dataSource={results?.items || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1200 }}
          rowClassName={(record: any) => {
            if (!record.attendanceCode) {
              return 'warning-row';
            }
            // 标记间接工时行
            if (record.accountName?.includes('_间接工时')) {
              return 'indirect-hours-row';
            }
            return '';
          }}
        />
      </Card>

      {/* 说明区域 */}
      {includeAllocation && (
        <Card
          style={{
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            marginTop: 16,
          }}
          bodyStyle={{ padding: '16px 24px' }}
        >
          <Collapse
            ghost
            items={[
              {
                key: '1',
                label: (
                  <Space>
                    <InfoCircleOutlined style={{ color: '#00B365' }} />
                    <span style={{ fontWeight: 500 }}>工时分摊说明</span>
                  </Space>
                ),
                children: (
                  <div style={{ paddingLeft: 24 }}>
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 600, marginBottom: 8, color: '#f59e0b' }}>
                            什么是间接工时？
                          </div>
                          <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>
                            间接工时是指不直接参与生产活动的工时，如管理人员、辅助人员等。这些工时需要按照一定规则分摊到各产线上，以便准确计算产品成本。
                          </div>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 600, marginBottom: 8, color: '#f59e0b' }}>
                            工时分摊规则
                          </div>
                          <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>
                            系统支持按实际工时比例或按实际产量比例进行分摊。分摊后的工时会记录到对应的产线间接工时账户中，并在出勤代码后用 * 标记。
                          </div>
                        </div>
                      </Col>
                    </Row>
                    <div style={{ marginTop: 8, padding: 12, background: '#f0f9ff', borderRadius: 6 }}>
                      <Space size="large">
                        <div>
                          <Tag color="orange" style={{ marginRight: 8 }}>间接工时 *</Tag>
                          <span style={{ color: '#64748b', fontSize: 12 }}>表示该工时为分摊后的间接工时</span>
                        </div>
                        <div>
                          <Tag color="green" style={{ marginRight: 8 }}>已分摊</Tag>
                          <span style={{ color: '#64748b', fontSize: 12 }}>表示该工时已被分摊到产线</span>
                        </div>
                        <div>
                          <Tag color="purple">产线_间接工时</Tag>
                          <span style={{ color: '#64748b', fontSize: 12 }}>表示分摊到的产线账户</span>
                        </div>
                      </Space>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      <style>{`
        .indirect-hours-row {
          background-color: #fffbeb !important;
        }
        .indirect-hours-row:hover {
          background-color: #fef3c7 !important;
        }
      `}</style>
    </ModernPageLayout>
  );
};

export default WorkHourResultPage;
