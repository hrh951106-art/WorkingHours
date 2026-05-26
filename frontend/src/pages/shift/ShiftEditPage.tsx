import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Row,
  Col,
  Select,
  Table,
  Space,
  message,
  Divider,
  InputNumber,
  Popconfirm,
  Modal,
  Tag,
} from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, SaveOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import AccountSelect from '@/components/common/AccountSelect';

interface ShiftSegment {
  key?: string;
  type?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  duration?: number;
  accountId?: number | null;
}

const ShiftEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [segments, setSegments] = useState<ShiftSegment[]>([]);
  const [shiftType, setShiftType] = useState<string>('NORMAL');

  const isEdit = id !== 'new';

  // 判断是否在 iframe 环境（/embed 路径）
  const isEmbed = location.pathname.startsWith('/embed');

  // 获取班次详情（仅编辑模式）
  const { data: shiftData, isLoading } = useQuery({
    queryKey: ['shift', id],
    queryFn: () => request.get(`/shift/shifts/${id}`).then((res: any) => res),
    enabled: isEdit,
    staleTime: 0, // 始终使用最新数据
    refetchOnMount: 'always', // 组件挂载时总是重新查询
    gcTime: 0, // 不保留缓存
  });

  // 获取班次属性定义列表
  const { data: propertyDefinitions = [] } = useQuery({
    queryKey: ['shiftPropertyDefinitions'],
    queryFn: () =>
      request.get('/shift/property-definitions').then((res: any) => res || []),
  });

  // 获取当前班次的属性（仅编辑模式）
  const { data: shiftProperties = [], refetch: refetchProperties } = useQuery({
    queryKey: ['shiftProperties', id],
    queryFn: () =>
      request.get(`/shift/shifts/${id}/properties`).then((res: any) => {
        console.log('[ShiftEdit] 查询班次属性返回:', res);
        return res || [];
      }),
    enabled: isEdit,
    staleTime: 0, // 始终使用最新数据，不使用缓存
    refetchOnMount: 'always', // 组件挂载时总是重新查询
    gcTime: 0, // 不保留缓存（React Query v5中，之前是cacheTime）
  });

  // 收集当前班次所有segments中的accountId，用于AccountSelect组件
  const segmentAccountIds = shiftData?.segments
    ?.map((seg: any) => seg.accountId)
    .filter((id: any) => id != null) || [];

  // 创建/更新班次
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      // 从数据中提取 propertyKeys，只保留 Shift 表的字段
      const { propertyKeys, ...shiftData } = data;

      console.log('[ShiftEdit] 🎯 mutationFn收到的data:', data);
      console.log('[ShiftEdit] 🔑 提取的propertyKeys:', propertyKeys);

      let shiftId = id;

      if (isEdit) {
        await request.put(`/shift/shifts/${id}`, shiftData);
      } else {
        const result = await request.post('/shift/shifts', shiftData);
        shiftId = result.id;
      }

      // 保存班次属性（无论是否选择都需要发送请求，以支持删除属性）
      await request.put(`/shift/shifts/${shiftId}/properties`, {
        properties: (propertyKeys || []).map((key: string) => ({
          propertyKey: key,
          propertyValue: '是', // 固定值为"是"表示该班次具有此属性
        })),
      });

      return shiftId;
    },
    onSuccess: async () => {
      message.success(isEdit ? '更新成功' : '创建成功');

      // 使用refetchQueries强制立即重新查询并等待完成
      await queryClient.refetchQueries({ queryKey: ['shifts'] });
      await queryClient.refetchQueries({ queryKey: ['shiftProperties'] });

      // 只在编辑模式下重新查询详情
      if (isEdit) {
        await queryClient.refetchQueries({ queryKey: ['shift', id] });
        await queryClient.refetchQueries({ queryKey: ['shiftProperties', id] });
      }

      console.log('[ShiftEdit] 保存成功，已刷新所有缓存');

      // 根据当前路径判断返回路径
      const basePath = isEmbed ? '/embed/shift/shifts' : '/shift/shifts';
      navigate(basePath);
    },
    onError: (error: any) => {
      // request.ts 已经将错误消息提取到 error.message 中
      const errorMessage = error?.message || '操作失败';

      message.error(errorMessage);
    },
  });

  // 删除班次
  const deleteMutation = useMutation({
    mutationFn: () => request.delete(`/shift/shifts/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      // 根据当前路径判断返回路径
      const basePath = isEmbed ? '/embed/shift/shifts' : '/shift/shifts';
      navigate(basePath);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '删除失败');
    },
  });

  // 初始化表单数据
  useEffect(() => {
    if (shiftData) {
      console.log('[ShiftEdit] 初始化表单数据:', {
        shiftId: shiftData.id,
        shiftProperties,
        propertyKeys: shiftProperties?.map((p: any) => p.propertyKey) || [],
      });

      form.setFieldsValue({
        code: shiftData.code,
        name: shiftData.name,
        type: shiftData.type || 'NORMAL',
        color: shiftData.color,
        propertyKeys: shiftProperties?.map((p: any) => p.propertyKey) || [],
      });
      setShiftType(shiftData.type || 'NORMAL');

      // 初始化班段数据
      if (shiftData.segments && shiftData.segments.length > 0) {
        const initialSegments = shiftData.segments.map((seg: any) => ({
          key: seg.id.toString(),
          type: seg.type,
          startDate: seg.startDate,
          startTime: seg.startTime,
          endDate: seg.endDate,
          endTime: seg.endTime,
          duration: seg.duration,
          accountId: seg.accountId,
        }));
        setSegments(initialSegments);
      } else {
        // 如果没有班段，设置为空数组
        setSegments([]);
      }
    }
  }, [shiftData, shiftProperties, form]);

  // 计算班段时长
  const calculateDuration = (segment: ShiftSegment): number => {
    if (!segment.startTime || !segment.endTime) return 0;

    const [startHour, startMinute] = segment.startTime.split(':').map(Number);
    const [endHour, endMinute] = segment.endTime.split(':').map(Number);

    let startMinutes = startHour * 60 + startMinute;
    let endMinutes = endHour * 60 + endMinute;

    // 如果结束日期是后一天，加24小时
    if (segment.endDate === '+1' && segment.startDate === '+0') {
      endMinutes += 24 * 60;
    }

    const durationMinutes = endMinutes - startMinutes;
    return Math.round((durationMinutes / 60) * 100) / 100; // 保留2位小数
  };

  // 更新班段
  const updateSegment = (key: string, field: string, value: any) => {
    const newSegments = segments.map((seg) => {
      if (seg.key === key) {
        const updated = { ...seg, [field]: value };
        // 自动计算时长
        if (['startTime', 'endTime', 'startDate', 'endDate'].includes(field)) {
          updated.duration = calculateDuration(updated);
        }
        return updated;
      }
      return seg;
    });
    setSegments(newSegments);
  };

  // 添加班段
  const addSegment = () => {
    const newKey = Date.now().toString();
    let defaultType = 'NORMAL';

    // 如果是休息班，默认类型为REST
    if (shiftType === 'REST') {
      defaultType = 'REST';
    }

    const newSegment: ShiftSegment = {
      key: newKey,
      type: defaultType,
      startDate: '+0',
      startTime: '00:00',
      endDate: '+0',
      endTime: '00:00',
      duration: 0,
      accountId: null,
    };
    setSegments([...segments, newSegment]);
  };

  // 删除班段
  const removeSegment = (key: string) => {
    setSegments(segments.filter((seg) => seg.key !== key));
  };

  // 保存
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      // 验证班段
      if (segments.length === 0) {
        message.error('请至少添加一个班段');
        return;
      }

      // 验证转移类型的班段必须选择劳动力账户
      for (const seg of segments) {
        if (seg.type === 'TRANSFER' && !seg.accountId) {
          message.error('转移类型的班段必须选择劳动力账户');
          return;
        }
      }

      // 验证休息班只能有休息类型的班段
      if (shiftType === 'REST') {
        const hasNonRest = segments.some(seg => seg.type !== 'REST');
        if (hasNonRest) {
          message.error('休息班只允许添加休息类型的班段');
          return;
        }
      }

      const submitData = {
        code: values.code,
        name: values.name,
        type: shiftType, // 使用状态中的类型
        color: values.color,
        propertyKeys: values.propertyKeys, // ✅ 添加属性字段
        segments: segments.map(seg => ({
          type: seg.type,
          startDate: seg.startDate,
          startTime: seg.startTime,
          endDate: seg.endDate,
          endTime: seg.endTime,
          duration: seg.duration,
          accountId: seg.accountId,
        })),
      };

      console.log('[ShiftEdit] 准备提交的数据:', submitData);

      saveMutation.mutate(submitData);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 班段类型选项
  const getSegmentTypeOptions = () => {
    if (shiftType === 'REST') {
      return [
        { value: 'REST', label: '休息' },
      ];
    }
    return [
      { value: 'NORMAL', label: '正常' },
      { value: 'REST', label: '休息' },
      { value: 'TRANSFER', label: '转移' },
    ];
  };

  const segmentColumns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string, record: ShiftSegment) => (
        <Select
          value={type}
          onChange={(value) => updateSegment(record.key!, 'type', value)}
          style={{ width: '100%' }}
          options={getSegmentTypeOptions()}
        />
      ),
    },
    {
      title: '开始日期',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 120,
      render: (startDate: string, record: ShiftSegment) => (
        <Select
          value={startDate}
          onChange={(value) => updateSegment(record.key!, 'startDate', value)}
          style={{ width: '100%' }}
        >
          <Select.Option value="+0">当天</Select.Option>
          <Select.Option value="+1">后一天</Select.Option>
        </Select>
      ),
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 140,
      render: (startTime: string, record: ShiftSegment) => (
        <Input
          type="time"
          value={startTime}
          onChange={(e) => updateSegment(record.key!, 'startTime', e.target.value)}
        />
      ),
    },
    {
      title: '结束日期',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 120,
      render: (endDate: string, record: ShiftSegment) => (
        <Select
          value={endDate}
          onChange={(value) => updateSegment(record.key!, 'endDate', value)}
          style={{ width: '100%' }}
        >
          <Select.Option value="+0">当天</Select.Option>
          <Select.Option value="+1">后一天</Select.Option>
        </Select>
      ),
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 140,
      render: (endTime: string, record: ShiftSegment) => (
        <Input
          type="time"
          value={endTime}
          onChange={(e) => updateSegment(record.key!, 'endTime', e.target.value)}
        />
      ),
    },
    {
      title: '时长(小时)',
      dataIndex: 'duration',
      key: 'duration',
      width: 120,
      render: (duration: number) => (
        <span>{duration ? duration.toFixed(2) : '0.00'}</span>
      ),
    },
    {
      title: '转移子账户',
      dataIndex: 'accountId',
      key: 'accountId',
      width: 600,
      render: (accountId: number | null, record: ShiftSegment) => {
        return (
          <AccountSelect
            value={accountId}
            usageType="SHIFT"
            onChange={(value) => updateSegment(record.key!, 'accountId', value)}
            segmentAccountIds={segmentAccountIds}
            isEdit={isEdit}
            placeholder="选择子账户"
            style={{ width: '100%' }}
          />
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: ShiftSegment) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeSegment(record.key!)}
        >
          删除
        </Button>
      ),
    },
  ];

  // 计算总工时
  const totalStandardHours = segments
    .filter(seg => seg.type === 'NORMAL' || seg.type === 'TRANSFER')
    .reduce((sum, seg) => sum + (seg.duration || 0), 0);

  const totalBreakHours = segments
    .filter(seg => seg.type === 'REST')
    .reduce((sum, seg) => sum + (seg.duration || 0), 0);

  if (isEdit && isLoading) {
    return <Card loading />;
  }

  return (
    <div>
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(isEmbed ? '/embed/shift/shifts' : '/shift/shifts')}>
              返回列表
            </Button>
          </Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Space>
              {isEdit && (
                <Popconfirm
                  title="确认删除"
                  description="删除后无法恢复，是否继续？"
                  onConfirm={() => deleteMutation.mutate()}
                  okText="确认"
                  cancelText="取消"
                >
                  <Button danger loading={deleteMutation.isPending}>
                    删除班次
                  </Button>
                </Popconfirm>
              )}
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saveMutation.isPending}
              >
                保存
              </Button>
            </Space>
          </Col>
        </Row>

        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                name="code"
                label="班次编码"
                rules={[{ required: true, message: '请输入班次编码' }]}
              >
                <Input placeholder="请输入班次编码" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="name"
                label="班次名称"
                rules={[{ required: true, message: '请输入班次名称' }]}
              >
                <Input placeholder="请输入班次名称" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="班次类型"
                rules={[{ required: true, message: '请选择班次类型' }]}
              >
                <Select
                  value={shiftType}
                  onChange={(value) => setShiftType(value)}
                  placeholder="请选择班次类型"
                >
                  <Select.Option value="NORMAL">正常班</Select.Option>
                  <Select.Option value="REST">休息班</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="color"
                label="显示颜色"
                initialValue="#00B365"
                rules={[{ pattern: /^#[0-9A-Fa-f]{6}$/, message: '请输入有效的颜色值，如 #00B365' }]}
              >
                <Input type="color" style={{ width: '100%', height: 32 }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="propertyKeys"
                label="班次属性"
                tooltip="选择后为班次打上标签，可多选"
              >
                <Select
                  mode="multiple"
                  placeholder="请选择班次属性"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                >
                  {propertyDefinitions
                    .filter((prop: any) => prop.status === 'ACTIVE')
                    .map((prop: any) => (
                      <Select.Option
                        key={prop.propertyKey}
                        value={prop.propertyKey}
                        label={prop.name}
                      >
                        <div>
                          <div>{prop.name}</div>
                          <div style={{ fontSize: 12, color: '#999' }}>
                            {prop.propertyKey}
                          </div>
                        </div>
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="标准工时(小时)">
                <InputNumber
                  disabled
                  value={Math.round(totalStandardHours * 100) / 100}
                  style={{ width: '100%' }}
                  precision={2}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <Divider orientation="left">班段配置</Divider>

        <div style={{ marginBottom: 16 }}>
          <Button
            type="dashed"
            onClick={addSegment}
            block
            icon={<PlusOutlined />}
            disabled={shiftType === 'REST' && segments.length > 0}
          >
            添加班段
          </Button>
        </div>

        <Table
          columns={segmentColumns}
          dataSource={segments}
          rowKey="key"
          pagination={false}
          size="small"
        />

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Space size="large">
            <span>标准工时总计: <strong>{Math.round(totalStandardHours * 100) / 100} 小时</strong></span>
            <span>休息时长总计: <strong>{Math.round(totalBreakHours * 100) / 100} 小时</strong></span>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default ShiftEditPage;
