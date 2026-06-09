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
  Divider,
  Table,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import request from '@/utils/request';
import { useAuthStore } from '@/stores/authStore';
import AccountSelect from '@/components/common/AccountSelect';
import EmployeeSelect from '@/components/common/EmployeeSelect';
import OrganizationTreeSelect from '@/components/common/OrganizationTreeSelect';

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

interface Employee {
  id: number;
  employeeNo: string;
  name: string;
  employeeName?: string;
}

interface EmployeeReportData {
  employee: Employee;
  startTime?: dayjs.Dayjs;
  endTime?: dayjs.Dayjs;
  value?: number;
}

const LaborHourReportCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [reportMode, setReportMode] = useState<'personal' | 'team'>('personal');
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [employeeReportDataList, setEmployeeReportDataList] = useState<EmployeeReportData[]>([]);
  const [manualEmployees, setManualEmployees] = useState<Set<number>>(new Set());
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
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
      try {
        const response = await request.post('/labor-hour-report/requests', data);
        return response;
      } catch (error: any) {
        console.error('创建失败详细错误:', error);
        throw error;
      }
    },
    onSuccess: (response) => {
      message.success('工时报工申请创建成功');
      if (response?.data?.id || response?.id) {
        navigate(`/labor-hour-report/${response.data?.id || response?.id}`);
      } else {
        navigate('/labor-hour-report/list');
      }
      setLoading(false);
    },
    onError: (error: any) => {
      let errorMsg = '创建失败';
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }
      message.error(errorMsg);
      setLoading(false);
    },
  });

  // 报工模式变更
  const handleReportModeChange = (e: any) => {
    const mode = e.target.value;
    setReportMode(mode);
    setSelectedEmployees([]);
    setManualEmployees(new Set());
    setSelectedOrgId(null);
    setEmployeeReportDataList([]);
    form.setFieldValue('organizationId', null);
    form.setFieldValue('employeeId', undefined);
    form.setFieldValue('startTime', undefined);
    form.setFieldValue('endTime', undefined);
    form.setFieldValue('value', undefined);
  };

  // 组织选择变更
  const handleOrganizationChange = (orgId: number) => {
    setSelectedOrgId(orgId);
    if (orgId) {
      refetchOrgEmployees();
    }
  };

  // 当组织员工加载完成后，自动填充到表格中
  useEffect(() => {
    if (reportMode === 'team' && orgEmployees?.items && orgEmployees.items.length > 0) {
      console.log('=== 自动导入团队成员到表格 ===');
      console.log('组织员工数量:', orgEmployees.items.length);

      // 获取当前统一设置的时间作为默认值
      const startTime = form.getFieldValue('startTime');
      const endTime = form.getFieldValue('endTime');
      const value = form.getFieldValue('value');

      setEmployeeReportDataList(() => {
        const list = orgEmployees.items.map(emp => ({
          employee: emp,
          startTime,
          endTime,
          value,
        }));
        console.log('初始化员工报工数据列表，数量:', list.length);
        return list;
      });

      // 更新 selectedEmployees（用于提交）
      setSelectedEmployees(orgEmployees.items);
      console.log('==================================');
    }
  }, [orgEmployees, reportMode]);

  // 人员选择变更
  const handleEmployeeChange = (value: number | number[] | null | undefined, employeeData?: Employee | Employee[]) => {
    const employeeIds = value;
    const ids = Array.isArray(employeeIds) ? employeeIds : (employeeIds ? [employeeIds] : []);

    if (ids.length > 0) {
      let employeeList: Employee[] = [];
      if (employeeData) {
        if (Array.isArray(employeeData)) {
          employeeList = employeeData;
        } else {
          employeeList = [employeeData];
        }
      } else {
        employeeList = (employees?.items || []).filter((emp: Employee) => ids.includes(emp.id));
      }

      setSelectedEmployees(employeeList);

      if (reportMode === 'team') {
        const previousIds = new Set(selectedEmployees.map(emp => emp.id));
        const idsSet = new Set(ids);

        ids.forEach(id => {
          if (!previousIds.has(id)) {
            setManualEmployees(prev => new Set(prev).add(id));
          }
        });

        previousIds.forEach(id => {
          if (!idsSet.has(id)) {
            setManualEmployees(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
            });
          }
        });

        // 初始化员工报工数据列表，使用统一设置作为默认值
        const startTime = form.getFieldValue('startTime');
        const endTime = form.getFieldValue('endTime');
        const value = form.getFieldValue('value');

        setEmployeeReportDataList(prev => {
          const existingDataMap = new Map(prev.map(item => [item.employee.id, item]));
          return employeeList.map(emp => {
            const existing = existingDataMap.get(emp.id);
            return existing || {
              employee: emp,
              startTime,
              endTime,
              value,
            };
          });
        });
      }
    } else {
      setSelectedEmployees([]);
      if (reportMode === 'team') {
        setManualEmployees(new Set());
        setEmployeeReportDataList([]);
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
      if (code.unit) {
        setSelectedUnit(code.unit);
        form.setFieldValue('unit', code.unit);
      }
    }
  };

  // 账户选择变更
  const handleAccountChange = (value: number, account?: any) => {
    setSelectedAccountId(value);
    setSelectedAccount(account || null);
  };

  // 统一时间字段变化处理
  const handleTimeChange = (field: 'startTime' | 'endTime' | 'value', value: any) => {
    form.setFieldValue(field, value);

    // 如果是团队模式，同时更新表格中所有员工的数据
    if (reportMode === 'team') {
      setEmployeeReportDataList(prev =>
        prev.map(item => ({
          ...item,
          [field]: value,
        }))
      );

      // 如果修改了开始或结束时间，自动计算工时
      if (field === 'startTime' || field === 'endTime') {
        const startTime = field === 'startTime' ? value : form.getFieldValue('startTime');
        const endTime = field === 'endTime' ? value : form.getFieldValue('endTime');
        if (startTime && endTime) {
          const start = dayjs(startTime);
          const end = dayjs(endTime);
          const diff = end.diff(start, 'hour', true);
          if (diff > 0) {
            const calculatedValue = parseFloat(diff.toFixed(2));
            form.setFieldValue('value', calculatedValue);
            setEmployeeReportDataList(prev =>
              prev.map(item => ({
                ...item,
                value: calculatedValue,
              }))
            );
          }
        }
      }
    } else {
      // 个人模式：自动计算工时
      const startTime = form.getFieldValue('startTime');
      const endTime = form.getFieldValue('endTime');
      if (startTime && endTime) {
        const start = dayjs(startTime);
        const end = dayjs(endTime);
        const diff = end.diff(start, 'hour', true);
        if (diff > 0) {
          form.setFieldValue('value', parseFloat(diff.toFixed(2)));
        } else {
          form.setFieldValue('value', 0);
        }
      }
    }
  };

  // 员工字段变更处理（表格中单独修改）
  const handleEmployeeFieldChange = (
    employeeIndex: number,
    field: keyof EmployeeReportData,
    value: any
  ) => {
    setEmployeeReportDataList(prev => {
      const updated = [...prev];
      updated[employeeIndex] = {
        ...updated[employeeIndex],
        [field]: value,
      };

      // 如果同时设置了开始时间和结束时间，自动计算工时
      if (field === 'startTime' || field === 'endTime') {
        const record = updated[employeeIndex];
        if (record.startTime && record.endTime) {
          const start = dayjs(record.startTime);
          const end = dayjs(record.endTime);
          const diff = end.diff(start, 'hour', true);
          if (diff > 0) {
            updated[employeeIndex] = {
              ...updated[employeeIndex],
              value: parseFloat(diff.toFixed(2)),
            };
          }
        }
      }

      return updated;
    });
  };

  // 移除员工
  const handleRemoveEmployee = (employeeId: number) => {
    setSelectedEmployees(prev => {
      const updated = prev.filter(emp => emp.id !== employeeId);

      // 不再通过更新表单字段来触发handleEmployeeChange，
      // 因为我们已经在手动管理员工列表了
      return updated;
    });

    setEmployeeReportDataList(prev =>
      prev.filter(item => item.employee.id !== employeeId)
    );

    setManualEmployees(prev => {
      const newSet = new Set(prev);
      newSet.delete(employeeId);
      return newSet;
    });
  };

  // 添加新员工行
  const handleAddEmployeeRow = () => {
    const startTime = form.getFieldValue('startTime');
    const endTime = form.getFieldValue('endTime');
    const value = form.getFieldValue('value');

    // 创建一个临时员工（id为负数表示新添加）
    const tempEmployee: Employee = {
      id: Date.now() * -1, // 临时ID
      employeeNo: '',
      name: '',
    };

    setEmployeeReportDataList(prev => [
      ...prev,
      {
        employee: tempEmployee,
        startTime,
        endTime,
        value,
      },
    ]);
  };

  // 更新员工行的员工信息
  const handleEmployeeSelectChange = (index: number, employee: Employee) => {
    setEmployeeReportDataList(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        employee: employee,
      };
      return updated;
    });

    // 同时更新selectedEmployees
    setSelectedEmployees(prev => {
      const exists = prev.some(emp => emp.id === employee.id);
      if (!exists) {
        return [...prev, employee];
      }
      return prev;
    });

    setManualEmployees(prev => new Set(prev).add(employee.id));
  };

  // 提交表单
  const handleSubmit = async (values: any) => {
    setLoading(true);

    if (!selectedAccountId) {
      message.error('请选择报工归属账户');
      setLoading(false);
      return;
    }

    if (selectedEmployees.length === 0) {
      message.error('请添加报工人员');
      setLoading(false);
      return;
    }

    let account = selectedAccount;
    if (!account) {
      try {
        account = await request.get(`/account/accounts/${selectedAccountId}`);
      } catch (error: any) {
        const errorMsg = error?.response?.data?.message || error?.message || '获取账户信息失败';
        message.error(errorMsg);
        setLoading(false);
        return;
      }
    }

    if (!account || !account.id || !account.code || !account.path) {
      message.error('账户信息不完整，请重新选择账户');
      setLoading(false);
      return;
    }

    let employees;
    let totalValue = values.value;

    if (reportMode === 'team') {
      // 验证是否有员工数据
      if (employeeReportDataList.length === 0) {
        message.error('请先选择团队，成员将自动导入到表格');
        setLoading(false);
        return;
      }

      // 验证每个员工是否都有有效的工时数据
      const invalidEmployees = employeeReportDataList.filter(item => !item.employee || !item.employee.name || item.employee.id < 0);
      if (invalidEmployees.length > 0) {
        message.error('请为所有新增的员工行选择员工');
        setLoading(false);
        return;
      }

      console.log('提交团队报工，员工数量:', employeeReportDataList.length);

      employees = employeeReportDataList.map(item => ({
        employeeId: item.employee.id,
        employeeNo: item.employee.employeeNo,
        employeeName: item.employee.employeeName || item.employee.name,
        startTime: item.startTime?.format('HH:mm'),
        endTime: item.endTime?.format('HH:mm'),
        value: item.value || 0, // 确保有默认值
      }));
      totalValue = employees.reduce((sum, emp) => sum + (emp.value || 0), 0);
    } else {
      employees = selectedEmployees.map(emp => ({
        employeeId: emp.id,
        employeeNo: emp.employeeNo,
        employeeName: emp.employeeName || emp.name,
      }));
    }

    // 确保总工时有值
    if (!totalValue || totalValue <= 0) {
      message.error('请填写工时数量');
      setLoading(false);
      return;
    }

    const data = {
      workflowCode: 'LABOR_HOUR_REPORT',
      title: reportMode === 'personal'
        ? `${selectedEmployees[0].name} - ${values.hourTypeName} - ${values.reportDate.format('YYYY-MM-DD')}`
        : `团队报工(${selectedEmployees.length}人) - ${values.hourTypeName} - ${values.reportDate.format('YYYY-MM-DD')}`,
      reportDate: values.reportDate.format('YYYY-MM-DD'),
      reportMode: reportMode,
      employeeId: reportMode === 'personal' ? selectedEmployees[0].id : undefined,
      employeeNo: reportMode === 'personal' ? selectedEmployees[0].employeeNo : undefined,
      employeeName: reportMode === 'personal' ? (selectedEmployees[0].employeeName || selectedEmployees[0].name) : undefined,
      employees: employees,
      hourType: selectedAttendanceCode?.code || values.hourType,
      hourTypeName: values.hourTypeName,
      startTime: values.startTime && values.startTime.isValid() ? values.startTime.format('HH:mm') : undefined,
      endTime: values.endTime && values.endTime.isValid() ? values.endTime.format('HH:mm') : undefined,
      value: totalValue,
      unit: selectedUnit || values.unit || '小时',
      description: values.description,
      accountId: account.id,
      accountCode: account.code,
      accountPath: account.path,
      accountName: account.name || account.namePath,
      requesterId: user?.id,
      requesterName: user?.name,
    };

    createMutation.mutate(data);
  };

  // 表格列定义
  const columns = [
    {
      title: '员工',
      dataIndex: ['employee', 'name'],
      width: 200,
      fixed: 'left' as const,
      render: (text: string, record: EmployeeReportData, index: number) => {
        // 只有额外添加的员工（临时ID或手动添加）才能选择
        const isManualAdded = record.employee.id < 0 || manualEmployees.has(record.employee.id);
        if (!isManualAdded) {
          return <span>{record.employee.name}</span>;
        }
        return (
          <EmployeeSelect
            placeholder="选择员工"
            value={record.employee.id < 0 ? undefined : record.employee.id}
            onChange={(value, employee) => handleEmployeeSelectChange(index, employee as Employee)}
            style={{ width: '100%' }}
            status="ACTIVE"
          />
        );
      },
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      width: 150,
      render: (time: dayjs.Dayjs, record: EmployeeReportData, index: number) => {
        // 只有额外添加的员工才能修改
        const isManualAdded = record.employee.id < 0 || manualEmployees.has(record.employee.id);
        return (
          <TimePicker
            format="HH:mm"
            value={time}
            onChange={(value) => handleEmployeeFieldChange(index, 'startTime', value)}
            style={{ width: '100%' }}
            disabled={!isManualAdded}
          />
        );
      },
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      width: 150,
      render: (time: dayjs.Dayjs, record: EmployeeReportData, index: number) => {
        // 只有额外添加的员工才能修改
        const isManualAdded = record.employee.id < 0 || manualEmployees.has(record.employee.id);
        return (
          <TimePicker
            format="HH:mm"
            value={time}
            onChange={(value) => handleEmployeeFieldChange(index, 'endTime', value)}
            style={{ width: '100%' }}
            disabled={!isManualAdded}
          />
        );
      },
    },
    {
      title: '工时数量',
      dataIndex: 'value',
      width: 120,
      render: (val: number, record: EmployeeReportData, index: number) => {
        // 只有额外添加的员工才能修改
        const isManualAdded = record.employee.id < 0 || manualEmployees.has(record.employee.id);
        return (
          <InputNumber
            min={0}
            precision={2}
            value={val}
            onChange={(value) => handleEmployeeFieldChange(index, 'value', value)}
            style={{ width: '100%' }}
            addonAfter="小时"
            disabled={!isManualAdded}
          />
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      fixed: 'right' as const,
      render: (_: any, record: EmployeeReportData) => (
        <Button
          type="link"
          danger
          onClick={() => handleRemoveEmployee(record.employee.id)}
          style={{ padding: 0 }}
        >
          移除
        </Button>
      ),
    },
  ];

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

        {/* 团队报工模式：选择组织和人员 */}
        {reportMode === 'team' && (
          <>
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
              <Col span={12}>
                <Form.Item
                  label="提示"
                >
                  <div style={{ color: '#52c41a', fontSize: 12, fontWeight: 500 }}>
                    ✓ 选择团队后，成员将自动导入下方表格
                  </div>
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        {/* 个人报工模式：选择人员 */}
        {reportMode === 'personal' && (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="报工人员"
                  name="employeeId"
                  rules={[{ required: true, message: '请选择报工人员' }]}
                >
                  <EmployeeSelect
                    placeholder="请选择报工人员"
                    onChange={handleEmployeeChange}
                    style={{ width: '100%' }}
                    status="ACTIVE"
                  />
                </Form.Item>
              </Col>
              <Col span={12}></Col>
            </Row>
            <Form.Item name="employeeNo" hidden><Input /></Form.Item>
            <Form.Item name="employeeName" hidden><Input /></Form.Item>
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
            <Form.Item name="hourTypeName" hidden><Input /></Form.Item>
          </Col>
          <Col span={12}></Col>
        </Row>

        {/* 时间和工时字段 */}
        {reportMode === 'personal' ? (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="开始时间" name="startTime">
                  <TimePicker
                    style={{ width: '100%' }}
                    format="HH:mm"
                    onChange={(value) => handleTimeChange('startTime', value)}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="结束时间" name="endTime">
                  <TimePicker
                    style={{ width: '100%' }}
                    format="HH:mm"
                    onChange={(value) => handleTimeChange('endTime', value)}
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
          </>
        ) : (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="开始时间（统一设置）"
                  name="startTime"
                  tooltip="设置后会自动应用到下方所有员工"
                >
                  <TimePicker
                    style={{ width: '100%' }}
                    format="HH:mm"
                    onChange={(value) => handleTimeChange('startTime', value)}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="结束时间（统一设置）"
                  name="endTime"
                  tooltip="设置后会自动应用到下方所有员工"
                >
                  <TimePicker
                    style={{ width: '100%' }}
                    format="HH:mm"
                    onChange={(value) => handleTimeChange('endTime', value)}
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="工时数量（统一设置）"
                  name="value"
                  tooltip="设置后会自动应用到���方所有员工"
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                    addonAfter="小时"
                    onChange={(value) => handleTimeChange('value', value)}
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
          </>
        )}

        <Form.Item
          label="报工归属"
          name="accountId"
          rules={[{ required: true, message: '请选择报工归属账户' }]}
        >
          <AccountSelect
            placeholder="选择报工归属账户"
            onChange={handleAccountChange}
            value={selectedAccountId}
            showCreateButton={true}
            style={{ width: '100%' }}
          />
        </Form.Item>

        {/* 团队报工模式：显示员工报工明细表格 */}
        {reportMode === 'team' && employeeReportDataList.length > 0 && (
          <>
            <Divider orientation="left">员工报工明细（可单独修改）</Divider>
            <div style={{ marginBottom: 16 }}>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={handleAddEmployeeRow}
              >
                添加额外员工
              </Button>
            </div>
            <Table
              columns={columns}
              dataSource={employeeReportDataList}
              rowKey={(record) => record.employee.id}
              scroll={{ x: 900, y: 400 }}
              pagination={false}
              size="small"
            />
          </>
        )}

        {/* 个人报工模式：显示详细描述 */}
        {reportMode === 'personal' && (
          <Form.Item label="详细描述" name="description">
            <Input.TextArea rows={4} placeholder="请输入详细描述（可选）" />
          </Form.Item>
        )}

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
