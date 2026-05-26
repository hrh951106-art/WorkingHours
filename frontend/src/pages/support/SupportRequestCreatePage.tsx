import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  message,
  Row,
  Col,
  Radio,
  Divider,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';
import request from '@/utils/request';
import { useAuthStore } from '@/stores/authStore';
import AccountSelect from '@/components/common/AccountSelect';
import EmployeeSelect from '@/components/common/EmployeeSelect';

const { TextArea } = Input;
const { Option } = Select;

interface Employee {
  id: number;
  employeeNo: string;
  name: string;
  orgId: number;
  orgName: string;
}

const SupportRequestCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [supportMode, setSupportMode] = useState<'FULL_DAY' | 'TIME_BASED'>('FULL_DAY');
  const [calculatedHours, setCalculatedHours] = useState<number>(0);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // 监听账户ID变化，自动获取账户名称
  useEffect(() => {
    const fetchAccountName = async () => {
      if (selectedAccountId) {
        try {
          const account = await request.get(`/account/accounts/${selectedAccountId}`);
          form.setFieldValue('supportAccountName', account.name || '');
        } catch (error) {
          console.error('获取账户信息失败:', error);
        }
      } else {
        form.setFieldValue('supportAccountName', '');
      }
    };
    fetchAccountName();
  }, [selectedAccountId, form]);

  // 创建支援申请
  const createMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('提交支援申请数据:', data);
      return request.post('/support/requests', data);
    },
    onSuccess: (response) => {
      console.log('创建成功响应:', response);
      message.success('支援申请创建成功');
      // 跳转到详情页面
      if (response?.id) {
        navigate(`/support/detail/${response.id}`);
      } else {
        navigate('/support/list');
      }
    },
    onError: (error: any) => {
      console.error('创建失败错误:', error);
      console.error('错误响应数据:', error.response?.data);
      message.error(error.response?.data?.message || '创建失败');
      setLoading(false);
    },
  });

  // 计算支援时数
  const calculateSupportHours = () => {
    const mode = form.getFieldValue('supportMode');
    let hours = 0;

    if (mode === 'FULL_DAY') {
      // 整天支援：计算日期差
      const startDate = form.getFieldValue('startDate');
      const endDate = form.getFieldValue('endDate');
      if (startDate && endDate) {
        const days = endDate.diff(startDate, 'day') + 1;
        hours = days * 8; // 假设每天8小时
      }
    } else if (mode === 'TIME_BASED') {
      // 按时段支援：计算时间差
      const startTime = form.getFieldValue('startTime');
      const endTime = form.getFieldValue('endTime');
      if (startTime && endTime) {
        hours = endTime.diff(startTime, 'hour', true);
      }
    }

    setCalculatedHours(hours);
    form.setFieldValue('calculatedHours', parseFloat(hours.toFixed(2)));
  };

  // 提交表单
  const handleSubmit = async (values: any) => {
    console.log('=== 表单开始提交 ===');
    console.log('表单提交值:', values);
    console.log('选中的员工:', selectedEmployee);

    setLoading(true);

    try {
      // 验证员工信息
      if (!selectedEmployee || !selectedEmployee.id) {
        message.error('请选择有效的支援人员');
        setLoading(false);
        return;
      }

      // 获取选中的账户信息（从表单字段中获取）
      const supportAccountId = values.supportAccountId;

      // 验证账户信息
      if (!supportAccountId) {
        message.error('请选择支援地点');
        setLoading(false);
        return;
      }

      // 如果账户名称为空，尝试从API获取
      let supportAccountName = values.supportAccountName || '';
      if (!supportAccountName && supportAccountId) {
        try {
          const account = await request.get(`/account/accounts/${supportAccountId}`);
          supportAccountName = account.name || '';
          console.log('从API获取账户名称:', supportAccountName);
        } catch (error) {
          console.error('获取账户名称失败:', error);
          message.error('获取账户信息失败');
          setLoading(false);
          return;
        }
      }

      // 验证支援时数
      if (!values.calculatedHours || values.calculatedHours <= 0) {
        message.error('请正确填写支援时数');
        setLoading(false);
        return;
      }

      // 构建提交数据
      const data = {
        supportMode: values.supportMode,
        supportEmployeeId: selectedEmployee.id,
        supportEmployeeName: selectedEmployee.name,
        supportEmployeeNo: selectedEmployee.employeeNo,
        supportAccountId: supportAccountId,
        supportAccountName: supportAccountName,
        description: values.description || '',
        calculatedHours: parseFloat(values.calculatedHours),
        // 整天支援字段
        startDate: values.supportMode === 'FULL_DAY' ? values.startDate?.format('YYYY-MM-DD') : undefined,
        endDate: values.supportMode === 'FULL_DAY' ? values.endDate?.format('YYYY-MM-DD') : undefined,
        // 按时段支援字段
        startTime: values.supportMode === 'TIME_BASED' ? values.startTime?.format('YYYY-MM-DD HH:mm') : undefined,
        endTime: values.supportMode === 'TIME_BASED' ? values.endTime?.format('YYYY-MM-DD HH:mm') : undefined,
      };

      console.log('提交数据:', data);

      createMutation.mutate(data);
    } catch (error) {
      console.error('提交表单时出错:', error);
      message.error('提交失败，请检查填写内容');
      setLoading(false);
    }
  };

  // 监听支援模式变化
  const handleSupportModeChange = (e: any) => {
    setSupportMode(e.target.value);
    // 清空相关字段
    if (e.target.value === 'FULL_DAY') {
      form.setFieldsValue({
        supportDateTime: null,
        calculatedHours: null,
      });
    } else {
      form.setFieldsValue({
        startDate: null,
        endDate: null,
      });
    }
  };

  return (
    <Card
      title="创建支援申请"
      extra={
        <Button onClick={() => navigate('/support/list')}>
          返回列表
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          supportMode: 'FULL_DAY',
        }}
      >
        {/* 人员 */}
        <Form.Item
          label="人员"
          name="supportEmployeeId"
          rules={[{ required: true, message: '请选择人员' }]}
          tooltip="选择需要支援的人员"
        >
          <EmployeeSelect
            placeholder="请选择人员"
            onChange={(value, employee) => {
              console.log('员工选择变化:', value, employee);
              setSelectedEmployee(employee || null);
            }}
          />
        </Form.Item>

        {/* 支援模式 */}
        <Form.Item
          label="支援模式"
          name="supportMode"
          rules={[{ required: true, message: '请选择支援模式' }]}
        >
          <Radio.Group onChange={handleSupportModeChange}>
            <Radio value="FULL_DAY">整天支援</Radio>
            <Radio value="TIME_BASED">按时段支援</Radio>
          </Radio.Group>
        </Form.Item>

        <Divider />

        {/* 整天支援字段 */}
        {supportMode === 'FULL_DAY' && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="开始日期"
                name="startDate"
                rules={[{ required: true, message: '请选择开始日期' }]}
              >
                <DatePicker style={{ width: '100%' }} onChange={calculateSupportHours} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="结束日期"
                name="endDate"
                rules={[{ required: true, message: '请选择结束日期' }]}
              >
                <DatePicker style={{ width: '100%' }} onChange={calculateSupportHours} />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* 按时段支援字段 */}
        {supportMode === 'TIME_BASED' && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="开始时间"
                name="startTime"
                rules={[{ required: true, message: '请选择开始时间' }]}
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: '100%' }}
                  onChange={calculateSupportHours}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="结束时间"
                name="endTime"
                rules={[{ required: true, message: '请选择结束时间' }]}
              >
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: '100%' }}
                  onChange={calculateSupportHours}
                />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* 计算出的支援时数 */}
        <Form.Item
          label="支援时数（小时）"
          name="calculatedHours"
          rules={[
            { required: true, message: '请输入支援时数' },
            { type: 'number', min: 0.1, message: '支援时数必须大于0' }
          ]}
          tooltip="系统会根据选择的日期/时间自动计算，您也可以手动修改"
        >
          <Input
            type="number"
            step="0.5"
            min="0"
            addonAfter="小时"
            placeholder="自动计算或手动输入"
          />
        </Form.Item>

        {/* 支援地点 */}
        <Form.Item
          label="支援地点"
          name="supportAccountId"
          rules={[{ required: true, message: '请选择支援地点' }]}
          tooltip="选择劳动力账户作为支援地点"
        >
          <AccountSelect
            placeholder="请选择支援地点"
            onChange={(value) => {
              setSelectedAccountId(value as number);
            }}
          />
        </Form.Item>
        <Form.Item name="supportAccountName" hidden>
          <Input />
        </Form.Item>

        <Divider />

        {/* 详细描述 */}
        <Form.Item
          label="详细描述"
          name="description"
        >
          <TextArea
            rows={4}
            placeholder="请详细描述支援的原因、内容等（可选）"
          />
        </Form.Item>

        {/* 提交按钮 */}
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading || createMutation.isPending}
            block
            disabled={loading || createMutation.isPending}
          >
            提交申请
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default SupportRequestCreatePage;
