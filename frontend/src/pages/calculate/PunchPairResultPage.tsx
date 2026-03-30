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
  DatePicker,
} from 'antd';
import {
  PlayCircleOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import { ModernPageLayout } from '@/components/common/ModernPageLayout';
import DynamicSearchConditions from '@/components/common/DynamicSearchConditions';
import dayjs from 'dayjs';

const PunchPairResultPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [dateRange, setDateRange] = useState<{
    start: dayjs.Dayjs;
    end: dayjs.Dayjs;
  }>({
    start: dayjs().startOf('month'),
    end: dayjs().endOf('month'),
  });
  const [dynamicFilters, setDynamicFilters] = useState<any>({});
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [searchForm] = useState<any>(null);
  const [batchDateRange, setBatchDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);

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
  const { data: punchPairs, isLoading } = useQuery({
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

  const handleSearch = (values: any) => {
    setDynamicFilters(values);
  };

  const handleReset = () => {
    setDynamicFilters({});
  };

  const handleBatchPairing = () => {
    const data: any = {
      pairDate: batchDateRange[0].format('YYYY-MM-DD'),
    };

    manualPairingMutation.mutate(data, {
      onSuccess: () => {
        setIsBatchModalOpen(false);
      },
    });
  };

  const columns = [
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
      title: '子劳动力账户',
      dataIndex: ['account', 'namePath'],
      key: 'account',
      width: 200,
      render: (namePath: string) => {
        if (!namePath) return '-';
        // 清理多余的斜杠
        const cleaned = namePath.replace(/\/+/g, '/').replace(/\/$/, '');
        return <Tag color="purple">{cleaned}</Tag>;
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

  return (
    <ModernPageLayout
      title="摆卡结果"
      description="摆卡结果根据打卡规则自动生成，显示员工的签入签出配对信息。点击「手动摆卡」按钮可以重新执行摆卡计算"
      breadcrumb={[
        { label: '计算管理', path: '/calculate' },
        { label: '摆卡结果', path: '/calculate/pairing-results' },
      ]}
      extra={
        <Space>
          <Button
            icon={<PlayCircleOutlined />}
            onClick={() => setIsBatchModalOpen(true)}
          >
            批量摆卡
          </Button>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleManualPairing}
            loading={manualPairingMutation.isPending}
            style={{
              background: 'linear-gradient(135deg, #22B970 0%, rgba(255, 255, 255, 0.2) 100%)',
              border: 'none',
              borderRadius: 8,
              fontWeight: 500,
            }}
          >
            手动摆卡
          </Button>
        </Space>
      }
      stats={[
        {
          title: '摆卡结果数',
          value: punchPairs?.items?.length || 0,
          prefix: <ClockCircleOutlined style={{ color: '#22B970' }} />,
          color: '#22B970',
        },
        {
          title: '完整配对',
          value: punchPairs?.items?.filter((p: any) => p.inPunchTime && p.outPunchTime).length || 0,
          color: '#10b981',
        },
        {
          title: '单卡',
          value: punchPairs?.items?.filter((p: any) => !p.inPunchTime || !p.outPunchTime).length || 0,
          color: '#f59e0b',
        },
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
            pageCode="pair-results"
            onSearch={handleSearch}
            onReset={handleReset}
            loading={isLoading}
            form={searchForm}
            initialValues={dynamicFilters}
            fixedFilters={{ dateRange }}
            onFixedFilterChange={(key: string, value: any) => {
              if (key === 'dateRange' && value && value[0] && value[1]) {
                setDateRange({ start: value[0], end: value[1] });
              }
            }}
          />
        </div>

        <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['punchPairs'] })}>
          刷新
        </Button>
      </Card>

      <Card
        style={{
          borderRadius: 12,
          border: '1px solid #e2e8f0',
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <Table
          columns={columns}
          dataSource={punchPairs?.items || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      <Modal
        title="批量摆卡"
        open={isBatchModalOpen}
        onOk={handleBatchPairing}
        onCancel={() => setIsBatchModalOpen(false)}
        confirmLoading={manualPairingMutation.isPending}
      >
        <Alert
          message="批量摆卡将对指定日期范围内的所有员工重新执行摆卡计算"
          description="建议在非工作时间进行批量摆卡操作"
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
    </ModernPageLayout>
  );
};

export default PunchPairResultPage;
