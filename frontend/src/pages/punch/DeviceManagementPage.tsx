import { useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, message, Space, Tag, DatePicker, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import AccountSelect from '@/components/common/AccountSelect';
import dayjs from 'dayjs';

interface DeviceBinding {
  accountId: number | null;
  effectiveDate: any;
  expiryDate?: any;
}

// 绑定账户选择器组件（包含新建功能）
const BindingAccountSelect: React.FC<{
  value?: number;
  onChange?: (value: number | null) => void;
  usageType: string;
  segmentAccountIds?: number[];
  isEdit?: boolean;
}> = ({ value, onChange, usageType, segmentAccountIds = [], isEdit = false }) => {
  const queryClient = useQueryClient();

  const handleAccountCreated = (newAccountId: number) => {
    // 刷新账户列表
    queryClient.invalidateQueries({ queryKey: ['device-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['punch-accounts'] });
    // 自动选中新创建的账户
    onChange?.(newAccountId);
  };

  return (
    <AccountSelect
      value={value}
      onChange={onChange}
      usageType={usageType}
      placeholder="选择账户"
      allowClear={true}
      showCreateButton={true}
      onAccountCreated={handleAccountCreated}
      segmentAccountIds={segmentAccountIds}
      isEdit={isEdit}
    />
  );
};

const DeviceManagementPage: React.FC = () => {
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isBindModalOpen, setIsBindModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');
  const [deviceForm] = Form.useForm();
  const [bindForm] = Form.useForm(); // 添加独立的form用于绑定账户
  const [boundAccountIds, setBoundAccountIds] = useState<number[]>([]); // 收集所有已绑定的账户ID
  const queryClient = useQueryClient();

  const { data: devices, isLoading } = useQuery({
    queryKey: ['punchDevices'],
    queryFn: () => request.get('/punch/devices').then((res: any) => res),
  });

  const { data: deviceGroups } = useQuery({
    queryKey: ['device-groups'],
    queryFn: () => request.get('/punch/device-groups').then((res: any) => res),
  });

  const { data: deviceAccounts } = useQuery({
    queryKey: ['device-accounts'],
    queryFn: () =>
      request.get('/account/accounts', {
        params: { type: 'SUB', usageType: 'DEVICE', pageSize: 1000 },
      }).then((res: any) => res.items || []),
  });

  const createDeviceMutation = useMutation({
    mutationFn: (data: any) => request.post('/punch/devices', data),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['punchDevices'] });
      setIsDeviceModalOpen(false);
      deviceForm.resetFields();
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '创建失败';
      message.error(errorMsg);
      console.error('创建设备失败:', error);
    },
  });

  const bindAccountsMutation = useMutation({
    mutationFn: ({ deviceId, bindings }: { deviceId: number; bindings: any[] }) =>
      request.post(`/punch/devices/${deviceId}/bind-accounts`, { bindings }),
    onSuccess: () => {
      message.success('绑定成功');
      queryClient.invalidateQueries({ queryKey: ['punchDevices'] });
      setIsBindModalOpen(false);
      setSelectedDevice(null);
      bindForm.resetFields(); // 重置绑定表单
      setBoundAccountIds([]); // 清空已绑定账户ID列表
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '绑定失败';
      message.error(errorMsg);
      console.error('绑定账户失败:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/punch/devices/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['punchDevices'] });
      setSelectedRowKeys([]);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '删除失败';
      message.error(errorMsg);
      console.error('删除设备失败:', error);
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => Promise.all(ids.map(id => request.delete(`/punch/devices/${id}`))),
    onSuccess: () => {
      message.success(`成功删除 ${selectedRowKeys.length} 个设备`);
      queryClient.invalidateQueries({ queryKey: ['punchDevices'] });
      setSelectedRowKeys([]);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '批量删除失败';
      message.error(errorMsg);
      console.error('批量删除设备失败:', error);
    },
  });

  const handleDelete = (id: number) => {
    if (confirm('确定要删除这个设备吗？')) {
      deleteMutation.mutate(id);
    }
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的设备');
      return;
    }
    if (confirm(`确定要删除选中的 ${selectedRowKeys.length} 个设备吗？`)) {
      batchDeleteMutation.mutate(selectedRowKeys as number[]);
    }
  };

  const deviceColumns = [
    { title: '设备编码', dataIndex: 'code', key: 'code' },
    { title: '设备名称', dataIndex: 'name', key: 'name' },
    {
      title: '设备类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap: any = {
          FINGERPRINT: '指纹考勤机',
          FACE: '人脸考勤机',
          IC_CARD: 'IC卡读卡器',
          MOBILE_APP: '手机APP',
          WIFI: 'WiFi打卡',
        };
        return typeMap[type] || type;
      },
    },
    {
      title: '设备组',
      dataIndex: 'group',
      key: 'group',
      render: (group: any) => (group ? <Tag color="blue">{group.name}</Tag> : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: any = {
          NORMAL: 'green',
          FAULT: 'red',
          MAINTENANCE: 'orange',
          DISABLED: 'default',
        };
        const textMap: any = {
          NORMAL: '正常',
          FAULT: '故障',
          MAINTENANCE: '维护中',
          DISABLED: '停用',
        };
        return <Tag color={colorMap[status]}>{textMap[status] || status}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" onClick={() => handleBindAccounts(record)}>
            绑定账户
          </Button>
        </Space>
      ),
    },
  ];

  const handleAddDevice = () => {
    deviceForm.resetFields();
    setIsDeviceModalOpen(true);
  };

  const handleDeviceModalOk = async () => {
    try {
      const values = await deviceForm.validateFields();
      createDeviceMutation.mutate(values);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleDeviceModalCancel = () => {
    setIsDeviceModalOpen(false);
    deviceForm.resetFields();
  };

  const handleBindAccounts = (device: any) => {
    setSelectedDevice(device);
    // 转换现有的绑定关系为表单数据
    const bindings: DeviceBinding[] = (device.bindings || []).map((b: any) => ({
      accountId: b.accountId,
      effectiveDate: dayjs(b.effectiveDate),
      expiryDate: b.expiryDate ? dayjs(b.expiryDate) : undefined,
    }));

    // 收集所有已绑定的账户ID，用于AccountSelect组件回显
    const accountIds = (device.bindings || [])
      .map((b: any) => b.accountId)
      .filter((id: number | null) => id != null);
    setBoundAccountIds(accountIds);

    bindForm.setFieldsValue({ bindings });
    setIsBindModalOpen(true);
  };

  const handleBindModalOk = async () => {
    try {
      const values = await bindForm.validateFields();
      const { bindings } = values;

      if (!bindings || bindings.length === 0) {
        message.warning('请至少添加一个绑定');
        return;
      }

      // 验证绑定数据
      for (let i = 0; i < bindings.length; i++) {
        const binding = bindings[i];
        if (!binding.accountId) {
          message.error(`第 ${i + 1} 行请选择子劳动力账户`);
          return;
        }
        if (!binding.effectiveDate) {
          message.error(`第 ${i + 1} 行请选择生效时间`);
          return;
        }
        if (binding.expiryDate && binding.effectiveDate >= binding.expiryDate) {
          message.error(`第 ${i + 1} 行失效时间必须晚于生效时间`);
          return;
        }
      }

      // 检查时间段冲突
      for (let i = 0; i < bindings.length; i++) {
        for (let j = i + 1; j < bindings.length; j++) {
          const binding1 = bindings[i];
          const binding2 = bindings[j];

          const effective1 = binding1.effectiveDate;
          const expiry1 = binding1.expiryDate;
          const effective2 = binding2.effectiveDate;
          const expiry2 = binding2.expiryDate;

          // 检查两个时间段是否有重叠
          let hasOverlap = false;

          if (!expiry1 && !expiry2) {
            // 两个都是永久有效，肯定重叠
            hasOverlap = true;
          } else if (!expiry1) {
            // binding1 永久有效，检查 binding2 的开始时间是否在 binding1 之后
            hasOverlap = effective2.isBefore(effective1);
          } else if (!expiry2) {
            // binding2 永久有效，检查 binding1 的开始时间是否在 binding2 之后
            hasOverlap = effective1.isBefore(effective2);
          } else {
            // 两个都有失效时间，检查区间是否重叠
            hasOverlap = !(
              effective1.isAfter(expiry2) ||
              effective2.isAfter(expiry1) ||
              expiry1.isSame(effective2) ||
              expiry2.isSame(effective1)
            ) && !(effective1.isSameOrAfter(expiry1) || effective2.isSameOrAfter(expiry2));
          }

          if (hasOverlap) {
            const timeRange1 = `${effective1.format('YYYY-MM-DD HH:mm')} ~ ${expiry1 ? expiry1.format('YYYY-MM-DD HH:mm') : '永久'}`;
            const timeRange2 = `${effective2.format('YYYY-MM-DD HH:mm')} ~ ${expiry2 ? expiry2.format('YYYY-MM-DD HH:mm') : '永久'}`;
            message.error({
              content: `时间段冲突！\n第 ${i + 1} 行 (${timeRange1}) 与 第 ${j + 1} 行 (${timeRange2}) 存在时间重叠`,
              duration: 5,
            });
            return;
          }
        }
      }

      // 转换为后端需要的格式
      const bindingsData = bindings.map((b: DeviceBinding) => ({
        accountId: b.accountId,
        effectiveDate: b.effectiveDate.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
        expiryDate: b.expiryDate ? b.expiryDate.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]') : null,
      }));

      if (selectedDevice) {
        bindAccountsMutation.mutate({
          deviceId: selectedDevice.id,
          bindings: bindingsData,
        });
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleBindModalCancel = () => {
    setIsBindModalOpen(false);
    setSelectedDevice(null);
    bindForm.resetFields();
    setBoundAccountIds([]); // 清空已绑定账户ID列表
  };

  // 过滤设备数据
  const filteredDevices = (devices || []).filter((device: any) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      device.code?.toLowerCase().includes(searchLower) ||
      device.name?.toLowerCase().includes(searchLower) ||
      device.type?.toLowerCase().includes(searchLower)
    );
  });

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div>
      <Card
        title="设备管理"
        extra={
          <Space>
            <Input
              placeholder="搜索设备编码、名称或类型"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 250 }}
              allowClear
            />
            {selectedRowKeys.length > 0 && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleBatchDelete}
              >
                批量删除 ({selectedRowKeys.length})
              </Button>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddDevice}>
              添加设备
            </Button>
          </Space>
        }
      >
        <Table
          columns={deviceColumns}
          dataSource={filteredDevices}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          rowSelection={rowSelection}
        />
      </Card>

      {/* 添加设备弹窗 */}
      <Modal
        title="添加设备"
        open={isDeviceModalOpen}
        onOk={handleDeviceModalOk}
        onCancel={handleDeviceModalCancel}
        confirmLoading={createDeviceMutation.isPending}
        okText="确定"
        cancelText="取消"
      >
        <Form form={deviceForm} layout="vertical">
          <Form.Item name="code" label="设备编码" rules={[{ required: true, message: '请输入设备编码' }]}>
            <Input placeholder="请输入设备编码" />
          </Form.Item>

          <Form.Item name="name" label="设备名称" rules={[{ required: true, message: '请输入设备名称' }]}>
            <Input placeholder="请输入设备名称" />
          </Form.Item>

          <Form.Item name="type" label="设备类型" rules={[{ required: true, message: '请选择设备类型' }]}>
            <Select placeholder="请选择设备类型">
              <Select.Option value="FINGERPRINT">指纹考勤机</Select.Option>
              <Select.Option value="FACE">人脸考勤机</Select.Option>
              <Select.Option value="IC_CARD">IC卡读卡器</Select.Option>
              <Select.Option value="MOBILE_APP">手机APP</Select.Option>
              <Select.Option value="WIFI">WiFi打卡</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="groupId" label="设备组">
            <Select placeholder="请选择设备组" allowClear>
              {(deviceGroups || []).map((group: any) => (
                <Select.Option key={group.id} value={group.id}>
                  {group.name} ({group.code})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 绑定子账户弹窗 */}
      <Modal
        title="绑定子劳动力账户"
        open={isBindModalOpen}
        onOk={handleBindModalOk}
        onCancel={handleBindModalCancel}
        confirmLoading={bindAccountsMutation.isPending}
        okText="确定"
        cancelText="取消"
        width={900}
      >
        <div style={{ marginBottom: 16, padding: 12, background: '#f0f5ff', borderRadius: 6, border: '1px solid #adc6ff' }}>
          <div style={{ fontSize: 12, color: '#595959', lineHeight: '20px' }}>
            <div style={{ marginBottom: 4 }}><strong>说明：</strong></div>
            <div>• 可以为同一个设备添加多个子账户绑定，每个绑定可以设置不同的生效时间和失效时间</div>
            <div>• 同一时间段只能有一个生效的账户绑定，系统会自动验证时间冲突</div>
            <div>• 可以在右侧选择历史账户，也可以点击"新建账户"按钮快速创建新账户</div>
          </div>
        </div>

        <Form
          form={bindForm}
          layout="vertical"
          onValuesChange={() => {
            // 监听表单变化，实时更新已绑定账户ID列表
            const bindings = bindForm.getFieldValue('bindings') || [];
            const accountIds = bindings
              .map((b: DeviceBinding) => b.accountId)
              .filter((id: number | null | undefined) => id != null);
            setBoundAccountIds(accountIds);
          }}
        >
          <Form.List name="bindings">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, index) => (
                  <div key={field.key} style={{ marginBottom: 16, padding: 16, border: '1px solid #d9d9d9', borderRadius: 8, background: '#fafafa' }}>
                    <Row gutter={16} align="top">
                      <Col span={1}>
                        <div style={{
                          textAlign: 'center',
                          fontWeight: 'bold',
                          color: '#1890ff',
                          fontSize: 16,
                          marginTop: 4
                        }}>
                          {index + 1}
                        </div>
                      </Col>
                      <Col span={11}>
                        <Form.Item
                          {...field}
                          name={[field.name, 'accountId']}
                          label={index === 0 ? '子劳动力账户' : ''}
                          rules={[{ required: true, message: '请选择子劳动力账户' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <BindingAccountSelect
                            usageType="DEVICE"
                            segmentAccountIds={boundAccountIds}
                            isEdit={true}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item
                          {...field}
                          name={[field.name, 'effectiveDate']}
                          label={index === 0 ? '生效时间' : ''}
                          rules={[{ required: true, message: '请选择生效时间' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <DatePicker
                            showTime
                            format="YYYY-MM-DD HH:mm"
                            style={{ width: '100%' }}
                            placeholder="选择生效时间"
                          />
                        </Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item
                          {...field}
                          name={[field.name, 'expiryDate']}
                          label={index === 0 ? '失效时间' : ''}
                          style={{ marginBottom: 0 }}
                        >
                          <DatePicker
                            showTime
                            format="YYYY-MM-DD HH:mm"
                            style={{ width: '100%' }}
                            placeholder="留空表示永久有效"
                          />
                        </Form.Item>
                      </Col>
                      <Col span={2} style={{ textAlign: 'center' }}>
                        {fields.length > 0 && (
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => remove(field.name)}
                            style={{ marginTop: index === 0 ? 30 : 0 }}
                          >
                            删除
                          </Button>
                        )}
                      </Col>
                    </Row>
                  </div>
                ))}

                {fields.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 0',
                    color: '#999',
                    border: '1px dashed #d9d9d9',
                    borderRadius: 8
                  }}>
                    暂无绑定记录，请点击下方按钮添加
                  </div>
                )}

                <Button
                  type="dashed"
                  onClick={() => add({
                    accountId: undefined,
                    effectiveDate: dayjs(),
                    expiryDate: undefined,
                  })}
                  block
                  icon={<PlusOutlined />}
                  style={{ marginTop: 8 }}
                >
                  添加绑定
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
};

export default DeviceManagementPage;
