import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Popconfirm,
  Tag,
  Tabs,
  Row,
  Col,
  DatePicker,
  Divider,
  Radio,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

// 配置模式枚举
enum ConfigMode {
  GLOBAL = 'GLOBAL', // 全局标准工时
  BY_LEVEL = 'BY_LEVEL', // 按账户层级配置
}

// ============ 产品配置页面 ============
interface Product {
  id?: number;
  code: string;
  name: string;
  unit?: string;
  status: 'ACTIVE' | 'INACTIVE';
  standardHours?: ProductStandardHours[];
}

interface ProductStandardHours {
  id?: number;
  productId: number;
  productName: string;
  processId?: number;
  processName?: string;
  quantity?: number; // 件数
  standardHours: number; // 总工时
  effectiveDate: string;
  expiryDate?: string;
  status: string;
  description?: string;
}

interface ProductStandardHourByLevel {
  id?: number;
  productId: number;
  productCode: string;
  productName: string;
  hierarchyLevelId?: number;
  hierarchyLevelName?: string;
  hierarchyOptionValue?: string;
  hierarchyOptionLabel?: string;
  accountPath?: string;
  quantity?: number;
  standardHours: number;
  effectiveDate: string;
  expiryDate?: string;
  status: string;
  description?: string;
}

const ProductConfigPage: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isStandardHoursModalVisible, setIsStandardHoursModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingStandardHours, setEditingStandardHours] = useState<ProductStandardHours | null>(null);
  const [editingByLevel, setEditingByLevel] = useState<ProductStandardHourByLevel | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [configMode, setConfigMode] = useState<ConfigMode>(ConfigMode.GLOBAL);
  const [form] = Form.useForm();
  const [standardHoursForm] = Form.useForm();
  const queryClient = useQueryClient();

  // 查询条件
  const [filters, setFilters] = useState({
    code: '',
    name: '',
    status: null as string | null,
  });

  // 获取产品列表（从数据源获取）
  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      // 先获取产品数据源ID
      const dataSources = await request.get('/hr/data-sources');
      const productDataSource = dataSources.find((ds: any) => ds.code === 'PRODUCT');
      if (productDataSource) {
        const options = await request.get(`/hr/data-sources/${productDataSource.id}/options`);
        let filteredOptions = options || [];

        // 客户端过滤
        if (filters.code) {
          filteredOptions = filteredOptions.filter((item: any) =>
            item.value?.toLowerCase().includes(filters.code.toLowerCase())
          );
        }
        if (filters.name) {
          filteredOptions = filteredOptions.filter((item: any) =>
            item.label?.toLowerCase().includes(filters.name.toLowerCase())
          );
        }

        const products = filteredOptions.map((item: any) => ({
          id: item.id,
          code: item.value,
          name: item.label.split(' - ')[1] || item.label,
          unit: '-',
          status: 'ACTIVE',
        }));

        // 为每个产品获取全局标准工时信息
        const productsWithHours = await Promise.all(
          products.map(async (product: any) => {
            try {
              const hours = await request.get(`/allocation/products/${product.id}/standard-hours`);
              // 找出生效中的全局标准工时（不区分工序的总工时）
              const activeGlobalHours = hours.filter((h: any) => h.status === 'ACTIVE');
              return {
                ...product,
                standardHours: activeGlobalHours,
              };
            } catch {
              return {
                ...product,
                standardHours: [],
              };
            }
          })
        );

        return productsWithHours;
      }
      return [];
    },
  });

  // 获取产品标准工时列表
  const { data: standardHoursList, refetch: refetchStandardHours } = useQuery({
    queryKey: ['productStandardHours', selectedProductId],
    queryFn: () =>
      request.get(`/allocation/products/${selectedProductId}/standard-hours`)
        .then((res: any) => res || []),
    enabled: !!selectedProductId && configMode === ConfigMode.GLOBAL,
  });

  // 获取产品按账户层级配置的标准工时列表
  const { data: byLevelList, refetch: refetchByLevel } = useQuery({
    queryKey: ['productStandardHourByLevels', selectedProductId],
    queryFn: () =>
      request.get(`/allocation/products/${selectedProductId}/standard-hour-by-levels`)
        .then((res: any) => res || []),
    enabled: !!selectedProductId && configMode === ConfigMode.BY_LEVEL,
  });

  // 获取工序列表（从数据源获取）
  const { data: processList } = useQuery({
    queryKey: ['processes'],
    queryFn: async () => {
      // 先获取工序数据源ID
      const dataSources = await request.get('/hr/data-sources');
      const processDataSource = dataSources.find((ds: any) => ds.code === 'PROCESS');
      if (processDataSource) {
        const options = await request.get(`/hr/data-sources/${processDataSource.id}/options`);
        return options || [];
      }
      return [];
    },
  });

  // 获取层级配置列表
  const { data: hierarchyLevels } = useQuery({
    queryKey: ['accountHierarchyLevels'],
    queryFn: () =>
      request.get('/account/hierarchy-config/levels/with-details').then((res: any) => res || []),
  });

  // 创建标准工时
  const createStandardHoursMutation = useMutation({
    mutationFn: (data: ProductStandardHours) =>
      request.post(`/allocation/products/${selectedProductId}/standard-hours`, data),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['productStandardHours'] });
      handleStandardHoursCancel();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '创建失败');
    },
  });

  // 更新标准工时
  const updateStandardHoursMutation = useMutation({
    mutationFn: ({ id, ...data }: ProductStandardHours) =>
      request.put(`/allocation/standard-hours/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['productStandardHours'] });
      handleStandardHoursCancel();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '更新失败');
    },
  });

  // 删除标准工时
  const deleteStandardHoursMutation = useMutation({
    mutationFn: (id: number) =>
      request.delete(`/allocation/standard-hours/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['productStandardHours'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '删除失败');
    },
  });

  // 创建按账户层级配置的标准工时
  const createByLevelMutation = useMutation({
    mutationFn: (data: ProductStandardHourByLevel) =>
      request.post('/allocation/standard-hour-by-levels', data),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['productStandardHourByLevels'] });
      handleByLevelCancel();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '创建失败');
    },
  });

  // 更新按账户层级配置的标准工时
  const updateByLevelMutation = useMutation({
    mutationFn: ({ id, ...data }: ProductStandardHourByLevel) =>
      request.put(`/allocation/standard-hour-by-levels/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['productStandardHourByLevels'] });
      handleByLevelCancel();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '更新失败');
    },
  });

  // 删除按账户层级配置的标准工时
  const deleteByLevelMutation = useMutation({
    mutationFn: (id: number) =>
      request.delete(`/allocation/standard-hour-by-levels/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['productStandardHourByLevels'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '删除失败');
    },
  });

  const handleEdit = (record: Product) => {
    setEditingProduct(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleCreateStandardHours = () => {
    if (!selectedProductId) {
      message.warning('请先选择产品');
      return;
    }
    if (configMode === ConfigMode.GLOBAL) {
      setEditingStandardHours(null);
      standardHoursForm.resetFields();
      standardHoursForm.setFieldsValue({
        effectiveDate: dayjs(),
        status: 'ACTIVE',
      });
    } else {
      setEditingByLevel(null);
      standardHoursForm.resetFields();
      standardHoursForm.setFieldsValue({
        effectiveDate: dayjs(),
        status: 'ACTIVE',
      });
    }
    setIsStandardHoursModalVisible(true);
  };

  const handleEditStandardHours = (record: ProductStandardHours) => {
    setEditingStandardHours(record);
    standardHoursForm.setFieldsValue({
      ...record,
      effectiveDate: dayjs(record.effectiveDate),
      expiryDate: record.expiryDate ? dayjs(record.expiryDate) : null,
    });
    setIsStandardHoursModalVisible(true);
  };

  const handleDeleteStandardHours = (id: number) => {
    deleteStandardHoursMutation.mutate(id);
  };

  const handleStandardHoursSubmit = async () => {
    try {
      const values = await standardHoursForm.validateFields();

      if (configMode === ConfigMode.GLOBAL) {
        // 全局标准工时处理
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;

        const selectedProcess = processList?.find((p: any) => p.value === values.processId);
        const processName = selectedProcess ? selectedProcess.label.split(' - ')[1] : '';

        const data = {
          ...values,
          processName,
          createdById: user?.id || 1,
          createdByName: user?.name || '系统管理员',
        };

        if (editingStandardHours?.id) {
          updateStandardHoursMutation.mutate({
            id: editingStandardHours.id,
            ...data,
          });
        } else {
          createStandardHoursMutation.mutate(data);
        }
      } else {
        // 按账户层级配置处理
        await handleByLevelSubmit();
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleStandardHoursCancel = () => {
    setIsStandardHoursModalVisible(false);
    setEditingStandardHours(null);
    setEditingByLevel(null);
    standardHoursForm.resetFields();
  };

  // 按账户层级配置的处理函数
  const handleCreateByLevel = () => {
    if (!selectedProductId) {
      message.warning('请先选择产品');
      return;
    }
    setEditingByLevel(null);
    standardHoursForm.resetFields();
    standardHoursForm.setFieldsValue({
      effectiveDate: dayjs(),
      status: 'ACTIVE',
    });
    setIsStandardHoursModalVisible(true);
  };

  const handleEditByLevel = (record: ProductStandardHourByLevel) => {
    setEditingByLevel(record);
    standardHoursForm.setFieldsValue({
      ...record,
      effectiveDate: dayjs(record.effectiveDate),
      expiryDate: record.expiryDate ? dayjs(record.expiryDate) : null,
    });
    setIsStandardHoursModalVisible(true);
  };

  const handleDeleteByLevel = (id: number) => {
    deleteByLevelMutation.mutate(id);
  };

  const handleByLevelSubmit = async () => {
    try {
      const values = await standardHoursForm.validateFields();

      // 获取当前用户信息
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      // 获取选中的层级信息
      const selectedLevel = hierarchyLevels?.find((l: any) => l.id === values.hierarchyLevelId);
      const levelName = selectedLevel ? selectedLevel.name : '';

      // 获取层级选项的标签
      let optionLabel = '';
      if (values.hierarchyLevelId && values.hierarchyOptionValue) {
        const levelDetails = selectedLevel?.details || [];
        const option = levelDetails.find((d: any) => d.id === values.hierarchyOptionValue);
        optionLabel = option ? option.levelName : values.hierarchyOptionValue;
      }

      // 生成账户路径
      const accountPath = values.hierarchyOptionValue ? `${levelName}:${optionLabel}` : '';

      const data = {
        ...values,
        productId: selectedProductId,
        hierarchyLevelName: levelName,
        hierarchyOptionLabel: optionLabel,
        accountPath,
        createdById: user?.id || 1,
        createdByName: user?.name || '系统管理员',
      };

      if (editingByLevel?.id) {
        updateByLevelMutation.mutate({
          id: editingByLevel.id,
          ...data,
        });
      } else {
        createByLevelMutation.mutate(data);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleByLevelCancel = () => {
    setIsStandardHoursModalVisible(false);
    setEditingByLevel(null);
    standardHoursForm.resetFields();
  };

  // 重置查询
  const handleResetFilters = () => {
    setFilters({
      code: '',
      name: '',
      status: null,
    });
  };

  const productColumns = [
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
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: '全局标准工时',
      key: 'globalStandardHours',
      width: 200,
      render: (_: any, record: any) => {
        if (!record.standardHours || record.standardHours.length === 0) {
          return <span style={{ color: '#999' }}>未配置</span>;
        }

        // 显示前3条标准工时配置
        const displayHours = record.standardHours.slice(0, 3);
        const hasMore = record.standardHours.length > 3;

        return (
          <div>
            {displayHours.map((hour: any, idx: number) => (
              <div key={idx} style={{ fontSize: '12px', marginBottom: '4px' }}>
                {hour.processName ? `${hour.processName}: ` : ''}
                <span style={{ fontWeight: 'bold' }}>
                  {hour.quantity ? `${hour.quantity}件/` : ''}{hour.standardHours}小时
                </span>
              </div>
            ))}
            {hasMore && (
              <div style={{ fontSize: '12px', color: '#1890ff' }}>
                共{record.standardHours.length}条配置，点击查看详情
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: Product) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setSelectedProductId(record.id!);
              setConfigMode(ConfigMode.GLOBAL);
            }}
          >
            标准工时
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  const standardHoursColumns = [
    {
      title: '工序',
      dataIndex: 'processName',
      key: 'processName',
      width: 150,
      render: (processName: string) => processName || <span style={{ color: '#999' }}>(默认工时)</span>,
    },
    {
      title: '标准工时',
      dataIndex: 'standardHours',
      key: 'standardHours',
      width: 150,
      render: (hours: number, record: ProductStandardHours) => {
        if (record.quantity && hours) {
          return `${record.quantity}件/${hours}小时`;
        }
        return `${hours} 小时`;
      },
    },
    {
      title: '生效日期',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '失效日期',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          'ACTIVE': { text: '生效', color: 'green' },
          'INACTIVE': { text: '失效', color: 'red' },
        };
        const statusInfo = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: ProductStandardHours) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditStandardHours(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这条标准工时配置吗？"
            onConfirm={() => record.id && handleDeleteStandardHours(record.id)}
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
    },
  ];

  // 按账户层级配置的表格列
  const byLevelColumns = [
    {
      title: '账户层级',
      dataIndex: 'hierarchyLevelName',
      key: 'hierarchyLevelName',
      width: 120,
    },
    {
      title: '层级选项',
      dataIndex: 'hierarchyOptionLabel',
      key: 'hierarchyOptionLabel',
      width: 150,
    },
    {
      title: '标准工时',
      dataIndex: 'standardHours',
      key: 'standardHours',
      width: 150,
      render: (hours: number, record: ProductStandardHourByLevel) => {
        if (record.quantity && hours) {
          return `${record.quantity}件/${hours}小时`;
        }
        return `${hours} 小时`;
      },
    },
    {
      title: '生效日期',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '失效日期',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          'ACTIVE': { text: '生效', color: 'green' },
          'INACTIVE': { text: '失效', color: 'red' },
        };
        const statusInfo = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: ProductStandardHourByLevel) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditByLevel(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这条标准工时配置吗？"
            onConfirm={() => record.id && handleDeleteByLevel(record.id)}
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
    },
  ];

  const tabItems = [
    {
      key: 'list',
      label: '产品列表',
      children: (
        <>
          {/* 查询条件 */}
          <Form layout="inline" style={{ marginBottom: 16 }}>
            <Form.Item label="产品编码">
              <Input
                placeholder="请输入产品编码"
                value={filters.code}
                onChange={(e) => setFilters({ ...filters, code: e.target.value })}
                allowClear
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item label="产品名称">
              <Input
                placeholder="请输入产品名称"
                value={filters.name}
                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                allowClear
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item label="状态">
              <Select
                placeholder="请选择状态"
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value })}
                allowClear
                style={{ width: 120 }}
              >
                <Select.Option value="ACTIVE">启用</Select.Option>
                <Select.Option value="INACTIVE">停用</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={() => refetch()}
                >
                  查询
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleResetFilters}
                >
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Form>

          <Table
            columns={productColumns}
            dataSource={products}
            loading={isLoading}
            rowKey="id"
            onRow={(record) => ({
              onClick: () => setSelectedProductId(record.id!),
              style: {
                cursor: 'pointer',
                backgroundColor: selectedProductId === record.id ? '#e6f7ff' : '',
              },
            })}
            scroll={{ x: 1000 }}
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        </>
      ),
    },
    {
      key: 'standardHours',
      label: `标准工时配置${selectedProductId ? '' : '（请先选择产品）'}`,
      disabled: !selectedProductId,
      children: (
        <Card
          title={
            configMode === ConfigMode.GLOBAL
              ? '全局标准工时配置'
              : '按账户层级配置'
          }
          extra={
            <Space>
              <Radio.Group
                value={configMode}
                onChange={(e) => setConfigMode(e.target.value)}
                buttonStyle="solid"
              >
                <Radio.Button value={ConfigMode.GLOBAL}>全局配置</Radio.Button>
                <Radio.Button value={ConfigMode.BY_LEVEL}>按账户层级</Radio.Button>
              </Radio.Group>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateStandardHours}
                disabled={!selectedProductId}
              >
                新增标准工时
              </Button>
            </Space>
          }
        >
          {configMode === ConfigMode.GLOBAL && (
            <div style={{ marginBottom: 16, padding: 12, background: '#f6ffed', borderRadius: 4, border: '1px solid #b7eb8f' }}>
              <div style={{ fontSize: 13, color: '#52c41a' }}>
                💡 <strong>全局标准工时</strong>：配置产品的默认标准工时，不区分账户层级。
                {!selectedProductId && ' 请先在左侧选择产品。'}
              </div>
            </div>
          )}
          {configMode === ConfigMode.BY_LEVEL && (
            <div style={{ marginBottom: 16, padding: 12, background: '#e6f7ff', borderRadius: 4, border: '1px solid #91d5ff' }}>
              <div style={{ fontSize: 13, color: '#1890ff' }}>
                💡 <strong>按账户层级配置</strong>：为不同的账户层级（如车间、班组）配置不同的标准工时。
                {!selectedProductId && ' 请先在左侧选择产品。'}
              </div>
            </div>
          )}
          <Table
            columns={configMode === ConfigMode.GLOBAL ? standardHoursColumns : byLevelColumns}
            dataSource={configMode === ConfigMode.GLOBAL ? standardHoursList : byLevelList}
            rowKey="id"
            scroll={{ x: 1200 }}
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
          />
        </Card>
      ),
    },
  ];

  return (
    <div>
      <Card title="产品配置">
        {/* 隐藏了新增产品按钮，产品从查找项中获取 */}
        <Tabs items={tabItems} />
      </Card>

      {/* 产品编辑Modal */}
      <Modal
        title="编辑产品"
        open={isModalVisible}
        onOk={() => {}}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingProduct(null);
          form.resetFields();
        }}
        width={600}
        footer={[
          <Button key="back" onClick={() => setIsModalVisible(false)}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={() => {
              setIsModalVisible(false);
              message.success('产品信息仅供查看，如需修改请联系管理员');
            }}
          >
            确定
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" disabled>
          <Form.Item
            label="产品编码"
            name="code"
            rules={[{ required: true, message: '请输入产品编码' }]}
          >
            <Input placeholder="如：PROD-001" />
          </Form.Item>

          <Form.Item
            label="产品名称"
            name="name"
            rules={[{ required: true, message: '请输入产品名称' }]}
          >
            <Input placeholder="请输入产品名称" />
          </Form.Item>

          <Form.Item
            label="单位"
            name="unit"
          >
            <Input placeholder="如：件" />
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
      </Modal>

      {/* 标准工时编辑Modal */}
      <Modal
        title={
          configMode === ConfigMode.GLOBAL
            ? (editingStandardHours ? '编辑标准工时' : '新增标准工时')
            : (editingByLevel ? '编辑层级标准工时' : '新增层级标准工时')
        }
        open={isStandardHoursModalVisible}
        onOk={handleStandardHoursSubmit}
        onCancel={handleStandardHoursCancel}
        width={600}
        confirmLoading={
          configMode === ConfigMode.GLOBAL
            ? (createStandardHoursMutation.isPending || updateStandardHoursMutation.isPending)
            : (createByLevelMutation.isPending || updateByLevelMutation.isPending)
        }
      >
        <Form form={standardHoursForm} layout="vertical">
          {/* 全局模式：显示工序选择（可选） */}
          {configMode === ConfigMode.GLOBAL && (
            <>
              <div style={{ marginBottom: 16, padding: 12, background: '#f0f5ff', borderRadius: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 4 }}>
                  全局标准工时配置
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  为产品配置全局标准工时。如果产品的工艺在不同工序中有差异，可以为每个工序单独配置标准工时。
                </div>
              </div>

              <Form.Item
                label="工序（可选）"
                name="processId"
                tooltip="如果不选择工序，则表示这是产品的默认全局标准工时"
              >
                <Select placeholder="请选择工序（可不选）" showSearch allowClear>
                  {processList?.map((process: any) => (
                    <Select.Option key={process.value} value={process.value}>
                      {process.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </>
          )}

          {/* 按账户层级模式：显示层级选择 */}
          {configMode === ConfigMode.BY_LEVEL && (
            <>
              <Form.Item
                label="账户层级"
                name="hierarchyLevelId"
                rules={[{ required: true, message: '请选择账户层级' }]}
              >
                <Select
                  placeholder="请选择账户层级"
                  showSearch
                  onChange={(value) => {
                    // 清空层级选项
                    standardHoursForm.setFieldsValue({ hierarchyOptionValue: undefined });
                  }}
                >
                  {hierarchyLevels?.map((level: any) => (
                    <Select.Option key={level.id} value={level.id}>
                      {level.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.hierarchyLevelId !== currentValues.hierarchyLevelId
                }
              >
                {({ getFieldValue }) => {
                  const hierarchyLevelId = getFieldValue('hierarchyLevelId');
                  const selectedLevel = hierarchyLevels?.find((l: any) => l.id === hierarchyLevelId);
                  const levelDetails = selectedLevel?.details || [];

                  return (
                    <Form.Item
                      label="层级选项"
                      name="hierarchyOptionValue"
                      rules={[{ required: true, message: '请选择层级选项' }]}
                    >
                      <Select placeholder="请选择层级选项" showSearch>
                        {levelDetails
                          .filter((detail: any) => detail.status === 'ACTIVE')
                          .map((detail: any) => (
                            <Select.Option key={detail.id} value={detail.id}>
                              {detail.levelName}
                            </Select.Option>
                          ))}
                      </Select>
                    </Form.Item>
                  );
                }}
              </Form.Item>
            </>
          )}

          <Form.Item label="标准工时">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="quantity"
                  rules={[
                    { type: 'number', min: 0, message: '件数不能为负数' },
                  ]}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber
                    placeholder="件数"
                    min={0}
                    step={1}
                    precision={0}
                    style={{ width: '100%' }}
                    addonAfter="件"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="standardHours"
                  rules={[
                    { required: true, message: '请输入标准工时' },
                    { type: 'number', min: 0, message: '标准工时不能为负数' },
                  ]}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber
                    placeholder="总工时"
                    min={0}
                    step={0.1}
                    precision={2}
                    style={{ width: '100%' }}
                    addonAfter="小时"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="生效日期"
                name="effectiveDate"
                rules={[{ required: true, message: '请选择生效日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="失效日期"
                name="expiryDate"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="状态"
            name="status"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select>
              <Select.Option value="ACTIVE">生效</Select.Option>
              <Select.Option value="INACTIVE">失效</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="备注"
            name="description"
          >
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductConfigPage;
