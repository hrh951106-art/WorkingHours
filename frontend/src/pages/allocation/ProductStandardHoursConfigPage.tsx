import { useState, useMemo } from 'react';
import { Card, Form, Select, Button, message, Table, Modal, InputNumber, DatePicker, Space, Popconfirm, Tag, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

interface ProductStandardConfig {
  id?: number;
  productId: number;
  productCode: string;
  productName: string;
  accountPath: string;
  standardHours: number;
  quantity?: number;
  unit?: string;
  effectiveDate: string;
  expiryDate?: string;
}

const ProductStandardHoursConfigPage: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 查询条件
  const [filters, setFilters] = useState({
    productId: undefined as number | undefined,
    effectiveDateStart: undefined as dayjs.Dayjs | undefined,
    effectiveDateEnd: undefined as dayjs.Dayjs | undefined,
  });

  // 分页
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  // 获取用户信息
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  // 获取系统配置
  const { data: systemConfigs = [] } = useQuery({
    queryKey: ['allocationSystemConfigs'],
    queryFn: async () => {
      try {
        const res = await request.get('/hr/system-configs');
        return res || [];
      } catch (error) {
        console.error('获取系统配置失败:', error);
        return [];
      }
    },
  });

  // 获取层级列表（先获取，用于解析配置）
  const { data: hierarchyLevels = [] } = useQuery({
    queryKey: ['hierarchy-levels'],
    queryFn: () =>
      request.get('/account/hierarchy-config/levels').then((res: any) => res || []),
  });

  // 获取配置的标准工时层级
  const standardHoursLevelsConfig = systemConfigs.find(
    (c: any) => c.configKey === 'standardHoursHierarchyLevels'
  );

  // 解析层级ID - 使用level序号
  const selectedLevelIds = useMemo(() => {
    if (!standardHoursLevelsConfig?.configValue) {
      return [];
    }

    const configValue = standardHoursLevelsConfig.configValue;
    const parts = configValue.split(',').map(p => p.trim());

    const levelIds = [];
    if (hierarchyLevels.length > 0) {
      parts.forEach(levelNum => {
        const level = hierarchyLevels.find((l: any) => l.level === parseInt(levelNum));
        if (level) {
          levelIds.push(level.id);
        }
      });
    }

    return levelIds;
  }, [standardHoursLevelsConfig, hierarchyLevels]);

  // 选择的层级详情
  const selectedLevels = hierarchyLevels.filter((level: any) =>
    selectedLevelIds.includes(level.id)
  );

  console.log('选中的层级:', selectedLevels);

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
  const { data: products = [] } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => {
      const result = await request.get('/allocation/products', {
        params: { pageSize: 9999 },
      });
      const items = result?.items || result || [];
      return items.map((item: any) => ({
        id: item.id,
        value: item.code,
        label: `${item.code} - ${item.name}`,
        code: item.code,
        name: item.name,
      }));
    },
  });

  // 获取配置列表
  const { data: configsData, isLoading, refetch } = useQuery({
    queryKey: ['productStandardHoursConfigs', filters, pagination],
    queryFn: async () => {
      const params: any = {
        page: pagination.current,
        pageSize: pagination.pageSize,
      };

      if (filters.productId) {
        params.productId = filters.productId;
      }

      const result = await request.get('/allocation/standard-hour-by-levels', { params });
      const items = result?.items || result || [];

      // 客户端过滤生效日期
      let filteredItems = items;
      if (filters.effectiveDateStart) {
        filteredItems = filteredItems.filter((item: any) =>
          item.effectiveDate && dayjs(item.effectiveDate).isAfter(filters.effectiveDateStart!.subtract(1, 'day'))
        );
      }
      if (filters.effectiveDateEnd) {
        filteredItems = filteredItems.filter((item: any) =>
          item.effectiveDate && dayjs(item.effectiveDate).isBefore(filters.effectiveDateEnd!.add(1, 'day'))
        );
      }

      return {
        items: filteredItems,
        total: result?.total || filteredItems.length,
      };
    },
  });

  // 创建/更新配置
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const product = products.find((p: any) => p.id === data.productId);

      if (!product) {
        throw new Error('产品不存在，请重新选择产品');
      }

      if (!data.standardHours && data.standardHours !== 0) {
        throw new Error('请输入标准值');
      }

      let accountPath = '-';
      let hierarchyLevelId = null;
      let hierarchyLevelName = '';
      let hierarchyOptionValue = '';
      let hierarchyOptionLabel = '';

      if (selectedLevelIds.length > 0 && !data.isGlobalConfig) {
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
        }
      }

      const payload = {
        productId: parseInt(product.id),
        productCode: product.code,
        productName: product.name,
        hierarchyLevelId,
        hierarchyLevelName,
        hierarchyOptionValue,
        hierarchyOptionLabel,
        accountPath,
        standardHours: parseFloat(data.standardHours) || 0,
        quantity: data.quantity ? parseFloat(data.quantity) : null,
        unit: data.unit || null,
        effectiveDate: data.effectiveDate ? data.effectiveDate.format('YYYY-MM-DD') : null,
        expiryDate: data.expiryDate ? data.expiryDate.format('YYYY-MM-DD') : null,
        createdById: user?.id || 1,
        createdByName: user?.name || 'Admin',
      };

      if (editingRecord?.id) {
        return request.put(`/allocation/standard-hour-by-levels/${editingRecord.id}`, payload);
      } else {
        return request.post('/allocation/standard-hour-by-levels', payload);
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
    setEditingRecord(null);
    form.resetFields();

    // 如果配置了层级，默认关闭；否则默认开启
    const isGlobalDefault = selectedLevelIds.length > 0 ? false : true;

    form.setFieldsValue({
      productId: filters.productId,
      isGlobalConfig: isGlobalDefault,
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);

    const isGlobal = !record.accountPath || record.accountPath === '-';

    const formValues: any = {
      productId: record.productId,
      isGlobalConfig: isGlobal,
      standardHours: record.standardHours,
      quantity: record.quantity,
      unit: record.unit,
      effectiveDate: record.effectiveDate ? dayjs(record.effectiveDate) : null,
      expiryDate: record.expiryDate ? dayjs(record.expiryDate) : null,
    };

    // 如果不是全局配置且有层级，恢复层级选择字段的值
    if (!isGlobal && record.accountPath && record.accountPath !== '-' && selectedLevelIds.length > 0) {
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

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setEditingRecord(null);
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

  const handleSearch = () => {
    setPagination({
      ...pagination,
      current: 1,
    });
    refetch();
  };

  const handleReset = () => {
    setFilters({
      productId: undefined,
      effectiveDateStart: undefined,
      effectiveDateEnd: undefined,
    });
    setPagination({
      current: 1,
      pageSize: 10,
    });
  };

  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: '产品',
        dataIndex: 'productCode',
        key: 'productCode',
        width: 200,
        sorter: (a: any, b: any) => {
          const aValue = `${a.productCode}-${a.productName}`;
          const bValue = `${b.productCode}-${b.productName}`;
          return aValue.localeCompare(bValue, 'zh-CN');
        },
        render: (code: string, record: any) => (
          <div style={{ fontWeight: 500 }}>
            {code}-{record.productName}
          </div>
        ),
      },
    ];

    // 为每个配置的层级添加一列
    if (selectedLevels.length > 0) {
      selectedLevels.forEach((level: any, index: number) => {
        baseColumns.push({
          title: level.name,
          key: `hierarchy_level_${level.id}`,
          width: 180,
          render: (_: any, record: any) => {
            if (!record.accountPath || record.accountPath === '-') {
              return <Tag color="green">全局配置</Tag>;
            }
            const pathParts = record.accountPath.split('/');
            if (index < pathParts.length) {
              return <span style={{ fontWeight: 500 }}>{pathParts[index]}</span>;
            }
            return '-';
          },
        });
      });
    } else {
      // 如果没有配置层级，显示一个默认的"配置范围"列
      baseColumns.push({
        title: '配置范围',
        dataIndex: 'accountPath',
        key: 'accountPath',
        width: 180,
        render: (accountPath: string) => {
          if (!accountPath || accountPath === '-') {
            return <Tag color="green">全局配置</Tag>;
          }
          return <span style={{ fontWeight: 500 }}>{accountPath}</span>;
        },
      });
    }

    // 添加其他列
    baseColumns.push(
      {
        title: '标准值',
        dataIndex: 'standardHours',
        key: 'standardHours',
        width: 150,
        render: (hours: number, record: any) => {
          if (record.quantity && hours) {
            return (
              <span style={{ fontWeight: 500, color: '#52c41a' }}>
                {record.quantity}件/{hours}小时
              </span>
            );
          }
          return (
            <span style={{ fontWeight: 500, color: '#52c41a' }}>
              {hours}小时
            </span>
          );
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
            <Popconfirm
              title="确认删除"
              description="确定要删除这条配置吗？"
              onConfirm={() => record.id && handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      }
    );

    return baseColumns;
  }, [selectedLevels]);

  return (
    <div>
      <Card
        title="产品标准配置"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新增
          </Button>
        }
      >
        {/* 查询条件 */}
        <Form layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item label="产品">
            <Select
              placeholder="请选择产品"
              style={{ width: 250 }}
              value={filters.productId}
              onChange={(value) => setFilters({ ...filters, productId: value })}
              allowClear
              showSearch
              optionFilterProp="label"
              options={products.map((p: any) => ({
                label: p.label,
                value: p.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="生效日期区间">
            <RangePicker
              value={[filters.effectiveDateStart, filters.effectiveDateEnd]}
              onChange={(dates) => {
                setFilters({
                  ...filters,
                  effectiveDateStart: dates?.[0],
                  effectiveDateEnd: dates?.[1],
                });
              }}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
              >
                查询
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={configsData?.items || []}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: configsData?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              setPagination({ current: page, pageSize });
            },
          }}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingRecord?.id ? '编辑配置' : '新增配置'}
        open={isModalVisible}
        onOk={handleModalSubmit}
        onCancel={handleModalCancel}
        confirmLoading={saveMutation.isPending}
        width={600}
        destroyOnClose
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
              options={products.map((p: any) => ({
                label: p.label,
                value: p.id,
              }))}
            />
          </Form.Item>

          <Form.Item label="全局配置" name="isGlobalConfig" valuePropName="checked">
            <Switch
              checkedChildren="是"
              unCheckedChildren="否"
              disabled={selectedLevelIds.length === 0}
            />
          </Form.Item>

          {selectedLevelIds.length > 0 && (
            <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => {
              return prevValues.isGlobalConfig !== currentValues.isGlobalConfig;
            }}>
              {({ getFieldValue }) => {
                const isGlobal = getFieldValue('isGlobalConfig');

                if (!isGlobal) {
                  return (
                    <>
                      {selectedLevels.map((level: any) => {
                        const options = hierarchyLevelOptions[level.id] || [];
                        return (
                          <Form.Item
                            key={level.id}
                            label={level.name}
                            name={`hierarchyOption_${level.id}`}
                            rules={[{ required: true, message: `请选择${level.name}` }]}
                          >
                            <Select
                              placeholder={`请选择${level.name}`}
                              showSearch
                              optionFilterProp="label"
                              allowClear
                              options={options.map((opt: any) => ({
                                label: opt.label,
                                value: opt.value,
                              }))}
                            />
                          </Form.Item>
                        );
                      })}
                    </>
                  );
                }
                return <div style={{ color: '#999', fontSize: 12, marginTop: 8 }}>当前为全局配置，将应用于所有账户层级</div>;
              }}
            </Form.Item>
          )}

          <Form.Item label="标准值">
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item
                name="quantity"
                style={{ marginBottom: 0, width: '40%' }}
              >
                <InputNumber
                  min={0}
                  step={1}
                  precision={0}
                  style={{ width: '100%' }}
                  placeholder="件数（可选）"
                  addonAfter="件"
                />
              </Form.Item>
              <Form.Item
                name="standardHours"
                rules={[{ required: true, message: '请输入标准值' }]}
                style={{ marginBottom: 0, width: '60%' }}
              >
                <InputNumber
                  min={0}
                  step={0.1}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="标准值"
                  addonAfter="小时"
                />
              </Form.Item>
            </Space.Compact>
          </Form.Item>

          <Form.Item label="生效日期">
            <div style={{ display: 'flex', gap: '16px' }}>
              <Form.Item
                name="effectiveDate"
                rules={[{ required: true, message: '请选择生效日期' }]}
                style={{ marginBottom: 0, flex: 1 }}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="请选择生效日期"
                />
              </Form.Item>
              <Form.Item
                name="expiryDate"
                style={{ marginBottom: 0, flex: 1 }}
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
                  placeholder="失效日期（可选）"
                  allowClear
                />
              </Form.Item>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductStandardHoursConfigPage;
