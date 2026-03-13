import { useState, useEffect } from 'react';
import { Card, Form, Select, Table, Button, Space, Modal, Input, InputNumber, Row, Col, Tag, Switch, message, Transfer } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

interface PageFieldConfig {
  id?: number;
  pageCode: string;
  pageName: string;
  fieldCode: string;
  fieldName: string;
  fieldType: 'text' | 'select' | 'date' | 'dateRange' | 'organization';
  isEnabled: boolean;
  sortOrder: number;
  dataSourceCode?: string;
}

const AVAILABLE_PAGES = [
  { code: 'employee-list', name: '人员管理页面' },
  { code: 'punch-records', name: '打卡记录页面' },
  { code: 'schedules', name: '排班管理页面' },
  { code: 'pair-results', name: '打卡结果页面' },
  { code: 'work-hour-results', name: '工时结果页面' },
  { code: 'workhour-details', name: '工时明细管理页面' },
];

const AVAILABLE_FIELDS = [
  // 基础字段
  { code: 'employeeNo', name: '员工工号', type: 'text' },
  { code: 'name', name: '员工姓名', type: 'text' },
  { code: 'organization', name: '组织', type: 'organization' },
  { code: 'status', name: '状态', type: 'select', dataSource: 'EMPLOYEE_STATUS' },

  // 人事信息字段
  { code: 'gender', name: '性别', type: 'select', dataSource: 'GENDER' },
  { code: 'education', name: '学历', type: 'select', dataSource: 'EDUCATION' },
  { code: 'department', name: '部门', type: 'select', dataSource: 'DEPARTMENT' },
  { code: 'position', name: '职位', type: 'select', dataSource: 'POSITION' },
  { code: 'entryDate', name: '入职日期', type: 'date' },

  // 自定义字段（从后端获取）
];

const SearchConditionsConfig: React.FC = () => {
  const [selectedPageCode, setSelectedPageCode] = useState<string | null>(null);
  const [fieldConfigs, setFieldConfigs] = useState<PageFieldConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<PageFieldConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取自定义字段列表
  const { data: customFields = [] } = useQuery({
    queryKey: ['customFields'],
    queryFn: () => request.get('/hr/custom-fields').then((res: any) => res || []),
  });

  // 获取页面查询条件配置
  const { data: pageConfigs = [], isLoading } = useQuery({
    queryKey: ['searchConditionConfigs', selectedPageCode],
    queryFn: async () => {
      if (!selectedPageCode) return [];
      const res = await request.get('/hr/search-condition-configs', {
        params: { pageCode: selectedPageCode }
      });
      return res || [];
    },
    enabled: !!selectedPageCode,
  });

  // 当 pageConfigs 加载完成后，设置到 fieldConfigs
  useEffect(() => {
    if (pageConfigs && pageConfigs.length > 0) {
      // 标准化字段类型
      const normalizedConfigs = pageConfigs.map((config: any) => {
        const fieldType = (config.fieldType || '').toLowerCase().trim();
        let standardType: 'text' | 'select' | 'date' | 'dateRange' | 'organization' = 'text';

        if (fieldType.includes('select') ||
            fieldType.includes('lookup') ||
            fieldType === 'select_single' ||
            fieldType === 'select_multi') {
          standardType = 'select';
        } else if (fieldType.includes('date') && fieldType.includes('range')) {
          standardType = 'dateRange';
        } else if (fieldType.includes('date')) {
          standardType = 'date';
        } else if (fieldType.includes('organization')) {
          standardType = 'organization';
        } else if (['text', 'select', 'date', 'dateRange', 'organization'].includes(fieldType)) {
          standardType = fieldType as any;
        }

        return {
          ...config,
          fieldType: standardType,
        };
      });

      setFieldConfigs(normalizedConfigs);
    } else if (selectedPageCode) {
      // 如果没有配置数据，清空 fieldConfigs
      setFieldConfigs([]);
    }
    // 当 selectedPageCode 变化时，如果 pageConfigs 还没加载完成，保持当前状态
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageConfigs]);

  // 当切换页面时，清空 fieldConfigs
  useEffect(() => {
    if (!selectedPageCode) {
      setFieldConfigs([]);
    }
  }, [selectedPageCode]);

  // 保存配置
  const saveConfigMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingConfig?.id) {
        return request.put(`/hr/search-condition-configs/${editingConfig.id}`, data);
      } else {
        return request.post('/hr/search-condition-configs', data);
      }
    },
    onSuccess: () => {
      message.success(editingConfig ? '更新成功' : '添加成功');
      setIsModalOpen(false);
      form.resetFields();
      setEditingConfig(null);
      queryClient.invalidateQueries({ queryKey: ['searchConditionConfigs'] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '操作失败';
      message.error(errorMsg);
    },
  });

  // 删除配置
  const deleteConfigMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/hr/search-condition-configs/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['searchConditionConfigs'] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '删除失败';
      message.error(errorMsg);
    },
  });

  // 批量保存配置
  const batchSaveMutation = useMutation({
    mutationFn: (configs: PageFieldConfig[]) => {
      return request.post('/hr/search-condition-configs/batch', {
        pageCode: selectedPageCode,
        configs,
      });
    },
    onSuccess: () => {
      message.success('保存成功');
      queryClient.invalidateQueries({ queryKey: ['searchConditionConfigs'] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '保存失败';
      message.error(errorMsg);
    },
  });

  const handleAddConfig = () => {
    setEditingConfig(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEditConfig = (config: PageFieldConfig) => {
    setEditingConfig(config);
    form.setFieldsValue(config);
    setIsModalOpen(true);
  };

  const handleDeleteConfig = (id: number) => {
    deleteConfigMutation.mutate(id);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      saveConfigMutation.mutate({
        ...values,
        pageCode: selectedPageCode,
      });
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleSaveAll = () => {
    // 确保类型正确映射后再保存
    const configsToSave = fieldConfigs.map(config => {
      const fieldType = (config.fieldType || '').toLowerCase().trim();
      let mappedType: 'text' | 'select' | 'date' | 'dateRange' | 'organization' = 'text';

      // Normalize field types
      if (fieldType.includes('select') ||
          fieldType.includes('lookup') ||
          fieldType === 'select_single' ||
          fieldType === 'select_multi') {
        mappedType = 'select';
      } else if (fieldType.includes('date') && fieldType.includes('range')) {
        mappedType = 'dateRange';
      } else if (fieldType.includes('date')) {
        mappedType = 'date';
      } else if (fieldType.includes('organization')) {
        mappedType = 'organization';
      } else if (fieldType === 'text' || fieldType === 'string' || fieldType === 'varchar' ||
                 fieldType === 'number' || fieldType === 'int' || fieldType === 'decimal') {
        mappedType = 'text';
      } else if (['text', 'select', 'date', 'dateRange', 'organization'].includes(fieldType)) {
        mappedType = fieldType as any;
      }

      const result = {
        ...config,
        fieldType: mappedType,
      };

      console.log('Config type mapping:', {
        fieldCode: config.fieldCode,
        originalType: config.fieldType,
        normalizedType: fieldType,
        mappedType,
        result
      });

      return result;
    });

    console.log('Saving configs:', configsToSave);

    batchSaveMutation.mutate(configsToSave);
  };

  // 所有可用字段（基础字段 + 自定义字段）
  const allAvailableFields = [
    ...AVAILABLE_FIELDS,
    ...customFields.map((field: any) => {
      const fieldType = (field.type || field.fieldType || '').toLowerCase().trim();
      let mappedType = 'text';

      // Map various type representations to standard types
      if (fieldType.includes('select') ||
          fieldType.includes('lookup') ||
          fieldType === 'select_single' ||
          fieldType === 'select_multi') {
        mappedType = 'select';
      } else if (fieldType.includes('date')) {
        mappedType = 'date';
      } else if (fieldType.includes('organization')) {
        mappedType = 'organization';
      } else if (fieldType === 'text' || fieldType === 'string' || fieldType === 'varchar') {
        mappedType = 'text';
      } else if (fieldType === 'number' || fieldType === 'int' || fieldType === 'decimal') {
        mappedType = 'text';
      }

      const result = {
        code: field.code,
        name: field.name,
        type: mappedType,
        dataSource: field.dataSource?.code,
      };

      console.log('Custom field mapping:', {
        original: field,
        fieldType: field.type || field.fieldType,
        normalizedType: fieldType,
        mappedType,
        result
      });

      return result;
    }),
  ];

  const columns = [
    {
      title: '字段名称',
      dataIndex: 'fieldName',
      key: 'fieldName',
      width: 150,
    },
    {
      title: '字段类型',
      dataIndex: 'fieldType',
      key: 'fieldType',
      width: 120,
      render: (type: string) => {
        const typeMap: any = {
          text: '文本',
          select: '下拉选择',
          date: '日期',
          dateRange: '日期范围',
          organization: '组织树',
        };
        return typeMap[type] || type;
      },
    },
    {
      title: '是否启用',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      width: 100,
      render: (enabled: boolean, record: PageFieldConfig) => (
        <Switch
          checked={enabled}
          onChange={(checked) => {
            const newConfigs = fieldConfigs.map((config) =>
              config.fieldCode === record.fieldCode ? { ...config, isEnabled: checked } : config
            );
            setFieldConfigs(newConfigs);
          }}
        />
      ),
    },
    {
      title: '排序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 100,
      render: (order: number) => order,
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: PageFieldConfig) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditConfig(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteConfig(record.id!)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  // 已选字段
  const selectedFields = fieldConfigs.map((config) => config.fieldCode);
  // 未选字段
  const availableFieldsToAdd = allAvailableFields.filter(
    (field) => !selectedFields.includes(field.code)
  );

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Select
            placeholder="请选择要配置的页面"
            style={{ width: 250 }}
            value={selectedPageCode}
            onChange={setSelectedPageCode}
            options={AVAILABLE_PAGES.map((page) => ({
              label: page.name,
              value: page.code,
            }))}
          />
        </div>
        {selectedPageCode && fieldConfigs.length > 0 && (
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveAll}
          >
            保存配置
          </Button>
        )}
      </div>

      {!selectedPageCode ? (
        <div style={{ padding: '40px', textAlign: 'center', background: '#fafafa', borderRadius: 8 }}>
          <p style={{ color: '#999', marginBottom: 16 }}>请先选择要配置的页面</p>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: 16, background: '#e6f7ff', padding: 12, borderRadius: 8 }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>
              可用字段列表（点击添加）
            </div>
            <Space wrap>
              {availableFieldsToAdd.map((field) => (
                <Button
                  key={field.code}
                  size="small"
                  onClick={() => {
                    // 确保类型正确映射
                    const fieldType = (field.type || '').toLowerCase().trim();
                    let mappedType: 'text' | 'select' | 'date' | 'dateRange' | 'organization' = 'text';

                    if (fieldType.includes('select') ||
                        fieldType.includes('lookup') ||
                        fieldType === 'select_single' ||
                        fieldType === 'select_multi') {
                      mappedType = 'select';
                    } else if (fieldType.includes('date') && fieldType.includes('range')) {
                      mappedType = 'dateRange';
                    } else if (fieldType.includes('date')) {
                      mappedType = 'date';
                    } else if (fieldType.includes('organization')) {
                      mappedType = 'organization';
                    } else if (fieldType === 'text' || fieldType === 'string' || fieldType === 'varchar' ||
                               fieldType === 'number' || fieldType === 'int' || fieldType === 'decimal') {
                      mappedType = 'text';
                    } else if (['text', 'select', 'date', 'dateRange', 'organization'].includes(fieldType)) {
                      mappedType = fieldType as any;
                    }

                    const newConfig: PageFieldConfig = {
                      pageCode: selectedPageCode,
                      pageName: AVAILABLE_PAGES.find(p => p.code === selectedPageCode)?.name || '',
                      fieldCode: field.code,
                      fieldName: field.name,
                      fieldType: mappedType,
                      isEnabled: true,
                      sortOrder: fieldConfigs.length,
                      dataSourceCode: field.dataSource,
                    };

                    console.log('Adding field config:', {
                      field,
                      fieldType: field.type,
                      normalizedType: fieldType,
                      mappedType,
                      newConfig
                    });

                    setFieldConfigs([...fieldConfigs, newConfig]);
                  }}
                >
                  {field.name}
                </Button>
              ))}
            </Space>
          </div>

          <div style={{ background: '#f0f5ff', padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <div style={{ fontWeight: 600 }}>
              页面名称：{AVAILABLE_PAGES.find(p => p.code === selectedPageCode)?.name}
            </div>
            <div style={{ marginTop: 8, color: '#666' }}>
              已配置字段：{fieldConfigs.length} 个
            </div>
          </div>

          <Table
            columns={columns}
            dataSource={fieldConfigs}
            rowKey="fieldCode"
            pagination={false}
            rowSelection={{
              selectedRowKeys: fieldConfigs.filter(f => f.isEnabled).map(f => f.fieldCode),
              type: 'checkbox',
              onChange: (selectedKeys) => {
                const newConfigs = fieldConfigs.map((config) => ({
                  ...config,
                  isEnabled: selectedKeys.includes(config.fieldCode),
                }));
                setFieldConfigs(newConfigs);
              },
            }}
          />
        </div>
      )}

      {/* 编辑/添加字段配置弹窗 */}
      <Modal
        title={editingConfig ? '编辑字段配置' : '添加字段配置'}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setEditingConfig(null);
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="fieldName"
            label="字段名称"
            rules={[{ required: true, message: '请输入字段名称' }]}
          >
            <Input placeholder="如：员工工号" disabled />
          </Form.Item>

          <Form.Item
            name="fieldCode"
            label="字段编码"
            rules={[{ required: true, message: '请输入字段编码' }]}
          >
            <Input placeholder="如：employeeNo" disabled={!!editingConfig} />
          </Form.Item>

          <Form.Item
            name="fieldType"
            label="字段类型"
            rules={[{ required: true, message: '请选择字段类型' }]}
          >
            <Select disabled={!!editingConfig}>
              <Select.Option value="text">文本</Select.Option>
              <Select.Option value="select">下拉选择</Select.Option>
              <Select.Option value="date">日期</Select.Option>
              <Select.Option value="dateRange">日期范围</Select.Option>
              <Select.Option value="organization">组织树</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="isEnabled"
            label="是否启用"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="sortOrder"
            label="排序"
            rules={[{ required: true, message: '请输入排序' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SearchConditionsConfig;
