import { useState } from 'react';
import { Card, Button, Modal, Form, Input, Table, message, Space, Select, InputNumber, Tag, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import type { TableRowSelection } from 'antd/es/table/interface';

const DataSourceManagementPage: React.FC = () => {
  const [dataSourceModalOpen, setDataSourceModalOpen] = useState(false);
  const [optionModalOpen, setOptionModalOpen] = useState(false);
  const [editingDataSource, setEditingDataSource] = useState<any>(null);
  const [editingOption, setEditingOption] = useState<any>(null);
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<number | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<React.Key[]>([]);
  const [dataSourceForm] = Form.useForm();
  const [optionForm] = Form.useForm();
  const queryClient = useQueryClient();

  // 数据源查询
  const { data: dataSources = [], isLoading: dataSourcesLoading } = useQuery({
    queryKey: ['dataSources'],
    queryFn: () => request.get('/hr/data-sources').then((res: any) => res || []),
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

  const batchDeleteOptionsMutation = useMutation({
    mutationFn: ({ dataSourceId, optionIds }: { dataSourceId: number; optionIds: number[] }) =>
      Promise.all(
        optionIds.map((optionId) => request.delete(`/hr/data-sources/${dataSourceId}/options/${optionId}`))
      ),
    onSuccess: () => {
      message.success('批量删除成功');
      setSelectedOptionIds([]);
      queryClient.invalidateQueries({ queryKey: ['dataSources'] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '批量删除失败';
      message.error(errorMsg);
      console.error('批量删除选项失败:', error);
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

  const handleBatchDeleteOptions = () => {
    if (selectedOptionIds.length === 0) {
      message.warning('请先选择要删除的选项');
      return;
    }
    if (!selectedDataSourceId) return;

    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedOptionIds.length} 个选项吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        batchDeleteOptionsMutation.mutate({
          dataSourceId: selectedDataSourceId,
          optionIds: selectedOptionIds as number[],
        });
      },
    });
  };

  // 选项表格行选择配置
  const optionRowSelection: TableRowSelection<any> = {
    selectedRowKeys: selectedOptionIds,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedOptionIds(newSelectedRowKeys);
    },
    getCheckboxProps: (record: any) => ({
      disabled: false,
      name: record.id,
    }),
  };

  // 获取当前选中的数据源
  const selectedDataSource = dataSources.find((ds: any) => ds.id === selectedDataSourceId);

  return (
    <div>
      <Card title="查找项管理">
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
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddOption}
              >
                添加选项
              </Button>
              {selectedOptionIds.length > 0 && (
                <Popconfirm
                  title="确认批量删除"
                  description={`确定要删除选中的 ${selectedOptionIds.length} 个选项吗？`}
                  onConfirm={handleBatchDeleteOptions}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button danger icon={<DeleteOutlined />}>
                    批量删除 ({selectedOptionIds.length})
                  </Button>
                </Popconfirm>
              )}
            </div>
            <Table
              rowSelection={optionRowSelection}
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
    </div>
  );
};

export default DataSourceManagementPage;
