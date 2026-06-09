import { useState, useMemo, useEffect } from 'react';
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
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import request from '@/utils/request';
import LineAccountSelect from '@/components/common/LineAccountSelect';
import OrganizationTreeSelect from '@/components/common/OrganizationTreeSelect';

const { RangePicker } = DatePicker;

interface LineRecord {
  id?: number;
  orgId: number;
  orgName?: string;
  accountId?: number;
  accountName?: string;
  accountPath?: string;
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

  // 获取系统配置 - 产线班次
  const { data: systemConfigs = [] } = useQuery({
    queryKey: ['systemConfigs'],
    queryFn: () =>
      request.get('/hr/system-configs').then((res: any) => res || []),
  });

  // 获取配置的产线开线班次属性(优先使用属性配置)
  const configuredShiftPropertyKeys = systemConfigs.find(
    (c: any) => c.configKey === 'productionLineShiftPropertyKeys'
  )?.configValue?.split(',').filter((key: string) => key) || [];

  // 获取配置的产线班次ID列表(兼容旧数据)
  const configuredShiftIds = systemConfigs.find(
    (c: any) => c.configKey === 'productionLineShiftIds'
  )?.configValue?.split(',').map((id: string) => parseInt(id)) || [];

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

  // 获取组织架构树（用于包含子组织功能）
  const { data: orgTree } = useQuery({
    queryKey: ['organizations-tree'],
    queryFn: () =>
      request.get('/hr/organizations/tree').then((res: any) => res || []),
  });

  // 查询条件
  const [filters, setFilters] = useState({
    dateRange: null as any,
    orgId: null as number | number[] | null,
    includeChildren: false,
    shiftId: null as number | null,
  });

  // 递归获取组织及其所有子组织ID
  const getAllChildOrgIds = (orgId: number | number[], tree: any[]): number[] => {
    const ids = Array.isArray(orgId) ? orgId : [orgId];
    const result = new Set<number>(ids);

    const addAllChildren = (node: any) => {
      if (!node.children || node.children.length === 0) return;

      node.children.forEach((child: any) => {
        result.add(child.id);
        // 递归添加子节点的子节点
        addAllChildren(child);
      });
    };

    // 遍历树，找到所有选中的节点，并添加其所有子节点
    const traverseAndAddChildren = (nodes: any[]) => {
      nodes.forEach((node) => {
        if (result.has(node.id)) {
          // 找到选中的节点，递归添加其所有子节点
          addAllChildren(node);
        }
        // 继续遍历子节点
        if (node.children) {
          traverseAndAddChildren(node.children);
        }
      });
    };

    traverseAndAddChildren(tree);
    return Array.from(result);
  };

  // 计算实际查询的组织数量（用于提示）
  const actualOrgIds = useMemo(() => {
    console.log('计算 actualOrgIds, filters:', filters);
    if (!filters.orgId || !orgTree) return [];
    let result;
    if (filters.includeChildren) {
      result = getAllChildOrgIds(filters.orgId, orgTree);
      console.log('包含子组织，递归获取后的 orgIds:', result);
    } else {
      result = Array.isArray(filters.orgId) ? filters.orgId : [filters.orgId];
      console.log('不包含子组织，直接使用 orgIds:', result);
    }
    return result;
  }, [filters.orgId, filters.includeChildren, orgTree]);

  // 获取开线记录列表
  const { data: lineRecords, isLoading, refetch } = useQuery({
    queryKey: ['lineMaintenanceRecords', filters],
    queryFn: () => {
      console.log('=== useQuery queryFn 被调用 ===');
      console.log('当前 filters:', filters);

      // 计算要查询的组织ID列表
      let queryOrgIds = filters.orgId;
      if (filters.orgId && filters.includeChildren && orgTree) {
        // 如果包含子组织，获取所有子组织ID
        queryOrgIds = getAllChildOrgIds(filters.orgId, orgTree);
        console.log('包含子组织，递归获取后的 queryOrgIds:', queryOrgIds);
      } else {
        console.log('不包含子组织或未勾选，直接使用 filters.orgId:', queryOrgIds);
      }

      const params: any = {
        shiftId: filters.shiftId,
      };

      // 只有当有日期范围时才添加日期参数
      if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
        params.startDate = filters.dateRange[0].format('YYYY-MM-DD');
        params.endDate = filters.dateRange[1].format('YYYY-MM-DD');
      }

      // 添加组织ID参数
      if (queryOrgIds) {
        params.orgIds = Array.isArray(queryOrgIds) ? queryOrgIds : [queryOrgIds];
        console.log('添加 orgIds 参数:', params.orgIds);
      }

      console.log('最终查询参数:', params);
      console.log('请求URL:', '/allocation/line-shifts');

      return request.get('/allocation/line-shifts', {
        params,
      }).then((res: any) => {
        console.log('API返回结果:', res);
        const items = res?.items || [];
        console.log('返回数据条数:', items.length);
        return items;
      }).catch((error: any) => {
        console.error('API请求失败:', error);
        throw error;
      });
    },
    // 确保每次filters变化都重新获取
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // 监听filters变化
  useEffect(() => {
    console.log('=== filters 变化 ===', filters);
    console.log('queryKey 也会变化，应该触发查询');
  }, [filters]);

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

      // 获取 productionLineHierarchyLevel 配置的可选层级
      const productionLineConfig = systemConfigs?.find((c: any) => c.configKey === 'productionLineHierarchyLevel');
      const selectableLevelIds = productionLineConfig?.configValue
        ? productionLineConfig.configValue.split(',').map((id: string) => parseInt(id.trim()))
        : [];

      // 获取劳动力账户信息
      const accountId = values.orgId;
      let orgId = accountId;
      let orgName = '';
      let accountName = '';
      let accountPath = '';

      // 如果选择了账户，查询账户详情
      if (accountId) {
        try {
          const account = await request.get(`/account/accounts/${accountId}`);

          // 解析 hierarchyValues
          if (account.hierarchyValues) {
            const hierarchyValues = typeof account.hierarchyValues === 'string'
              ? JSON.parse(account.hierarchyValues)
              : account.hierarchyValues;

            // 获取账户名称和路径
            accountName = account.namePath || account.name || '';
            accountPath = account.path || account.code || '';

            // 获取所有组织类型的层级，按层级序号排序
            const orgLevels = hierarchyValues
              .filter((hv: any) =>
                hv.mappingType === 'ORG' || hv.mappingType === 'ORG_TYPE'
              )
              .sort((a: any, b: any) => a.level - b.level);

            // 找到用户实际选择的层级：优先使用 productionLineHierarchyLevel 配置中存在的最深层级（用户最终选择的层级）
            // 从最深层（level最大）开始找，找到���一个在 productionLineHierarchyLevel 配置中的层级
            for (let i = orgLevels.length - 1; i >= 0; i--) {
              const level = orgLevels[i];
              if (selectableLevelIds.includes(level.level) && level.selectedValue?.id) {
                orgId = level.selectedValue.id;
                orgName = level.selectedValue.name;
                break;
              }
            }
          }
        } catch (error) {
          console.error('获取账户信息失败:', error);
        }
      }

      // 组合日期和时间创建完整的DateTime字符串
      const scheduleDate = values.scheduleDate.format('YYYY-MM-DD');
      const startDateTime = values.startTime
        ? dayjs(`${scheduleDate} ${values.startTime.format('HH:mm')}`).toISOString()
        : null;
      const endDateTime = values.endTime
        ? dayjs(`${scheduleDate} ${values.endTime.format('HH:mm')}`).toISOString()
        : null;

      const data: LineRecord = {
        orgId: orgId,
        orgName: orgName || `产线${orgId}`,
        accountId: accountId,
        accountName: accountName,
        accountPath: accountPath,
        orgIds: [orgId],
        orgNames: [orgName],
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

  // 重置查询
  const handleResetFilters = () => {
    setFilters({
      dateRange: null,
      orgId: null,
      includeChildren: false,
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
      title: '产线组织',
      dataIndex: 'orgName',
      key: 'orgName',
      width: 150,
      render: (name: string) => name || '-',
    },
    {
      title: '产线账户',
      dataIndex: 'accountName',
      key: 'accountName',
      width: 250,
      ellipsis: true,
      render: (name: string, record: LineRecord) => name || record.orgName || '-',
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
          <Form.Item label="产线组织">
            <OrganizationTreeSelect
              value={filters.orgId}
              onChange={(value) => {
                console.log('组织选择onChange触发，value:', value, '类型:', typeof value);
                setFilters({ ...filters, orgId: value });
              }}
              onIncludeChildrenChange={(include) => {
                console.log('包含子组织onChange触发，include:', include);
                setFilters({ ...filters, includeChildren: include });
              }}
              placeholder="请选择产线组织"
              allowClear
              multiple
              showIncludeChildren
              includeChildren={filters.includeChildren}
              showSelectAll
              style={{ width: '100%', maxWidth: 400 }}
            />
            {actualOrgIds.length > 0 && (
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {filters.includeChildren
                  ? `已包含子组织，共查询 ${actualOrgIds.length} 个组织`
                  : `查询 ${actualOrgIds.length} 个组织`
                }
              </div>
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
            <LineAccountSelect
              placeholder="请选择产线账户"
              allowClear={false}
              directOpenCreate={true}
              showOtherTab={false}
              onAccountCreated={(accountId) => {
                // 当账户创建成功后，自动填充到表单
                form.setFieldsValue({ orgId: accountId });
                message.success('产线账户创建成功');
              }}
            />
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
