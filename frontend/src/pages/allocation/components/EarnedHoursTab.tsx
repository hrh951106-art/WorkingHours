import { useState, useEffect, useRef } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, message, Popconfirm, Tag, Row, Col, Select, DatePicker, Steps, Divider, Alert, Empty } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LeftOutlined, RightOutlined, CheckCircleOutlined, StopOutlined, CalculatorOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import dayjs from 'dayjs';
import { EmployeeFieldFilter, WorkHoursFilter } from './index';

const { TextArea } = Input;

interface EarnedHourConfig {
  id: number;
  configCode: string;
  configName: string;
  orgId: number;
  status: string;
  effectiveStartTime: string;
  effectiveEndTime: string | null;
  description: string;
  sourceConfig?: any;
  rules?: any[];
  _count?: {
    rules: number;
    results: number;
  };
}

const EarnedHoursTab: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCalcModalVisible, setIsCalcModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EarnedHourConfig | null>(null);
  const [calcConfig, setCalcConfig] = useState<EarnedHourConfig | null>(null);
  const [form] = Form.useForm();
  const [calcForm] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取出勤代码列表
  const { data: attendanceCodes } = useQuery({
    queryKey: ['attendanceCodesForAllocation'],
    queryFn: () =>
      request.get('/allocation/attendance-codes').then((res: any) => res),
  });

  // 获取配置列表
  const { data: configsData, isLoading } = useQuery({
    queryKey: ['earnedHourConfigs', page, pageSize, keyword, status],
    queryFn: () =>
      request.get('/earned-hours-allocation/configs', {
        params: { page, pageSize, keyword, status },
      }).then((res: any) => res),
  });

  // 创建配置
  const createMutation = useMutation({
    mutationFn: (data: any) => {
      return request.post('/earned-hours-allocation/configs', data);
    },
    onSuccess: () => {
      message.success('创建成功');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['earnedHourConfigs'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '创建失败');
    },
  });

  // 更新配置
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      request.put(`/earned-hours-allocation/configs/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      setIsModalVisible(false);
      setEditingConfig(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['earnedHourConfigs'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '更新失败');
    },
  });

  // 删除配置
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      request.delete(`/earned-hours-allocation/configs/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['earnedHourConfigs'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '删除失败');
    },
  });

  // 启用配置
  const activateMutation = useMutation({
    mutationFn: (id: number) =>
      request.post(`/earned-hours-allocation/configs/${id}/activate`, {
        approvedById: 1,
        approvedByName: 'Admin',
      }),
    onSuccess: () => {
      message.success('启用成功');
      queryClient.invalidateQueries({ queryKey: ['earnedHourConfigs'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '启用失败');
    },
  });

  // 停用配置
  const deactivateMutation = useMutation({
    mutationFn: (id: number) =>
      request.post(`/earned-hours-allocation/configs/${id}/deactivate`, {
        deactivatedById: 1,
        deactivatedByName: 'Admin',
      }),
    onSuccess: () => {
      message.success('停用成功');
      queryClient.invalidateQueries({ queryKey: ['earnedHourConfigs'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '停用失败');
    },
  });

  // 新增按钮
  const handleAdd = () => {
    setEditingConfig(null);
    form.resetFields();
    form.setFieldsValue({
      sourceConfig: {
        filterGroups: [
          {
            id: 'default_group',
            employeeFilter: { fieldGroups: [] },
            workHoursFilter: { hierarchySelections: [], attendanceCodes: [] },
          },
        ],
      },
      rules: [],
    });
    setIsModalVisible(true);
  };

  // 编辑按钮
  const handleEdit = async (record: EarnedHourConfig) => {
    setEditingConfig(record);

    // 重新获取完整的配置详情
    try {
      const fullConfig = await request.get(`/earned-hours-allocation/configs/${record.id}`);

      console.log('后端返回的完整配置:', fullConfig);
      console.log('后端返回的sourceConfig:', fullConfig.sourceConfig);
      console.log('后端返回的rules:', fullConfig.rules);

      // 后端已经转换了数据结构，直接使用即可
      // sourceConfig 已经包含 filterGroups 结构
      const formData = {
        configCode: fullConfig.configCode,
        configName: fullConfig.configName,
        description: fullConfig.description,
        sourceConfig: fullConfig.sourceConfig || {
          filterGroups: [
            {
              id: 'default_group',
              employeeFilter: { fieldGroups: [] },
              workHoursFilter: { hierarchySelections: [], attendanceCodes: [] },
            },
          ],
        },
        rules: fullConfig.rules || [],
      };

      console.log('设置到表单的数据:', formData);

      // 设置所有表单字段
      form.setFieldsValue(formData);

      setIsModalVisible(true);
    } catch (error) {
      console.error('获取配置详情失败:', error);
      message.error('获取配置详情失败');
    }
  };

  // 删除按钮
  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除此配置吗？删除后将无法恢复。',
      icon: null,
      centered: true,
      okText: '确定',
      cancelText: '取消',
      className: 'deactivate-modal',
      onOk: () => {
        return deleteMutation.mutateAsync(id);
      },
    });
  };

  // 启用按钮
  const handleActivate = (id: number) => {
    Modal.confirm({
      title: '确认启用',
      content: '确定要启用这条配置吗？启用后将无法修改。',
      icon: null,
      centered: true,
      okText: '确定',
      cancelText: '取消',
      className: 'deactivate-modal',
      onOk: () => {
        activateMutation.mutate(id);
      },
    });
  };

  // 停用按钮
  const handleDeactivate = (id: number) => {
    Modal.confirm({
      title: '确认停用',
      content: '确定要停用这条配置吗？停用后将不再执行该分配规则。',
      icon: null,
      centered: true,
      okText: '确定',
      cancelText: '取消',
      className: 'deactivate-modal',
      onOk: () => {
        deactivateMutation.mutate(id);
      },
    });
  };

  const handleOpenCalcModal = (config: EarnedHourConfig) => {
    setCalcConfig(config);
    calcForm.setFieldsValue({
      dateRange: [dayjs().subtract(7, 'day'), dayjs()],
    });
    setIsCalcModalVisible(true);
  };

  // 计算mutation
  const calculateMutation = useMutation({
    mutationFn: (data: any) => {
      return request.post('/earned-hours-allocation/calculate', data);
    },
    onSuccess: () => {
      message.success('挣得工时分摊计算完成');
      setIsCalcModalVisible(false);
      setCalcConfig(null);
      calcForm.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '计算失败');
    },
  });

  const handleCalcSubmit = async () => {
    try {
      const values = await calcForm.validateFields();

      const data = {
        configId: calcConfig?.id,
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

  const handleCalcCancel = () => {
    setIsCalcModalVisible(false);
    setCalcConfig(null);
    calcForm.resetFields();
  };

  const columns = [
    {
      title: '规则代码',
      dataIndex: 'configCode',
      key: 'configCode',
      width: 150,
    },
    {
      title: '规则名称',
      dataIndex: 'configName',
      key: 'configName',
      width: 200,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          'DRAFT': { text: '草稿', color: 'default' },
          'ACTIVE': { text: '生效', color: 'green' },
          'INACTIVE': { text: '失效', color: 'red' },
        };
        const statusInfo = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: '规则数',
      key: 'ruleCount',
      width: 80,
      render: (_: any, record: EarnedHourConfig) => record._count?.rules || 0,
    },
    {
      title: '操作',
      key: 'action',
      width: 300,
      fixed: 'right' as const,
      render: (_: any, record: EarnedHourConfig) => (
        <Space size={8} split={<div style={{ width: '1px', height: '12px', background: 'var(--color-border-1)' }} />}>
          {record.status === 'DRAFT' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                style={{ padding: '0 4px' }}
              >
                编辑
              </Button>
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleActivate(record.id)}
                style={{ padding: '0 4px', color: '#52c41a' }}
              >
                启用
              </Button>

              <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} style={{ padding: '0 4px' }}>
                删除
              </Button>
            </>
          )}

          {record.status === 'ACTIVE' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                style={{ padding: '0 4px' }}
              >
                编辑
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<StopOutlined />}
                onClick={() => handleDeactivate(record.id)}
                style={{ padding: '0 4px' }}
              >
                停用
              </Button>
              <Button
                type="link"
                size="small"
                icon={<CalculatorOutlined />}
                onClick={() => handleOpenCalcModal(record)}
                style={{ padding: '0 4px', color: '#1890ff' }}
              >
                计算
              </Button>
            </>
          )}

          {record.status === 'INACTIVE' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                style={{ padding: '0 4px' }}
              >
                编辑
              </Button>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} style={{ padding: '0 4px' }}>
                删除
              </Button>
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleActivate(record.id)}
                style={{ padding: '0 4px', color: '#52c41a' }}
              >
                启用
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space size={8} wrap>
          <Input.Search
            placeholder="搜索规则代码、名称"
            allowClear
            style={{ width: 240 }}
            onSearch={(value) => setKeyword(value)}
            onChange={(e) => !e.target.value && setKeyword('')}
          />
          <Select
            placeholder="选择状态"
            allowClear
            style={{ width: 120 }}
            value={status}
            onChange={setStatus}
          >
            <Select.Option value="DRAFT">草稿</Select.Option>
            <Select.Option value="ACTIVE">生效</Select.Option>
            <Select.Option value="INACTIVE">失效</Select.Option>
          </Select>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={configsData?.list || configsData?.items || []}
        loading={isLoading}
        rowKey="id"
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize,
          total: configsData?.total || 0,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (newPage, newPageSize) => {
            setPage(newPage);
            setPageSize(newPageSize || 10);
          },
        }}
      />

      {/* 新增/编辑弹窗 - 向导式 */}
      <Modal
        title={editingConfig ? '编辑' : '新增'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingConfig(null);
          form.resetFields();
        }}
        width={1000}
        centered
        styles={{
          body: {
            height: 'calc(100vh - 120px)',
            display: 'flex',
            flexDirection: 'column',
            padding: '0 !important',
            overflowY: 'hidden'
          },
          content: {
            borderRadius: '4px'
          }
        }}
        destroyOnClose
        footer={null}
      >
        <EarnedHoursWizardForm
          form={form}
          editingConfig={editingConfig}
          attendanceCodes={attendanceCodes || []}
          onSubmit={async () => {
            try {
              const values = form.getFieldsValue(true);

              console.log('=== 表单提交时的完整数据 ===');
              console.log('values:', JSON.stringify(values, null, 2));
              console.log('sourceConfig:', JSON.stringify(values.sourceConfig, null, 2));
              console.log('filterGroups:', JSON.stringify(values.sourceConfig?.filterGroups, null, 2));

              // 获取当前用户信息
              const userStr = localStorage.getItem('user');
              const user = userStr ? JSON.parse(userStr) : null;

              // 转换sourceConfig为后端期望的格式
              let transformedSourceConfig = null;
              if (values.sourceConfig && values.sourceConfig.filterGroups) {
                // 直接提取第一个条件组的 employeeFilter.fieldGroups
                // 不需要外层包装，因为后端期望的是：{ fieldGroups: [...] }
                const firstGroup = values.sourceConfig.filterGroups[0];
                const employeeFieldGroups = firstGroup?.employeeFilter?.fieldGroups || [];

                console.log('提取的 employeeFieldGroups:', JSON.stringify(employeeFieldGroups, null, 2));

                const allAttendanceCodes: string[] = [];
                values.sourceConfig.filterGroups.forEach((fg: any) => {
                  if (fg.workHoursFilter?.attendanceCodes && fg.workHoursFilter.attendanceCodes.length > 0) {
                    allAttendanceCodes.push(...fg.workHoursFilter.attendanceCodes);
                  }
                });

                const allHierarchySelections: any[] = [];
                values.sourceConfig.filterGroups.forEach((fg: any) => {
                  if (fg.workHoursFilter?.hierarchySelections && fg.workHoursFilter.hierarchySelections.length > 0) {
                    allHierarchySelections.push(...fg.workHoursFilter.hierarchySelections);
                  }
                });

                transformedSourceConfig = {
                  sourceType: 'EMPLOYEE_HOURS',
                  employeeFilter: {
                    fieldGroups: employeeFieldGroups,  // 直接使用fieldGroups数组
                  },
                  accountFilter: {
                    hierarchySelections: allHierarchySelections,
                  },
                  attendanceCodes: allAttendanceCodes,
                  description: values.description || '',
                };

                console.log('转换后的 transformedSourceConfig:', JSON.stringify(transformedSourceConfig, null, 2));
              }

              // 清理rules数组中的isNew标志（仅用于UI逻辑，不发送到后端）
              const cleanedRules = (values.rules || []).map((rule: any) => {
                const { isNew, ...ruleData } = rule;
                return ruleData;
              });

              const data = {
                configCode: values.configCode,
                configName: values.configName,
                description: values.description || '',
                orgId: user?.orgId || 1,
                orgName: user?.orgName || '默认组织',
                orgPath: user?.orgPath || '/',
                effectiveStartTime: dayjs().format('YYYY-MM-DD'),
                effectiveEndTime: null,
                sourceConfig: transformedSourceConfig,
                rules: cleanedRules,
                createdById: 1,
                createdByName: 'Admin',
              };

              console.log('=== 准备发送到后端的数据 ===');
              console.log('data:', JSON.stringify(data, null, 2));

              if (editingConfig) {
                updateMutation.mutate({
                  id: editingConfig.id,
                  data: {
                    ...data,
                    updatedById: 1,
                    updatedByName: 'Admin',
                  },
                });
              } else {
                createMutation.mutate(data);
              }
            } catch (error) {
              console.error('表单提交失败:', error);
              message.error('请检查表单填写是否完整');
            }
          }}
          onCancel={() => {
            setIsModalVisible(false);
            setEditingConfig(null);
            form.resetFields();
          }}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>

      {/* 计算周期弹窗 */}
      <Modal
        title="分配计算"
        open={isCalcModalVisible}
        onCancel={handleCalcCancel}
        width={500}
        centered
        footer={null}
        styles={{
          body: {
            padding: '24px 12px'
          }
        }}
      >
        <Form form={calcForm} layout="vertical">
          <Form.Item
            label="规则名称"
          >
            <Input value={calcConfig?.configName} disabled />
          </Form.Item>
          <Form.Item
            label="计算周期"
            name="dateRange"
            rules={[{ required: true, message: '请选择计算周期' }]}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
        <div style={{ height: '64px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center', flexShrink: 0, padding: '0 20px', margin: '24px -12px -12px -12px', width: 'calc(100% + 24px)' }}>
          <Button onClick={handleCalcCancel}>取消</Button>
          <Button type="primary" onClick={handleCalcSubmit} loading={calculateMutation.isPending}>确定</Button>
        </div>
      </Modal>
    </>
  );
};

// 向导式表单组件
interface EarnedHoursWizardFormProps {
  form: any;
  editingConfig: EarnedHourConfig | null;
  attendanceCodes: any[];
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const EarnedHoursWizardForm: React.FC<EarnedHoursWizardFormProps> = ({
  form,
  editingConfig,
  attendanceCodes,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '分配范围',
      description: '',
    },
    {
      title: '分配规则',
      description: '',
    },
  ];

  const next = async () => {
    try {
      if (currentStep === 0) {
        // 验证第一步
        await form.validateFields(['configCode', 'configName']);

        // 验证出勤代码必填
        const formValues = form.getFieldsValue(true);
        const filterGroups = formValues.sourceConfig?.filterGroups;

        if (filterGroups && filterGroups.length > 0) {
          const invalidGroups = filterGroups.filter((group: any) =>
            !group.workHoursFilter?.attendanceCodes || group.workHoursFilter.attendanceCodes.length === 0
          );

          if (invalidGroups.length > 0) {
            message.warning('请为每个条件组选择至少一个出勤代码');
            return;
          }
        }

        setCurrentStep(currentStep + 1);
      } else if (currentStep === 1) {
        // 验证第二步并提交
        const rules = form.getFieldValue('rules');
        if (!rules || rules.length === 0) {
          message.warning('请至少添加一条分配规则');
          return;
        }

        // 验证每条规则都有生效开始时间
        const invalidRules = rules.filter((rule: any) => !rule.effectiveStartTime);
        if (invalidRules.length > 0) {
          message.warning('所有分配规则都必须设置生效开始时间');
          return;
        }

        onSubmit();
      }
    } catch (error) {
      console.error('验证失败:', error);
      message.error('请填写所有必填字段');
    }
  };

  const prev = () => {
    setCurrentStep(currentStep - 1);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <StepOneDefineSource form={form} attendanceCodes={attendanceCodes} editingConfig={editingConfig} />;
      case 1:
        return <StepTwoAllocationRules form={form} editingConfig={editingConfig} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ paddingTop: '24px', paddingBottom: '24px', paddingLeft: '12px', paddingRight: '12px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Steps current={currentStep} items={steps} style={{ marginBottom: 16, flexShrink: 0 }} />

        <Form form={form} layout="vertical" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {renderStepContent()}
          </div>
        </Form>
      </div>

      <div style={{ height: '64px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center', flexShrink: 0, padding: '0 20px', margin: 0, width: '100%' }}>
          {currentStep > 0 && (
            <Button onClick={prev} icon={<LeftOutlined />}>
              上一步
            </Button>
          )}
          {currentStep < steps.length - 1 && (
            <Button type="primary" onClick={next} icon={<RightOutlined />}>
              下一步
            </Button>
          )}
          {currentStep === steps.length - 1 && (
            <>
              <Button onClick={onCancel}>取消</Button>
              <Button type="primary" onClick={next} loading={isSubmitting}>
                完成
              </Button>
            </>
          )}
        </div>
    </div>
  );
};

// 第一步：定义来源
interface StepOneProps {
  form: any;
  attendanceCodes: any[];
  editingConfig?: EarnedHourConfig | null;
}

const StepOneDefineSource: React.FC<StepOneProps> = ({ form, attendanceCodes, editingConfig }) => {
  // 使用 useState 存储 filterGroups
  const [filterGroups, setFilterGroups] = useState<any[]>([]);
  const [updateCount, setUpdateCount] = useState(0);

  // 初始化默认条件组 - 使用useEffect确保在组件挂载后执行
  useEffect(() => {
    const currentFilterGroups = form.getFieldValue(['sourceConfig', 'filterGroups']);
    console.log('初始化检查 - 当前filterGroups:', currentFilterGroups);
    if (!currentFilterGroups || currentFilterGroups.length === 0) {
      console.log('设置默认条件组');
      const defaultGroup = {
        employeeFilter: { fieldGroups: [{ id: Date.now().toString(), conditions: [] }] },
        workHoursFilter: { hierarchySelections: [], attendanceCodes: [] },
      };
      form.setFieldValue(['sourceConfig', 'filterGroups'], [defaultGroup]);
    }
    // 设置初始状态
    setFilterGroups(currentFilterGroups || []);
  }, []);

  useEffect(() => {
    console.log('StepOneDefineSource - 组件挂载/更新');
    console.log('filterGroups:', filterGroups);
    console.log('filterGroups 数量:', filterGroups.length);
  }, [filterGroups, updateCount]);

  // 添加条件组
  const addFilterGroup = () => {
    console.log('=== 添加条件组被点击 ===');
    const currentGroups = form.getFieldValue(['sourceConfig', 'filterGroups']) || [];
    console.log('当前条件组数量:', currentGroups.length);

    const newGroups = [
      ...currentGroups,
      {
        id: `group_${Date.now()}`,
        employeeFilter: { fieldGroups: [{ id: Date.now().toString(), conditions: [] }] },
        workHoursFilter: { hierarchySelections: [], attendanceCodes: [] },
      },
    ];

    form.setFieldValue(['sourceConfig', 'filterGroups'], newGroups);

    // 立即更新本地状态
    setFilterGroups(newGroups);
    setUpdateCount(prev => prev + 1);

    console.log('✅ 新条件组数量:', newGroups.length);
  };

  // 删除条件组
  const removeFilterGroup = (index: number) => {
    const currentGroups = form.getFieldValue(['sourceConfig', 'filterGroups']) || [];
    const newGroups = currentGroups.filter((_: any, i: number) => i !== index);
    form.setFieldValue(['sourceConfig', 'filterGroups'], newGroups);
    setFilterGroups(newGroups);
    setUpdateCount(prev => prev + 1);
  };

  // 判断是否禁用数据源编辑（生效或失效状态时不可修改数据源）
  const isDataSourceDisabled = editingConfig?.status === 'ACTIVE' || editingConfig?.status === 'INACTIVE';

  return (
    <div>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="规则代码"
            name="configCode"
            rules={[{ required: true, message: '请输入规则代码' }]}
          >
            <Input placeholder="如：EARNED_001" disabled={!!editingConfig || isDataSourceDisabled} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="规则名称"
            name="configName"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="如：车间挣得工时分摊" disabled={isDataSourceDisabled} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label="规则描述"
        name="description"
      >
        <TextArea rows={2} placeholder="请描述规则的作用和适用范围" disabled={isDataSourceDisabled} />
      </Form.Item>

      <Divider style={{ margin: '24px 0' }}><span style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>筛选条件</span></Divider>

      {/* 条件组列表 */}
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        {filterGroups.map((group: any, groupIndex: number) => (
          <Card
            key={groupIndex}
            size="small"
            title={<span style={{ fontWeight: 500 }}>条件组 {groupIndex + 1}</span>}
            extra={
              <Space size={8}>
                {!isDataSourceDisabled && filterGroups.length > 1 && (
                  <Popconfirm
                    overlayClassName="custom-popconfirm"
                    title="确认删除"
                    description="确定要删除这组条件吗？"
                    onConfirm={() => removeFilterGroup(groupIndex)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button type="link" size="small" danger icon={<DeleteOutlined />} style={{ padding: '0 4px' }}>
                      删除
                    </Button>
                  </Popconfirm>
                )}
                {groupIndex < filterGroups.length - 1 && (
                  <Tag color="orange">OR</Tag>
                )}
                {isDataSourceDisabled && (
                  <Tag color="blue" icon={<EditOutlined />}>已锁定</Tag>
                )}
              </Space>
            }
            style={{
              background: isDataSourceDisabled ? 'var(--color-bg-disabled)' : 'var(--color-bg-light)',
              border: '1px solid var(--color-border-1)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            {/* 人员筛选区域 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: '2px solid var(--color-primary)'
              }}>
                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--color-primary)'
                }}>
                  人员筛选
                </span>
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  （设置符合条件的人员）
                </span>
              </div>
              <Form.Item
                name={['sourceConfig', 'filterGroups', groupIndex, 'employeeFilter', 'fieldGroups']}
                style={{ marginBottom: 0 }}
              >
                <EmployeeFieldFilter disabled={isDataSourceDisabled} />
              </Form.Item>
            </div>

            {/* 工时筛选区域 */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: '2px solid var(--color-success)'
              }}>
                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--color-success)'
                }}>
                  工时筛选
                </span>
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  （设置工时的归属类型和出勤代码）
                </span>
              </div>

              <Form.Item
                name={['sourceConfig', 'filterGroups', groupIndex, 'workHoursFilter']}
                style={{ marginBottom: 0 }}
              >
                <WorkHoursFilter attendanceCodes={attendanceCodes} disabled={isDataSourceDisabled} />
              </Form.Item>
            </div>
          </Card>
        ))}
      </Space>

      {/* 添加条件组按钮 */}
      {!isDataSourceDisabled && (
        <Button
          type="dashed"
          onClick={addFilterGroup}
          icon={<PlusOutlined />}
          block
          style={{ height: 32 }}
        >
          添加条件组（OR关系）
        </Button>
      )}
    </div>
  );
};

// 第二步：分配规则
interface StepTwoProps {
  form: any;
  editingConfig?: EarnedHourConfig | null;
}

const StepTwoAllocationRules: React.FC<StepTwoProps> = ({ form, editingConfig }) => {
  const [rules, setRules] = useState<any[]>([]);

  // 判断是否禁用分配方式编辑（生效或失效状态时不可修改分配方式）
  const isDataSourceDisabled = editingConfig?.status === 'ACTIVE' || editingConfig?.status === 'INACTIVE';

  // 监听表单rules字段的变化
  useEffect(() => {
    const currentRules = form.getFieldValue('rules') || [];
    setRules(currentRules);
  }, [form]);

  // 额外监听：当editingConfig变化时，也要更新rules
  useEffect(() => {
    if (editingConfig) {
      const currentRules = form.getFieldValue('rules') || [];
      setRules(currentRules);
    }
  }, [editingConfig, form]);

  const allocationBasisOptions = [
    { value: 'ACTUAL_HOURS', label: '按实际工时比例分摊', description: '根据各目标的实际工时比例分摊挣得工时' },
    { value: 'ACTUAL_HOURS_COEFFICIENT', label: '按实际工时系数比例分摊', description: '根据各目标的实际工时系数（金额）比例分摊挣得工时' },
    { value: 'AVERAGE', label: '按人员平均分摊', description: '平均分摊挣得工时到所有符合条件的人员' },
  ];

  const handleAddRule = () => {
    const newRule = {
      ruleName: `分配规则${rules.length + 1}`,
      ruleType: 'PROPORTIONAL',
      allocationBasis: 'ACTUAL_HOURS',
      effectiveStartTime: null,
      effectiveEndTime: null,
      status: 'ACTIVE',
      sortOrder: rules.length,
      description: '',
      isNew: true, // 标记为新规则，允许编辑分配方式
    };

    const newRules = [...rules, newRule];
    setRules(newRules);
    form.setFieldsValue({ rules: newRules });
  };

  const handleRemoveRule = (index: number) => {
    const ruleToRemove = rules[index];

    // 检查是否可以删除：如果当前日期 > 生效开始时间，则不允许删除
    if (ruleToRemove.effectiveStartTime) {
      const startDate = dayjs(ruleToRemove.effectiveStartTime);
      const currentDate = dayjs().startOf('day');

      if (currentDate.isAfter(startDate)) {
        message.warning('该规则已经生效，不允许删除');
        return;
      }
    }

    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
    form.setFieldsValue({ rules: newRules });
  };

  const handleUpdateRule = (index: number, field: string, value: any) => {
    // 如果更新的是时间字段，需要验证时间交叉
    if (field === 'effectiveStartTime' || field === 'effectiveEndTime') {
      const currentRule = rules[index];
      const newStartTime = field === 'effectiveStartTime' ? value : currentRule.effectiveStartTime;
      const newEndTime = field === 'effectiveEndTime' ? value : currentRule.effectiveEndTime;

      // 只有设置了开始时间才进行验证
      if (newStartTime) {
        const hasOverlap = validateRuleTimeOverlap(newStartTime, newEndTime, index);

        if (hasOverlap) {
          message.error('规则时间与现有规则时间交叉，请调整时间设置');
          return;
        }
      }
    }

    const newRules = [...rules];
    newRules[index] = {
      ...newRules[index],
      [field]: value,
    };
    setRules(newRules);
    form.setFieldsValue({ rules: newRules });
  };

  const getAllocationBasisLabel = (basis: string) => {
    const option = allocationBasisOptions.find(opt => opt.value === basis);
    return option?.label || basis;
  };

  const getAllocationBasisColor = (basis: string) => {
    const colors: Record<string, string> = {
      'ACTUAL_HOURS': 'blue',
      'ACTUAL_HOURS_COEFFICIENT': 'cyan',
      'AVERAGE': 'green',
    };
    return colors[basis] || 'default';
  };

  // 验证规则时间是否与现有规则交叉
  const validateRuleTimeOverlap = (newRuleStartTime: string | null, newRuleEndTime: string | null, excludeIndex: number = -1): boolean => {
    const newStart = newRuleStartTime ? dayjs(newRuleStartTime).startOf('day') : null;
    const newEnd = newRuleEndTime ? dayjs(newRuleEndTime).startOf('day') : null;

    // 遍历所有现有规则（除了排除的索引）
    for (let i = 0; i < rules.length; i++) {
      if (i === excludeIndex) continue; // 跳过当前正在编辑的规则

      const rule = rules[i];
      if (!rule.effectiveStartTime) continue; // 没有开始时间的规则跳过

      const existingStart = dayjs(rule.effectiveStartTime).startOf('day');
      const existingEnd = rule.effectiveEndTime ? dayjs(rule.effectiveEndTime).startOf('day') : null;

      // 检查时间是否交叉
      let hasOverlap = false;

      if (newStart && newEnd) {
        // 新规则有开始和结束时间
        hasOverlap =
          (newStart.isBefore(existingEnd || dayjs().add(100, 'years')) && newEnd.isAfter(existingStart)) ||
          (newStart.isSame(existingStart) || newEnd.isSame(existingEnd));
      } else if (newStart) {
        // 新规则只有开始时间（永久有效）
        hasOverlap = !existingEnd || newStart.isBefore(existingEnd);
      }

      if (hasOverlap) {
        return true; // 有时间交叉
      }
    }

    return false; // 没有时间交叉
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* 规则列表区域 - 可滚动 */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {rules.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--color-bg-light)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border-2)' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无分配规则，请点击下方按钮添加"
            />
          </div>
        ) : (
          <div>
            {rules.map((rule: any, index: number) => {
              return (
              <Card
                key={index}
                size="small"
                style={{ marginBottom: 12, border: '1px solid var(--color-border-1)', borderRadius: 'var(--radius-md)' }}
                title={<span style={{ fontWeight: 500 }}>分配规则 {index + 1}</span>}
                extra={
                  <Button
                    type="link"
                    size="small"
                    danger
                    onClick={() => handleRemoveRule(index)}
                    disabled={
                      rule.effectiveStartTime && dayjs().startOf('day').isAfter(dayjs(rule.effectiveStartTime))
                    }
                    title={
                      rule.effectiveStartTime && dayjs().startOf('day').isAfter(dayjs(rule.effectiveStartTime))
                        ? '该规则已经生效，不允许删除'
                        : '删除此规则'
                    }
                    style={{ padding: '0 4px' }}
                  >
                    删除
                  </Button>
                }
              >
                {/* 第一行：分配方式 */}
                <Row gutter={16} style={{ marginBottom: 12 }}>
                  <Col span={24}>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                        <span style={{ color: '#ff4d4f', marginRight: 4, fontSize: 14 }}>*</span>
                        分配方式
                      </div>
                      <Select
                        value={rule.allocationBasis}
                        onChange={(val) => handleUpdateRule(index, 'allocationBasis', val)}
                        style={{ width: '100%' }}
                        disabled={isDataSourceDisabled && !rule.isNew}
                      >
                        {allocationBasisOptions.map(option => (
                          <Select.Option key={option.value} value={option.value}>
                            {option.label}
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                  </Col>
                </Row>

                {/* 第二行：生效日期与失效日期 */}
                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                        <span style={{ color: '#ff4d4f', marginRight: 4, fontSize: 14 }}>*</span>
                        生效日期
                      </div>
                      <DatePicker
                        value={rule.effectiveStartTime ? dayjs(rule.effectiveStartTime) : null}
                        onChange={(date) => handleUpdateRule(index, 'effectiveStartTime', date ? date.toISOString() : null)}
                        style={{ width: '100%' }}
                        placeholder="选择生效日期"
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 4 }}>失效日期</div>
                      <DatePicker
                        value={rule.effectiveEndTime ? dayjs(rule.effectiveEndTime) : null}
                        onChange={(date) => handleUpdateRule(index, 'effectiveEndTime', date ? date.toISOString() : null)}
                        style={{ width: '100%' }}
                        placeholder="选择失效日期（可选）"
                      />
                    </div>
                  </Col>
                </Row>
              </Card>
            );
          })}
          </div>
        )}
      </div>

      {/* 固定在底部的添加按钮 */}
      <div style={{ marginTop: 16, textAlign: 'center', flexShrink: 0 }}>
        <Button type="primary" onClick={handleAddRule} icon={<PlusOutlined />}>
          添加分配规则
        </Button>
      </div>

      <Form.Item name="rules" hidden>
        <Input />
      </Form.Item>
    </div>
  );
};

export default EarnedHoursTab;
