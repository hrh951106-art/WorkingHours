import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  message,
  Row,
  Col,
  TimePicker,
  Radio,
  Tag,
  Space,
} from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import request from '@/utils/request';
import { useAuthStore } from '@/stores/authStore';
import AccountSelect from '@/components/common/AccountSelect';
import EmployeeSelect from '@/components/common/EmployeeSelect';
import OrganizationTreeSelect from '@/components/common/OrganizationTreeSelect';

const { TextArea } = Input;
const { Option } = Select;

interface AttendanceCode {
  id: number;
  code: string;
  name: string;
  type: string;
  unit: string;
  status: string;
  calculateHours: boolean | number;
}

const LaborHourReportCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [reportMode, setReportMode] = useState<'personal' | 'team'>('personal');
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [manualEmployees, setManualEmployees] = useState<Set<number>>(new Set()); // 手动添加的员工ID集合
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>('小时');
  const [selectedAttendanceCode, setSelectedAttendanceCode] = useState<AttendanceCode | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);

  // 获取员工列表
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      return request.get('/hr/employees', {
        params: { page: 1, pageSize: 1000, status: 'ACTIVE' }
      });
    },
  });

  // 获取出勤代码定义（作为工时类型）
  const { data: attendanceCodes, isLoading: isLoadingCodes } = useQuery({
    queryKey: ['attendanceCodeDefinitions'],
    queryFn: async () => {
      try {
        const response = await request.get('/calculate/attendance-code-definitions');
        console.log('出勤代码定义数据:', response);
        return response;
      } catch (error) {
        console.error('获取出勤代码定义失败:', error);
        return [];
      }
    },
  });

  // 获取组织员工列表
  const { data: orgEmployees, refetch: refetchOrgEmployees } = useQuery({
    queryKey: ['orgEmployees', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      return request.get('/hr/employees', {
        params: { orgId: selectedOrgId, status: 'ACTIVE', pageSize: 1000 }
      });
    },
    enabled: !!selectedOrgId,
  });

  // 创建工时报工申请
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('=== 提交工时报工申请 ===');
      console.log('提交数据:', data);
      try {
        const response = await request.post('/labor-hour-report/requests', data);
        console.log('创建成功响应:', response);
        return response;
      } catch (error: any) {
        console.error('创建失败详细错误:', error);
        console.error('错误堆栈:', error.stack);
        throw error;
      }
    },
    onSuccess: (response) => {
      message.success('工时报工申请创建成功');
      // 跳转到详情页
      if (response?.data?.id || response?.id) {
        navigate(`/labor-hour-report/${response.data?.id || response?.id}`);
      } else {
        navigate('/labor-hour-report/list');
      }
      setLoading(false);
    },
    onError: (error: any) => {
      console.error('=== 创建失败 ===');
      console.error('错误对象:', error);
      console.error('错误响应:', error.response);
      console.error('错误消息:', error.message);

      let errorMsg = '创建失败';
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      } else if (typeof error === 'string') {
        errorMsg = error;
      }

      message.error(errorMsg);
      setLoading(false);
    },
  });


  // 报工模式变更
  const handleReportModeChange = (e: any) => {
    const mode = e.target.value;
    setReportMode(mode);
    // 清空相关字段
    setSelectedEmployees([]);
    setManualEmployees(new Set()); // 清空手动员工标记
    setSelectedOrgId(null);
    form.setFieldValue('organizationId', null);
    form.setFieldValue('employeeId', undefined);
    form.setFieldValue('employeeNo', undefined);
    form.setFieldValue('employeeName', undefined);
  };

  // 组织选择变更
  const handleOrganizationChange = (orgId: number) => {
    setSelectedOrgId(orgId);
    // 不清空手动添加的员工，只清空表单显示
    // 加载该组织的员工
    if (orgId) {
      refetchOrgEmployees();
    }
  };

  // 当组织员工加载完成后，自动填充到人员选择字段
  useEffect(() => {
    if (reportMode === 'team' && orgEmployees?.items && orgEmployees.items.length > 0) {
      // 获取手动添加的员工（不在新团队中的员工）
      const manualAddedEmployees = selectedEmployees.filter(emp =>
        manualEmployees.has(emp.id) && !orgEmployees.items.some((orgEmp: Employee) => orgEmp.id === emp.id)
      );

      // 合并新团队成员和手动添加的员工
      const mergedEmployees = [...orgEmployees.items, ...manualAddedEmployees];
      setSelectedEmployees(mergedEmployees);

      // 同时设置到表单的 employeeId 字段（用于显示）
      const employeeIds = mergedEmployees.map(emp => emp.id);
      form.setFieldValue('employeeId', employeeIds);
    }
  }, [orgEmployees, reportMode]);

  // 移除报工人员
  const handleRemoveEmployee = (employeeId: number) => {
    setSelectedEmployees(prev => {
      const updated = prev.filter(emp => emp.id !== employeeId);
      // 同步更新表单字段
      form.setFieldValue('employeeId', updated.map(emp => emp.id));
      return updated;
    });
  };

  // 添加报工���员
  const handleAddEmployee = (employee: Employee) => {
    const exists = selectedEmployees.some(emp => emp.id === employee.id);
    if (!exists) {
      setSelectedEmployees(prev => {
        const updated = [...prev, employee];
        // 同步更新表单字段
        form.setFieldValue('employeeId', updated.map(emp => emp.id));
        return updated;
      });
    }
  };

  // 人员选择变更（统一处理个人和团队模式）
  const handleEmployeeChange = (value: number | number[] | null | undefined) => {
    console.log('handleEmployeeChange 被调用:', value, 'reportMode:', reportMode);

    // Form.Item 会自动处理 employeeId 字段，这里只需要更新状态和隐藏字段
    const employeeIds = value;
    const ids = Array.isArray(employeeIds) ? employeeIds : (employeeIds ? [employeeIds] : []);

    if (ids.length > 0) {
      const employeeList = (employees?.items || []).filter((emp: Employee) =>
        ids.includes(emp.id)
      );
      setSelectedEmployees(employeeList);

      // 标记手动操作的员工（团队模式下）
      if (reportMode === 'team') {
        const previousIds = new Set(selectedEmployees.map(emp => emp.id));
        const idsSet = new Set(ids);

        // 新增的员工标记为手动添加
        ids.forEach(id => {
          if (!previousIds.has(id)) {
            setManualEmployees(prev => new Set(prev).add(id));
          }
        });

        // 删除的员工从手动添加集合中移除
        previousIds.forEach(id => {
          if (!idsSet.has(id)) {
            setManualEmployees(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
            });
          }
        });
      }

      // 个人模式：更新隐藏字段
      if (reportMode === 'personal' && employeeList.length > 0) {
        console.log('个人模式：设置隐藏字段', {
          employeeNo: employeeList[0].employeeNo,
          employeeName: employeeList[0].name,
        });
        form.setFieldValue('employeeNo', employeeList[0].employeeNo);
        form.setFieldValue('employeeName', employeeList[0].name);
      }
    } else {
      setSelectedEmployees([]);
      if (reportMode === 'team') {
        setManualEmployees(new Set());
      }
    }
  };

  // 工时类型选择变更
  const handleHourTypeChange = (value: number, option: any) => {
    const code = (attendanceCodes || []).find((c: AttendanceCode) => c.id === value);
    if (code) {
      setSelectedAttendanceCode(code);
      form.setFieldValue('hourTypeName', code.name);
      form.setFieldValue('hourType', code.code);
      // 自动读取单位
      if (code.unit) {
        setSelectedUnit(code.unit);
        form.setFieldValue('unit', code.unit);
      }
    }
  };

  // 账户选择变更
  const handleAccountChange = (value: number) => {
    setSelectedAccountId(value);
  };

  // 计算工时数量
  const calculateHours = () => {
    const startTime = form.getFieldValue('startTime');
    const endTime = form.getFieldValue('endTime');

    if (startTime && endTime) {
      const start = dayjs(startTime);
      const end = dayjs(endTime);
      const diff = end.diff(start, 'hour', true);
      if (diff > 0) {
        form.setFieldValue('value', parseFloat(diff.toFixed(2)));
      }
    }
  };

  // 提交表单
  const handleSubmit = async (values: any) => {
    setLoading(true);

    // 验证账户选择
    if (!selectedAccountId) {
      message.error('请选择报工归属账户');
      setLoading(false);
      return;
    }

    // 验证报工人员
    if (reportMode === 'personal' && selectedEmployees.length === 0) {
      message.error('请选择报工人员');
      setLoading(false);
      return;
    }

    if (reportMode === 'team' && selectedEmployees.length === 0) {
      message.error('请选择组织并添加报工人员');
      setLoading(false);
      return;
    }

    // 查询账户详情
    try {
      const account = await request.get(`/account/accounts/${selectedAccountId}`);

      // 准备报工人员列表
      const employees = reportMode === 'personal'
        ? selectedEmployees
        : selectedEmployees;

      const data = {
        workflowCode: 'LABOR_HOUR_REPORT',
        title: reportMode === 'personal'
          ? `${employees[0].name} - ${values.hourTypeName} - ${values.reportDate.format('YYYY-MM-DD')}`
          : `团队报工(${employees.length}人) - ${values.hourTypeName} - ${values.reportDate.format('YYYY-MM-DD')}`,
        reportDate: values.reportDate.format('YYYY-MM-DD'),
        reportMode: reportMode,
        employees: employees.map(emp => ({
          employeeId: emp.id,
          employeeNo: emp.employeeNo,
          employeeName: emp.employeeName || emp.name,
        })),
        hourType: selectedAttendanceCode?.code || values.hourType,
        hourTypeName: values.hourTypeName,
        startTime: values.startTime.format('HH:mm'),
        endTime: values.endTime.format('HH:mm'),
        value: values.value,
        unit: selectedUnit || values.unit || '小时',
        description: values.description,
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name || account.namePath,
        requesterId: user?.id,
        requesterName: user?.name,
      };

      createMutation.mutate(data);
    } catch (error) {
      message.error('获取账户信息失败');
      setLoading(false);
    }
  };

  return (
    <Card
      title="创建工时报工申请"
      extra={
        <Button onClick={() => navigate('/labor-hour-report/list')}>
          返回列表
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          reportDate: dayjs(),
          unit: '小时',
          reportMode: 'personal',
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="报工模式"
              name="reportMode"
              rules={[{ required: true, message: '请选择报工模式' }]}
            >
              <Radio.Group onChange={handleReportModeChange}>
                <Radio value="personal">个人报工</Radio>
                <Radio value="team">团队报工</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={12}></Col>
        </Row>

        {/* 团队报工模式：选择组织 */}
        {reportMode === 'team' && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="团队"
                name="organizationId"
                rules={[{ required: reportMode === 'team', message: '请选择团队' }]}
              >
                <OrganizationTreeSelect
                  placeholder="请选择团队"
                  onChange={handleOrganizationChange}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}></Col>
          </Row>
        )}


        {/* 报工人员选择（两种模式下都显示，团队模式为���选） */}
        <Row gutter={16}>
          <Col span={reportMode === 'personal' ? 12 : 24}>
            <Form.Item
              label="报工人员"
              name="employeeId"
              rules={[{ required: true, message: '请选择报工人员' }]}
            >
              <EmployeeSelect
                placeholder={reportMode === 'personal' ? '请选择报工人员' : '请选择报工人员（可多选）'}
                onChange={handleEmployeeChange}
                mode={reportMode === 'team' ? 'multiple' : undefined}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          {reportMode === 'personal' && <Col span={12}></Col>}
        </Row>

        {/* 个人报工模式：隐藏字段 */}
        {reportMode === 'personal' && (
          <>
            <Form.Item name="employeeNo" hidden>
              <Input />
            </Form.Item>
            <Form.Item name="employeeName" hidden>
              <Input />
            </Form.Item>
          </>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="报工日期"
              name="reportDate"
              rules={[{ required: true, message: '请选择报工日期' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}></Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="工时类型"
              name="hourType"
              rules={[{ required: true, message: '请选择工时类型' }]}
            >
              <Select
                placeholder="请选择工时类型"
                onChange={handleHourTypeChange}
                loading={isLoadingCodes}
              >
                {(attendanceCodes || []).filter((code: AttendanceCode) => {
                  // 更宽松的过滤条件
                  const isActive = code.status === 'ACTIVE' || code.status === 'active';
                  const shouldCalculate = code.calculateHours === true || code.calculateHours === 1 || code.calculateHours === '1';
                  return isActive && shouldCalculate;
                }).map((code: AttendanceCode) => (
                  <Option key={code.id} value={code.id} label={code.name}>
                    {code.name} ({code.code})
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="hourTypeName" hidden>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}></Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="开始时间"
              name="startTime"
              rules={[{ required: true, message: '请选择开始时间' }]}
            >
              <TimePicker
                style={{ width: '100%' }}
                format="HH:mm"
                onChange={calculateHours}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="结束时间"
              name="endTime"
              rules={[{ required: true, message: '请选择结束时间' }]}
            >
              <TimePicker
                style={{ width: '100%' }}
                format="HH:mm"
                onChange={calculateHours}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="工时数量"
              name="value"
              rules={[{ required: true, message: '请输入工时数量' }]}
            >
              <InputNumber
                min={0}
                precision={2}
                style={{ width: '100%' }}
                addonAfter="小时"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="单位"
              name="unit"
              rules={[{ required: true, message: '请输入单位' }]}
            >
              <Input placeholder="小时" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="报工归属"
          name="accountId"
          rules={[{ required: true, message: '请选择报工归属账户' }]}
          tooltip="选择该工时归属的账户"
        >
          <AccountSelect
            placeholder="选择报工归属账户"
            onChange={handleAccountChange}
            value={selectedAccountId}
            showCreateButton={true}
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          label="详细描述"
          name="description"
        >
          <TextArea rows={4} placeholder="请输入详细描述（可选）" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            提交申请
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default LaborHourReportCreatePage;
