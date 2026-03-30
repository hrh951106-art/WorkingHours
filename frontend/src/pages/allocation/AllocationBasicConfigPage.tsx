import { useState } from 'react';
import { Card, Form, Select, Button, message, Spin, Space, Divider, Typography, Row, Col, Empty, Tabs } from 'antd';
import { SaveOutlined, ReloadOutlined, AppstoreOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

const { Title, Text } = Typography;

// ============ 产品配置组件 ============
interface Product {
  id?: number;
  code: string;
  name: string;
  unit?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const ProductConfig: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 查询条件
  const [filters, setFilters] = useState({
    code: '',
    name: '',
    status: null as string | null,
  });

  // 获取产品列表
  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['products', filters],
    queryFn: () =>
      request.get('/allocation/products', {
        params: {
          code: filters.code || undefined,
          name: filters.name || undefined,
          status: filters.status || undefined,
        },
      }).then((res: any) => res?.items || []),
  });

  // 创建产品
  const createMutation = useMutation({
    mutationFn: (data: Product) =>
      request.post('/allocation/products', data),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      handleCancel();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '创建失败');
    },
  });

  // 更新产品
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Product) =>
      request.put(`/allocation/products/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      handleCancel();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '更新失败');
    },
  });

  // 删除产品
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      request.delete(`/allocation/products/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '删除失败');
    },
  });

  const handleCreate = () => {
    setEditingProduct(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'ACTIVE',
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record: Product) => {
    setEditingProduct(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 获取当前用户信息
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (editingProduct?.id) {
        updateMutation.mutate({
          id: editingProduct.id,
          ...values,
          updatedById: user?.id,
          updatedByName: user?.name,
        });
      } else {
        createMutation.mutate({
          ...values,
          createdById: user?.id || 1,
          createdByName: user?.name || '系统管理员',
        });
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingProduct(null);
    form.resetFields();
  };

  const columns = [
    {
      title: '产品编码',
      dataIndex: 'code',
      key: 'code',
      width: 150,
    },
    {
      title: '产品名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
      render: (unit: string) => unit || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          'ACTIVE': { text: '启用', color: 'green' },
          'INACTIVE': { text: '停用', color: 'red' },
        };
        const statusInfo = statusMap[status] || { text: status, color: 'default' };
        return <span style={{ color: statusInfo.color === 'green' ? '#52c41a' : statusInfo.color === 'red' ? '#ff4d4f' : '#999' }}>
          {statusInfo.text}
        </span>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: Product) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => record.id && handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 120 }}
          value={filters.status}
          onChange={(value) => setFilters({ ...filters, status: value })}
        >
          <Select.Option value="ACTIVE">启用</Select.Option>
          <Select.Option value="INACTIVE">停用</Select.Option>
        </Select>
        <Button type="primary" onClick={() => refetch()}>
          查询
        </Button>
        <Button onClick={() => setFilters({ code: '', name: '', status: null })}>
          重置
        </Button>
        <Button type="primary" onClick={handleCreate}>
          新增产品
        </Button>
      </Space>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#fafafa' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: '12px 8px',
                  textAlign: 'left',
                  borderBottom: '1px solid #f0f0f0',
                  fontWeight: 500,
                  minWidth: col.width,
                }}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={5} style={{ padding: 40, textAlign: 'center' }}>
                <Spin />
              </td>
            </tr>
          ) : products && products.length > 0 ? (
            products.map((record: Product, index: number) => (
              <tr key={record.id || index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '12px 8px' }}>{record.code}</td>
                <td style={{ padding: '12px 8px' }}>{record.name}</td>
                <td style={{ padding: '12px 8px' }}>{record.unit || '-'}</td>
                <td style={{ padding: '12px 8px' }}>
                  {columns[3].render(record.status, record)}
                </td>
                <td style={{ padding: '12px 8px' }}>
                  {columns[4].render(null, record)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#999' }}>
                暂无数据
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 产品编辑弹窗 */}
      {isModalVisible && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: 8,
            padding: 24,
            width: 500,
            maxWidth: '90%',
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>
              {editingProduct ? '编辑产品' : '新增产品'}
            </div>
            <Form form={form} layout="vertical">
              <Form.Item
                label="产品编码"
                name="code"
                rules={[
                  { required: true, message: '请输入产品编码' },
                  { pattern: /^[A-Z0-9_-]+$/, message: '产品编码只能包含大写字母、数字、下划线和连字符' },
                ]}
              >
                <input placeholder="如：PROD-001" style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: 4 }} />
              </Form.Item>

              <Form.Item
                label="产品名称"
                name="name"
                rules={[{ required: true, message: '请输入产品名称' }]}
              >
                <input placeholder="请输入产品名称" style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: 4 }} />
              </Form.Item>

              <Form.Item
                label="单位"
                name="unit"
                tooltip="可选，产品计量单位，如：件、台、套等"
              >
                <input placeholder="如：件" style={{ width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: 4 }} />
              </Form.Item>

              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select>
                  <Select.Option value="ACTIVE">启用</Select.Option>
                  <Select.Option value="INACTIVE">停用</Select.Option>
                </Select>
              </Form.Item>
            </Form>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
              <Button onClick={handleCancel}>
                取消
              </Button>
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={createMutation.isPending || updateMutation.isPending}
              >
                确定
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============ 通用配置组件 ============
const GeneralConfig: React.FC = () => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取劳动力账户层级配置
  const { data: hierarchyLevels = [], isLoading: levelsLoading } = useQuery({
    queryKey: ['hierarchy-levels'],
    queryFn: () =>
      request.get('/account/hierarchy-config/levels').then((res: any) => res || []),
  });

  // 获取班次属性定义列表
  const { data: shiftPropertyDefinitions = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['shiftPropertyDefinitions'],
    queryFn: () =>
      request.get('/shift/property-definitions').then((res: any) => res || []),
  });

  // 获取系统配置
  const { data: systemConfigs = [], isLoading: configsLoading } = useQuery({
    queryKey: ['allocationSystemConfigs'],
    queryFn: () =>
      request.get('/hr/system-configs').then((res: any) => res || []),
  });

  // 获取出勤代码列表（用于工时代码配置）
  const { data: attendanceCodes = [], isLoading: codesLoading } = useQuery({
    queryKey: ['attendanceCodes'],
    queryFn: () =>
      request.get('/allocation/attendance-codes').then((res: any) => res || []),
  });

  // 获取所有班次及其属性(用于根据属性筛选)
  const { data: allShifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['allShiftsWithProperties'],
    queryFn: async () => {
      const shifts = await request.get('/shift/shifts').then((res: any) => res?.items || res || []);

      // 为每个班次获取属性
      const shiftsWithProperties = await Promise.all(
        shifts.map(async (shift: any) => {
          try {
            const properties = await request.get(`/shift/shifts/${shift.id}/properties`).then((res: any) => res || []);
            // 提取属性键列表
            const propertyKeys = properties.map((p: any) => p.propertyKey);
            return {
              ...shift,
              propertyKeys,
            };
          } catch (error) {
            return {
              ...shift,
              propertyKeys: [],
            };
          }
        })
      );

      return shiftsWithProperties;
    },
  });

  // 使用 Form.useWatch 在组件顶层
  const selectedPropertyKeys = Form.useWatch('productionLineShiftPropertyKeys', form) || [];

  // 保存配置
  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      // 根据选择的属性筛选班次ID
      const selectedPropertyKeys = values.productionLineShiftPropertyKeys || [];
      const filteredShiftIds = allShifts
        .filter((shift: any) =>
          selectedPropertyKeys.some((key: string) => shift.propertyKeys?.includes(key))
        )
        .map((shift: any) => shift.id);

      const configs = [
        {
          configKey: 'productionLineHierarchyLevel',
          configValue: values.productionLineHierarchyLevel || '',
          category: 'WORK_HOURS',
          description: '产线对应层级',
        },
        {
          configKey: 'productionLineShiftPropertyKeys',
          configValue: selectedPropertyKeys.join(',') || '',
          category: 'WORK_HOURS',
          description: '产线开线班次属性',
        },
        {
          configKey: 'productionLineShiftIds',
          configValue: filteredShiftIds.join(',') || '',
          category: 'WORK_HOURS',
          description: '产线班次ID列表(自动根据属性生成)',
        },
        {
          configKey: 'actualHoursAllocationCode',
          configValue: values.actualHoursAllocationCode || '',
          category: 'ALLOCATION',
          description: '按实际工时方式分配的工时代码',
        },
        {
          configKey: 'indirectHoursAllocationCode',
          configValue: values.indirectHoursAllocationCode || '',
          category: 'ALLOCATION',
          description: '间接工时分配后的工时代码',
        },
      ];

      // 更新或创建每个配置
      await Promise.all(
        configs.map((config) => {
          const existing = systemConfigs.find((c: any) => c.configKey === config.configKey);
          if (existing) {
            return request.put(`/hr/system-configs/${config.configKey}`, {
              configValue: config.configValue,
              description: config.description,
            });
          } else {
            return request.post('/hr/system-configs', config);
          }
        })
      );
    },
    onSuccess: () => {
      message.success('保存成功');
      queryClient.invalidateQueries({ queryKey: ['allocationSystemConfigs'] });
      queryClient.invalidateQueries({ queryKey: ['systemConfigs'] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '保存失败';
      message.error(errorMsg);
    },
  });

  // 初始化表单数据
  const getInitialValues = () => {
    const productionLineConfig = systemConfigs.find(
      (c: any) => c.configKey === 'productionLineHierarchyLevel'
    );
    const shiftPropertiesConfig = systemConfigs.find(
      (c: any) => c.configKey === 'productionLineShiftPropertyKeys'
    );
    const actualHoursCodeConfig = systemConfigs.find(
      (c: any) => c.configKey === 'actualHoursAllocationCode'
    );
    const indirectHoursCodeConfig = systemConfigs.find(
      (c: any) => c.configKey === 'indirectHoursAllocationCode'
    );

    const propertyKeys = shiftPropertiesConfig?.configValue
      ? shiftPropertiesConfig.configValue.split(',').filter((key: string) => key)
      : [];

    return {
      productionLineHierarchyLevel: productionLineConfig?.configValue || undefined,
      productionLineShiftPropertyKeys: propertyKeys,
      actualHoursAllocationCode: actualHoursCodeConfig?.configValue || undefined,
      indirectHoursAllocationCode: indirectHoursCodeConfig?.configValue || undefined,
    };
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      saveMutation.mutate(values);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  if (levelsLoading || configsLoading || propertiesLoading || codesLoading || shiftsLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Form
        form={form}
        layout="vertical"
        initialValues={getInitialValues()}
      >
        <Title level={5}>产线配置</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          配置产线对应的组织层级和可用班次，用于开线维护和产量记录中的筛选
        </Text>

        <Form.Item
          name="productionLineHierarchyLevel"
          label="产线对应层级"
          tooltip="选择后，开线维护和产量记录中的组织选择将限制为该类型的组织"
        >
          <Select
            placeholder="请选择产线对应的层级"
            allowClear
            showSearch
            optionFilterProp="label"
          >
            {hierarchyLevels.map((level: any) => (
              <Select.Option key={level.id} value={String(level.id)} label={level.name}>
                {level.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="productionLineShiftPropertyKeys"
          label="产线开线班次属性"
          tooltip="选择班次属性后,开线维护和产量记录中的班次选择将限制为具有这些属性的班次"
          rules={[{ type: 'array', message: '请选择产线开线班次属性' }]}
        >
          <Select
            mode="multiple"
            placeholder="请选择产线开线班次属性"
            allowClear
            showSearch
            optionFilterProp="label"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {shiftPropertyDefinitions
              .filter((prop: any) => prop.status === 'ACTIVE')
              .map((prop: any) => (
                <Select.Option
                  key={prop.propertyKey}
                  value={prop.propertyKey}
                  label={prop.name}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{prop.name}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>
                      {prop.propertyKey}
                    </div>
                  </div>
                </Select.Option>
              ))}
          </Select>
        </Form.Item>

        {selectedPropertyKeys.length > 0 && (
          <div style={{ marginTop: -12, marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: '#999' }}>
              匹配的班次数量: <strong>
                {allShifts.filter((shift: any) =>
                  selectedPropertyKeys.some((key: string) => shift.propertyKeys?.includes(key))
                ).length}
              </strong> 个
            </span>
          </div>
        )}

        <Divider />

        <Title level={5}>间接分摊配置</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          配置间接工时分摊过程中的工时代码，用于标识不同类型的工时记录
        </Text>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="actualHoursAllocationCode"
              label="按实际工时方式分配的工时代码"
              tooltip="用于标识按实际工时比例分配间接工时后生成的工时记录"
              rules={[{ required: true, message: '请选择工时代码' }]}
            >
              <Select
                placeholder="请选择工时代码"
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {attendanceCodes.map((code: any) => (
                  <Select.Option
                    key={code.code}
                    value={code.code}
                    label={`${code.name} (${code.code})`}
                  >
                    {code.name} ({code.code})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="indirectHoursAllocationCode"
              label="间接工时分配后的工时代码"
              tooltip="用于标识间接工时分配完成后生成的工时记录代码"
              rules={[{ required: true, message: '请选择工时代码' }]}
            >
              <Select
                placeholder="请选择工时代码"
                allowClear
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {attendanceCodes.map((code: any) => (
                  <Select.Option
                    key={code.code}
                    value={code.code}
                    label={`${code.name} (${code.code})`}
                  >
                    {code.name} ({code.code})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        <Title level={5}>配置说明</Title>
        <div style={{ background: '#f0f5ff', padding: 16, borderRadius: 8 }}>
          <Text>
            • <strong>产线对应层级</strong>：配置后，新增开线维护和产量记录时，组织选择将自动过滤为该类型的组织，不再需要手动从组织树中选择<br />
            • <strong>产线开线班次属性</strong>：配置后，开线维护和产量记录中的班次选择将限制为具有指定属性的班次，避免选择错误的班次。可在"排班管理 - 班次管理"中维护班次属性<br />
            • 配置前请确保已在"劳动力账户 - 层级配置"中创建相应的组织层级<br />
            • 修改此配置后，仅在新增开线和产量记录时生效，已存在的记录不受影响
          </Text>
        </div>

        <Divider />

        <div style={{ textAlign: 'right' }}>
          <Space>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['allocationSystemConfigs'] })}>
              重置
            </Button>
            <Button
              type="primary"
              onClick={handleSave}
              loading={saveMutation.isPending}
            >
              保存配置
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
};

// ============ 主配置页面 ============
const AllocationBasicConfigPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('general');

  return (
    <div>
      {/* 顶部绿色标题栏 */}
      <div
        style={{
          background: '#22B970',
          padding: '16px 24px',
          borderRadius: '8px 8px 0 0',
          marginBottom: 0,
        }}
      >
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          工时基础配置
        </Title>
      </div>

      {/* 主体内容 */}
      <Card
        bordered={false}
        style={{
          borderRadius: '0 0 8px 8px',
          borderTop: 'none',
        }}
        bodyStyle={{
          padding: '24px',
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarStyle={{
            marginBottom: 24,
          }}
          items={[
            {
              key: 'general',
              label: (
                <span>
                  <SettingOutlined />
                  工时基础配置
                </span>
              ),
            },
            {
              key: 'product',
              label: (
                <span>
                  <AppstoreOutlined />
                  产品配置
                </span>
              ),
            },
          ]}
        />
        {activeTab === 'general' && <GeneralConfig />}
        {activeTab === 'product' && <ProductConfig />}
      </Card>
    </div>
  );
};

export default AllocationBasicConfigPage;
