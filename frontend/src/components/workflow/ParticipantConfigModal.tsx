import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';

interface ParticipantConfigModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (data: any) => void;
  editData?: any;  // 编辑时的数据
  title?: string;
}

const ParticipantConfigModal: React.FC<ParticipantConfigModalProps> = ({
  visible,
  onCancel,
  onOk,
  editData,
  title = '参与人配置',
}) => {
  const [form] = Form.useForm();
  const [participantType, setParticipantType] = useState<'FIXED_USER' | 'ORG_MANAGER'>('FIXED_USER');

  // 获取员工列表（只获取在职员工）
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const result = await request.get('/hr/employees', {
        params: {
          status: 'ACTIVE',
          page: 1,
          pageSize: 10000, // 获取所有在职员工
        },
      });
      return result?.items || result || [];
    },
    enabled: visible,
  });

  useEffect(() => {
    if (visible) {
      if (editData) {
        // 编辑模式：填充表单数据
        form.setFieldsValue({
          code: editData.code,
          name: editData.name,
        });
        try {
          const participants = JSON.parse(editData.participants);
          if (participants.length > 0) {
            const p = participants[0];
            setParticipantType(p.type);
            if (p.type === 'FIXED_USER') {
              form.setFieldValue('selectedUserId', p.userIds?.[0]);
            } else {
              form.setFieldValue('subjectType', p.subjectType);
              form.setFieldValue('orgLevel', p.orgLevel);
            }
          }
        } catch (e) {
          console.error('解析参与人数据失败:', e);
        }
      } else {
        // 新增模式：重置表单
        form.resetFields();
        setParticipantType('FIXED_USER');
      }
    }
  }, [visible, editData, form]);

  // 提交表单
  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      // 构建参与人数据
      let participant;
      if (participantType === 'FIXED_USER') {
        if (!values.selectedUserId) {
          message.warning('请选择人员');
          return;
        }
        const selectedEmployee = employees.find((e: any) => e.id === values.selectedUserId);
        participant = {
          type: 'FIXED_USER',
          userIds: [values.selectedUserId],
          userNames: [selectedEmployee?.name || selectedEmployee?.employeeNo],
          employeeNos: [selectedEmployee?.employeeNo],
        };
      } else {
        if (!values.subjectType || values.orgLevel === undefined) {
          message.warning('请完成组织配置');
          return;
        }
        const subjectOption = subjectTypeOptions.find((o) => o.value === values.subjectType);
        const levelOption = orgLevelOptions.find((o) => o.value === values.orgLevel);
        participant = {
          type: 'ORG_MANAGER',
          subjectType: values.subjectType,
          orgLevel: values.orgLevel,
          orgLevelName: `${subjectOption?.label} 的 ${levelOption?.label}`,
        };
      }

      const data = {
        code: values.code,
        name: values.name,
        type: participantType,
        participants: JSON.stringify([participant]),
      };

      onOk(data);
      form.resetFields();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 主体类型选项
  const subjectTypeOptions = [
    { value: 'APPLICANT', label: '申请人' },
    { value: 'SUBMITTER', label: '提交人' },
  ];

  // 组织层级选项
  const orgLevelOptions = [
    { value: 0, label: '所在组织' },
    { value: 1, label: '向上1级' },
    { value: 2, label: '向上2级' },
    { value: 3, label: '向上3级' },
    { value: 4, label: '向上4级' },
    { value: 5, label: '向上5级' },
  ];

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      width={500}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="配置代码"
          name="code"
          rules={[
            { required: true, message: '请输入配置代码' },
            { pattern: /^[A-Z0-9_]+$/, message: '只能包含大写字母、数字和下划线' },
          ]}
        >
          <Input placeholder="如：DEPT_MANAGER" disabled={!!editData} />
        </Form.Item>

        <Form.Item
          label="配置名称"
          name="name"
          rules={[{ required: true, message: '请输入配置名称' }]}
        >
          <Input placeholder="如：部门经理" />
        </Form.Item>

        <Form.Item label="类型">
          <Select
            value={participantType}
            onChange={(value) => {
              setParticipantType(value);
              // 切换类型时清空相关字段
              if (value === 'FIXED_USER') {
                form.setFieldValue('subjectType', undefined);
                form.setFieldValue('orgLevel', undefined);
              } else {
                form.setFieldValue('selectedUserId', undefined);
              }
            }}
          >
            <Select.Option value="FIXED_USER">固定人员</Select.Option>
            <Select.Option value="ORG_MANAGER">组织管理者</Select.Option>
          </Select>
        </Form.Item>

        {participantType === 'FIXED_USER' && (
          <Form.Item
            label="选择人员"
            name="selectedUserId"
            rules={[{ required: true, message: '请选择人员' }]}
          >
            <Select
              placeholder="选择人员"
              showSearch
              optionFilterProp="label"
            >
              {employees.map((employee: any) => (
                <Select.Option
                  key={employee.id}
                  value={employee.id}
                  label={employee.name || employee.employeeNo}
                >
                  {employee.name || employee.employeeNo}
                  {employee.employeeNo && ` (${employee.employeeNo})`}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {participantType === 'ORG_MANAGER' && (
          <Form.Item label="组织">
            <Input.Group compact>
              <Form.Item
                name="subjectType"
                rules={[{ required: true, message: '请选择主体' }]}
                style={{ display: 'inline-block', width: 'calc(50% - 20px)', marginBottom: 0 }}
              >
                <Select placeholder="选择主体">
                  {subjectTypeOptions.map((option) => (
                    <Select.Option key={option.value} value={option.value}>
                      {option.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <span style={{ display: 'inline-block', width: '40px', textAlign: 'center', lineHeight: '32px' }}>
                的
              </span>
              <Form.Item
                name="orgLevel"
                rules={[{ required: true, message: '请选择组织层级' }]}
                style={{ display: 'inline-block', width: 'calc(50% - 20px)', marginBottom: 0 }}
              >
                <Select placeholder="选择组织层级">
                  {orgLevelOptions.map((option) => (
                    <Select.Option key={option.value} value={option.value}>
                      {option.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Input.Group>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default ParticipantConfigModal;
