import { useState, useEffect, useMemo } from 'react';
import { Card, Form, Select, Button, message, Spin, Space, Typography, Row, Col, Empty, Tabs, Table, Tree, Modal, InputNumber, Input, DatePicker, Switch } from 'antd';
import { AppstoreOutlined, SettingOutlined, PlusOutlined, DeleteOutlined, EditOutlined, ClockCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import dayjs from 'dayjs';

const { Text } = Typography;

// ============ 产品配置组件 ============
interface Product {
  id?: number;
  code: string;
  name: string;
  unit?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const ProductConfig: React.FC = () => {
  // 查询条件
  const [filters, setFilters] = useState({
    keyword: '',
  });

  // 获取产品列表（从数据源获取）
  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['products', 'datasource', filters],
    queryFn: async () => {
      const dataSources = await request.get('/hr/data-sources');
      const productDataSource = dataSources.find((ds: any) => ds.code === 'PRODUCT');
      if (productDataSource) {
        const options = await request.get(`/hr/data-sources/${productDataSource.id}/options`);
        let filteredOptions = options || [];

        // 客户端过滤
        if (filters.keyword) {
          filteredOptions = filteredOptions.filter((item: any) =>
            item.label?.toLowerCase().includes(filters.keyword.toLowerCase()) ||
            item.value?.toLowerCase().includes(filters.keyword.toLowerCase())
          );
        }

        return filteredOptions.map((item: any) => ({
          id: item.id,
          code: item.value,
          name: item.label.split(' - ')[1] || item.label,
          unit: '-',
          status: 'ACTIVE',
        }));
      }
      return [];
    },
  });

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
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜索产品编码或名称"
          allowClear
          style={{ width: 200 }}
          value={filters.keyword}
          onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
        />
        <Button type="primary" onClick={() => refetch()}>
          查询
        </Button>
        <Button onClick={() => setFilters({ keyword: '' })}>
          重置
        </Button>
      </Space>

      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          产品数据来自查找项配置。如需管理产品，请到"系统配置 - 查找项管理"中进行维护。
        </Text>
      </div>

      <Table
        columns={columns}
        dataSource={products}
        loading={isLoading}
        rowKey="id"
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
      />
    </div>
  );
};

// ============ 产品标准配置组件 ============
interface ProductStandardHourConfig {
  id?: number;
  productId: number;
  productCode: string;
  productName: string;
  hierarchyLevelId: number;
  hierarchyLevelName: string;
  hierarchyOptionValue: string;
  hierarchyOptionLabel: string;
  quantity?: number; // 件数
  standardHours: number; // 总工时
  accountPath: string;
  effectiveDate?: string; // 生效日期
  expiryDate?: string; // 失效日期
}

const ProductStandardHoursConfig: React.FC = () => {
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null); // 选中的产品
  const [isGlobalConfig, setIsGlobalConfig] = useState(false); // 全局配置开关
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
        // 过滤出活跃状态的明细
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
      // 获取所有数据，不使用分页
      const result = await request.get(`/allocation/standard-hour-by-levels`, {
        params: { pageSize: 9999 },
      });
      const data = result?.items || result || [];
      console.log('[产品标准配置] 获取到的数据:', data);
      console.log('[产品标准配置] 数据条数:', data.length);

      // 排序：按账户路径升序，相同账户按生效日期降序
      const sortedData = data.sort((a: any, b: any) => {
        // 获取账户路径，空值或"-"视为全局配置，排在最前面
        const accountPathA = a.accountPath || '-';
        const accountPathB = b.accountPath || '-';

        // 先按账户路径升序排序
        if (accountPathA !== accountPathB) {
          return accountPathA.localeCompare(accountPathB, 'zh-CN');
        }

        // 相同账户按生效日期降序排序
        const dateA = a.effectiveDate ? new Date(a.effectiveDate).getTime() : 0;
        const dateB = b.effectiveDate ? new Date(b.effectiveDate).getTime() : 0;
        return dateB - dateA; // 降序
      });

      console.log('[产品标准配置] 排序后的数据:', sortedData);
      return sortedData;
    },
  });

  // 创建/更新配置
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('保存标准配置，表单数据:', data);
      console.log('可选产品列表:', products);
      console.log('选择的层级:', selectedLevels);
      console.log('层级选项:', hierarchyLevelOptions);
      console.log('是否全局配置:', data.isGlobalConfig);

      // 查找产品信息（处理类型匹配问题）
      const product = products.find((p: any) =>
        String(p.id) === String(data.productId) ||
        parseInt(p.id) === parseInt(data.productId)
      );

      console.log('找到的产品:', product);

      if (!product) {
        throw new Error('产品不存在，请重新选择产品');
      }

      if (!data.standardHours && data.standardHours !== 0) {
        throw new Error('请输入标准');
      }

      // 获取当前用户信息
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      // 构建账户路径：将所有选择的层级选项按顺序组合，使用 "/" 分隔
      let accountPath = '';
      let hierarchyLevelId = null;
      let hierarchyLevelName = '';
      let hierarchyOptionValue = '';
      let hierarchyOptionLabel = '';

      // 如果是全局配置，账户路径为空
      if (data.isGlobalConfig) {
        accountPath = '-';
        console.log('全局配置，账户路径为空');
      } else {
        // 找出有值的层级字段
        const filledLevels = selectedLevels.filter((level: any) => {
          const value = data[`hierarchyOption_${level.id}`];
          return value !== undefined && value !== null && value !== '';
        });

        console.log('有值的层级:', filledLevels);

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
          console.log('生成的账户路径:', accountPath);

          // 使用第一个层级作为主要层级（用于兼容）
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
          console.log('未选择任何层级，账户路径为空');
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
        accountPath, // 添加账户路径
        standardHours: parseFloat(data.standardHours) || 0,
        quantity: data.quantity ? parseFloat(data.quantity) : null, // 添加件数字段
        effectiveDate: data.effectiveDate ? data.effectiveDate.format('YYYY-MM-DD') : null,
        expiryDate: data.expiryDate ? data.expiryDate.format('YYYY-MM-DD') : null,
        createdById: user?.id || 1,
        createdByName: user?.name || 'Admin',
      };

      console.log('保存payload:', payload);
      console.log('编辑记录:', editingRecord);

      // 如果是编辑模式，使用 PUT 接口；否则使用 POST 接口
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
      console.error('保存失败，错误信息:', error);
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
    setIsGlobalConfig(false); // 重置全局配置开关
    form.resetFields();
    // 预填充选中的产品
    form.setFieldsValue({
      productId: selectedProduct.id,
      isGlobalConfig: false, // 默认关闭全局配置
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record: any) => {
    // 直接使用当前选中的记录
    setEditingRecord(record);

    // 判断是否为全局配置（没有账户路径或账户路径为"-"）
    const isGlobal = !record.accountPath || record.accountPath === '-';
    setIsGlobalConfig(isGlobal);

    // 设置表单值
    const formValues: any = {
      productId: record.productId,
      isGlobalConfig: isGlobal,
      standardHours: record.standardHours,
      quantity: record.quantity,
      effectiveDate: record.effectiveDate ? dayjs(record.effectiveDate) : null,
      expiryDate: record.expiryDate ? dayjs(record.expiryDate) : null,
    };

    // 如果有账户路径，尝试解析回层级选项
    if (!isGlobal && record.accountPath) {
      const pathParts = record.accountPath.split('/');
      // 将路径部分按顺序匹配到层级
      selectedLevels.forEach((level: any, index: number) => {
        if (index < pathParts.length) {
          // 在层级选项中查找匹配的选项
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
    // 直接删除当前选中的配置记录
    const configId = record.id;
    if (!configId) {
      message.error('找不到配置记录');
      return;
    }

    request.delete(`/allocation/standard-hour-by-levels/${configId}`).then(() => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['productStandardHoursConfigs'] });
    }).catch(() => {
      message.error('删除失败');
    });
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
    // 按产品ID分组
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

    // 按劳动力账户路径筛选
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
      render: (hours: number, record: ProductStandardHourConfig) => {
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

  return (
    <div>
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
        title={
          editingRecord?.id
            ? `编辑`
            : '新增'
        }
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

  // 获取出勤代码定义列表（用于工时代码配置）
  const { data: attendanceCodes = [], isLoading: codesLoading } = useQuery({
    queryKey: ['attendanceCodeDefinitions'],
    queryFn: () =>
      request.get('/calculate/attendance-code-definitions').then((res: any) => res || []),
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
          description: '开线计划产线选择可选层级（工厂、车间、产线）',
        },
        {
          configKey: 'standardHoursHierarchyLevels',
          configValue: (values.standardHoursHierarchyLevels || []).join(',') || '',
          category: 'WORK_HOURS',
          description: '标准工时配置层级',
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
        {
          configKey: 'earnedHoursAttendanceCode',
          configValue: values.earnedHoursAttendanceCode || '',
          category: 'ALLOCATION',
          description: '配置后，挣得工时计算结果存储至该代码',
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
    const standardHoursLevelsConfig = systemConfigs.find(
      (c: any) => c.configKey === 'standardHoursHierarchyLevels'
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
    const earnedHoursCodeConfig = systemConfigs.find(
      (c: any) => c.configKey === 'earnedHoursAttendanceCode'
    );

    const propertyKeys = shiftPropertiesConfig?.configValue
      ? shiftPropertiesConfig.configValue.split(',').filter((key: string) => key)
      : [];

    const standardHoursLevels = standardHoursLevelsConfig?.configValue
      ? standardHoursLevelsConfig.configValue.split(',').filter((key: string) => key)
      : [];

    return {
      productionLineHierarchyLevel: productionLineConfig?.configValue || undefined,
      standardHoursHierarchyLevels: standardHoursLevels,
      productionLineShiftPropertyKeys: propertyKeys,
      actualHoursAllocationCode: actualHoursCodeConfig?.configValue || undefined,
      indirectHoursAllocationCode: indirectHoursCodeConfig?.configValue || undefined,
      earnedHoursAttendanceCode: earnedHoursCodeConfig?.configValue || undefined,
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

  // 搜索关键词
  const [searchKeyword, setSearchKeyword] = useState('');

  // 参数配置定义
  const paramConfigs = useMemo(() => {
    const matchedShiftCount = allShifts.filter((shift: any) =>
      selectedPropertyKeys.some((key: string) => shift.propertyKeys?.includes(key))
    ).length;

    return [
      {
        key: 'productionLineHierarchyLevel',
        name: '开线计划产线对应劳动力账户层级',
        code: 'WH1001',
        description: '选择后，开线维护时产线选择该层级下的明细',
        renderValue: () => (
          <Form.Item name="productionLineHierarchyLevel" style={{ marginBottom: 0 }}>
            <Select
              placeholder="请选择产线对应的层级"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
            >
              {hierarchyLevels
                .filter((level: any) => level.mappingType === 'ORG_TYPE' || level.mappingType === 'ORG')
                .map((level: any) => (
                  <Select.Option key={level.id} value={String(level.level)} label={level.name}>
                    {level.name}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
        ),
      },
      {
        key: 'standardHoursHierarchyLevels',
        name: '标准工时配置层级',
        code: 'WH1002',
        description: '选择后，在产品标准配置中可以为每个配置层级设置标准',
        renderValue: () => (
          <Form.Item name="standardHoursHierarchyLevels" style={{ marginBottom: 0 }}>
            <Select
              mode="multiple"
              placeholder="请选择标准工时配置层级"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {hierarchyLevels.map((level: any) => (
                <Select.Option key={level.id} value={String(level.id)} label={level.name}>
                  {level.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        ),
      },
      {
        key: 'productionLineShiftPropertyKeys',
        name: '开线计划可选班次的属性',
        code: 'WH1003',
        description: `选择班次属性后，班次选择将限制为具有这些属性的班次${selectedPropertyKeys.length > 0 ? `（当前匹配 ${matchedShiftCount} 个班次）` : ''}`,
        renderValue: () => (
          <Form.Item name="productionLineShiftPropertyKeys" style={{ marginBottom: 0 }}>
            <Select
              mode="multiple"
              placeholder="请选择产线开线班次属性"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
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
                    {prop.name}（{prop.propertyKey}）
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
        ),
      },
      {
        key: 'actualHoursAllocationCode',
        name: '实际工时代码',
        code: 'AL1001',
        description: '配置后，按实际工时比例分配方式将从获取以上类型代码的工时数据',
        renderValue: () => (
          <Form.Item
            name="actualHoursAllocationCode"
            rules={[{ required: true, message: '请选择工时代码' }]}
            style={{ marginBottom: 0 }}
          >
            <Select
              placeholder="请选择工时代码"
              allowClear
              showSearch
              style={{ width: '100%' }}
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
                  {code.name}（{code.code}）
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        ),
      },
      {
        key: 'indirectHoursAllocationCode',
        name: '间接工时分配后的工时代码',
        code: 'AL1002',
        description: '用于标识间接工时分配完成后生成的工时记录代码',
        renderValue: () => (
          <Form.Item
            name="indirectHoursAllocationCode"
            rules={[{ required: true, message: '请选择工时代码' }]}
            style={{ marginBottom: 0 }}
          >
            <Select
              placeholder="请选择工时代码"
              allowClear
              showSearch
              style={{ width: '100%' }}
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
                  {code.name}（{code.code}）
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        ),
      },
      {
        key: 'earnedHoursAttendanceCode',
        name: '挣得工时出勤代码',
        code: 'AL1003',
        description: '配置后，挣得工时计算结果存储至该代码',
        renderValue: () => (
          <Form.Item
            name="earnedHoursAttendanceCode"
            style={{ marginBottom: 0 }}
          >
            <Select
              placeholder="请选择工时代码"
              allowClear
              showSearch
              style={{ width: '100%' }}
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
                  {code.name}（{code.code}）
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        ),
      },
    ];
  }, [hierarchyLevels, shiftPropertyDefinitions, attendanceCodes, selectedPropertyKeys, allShifts]);

  // 按搜索关键词过滤
  const filteredParams = useMemo(() => {
    if (!searchKeyword) return paramConfigs;
    const keyword = searchKeyword.toLowerCase();
    return paramConfigs.filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        p.code.toLowerCase().includes(keyword)
    );
  }, [paramConfigs, searchKeyword]);

  // 表格列定义
  const paramColumns = [
    {
      title: '参数名称',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      render: (text: string) => (
        <span style={{ fontWeight: 500 }}>{text}</span>
      ),
    },
    {
      title: '参数代码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: '参数值',
      key: 'value',
      width: 320,
      render: (_: any, record: any) => record.renderValue(),
    },
    {
      title: '参数描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
  ];

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
        initialValues={getInitialValues()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Space>
            <span style={{ color: '#666' }}>代码/名称</span>
            <Input
              placeholder="请输入名称和代码"
              allowClear
              style={{ width: 220 }}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              suffix={<SearchOutlined style={{ color: '#bbb' }} />}
            />
          </Space>
          <Button
            type="primary"
            onClick={handleSave}
            loading={saveMutation.isPending}
          >
            保存
          </Button>
        </div>

        <Table
          columns={paramColumns}
          dataSource={filteredParams}
          rowKey="key"
          pagination={false}
          size="middle"
          bordered={false}
          style={{ marginTop: 8 }}
        />
      </Form>
    </div>
  );
};

// ============ 主配置页面 ============
const AllocationBasicConfigPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('general');

  return (
    <div>
      <Card>
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
            {
              key: 'standardHoursConfig',
              label: (
                <span>
                  <ClockCircleOutlined />
                  产品标准配置
                </span>
              ),
            },
          ]}
        />
        {activeTab === 'general' && <GeneralConfig />}
        {activeTab === 'product' && <ProductConfig />}
        {activeTab === 'standardHoursConfig' && <ProductStandardHoursConfig />}
      </Card>
    </div>
  );
};

export default AllocationBasicConfigPage;
