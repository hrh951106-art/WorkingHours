import { useState, useMemo } from 'react';
import { Card, Form, Select, Button, message, Spin, Space, Typography, Row, Col, Empty, Table, Modal, InputNumber, Input, DatePicker, Switch } from 'antd';
import { AppstoreOutlined, PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import dayjs from 'dayjs';

const { Text } = Typography;

const ProductStandardHoursConfigPage: React.FC = () => {
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isGlobalConfig, setIsGlobalConfig] = useState(false);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 筛选条件
  const [filters, setFilters] = useState({
    productKeyword: '',
    accountPathKeyword: '',
  });

  // 获取系统配置
  const { data: systemConfigs = [] } = useQuery({
    queryKey: ['allocationSystemConfigs'],
    queryFn: () =>
      request.get('/hr/system-configs').then((res: any) => res || []),
  });

  // 获取配置的标准工时层级
  const standardHoursLevelsConfig = systemConfigs.find(
    (c: any) => c.configKey === 'standardHoursHierarchyLevels'
  );
  const selectedLevelIds = standardHoursLevelsConfig?.configValue
    ? standardHoursLevelsConfig.configValue.split(',').map(Number)
    : [];

  // 获取层级列表
  const { data: hierarchyLevels = [] } = useQuery({
    queryKey: ['hierarchy-levels'],
    queryFn: () =>
      request.get('/account/hierarchy-config/levels').then((res: any) => res || []),
    enabled: selectedLevelIds.length > 0,
  });

  // 选择的层级详情
  const selectedLevels = hierarchyLevels.filter((level: any) =>
    selectedLevelIds.includes(level.id)
  );

  // 获取层级明细（带选项）
  const { data: hierarchyLevelsWithDetails = [] } = useQuery({
    queryKey: ['hierarchy-levels-with-details'],
    queryFn: () =>
      request.get('/account/hierarchy-config/levels/with-details').then((res: any) => res || []),
  });

  // 过滤出选择的层级（包含明细）
  const selectedLevelsWithDetails = hierarchyLevelsWithDetails.filter((level: any) =>
    selectedLevelIds.includes(level.id)
  );

  // 从层级明细中提取选项
  const hierarchyLevelOptions = useMemo(() => {
    const optionsMap: Record<number, any[]> = {};

    selectedLevelsWithDetails.forEach((level: any) => {
      if (level.details && Array.isArray(level.details)) {
        const activeDetails = level.details.filter((detail: any) => detail.status === 'ACTIVE');
        optionsMap[level.id] = activeDetails.map((detail: any) => ({
          id: detail.id,
          value: detail.id,
          label: detail.levelName,
          code: detail.levelCode,
        }));
      } else {
        optionsMap[level.id] = [];
      }
    });

    return optionsMap;
  }, [selectedLevelsWithDetails]);

  // 获取产品列表
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products', 'datasource'],
    queryFn: async () => {
      const dataSources = await request.get('/hr/data-sources');
      const productDataSource = dataSources.find((ds: any) => ds.code === 'PRODUCT');
      if (productDataSource) {
        const options = await request.get(`/hr/data-sources/${productDataSource.id}/options`);
        return options || [];
      }
      return [];
    },
  });

  // 获取所有产品标准配置列表
  const { data: configurations = [], isLoading: configsLoading, refetch } = useQuery({
    queryKey: ['productStandardHoursConfigs'],
    queryFn: async () => {
      const result = await request.get(`/allocation/standard-hour-by-levels`, {
        params: { pageSize: 9999 },
      });
      const data = result?.items || result || [];

      const sortedData = data.sort((a: any, b: any) => {
        const accountPathA = a.accountPath || '-';
        const accountPathB = b.accountPath || '-';

        if (accountPathA !== accountPathB) {
          return accountPathA.localeCompare(accountPathB, 'zh-CN');
        }

        const dateA = a.effectiveDate ? new Date(a.effectiveDate).getTime() : 0;
        const dateB = b.effectiveDate ? new Date(b.effectiveDate).getTime() : 0;
        return dateB - dateA;
      });

      return sortedData;
    },
  });

  // 创建/更新配置
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const product = products.find((p: any) =>
        String(p.id) === String(data.productId) ||
        parseInt(p.id) === parseInt(data.productId)
      );

      if (!product) {
        throw new Error('产品不存在，请重新选择产品');
      }

      if (!data.standardHours && data.standardHours !== 0) {
        throw new Error('请输入标准');
      }

      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      let accountPath = '';
      let hierarchyLevelId = null;
      let hierarchyLevelName = '';
      let hierarchyOptionValue = '';
      let hierarchyOptionLabel = '';

      if (data.isGlobalConfig) {
        accountPath = '-';
      } else {
        const filledLevels = selectedLevels.filter((level: any) => {
          const value = data[`hierarchyOption_${level.id}`];
          return value !== undefined && value !== null && value !== '';
        });

        if (filledLevels.length > 0) {
          const accountPathParts = filledLevels.map((level: any) => {
            const optionValue = data[`hierarchyOption_${level.id}`];
            const options = hierarchyLevelOptions[level.id] || [];
            const option = options.find((o: any) =>
              String(o.value) === String(optionValue) ||
              String(o.id) === String(optionValue)
            );
            return option?.label || option?.optionLabel || String(optionValue);
          });

          accountPath = accountPathParts.join('/');

          const firstLevel = filledLevels[0];
          const firstOptionValue = data[`hierarchyOption_${firstLevel.id}`];
          const firstOptions = hierarchyLevelOptions[firstLevel.id] || [];
          const firstOption = firstOptions.find((o: any) =>
            String(o.value) === String(firstOptionValue) ||
            String(o.id) === String(firstOptionValue)
          );

          hierarchyLevelId = firstLevel.id;
          hierarchyLevelName = firstLevel.name;
          hierarchyOptionValue = String(firstOptionValue);
          hierarchyOptionLabel = firstOption?.label || firstOption?.optionLabel || String(firstOptionValue);
        } else {
          accountPath = '-';
        }
      }

      const payload = {
        productId: parseInt(product.id),
        productCode: product.value || '',
        productName: product.label ? (product.label.split(' - ')[1] || product.label) : '',
        hierarchyLevelId,
        hierarchyLevelName,
        hierarchyOptionValue,
        hierarchyOptionLabel,
        accountPath,
        standardHours: parseFloat(data.standardHours) || 0,
        quantity: data.quantity ? parseFloat(data.quantity) : null,
        effectiveDate: data.effectiveDate ? data.effectiveDate.format('YYYY-MM-DD') : null,
        expiryDate: data.expiryDate ? data.expiryDate.format('YYYY-MM-DD') : null,
        createdById: user?.id || 1,
        createdByName: user?.name || 'Admin',
      };

      if (editingRecord && editingRecord.id) {
        return request.put(`/allocation/standard-hour-by-levels/${editingRecord.id}`, payload);
      } else {
        return request.post(`/allocation/standard-hour-by-levels`, payload);
      }
    },
    onSuccess: () => {
      message.success('保存成功');
      queryClient.invalidateQueries({ queryKey: ['productStandardHoursConfigs'] });
      handleModalCancel();
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '保存失败';
      message.error(errorMsg);
    },
  });

  // 删除配置
  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      return request.delete(`/allocation/standard-hour-by-levels/${id}`);
    },
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['productStandardHoursConfigs'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '删除失败');
    },
  });

  const handleAdd = () => {
    if (!selectedProduct) {
      message.warning('请先选择左侧的产品');
      return;
    }
    setEditingRecord(null);
    setIsGlobalConfig(false);
    form.resetFields();
    form.setFieldsValue({
      productId: selectedProduct.id,
      isGlobalConfig: false,
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);

    const isGlobal = !record.accountPath || record.accountPath === '-';
    setIsGlobalConfig(isGlobal);

    const formValues: any = {
      productId: record.productId,
      isGlobalConfig: isGlobal,
      standardHours: record.standardHours,
      quantity: record.quantity,
      effectiveDate: record.effectiveDate ? dayjs(record.effectiveDate) : null,
      expiryDate: record.expiryDate ? dayjs(record.expiryDate) : null,
    };

    if (!isGlobal && record.accountPath) {
      const pathParts = record.accountPath.split('/');
      selectedLevels.forEach((level: any, index: number) => {
        if (index < pathParts.length) {
          const options = hierarchyLevelOptions[level.id] || [];
          const matchedOption = options.find((o: any) => o.label === pathParts[index]);
          if (matchedOption) {
            formValues[`hierarchyOption_${level.id}`] = matchedOption.value;
          }
        }
      });
    }

    form.setFieldsValue(formValues);
    setIsModalVisible(true);
  };

  const handleDelete = (record: any) => {
    const configId = record.id;
    if (!configId) {
      message.error('找不到配置记录');
      return;
    }

    deleteMutation.mutate(configId);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setEditingRecord(null);
    setIsGlobalConfig(false);
    form.resetFields();
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      saveMutation.mutate(values);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 按产品分组配置数据
  const productConfigGroups = useMemo(() => {
    const groups: Record<number, any[]> = {};

    configurations.forEach((config: any) => {
      if (!groups[config.productId]) {
        groups[config.productId] = [];
      }
      groups[config.productId].push(config);
    });

    return groups;
  }, [configurations]);

  // 过滤后的产品列表（左侧显示）
  const filteredProducts = useMemo(() => {
    let result = products;

    if (filters.productKeyword) {
      const keyword = filters.productKeyword.toLowerCase();
      result = result.filter((p: any) =>
        p.value?.toLowerCase().includes(keyword) ||
        p.label?.toLowerCase().includes(keyword)
      );
    }

    return result;
  }, [products, filters.productKeyword]);

  // 当前选中产品的配置列表（右侧显示）
  const selectedProductConfigs = useMemo(() => {
    if (!selectedProduct) return [];

    let configs = productConfigGroups[selectedProduct.id] || [];

    if (filters.accountPathKeyword) {
      const keyword = filters.accountPathKeyword.toLowerCase();
      configs = configs.filter((config: any) =>
        config.accountPath?.toLowerCase().includes(keyword)
      );
    }

    return configs.map((config: any) => ({
      ...config,
      productCode: selectedProduct.value,
      productName: selectedProduct.label?.split(' - ')[1] || selectedProduct.label,
    }));
  }, [productConfigGroups, selectedProduct, filters.accountPathKeyword]);

  const columns = [
    {
      title: '劳动力账户',
      dataIndex: 'accountPath',
      key: 'accountPath',
      render: (accountPath: string) => {
        if (accountPath && accountPath !== '-') {
          return <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{accountPath}</span>;
        }
        return <span style={{ color: '#52c41a', fontWeight: 500 }}>全局配置</span>;
      },
    },
    {
      title: '生效日期',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '失效日期',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '标准',
      dataIndex: 'standardHours',
      width: 180,
      align: 'center' as const,
      render: (hours: number, record: any) => {
        if (record.quantity && hours) {
          return (
            <span style={{ fontWeight: 500, color: '#52c41a' }}>
              {record.quantity}件/{hours}
            </span>
          );
        }
        if (hours) {
          return (
            <span style={{ fontWeight: 500, color: '#52c41a' }}>
              {hours}
            </span>
          );
        }
        return <span style={{ color: '#999' }}>-</span>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  if (productsLoading || configsLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <AppstoreOutlined />
            <span>产品标准配置</span>
          </Space>
        }
      >
        <Row gutter={16} style={{ height: 'calc(100vh - 300px)' }}>
          {/* 左侧：产品列表 */}
          <Col span={8} style={{ borderRight: '1px solid var(--color-border-1)', paddingRight: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <Input
                placeholder="搜索产品编码或名称"
                allowClear
                style={{ width: '100%' }}
                value={filters.productKeyword}
                onChange={(e) => setFilters({ ...filters, productKeyword: e.target.value })}
                suffix={<SearchOutlined style={{ color: '#bbb' }} />}
              />
            </div>

            <div
              style={{
                height: 'calc(100% - 60px)',
                overflowY: 'auto',
                border: '1px solid var(--color-border-1)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              {filteredProducts.map((product: any) => {
                const configCount = (productConfigGroups[product.id] || []).length;
                const isSelected = selectedProduct?.id === product.id;

                return (
                  <div
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--color-border-1)',
                      cursor: 'pointer',
                      background: isSelected ? '#e8f8f0' : 'transparent',
                      borderLeft: isSelected ? '3px solid #00B365' : '3px solid transparent',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'var(--color-bg-light)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{ fontWeight: 500, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>
                        {product.label?.split(' - ')[1] || product.label}
                        <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 400 }}>
                          {product.value}
                        </span>
                      </span>
                      {isSelected && (
                        <span style={{ color: '#00B365', fontSize: 16 }}>✓</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                      {configCount} 个账户配置
                    </div>
                  </div>
                );
              })}
            </div>
          </Col>

          {/* 右侧：选中产品的工时配置 */}
          <Col span={16}>
            {!selectedProduct ? (
              <div style={{ textAlign: 'center', padding: '80px 40px', color: 'var(--color-text-secondary)' }}>
                <AppstoreOutlined style={{ fontSize: 64, marginBottom: 16, color: 'var(--color-border-3)' }} />
                <div>请从左侧选择产品查看配置</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                    <Space>
                      <Text strong style={{ fontSize: 16 }}>
                        {selectedProduct.label?.split(' - ')[1] || selectedProduct.label}
                      </Text>
                      <Text type="secondary">({selectedProduct.value})</Text>
                    </Space>
                    <Space>
                      <Input
                        placeholder="搜索劳动力账户"
                        allowClear
                        style={{ width: 200 }}
                        value={filters.accountPathKeyword}
                        onChange={(e) => setFilters({ ...filters, accountPathKeyword: e.target.value })}
                        suffix={<SearchOutlined style={{ color: '#bbb' }} />}
                      />
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAdd}
                      >
                        新增
                      </Button>
                    </Space>
                  </Space>
                </div>

                <Table
                  columns={columns}
                  dataSource={selectedProductConfigs}
                  loading={configsLoading}
                  rowKey="id"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `共 ${total} 条`,
                  }}
                  scroll={{ x: 600 }}
                  locale={{
                    emptyText: (
                      <Empty
                        description={
                          <div>
                            <div>该产品暂无配置</div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 8 }}>
                              点击上方"新增"按钮添加
                            </div>
                          </div>
                        }
                      />
                    ),
                  }}
                />
              </>
            )}
          </Col>
        </Row>

        {/* 编辑弹窗 */}
        <Modal
          title={editingRecord?.id ? '编辑' : '新增'}
          open={isModalVisible}
          onOk={handleModalSubmit}
          onCancel={handleModalCancel}
          confirmLoading={saveMutation.isPending}
          width={600}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              label="产品"
              name="productId"
              rules={[{ required: true, message: '请选择产品' }]}
            >
              <Select
                placeholder="请选择产品"
                showSearch
                optionFilterProp="label"
                disabled={!!editingRecord || !!selectedProduct}
                options={products.map((p: any) => ({
                  label: p.label,
                  value: p.id,
                }))}
              />
            </Form.Item>

            {selectedLevelIds.length > 0 && (
              <Form.Item
                label="全局配置"
                name="isGlobalConfig"
                valuePropName="checked"
              >
                <Switch
                  checked={isGlobalConfig}
                  onChange={(checked) => setIsGlobalConfig(checked)}
                />
              </Form.Item>
            )}

            {selectedLevelIds.length > 0 && !isGlobalConfig && selectedLevels.map((level: any) => (
              <Form.Item
                key={level.id}
                label={level.name}
                name={`hierarchyOption_${level.id}`}
                rules={[{ required: true, message: `请选择${level.name}，此项为必填项` }]}
              >
                <Select
                  placeholder={`请选择${level.name}`}
                  showSearch
                  optionFilterProp="label"
                  allowClear
                  options={hierarchyLevelOptions[level.id]?.map((opt: any) => ({
                    label: opt.label,
                    value: opt.value,
                  })) || []}
                />
              </Form.Item>
            ))}

            <Form.Item label="标准">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="quantity"
                    tooltip="可选，用于记录批量生产时的数量"
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      min={0}
                      step={1}
                      precision={0}
                      style={{ width: '100%' }}
                      addonAfter="件"
                      placeholder="件数"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="standardHours"
                    rules={[{ required: true, message: '请输入标准' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      min={0}
                      step={0.1}
                      precision={2}
                      style={{ width: '100%' }}
                      placeholder="标准"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form.Item>

            <Form.Item label="生效日期">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="effectiveDate"
                    rules={[{ required: true, message: '请选择生效日期' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      placeholder="请选择生效日期"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="expiryDate"
                    style={{ marginBottom: 0 }}
                    rules={[
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          const effectiveDate = getFieldValue('effectiveDate');
                          if (value && effectiveDate && value.isBefore(effectiveDate, 'day')) {
                            return Promise.reject(new Error('失效日期不能小于生效日期'));
                          }
                          return Promise.resolve();
                        },
                      }),
                    ]}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      placeholder="请选择失效日期（可选）"
                      allowClear
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </div>
  );
};

export default ProductStandardHoursConfigPage;
