import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Tag,
  Popconfirm,
  Divider,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

const DeviceGroupPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [deviceForm] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: groups, isLoading } = useQuery({
    queryKey: ['device-groups'],
    queryFn: () => request.get('/punch/device-groups').then((res: any) => res),
  });

  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => request.get('/punch/devices').then((res: any) => res),
  });

  const { data: groupDetail } = useQuery({
    queryKey: ['device-group-detail', selectedGroupId],
    queryFn: () => request.get(`/punch/device-groups/${selectedGroupId}`).then((res: any) => res),
    enabled: !!selectedGroupId && isDeviceModalOpen,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => request.post('/punch/device-groups', data),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['device-groups'] });
      setIsModalOpen(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '创建失败');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => request.put(`/punch/device-groups/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['device-groups'] });
      setIsModalOpen(false);
      setEditingGroup(null);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '更新失败');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/punch/device-groups/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['device-groups'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '删除失败');
    },
  });

  const addDevicesMutation = useMutation({
    mutationFn: ({ groupId, deviceIds }: { groupId: number; deviceIds: number[] }) =>
      request.post(`/punch/device-groups/${groupId}/add-devices`, { deviceIds }),
    onSuccess: () => {
      message.success('添加成功');
      queryClient.invalidateQueries({ queryKey: ['device-groups'] });
      queryClient.invalidateQueries({ queryKey: ['device-group-detail', selectedGroupId] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      deviceForm.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '添加失败');
    },
  });

  const removeDevicesMutation = useMutation({
    mutationFn: (deviceIds: number[]) =>
      request.post('/punch/device-groups/remove-devices', { deviceIds }),
    onSuccess: () => {
      message.success('移除成功');
      queryClient.invalidateQueries({ queryKey: ['device-groups'] });
      queryClient.invalidateQueries({ queryKey: ['device-group-detail', selectedGroupId] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      deviceForm.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '移除失败');
    },
  });

  const handleAdd = () => {
    setEditingGroup(null);
    form.resetFields();
    form.setFieldsValue({ status: 'ACTIVE' });
    setIsModalOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditingGroup(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingGroup) {
        updateMutation.mutate({ id: editingGroup.id, ...values });
      } else {
        createMutation.mutate(values);
      }
    });
  };

  const handleManageDevices = (groupId: number) => {
    setSelectedGroupId(groupId);
    setIsDeviceModalOpen(true);
    deviceForm.resetFields();
  };

  const handleAddDevices = () => {
    deviceForm.validateFields().then((values) => {
      if (!values.deviceIds || values.deviceIds.length === 0) {
        message.warning('请选择设备');
        return;
      }
      addDevicesMutation.mutate({
        groupId: selectedGroupId!,
        deviceIds: values.deviceIds,
      });
    });
  };

  const handleRemoveDevices = () => {
    deviceForm.validateFields().then((values) => {
      if (!values.deviceIds || values.deviceIds.length === 0) {
        message.warning('请选择设备');
        return;
      }
      Modal.confirm({
        title: '确认移除',
        content: '确定要将选中的设备从设备组中移除吗？',
        onOk: () => {
          removeDevicesMutation.mutate(values.deviceIds);
        },
      });
    });
  };

  const columns = [
    { title: '设备组编码', dataIndex: 'code', key: 'code' },
    { title: '设备组名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description', render: (text: string) => text || '-' },
    {
      title: '设备数量',
      dataIndex: '_count',
      key: 'deviceCount',
      render: (count: any) => `${count?.devices || 0} 台`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>{status === 'ACTIVE' ? '激活' : '停用'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" icon={<SettingOutlined />} onClick={() => handleManageDevices(record.id)}>
            管理设备
          </Button>
          <Popconfirm
            title="确定要删除这个设备组吗？"
            onConfirm={() => handleDelete(record.id)}
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

  // 获取未分配到当前设备组的设备
  const availableDevices = devices?.filter((d: any) => d.groupId === null || d.groupId === undefined) || [];

  // 获取当前设备组的设备
  const groupDevices = groupDetail?.devices || [];

  return (
    <div>
      <Card
        title="设备组管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增设备组
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={groups || []}
          rowKey="id"
          loading={isLoading}
          pagination={false}
        />
      </Card>

      {/* 新增/编辑设备组弹窗 */}
      <Modal
        title={editingGroup ? '编辑设备组' : '新增设备组'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingGroup(null);
          form.resetFields();
        }}
        okButtonProps={{ loading: createMutation.isPending || updateMutation.isPending }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="设备组名称"
            rules={[{ required: true, message: '请输入设备组名称' }]}
          >
            <Input placeholder="请输入设备组名称" />
          </Form.Item>

          <Form.Item
            name="code"
            label="设备组编码"
            rules={[{ required: true, message: '请输入设备组编码' }]}
          >
            <Input placeholder="请输入设备组编码" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入描述" rows={3} />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select>
              <Select.Option value="ACTIVE">激活</Select.Option>
              <Select.Option value="INACTIVE">停用</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 管理设备弹窗 */}
      <Modal
        title="管理设备"
        open={isDeviceModalOpen}
        onCancel={() => {
          setIsDeviceModalOpen(false);
          setSelectedGroupId(null);
          deviceForm.resetFields();
        }}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Form form={deviceForm} layout="inline">
              <Form.Item name="deviceIds" label="选择设备" style={{ marginBottom: 0, width: 400 }}>
                <Select
                  mode="multiple"
                  placeholder="请选择设备"
                  style={{ width: '100%' }}
                  options={availableDevices.map((d: any) => ({
                    label: `${d.name} (${d.code})`,
                    value: d.id,
                  }))}
                />
              </Form.Item>
              <Button type="primary" onClick={handleAddDevices} loading={addDevicesMutation.isPending}>
                添加到设备组
              </Button>
              <Button danger onClick={handleRemoveDevices} loading={removeDevicesMutation.isPending}>
                从设备组移除
              </Button>
            </Form>
          </Space>
        </div>

        <Divider />

        <div>
          <h4>设备组内的设备</h4>
          <Table
            columns={[
              { title: '设备编码', dataIndex: 'code', key: 'code' },
              { title: '设备名称', dataIndex: 'name', key: 'name' },
              { title: '设备类型', dataIndex: 'type', key: 'type' },
              {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                render: (status: string) => (
                  <Tag color={status === 'NORMAL' ? 'green' : 'red'}>
                    {status === 'NORMAL' ? '正常' : '禁用'}
                  </Tag>
                ),
              },
            ]}
            dataSource={groupDevices}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </div>
      </Modal>
    </div>
  );
};

export default DeviceGroupPage;
