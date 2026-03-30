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

const WorkHourResultPage: React.FC = () => {
  const queryClient = useQueryClient();
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

  // 获取工时计算结果
  const { data: results, isLoading } = useQuery({
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
  });

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
      dataIndex: 'attendanceCode',
      key: 'attendanceCode',
      width: 150,
      render: (attendanceCode: any, record: any) => {
        if (!attendanceCode) {
          return <Tag color="default">未配置</Tag>;
        }

        // 检查是否为间接工时（分摊后的工时）
        const isIndirect = record.accountName?.includes('_间接工时') ||
                          attendanceCode.name?.includes('间接');

        return (
          <Tag
            color={isIndirect ? 'orange' : 'blue'}
            style={{ fontSize: 12, padding: '2px 8px' }}
          >
            {attendanceCode.name}
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
        <span style={{ fontWeight: 600, color: '#22B970' }}>
          {hours.toFixed(2)} 小时
        </span>
      ),
    },
    {
      title: '劳动力账户',
      dataIndex: 'accountName',
      key: 'accountName',
      width: 200,
      render: (_: any, record: any) => {
        // 尝试从不同的字段获取账户信息
        const accountName = record.laborAccount?.name || record.accountName || '-';
        const isIndirect = accountName.includes('_间接工时');

        return accountName !== '-' ? (
          <Tag color={isIndirect ? 'orange' : 'purple'}>{accountName}</Tag>
        ) : (
          <Tag>{accountName}</Tag>
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

  return (
    <ModernPageLayout
      title="工时结果"
      description="查看工时计算结果，包含实际工时、标准工时等详细信息"
      breadcrumb={[
        { label: '计算管理', path: '/calculate' },
        { label: '工时结果', path: '/calculate/work-hour-results' },
      ]}
      stats={[
        {
          title: '计算结果数',
          value: results?.items?.length || 0,
          prefix: <CalculatorOutlined style={{ color: '#22B970' }} />,
          color: '#22B970',
        },
        {
          title: '总工时',
          value: `${(results?.items?.reduce((sum: number, item: any) => sum + (item.actualHours || 0), 0) || 0).toFixed(2)} 小时`,
          color: '#10b981',
        },
        ...(includeAllocation ? [{
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
            pageCode="work-hour-results"
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
                    background: 'linear-gradient(135deg, #22B970 0%, rgba(255, 255, 255, 0.2) 100%)',
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
                    <InfoCircleOutlined style={{ color: '#22B970' }} />
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
