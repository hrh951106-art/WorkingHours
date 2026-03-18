import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  message,
  Popconfirm,
  Tag,
  Tree,
  TreeSelect,
  Divider,
  Row,
  Col,
  Steps,
  Switch,
  Alert,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, KeyOutlined, DatabaseOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

interface Permission {
  key: string;
  title: string;
  children?: Permission[];
}

// 功能权限树定义
const functionalPermissions: Permission[] = [
  {
    key: 'frontend-access',
    title: '🌐 前端访问权限',
    children: [
      {
        key: 'workspace',
        title: '工作台',
        children: [
          { key: 'dashboard:view', title: '查看工作台' },
        ],
      },
      {
        key: 'hr-management',
        title: '人事管理',
        children: [
          { key: 'hr:organizations', title: '组织管理' },
          { key: 'hr:employees', title: '人员管理' },
        ],
      },
      {
        key: 'account-management',
        title: '劳动力账户',
        children: [
          { key: 'account:view', title: '查看账户' },
        ],
      },
      {
        key: 'punch-management',
        title: '打卡管理',
        children: [
          { key: 'punch:records', title: '打卡记录' },
        ],
      },
      {
        key: 'shift-management',
        title: '排班管理',
        children: [
          { key: 'shift:schedules', title: '排班管理' },
        ],
      },
      {
        key: 'attendance-management',
        title: '工时管理',
        children: [
          { key: 'attendance:workhour-details', title: '工时明细管理' },
          { key: 'allocation:line-maintenance', title: '开线维护' },
          { key: 'allocation:production-records', title: '产量记录' },
          { key: 'allocation:config', title: '分摊规则' },
          { key: 'allocation:calculate', title: '分摊计算' },
          { key: 'allocation:results', title: '分摊结果查询' },
        ],
      },
      {
        key: 'calculate-management',
        title: '计算管理',
        children: [
          { key: 'calculate:pairing-results', title: '摆卡结果' },
          { key: 'calculate:work-hour-results', title: '工时结果' },
        ],
      },
    ],
  },
  {
    key: 'backend-config',
    title: '⚙️ 后台配置权限',
    children: [
      {
        key: 'hr-config',
        title: '人事配置',
        children: [
          { key: 'hr:config', title: '人事基础配置' },
          { key: 'hr:employee-info-config', title: '员工信息配置' },
        ],
      },
      {
        key: 'punch-config',
        title: '打卡配置',
        children: [
          { key: 'punch:devices', title: '设备管理' },
          { key: 'punch:device-groups', title: '设备组管理' },
        ],
      },
      {
        key: 'shift-config',
        title: '排班配置',
        children: [
          { key: 'shift:shifts', title: '班次管理' },
        ],
      },
      {
        key: 'calculate-config',
        title: '计算配置',
        children: [
          { key: 'calculate:punch-rules', title: '打卡规则' },
          { key: 'calculate:attendance-codes', title: '出勤代码' },
        ],
      },
      {
        key: 'allocation-config',
        title: '工时分摊配置',
        children: [
          { key: 'allocation:basic-config', title: '通用配置' },
          { key: 'allocation:product-config', title: '产品配置' },
        ],
      },
      {
        key: 'system-config',
        title: '用户与角色',
        children: [
          { key: 'system:users', title: '用户管理' },
          { key: 'system:roles', title: '角色管理' },
        ],
      },
    ],
  },
];

const RolePage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 在组件顶层调用useWatch，而不是在JSX中
  const isDefault = Form.useWatch('isDefault', form);
  const dataScopeType = Form.useWatch('dataScopeType', form);
  const dataScopeRules = Form.useWatch('dataScopeRules', form);
  const isAllData = Form.useWatch('isAllData', form);

  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => request.get('/system/roles').then((res: any) => res),
  });

  const { data: orgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => request.get('/hr/organizations/tree').then((res: any) => res),
  });

  // 获取人事信息页签配置的自定义查找项字段
  const { data: employeeInfoTabs } = useQuery({
    queryKey: ['employee-info-tabs'],
    queryFn: async () => {
      try {
        const res = await request.get('/hr/employee-info-tabs');
        return res || [];
      } catch (error) {
        console.error('获取人事信息页签失败:', error);
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => request.post('/system/roles', data),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsModalOpen(false);
      setCurrentStep(0);
      setCheckedKeys([]);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '创建失败');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => request.put(`/system/roles/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsModalOpen(false);
      setEditingRole(null);
      setCurrentStep(0);
      setCheckedKeys([]);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '更新失败');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/system/roles/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '删除失败');
    },
  });

  const handleAdd = () => {
    setEditingRole(null);
    setCurrentStep(0);
    setCheckedKeys([]);
    form.resetFields();
    form.setFieldsValue({
      isAllData: true,
      dataScopeRuleGroups: [],
      status: 'ACTIVE',
      isDefault: false,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditingRole(record);
    setCurrentStep(0);
    const permissions = record.functionalPermissions || [];
    setCheckedKeys(permissions);

    // 兼容旧数据：如果有dataScopeType为ALL，则isAllData为true
    const isAllData = record.dataScopeType === 'ALL' || !record.dataScopeRuleGroups;

    form.setFieldsValue({
      ...record,
      functionalPermissions: permissions,
      isAllData: isAllData,
      dataScopeRuleGroups: record.dataScopeRuleGroups || [],
      isDefault: record.isDefault || false,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        // 验证基本信息
        await form.validateFields(['name', 'code', 'description', 'status']);
      } else if (currentStep === 1) {
        // 验证功能权限
        await form.validateFields(['functionalPermissions']);
      }
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingRole) {
        updateMutation.mutate({ id: editingRole.id, ...values });
      } else {
        createMutation.mutate(values);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const columns = [
    { title: '角色名称', dataIndex: 'name', key: 'name' },
    { title: '角色编码', dataIndex: 'code', key: 'code' },
    { title: '描述', dataIndex: 'description', key: 'description' },
    {
      title: '默认角色',
      dataIndex: 'isDefault',
      key: 'isDefault',
      render: (isDefault: boolean) => (
        <Tag color={isDefault ? 'blue' : 'default'}>
          {isDefault ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>
          {status === 'ACTIVE' ? '激活' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个角色吗？"
            onConfirm={() => handleDelete(record.id)}
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

  const steps = [
    {
      title: '基本信息',
      icon: <UserOutlined />,
      content: (
        <div>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="角色名称"
                rules={[{ required: true, message: '请输入角色名称' }]}
              >
                <Input placeholder="请输入角色名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="code"
                label="角色编码"
                rules={[{ required: true, message: '请输入角色编码' }]}
              >
                <Input placeholder="请输入角色编码" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入角色描述" rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select>
                  <Select.Option value="ACTIVE">激活</Select.Option>
                  <Select.Option value="INACTIVE">停用</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isDefault"
                label="默认角色"
                valuePropName="checked"
              >
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
          </Row>
          {isDefault && (
            <Alert
              message="默认角色"
              description="设置为默认角色后，新入职的员工将自动分配此角色。"
              type="info"
              showIcon
            />
          )}
        </div>
      ),
    },
    {
      title: '功能权限',
      icon: <KeyOutlined />,
      content: (
        <div>
          <Form.Item
            name="functionalPermissions"
            label="选择功能权限"
            rules={[
              {
                required: true,
                message: '请选择功能权限',
              },
            ]}
            trigger="onChange"
          >
            <Tree
              checkable
              checkedKeys={checkedKeys}
              treeData={functionalPermissions}
              defaultExpandAll
              style={{ height: 400, overflow: 'auto' }}
              onSelect={(selectedKeysValue, info) => {
                console.log('onSelect', selectedKeysValue, info);
              }}
              onCheck={(checkedKeysValue, info) => {
                console.log('onCheck', checkedKeysValue);
                // 处理checkedKeys的格式
                let keys: React.Key[] = [];
                if (Array.isArray(checkedKeysValue)) {
                  keys = checkedKeysValue;
                } else if (checkedKeysValue && typeof checkedKeysValue === 'object') {
                  keys = checkedKeysValue.checked || [];
                }
                setCheckedKeys(keys);
                form.setFieldsValue({ functionalPermissions: keys });
              }}
            />
          </Form.Item>
        </div>
      ),
    },
    {
      title: '数据权限',
      icon: <DatabaseOutlined />,
      content: (
        <div>
          <Form.Item
            name="isAllData"
            label="数据权限范围"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch checkedChildren="所有人" unCheckedChildren="自定义条件" />
          </Form.Item>

          {!isAllData && (
            <div>
              <Alert
                message="配置说明"
                description="可以添加多个条件组，条件组之间为【或】关系，组内规则为【且】关系"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Form.List name="dataScopeRuleGroups">
                {(groups, { add: addGroup, remove: removeGroup }) => (
                  <div>
                    {groups.map((group, groupIndex) => (
                      <Card
                        key={group.key}
                        size="small"
                        style={{ marginBottom: 16, backgroundColor: '#fafafa' }}
                        title={
                          <Space>
                            <span>条件组 {groupIndex + 1}</span>
                            <Tag color="blue">组内规则为【且】关系</Tag>
                          </Space>
                        }
                        extra={
                          <Button
                            type="link"
                            danger
                            size="small"
                            onClick={() => removeGroup(group.name)}
                          >
                            删除组
                          </Button>
                        }
                      >
                        <Form.List name={[group.name, 'rules']}>
                          {(rules, { add: addRule, remove: removeRule }) => (
                            <div>
                              {rules.map((rule, ruleIndex) => (
                                <div
                                  key={rule.key}
                                  style={{
                                    marginBottom: 12,
                                    padding: '12px',
                                    backgroundColor: '#fff',
                                    border: '1px solid #d9d9d9',
                                    borderRadius: '6px',
                                  }}
                                >
                                  <Row gutter={12} align="middle">
                                    <Col span={6}>
                                      <Form.Item
                                        {...rule}
                                        name={[rule.name, 'field']}
                                        label="字段"
                                        rules={[{ required: true, message: '请选择字段' }]}
                                        style={{ marginBottom: 0 }}
                                      >
                                        <Select placeholder="请选择字段">
                                          <Select.OptGroup label="组织相关">
                                            <Select.Option value="ORG">组织</Select.Option>
                                            <Select.Option value="MANAGED_ORG">我管理的组织</Select.Option>
                                          </Select.OptGroup>
                                          <Select.OptGroup label="系统字段">
                                            <Select.Option value="gender">性别</Select.Option>
                                            <Select.Option value="position">职位</Select.Option>
                                            <Select.Option value="employeeType">员工类型</Select.Option>
                                            <Select.Option value="status">在职状态</Select.Option>
                                            <Select.Option value="education">学历</Select.Option>
                                          </Select.OptGroup>
                                          {employeeInfoTabs && employeeInfoTabs.length > 0 && (
                                            <Select.OptGroup label="人事字段">
                                              {employeeInfoTabs.flatMap((tab: any) =>
                                                tab.fields
                                                  ? tab.fields
                                                      .filter((field: any) => field.fieldType === 'CUSTOM')
                                                      .map((field: any) => (
                                                        <Select.Option
                                                          key={`${tab.code}_${field.fieldCode}`}
                                                          value={`custom_${field.fieldCode}`}
                                                        >
                                                          {field.fieldName}
                                                        </Select.Option>
                                                      ))
                                                  : []
                                              )}
                                            </Select.OptGroup>
                                          )}
                                        </Select>
                                      </Form.Item>
                                    </Col>

                                    <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => {
                                      const prevField = prevValues.dataScopeRuleGroups?.[group.name]?.rules?.[rule.name]?.field;
                                      const currentField = currentValues.dataScopeRuleGroups?.[group.name]?.rules?.[rule.name]?.field;
                                      return prevField !== currentField;
                                    }}>
                                      {({ getFieldValue }) => {
                                        const field = getFieldValue(['dataScopeRuleGroups', group.name, 'rules', rule.name, 'field']);

                                        // 组织类型
                                        if (field === 'ORG') {
                                          return (
                                            <>
                                              <Col span={8}>
                                                <Form.Item
                                                  {...rule}
                                                  name={[rule.name, 'orgIds']}
                                                  label="选择组织"
                                                  rules={[{ required: true, message: '请选择组织' }]}
                                                  style={{ marginBottom: 0 }}
                                                >
                                                  <TreeSelect
                                                    multiple
                                                    treeCheckable
                                                    treeData={[
                                                      {
                                                        title: '组织架构',
                                                        value: 'root',
                                                        key: 'root',
                                                        children: orgs?.map((org: any) => ({
                                                          title: org.name,
                                                          value: org.id,
                                                          key: org.id,
                                                          children: org.children?.map((child: any) => ({
                                                            title: child.name,
                                                            value: child.id,
                                                            key: child.id,
                                                          })),
                                                        })),
                                                      },
                                                    ]}
                                                    placeholder="请选择组织（可多选）"
                                                    treeDefaultExpandAll
                                                    showSearch
                                                    treeNodeFilterProp="title"
                                                    maxTagCount="responsive"
                                                  />
                                                </Form.Item>
                                              </Col>
                                              <Col span={6}>
                                                <Form.Item
                                                  {...rule}
                                                  name={[rule.name, 'includeChild']}
                                                  label="包含子组织"
                                                  valuePropName="checked"
                                                  initialValue={false}
                                                  style={{ marginBottom: 0 }}
                                                >
                                                  <Switch checkedChildren="是" unCheckedChildren="否" />
                                                </Form.Item>
                                              </Col>
                                            </>
                                          );
                                        }

                                        // 我管理的组织
                                        if (field === 'MANAGED_ORG') {
                                          return (
                                            <>
                                              <Col span={8}>
                                                <Form.Item
                                                  {...rule}
                                                  name={[rule.name, 'includeChild']}
                                                  label="包含子组织"
                                                  valuePropName="checked"
                                                  initialValue={false}
                                                  style={{ marginBottom: 0 }}
                                                >
                                                  <Switch checkedChildren="是" unCheckedChildren="否" />
                                                </Form.Item>
                                              </Col>
                                              <Col span={10}>
                                                <Space style={{ fontSize: '12px', color: '#999' }}>
                                                  <InfoCircleOutlined />
                                                  系统将自动获取当前用户管理的组织
                                                </Space>
                                              </Col>
                                            </>
                                          );
                                        }

                                        // 系统字段或自定义字段
                                        if (field && field !== 'ORG' && field !== 'MANAGED_ORG') {
                                          // 判断是否为自定义字段
                                          const isCustomField = field.startsWith('custom_');
                                          const fieldCode = isCustomField ? field.replace('custom_', '') : field;

                                          // 从人事信息页签中查找自定义字段配置
                                          let customFieldConfig: any = null;
                                          if (isCustomField && employeeInfoTabs) {
                                            for (const tab of employeeInfoTabs) {
                                              if (tab.fields) {
                                                const found = tab.fields.find((f: any) => f.fieldCode === fieldCode);
                                                if (found && found.fieldType === 'CUSTOM' && found.type) {
                                                  customFieldConfig = found;
                                                  break;
                                                }
                                              }
                                            }
                                          }

                                          // 判断是否需要下拉选择（所有字段都是下拉选择）
                                          const needsSelect = true;

                                          // 获取选项列表
                                          let options: any[] = [];
                                          if (isCustomField && customFieldConfig?.dataSource?.options) {
                                            options = customFieldConfig.dataSource.options;
                                          } else if (field === 'gender') {
                                            options = [
                                              { label: '男', value: 'MALE' },
                                              { label: '女', value: 'FEMALE' },
                                            ];
                                          } else if (field === 'employeeType') {
                                            options = [
                                              { label: '正式员工', value: 'FORMAL' },
                                              { label: '临时员工', value: 'TEMPORARY' },
                                              { label: '实习生', value: 'INTERN' },
                                            ];
                                          } else if (field === 'status') {
                                            options = [
                                              { label: '在职', value: 'ACTIVE' },
                                              { label: '离职', value: 'RESIGNED' },
                                            ];
                                          } else if (field === 'education') {
                                            options = [
                                              { label: '本科', value: 'bachelor' },
                                              { label: '硕士', value: 'master' },
                                              { label: '博士', value: 'doctor' },
                                              { label: '其他', value: 'other' },
                                            ];
                                          } else if (field === 'position') {
                                            // 职位也支持多选，但选项可能比较多，不预设选项
                                            options = [];
                                          }

                                          return (
                                            <>
                                              <Col span={5}>
                                                <Form.Item
                                                  {...rule}
                                                  name={[rule.name, 'operator']}
                                                  label="操作符"
                                                  rules={[{ required: true, message: '请选择操作符' }]}
                                                  style={{ marginBottom: 0 }}
                                                >
                                                  <Select placeholder="操作符">
                                                    <Select.Option value="==">等于</Select.Option>
                                                    <Select.Option value="!=">不等于</Select.Option>
                                                    <Select.Option value="in">包含任一</Select.Option>
                                                    <Select.Option value="notIn">不包含任一</Select.Option>
                                                  </Select>
                                                </Form.Item>
                                              </Col>
                                              <Col span={11}>
                                                <Form.Item
                                                  {...rule}
                                                  name={[rule.name, 'value']}
                                                  label="值"
                                                  rules={[{ required: true, message: '请选择值' }]}
                                                  style={{ marginBottom: 0 }}
                                                >
                                                  {options.length > 0 ? (
                                                    <Select
                                                      mode="multiple"
                                                      placeholder="请选择（可多选）"
                                                      showSearch
                                                      optionFilterProp="label"
                                                      maxTagCount="responsive"
                                                    >
                                                      {options.map((opt: any) => (
                                                        <Select.Option
                                                          key={opt.value || opt.key}
                                                          value={opt.value || opt.key}
                                                          label={opt.label || opt.name}
                                                        >
                                                          {opt.label || opt.name}
                                                        </Select.Option>
                                                      ))}
                                                    </Select>
                                                  ) : (
                                                    <Input placeholder="请输入值，多个值用逗号分隔" />
                                                  )}
                                                </Form.Item>
                                              </Col>
                                            </>
                                          );
                                        }

                                        return null;
                                      }}
                                    </Form.Item>

                                    <Col span={2}>
                                      <Button
                                        type="link"
                                        danger
                                        size="small"
                                        onClick={() => removeRule(rule.name)}
                                        style={{ paddingLeft: 0, paddingRight: 0 }}
                                      >
                                        删除
                                      </Button>
                                    </Col>
                                  </Row>
                                </div>
                              ))}
                              <Button
                                type="dashed"
                                onClick={() => addRule({ field: 'position' })}
                                block
                                size="small"
                              >
                                添加规则
                              </Button>
                            </div>
                          )}
                        </Form.List>
                      </Card>
                    ))}
                    <Button
                      type="dashed"
                      onClick={() => addGroup({ rules: [{ field: 'position' }] })}
                      block
                      icon={<PlusOutlined />}
                    >
                      添加条件组（组间OR关系）
                    </Button>
                  </div>
                )}
              </Form.List>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="角色管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增角色
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={roles?.items || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            total: roles?.total || 0,
            pageSize: roles?.pageSize || 10,
            current: roles?.page || 1,
          }}
        />
      </Card>

      <Modal
        title={editingRole ? '编辑角色' : '新增角色'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingRole(null);
          setCurrentStep(0);
          setCheckedKeys([]);
          form.resetFields();
        }}
        footer={null}
        width={900}
      >
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          {steps.map((step, index) => (
            <Steps.Step key={index} title={step.title} icon={step.icon} />
          ))}
        </Steps>

        <Form form={form} layout="vertical">
          <div style={{ minHeight: 400 }}>{steps[currentStep].content}</div>
        </Form>

        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Space>
            {currentStep > 0 && (
              <Button onClick={handlePrev}>上一步</Button>
            )}
            {currentStep < steps.length - 1 && (
              <Button type="primary" onClick={handleNext}>
                下一步
              </Button>
            )}
            {currentStep === steps.length - 1 && (
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingRole ? '更新' : '创建'}
              </Button>
            )}
            <Button onClick={() => setIsModalOpen(false)}>取消</Button>
          </Space>
        </div>
      </Modal>
    </div>
  );
};

export default RolePage;
