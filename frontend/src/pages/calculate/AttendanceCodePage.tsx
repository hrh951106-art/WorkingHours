import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Space,
  message,
  Tag,
  Popconfirm,
  Row,
  Col,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

const { Option } = Select;

const AttendanceCodePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [includeOutside, setIncludeOutside] = useState(false);
  const [onlyOutside, setOnlyOutside] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('LEAN_HOURS');

  const { data: attendanceCodes, isLoading } = useQuery({
    queryKey: ['calculationAttendanceCodes'],
    queryFn: () => request.get('/calculate/calculation-attendance-codes').then((res: any) => res.data || res),
  });

  // 获取劳动力账户层级配置
  const { data: hierarchyLevels } = useQuery({
    queryKey: ['accountHierarchyLevels'],
    queryFn: () =>
      request.get('/account/hierarchy-config/levels').then((res: any) => {
        // 按sort排序并返回
        const levels = res || [];
        return levels.sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0));
      }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => request.post('/calculate/calculation-attendance-codes', data),
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['calculationAttendanceCodes'] });
      handleModalClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      request.put(`/calculate/calculation-attendance-codes/${id}`, data),
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['calculationAttendanceCodes'] });
      handleModalClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/calculate/calculation-attendance-codes/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['calculationAttendanceCodes'] });
    },
  });

  const handleModalOpen = async (record?: any) => {
    if (record) {
      setEditingId(record.id);
      const formValues = {
        ...record,
      };
      // 解析 accountLevels JSON 字符串为数组
      if (record.accountLevels) {
        try {
          formValues.accountLevels = JSON.parse(record.accountLevels);
        } catch {
          formValues.accountLevels = [];
        }
      }
      form.setFieldsValue(formValues);
      setIncludeOutside(record.includeOutside);
      setOnlyOutside(record.onlyOutside);
      setSelectedType(record.type || 'LEAN_HOURS');
      setIsModalOpen(true);
    } else {
      setEditingId(null);
      form.resetFields();
      setIncludeOutside(false);
      setOnlyOutside(false);
      setSelectedType('LEAN_HOURS');

      try {
        // 自动生成编码
        const res = await request.get('/calculate/calculation-attendance-codes/new-code');
        form.setFieldsValue({ code: res.code });
      } catch (error) {
        console.error('生成编码失败:', error);
        // 即使生成编码失败，也打开弹窗
      }
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingId(null);
    form.resetFields();
    setIncludeOutside(false);
    setOnlyOutside(false);
    setSelectedType('LEAN_HOURS');
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 将 accountLevels 数组转换为 JSON 字符串
      const data = {
        ...values,
        accountLevels: values.accountLevels ? JSON.stringify(values.accountLevels) : '[]',
      };

      if (editingId) {
        updateMutation.mutate({ id: editingId, data });
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleIncludeOutsideChange = (checked: boolean) => {
    setIncludeOutside(checked);
    if (checked) {
      setOnlyOutside(false);
      form.setFieldValue('onlyOutside', false);
    }
  };

  const handleOnlyOutsideChange = (checked: boolean) => {
    setOnlyOutside(checked);
    if (checked) {
      setIncludeOutside(false);
      form.setFieldValue('includeOutside', false);
    }
  };

  const columns = [
    { title: '编码', dataIndex: 'code', key: 'code', width: 120 },
    { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => {
        const typeMap: any = {
          LEAN_HOURS: { text: '精益工时', color: 'blue' },
          ATTENDANCE_HOURS: { text: '考勤工时', color: 'green' },
        };
        const config = typeMap[type] || { text: type, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      render: (unit: string) => (unit === 'HOURS' ? '小时' : '分钟'),
    },
    {
      title: '劳动力账户层级',
      dataIndex: 'accountLevels',
      key: 'accountLevels',
      width: 200,
      render: (levels: string) => {
        try {
          const parsed = JSON.parse(levels || '[]');
          if (parsed.length === 0) {
            return <Tag type="secondary">全部层级</Tag>;
          }

          // 根据层级sort值查找层级名称
          const levelNames = parsed.map((sortValue: number) => {
            const level = hierarchyLevels?.find((l: any) => l.sort === sortValue);
            return level ? level.name : `层级${sortValue + 1}`;
          });

          return <Tag color="blue">{levelNames.join(', ')}</Tag>;
        } catch {
          return <Tag type="secondary">全部层级</Tag>;
        }
      },
    },
    {
      title: '扣用餐',
      dataIndex: 'deductMeal',
      key: 'deductMeal',
      width: 80,
      render: (deduct: boolean) => (deduct ? <Tag color="orange">是</Tag> : <Tag>否</Tag>),
    },
    {
      title: '包含班外',
      dataIndex: 'includeOutside',
      key: 'includeOutside',
      width: 80,
      render: (include: boolean) => (include ? <Tag color="green">是</Tag> : <Tag>否</Tag>),
    },
    {
      title: '仅班外',
      dataIndex: 'onlyOutside',
      key: 'onlyOutside',
      width: 80,
      render: (only: boolean) => (only ? <Tag color="purple">是</Tag> : <Tag>否</Tag>),
    },
    {
      title: '计算工时',
      dataIndex: 'calculateHours',
      key: 'calculateHours',
      width: 100,
      render: (calculate: boolean) => (calculate ? <Tag color="green">是</Tag> : <Tag>否</Tag>),
    },
    {
      title: '计算金额',
      dataIndex: 'calculateAmount',
      key: 'calculateAmount',
      width: 100,
      render: (calculate: boolean) => (calculate ? <Tag color="purple">是</Tag> : <Tag>否</Tag>),
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
            icon={<EditOutlined />}
            onClick={() => handleModalOpen(record)}
            style={{ padding: 0 }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个出勤代码吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />} style={{ padding: 0 }}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card
        title="出勤代码管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleModalOpen()}
          >
            新建
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={attendanceCodes || []}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={editingId ? '编辑出勤代码' : '新建出勤代码'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleModalClose}
        width={600}
        okText="确认"
        cancelText="取消"
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            label="编码"
            name="code"
            rules={[{ required: true, message: '请输入编码' }]}
            tooltip="系统自动生成，不可修改"
          >
            <Input placeholder="系统自动生成，保存后显示" disabled={true} />
          </Form.Item>

          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="请输入出勤代码名称" />
          </Form.Item>

          <Form.Item
            label="类型"
            name="type"
            initialValue="LEAN_HOURS"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select onChange={(value) => setSelectedType(value)}>
              <Option value="LEAN_HOURS">精益工时</Option>
              <Option value="ATTENDANCE_HOURS">考勤工时</Option>
            </Select>
          </Form.Item>

          {/* 精益工时需要配置劳动力账户层级 */}
          {selectedType === 'LEAN_HOURS' && (
            <Form.Item label="劳动力账户层级" name="accountLevels" tooltip="留空表示适用于全部层级，否则仅适用于选中的层级">
              <Select
                mode="multiple"
                placeholder="选择层级，留空表示全部层级"
                options={hierarchyLevels?.map((level: any) => ({
                  label: level.name,
                  value: level.sort,
                }))}
                tokenSeparators={[',']}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          )}

          {/* 精益工时和考勤工时共有的配置 */}
          {(selectedType === 'LEAN_HOURS' || selectedType === 'ATTENDANCE_HOURS') && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="是否计算工时"
                    name="calculateHours"
                    valuePropName="checked"
                    initialValue={true}
                    tooltip="该出勤代码是否参与工时计算"
                  >
                    <Switch />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    label="是否扣用餐"
                    name="deductMeal"
                    valuePropName="checked"
                    initialValue={false}
                    tooltip="计算工时是否扣除用餐时间"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="包含班外时数"
                    name="includeOutside"
                    valuePropName="checked"
                    initialValue={false}
                    tooltip="工时计算是否包含班外时数"
                  >
                    <Switch onChange={handleIncludeOutsideChange} disabled={onlyOutside} />
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    label="是否计算金额"
                    name="calculateAmount"
                    valuePropName="checked"
                    initialValue={false}
                    tooltip="是否计算该工时的金额"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              {/* 精益工时才显示"仅计算班外时数" */}
              {selectedType === 'LEAN_HOURS' && (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="仅计算班外时数"
                      name="onlyOutside"
                      valuePropName="checked"
                      initialValue={false}
                      tooltip="只计算班外时数，不计算班内时数"
                    >
                      <Switch onChange={handleOnlyOutsideChange} disabled={includeOutside} />
                    </Form.Item>
                  </Col>
                </Row>
              )}
            </>
          )}

          <Form.Item
            label="单位"
            name="unit"
            initialValue="HOURS"
            rules={[{ required: true, message: '请选择单位' }]}
          >
            <Select>
              <Option value="HOURS">小时</Option>
              <Option value="MINUTES">分钟</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AttendanceCodePage;
