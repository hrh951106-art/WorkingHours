import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Form,
  message,
  Space,
  Select,
  Tag,
  Modal,
  Alert,
  Switch,
  Tooltip,
  Collapse,
  Row,
  Col,
  Tabs,
  Dropdown,
} from 'antd';
import {
  PlayCircleOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CalculatorOutlined,
  InfoCircleOutlined,
  DownOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import DynamicSearchConditions from '@/components/common/DynamicSearchConditions';
import dayjs from 'dayjs';

const CalculateResultPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('attendance-punch');

  // 共同的查询条件状态
  const [dateRange, setDateRange] = useState<{
    start: dayjs.Dayjs;
    end: dayjs.Dayjs;
  }>({
    start: dayjs().startOf('month'),
    end: dayjs().endOf('month'),
  });
  const [dynamicFilters, setDynamicFilters] = useState<any>({});
  const [searchForm] = useState<any>(null);

  // 摆卡结果状态
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchDateRange, setBatchDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);

  // 工时结果状态
  const [includeAllocation, setIncludeAllocation] = useState(false);

  // 获取员工列表
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => request.get('/hr/employees').then((res: any) => res.items || []),
  });

  // 获取班次列表
  const { data: shifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => request.get('/shift/shifts').then((res: any) => res),
  });

  // 获取摆卡结果
  const { data: punchPairs, isLoading: punchLoading } = useQuery({
    queryKey: ['punchPairs', dateRange.start.format('YYYY-MM-DD'), dateRange.end.format('YYYY-MM-DD'), dynamicFilters],
    queryFn: () =>
      request
        .get('/punch/pairing/results', {
          params: {
            startDate: dateRange.start.format('YYYY-MM-DD'),
            endDate: dateRange.end.format('YYYY-MM-DD'),
            ...dynamicFilters,
            pageSize: 1000,
          },
        })
        .then((res: any) => res),
    enabled: activeTab === 'lean-punch',
  });

  // 获取考勤摆卡结果
  const { data: attendancePunchPairs, isLoading: attendancePunchLoading } = useQuery({
    queryKey: ['attendancePunchPairs', dateRange.start.format('YYYY-MM-DD'), dateRange.end.format('YYYY-MM-DD'), dynamicFilters],
    queryFn: () =>
      request
        .get('/punch/attendance-punch/results', {
          params: {
            startDate: dateRange.start.format('YYYY-MM-DD'),
            endDate: dateRange.end.format('YYYY-MM-DD'),
            ...dynamicFilters,
            pageSize: 1000,
          },
        })
        .then((res: any) => res),
    enabled: activeTab === 'attendance-punch',
  });

  // 获取工时计算结果
  const { data: workHourResults, isLoading: workHourLoading } = useQuery({
    queryKey: ['calcResults', dateRange.start.format('YYYY-MM-DD'), dateRange.end.format('YYYY-MM-DD'), dynamicFilters, includeAllocation],
    queryFn: () =>
      request
        .get('/calculate/results', {
          params: {
            startDate: dateRange.start.format('YYYY-MM-DD'),
            endDate: dateRange.end.format('YYYY-MM-DD'),
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
    queryKey: ['attendanceWorkHourResults', dateRange.start.format('YYYY-MM-DD'), dateRange.end.format('YYYY-MM-DD'), dynamicFilters],
    queryFn: () =>
      request
        .get('/calculate/work-hour-results', {
          params: {
            startDate: dateRange.start.format('YYYY-MM-DD'),
            endDate: dateRange.end.format('YYYY-MM-DD'),
            ...dynamicFilters,
            pageSize: 1000,
          },
        })
        .then((res: any) => res),
    enabled: activeTab === 'attendance-work-hour',
  });

  // 手动摆卡
  const manualPairingMutation = useMutation({
    mutationFn: (data: any) => request.post('/punch/pairing/batch', data),
    onSuccess: (result: any) => {
      message.success(`摆卡完成，成功${result.successCount}条`);
      if (result.errors && result.errors.length > 0) {
        message.warning(`失败${result.errorCount}条`);
      }
      queryClient.invalidateQueries({ queryKey: ['punchPairs'] });
    },
  });

  // 批量摆卡（不带自动消息提示，用于循环处理）
  const batchPairMutation = useMutation({
    mutationFn: (data: any) => request.post('/punch/pairing/batch', data),
  });

  // 手动触发工时计算
  const calculateMutation = useMutation({
    mutationFn: (data: any) => request.post('/calculate/calculate/batch', data),
    onSuccess: (res: any) => {
      message.success(`计算成功！${res.message}，成功${res.successCount}条，失败${res.failCount}条`);
      queryClient.invalidateQueries({ queryKey: ['calcResults'] });
    },
  });

  // 考勤摆卡批量计算
  const attendancePunchMutation = useMutation({
    mutationFn: (data: any) => request.post('/punch/attendance-punch/collect-batch', data),
    onSuccess: (res: any) => {
      message.success(`考勤摆卡完成！成功${res.successCount}条，失败${res.failCount}条`);
      queryClient.invalidateQueries({ queryKey: ['attendancePunchPairs'] });
    },
  });

  // 考勤工时批量计算
  const attendanceWorkHourMutation = useMutation({
    mutationFn: (data: any) => request.post('/calculate/attendance-work-hours/calculate-by-date-range', data),
    onSuccess: (res: any) => {
      message.success(`考勤工时计算完成！成功${res.succeeded}次，失败${res.failed}次`);
      queryClient.invalidateQueries({ queryKey: ['attendanceWorkHourResults'] });
    },
  });

  const handleManualPairing = () => {
    const data: any = {
      startDate: dateRange.start.format('YYYY-MM-DD'),
      endDate: dateRange.end.format('YYYY-MM-DD'),
    };

    if (dynamicFilters.employeeNo) {
      data.employeeNos = [dynamicFilters.employeeNo];
    }

    manualPairingMutation.mutate(data);
  };

  const handleBatchPairing = async () => {
    // 批量摆卡应该处理日期范围内的每一天
    const startDate = batchDateRange[0];
    const endDate = batchDateRange[1];
    const dates: string[] = [];

    // 生成日期范围内的所有日期
    let current = startDate;
    while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
      dates.push(current.format('YYYY-MM-DD'));
      current = current.add(1, 'day');
    }

    let successCount = 0;
    let errorCount = 0;

    // 显示加载提示
    const hideLoading = message.loading(`正在批量摆卡，共 ${dates.length} 天...`, 0);

    // 对每一天执行批量摆卡
    for (const date of dates) {
      try {
        const result: any = await batchPairMutation.mutateAsync({
          pairDate: date,
        });
        if (result.successCount) {
          successCount += result.successCount;
        }
        if (result.errorCount) {
          errorCount += result.errorCount;
        }
      } catch (error) {
        errorCount++;
        console.error(`批量摆卡失败: ${date}`, error);
      }
    }

    // 关闭加载提示
    hideLoading();

    setIsBatchModalOpen(false);
    if (successCount > 0) {
      message.success(`批量摆卡完成！共处理 ${dates.length} 天，成功 ${successCount} 条`);
      // 刷新精益摆卡结果页签
      queryClient.invalidateQueries({ queryKey: ['punchPairs'] });
    }
    if (errorCount > 0) {
      message.warning(`失败 ${errorCount} 条`);
    }
  };

  const handleCalculate = () => {
    calculateMutation.mutate({
      startDate: dateRange.start.format('YYYY-MM-DD'),
      endDate: dateRange.end.format('YYYY-MM-DD'),
      ...(dynamicFilters.employeeNo && { employeeNos: [dynamicFilters.employeeNo] }),
    });
  };

  const handleAttendancePunchCalculate = () => {
    const data: any = {
      startDate: dateRange.start.format('YYYY-MM-DD'),
      endDate: dateRange.end.format('YYYY-MM-DD'),
    };

    if (dynamicFilters.employeeNo) {
      data.employeeNos = [dynamicFilters.employeeNo];
    }

    attendancePunchMutation.mutate(data);
  };

  const handleAttendanceWorkHourCalculate = () => {
    const data: any = {
      startDate: dateRange.start.format('YYYY-MM-DD'),
      endDate: dateRange.end.format('YYYY-MM-DD'),
    };

    if (dynamicFilters.employeeNo) {
      data.employeeNos = [dynamicFilters.employeeNo];
    }

    attendanceWorkHourMutation.mutate(data);
  };

  const handleSearch = (values: any) => {
    setDynamicFilters(values);
    // 搜索时刷新所有页签的数据
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['punchPairs'] });
      queryClient.invalidateQueries({ queryKey: ['attendancePunchPairs'] });
      queryClient.invalidateQueries({ queryKey: ['calcResults'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceWorkHourResults'] });
    }, 0);
  };

  const handleReset = () => {
    setDynamicFilters({});
    // 重置时刷新所有页签的数据
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['punchPairs'] });
      queryClient.invalidateQueries({ queryKey: ['attendancePunchPairs'] });
      queryClient.invalidateQueries({ queryKey: ['calcResults'] });
      queryClient.invalidateQueries({ queryKey: ['attendanceWorkHourResults'] });
    }, 0);
  };

  // 刷新所有页签的数据
  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['punchPairs'] });
    queryClient.invalidateQueries({ queryKey: ['attendancePunchPairs'] });
    queryClient.invalidateQueries({ queryKey: ['calcResults'] });
    queryClient.invalidateQueries({ queryKey: ['attendanceWorkHourResults'] });
    message.success('已刷新所有数据');
  };

  // 摆卡结果列定义
  const punchColumns = [
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
      dataIndex: 'pairDate',
      key: 'pairDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '班次',
      dataIndex: 'shiftName',
      key: 'shiftName',
      width: 120,
      render: (name: string) => <Tag color="blue">{name}</Tag>,
    },
    {
      title: '签入时间',
      dataIndex: 'inPunchTime',
      key: 'inPunchTime',
      width: 160,
      render: (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '签入设备',
      dataIndex: ['inPunch', 'device', 'name'],
      key: 'inDevice',
      width: 120,
    },
    {
      title: '签出时间',
      dataIndex: 'outPunchTime',
      key: 'outPunchTime',
      width: 160,
      render: (time: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '签出设备',
      dataIndex: ['outPunch', 'device', 'name'],
      key: 'outDevice',
      width: 120,
    },
    {
      title: '刷卡归属',
      dataIndex: 'accountName',
      key: 'account',
      width: 300,
      render: (accountName: string) => {
        if (!accountName) return '-';
        // 直接显示API返回的accountName，不做任何处理
        return <Tag color="purple">{accountName}</Tag>;
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, record: any) => {
        const hasBoth = record.inPunchTime && record.outPunchTime;
        return hasBoth ? (
          <Tag color="success" icon={<ClockCircleOutlined />}>
            完整
          </Tag>
        ) : (
          <Tag color="warning">单卡</Tag>
        );
      },
    },
  ];

  // 工时结果列定义
  const workHourColumns = [
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
      dataIndex: 'calculationAttendanceCode',
      key: 'calculationAttendanceCode',
      width: 150,
      render: (calculationAttendanceCode: any, record: any) => {
        if (!calculationAttendanceCode) {
          return <Tag color="default">未配置</Tag>;
        }

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
      width: 400,
      render: (_: any, record: any) => {
        const accountName = record.laborAccount?.name || record.accountName || '-';
        const isIndirect = accountName.includes('_间接工时');

        return accountName !== '-' ? (
          <Tag color={isIndirect ? 'orange' : 'purple'}>{accountName}</Tag>
        ) : (
          <Tag>{accountName}</Tag>
        );
      },
    },
    {
      title: '劳动力账户code',
      dataIndex: 'accountPath',
      key: 'accountPath',
      width: 300,
      render: (_: any, record: any) => {
        const accountPath = record.laborAccount?.path || record.accountPath || '-';
        return accountPath !== '-' ? (
          <Tag color="cyan">{accountPath}</Tag>
        ) : (
          <Tag>-</Tag>
        );
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
    // {
    //   title: '班次',
    //   dataIndex: 'shiftName',
    //   key: 'shiftName',
    //   width: 120,
    // },
    {
      title: '出勤代码',
      dataIndex: 'calculationAttendanceCode',
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
      width: 400,
      render: (accountName: string) => {
        if (!accountName) return <Tag>-</Tag>;
        return <Tag color="purple" style={{ marginRight: '100px' }}>{accountName}</Tag>;
      },
    },
    {
      title: '劳动力账户code',
      dataIndex: 'accountPath',
      key: 'accountPath',
      width: 300,
      render: (accountPath: string) => {
        if (!accountPath) return <Tag>-</Tag>;
        // 显示完整的账户路径
        return <Tag color="cyan">{accountPath}</Tag>;
      },
    },
  ];

  return (
    <div>
      <Card
        title="计算结果"
        extra={
          <Space size="small">
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'batch-pair',
                    label: '批量摆卡',
                    icon: <PlayCircleOutlined />,
                    onClick: () => setIsBatchModalOpen(true),
                  },
                  {
                    key: 'manual-pair',
                    label: '手动摆卡',
                    icon: <PlayCircleOutlined />,
                    onClick: handleManualPairing,
                  },
                  {
                    type: 'divider',
                  },
                  {
                    key: 'calculate',
                    label: '重新计算工时',
                    icon: <CalculatorOutlined />,
                    onClick: handleCalculate,
                  },
                ],
              }}
            >
              <Button
                type="primary"
                icon={<CalculatorOutlined />}
                loading={manualPairingMutation.isPending || batchPairMutation.isPending || calculateMutation.isPending}
                style={{
                  background: 'linear-gradient(135deg, #00B365 0%, rgba(255, 255, 255, 0.2) 100%)',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 500,
                }}
              >
                计算精益工时数据 <DownOutlined />
              </Button>
            </Dropdown>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'attendance-punch-calculate',
                    label: '考勤摆卡计算',
                    icon: <PlayCircleOutlined />,
                    onClick: handleAttendancePunchCalculate,
                  },
                  {
                    key: 'attendance-work-hour-calculate',
                    label: '考勤工时计算',
                    icon: <CalculatorOutlined />,
                    onClick: handleAttendanceWorkHourCalculate,
                  },
                ],
              }}
            >
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={attendancePunchMutation.isPending || attendanceWorkHourMutation.isPending}
                style={{
                  background: 'linear-gradient(135deg, #1890ff 0%, rgba(255, 255, 255, 0.2) 100%)',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 500,
                }}
              >
                计算考勤数据 <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        }
      >
        <DynamicSearchConditions
          pageCode={
            activeTab === 'attendance-punch' || activeTab === 'lean-punch' ? 'punch-results' :
            activeTab === 'attendance-work-hour' || activeTab === 'lean-work-hour' ? 'work-hour-results' :
            'work-hour-results'
          }
          onSearch={handleSearch}
          onReset={handleReset}
          loading={
            activeTab === 'attendance-punch' ? attendancePunchLoading :
            activeTab === 'attendance-work-hour' ? attendanceWorkHourLoading :
            activeTab === 'lean-punch' ? punchLoading :
            activeTab === 'lean-work-hour' ? workHourLoading :
            false
          }
          form={searchForm}
          initialValues={dynamicFilters}
          fixedFilters={{ dateRange }}
          onFixedFilterChange={(key: string, value: any) => {
            if (key === 'dateRange' && value && value[0] && value[1]) {
              setDateRange({ start: value[0], end: value[1] });
              // 日期范围变化时刷新所有页签的数据
              setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['punchPairs'] });
                queryClient.invalidateQueries({ queryKey: ['attendancePunchPairs'] });
                queryClient.invalidateQueries({ queryKey: ['calcResults'] });
                queryClient.invalidateQueries({ queryKey: ['attendanceWorkHourResults'] });
              }, 0);
            }
          }}
        />
      </Card>

      <Card
        style={{
          marginTop: 16,
          borderRadius: 12,
          border: '1px solid #e2e8f0',
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefreshAll}
          >
            刷新数据
          </Button>
        </div>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'attendance-punch',
              label: '考勤摆卡结果',
              children: (
                <Table
                  columns={attendancePunchColumns}
                  dataSource={attendancePunchPairs?.items || []}
                  rowKey="id"
                  loading={attendancePunchLoading}
                  pagination={{
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条`,
                  }}
                  scroll={{ x: 1200 }}
                />
              ),
            },
            {
              key: 'attendance-work-hour',
              label: '考勤工时结果',
              children: (
                <Table
                  columns={attendanceWorkHourColumns}
                  dataSource={attendanceWorkHourResults?.items || []}
                  rowKey="id"
                  loading={attendanceWorkHourLoading}
                  pagination={{
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条`,
                  }}
                  scroll={{ x: 1700 }}
                />
              ),
            },
            {
              key: 'lean-punch',
              label: '精益摆卡结果',
              children: (
                <Table
                  columns={punchColumns}
                  dataSource={punchPairs?.items || []}
                  rowKey="id"
                  loading={punchLoading}
                  pagination={{
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条`,
                  }}
                  scroll={{ x: 1400 }}
                />
              ),
            },
            {
              key: 'lean-work-hour',
              label: '精益工时结果',
              children: (
                <>
                  <Table
                    columns={workHourColumns}
                    dataSource={workHourResults?.items || []}
                    rowKey="id"
                    loading={workHourLoading}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `共 ${total} 条`,
                    }}
                    scroll={{ x: 1500 }}
                    rowClassName={(record: any) => {
                      if (!record.attendanceCode) {
                        return 'warning-row';
                      }
                      if (record.accountName?.includes('_间接工时')) {
                        return 'indirect-hours-row';
                      }
                      return '';
                    }}
                  />
                  <style>{`
                    .indirect-hours-row {
                      background-color: #fffbeb !important;
                    }
                    .indirect-hours-row:hover {
                      background-color: #fef3c7 !important;
                    }
                  `}</style>
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* 批量摆卡弹窗 */}
      <Modal
        title="批量摆卡"
        open={isBatchModalOpen}
        onOk={handleBatchPairing}
        onCancel={() => setIsBatchModalOpen(false)}
        confirmLoading={batchPairMutation.isPending}
      >
        <Alert
          message="批量摆卡将对指定日期范围内的每一天执行摆卡计算"
          description={`将对 ${batchDateRange[0].format('YYYY-MM-DD')} 到 ${batchDateRange[1].format('YYYY-MM-DD')} 共 ${batchDateRange[1].diff(batchDateRange[0], 'day') + 1} 天进行批量摆卡。建议在非工作时间进行批量摆卡操作。`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form layout="vertical">
          <Form.Item label="日期范围">
            <Select
              value={`${batchDateRange[0].format('YYYY-MM-DD')} ~ ${batchDateRange[1].format('YYYY-MM-DD')}`}
              onChange={(value) => {
                if (value === 'current_month') {
                  setBatchDateRange([dayjs().startOf('month'), dayjs().endOf('month')]);
                } else if (value === 'last_month') {
                  setBatchDateRange([dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')]);
                } else if (value === 'current_week') {
                  setBatchDateRange([dayjs().startOf('week'), dayjs().endOf('week')]);
                }
              }}
              options={[
                { value: 'current_month', label: '本月' },
                { value: 'last_month', label: '上月' },
                { value: 'current_week', label: '本周' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CalculateResultPage;
