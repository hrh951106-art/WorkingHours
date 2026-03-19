import { useState, useEffect } from 'react';
import { Card, Tabs, Button, Modal, Form, Input, Table, message, Space, Select, InputNumber, Row, Col, Tag, Popconfirm, Switch, Transfer } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import SearchConditionsConfig from './components/SearchConditionsConfig';

const ConfigPage: React.FC = () => {
  // 从 sessionStorage 读取要激活的页签
  const getInitialTab = () => {
    const savedTab = sessionStorage.getItem('hr-config-active-tab');
    sessionStorage.removeItem('hr-config-active-tab'); // 清除已读取的值
    return savedTab || 'datasources';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [dataSourceModalOpen, setDataSourceModalOpen] = useState(false);
  const [optionModalOpen, setOptionModalOpen] = useState(false);
  const [customFieldModalOpen, setCustomFieldModalOpen] = useState(false);
  const [editingDataSource, setEditingDataSource] = useState<any>(null);
  const [editingOption, setEditingOption] = useState<any>(null);
  const [editingCustomField, setEditingCustomField] = useState<any>(null);
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<number | null>(null);
  const [dataSourceForm] = Form.useForm();
  const [optionForm] = Form.useForm();
  const [customFieldForm] = Form.useForm();
  const queryClient = useQueryClient();

  // 数据源查询
  const { data: dataSources = [], isLoading: dataSourcesLoading } = useQuery({
    queryKey: ['dataSources'],
    queryFn: () => request.get('/hr/data-sources').then((res: any) => res || []),
  });

  // 自定义字段查询
  const { data: customFields = [] } = useQuery({
    queryKey: ['customFields'],
    queryFn: () => request.get('/hr/custom-fields').then((res: any) => res || []),
  });

  // 数据源操作
  const createDataSourceMutation = useMutation({
    mutationFn: (data: any) => request.post('/hr/data-sources', data),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['dataSources'] });
      setDataSourceModalOpen(false);
      dataSourceForm.resetFields();
      setEditingDataSource(null);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '创建失败';
      message.error(errorMsg);
      console.error('创建数据源失败:', error);
    },
  });

  const updateDataSourceMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      request.put(`/hr/data-sources/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['dataSources'] });
      setDataSourceModalOpen(false);
      dataSourceForm.resetFields();
      setEditingDataSource(null);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '更新失败';
      message.error(errorMsg);
      console.error('更新数据源失败:', error);
    },
  });

  const deleteDataSourceMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/hr/data-sources/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['dataSources'] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '删除失败';
      message.error(errorMsg);
      console.error('删除数据源失败:', error);
    },
  });

  // 数据源选项操作
  const createOptionMutation = useMutation({
    mutationFn: ({ dataSourceId, data }: { dataSourceId: number; data: any }) =>
      request.post(`/hr/data-sources/${dataSourceId}/options`, data),
    onSuccess: () => {
      message.success('添加成功');
      queryClient.invalidateQueries({ queryKey: ['dataSources'] });
      setOptionModalOpen(false);
      optionForm.resetFields();
      setEditingOption(null);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '添加失败';
      message.error(errorMsg);
      console.error('添加选项失败:', error);
    },
  });

  const updateOptionMutation = useMutation({
    mutationFn: ({ dataSourceId, optionId, data }: { dataSourceId: number; optionId: number; data: any }) =>
      request.put(`/hr/data-sources/${dataSourceId}/options/${optionId}`, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['dataSources'] });
      setOptionModalOpen(false);
      optionForm.resetFields();
      setEditingOption(null);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '更新失败';
      message.error(errorMsg);
      console.error('更新选项失败:', error);
    },
  });

  const deleteOptionMutation = useMutation({
    mutationFn: ({ dataSourceId, optionId }: { dataSourceId: number; optionId: number }) =>
      request.delete(`/hr/data-sources/${dataSourceId}/options/${optionId}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['dataSources'] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '删除失败';
      message.error(errorMsg);
      console.error('删除选项失败:', error);
    },
  });

  // 自定义字段操作
  const createCustomFieldMutation = useMutation({
    mutationFn: (data: any) => request.post('/hr/custom-fields', data),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
      setCustomFieldModalOpen(false);
      customFieldForm.resetFields();
      setEditingCustomField(null);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '创建失败';
      message.error(errorMsg);
      console.error('创建自定义字段失败:', error);
    },
  });

  const updateCustomFieldMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      request.put(`/hr/custom-fields/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
      setCustomFieldModalOpen(false);
      customFieldForm.resetFields();
      setEditingCustomField(null);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '更新失败';
      message.error(errorMsg);
      console.error('更新自定义字段失败:', error);
    },
  });

  const deleteCustomFieldMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/hr/custom-fields/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '删除失败';
      message.error(errorMsg);
      console.error('删除自定义字段失败:', error);
    },
  });

  // 数据源表格列
  const dataSourceColumns = [
    { title: '编码', dataIndex: 'code', key: 'code', width: 150 },
    { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'BUILTIN' ? 'blue' : 'green'}>
          {type === 'BUILTIN' ? '内置' : '自定义'}
        </Tag>
      ),
    },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '选项数量',
      key: 'optionCount',
      width: 100,
      render: (_: any, record: any) => record.options?.length || 0,
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 80,
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => handleManageOptions(record)}
          >
            管理选项
          </Button>
          {!record.isSystem && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditDataSource(record)}
              >
                编辑
              </Button>
              <Popconfirm
                title="确定要删除这个数据源吗？"
                onConfirm={() => deleteDataSourceMutation.mutate(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  // 自定义字段表格列
  const customFieldColumns = [
    { title: '字段编码', dataIndex: 'code', key: 'code', width: 150 },
    { title: '字段名称', dataIndex: 'name', key: 'name', width: 150 },
    {
      title: '字段类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const typeMap: any = {
          TEXT: '文本',
          NUMBER: '数字',
          DATE: '日期',
          SELECT_SINGLE: '单选',
          SELECT_MULTI: '多选',
          LOOKUP: '查找项',
        };
        return typeMap[type] || type;
      },
    },
    {
      title: '关联数据源',
      key: 'dataSource',
      width: 120,
      render: (_: any, record: any) => {
        if (record.type === 'LOOKUP' && record.dataSource) {
          return record.dataSource.name;
        }
        return '-';
      },
    },
    {
      title: '是否必填',
      dataIndex: 'isRequired',
      key: 'isRequired',
      width: 100,
      render: (required: boolean) => (required ? '是' : '否'),
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 80,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditCustomField(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个字段吗？"
            onConfirm={() => deleteCustomFieldMutation.mutate(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 事件处理
  const handleAddDataSource = () => {
    setEditingDataSource(null);
    dataSourceForm.resetFields();
    setDataSourceModalOpen(true);
  };

  const handleEditDataSource = (dataSource: any) => {
    setEditingDataSource(dataSource);
    dataSourceForm.setFieldsValue(dataSource);
    setDataSourceModalOpen(true);
  };

  const handleManageOptions = (dataSource: any) => {
    setSelectedDataSourceId(dataSource.id);
  };

  const handleAddOption = () => {
    setEditingOption(null);
    optionForm.resetFields();
    setOptionModalOpen(true);
  };

  const handleEditOption = (option: any) => {
    setEditingOption(option);
    optionForm.setFieldsValue(option);
    setOptionModalOpen(true);
  };

  const handleAddCustomField = () => {
    setEditingCustomField(null);
    customFieldForm.resetFields();
    setCustomFieldModalOpen(true);
  };

  const handleEditCustomField = (field: any) => {
    setEditingCustomField(field);
    customFieldForm.setFieldsValue({
      ...field,
      dataSourceId: field.type === 'LOOKUP' ? field.dataSource?.id : undefined,
    });
    setCustomFieldModalOpen(true);
  };

  const handleDataSourceModalOk = async () => {
    try {
      const values = await dataSourceForm.validateFields();
      if (editingDataSource) {
        updateDataSourceMutation.mutate({ id: editingDataSource.id, data: values });
      } else {
        createDataSourceMutation.mutate(values);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleOptionModalOk = async () => {
    try {
      const values = await optionForm.validateFields();
      if (!selectedDataSourceId) return;

      if (editingOption) {
        updateOptionMutation.mutate({
          dataSourceId: selectedDataSourceId,
          optionId: editingOption.id,
          data: values,
        });
      } else {
        createOptionMutation.mutate({
          dataSourceId: selectedDataSourceId,
          data: values,
        });
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleCustomFieldModalOk = async () => {
    try {
      const values = await customFieldForm.validateFields();
      const submitData = {
        ...values,
        isRequired: values.isRequired || false,
      };

      if (editingCustomField) {
        updateCustomFieldMutation.mutate({ id: editingCustomField.id, data: submitData });
      } else {
        createCustomFieldMutation.mutate(submitData);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 获取当前选中的数据源
  const selectedDataSource = dataSources.find((ds: any) => ds.id === selectedDataSourceId);

  return (
    <div>
      <Card title="系统配置">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'datasources',
              label: '查找项管理',
              children: (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      {selectedDataSource ? (
                        <>
                          <Button onClick={() => setSelectedDataSourceId(null)}>
                            返回数据源列表
                          </Button>
                          <span style={{ marginLeft: 16, fontWeight: 'bold' }}>
                            {selectedDataSource.name} ({selectedDataSource.code})
                            {selectedDataSource.isSystem && (
                              <Tag color="blue" style={{ marginLeft: 8 }}>
                                系统内置
                              </Tag>
                            )}
                          </span>
                        </>
                      ) : (
                        <span>管理所有下拉选项</span>
                      )}
                    </div>
                    {!selectedDataSource && (
                      <Button type="primary" icon={<PlusOutlined />} onClick={handleAddDataSource}>
                        新建查找项
                      </Button>
                    )}
                  </div>

                  {!selectedDataSource ? (
                    <Table
                      columns={dataSourceColumns}
                      dataSource={dataSources}
                      rowKey="id"
                      loading={dataSourcesLoading}
                      pagination={false}
                    />
                  ) : (
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={handleAddOption}
                        >
                          添加选项
                        </Button>
                      </div>
                      <Table
                        columns={[
                          { title: '标签', dataIndex: 'label', key: 'label' },
                          { title: '值', dataIndex: 'value', key: 'value' },
                          { title: '排序', dataIndex: 'sort', key: 'sort', width: 100 },
                          {
                            title: '状态',
                            dataIndex: 'isActive',
                            key: 'isActive',
                            width: 100,
                            render: (isActive: boolean) => (
                              <Tag color={isActive ? 'green' : 'red'}>
                                {isActive ? '启用' : '禁用'}
                              </Tag>
                            ),
                          },
                          {
                            title: '操作',
                            key: 'action',
                            width: 150,
                            render: (_: any, record: any) => (
                              <Space>
                                <Button
                                  type="link"
                                  size="small"
                                  icon={<EditOutlined />}
                                  onClick={() => handleEditOption(record)}
                                >
                                  编辑
                                </Button>
                                <Popconfirm
                                  title="确定要删除这个选项吗？"
                                  onConfirm={() =>
                                    deleteOptionMutation.mutate({
                                      dataSourceId: selectedDataSourceId!,
                                      optionId: record.id,
                                    })
                                  }
                                  okText="确定"
                                  cancelText="取消"
                                >
                                  <Button type="link" size="small" danger>
                                    删除
                                  </Button>
                                </Popconfirm>
                              </Space>
                            ),
                          },
                        ]}
                        dataSource={selectedDataSource.options || []}
                        rowKey="id"
                        pagination={false}
                      />
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'customFields',
              label: '自定义字段配置',
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddCustomField}
                    >
                      新建自定义字段
                    </Button>
                  </div>
                  <Table
                    columns={customFieldColumns}
                    dataSource={customFields}
                    rowKey="id"
                    pagination={false}
                  />
                </div>
              ),
            },
            {
              key: 'employee-info',
              label: '人事信息配置',
              children: (
                <div>
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <p style={{ marginBottom: 24, fontSize: 16, color: '#666' }}>
                      配置人员详情页面的页签和字段显示
                    </p>
                    <Button
                      type="primary"
                      size="large"
                      onClick={() => window.location.href = '/hr/employee-info-config'}
                    >
                      进入人事信息配置
                    </Button>
                  </div>
                </div>
              ),
            },
            {
              key: 'search-conditions',
              label: '查询条件配置',
              children: (
                <SearchConditionsConfig />
              ),
            },
          ]}
        />
      </Card>

      {/* 数据源弹窗 */}
      <Modal
        title={editingDataSource ? '编辑查找项' : '新建查找项'}
        open={dataSourceModalOpen}
        onOk={handleDataSourceModalOk}
        onCancel={() => {
          setDataSourceModalOpen(false);
          dataSourceForm.resetFields();
          setEditingDataSource(null);
        }}
        confirmLoading={createDataSourceMutation.isPending || updateDataSourceMutation.isPending}
      >
        <Form form={dataSourceForm} layout="vertical">
          <Form.Item
            name="code"
            label="编码"
            rules={[{ required: true, message: '请输入编码' }]}
          >
            <Input placeholder="如：ORG_TYPE, EDUCATION" />
          </Form.Item>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="如：组织类型、学历" />
          </Form.Item>
          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true, message: '请选择类型' }]}
            initialValue="CUSTOM"
          >
            <Select>
              <Select.Option value="BUILTIN">内置</Select.Option>
              <Select.Option value="CUSTOM">自定义</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入描述" rows={3} />
          </Form.Item>
          <Form.Item
            name="sort"
            label="排序"
            initialValue={0}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 选项弹窗 */}
      <Modal
        title={editingOption ? '编辑选项' : '添加选项'}
        open={optionModalOpen}
        onOk={handleOptionModalOk}
        onCancel={() => {
          setOptionModalOpen(false);
          optionForm.resetFields();
          setEditingOption(null);
        }}
        confirmLoading={createOptionMutation.isPending || updateOptionMutation.isPending}
      >
        <Form form={optionForm} layout="vertical">
          <Form.Item
            name="label"
            label="显示名称"
            rules={[{ required: true, message: '请输入显示名称' }]}
          >
            <Input placeholder="如：集团、本科" />
          </Form.Item>
          <Form.Item
            name="value"
            label="选项值"
            rules={[{ required: true, message: '请输入选项值' }]}
          >
            <Input placeholder="如：GROUP、BACHELOR" />
          </Form.Item>
          <Form.Item
            name="sort"
            label="排序"
            initialValue={0}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 自定义字段弹窗 */}
      <Modal
        title={editingCustomField ? '编辑自定义字段' : '新建自定义字段'}
        open={customFieldModalOpen}
        onOk={handleCustomFieldModalOk}
        onCancel={() => {
          setCustomFieldModalOpen(false);
          customFieldForm.resetFields();
          setEditingCustomField(null);
        }}
        confirmLoading={createCustomFieldMutation.isPending || updateCustomFieldMutation.isPending}
        width={600}
      >
        <Form form={customFieldForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="code"
                label="字段编码"
                rules={[{ required: true, message: '请输入字段编码' }]}
              >
                <Input placeholder="如：education, skill" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="字段名称"
                rules={[{ required: true, message: '请输入字段名称' }]}
              >
                <Input placeholder="如：学历、技能" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="字段类型"
                rules={[{ required: true, message: '请选择字段类型' }]}
              >
                <Select placeholder="请选择字段类型">
                  <Select.Option value="TEXT">文本</Select.Option>
                  <Select.Option value="NUMBER">数字</Select.Option>
                  <Select.Option value="DATE">日期</Select.Option>
                  <Select.Option value="SELECT_SINGLE">单选</Select.Option>
                  <Select.Option value="SELECT_MULTI">多选</Select.Option>
                  <Select.Option value="LOOKUP">查找项</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isRequired"
                label="是否必填"
                valuePropName="checked"
                initialValue={false}
              >
                <Select>
                  <Select.Option value={false}>否</Select.Option>
                  <Select.Option value={true}>是</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.type !== currentValues.type
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('type') === 'LOOKUP' ? (
                <Form.Item
                  name="dataSourceId"
                  label="关联数据源"
                  rules={[{ required: true, message: '请选择数据源' }]}
                >
                  <Select placeholder="请选择数据源">
                    {dataSources.map((ds: any) => (
                      <Select.Option key={ds.id} value={ds.id}>
                        {ds.name} ({ds.code})
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item name="defaultValue" label="默认值">
            <Input placeholder="请输入默认值" />
          </Form.Item>
          <Form.Item
            name="sort"
            label="排序"
            initialValue={0}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ConfigPage;
