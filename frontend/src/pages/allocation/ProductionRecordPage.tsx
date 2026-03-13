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
  DatePicker,
  Select,
  message,
  Row,
  Col,
  TreeSelect,
} from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import request from '@/utils/request';

const { RangePicker } = DatePicker;

interface ProductionRecord {
  id?: number;
  orgId: number;
  orgName?: string;
  lineId?: number;
  lineName?: string;
  shiftId: number;
  shiftName?: string;
  productId: number;
  productCode?: string;
  productName?: string;
  recordDate: string;
  plannedQty: number;
  actualQty: number;
  qualifiedQty: number;
  unqualifiedQty?: number;
  standardHours: number;
  totalStdHours: number;
  workHours?: number;
  source?: string;
  recorderId: number;
  recorderName?: string;
  conversionFactor: number;
  convertedQty: number;
  status?: string;
  description?: string;
}

const ProductionRecordPage: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ProductionRecord | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 查询条件
  const [filters, setFilters] = useState({
    dateRange: [dayjs().subtract(7, 'day'), dayjs()] as any,
    orgId: null as number | null,
    shiftId: null as number | null,
    productId: null as number | null,
  });

  // 获取系统配置 - 产线对应层级
  const { data: systemConfigs = [] } = useQuery({
    queryKey: ['systemConfigs'],
    queryFn: () =>
      request.get('/hr/system-configs').then((res: any) => res || []),
  });

  // 根据层级ID获取产线组织列表
  const productionLineHierarchyLevelId = systemConfigs.find(
    (c: any) => c.configKey === 'productionLineHierarchyLevel'
  )?.configValue;

  const { data: productionLineOrgs = [] } = useQuery({
    queryKey: ['productionLineOrgs', productionLineHierarchyLevelId],
    queryFn: () =>
      request.get(`/hr/organizations/by-hierarchy-level/${productionLineHierarchyLevelId}`)
        .then((res: any) => res || []),
    enabled: !!productionLineHierarchyLevelId,
  });

  // 获取产量记录列表
  const { data: records, isLoading, refetch } = useQuery({
    queryKey: ['productionRecords', filters],
    queryFn: () =>
      request.get('/allocation/production-records', {
        params: {
          startDate: filters.dateRange?.[0]?.format('YYYY-MM-DD'),
          endDate: filters.dateRange?.[1]?.format('YYYY-MM-DD'),
          orgId: filters.orgId,
          shiftId: filters.shiftId,
          productId: filters.productId,
        },
      }).then((res: any) => res?.items || []),
  });

  // 获取产线树（当没有配置层级时使用）
  const { data: orgTree } = useQuery({
    queryKey: ['hrOrganizationTree'],
    queryFn: () =>
      request.get('/hr/organizations/tree').then((res: any) => res),
    enabled: !productionLineHierarchyLevelId,
  });

  // 获取班次列表
  const { data: shifts } = useQuery({
    queryKey: ['shiftsForProduction'],
    queryFn: () =>
      request.get('/shift/shifts').then((res: any) => res?.items || res || []),
  });

  // 获取产品列表
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () =>
      request.get('/allocation/products').then((res: any) => res?.items || []),
  });

  // 创建记录
  const createMutation = useMutation({
    mutationFn: (data: ProductionRecord) =>
      request.post('/allocation/production-records', data),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['productionRecords'] });
      handleCancel();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '创建失败');
    },
  });

  // 更新记录
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: ProductionRecord) =>
      request.put(`/allocation/production-records/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['productionRecords'] });
      handleCancel();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '更新失败');
    },
  });

  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      recordDate: dayjs(),
    });
    setIsModalVisible(true);
  };

  // 递归查找产线
  const findOrgById = (nodes: any[], id: number): any => {
    if (!nodes) return null;
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      if (node.children && node.children.length > 0) {
        const found = findOrgById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // 渲染产线树节点
  const renderTreeNodes = (nodes: any[]): any[] => {
    if (!nodes) return [];
    return nodes.map((node) => ({
      title: node.name,
      value: node.id,
      children: node.children && node.children.length > 0 ? renderTreeNodes(node.children) : undefined,
    }));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 获取当前用户信息
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      // 获取产线信息
      const orgInfo = findOrgById(orgTree, values.orgId);

      // 获取班次信息
      const shiftInfo = shifts?.find((s: any) => s.id === values.shiftId);

      // 获取产品信息
      const productInfo = products?.find((p: any) => p.id === values.productId);

      // 获取产品标准工时
      const standardHours = productInfo?.standardHours || 0;

      // 计算转换后产量
      const conversionFactor = productInfo?.conversionFactor || 1.0;
      const convertedQty = values.actualQty * conversionFactor;

      const data: ProductionRecord = {
        orgId: values.orgId,
        orgName: orgInfo?.name,
        shiftId: values.shiftId,
        shiftName: shiftInfo?.name,
        productId: values.productId,
        productName: productInfo?.name,
        productCode: productInfo?.code || '',
        recordDate: values.recordDate.format('YYYY-MM-DD'),
        plannedQty: 0,
        actualQty: values.actualQty,
        qualifiedQty: values.actualQty, // 合格品数量默认等于实际产量
        unqualifiedQty: 0,
        standardHours: standardHours,
        totalStdHours: values.actualQty * standardHours,
        workHours: null,
        source: 'MANUAL',
        recorderId: user?.id || 1,
        recorderName: user?.name || '系统管理员',
        conversionFactor: conversionFactor,
        convertedQty: convertedQty,
        description: values.description || '',
      };

      if (editingRecord?.id) {
        updateMutation.mutate({ id: editingRecord.id, ...data });
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  // 重置查询
  const handleResetFilters = () => {
    setFilters({
      dateRange: [dayjs().subtract(7, 'day'), dayjs()],
      orgId: null,
      shiftId: null,
      productId: null,
    });
  };

  const columns = [
    {
      title: '日期',
      dataIndex: 'recordDate',
      key: 'recordDate',
      width: 120,
      fixed: 'left' as const,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '产线',
      dataIndex: 'orgName',
      key: 'orgName',
      width: 200,
    },
    {
      title: '班次',
      dataIndex: 'shiftName',
      key: 'shiftName',
      width: 100,
    },
    {
      title: '产品',
      dataIndex: 'productName',
      key: 'productName',
      width: 150,
    },
    {
      title: '实际产量',
      dataIndex: 'actualQty',
      key: 'actualQty',
      width: 120,
      align: 'right' as const,
      render: (qty: number) => qty.toLocaleString(),
    },
    {
      title: '转换系数',
      dataIndex: 'conversionFactor',
      key: 'conversionFactor',
      width: 120,
      align: 'right' as const,
      render: (factor: number) => factor ? factor.toFixed(4) : '-',
    },
    {
      title: '转换后产量',
      dataIndex: 'convertedQty',
      key: 'convertedQty',
      width: 120,
      align: 'right' as const,
      render: (qty: number) => qty ? qty.toFixed(2) : '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      ellipsis: true,
    },
  ];

  return (
    <div>
      <Card
        title="产量记录"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增产量记录
          </Button>
        }
      >
        {/* 查询条件 */}
        <Form layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item label="日期范围">
            <RangePicker
              value={filters.dateRange}
              onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
            />
          </Form.Item>
          <Form.Item label="产线">
            {productionLineHierarchyLevelId && productionLineOrgs.length > 0 ? (
              <Select
                placeholder="请选择产线"
                value={filters.orgId}
                onChange={(value) => setFilters({ ...filters, orgId: value })}
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: 300 }}
              >
                {productionLineOrgs.map((org: any) => (
                  <Select.Option key={org.id} value={org.id} label={org.name}>
                    {org.name}
                  </Select.Option>
                ))}
              </Select>
            ) : (
              <TreeSelect
                placeholder="请选择产线"
                value={filters.orgId}
                onChange={(value) => setFilters({ ...filters, orgId: value })}
                allowClear
                style={{ width: 300 }}
                treeData={orgTree ? renderTreeNodes(orgTree) : []}
                showSearch
              />
            )}
          </Form.Item>
          <Form.Item label="班次">
            <Select
              placeholder="请选择班次"
              value={filters.shiftId}
              onChange={(value) => setFilters({ ...filters, shiftId: value })}
              allowClear
              style={{ width: 150 }}
            >
              {shifts?.map((shift: any) => (
                <Select.Option key={shift.id} value={shift.id}>
                  {shift.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="产品">
            <Select
              placeholder="请选择产品"
              value={filters.productId}
              onChange={(value) => setFilters({ ...filters, productId: value })}
              allowClear
              style={{ width: 200 }}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {products?.map((product: any) => (
                <Select.Option key={product.id} value={product.id} label={product.name}>
                  {product.name}
                </Select.Option>
              ))}
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
          columns={columns}
          dataSource={records}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: 1300 }}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title={editingRecord ? '编辑产量记录' : '新增产量记录'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        width={600}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="记录日期"
                name="recordDate"
                rules={[{ required: true, message: '请选择日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="班次"
                name="shiftId"
                rules={[{ required: true, message: '请选择班次' }]}
              >
                <Select placeholder="请选择班次">
                  {shifts?.map((shift: any) => (
                    <Select.Option key={shift.id} value={shift.id}>
                      {shift.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="产线"
            name="orgId"
            rules={[{ required: true, message: '请选择产线' }]}
          >
            {productionLineHierarchyLevelId && productionLineOrgs.length > 0 ? (
              <Select
                placeholder="请选择产线"
                showSearch
                optionFilterProp="label"
                allowClear
              >
                {productionLineOrgs.map((org: any) => (
                  <Select.Option key={org.id} value={org.id} label={org.name}>
                    {org.name}
                  </Select.Option>
                ))}
              </Select>
            ) : (
              <TreeSelect
                placeholder="请选择产线"
                treeData={orgTree ? renderTreeNodes(orgTree) : []}
                showSearch
                allowClear
                style={{ width: '100%' }}
              />
            )}
          </Form.Item>

          <Form.Item
            label="产品"
            name="productId"
            rules={[{ required: true, message: '请选择产品' }]}
          >
            <Select placeholder="请选择产品" showSearch>
              {products?.map((product: any) => (
                <Select.Option key={product.id} value={product.id}>
                  {product.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="实际产量"
            name="actualQty"
            rules={[
              { required: true, message: '请输入实际产量' },
              { type: 'number', min: 0, message: '产量不能为负数' },
            ]}
          >
            <InputNumber
              min={0}
              precision={2}
              step={1}
              style={{ width: '100%' }}
              placeholder="请输入实际产量"
            />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <Input.TextArea placeholder="请输入描述" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductionRecordPage;
