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
  Switch,
  message,
  Popconfirm,
  Tag,
  Row,
  Col,
  TreeSelect,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import request from '@/utils/request';

const { RangePicker } = DatePicker;

interface LineRecord {
  id?: number;
  orgId: number;
  orgName?: string;
  orgIds?: number[];
  orgNames?: string[];
  shiftId: number;
  shiftCode?: string;
  shiftName?: string;
  scheduleDate: string;
  startTime: string | null;
  endTime: string | null;
  delayedShutdownTime?: number;
  plannedProducts?: string;
  participateInAllocation?: boolean;
  status?: string;
  description?: string;
}

const LineMaintenancePage: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LineRecord | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取系统配置 - 产线对应层级和产线班次
  const { data: systemConfigs = [] } = useQuery({
    queryKey: ['systemConfigs'],
    queryFn: () =>
      request.get('/hr/system-configs').then((res: any) => res || []),
  });

  // 根据层级ID获取产线组织列表
  const productionLineHierarchyLevelId = systemConfigs.find(
    (c: any) => c.configKey === 'productionLineHierarchyLevel'
  )?.configValue;

  // 获取配置的产线开线班次属性(优先使用属性配置)
  const configuredShiftPropertyKeys = systemConfigs.find(
    (c: any) => c.configKey === 'productionLineShiftPropertyKeys'
  )?.configValue?.split(',').filter((key: string) => key) || [];

  // 获取配置的产线班次ID列表(兼容旧数据)
  const configuredShiftIds = systemConfigs.find(
    (c: any) => c.configKey === 'productionLineShiftIds'
  )?.configValue?.split(',').map((id: string) => parseInt(id)) || [];

  const { data: productionLineOrgs = [] } = useQuery({
    queryKey: ['productionLineOrgs', productionLineHierarchyLevelId],
    queryFn: () =>
      request.get(`/hr/organizations/by-hierarchy-level/${productionLineHierarchyLevelId}`)
        .then((res: any) => res || []),
    enabled: !!productionLineHierarchyLevelId,
  });

  // 获取所有班次及其属性
  const { data: allShifts } = useQuery({
    queryKey: ['allShiftsWithProperties'],
    queryFn: async () => {
      const shifts = await request.get('/shift/shifts').then((res: any) => res?.items || res || []);

      // 为每个班次获取属性
      const shiftsWithProperties = await Promise.all(
        shifts.map(async (shift: any) => {
          try {
            const properties = await request.get(`/shift/shifts/${shift.id}/properties`).then((res: any) => res || []);
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

  // 根据配置过滤班次(优先使用属性,其次使用ID列表)
  const shifts = configuredShiftPropertyKeys.length > 0
    ? allShifts?.filter((s: any) =>
        configuredShiftPropertyKeys.some((key: string) => s.propertyKeys?.includes(key))
      )
    : configuredShiftIds.length > 0
    ? allShifts?.filter((s: any) => configuredShiftIds.includes(s.id))
    : allShifts;

  // 查询条件
  const [filters, setFilters] = useState({
    dateRange: null as any,
    orgId: null as number | null,
    shiftId: null as number | null,
  });

  // 获取开线记录列表
  const { data: lineRecords, isLoading, refetch } = useQuery({
    queryKey: ['lineMaintenanceRecords', filters],
    queryFn: () =>
      request.get('/allocation/line-shifts', {
        params: {
          startDate: filters.dateRange?.[0]?.format('YYYY-MM-DD'),
          endDate: filters.dateRange?.[1]?.format('YYYY-MM-DD'),
          orgId: filters.orgId,
          shiftId: filters.shiftId,
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

  // 创建记录
  const createMutation = useMutation({
    mutationFn: (data: LineRecord) =>
      request.post('/allocation/line-shifts', data),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['lineMaintenanceRecords'] });
      handleCancel();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '创建失败');
    },
  });

  // 更新记录
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: LineRecord) =>
      request.put(`/allocation/line-shifts/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['lineMaintenanceRecords'] });
      handleCancel();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '更新失败');
    },
  });

  // 删除记录
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      request.delete(`/allocation/line-shifts/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['lineMaintenanceRecords'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '删除失败');
    },
  });

  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      scheduleDate: dayjs(),
      status: 'ACTIVE',
      participateInAllocation: true,
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record: LineRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      scheduleDate: dayjs(record.scheduleDate),
      startTime: record.startTime ? dayjs(record.startTime) : null,
      endTime: record.endTime ? dayjs(record.endTime) : null,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 获取班次信息
      const shiftInfo = shifts?.find((s: any) => s.id === values.shiftId);

      // 获取产线名称
      const getOrgNames = (ids: number[]) => {
        if (!ids || ids.length === 0) return [];
        const names = ids.map((id) => {
          const org = findOrgById(orgTree, id);
          return org?.name || `产线${id}`;
        });
        return names;
      };

      // 组合日期和时间创建完整的DateTime字符串
      const scheduleDate = values.scheduleDate.format('YYYY-MM-DD');
      const startDateTime = values.startTime
        ? dayjs(`${scheduleDate} ${values.startTime.format('HH:mm')}`).toISOString()
        : null;
      const endDateTime = values.endTime
        ? dayjs(`${scheduleDate} ${values.endTime.format('HH:mm')}`).toISOString()
        : null;

      const data: LineRecord = {
        orgId: values.orgId,
        orgName: getOrgNames([values.orgId])[0],
        orgIds: values.orgIds || [],
        orgNames: getOrgNames(values.orgIds || []),
        shiftId: values.shiftId,
        shiftCode: shiftInfo?.code,
        shiftName: shiftInfo?.name,
        scheduleDate: scheduleDate,
        startTime: startDateTime,
        endTime: endDateTime,
        delayedShutdownTime: values.delayedShutdownTime || null,
        plannedProducts: values.plannedProducts || '[]',
        participateInAllocation: values.participateInAllocation ?? true,
        status: values.status || 'ACTIVE',
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

  // 重置查询
  const handleResetFilters = () => {
    setFilters({
      dateRange: null,
      orgId: null,
      shiftId: null,
    });
  };

  const columns = [
    {
      title: '排班日期',
      dataIndex: 'scheduleDate',
      key: 'scheduleDate',
      width: 120,
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
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 100,
      render: (time: string) => time ? dayjs(time).format('HH:mm') : '-',
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 100,
      render: (time: string) => time ? dayjs(time).format('HH:mm') : '-',
    },
    {
      title: '延迟关线(分钟)',
      dataIndex: 'delayedShutdownTime',
      key: 'delayedShutdownTime',
      width: 120,
      render: (time: number) => time || '-',
    },
    {
      title: '是否参与分摊',
      dataIndex: 'participateInAllocation',
      key: 'participateInAllocation',
      width: 120,
      render: (participate: boolean) => (
        <Tag color={participate ? 'green' : 'default'}>
          {participate ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          'ACTIVE': { text: '生效', color: 'green' },
          'CANCEL': { text: '取消', color: 'red' },
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
      render: (_: any, record: LineRecord) => (
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
            description="确定要删除这条记录吗？"
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
    },
  ];

  return (
    <div>
      <Card
        title="开线维护"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增开线记录
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
          dataSource={lineRecords}
          loading={isLoading}
          rowKey="id"
          scroll={{ x: 1000 }}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title={editingRecord ? '编辑开线记录' : '新增开线记录'}
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
                label="排班日期"
                name="scheduleDate"
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

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="开始时间"
                name="startTime"
                rules={[{ required: true, message: '请选择开始时间' }]}
              >
                <DatePicker.TimePicker
                  style={{ width: '100%' }}
                  format="HH:mm"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="结束时间"
                name="endTime"
                rules={[{ required: true, message: '请选择结束时间' }]}
              >
                <DatePicker.TimePicker
                  style={{ width: '100%' }}
                  format="HH:mm"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="延迟关线时间（分钟）"
            name="delayedShutdownTime"
            tooltip="可选，允许产线在结束后延迟关线的时间"
          >
            <InputNumber
              min={0}
              precision={0}
              step={1}
              style={{ width: '100%' }}
              placeholder="请输入延迟关线时间"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="是否参与分摊"
                name="participateInAllocation"
                valuePropName="checked"
              >
                <Switch checkedChildren="是" unCheckedChildren="否" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select>
                  <Select.Option value="ACTIVE">生效</Select.Option>
                  <Select.Option value="CANCEL">取消</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="描述"
            name="description"
          >
            <Input placeholder="请输入描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LineMaintenancePage;
