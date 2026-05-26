import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Switch,
  Tag,
  message,
  Popconfirm,
  Select,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

interface AttendanceRuleGroup {
  id: number;
  code: string;
  name: string;
  description?: string;
  status: string;
  isDefault: boolean;
  createdAt: string;
  details: Array<{
    id: number;
    attendancePunchRuleId?: number;
    leanPunchRuleId?: number;
    attendanceCodeIds: number[];
    amountPolicyGroupIds: number[];
    amountPolicyIds: number[];
  }>;
}

interface PunchRule {
  id: number;
  code: string;
  name: string;
}

interface AttendanceCode {
  id: number;
  code: string;
  name: string;
}

interface AmountPolicy {
  id: number;
  code: string;
  name: string;
  policyType: string;
}

const AttendanceRuleGroupPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRuleGroup | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [selectedAttendanceCodeIds, setSelectedAttendanceCodeIds] = useState<number[]>([]);
  const [selectedAmountPolicyGroupIds, setSelectedAmountPolicyGroupIds] = useState<number[]>([]);

  // Fetch rule groups
  const { data: ruleGroupsData, isLoading } = useQuery({
    queryKey: ['attendanceRuleGroups'],
    queryFn: async () => {
      const res = await request.get('/attendance-rule-groups');
      return res.data || res;
    },
    staleTime: 0,
    gcTime: 0,
  });

  const ruleGroups = ruleGroupsData?.items || [];

  // Fetch punch rules - 考勤打卡规则
  const { data: punchRulesData } = useQuery({
    queryKey: ['punchRules'],
    queryFn: async () => {
      const res = await request.get('/calculate/punch-rules');
      return res.data || res;
    },
  });

  const allPunchRules = punchRulesData?.items || punchRulesData || [];
  // 考勤打卡规则 = ruleType 是 ATTENDANCE_PAIRING 的规则
  const attendancePunchRules = allPunchRules.filter((r: any) => r.ruleType === 'ATTENDANCE_PAIRING');
  // 精益成对打卡规则 = ruleType 是 LEAN_PAIRING 的规则
  const leanPunchRules = allPunchRules.filter((r: any) => r.ruleType === 'LEAN_PAIRING');

  // Fetch attendance codes - 计算管理-出勤代码定义中配置的出勤代码
  const { data: attendanceCodesData } = useQuery({
    queryKey: ['calculationAttendanceCodes'],
    queryFn: async () => {
      const res = await request.get('/calculate/calculation-attendance-codes');
      return res.data || res;
    },
  });

  // Fetch amount policy groups - 金额规则组
  const { data: amountPolicyGroupsData } = useQuery({
    queryKey: ['amountPolicyGroups'],
    queryFn: async () => {
      const res = await request.get('/amount/policy-groups');
      return res.data || res;
    },
  });

  // Fetch amount policies for display
  const { data: amountPoliciesData } = useQuery({
    queryKey: ['amountPolicies'],
    queryFn: async () => {
      const res = await request.get('/amount/policies');
      return res.data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await request.post('/attendance-rule-groups', data);
    },
    onSuccess: () => {
      message.success('创建成功');
      queryClient.invalidateQueries({ queryKey: ['attendanceRuleGroups'], refetchType: 'active' });
      handleCancel();
    },
    onError: (error: any) => {
      console.error('创建失败:', error);
      message.error(error.response?.data?.message || '创建失败，请重试');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      await request.put(`/attendance-rule-groups/${id}`, data);
    },
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['attendanceRuleGroups'] });
      handleCancel();
    },
    onError: (error: any) => {
      console.error('更新失败:', error);
      message.error(error.response?.data?.message || '更新失败，请重试');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await request.delete(`/attendance-rule-groups/${id}`);
    },
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['attendanceRuleGroups'] });
    },
  });

  const handleEdit = (record: AttendanceRuleGroup) => {
    setEditingRecord(record);
    const attendanceCodeIds = record.details[0]?.attendanceCodeIds || [];
    const amountPolicyGroupIds = record.details[0]?.amountPolicyGroupIds || [];

    setSelectedAttendanceCodeIds(attendanceCodeIds);
    setSelectedAmountPolicyGroupIds(amountPolicyGroupIds);

    form.setFieldsValue({
      code: record.code,
      name: record.name,
      description: record.description,
      isDefault: record.isDefault,
      attendancePunchRuleId: record.details[0]?.attendancePunchRuleId,
      leanPunchRuleId: record.details[0]?.leanPunchRuleId,
      attendanceCodeIds,
      amountPolicyGroupIds,
    });
    setIsModalOpen(true);
  };

  const handleAdd = async () => {
    setEditingRecord(null);
    setSelectedAttendanceCodeIds([]);
    setSelectedAmountPolicyGroupIds([]);
    form.resetFields();
    form.setFieldsValue({
      status: 'ACTIVE',
      isDefault: false,
    });

    try {
      // 自动生成编码
      const res = await request.get('/attendance-rule-groups/new-code');
      form.setFieldsValue({ code: res.code });
    } catch (error) {
      console.error('生成编码失败:', error);
      // 即使生成编码失败，也打开弹窗
    }

    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // 如果选择了金额规则组，获取这些组中的所有金额政策ID
      let amountPolicyIds: number[] = [];
      if (selectedAmountPolicyGroupIds.length > 0) {
        const policyGroups = amountPolicyGroups || [];
        selectedAmountPolicyGroupIds.forEach((groupId: number) => {
          const group = policyGroups.find((g: any) => g.id === groupId);
          if (group && group.policyIds) {
            amountPolicyIds = [...amountPolicyIds, ...group.policyIds];
          }
        });
      }

      const data = {
        ...values,
        attendanceCodeIds: selectedAttendanceCodeIds || [],
        amountPolicyGroupIds: selectedAmountPolicyGroupIds || [],
        amountPolicyIds,
        status: 'ACTIVE', // 默认启用
      };

      if (editingRecord) {
        updateMutation.mutate({ id: editingRecord.id, data });
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
      message.error('请检查表单填写是否完整');
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    setSelectedAttendanceCodeIds([]);
    setSelectedAmountPolicyGroupIds([]);
    form.resetFields();
  };

  const columns = [
    {
      title: '规则组编码',
      dataIndex: 'code',
      key: 'code',
      width: 150,
    },
    {
      title: '规则组名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record: AttendanceRuleGroup) => (
        <Space>
          {status === 'ACTIVE' ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>}
          {record.isDefault && <Tag color="blue">默认</Tag>}
        </Space>
      ),
    },
    {
      title: '配置明细',
      key: 'details',
      width: 300,
      render: (_: any, record: AttendanceRuleGroup) => {
        const detail = record.details?.[0];
        if (!detail) return '-';

        const attendanceCodes = detail.attendanceCodeIds || [];
        const amountPolicies = detail.amountPolicyIds || [];

        return (
          <Space direction="vertical" size="small">
            <span>考勤代码: {attendanceCodes.length}个</span>
            <span>金额政策: {amountPolicies.length}个</span>
            {detail.attendancePunchRuleId && <span>考勤打卡规则: 已配置</span>}
            {detail.leanPunchRuleId && <span>精益打卡规则: 已配置</span>}
          </Space>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: AttendanceRuleGroup) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          {!record.isDefault && (
            <Popconfirm
              title="确认删除"
              description="确定要删除此考勤规则组吗？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const attendanceCodes = attendanceCodesData?.data || attendanceCodesData || [];
  const amountPolicyGroups = amountPolicyGroupsData?.items || amountPolicyGroupsData || [];
  const amountPolicies = amountPoliciesData?.items || amountPoliciesData || [];

  return (
    <div>
      <Card
        title="考勤规则组管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新增规则组
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={ruleGroups}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />
      </Card>

      <Modal
        title={editingRecord ? '编辑考勤规则组' : '新增考勤规则组'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCancel}
        width={800}
        okText="确定"
        cancelText="取消"
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'ACTIVE',
            isDefault: false,
          }}
        >
          <Form.Item
            label="规则组编码"
            name="code"
            rules={[{ required: true, message: '请输入规则组编码' }]}
            tooltip="系统自动生成，不可修改"
          >
            <Input placeholder="系统自动生成" disabled={true} />
          </Form.Item>

          <Form.Item
            label="规则组名称"
            name="name"
            rules={[{ required: true, message: '请输入规则组名称' }]}
          >
            <Input placeholder="例如：默认考勤规则组" />
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="请输入描述" />
          </Form.Item>

          <Form.Item
            label="设为默认规则组"
            name="isDefault"
            valuePropName="checked"
            tooltip="设为默认后，未分配规则组的员工将使用此规则组"
          >
            <Switch />
          </Form.Item>

          <Divider orientation="left">规则配置</Divider>

          <Form.Item
            label="考勤打卡规则"
            name="attendancePunchRuleId"
            tooltip="用于常规打卡规则配置"
          >
            <Select
              placeholder="请选择考勤打卡规则"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {attendancePunchRules.map((rule: PunchRule) => (
                <Select.Option key={rule.id} value={rule.id}>
                  {rule.name} ({rule.code})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="精益打卡规则"
            name="leanPunchRuleId"
            tooltip="用于精益打卡规则配置"
          >
            <Select
              placeholder="请选择精益打卡规则"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {leanPunchRules.map((rule: PunchRule) => (
                <Select.Option key={rule.id} value={rule.id}>
                  {rule.name} ({rule.code})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="出勤代码"
            name="attendanceCodeIds"
            tooltip="选择此规则组包含的出勤代码"
          >
            <Select
              mode="multiple"
              placeholder="请选择出勤代码"
              allowClear
              showSearch
              optionFilterProp="children"
              value={selectedAttendanceCodeIds}
              onChange={(values) => {
                setSelectedAttendanceCodeIds(values);
                form.setFieldsValue({ attendanceCodeIds: values });
              }}
              style={{ width: '100%' }}
            >
              {attendanceCodes.map((code: AttendanceCode) => (
                <Select.Option key={code.id} value={code.id}>
                  {code.name} ({code.code})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="金额规则组"
            name="amountPolicyGroupIds"
            tooltip="选择此规则组包含的金额规则组"
          >
            <Select
              mode="multiple"
              placeholder="请选择金额规则组"
              allowClear
              showSearch
              optionFilterProp="children"
              value={selectedAmountPolicyGroupIds}
              onChange={(values) => {
                setSelectedAmountPolicyGroupIds(values);
                form.setFieldsValue({ amountPolicyGroupIds: values });
              }}
              style={{ width: '100%' }}
            >
              {amountPolicyGroups.map((group: any) => (
                <Select.Option key={group.id} value={group.id}>
                  {group.name} ({group.code})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AttendanceRuleGroupPage;
