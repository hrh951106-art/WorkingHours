import { useState } from 'react';
import { Card, Button, Modal, Form, Input, Table, message, Space, Select, InputNumber, Row, Col, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

const CustomFieldConfigPage: React.FC = () => {
  const [customFieldModalOpen, setCustomFieldModalOpen] = useState(false);
  const [editingCustomField, setEditingCustomField] = useState<any>(null);
  const [customFieldForm] = Form.useForm();
  const queryClient = useQueryClient();

  // 数据源查询
  const { data: dataSources = [] } = useQuery({
    queryKey: ['dataSources'],
    queryFn: () => request.get('/hr/data-sources').then((res: any) => res || []),
  });

  // 自定义字段查询
  const { data: customFields = [] } = useQuery({
    queryKey: ['customFields'],
    queryFn: () => request.get('/hr/custom-fields').then((res: any) => res || []),
  });

  // 过滤掉系统内置字段，只显示用户创建的自定义字段
  const userCustomFields = customFields.filter((f: any) => !f.isSystem);

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
          TEXTAREA: '多行文本',
          NUMBER: '数字',
          DATE: '日期',
          SELECT_SINGLE: '单选',
          SELECT_MULTI: '多选',
        };
        return typeMap[type] || type;
      },
    },
    {
      title: '关联数据源',
      key: 'dataSource',
      width: 120,
      render: (_: any, record: any) => {
        if ((record.type === 'SELECT_SINGLE' || record.type === 'SELECT_MULTI') && record.dataSource) {
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
  const handleAddCustomField = () => {
    setEditingCustomField(null);
    customFieldForm.resetFields();
    setCustomFieldModalOpen(true);
  };

  const handleEditCustomField = (field: any) => {
    setEditingCustomField(field);
    customFieldForm.setFieldsValue({
      ...field,
      dataSourceId: field.dataSource?.id,
    });
    setCustomFieldModalOpen(true);
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

  return (
    <div>
      <Card title="自定义字段配置">
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <span>管理所有自定义字段</span>
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
          dataSource={userCustomFields}
          rowKey="id"
          pagination={false}
        />
      </Card>

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
                  <Select.Option value="TEXTAREA">多行文本</Select.Option>
                  <Select.Option value="NUMBER">数字</Select.Option>
                  <Select.Option value="DATE">日期</Select.Option>
                  <Select.Option value="SELECT_SINGLE">单选</Select.Option>
                  <Select.Option value="SELECT_MULTI">多选</Select.Option>
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
              (getFieldValue('type') === 'SELECT_SINGLE' || getFieldValue('type') === 'SELECT_MULTI') ? (
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

export default CustomFieldConfigPage;
