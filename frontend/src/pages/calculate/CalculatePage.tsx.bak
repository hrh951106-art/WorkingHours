import { useState } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Form,
  message,
  Space,
  Statistic,
  Row,
  Col,
  Select,
  Modal,
  Input,
  InputNumber,
  Tag,
  Descriptions,
  Alert,
  Popconfirm,
  DatePicker,
} from 'antd';
import {
  PlayCircleOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import dayjs from 'dayjs';

const CalculatePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('calculation');
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [selectedDateRange, setSelectedDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [isPunchRuleModalOpen, setIsPunchRuleModalOpen] = useState(false);
  const [isCalcRuleModalOpen, setIsCalcRuleModalOpen] = useState(false);
  const [editingPunchRule, setEditingPunchRule] = useState<any>(null);
  const [editingCalcRule, setEditingCalcRule] = useState<any>(null);
  const [punchRuleForm] = Form.useForm();
  const [calcRuleForm] = Form.useForm();
  const [selectedEmployee, setSelectedEmployee] = useState<string | undefined>();
  const queryClient = useQueryClient();

  // 获取员工列表
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => request.get('/hr/employees').then((res: any) => res.items || []),
  });

  // 获取计算结果
  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ['calcResults', selectedDate.format('YYYY-MM-DD')],
    queryFn: () =>
      request
        .get('/calculate/results', {
          params: {
            calcDate: selectedDate.format('YYYY-MM-DD'),
            pageSize: 100,
          },
        })
        .then((res: any) => res),
    enabled: activeTab === 'calculation',
  });

  // 获取打卡规则
  const { data: punchRules } = useQuery({
    queryKey: ['punchRules'],
    queryFn: () => request.get('/calculate/punch-rules').then((res: any) => res),
  });

  // 获取设备组（用于打卡规则配置）
  const { data: deviceGroups } = useQuery({
    queryKey: ['device-groups'],
    queryFn: () => request.get('/punch/device-groups').then((res: any) => res),
  });

  // 获取计算规则
  const { data: calcRules } = useQuery({
    queryKey: ['calcRules'],
    queryFn: () => request.get('/calculate/calc-rules').then((res: any) => res),
  });

  // 获取摆卡结果
  const { data: punchPairs, isLoading: pairsLoading } = useQuery({
    queryKey: ['punchPairs', selectedDate.format('YYYY-MM-DD')],
    queryFn: () =>
      request
        .get('/punch/pairing/results', {
          params: {
            pairDate: selectedDate.format('YYYY-MM-DD'),
            pageSize: 100,
          },
        })
        .then((res: any) => res),
    enabled: activeTab === 'pairingResults',
  });

  // 单人计算
  const calculateMutation = useMutation({
    mutationFn: (data: any) => request.post('/calculate/calculate', data),
    onSuccess: () => {
      message.success('计算完成');
      queryClient.invalidateQueries({ queryKey: ['calcResults'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '计算失败');
    },
  });

  // 批量计算
  const batchCalculateMutation = useMutation({
    mutationFn: (data: any) => request.post('/calculate/calculate/batch', data),
    onSuccess: (result: any) => {
      message.success(`批量计算完成，成功${result.successCount}条，共${result.totalCount}条`);
      queryClient.invalidateQueries({ queryKey: ['calcResults'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '批量计算失败');
    },
  });

  // 创建打卡规则
  const createPunchRuleMutation = useMutation({
    mutationFn: (data: any) => request.post('/calculate/punch-rules', data),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['punchRules'] });
      setIsPunchRuleModalOpen(false);
      punchRuleForm.resetFields();
    },
    onError: (error: any) => {
      console.error('创建打卡规则失败:', error);
      message.error(error?.response?.data?.message || '创建失败，请重试');
    },
  });

  // 更新打卡规则
  const updatePunchRuleMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => request.put(`/calculate/punch-rules/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['punchRules'] });
      setIsPunchRuleModalOpen(false);
      setEditingPunchRule(null);
      punchRuleForm.resetFields();
    },
    onError: (error: any) => {
      console.error('更新打卡规则失败:', error);
      message.error(error?.response?.data?.message || '更新失败，请重试');
    },
  });

  // 删除打卡规则
  const deletePunchRuleMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/calculate/punch-rules/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['punchRules'] });
    },
    onError: (error: any) => {
      console.error('删除打卡规则失败:', error);
      message.error(error?.response?.data?.message || '删除失败，请重试');
    },
  });

  // 创建计算规则
  const createCalcRuleMutation = useMutation({
    mutationFn: (data: any) => request.post('/calculate/calc-rules', data),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['calcRules'] });
      setIsCalcRuleModalOpen(false);
      calcRuleForm.resetFields();
    },
  });

  // 更新计算规则
  const updateCalcRuleMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => request.put(`/calculate/calc-rules/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['calcRules'] });
      setIsCalcRuleModalOpen(false);
      setEditingCalcRule(null);
      calcRuleForm.resetFields();
    },
  });

  // 删除计算规则
  const deleteCalcRuleMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/calculate/calc-rules/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['calcRules'] });
    },
  });

  // 手动摆卡
  const manualPairingMutation = useMutation({
    mutationFn: (data: any) => request.post('/punch/pairing/batch', data),
    onSuccess: (result: any) => {
      message.success(`摆卡完成，成功${result.successCount}条，共${result.totalCount || result.successCount}条`);
      queryClient.invalidateQueries({ queryKey: ['punchPairs'] });
    },
    onError: (error: any) => {
      console.error('摆卡失败:', error);
      message.error(error?.response?.data?.message || '摆卡失败，请重试');
    },
  });

  const handleManualPairing = () => {
    Modal.confirm({
      title: '手动摆卡',
      content: `确定要为 ${selectedDate.format('YYYY-MM-DD')} 执行手动摆卡吗？`,
      onOk: () => {
        manualPairingMutation.mutate({
          pairDate: selectedDate.format('YYYY-MM-DD'),
        });
      },
    });
  };

  const handleCalculate = () => {
    if (!selectedEmployee) {
      message.warning('请选择员工');
      return;
    }
    calculateMutation.mutate({
      calcDate: selectedDate.format('YYYY-MM-DD'),
      employeeNo: selectedEmployee,
    });
  };

  const handleBatchCalculate = () => {
    Modal.confirm({
      title: '批量计算',
      content: `确定要批量计算 ${selectedDateRange[0].format('YYYY-MM-DD')} 至 ${selectedDateRange[1].format('YYYY-MM-DD')} 的所有员工工时吗？`,
      onOk: () => {
        batchCalculateMutation.mutate({
          startDate: selectedDateRange[0].format('YYYY-MM-DD'),
          endDate: selectedDateRange[1].format('YYYY-MM-DD'),
        });
      },
    });
  };

  const handleAddPunchRule = () => {
    setEditingPunchRule(null);
    punchRuleForm.resetFields();
    // 设置默认值
    punchRuleForm.setFieldsValue({
      status: 'ACTIVE',
      priority: 1,
      beforeShiftMins: 0,
      afterShiftMins: 0,
      configs: [],
    });
    setIsPunchRuleModalOpen(true);
  };

  const handleEditPunchRule = (record: any) => {
    setEditingPunchRule(record);
    punchRuleForm.setFieldsValue({
      ...record,
      configs: JSON.parse(record.configs || '[]'),
    });
    setIsPunchRuleModalOpen(true);
  };

  const handleDeletePunchRule = (id: number) => {
    deletePunchRuleMutation.mutate(id);
  };

  const handlePunchRuleSubmit = () => {
    punchRuleForm.validateFields().then((values) => {
      console.log('提交的表单数据:', values);

      // 确保 configs 是数组且不为空
      if (!values.configs || values.configs.length === 0) {
        message.warning('请至少添加一套设备组配置');
        return;
      }

      // 验证每个配置都有必需的字段
      const validConfigs = values.configs.filter((config: any) => config.groupId !== undefined && config.groupId !== null);
      if (validConfigs.length === 0) {
        message.warning('请至少选择一个设备组');
        return;
      }

      const data = {
        ...values,
        configs: values.configs,
      };

      if (editingPunchRule) {
        updatePunchRuleMutation.mutate({ id: editingPunchRule.id, ...data });
      } else {
        createPunchRuleMutation.mutate(data);
      }
    }).catch((error) => {
      console.error('表单验证失败:', error);
      message.error('请检查表单填写是否完整');
    });
  };

  const handleAddCalcRule = () => {
    setEditingCalcRule(null);
    calcRuleForm.resetFields();
    setIsCalcRuleModalOpen(true);
  };

  const handleEditCalcRule = (record: any) => {
    setEditingCalcRule(record);
    calcRuleForm.setFieldsValue({
      ...record,
      conditions: JSON.parse(record.conditions || '{}'),
      calcLogic: JSON.parse(record.calcLogic || '{}'),
      overtimeRules: JSON.parse(record.overtimeRules || '{}'),
    });
    setIsCalcRuleModalOpen(true);
  };

  const handleDeleteCalcRule = (id: number) => {
    deleteCalcRuleMutation.mutate(id);
  };

  const handleCalcRuleSubmit = () => {
    calcRuleForm.validateFields().then((values) => {
      const data = {
        ...values,
        conditions: JSON.stringify(values.conditions || {}),
        calcLogic: JSON.stringify(values.calcLogic || {}),
        overtimeRules: JSON.stringify(values.overtimeRules || {}),
      };
      if (editingCalcRule) {
        updateCalcRuleMutation.mutate({ id: editingCalcRule.id, ...data });
      } else {
        createCalcRuleMutation.mutate(data);
      }
    });
  };

  const resultColumns = [
    { title: '员工号', dataIndex: 'employeeNo', key: 'employeeNo' },
    {
      title: '员工姓名',
      dataIndex: 'employee',
      key: 'employee',
      render: (employee: any) => employee?.name || '-',
    },
    {
      title: '计算日期',
      dataIndex: 'calcDate',
      key: 'calcDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    { title: '班次', dataIndex: 'shiftName', key: 'shiftName' },
    {
      title: '签到时间',
      dataIndex: 'punchInTime',
      key: 'punchInTime',
      render: (time: string) => (time ? dayjs(time).format('HH:mm') : '-'),
    },
    {
      title: '签退时间',
      dataIndex: 'punchOutTime',
      key: 'punchOutTime',
      render: (time: string) => (time ? dayjs(time).format('HH:mm') : '-'),
    },
    {
      title: '标准工时',
      dataIndex: 'standardHours',
      key: 'standardHours',
      render: (hours: number) => `${hours.toFixed(2)}h`,
    },
    {
      title: '实际工时',
      dataIndex: 'actualHours',
      key: 'actualHours',
      render: (hours: number) => `${hours.toFixed(2)}h`,
    },
    {
      title: '加班工时',
      dataIndex: 'overtimeHours',
      key: 'overtimeHours',
      render: (hours: number) => (
        <Tag color={hours > 0 ? 'orange' : 'default'}>{hours.toFixed(2)}h</Tag>
      ),
    },
    {
      title: '缺勤工时',
      dataIndex: 'absenceHours',
      key: 'absenceHours',
      render: (hours: number) => (
        <Tag color={hours > 0 ? 'red' : 'default'}>{hours.toFixed(2)}h</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          PENDING: { color: 'blue', text: '待审核' },
          APPROVED: { color: 'green', text: '已审核' },
          CORRECTED: { color: 'orange', text: '已修正' },
        };
        const s = statusMap[status] || { color: 'default', text: status };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
  ];

  const punchRuleColumns = [
    { title: '规则名称', dataIndex: 'name', key: 'name' },
    { title: '规则编码', dataIndex: 'code', key: 'code' },
    { title: '优先级', dataIndex: 'priority', key: 'priority' },
    {
      title: '班前/班后',
      key: 'range',
      render: (_: any, record: any) =>
        record.beforeShiftMins || record.afterShiftMins ? (
          <span>
            {record.beforeShiftMins > 0 && <Tag color="cyan">前{record.beforeShiftMins}分钟</Tag>}
            {record.afterShiftMins > 0 && <Tag color="purple">后{record.afterShiftMins}分钟</Tag>}
          </span>
        ) : (
          '-'
        ),
    },
    {
      title: '配置数量',
      dataIndex: 'configs',
      key: 'configs',
      render: (configs: string) => {
        try {
          const configArray = JSON.parse(configs || '[]');
          return <Tag color="blue">{configArray.length} 套配置</Tag>;
        } catch {
          return <Tag>0 套配置</Tag>;
        }
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>{status === 'ACTIVE' ? '激活' : '停用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditPunchRule(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个规则吗？"
            onConfirm={() => handleDeletePunchRule(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const calcRuleColumns = [
    { title: '规则名称', dataIndex: 'name', key: 'name' },
    { title: '规则编码', dataIndex: 'code', key: 'code' },
    { title: '优先级', dataIndex: 'priority', key: 'priority' },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>{status === 'ACTIVE' ? '激活' : '停用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEditCalcRule(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个规则吗？"
            onConfirm={() => handleDeleteCalcRule(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 摆卡结果表格列
  const pairColumns = [
    { title: '员工号', dataIndex: 'employeeNo', key: 'employeeNo' },
    {
      title: '员工姓名',
      dataIndex: 'employee',
      key: 'employee',
      render: (employee: any) => employee?.name || '-',
    },
    {
      title: '摆卡日期',
      dataIndex: 'pairDate',
      key: 'pairDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    { title: '班次', dataIndex: 'shiftName', key: 'shiftName' },
    {
      title: '子劳动力账户',
      dataIndex: 'account',
      key: 'account',
      render: (account: any) => (account ? <Tag color="blue">{account.namePath || account.name}</Tag> : '-'),
    },
    {
      title: '签入时间',
      dataIndex: 'inPunchTime',
      key: 'inPunchTime',
      render: (time: string) => (time ? dayjs(time).format('HH:mm:ss') : '-'),
    },
    {
      title: '签出时间',
      dataIndex: 'outPunchTime',
      key: 'outPunchTime',
      render: (time: string) => (time ? dayjs(time).format('HH:mm:ss') : '-'),
    },
  ];

  const tabItems = [
    {
      key: 'calculation',
      label: '工时计算',
      icon: <PlayCircleOutlined />,
      children: (
        <div>
          <Card title="执行计算" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form layout="inline">
                  <Form.Item label="计算日期">
                    <DatePicker
                      value={selectedDate}
                      onChange={(date) => setSelectedDate(date || dayjs())}
                      format="YYYY-MM-DD"
                    />
                  </Form.Item>
                  <Form.Item label="员工">
                    <Select
                      placeholder="请选择员工"
                      style={{ width: 200 }}
                      value={selectedEmployee}
                      onChange={setSelectedEmployee}
                      showSearch
                      optionFilterProp="children"
                    >
                      {employees?.map((emp: any) => (
                        <Select.Option key={emp.id} value={emp.employeeNo}>
                          {emp.name} ({emp.employeeNo})
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={handleCalculate}
                      loading={calculateMutation.isPending}
                    >
                      执行计算
                    </Button>
                  </Form.Item>
                </Form>
              </Col>
              <Col span={12}>
                <Form layout="inline">
                  <Form.Item label="日期范围">
                    <DatePicker.RangePicker
                      value={selectedDateRange}
                      onChange={(dates) => setSelectedDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
                      format="YYYY-MM-DD"
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={handleBatchCalculate}
                      loading={batchCalculateMutation.isPending}
                    >
                      批量计算
                    </Button>
                  </Form.Item>
                </Form>
              </Col>
            </Row>
          </Card>

          {results?.items && results.items.length > 0 && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="标准工时总计"
                    value={results.items.reduce((sum: number, r: any) => sum + r.standardHours, 0).toFixed(2)}
                    suffix="小时"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="实际工时总计"
                    value={results.items.reduce((sum: number, r: any) => sum + r.actualHours, 0).toFixed(2)}
                    suffix="小时"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="加班工时总计"
                    value={results.items.reduce((sum: number, r: any) => sum + r.overtimeHours, 0).toFixed(2)}
                    suffix="小时"
                    valueStyle={{ color: '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="缺勤工时总计"
                    value={results.items.reduce((sum: number, r: any) => sum + r.absenceHours, 0).toFixed(2)}
                    suffix="小时"
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
            </Row>
          )}

          <Card
            title="计算结果"
            extra={
              <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['calcResults'] })}>
                刷新
              </Button>
            }
          >
            <Table
              columns={resultColumns}
              dataSource={results?.items || []}
              rowKey="id"
              loading={resultsLoading}
              pagination={{
                total: results?.total || 0,
                pageSize: results?.pageSize || 10,
                current: results?.page || 1,
              }}
              expandable={{
                expandedRowRender: (record: any) => {
                  const accountHours = JSON.parse(record.accountHours || '[]');
                  const exceptions = JSON.parse(record.exceptions || '[]');

                  return (
                    <Descriptions bordered size="small" column={2}>
                      <Descriptions.Item label="账户工时分布" span={2}>
                        {accountHours.length > 0 ? (
                          <div>
                            {accountHours.map((ah: any, idx: number) => (
                              <Tag key={idx} color="blue">
                                {ah.accountName}: {ah.hours.toFixed(2)}h
                              </Tag>
                            ))}
                          </div>
                        ) : (
                          <span>无</span>
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="异常信息" span={2}>
                        {exceptions.length > 0 ? (
                          <div>
                            {exceptions.map((exc: any, idx: number) => (
                              <Tag key={idx} color={exc.level === 'ERROR' ? 'red' : exc.level === 'WARNING' ? 'orange' : 'blue'}>
                                {exc.message}
                              </Tag>
                            ))}
                          </div>
                        ) : (
                          <Tag color="green">无异常</Tag>
                        )}
                      </Descriptions.Item>
                    </Descriptions>
                  );
                },
              }}
            />
          </Card>
        </div>
      ),
    },
    {
      key: 'pairingResults',
      label: '摆卡结果',
      icon: <SettingOutlined />,
      children: (
        <Card
          title="摆卡结果"
          extra={
            <Space>
              <DatePicker
                value={selectedDate}
                onChange={(date) => {
                  setSelectedDate(date || dayjs());
                  queryClient.invalidateQueries({ queryKey: ['punchPairs'] });
                }}
                format="YYYY-MM-DD"
              />
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleManualPairing}
                loading={manualPairingMutation.isPending}
              >
                手动摆卡
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['punchPairs'] })}>
                刷新
              </Button>
            </Space>
          }
        >
          <Alert
            message="摆卡结果说明"
            description="摆卡结果根据打卡规则自动生成，子劳动力账户一致的签入/签出卡成为一对。只有签入或只有签出的卡也会创建单卡摆卡记录。点击「手动摆卡」按钮可以重新执行摆卡计算。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Table
            columns={pairColumns}
            dataSource={punchPairs?.items || []}
            rowKey="id"
            loading={pairsLoading}
            pagination={{
              total: punchPairs?.total || 0,
              pageSize: punchPairs?.pageSize || 10,
              current: punchPairs?.page || 1,
            }}
            expandable={{
              expandedRowRender: (record: any) => {
                return (
                  <Descriptions bordered size="small" column={2}>
                    <Descriptions.Item label="签入设备">{record.inPunch?.device?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="签出设备">{record.outPunch?.device?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="签入账户">{record.inPunch?.account?.namePath || '-'}</Descriptions.Item>
                    <Descriptions.Item label="签出账户">{record.outPunch?.account?.namePath || '-'}</Descriptions.Item>
                  </Descriptions>
                );
              },
            }}
          />
        </Card>
      ),
    },
    {
      key: 'punchRules',
      label: '打卡规则',
      icon: <SettingOutlined />,
      children: (
        <Card
          title="打卡规则配置"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddPunchRule}>
              新增规则
            </Button>
          }
        >
          <Alert
            message="打卡规则说明"
            description="打卡规则用于配置收卡范围和设备组的摆卡间隔。可以配置多套设备组和摆卡间隔，系统会按优先级顺序应用。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Table
            columns={punchRuleColumns}
            dataSource={punchRules || []}
            rowKey="id"
            pagination={false}
          />
        </Card>
      ),
    },
    {
      key: 'calcRules',
      label: '计算规则',
      icon: <SettingOutlined />,
      children: (
        <Card
          title="计算规则配置"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddCalcRule}>
              新增规则
            </Button>
          }
        >
          <Alert
            message="计算规则说明"
            description="计算规则用于定义加班工时、缺勤工时等的计算方式，可以设置不同的计算条件和计算逻辑。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Table
            columns={calcRuleColumns}
            dataSource={calcRules || []}
            rowKey="id"
            pagination={false}
          />
        </Card>
      ),
    },
  ];

  return (
    <div>
      <Tabs activeKey={activeTab} items={tabItems} onChange={setActiveTab} />

      {/* 打卡规则弹窗 */}
      <Modal
        title={editingPunchRule ? '编辑打卡规则' : '新增打卡规则'}
        open={isPunchRuleModalOpen}
        onOk={handlePunchRuleSubmit}
        onCancel={() => {
          setIsPunchRuleModalOpen(false);
          setEditingPunchRule(null);
          punchRuleForm.resetFields();
        }}
        width={700}
        styles={{
          body: { maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }
        }}
        okButtonProps={{ loading: createPunchRuleMutation.isPending || updatePunchRuleMutation.isPending }}
      >
        <Form form={punchRuleForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="规则名称"
                rules={[{ required: true, message: '请输入规则名称' }]}
              >
                <Input placeholder="请输入规则名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="code"
                label="规则编码"
                rules={[{ required: true, message: '请输入规则编码' }]}
              >
                <Input placeholder="请输入规则编码" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="优先级"
                rules={[{ required: true, message: '请输入优先级' }]}
                initialValue={1}
              >
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
                initialValue="ACTIVE"
              >
                <Select>
                  <Select.Option value="ACTIVE">激活</Select.Option>
                  <Select.Option value="INACTIVE">停用</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="beforeShiftMins"
                label="班前收卡范围（分钟）"
                extra="班前多少分钟内的打卡有效"
                initialValue={0}
              >
                <InputNumber min={0} max={480} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="afterShiftMins"
                label="班后收卡范围（分钟）"
                extra="班后多少分钟内的打卡有效"
                initialValue={0}
              >
                <InputNumber min={0} max={480} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.List name="configs">
            {(fields, { add, remove }) => (
              <>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>设备组与摆卡间隔配置</div>
                {fields.map((field, index) => (
                  <div
                    key={field.key}
                    style={{
                      marginBottom: 12,
                      padding: '12px',
                      background: '#fafafa',
                      borderRadius: 6,
                      border: '1px solid #f0f0f0',
                    }}
                  >
                    <Row gutter={12} align="middle">
                      <Col span={2}>
                        <Tag color="blue">{index + 1}</Tag>
                      </Col>
                      <Col span={10}>
                        <Form.Item
                          {...field}
                          name={[field.name, 'groupId']}
                          label="设备组"
                          rules={[{ required: true, message: '请选择设备组' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <Select placeholder="请选择设备组" allowClear>
                            {(deviceGroups || []).map((group: any) => (
                              <Select.Option key={group.id} value={group.id}>
                                {group.name}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={10}>
                        <Form.Item
                          {...field}
                          name={[field.name, 'pairingInterval']}
                          label="摆卡间隔（分钟）"
                          tooltip="0表示不限制间隔，直接按顺序配对"
                          initialValue={0}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber min={0} max={1440} style={{ width: '100%' }} placeholder="0" />
                        </Form.Item>
                      </Col>
                      <Col span={2}>
                        <Button
                          type="link"
                          danger
                          size="small"
                          onClick={() => remove(field.name)}
                          style={{ padding: 0 }}
                        >
                          删除
                        </Button>
                      </Col>
                    </Row>
                  </div>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ marginTop: 8 }}>
                  添加配置
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* 计算规则弹窗 */}
      <Modal
        title={editingCalcRule ? '编辑计算规则' : '新增计算规则'}
        open={isCalcRuleModalOpen}
        onOk={handleCalcRuleSubmit}
        onCancel={() => {
          setIsCalcRuleModalOpen(false);
          setEditingCalcRule(null);
          calcRuleForm.resetFields();
        }}
        width={800}
        okButtonProps={{ loading: createCalcRuleMutation.isPending || updateCalcRuleMutation.isPending }}
      >
        <Form form={calcRuleForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="规则名称"
                rules={[{ required: true, message: '请输入规则名称' }]}
              >
                <Input placeholder="请输入规则名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="code"
                label="规则编码"
                rules={[{ required: true, message: '请输入规则编码' }]}
              >
                <Input placeholder="请输入规则编码" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="优先级"
                rules={[{ required: true, message: '请输入优先级' }]}
                initialValue={1}
              >
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
                initialValue="ACTIVE"
              >
                <Select>
                  <Select.Option value="ACTIVE">激活</Select.Option>
                  <Select.Option value="INACTIVE">停用</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="conditions" label="触发条件">
            <Input.TextArea placeholder="请输入触发条件(JSON格式)" rows={3} />
          </Form.Item>

          <Form.Item name="calcLogic" label="计算逻辑">
            <Input.TextArea placeholder="请输入计算逻辑(JSON格式)" rows={3} />
          </Form.Item>

          <Form.Item name="overtimeRules" label="加班规则">
            <Input.TextArea placeholder="请输入加班规则(JSON格式)" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CalculatePage;
