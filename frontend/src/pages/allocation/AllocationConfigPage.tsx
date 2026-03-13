import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  message,
  Popconfirm,
  Tag,
  Drawer,
  Row,
  Col,
  Divider,
  Empty,
  Steps,
  Alert,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, SettingOutlined, LeftOutlined, RightOutlined, CopyOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import dayjs from 'dayjs';
import { EmployeeFieldFilter, WorkHoursFilter } from './components';

const { TextArea } = Input;

interface AllocationConfig {
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

const AllocationConfigPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AllocationConfig | null>(null);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取配置列表
  const { data: configsData, isLoading } = useQuery({
    queryKey: ['allocationConfigs', page, pageSize, keyword, status],
    queryFn: () =>
      request.get('/allocation/configs', {
        params: { page, pageSize, keyword, status },
      }).then((res: any) => res),
  });

  // 获取出勤代码列表
  const { data: attendanceCodes } = useQuery({
    queryKey: ['attendanceCodesForAllocation'],
    queryFn: () =>
      request.get('/allocation/attendance-codes').then((res: any) => res),
  });

  // 创建配置
  const createMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('createMutation - 发送请求到 /allocation/configs');
      console.log('请求数据:', JSON.stringify(data, null, 2));
      return request.post('/allocation/configs', data);
    },
    onSuccess: () => {
      message.success('创建成功');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['allocationConfigs'] });
    },
    onError: (error: any) => {
      console.error('创建失败 - 错误详情:', error);
      console.error('响应数据:', error.response?.data);
      console.error('响应状态:', error.response?.status);
      console.error('响应头:', error.response?.headers);
      message.error(error.response?.data?.message || '创建失败');
    },
  });

  // 更新配置
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      request.put(`/allocation/configs/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      setIsModalVisible(false);
      setEditingConfig(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['allocationConfigs'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '更新失败');
    },
  });

  // 删除配置
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      request.delete(`/allocation/configs/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['allocationConfigs'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '删除失败');
    },
  });

  // 启用配置
  const activateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      request.post(`/allocation/configs/${id}/activate`, data),
    onSuccess: () => {
      message.success('启用成功');
      queryClient.invalidateQueries({ queryKey: ['allocationConfigs'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '启用失败');
    },
  });

  // 复制配置
  const copyMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      request.post(`/allocation/configs/${id}/copy`, data),
    onSuccess: () => {
      message.success('复制成功，已创建新配置');
      queryClient.invalidateQueries({ queryKey: ['allocationConfigs'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '复制失败');
    },
  });

  const handleCreate = () => {
    setEditingConfig(null);
    form.resetFields();
    form.setFieldsValue({
      sourceConfig: {
        filterGroups: [
          {
            employeeFilter: { fieldGroups: [{ id: Date.now().toString(), conditions: [] }] },
            workHoursFilter: { hierarchySelections: [], attendanceCodes: [] },
          },
        ],
      },
      rules: [],
    });
    console.log('handleCreate - 初始化表单值:', form.getFieldsValue());
    setIsModalVisible(true);
  };

  const handleEdit = (config: AllocationConfig) => {
    setEditingConfig(config);

    // 转换rules数组，将后端的allocationScopeId转换为前端的allocationScope
    const transformedRules = (config.rules || []).map((rule: any) => ({
      ...rule,
      allocationScope: rule.allocationScopeId || null,  // 将allocationScopeId映射为allocationScope
      allocationScopeId: undefined,  // 删除后端使用的allocationScopeId字段
    }));

    form.setFieldsValue({
      configCode: config.configCode,
      configName: config.configName,
      description: config.description,
      sourceConfig: config.sourceConfig,
      rules: transformedRules,  // 使用转换后的rules
    });
    setIsModalVisible(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleActivate = (config: AllocationConfig) => {
    Modal.confirm({
      title: '确认启用',
      content: `确定要启用规则"${config.configName}"吗？启用后将无法修改。`,
      onOk: () => {
        activateMutation.mutate({
          id: config.id,
          data: { approvedById: 1, approvedByName: 'Admin' },
        });
      },
    });
  };

  const handleArchive = (config: AllocationConfig) => {
    archiveMutation.mutate(config.id);
  };

  const handleCopy = (config: AllocationConfig) => {
    const newConfigName = `${config.configName}_副本`;
    copyMutation.mutate({
      id: config.id,
      data: {
        configName: newConfigName,
        createdById: 1,
        createdByName: 'Admin',
      },
    });
  };

  const handleSubmit = async () => {
    try {
      // 获取所有表单字段值（包括未挂载的字段）
      const values = form.getFieldsValue(true);
      console.log('提交的表单数据:', JSON.stringify(values, null, 2));

      // 验证必需字段
      if (!values.configCode) {
        message.error('规则代码不能为空');
        return;
      }

      if (!values.configName) {
        message.error('规则名称不能为空');
        return;
      }

      if (!values.rules || values.rules.length === 0) {
        message.error('请至少添加一条分摊规则');
        return;
      }

      // 从规则中获取生效时间（使用最早的开始时间）
      const rules = values.rules || [];
      let configStartTime = dayjs().format('YYYY-MM-DD');
      let configEndTime = null;

      if (rules.length > 0) {
        const startTimes = rules
          .map((r: any) => r.effectiveStartTime ? dayjs(r.effectiveStartTime) : null)
          .filter(Boolean);
        const endTimes = rules
          .map((r: any) => r.effectiveEndTime ? dayjs(r.effectiveEndTime) : null)
          .filter(Boolean);

        if (startTimes.length > 0) {
          configStartTime = startTimes.sort((a, b) => a.isBefore(b) ? -1 : 1)[0].format('YYYY-MM-DD');
        }
        if (endTimes.length > 0) {
          configEndTime = endTimes.sort((a, b) => a.isAfter(b) ? -1 : 1)[0].format('YYYY-MM-DD');
        }
      }

      // 转换sourceConfig为后端期望的格式
      let transformedSourceConfig = null;
      if (values.sourceConfig && values.sourceConfig.filterGroups) {
        // 合并所有filterGroups的条件
        const allFieldGroups = values.sourceConfig.filterGroups.map((fg: any) => ({
          id: fg.id || `group_${Date.now()}`,
          fieldGroups: fg.employeeFilter?.fieldGroups || [],
        }));

        // 收集所有出勤代码
        const allAttendanceCodes: string[] = [];
        values.sourceConfig.filterGroups.forEach((fg: any) => {
          if (fg.workHoursFilter?.attendanceCodes) {
            allAttendanceCodes.push(...fg.workHoursFilter.attendanceCodes);
          }
        });

        // 收集所有工时归属选择
        const allHierarchySelections: any[] = [];
        values.sourceConfig.filterGroups.forEach((fg: any) => {
          if (fg.workHoursFilter?.hierarchySelections) {
            allHierarchySelections.push(...fg.workHoursFilter.hierarchySelections);
          }
        });

        transformedSourceConfig = {
          sourceType: 'EMPLOYEE_HOURS',
          employeeFilter: {
            fieldGroups: allFieldGroups,
          },
          accountFilter: {
            hierarchySelections: allHierarchySelections,
          },
          attendanceCodes: allAttendanceCodes,
          description: values.description || '',
        };

        console.log('转换后的sourceConfig:', JSON.stringify(transformedSourceConfig, null, 2));
      }

      // 获取当前用户信息以确定组织
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      // 转换rules数组，将allocationScope改为allocationScopeId
      const transformedRules = (values.rules || []).map((rule: any) => ({
        ...rule,
        allocationScopeId: rule.allocationScope || null,  // 将allocationScope映射为allocationScopeId
        allocationScope: undefined,  // 删除前端使用的allocationScope字段
      }));

      const data = {
        configCode: values.configCode,
        configName: values.configName,
        description: values.description || '',
        orgId: user?.orgId || 1,  // 添加必需的orgId字段
        orgName: user?.orgName || '默认组织',
        orgPath: user?.orgPath || '/',  // 添加必需的orgPath字段
        effectiveStartTime: configStartTime,
        effectiveEndTime: configEndTime,
        sourceConfig: transformedSourceConfig,
        rules: transformedRules,  // 使用转换后的rules
        createdById: 1,
        createdByName: 'Admin',
      };

      console.log('准备发送的数据:', JSON.stringify(data, null, 2));

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
        console.log('创建分摊规则 - 发送数据到 /allocation/configs');
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error('表单提交失败:', error);
      message.error('请检查表单填写是否完整');
    }
  };

  const showDetailDrawer = (configId: number) => {
    setSelectedConfigId(configId);
    setIsDetailDrawerVisible(true);
  };

  const columns = [
    { title: '规则代码', dataIndex: 'configCode', key: 'configCode', width: 150 },
    { title: '规则名称', dataIndex: 'configName', key: 'configName', width: 200 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          DRAFT: { text: '草稿', color: 'default' },
          ACTIVE: { text: '生效', color: 'green' },
          ARCHIVED: { text: '归档', color: 'gray' },
        };
        const statusInfo = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: '生效时间',
      dataIndex: 'effectiveStartTime',
      key: 'effectiveStartTime',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '规则数',
      key: 'ruleCount',
      width: 80,
      render: (_: any, record: AllocationConfig) => record._count?.rules || 0,
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right' as const,
      render: (_: any, record: AllocationConfig) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => showDetailDrawer(record.id)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleCopy(record)}
          >
            复制
          </Button>
          {record.status === 'DRAFT' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                编辑
              </Button>
              <Popconfirm
                title="确认删除"
                description="确定要删除此配置吗？"
                onConfirm={() => handleDelete(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
              <Button
                type="link"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => handleActivate(record)}
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
    <div>
      <Card title="分摊规则">
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="搜索配置编码、名称"
            allowClear
            style={{ width: 300 }}
            onSearch={(value) => setKeyword(value)}
            onChange={(e) => !e.target.value && setKeyword('')}
          />
          <Select
            placeholder="选择状态"
            allowClear
            style={{ width: 120 }}
            onChange={setStatus}
          >
            <Select.Option value="DRAFT">草稿</Select.Option>
            <Select.Option value="ACTIVE">生效</Select.Option>
            <Select.Option value="ARCHIVED">归档</Select.Option>
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建配置
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={configsData?.items || []}
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
      </Card>

      {/* 创建/编辑配置模态框 - 向导式 */}
      <Modal
        title={editingConfig ? '编辑分摊配置' : '新建分摊配置'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingConfig(null);
          form.resetFields();
        }}
        width={1000}
        okText="完成"
        cancelText="取消"
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        footer={null}
      >
        <AllocationWizardForm
          form={form}
          editingConfig={editingConfig}
          attendanceCodes={attendanceCodes || []}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsModalVisible(false);
            setEditingConfig(null);
            form.resetFields();
          }}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>

      {/* 配置详情抽屉 */}
      <Drawer
        title="配置详情"
        placement="right"
        width={800}
        open={isDetailDrawerVisible}
        onClose={() => {
          setIsDetailDrawerVisible(false);
          setSelectedConfigId(null);
        }}
      >
        <AllocationConfigDetail configId={selectedConfigId} />
      </Drawer>
    </div>
  );
};

// 向导式表单组件
interface AllocationWizardFormProps {
  form: any;
  editingConfig: AllocationConfig | null;
  attendanceCodes: any[];
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const AllocationWizardForm: React.FC<AllocationWizardFormProps> = ({
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
      title: '定义来源',
      description: '选择人员和工时类型',
    },
    {
      title: '分摊规则',
      description: '配置分摊方式和生效时间',
    },
  ];

  const next = async () => {
    try {
      if (currentStep === 0) {
        // 验证第一步
        await form.validateFields(['configCode', 'configName']);
        console.log('第一步验证通过，当前form值:', form.getFieldsValue(true));
      } else if (currentStep === 1) {
        // 验证第二步并提交
        const rules = form.getFieldValue('rules');
        if (!rules || rules.length === 0) {
          message.warning('请至少添加一条分摊规则');
          return;
        }

        // 验证每条规则都有生效开始时间
        const invalidRules = rules.filter((rule: any) => !rule.effectiveStartTime);
        if (invalidRules.length > 0) {
          message.warning('所有分摊规则都必须设置生效开始时间');
          return;
        }

        console.log('第二步验证通过，当前form值:', form.getFieldsValue(true));
        onSubmit();
        return;
      }
      console.log('从步骤', currentStep, '进入步骤', currentStep + 1);
      console.log('切换前的form值:', form.getFieldsValue(true));
      setCurrentStep(currentStep + 1);
      // 延迟打印，确保状态更新后查看
      setTimeout(() => {
        console.log('切换后的form值:', form.getFieldsValue(true));
      }, 100);
    } catch (error) {
      console.error('验证失败:', error);
      message.error('请填写所有必填字段');
    }
  };

  const prev = () => {
    console.log('从步骤', currentStep, '返回步骤', currentStep - 1);
    console.log('返回前的form值:', form.getFieldsValue(true));
    setCurrentStep(currentStep - 1);
    // 延迟打印，确保状态更新后查看
    setTimeout(() => {
      console.log('返回后的form值:', form.getFieldsValue(true));
    }, 100);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <StepOneDefineSource form={form} attendanceCodes={attendanceCodes} />;
      case 1:
        return <StepTwoAllocationRules form={form} attendanceCodes={attendanceCodes} />;
      default:
        return null;
    }
  };

  return (
    <Form form={form} layout="vertical">
      <Steps current={currentStep} items={steps} style={{ marginBottom: 24 }} />

      <div style={{ minHeight: 400 }}>{renderStepContent()}</div>

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Space>
          {currentStep > 0 && (
            <Button onClick={prev}>
              <LeftOutlined /> 上一步
            </Button>
          )}
          {currentStep < steps.length - 1 && (
            <Button type="primary" onClick={next}>
              下一步 <RightOutlined />
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
        </Space>
      </div>
    </Form>
  );
};

// 第一步：定义来源
interface StepOneProps {
  form: any;
  attendanceCodes: any[];
}

const StepOneDefineSource: React.FC<StepOneProps> = ({ form, attendanceCodes }) => {
  // 获取当前的条件组列表，确保至少有一个默认条件组
  const filterGroups = Form.useWatch(['sourceConfig', 'filterGroups'], form) || [
    {
      employeeFilter: { fieldGroups: [{ id: Date.now().toString(), conditions: [] }] },
      workHoursFilter: { hierarchySelections: [], attendanceCodes: [] },
    },
  ];

  // 监听基本字段值的变化，用于调试
  const configCode = Form.useWatch('configCode', form);
  const configName = Form.useWatch('configName', form);

  useEffect(() => {
    console.log('StepOneDefineSource - 组件挂载/更新');
    console.log('当前configCode:', configCode);
    console.log('当前configName:', configName);
    console.log('当前filterGroups:', filterGroups);
    console.log('form所有字段值:', form.getFieldsValue(true));
  }, [configCode, configName, filterGroups]);

  // 初始化默认条件组
  useEffect(() => {
    const currentFilterGroups = form.getFieldValue(['sourceConfig', 'filterGroups']);
    if (!currentFilterGroups || currentFilterGroups.length === 0) {
      form.setFieldValue(['sourceConfig', 'filterGroups'], [
        {
          employeeFilter: { fieldGroups: [{ id: Date.now().toString(), conditions: [] }] },
          workHoursFilter: { hierarchySelections: [], attendanceCodes: [] },
        },
      ]);
    }
  }, []);

  // 添加条件组
  const addFilterGroup = () => {
    const currentGroups = form.getFieldValue(['sourceConfig', 'filterGroups']) || [];
    const newGroups = [
      ...currentGroups,
      {
        employeeFilter: { fieldGroups: [{ id: Date.now().toString(), conditions: [] }] },
        workHoursFilter: { hierarchySelections: [], attendanceCodes: [] },
      },
    ];
    form.setFieldValue(['sourceConfig', 'filterGroups'], newGroups);
  };

  // 删除条件组
  const removeFilterGroup = (index: number) => {
    const currentGroups = form.getFieldValue(['sourceConfig', 'filterGroups']) || [];
    const newGroups = currentGroups.filter((_: any, i: number) => i !== index);
    form.setFieldValue(['sourceConfig', 'filterGroups'], newGroups);
  };

  return (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="规则代码"
            name="configCode"
            rules={[{ required: true, message: '请输入规则代码' }]}
          >
            <Input placeholder="如：ALLOC_001" disabled={!!form.getFieldValue('id')} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="规则名称"
            name="configName"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="如：车间间接工时分摊" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label="规则描述"
        name="description"
      >
        <TextArea rows={2} placeholder="请描述规则的作用和适用范围" />
      </Form.Item>

      <Divider><span style={{ fontWeight: 500 }}>筛选条件</span></Divider>

      {/* 条件组列表 */}
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {filterGroups.map((_: any, groupIndex: number) => (
          <Card
            key={groupIndex}
            size="small"
            title={<span>条件组 {groupIndex + 1}</span>}
            extra={
              <Space>
                {filterGroups.length > 1 && (
                  <Popconfirm
                    title="确认删除"
                    description="确定要删除这组条件吗？"
                    onConfirm={() => removeFilterGroup(groupIndex)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>
                )}
                {groupIndex < filterGroups.length - 1 && (
                  <Tag color="orange">OR</Tag>
                )}
              </Space>
            }
            style={{ background: '#fafafa', border: '1px solid #f0f0f0' }}
          >
            {/* 人员筛选区域 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: '2px solid #1890ff'
              }}>
                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#1890ff'
                }}>
                  人员筛选
                </span>
                <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>
                  （设置符合条件的人员）
                </span>
              </div>
              <Form.Item
                name={['sourceConfig', 'filterGroups', groupIndex, 'employeeFilter', 'fieldGroups']}
                style={{ marginBottom: 0 }}
              >
                <EmployeeFieldFilter />
              </Form.Item>
            </div>

            {/* 工时筛选区域 */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: '2px solid #52c41a'
              }}>
                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#52c41a'
                }}>
                  工时筛选
                </span>
                <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>
                  （设置工时的归属类型和出勤代码）
                </span>
              </div>

              <Form.Item
                name={['sourceConfig', 'filterGroups', groupIndex, 'workHoursFilter']}
                style={{ marginBottom: 0 }}
              >
                <WorkHoursFilter attendanceCodes={attendanceCodes} />
              </Form.Item>
            </div>
          </Card>
        ))}

        {/* 添加条件组按钮 */}
        <Button
          type="dashed"
          onClick={addFilterGroup}
          icon={<PlusOutlined />}
          block
        >
          添加条件组（OR关系）
        </Button>
      </Space>
    </div>
  );
};

// 第二步：分摊规则
interface StepTwoProps {
  form: any;
  attendanceCodes: any[];
}

const StepTwoAllocationRules: React.FC<StepTwoProps> = ({ form, attendanceCodes }) => {
  const [rules, setRules] = useState<any[]>([]);

  // 获取层级配置列表（用于分配归属）
  const { data: hierarchyLevels } = useQuery({
    queryKey: ['accountHierarchyLevels'],
    queryFn: () =>
      request.get('/account/hierarchy-config/levels').then((res: any) => res || []),
  });

  // 初始化时从表单获取规则
  useEffect(() => {
    const currentRules = form.getFieldValue('rules') || [];
    console.log('初始化规则:', currentRules);
    setRules(currentRules);
  }, []);

  const allocationBasisOptions = [
    { value: 'ACTUAL_HOURS', label: '按实际工时比例分配', description: '根据各目标的实际工时比例分配间接工时' },
    { value: 'ACTUAL_YIELDS', label: '按实际产量比例分配', description: '根据各目标的实际产量比例分配间接工时' },
    { value: 'EQUIVALENT_YIELDS', label: '按同效产量比例分配', description: '根据各目标的同效产量比例分配间接工时' },
    { value: 'STANDARD_HOURS', label: '按标准工时比例分配', description: '根据各目标的标准工时比例分配间接工时' },
  ];

  const handleAddRule = () => {
    const newRule = {
      ruleName: `分摊规则${rules.length + 1}`,
      ruleType: 'PROPORTIONAL',
      allocationBasis: 'ACTUAL_HOURS',
      allocationAttendanceCodes: [],
      allocationHierarchyLevels: [],
      allocationScope: null, // 用户需要从层级列表中选择
      basisFilter: {},
      targets: [],
      sortOrder: rules.length,
      status: 'ACTIVE',
      effectiveStartTime: null,
      effectiveEndTime: null,
      description: '',
    };

    const newRules = [...rules, newRule];
    console.log('新增规则:', newRule);
    console.log('新增后的rules:', newRules);
    setRules(newRules);
    form.setFieldsValue({ rules: newRules });
  };

  const handleRemoveRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
    form.setFieldsValue({ rules: newRules });
  };

  const handleUpdateRule = (index: number, field: string, value: any) => {
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
      'ACTUAL_YIELDS': 'green',
      'EQUIVALENT_YIELDS': 'orange',
      'STANDARD_HOURS': 'purple',
    };
    return colors[basis] || 'default';
  };

  return (
    <div>
      <div style={{ marginBottom: 16, padding: 12, background: '#f0f5ff', borderRadius: 4 }}>
        <div style={{ fontSize: 12, color: '#666' }}>调试信息：当前有 {rules.length} 条规则</div>
      </div>

      {rules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: '#fafafa', borderRadius: 4 }}>
          <Empty description="暂无分摊规则，点击下方按钮添加">
            <Button type="primary" onClick={handleAddRule}>
              添加分摊规则
            </Button>
          </Empty>
        </div>
      ) : (
        <div>
          {rules.map((rule: any, index: number) => {
            console.log(`渲染规则 ${index}:`, rule);
            return (
            <Card
              key={index}
              size="small"
              style={{ marginBottom: 12 }}
              title={
                <Space>
                  <span style={{ fontWeight: 600 }}>分摊规则 {index + 1}</span>
                  <Select
                    value={rule.allocationBasis}
                    onChange={(val) => handleUpdateRule(index, 'allocationBasis', val)}
                    style={{ width: 200 }}
                    size="small"
                  >
                    {allocationBasisOptions.map(option => (
                      <Select.Option key={option.value} value={option.value}>
                        {option.label}
                      </Select.Option>
                    ))}
                  </Select>
                </Space>
              }
              extra={
                <Button
                  type="link"
                  size="small"
                  danger
                  onClick={() => handleRemoveRule(index)}
                >
                  删除
                </Button>
              }
            >
              <Row gutter={16} align="middle">
                <Col span={8}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                      <span style={{ color: 'red', marginRight: 4 }}>*</span>
                      生效开始时间
                    </div>
                    <DatePicker
                      value={rule.effectiveStartTime ? dayjs(rule.effectiveStartTime) : null}
                      onChange={(date) => handleUpdateRule(index, 'effectiveStartTime', date ? date.toISOString() : null)}
                      style={{ width: '100%' }}
                      placeholder="选择开始时间"
                    />
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>生效结束时间</div>
                    <DatePicker
                      value={rule.effectiveEndTime ? dayjs(rule.effectiveEndTime) : null}
                      onChange={(date) => handleUpdateRule(index, 'effectiveEndTime', date ? date.toISOString() : null)}
                      style={{ width: '100%' }}
                      placeholder="选择结束时间（可选）"
                    />
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>分摊范围（组织类型层级）</div>
                    <Select
                      placeholder="请选择分摊范围"
                      value={rule.allocationScope}
                      onChange={(val) => handleUpdateRule(index, 'allocationScope', val)}
                      style={{ width: '100%' }}
                      options={hierarchyLevels
                        ?.filter((level: any) => level.mappingType === 'ORG_TYPE')
                        .map((level: any) => ({
                          label: level.name,
                          value: level.id,
                          description: `分摊到${level.name}级别`,
                        })) || []}
                      optionLabelProp="label"
                    >
                      {(option: any) => (
                        <div>
                          <div>{option.label}</div>
                          <div style={{ fontSize: 12, color: '#999' }}>{option.description}</div>
                        </div>
                      )}
                    </Select>
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>分配归属（产线类型层级）</div>
                    <Select
                      mode="multiple"
                      placeholder="请选择产线类型层级"
                      value={rule.allocationHierarchyLevels}
                      onChange={(val) => handleUpdateRule(index, 'allocationHierarchyLevels', val)}
                      style={{ width: '100%' }}
                      options={hierarchyLevels
                        ?.filter((level: any) => level.mappingType === 'ORG' || level.mappingType === 'ORG_TYPE')
                        .map((level: any) => ({
                          label: level.name,
                          value: level.id,
                        })) || []}
                    />
                  </div>
                </Col>
              </Row>
            </Card>
            );
          })}
          <Button type="dashed" onClick={handleAddRule} block icon={<PlusOutlined />}>
            添加分摊规则
          </Button>
        </div>
      )}

      <Form.Item name="rules" hidden>
        <Input />
      </Form.Item>
    </div>
  );
};

// 第三步：生效时间
interface StepThreeProps {
  form: any;
}

const StepThreeEffectiveTime: React.FC<StepThreeProps> = ({ form }) => {
  const [conflictCheck, setConflictCheck] = useState<any[]>([]);

  const handleDateChange = () => {
    // 这里应该调用后端API检查时间冲突
    // 模拟冲突检测
    setConflictCheck([]);
  };

  return (
    <div>
      <Alert
        message="设置生效时间"
        description="配置规则的有效期和优先级"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="生效开始时间"
            name="effectiveStartTime"
            rules={[{ required: true, message: '请选择开始时间' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              onChange={handleDateChange}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="生效结束时间"
            name="effectiveEndTime"
          >
            <DatePicker
              style={{ width: '100%' }}
              onChange={handleDateChange}
            />
          </Form.Item>
        </Col>
      </Row>

      {conflictCheck.length > 0 && (
        <Alert
          message="发现时间冲突"
          description={
            <div>
              <p>该时间段内已有以下配置：</p>
              <ul>
                {conflictCheck.map((conflict: any) => (
                  <li key={conflict.id}>
                    {conflict.configName} ({conflict.effectiveStartTime} ~ {conflict.effectiveEndTime || '永久'})
                  </li>
                ))}
              </ul>
              <p>是否要停用这些配置并启用新配置？</p>
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" danger>
              确认覆盖
            </Button>
          }
        />
      )}

      <Form.Item
        label="优先级"
        name="priority"
        tooltip="数字越大优先级越高，当时间重叠时按优先级执行"
        initialValue={0}
      >
        <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0-100" />
      </Form.Item>
    </div>
  );
};

// 配置详情组件
const AllocationConfigDetail: React.FC<{ configId: number | null }> = ({ configId }) => {
  const { data: configDetail, isLoading } = useQuery({
    queryKey: ['allocationConfigDetail', configId],
    queryFn: () =>
      request.get(`/allocation/configs/${configId}`).then((res: any) => res),
    enabled: !!configId,
  });

  // 获取层级配置列表（用于显示分配归属）
  const { data: hierarchyLevels } = useQuery({
    queryKey: ['accountHierarchyLevels'],
    queryFn: () =>
      request.get('/account/hierarchy-config/levels').then((res: any) => res || []),
    enabled: !!configId,
  });

  // 获取层级名称的辅助函数
  const getHierarchyLevelName = (levelId: number) => {
    const level = hierarchyLevels?.find((l: any) => l.id === levelId);
    return level?.name || `层级${levelId}`;
  };

  // 获取分摊依据标签的辅助函数
  const getAllocationBasisLabel = (basis: string) => {
    const basisMap: Record<string, string> = {
      'ACTUAL_HOURS': '按实际工时比例分配',
      'ACTUAL_YIELDS': '按实际产量比例分配',
      'EQUIVALENT_YIELDS': '按同效产量比例分配',
      'STANDARD_HOURS': '按标准工时比例分配',
    };
    return basisMap[basis] || basis;
  };

  // 格式化筛选条件显示
  const renderEmployeeFilter = (employeeFilter: any) => {
    if (!employeeFilter || !employeeFilter.fieldGroups || employeeFilter.fieldGroups.length === 0) {
      return <span style={{ color: '#999' }}>未配置人员筛选条件</span>;
    }

    return (
      <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
        {employeeFilter.fieldGroups.map((group: any, groupIdx: number) => (
          <div key={groupIdx} style={{ marginBottom: groupIdx < employeeFilter.fieldGroups.length - 1 ? 8 : 0 }}>
            <Tag color="blue">条件组 {groupIdx + 1}</Tag>
            {group.conditions && group.conditions.length > 0 ? (
              <div style={{ marginTop: 8 }}>
                {group.conditions.map((condition: any, idx: number) => (
                  <Tag key={idx} color="geekblue" style={{ marginBottom: 4 }}>
                    {condition.fieldName} {condition.operator} {condition.value}
                  </Tag>
                ))}
              </div>
            ) : (
              <span style={{ color: '#999', marginLeft: 8 }}>无条件</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) return <div>加载中...</div>;
  if (!configDetail) return <Empty description="无数据" />;

  return (
    <div>
      <Card title="基本信息" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <p style={{ marginBottom: 8 }}><strong style={{ color: '#666' }}>配置编码：</strong>{configDetail.configCode}</p>
            <p style={{ marginBottom: 8 }}><strong style={{ color: '#666' }}>配置名称：</strong>{configDetail.configName}</p>
            <p style={{ marginBottom: 8 }}><strong style={{ color: '#666' }}>状态：</strong>
              <Tag color={configDetail.status === 'ACTIVE' ? 'green' : configDetail.status === 'DRAFT' ? 'default' : 'gray'}>
                {configDetail.status === 'DRAFT' ? '草稿' : configDetail.status === 'ACTIVE' ? '生效' : '归档'}
              </Tag>
            </p>
          </Col>
          <Col span={12}>
            <p style={{ marginBottom: 8 }}><strong style={{ color: '#666' }}>生效时间：</strong>{dayjs(configDetail.effectiveStartTime).format('YYYY-MM-DD')} 至 {configDetail.effectiveEndTime ? dayjs(configDetail.effectiveEndTime).format('YYYY-MM-DD') : '永久'}</p>
            <p style={{ marginBottom: 8 }}><strong style={{ color: '#666' }}>创建时间：</strong>{dayjs(configDetail.createdAt).format('YYYY-MM-DD HH:mm')}</p>
            <p style={{ marginBottom: 8 }}><strong style={{ color: '#666' }}>创建人：</strong>{configDetail.createdByName || '-'}</p>
          </Col>
        </Row>
        <div style={{ marginTop: 12 }}>
          <strong style={{ color: '#666' }}>描述：</strong>
          <p style={{ marginTop: 4, color: '#666', background: '#fafafa', padding: 8, borderRadius: 4 }}>
            {configDetail.description || '无描述'}
          </p>
        </div>
      </Card>

      <Card title={<span><strong>分摊源配置</strong></span>} size="small" style={{ marginBottom: 16 }}>
        {configDetail.sourceConfig ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 500, color: '#1890ff' }}>出勤代码</div>
              <div style={{ minHeight: 32 }}>
                {configDetail.sourceConfig.attendanceCodes && configDetail.sourceConfig.attendanceCodes.length > 0 ? (
                  <Space wrap>
                    {configDetail.sourceConfig.attendanceCodes.map((code: string, idx: number) => (
                      <Tag key={idx} color="blue" style={{ padding: '4px 12px' }}>{code}</Tag>
                    ))}
                  </Space>
                ) : (
                  <span style={{ color: '#999' }}>未配置出勤代码</span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 500, color: '#52c41a' }}>人员筛选</div>
              {renderEmployeeFilter(configDetail.sourceConfig.employeeFilter)}
            </div>

            <div>
              <div style={{ marginBottom: 8, fontWeight: 500, color: '#fa8c16' }}>工时归属</div>
              {configDetail.sourceConfig.accountFilter && configDetail.sourceConfig.accountFilter.hierarchySelections && configDetail.sourceConfig.accountFilter.hierarchySelections.length > 0 ? (
                <div style={{ background: '#fff7e6', padding: 12, borderRadius: 4 }}>
                  {configDetail.sourceConfig.accountFilter.hierarchySelections.map((selection: any, idx: number) => (
                    <Tag key={idx} color="orange" style={{ marginBottom: 4 }}>
                      {selection.hierarchyLevelName || selection.hierarchyLevelId}
                      {selection.accountName && ` > ${selection.accountName}`}
                    </Tag>
                  ))}
                </div>
              ) : (
                <span style={{ color: '#999' }}>未配置工时归属</span>
              )}
            </div>
          </>
        ) : (
          <Empty description="未配置分摊源" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>

      <Card title={<span><strong>分摊规则</strong> <Tag color="blue">{configDetail.rules?.length || 0} 条</Tag></span>} size="small">
        {configDetail.rules && configDetail.rules.length > 0 ? (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {configDetail.rules.map((rule: any, ruleIdx: number) => (
              <Card
                key={rule.id}
                size="small"
                bordered
                style={{ background: '#fafafa' }}
                title={
                  <Space>
                    <span style={{ fontWeight: 600 }}>分摊规则 {ruleIdx + 1}</span>
                    <Tag color="blue">{getAllocationBasisLabel(rule.allocationBasis)}</Tag>
                    {rule.status === 'ACTIVE' && <Tag color="green">生效中</Tag>}
                  </Space>
                }
              >
                <Row gutter={16} style={{ marginBottom: 12 }}>
                  <Col span={8}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>生效开始时间</div>
                    <div style={{ fontWeight: 500 }}>
                      {rule.effectiveStartTime ? dayjs(rule.effectiveStartTime).format('YYYY-MM-DD') : '-'}
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>生效结束时间</div>
                    <div style={{ fontWeight: 500 }}>
                      {rule.effectiveEndTime ? dayjs(rule.effectiveEndTime).format('YYYY-MM-DD') : '永久'}
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>排序</div>
                    <div style={{ fontWeight: 500 }}>{rule.sortOrder || 0}</div>
                  </Col>
                </Row>

                {rule.allocationScope && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>分摊范围</div>
                    <Tag color="blue">{getHierarchyLevelName(rule.allocationScope)}</Tag>
                  </div>
                )}

                {rule.allocationHierarchyLevels && rule.allocationHierarchyLevels.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>分配归属（产线类型层级）</div>
                    <Space wrap>
                      {rule.allocationHierarchyLevels.map((levelId: number, idx: number) => (
                        <Tag key={idx} color="purple">{getHierarchyLevelName(levelId)}</Tag>
                      ))}
                    </Space>
                  </div>
                )}

                {rule.description && (
                  <div style={{ marginTop: 12, padding: 8, background: '#fff', borderRadius: 4 }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>规则说明</div>
                    <div style={{ color: '#666' }}>{rule.description}</div>
                  </div>
                )}
              </Card>
            ))}
          </Space>
        ) : (
          <Empty description="未配置分摊规则" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>
    </div>
  );
};

export default AllocationConfigPage;
