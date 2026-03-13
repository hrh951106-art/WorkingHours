import { useState } from 'react';
import { Card, Tabs, Table, Button, Modal, Form, Input, Select, message, Space, Tag, DatePicker, Divider, Row, Col, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
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
}> = ({ value, onChange, usageType }) => {
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
    />
  );
};

const PunchPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('devices');
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isBindModalOpen, setIsBindModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [deviceForm] = Form.useForm();
  const [recordForm] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => request.get('/hr/employees').then((res: any) => res.items || []),
  });

  const { data: devices, isLoading: devicesLoading } = useQuery({
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

  const { data: punchAccounts } = useQuery({
    queryKey: ['punch-accounts'],
    queryFn: () =>
      request.get('/account/accounts', {
        params: { type: 'SUB', usageType: 'PUNCH', pageSize: 1000 },
      }).then((res: any) => res.items || []),
  });

  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ['punchRecords'],
    queryFn: () => request.get('/punch/records').then((res: any) => res),
    enabled: activeTab === 'records',
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
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '绑定失败';
      message.error(errorMsg);
      console.error('绑定账户失败:', error);
    },
  });

  const createRecordMutation = useMutation({
    mutationFn: (data: any) => {
      const requestData = {
        ...data,
        punchTime: data.punchTime.format('YYYY-MM-DD HH:mm:ss'),
      };
      return request.post('/punch/records', requestData);
    },
    onSuccess: () => {
      message.success('补录成功');
      queryClient.invalidateQueries({ queryKey: ['punchRecords'] });
      setIsRecordModalOpen(false);
      recordForm.resetFields();
      setSelectedRecord(null);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '补录失败';
      message.error(errorMsg);
      console.error('补录打卡记录失败:', error);
    },
  });

  const updateRecordMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => {
      const requestData = {
        ...data,
        punchTime: data.punchTime.format('YYYY-MM-DD HH:mm:ss'),
      };
      return request.put(`/punch/records/${id}`, requestData);
    },
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['punchRecords'] });
      setIsRecordModalOpen(false);
      recordForm.resetFields();
      setSelectedRecord(null);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '更新失败';
      message.error(errorMsg);
      console.error('更新打卡记录失败:', error);
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/punch/records/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['punchRecords'] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '删除失败';
      message.error(errorMsg);
      console.error('删除打卡记录失败:', error);
    },
  });

  const getAccountDisplayName = (acc: any) => {
    if (!acc) return '';
    if (acc.namePath) {
      return acc.namePath.replace(/\s*\/\s*/g, '/');
    }
    return acc.name || acc.path || '';
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

  const recordColumns = [
    { title: '员工编号', dataIndex: 'employeeNo', key: 'employeeNo' },
    {
      title: '员工姓名',
      dataIndex: 'employee',
      key: 'employee',
      render: (employee: any) => employee?.name || '-',
    },
    {
      title: '打卡时间',
      dataIndex: 'punchTime',
      key: 'punchTime',
      render: (time: string) => {
        if (!time) return '-';
        return dayjs(time).format('YYYY-MM-DD HH:mm:ss');
      },
    },
    {
      title: '设备',
      dataIndex: 'device',
      key: 'device',
      render: (device: any) => device?.name || '-',
    },
    {
      title: '打卡类型',
      dataIndex: 'punchType',
      key: 'punchType',
      render: (type: string) => {
        const typeMap: any = {
          IN: '签入',
          OUT: '签出',
        };
        return typeMap[type] || type;
      },
    },
    {
      title: '子账户',
      dataIndex: 'account',
      key: 'account',
      render: (account: any) => {
        if (!account) return '-';
        return getAccountDisplayName(account);
      },
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => {
        const sourceMap: any = {
          AUTO: '自动',
          MANUAL: '手动',
        };
        return <Tag color={source === 'MANUAL' ? 'blue' : 'green'}>{sourceMap[source] || source}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditRecord(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这条打卡记录吗？"
            onConfirm={() => handleDeleteRecord(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
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
    deviceForm.setFieldsValue({ bindings });
    setIsBindModalOpen(true);
  };

  const handleBindModalOk = async () => {
    try {
      const values = await deviceForm.validateFields();
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
    deviceForm.resetFields();
  };

  const handleAddRecord = () => {
    setSelectedRecord(null);
    recordForm.resetFields();
    setIsRecordModalOpen(true);
  };

  const handleEditRecord = (record: any) => {
    setSelectedRecord(record);
    recordForm.setFieldsValue({
      employeeNo: record.employeeNo,
      punchTime: dayjs(record.punchTime),
      deviceId: record.deviceId,
      punchType: record.punchType,
      accountId: record.accountId,
    });
    setIsRecordModalOpen(true);
  };

  const handleDeleteRecord = (id: number) => {
    deleteRecordMutation.mutate(id);
  };

  const handleRecordModalOk = async () => {
    try {
      const values = await recordForm.validateFields();
      if (selectedRecord) {
        updateRecordMutation.mutate({ id: selectedRecord.id, data: values });
      } else {
        createRecordMutation.mutate(values);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleRecordModalCancel = () => {
    setIsRecordModalOpen(false);
    recordForm.resetFields();
    setSelectedRecord(null);
  };

  return (
    <div>
      <Card
        title="打卡管理"
        extra={
          activeTab === 'devices' && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddDevice}>
              添加设备
            </Button>
          )
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'devices',
              label: '设备管理',
              children: (
                <Table
                  columns={deviceColumns}
                  dataSource={devices || []}
                  rowKey="id"
                  loading={devicesLoading}
                  pagination={false}
                />
              ),
            },
            {
              key: 'records',
              label: '打卡记录',
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRecord}>
                      补录打卡
                    </Button>
                  </div>
                  <Table
                    columns={recordColumns}
                    dataSource={records?.items || []}
                    rowKey="id"
                    loading={recordsLoading}
                    pagination={{
                      total: records?.total || 0,
                      pageSize: records?.pageSize || 10,
                      current: records?.page || 1,
                    }}
                  />
                </div>
              ),
            },
            {
              key: 'exceptions',
              label: '异常记录',
              children: <div>异常记录列表</div>,
            },
          ]}
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

        <Form form={deviceForm} layout="vertical">
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
                          name={[index, 'accountId']}
                          label={index === 0 ? '子劳动力账户' : ''}
                          rules={[{ required: true, message: '请选择子劳动力账户' }]}
                          style={{ marginBottom: 0 }}
                        >
                          <BindingAccountSelect usageType="DEVICE" />
                        </Form.Item>
                      </Col>
                      <Col span={5}>
                        <Form.Item
                          {...field}
                          name={[index, 'effectiveDate']}
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
                          name={[index, 'expiryDate']}
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

      {/* 补录打卡记录弹窗 */}
      <Modal
        title={selectedRecord ? '编辑打卡记录' : '补录打卡记录'}
        open={isRecordModalOpen}
        onOk={handleRecordModalOk}
        onCancel={handleRecordModalCancel}
        confirmLoading={createRecordMutation.isPending || updateRecordMutation.isPending}
        okText="确定"
        cancelText="取消"
        width={600}
      >
        <Form form={recordForm} layout="vertical">
          <Form.Item name="employeeNo" label="员工" rules={[{ required: true, message: '请选择员工' }]}>
            <Select placeholder="请选择员工" showSearch optionFilterProp="children">
              {employees?.map((emp: any) => (
                <Select.Option key={emp.id} value={emp.employeeNo}>
                  {emp.name} ({emp.employeeNo})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="punchTime"
            label="打卡时间"
            rules={[{ required: true, message: '请选择打卡时间' }]}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              style={{ width: '100%' }}
              placeholder="请选择打卡时间"
            />
          </Form.Item>

          <Form.Item name="deviceId" label="刷卡设备" rules={[{ required: true, message: '请选择刷卡设备' }]}>
            <Select placeholder="请选择刷卡设备">
              {devices?.map((device: any) => (
                <Select.Option key={device.id} value={device.id}>
                  {device.name} ({device.code})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="punchType" label="刷卡标签" rules={[{ required: true, message: '请选择刷卡标签' }]}>
            <Select placeholder="请选择刷卡标签">
              <Select.Option value="IN">签入</Select.Option>
              <Select.Option value="OUT">签出</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="accountId" label="子劳动力账户">
            <BindingAccountSelect usageType="PUNCH" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PunchPage;
