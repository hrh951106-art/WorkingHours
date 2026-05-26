import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  message,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Popconfirm,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

interface AttendanceCode {
  id: number;
  code: string;
  name: string;
  type: string;
  unit: string;
  calcAttendanceCode: string | null;
  showInDetailPage: boolean;
  showInAttendanceCard: boolean;
  calculateHours: boolean;
  color: string;
  priority: number;
  status: string;
  description?: string;
}

interface CalculateAttendanceCode {
  id: number;
  code: string;
  name: string;
  unit: string;
}

const AttendanceCodeDefinitionPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceCode | null>(null);
  const [form] = Form.useForm();

  // 获取出勤代码定义列表
  const { data: codesData, isLoading } = useQuery({
    queryKey: ['attendanceCodeDefinitions'],
    queryFn: async () => {
      const result = await request.get('/calculate/attendance-code-definitions');
      console.log('出勤代码定义列表返回数据:', result);
      return result || [];
    },
  });

  // 获取计算管理的出勤代码列表（用于映射）- 从 CalculationAttendanceCode 表获取
  const { data: calculateCodes } = useQuery({
    queryKey: ['calculateAttendanceCodes'],
    queryFn: async () => {
      const result = await request.get('/calculate/calculation-attendance-codes/active');
      console.log('计算出勤代码列表返回数据:', result);
      return result || [];
    },
  });

  // 删除出勤代码定义
  const deleteMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/calculate/attendance-code-definitions/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['attendanceCodeDefinitions'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '删除失败');
    },
  });

  // 新增记录
  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      type: 'LEAN_HOURS',
      unit: 'HOURS',
      showInDetailPage: false,
      showInAttendanceCard: false,
      calculateHours: true,
      color: '#1890ff',
      priority: 0,
      status: 'ACTIVE',
    });
    setIsModalVisible(true);
  };

  // 编辑记录
  const handleEdit = (record: AttendanceCode) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
    });
    setIsModalVisible(true);
  };

  // 删除记录
  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  // 取消弹窗
  const handleModalCancel = () => {
    setIsModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  // 提交表单
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      if (editingRecord) {
        // 更新
        await request.put(`/calculate/attendance-code-definitions/${editingRecord.id}`, values);
        message.success('更新成功');
      } else {
        // 新增
        await request.post('/calculate/attendance-code-definitions', values);
        message.success('新增成功');
      }

      queryClient.invalidateQueries({ queryKey: ['attendanceCodeDefinitions'] });
      handleModalCancel();
    } catch (error: any) {
      console.error('表单验证失败:', error);
    }
  };

  const columns = [
    {
      title: '编码',
      dataIndex: 'code',
      key: 'code',
      width: 150,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '映射计算代码',
      dataIndex: 'calcAttendanceCode',
      key: 'calcAttendanceCode',
      width: 200,
      render: (calcAttendanceCode: string | null) => {
        const mappedCode = calculateCodes?.find((c: CalculateAttendanceCode) => c.code === calcAttendanceCode);
        return mappedCode ? (
          <Tag color="blue">{mappedCode.name} ({mappedCode.code})</Tag>
        ) : (
          <Tag type="secondary">未映射</Tag>
        );
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
    },
    {
      title: '颜色',
      dataIndex: 'color',
      key: 'color',
      width: 100,
      render: (color: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 20,
              height: 20,
              backgroundColor: color,
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
            }}
          />
          <span>{color}</span>
        </div>
      ),
    },
    {
      title: '工时明细显示',
      dataIndex: 'showInDetailPage',
      key: 'showInDetailPage',
      width: 110,
      render: (showInDetailPage: boolean) => (
        <Tag color={showInDetailPage ? 'green' : 'default'}>
          {showInDetailPage ? '显示' : '隐藏'}
        </Tag>
      ),
    },
    {
      title: '考勤卡显示',
      dataIndex: 'showInAttendanceCard',
      key: 'showInAttendanceCard',
      width: 110,
      render: (showInAttendanceCard: boolean) => (
        <Tag color={showInAttendanceCard ? 'green' : 'default'}>
          {showInAttendanceCard ? '显示' : '隐藏'}
        </Tag>
      ),
    },
    {
      title: '允许报工',
      dataIndex: 'calculateHours',
      key: 'calculateHours',
      width: 90,
      render: (calculateHours: boolean) => (
        <Tag color={calculateHours ? 'green' : 'default'}>
          {calculateHours ? '允许' : '不允许'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          ACTIVE: { text: '启用', color: 'success' },
          INACTIVE: { text: '禁用', color: 'default' },
        };
        const info = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: AttendanceCode) => (
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
            description="确定要删除这个出勤代码吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="出勤代码定义"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={codesData || []}
          loading={isLoading}
          rowKey="id"
          pagination={false}
          scroll={{ x: 1200 }}
          rowClassName={(record) => (record.status === 'INACTIVE' ? 'disabled-row' : '')}
        />
      </Card>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={editingRecord ? '编辑出勤代码' : '新增出勤代码'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="编码"
            name="code"
            rules={[{ required: true, message: '请输入编码' }]}
            initialValue={editingRecord ? undefined : ''}
          >
            <Input placeholder="请输入编码" disabled={!!editingRecord} />
          </Form.Item>

          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="请输入名称" />
          </Form.Item>

          <Form.Item
            label="映射计算代码"
            name="calcAttendanceCode"
            tooltip="从计算管理的出勤代码中选择映射，用于将计算出勤代码映射到工时模块的出勤代码"
          >
            <Select
              placeholder="请选择映射的计算代码"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {calculateCodes?.map((code: CalculateAttendanceCode) => (
                <Select.Option key={code.id} value={code.code} label={code.name}>
                  {code.name} ({code.code})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="类型"
            name="type"
            rules={[{ required: true, message: '请选择类型' }]}
            tooltip="工时类型分类"
          >
            <Select placeholder="请选择类型">
              <Select.Option value="LEAN_HOURS">精益工时</Select.Option>
              <Select.Option value="STANDARD_HOURS">标准工时</Select.Option>
              <Select.Option value="OVERTIME_HOURS">加班工时</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="单位"
            name="unit"
            rules={[{ required: true, message: '请选择单位' }]}
            tooltip="工时计量单位"
          >
            <Select placeholder="请选择单位">
              <Select.Option value="HOURS">小时</Select.Option>
              <Select.Option value="MINUTES">分钟</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="显示颜色"
            name="color"
            rules={[{ required: true, message: '请选择颜色' }]}
            tooltip="在列表和图表中显示的颜色"
          >
            <Input type="color" style={{ width: 100, height: 40 }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="在工时明细页��显示"
                name="showInDetailPage"
                valuePropName="checked"
                tooltip="是否在工时明细管理页面显示此类型的工时"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="在考勤卡显示"
                name="showInAttendanceCard"
                valuePropName="checked"
                tooltip="是否在考勤卡页面显示此类型的工时记录"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="允许报工"
                name="calculateHours"
                valuePropName="checked"
                tooltip="是否允许在报工页面选择此工时类型"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="优先级"
            name="priority"
            tooltip="数字越小优先级越高"
          >
            <InputNumber min={0} placeholder="请输入优先级" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="状态"
            name="status"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              <Select.Option value="ACTIVE">启用</Select.Option>
              <Select.Option value="INACTIVE">禁用</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AttendanceCodeDefinitionPage;
