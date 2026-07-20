import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import {
  Card,
  Form,
  Select,
  Button,
  Table,
  Space,
  DatePicker,
  Row,
  Col,
  Input,
  message,
  Tabs,
  Dropdown,
  Menu,
} from 'antd';
import { SearchOutlined, CalculatorOutlined, DownOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';
import OrganizationTreeSelect from '@/components/common/OrganizationTreeSelect';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface Employee {
  key: string;
  id: string;
  employeeNo: string;
  name: string;
  organization: string;
  lastCalculationTime: string | null;
}

interface Rule {
  id: string;
  originalId: number;  // 原始规则ID，用于API调用
  code: string;
  name: string;
  displayName: string;
  type: 'earned' | 'indirect';
  status: 'active' | 'inactive';
  effectiveStartTime: string;
  effectiveEndTime: string | null;
  employeeFilter?: any;  // 规则中配置的人员筛选条件
}

const CalculationManagementPage: React.FC = () => {
  // ��测是否在 iframe 中运行
  const isIframe = window.self !== window.top;

  const [activeTab, setActiveTab] = useState<string>('indirect');

  // 间接工时页签状态
  const [indirectForm] = Form.useForm();
  const [indirectSearching, setIndirectSearching] = useState(false);
  const [indirectCalculating, setIndirectCalculating] = useState(false);
  const [indirectSelectedRowKeys, setIndirectSelectedRowKeys] = useState<React.Key[]>([]);
  const [indirectEmployees, setIndirectEmployees] = useState<Employee[]>([]);
  const [indirectCurrentPage, setIndirectCurrentPage] = useState(1);
  const [indirectPageSize, setIndirectPageSize] = useState(10);

  // 挣得工时页签状态
  const [earnedForm] = Form.useForm();
  const [earnedSearching, setEarnedSearching] = useState(false);
  const [earnedCalculating, setEarnedCalculating] = useState(false);
  const [earnedSelectedRowKeys, setEarnedSelectedRowKeys] = useState<React.Key[]>([]);
  const [earnedEmployees, setEarnedEmployees] = useState<Employee[]>([]);
  const [earnedCurrentPage, setEarnedCurrentPage] = useState(1);
  const [earnedPageSize, setEarnedPageSize] = useState(10);

  // 初始化日期区间为当前周
  useEffect(() => {
    const now = dayjs();
    const weekStart = now.startOf('week'); // 周日
    const weekEnd = now.endOf('week'); // 周六
    indirectForm.setFieldValue('dateRange', [weekStart, weekEnd]);
    earnedForm.setFieldValue('dateRange', [weekStart, weekEnd]);
  }, []);

  // 限制日期选择范围最大为一个月
  const disabledDate = (current: dayjs.Dayjs, formInstance: any) => {
    if (!current) {
      return false;
    }
    const selectedRange = formInstance.getFieldValue('dateRange');
    if (selectedRange && selectedRange.length === 2 && selectedRange[0]) {
      // 如果已经选择了开始日期，限制选择范围不能超过一个月
      const startDate = selectedRange[0];
      const minDate = startDate.subtract(1, 'month');
      const maxDate = startDate.add(1, 'month');
      return current.isBefore(minDate, 'day') || current.isAfter(maxDate, 'day');
    }
    // 如果还没有选择日期，不限制
    return false;
  };

  // 获取已生效的间接工时规则列表
  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['calculationRules'],
    queryFn: async () => {
      try {
        // 获取间接工时规则
        const indirectRes = await request.get('/allocation/configs', {
          params: { pageSize: 1000 },
        });

        // 提取数据 - 支持多种响应格式
        let indirectData: any[] = [];

        if (Array.isArray(indirectRes)) {
          indirectData = indirectRes;
        } else if (indirectRes?.items && Array.isArray(indirectRes.items)) {
          indirectData = indirectRes.items;
        } else if (indirectRes?.data && Array.isArray(indirectRes.data)) {
          indirectData = indirectRes.data;
        } else if (indirectRes?.list && Array.isArray(indirectRes.list)) {
          indirectData = indirectRes.list;
        }

        // 映射并过滤规则 - 只返回已生效的规则
        const now = new Date();
        const activeRules = indirectData
          .map((rule: any) => ({
            id: `indirect-${rule.id}`,
            originalId: rule.id,  // 保存原始ID用于API调用
            code: rule.configCode || rule.code,
            name: rule.configName || rule.name,
            displayName: `${rule.configCode || rule.code} - ${rule.configName || rule.name}`,
            type: 'indirect' as const,
            status: rule.status,
            effectiveStartTime: rule.effectiveStartTime,
            effectiveEndTime: rule.effectiveEndTime,
            employeeFilter: rule.employeeFilter,  // 保留人员筛选条件
          }))
          .filter((rule) => {
            // 只显示状态为 ACTIVE 的规则
            if (rule.status !== 'ACTIVE') {
              return false;
            }

            // 检查生效时间
            const startTime = rule.effectiveStartTime ? new Date(rule.effectiveStartTime) : null;
            const endTime = rule.effectiveEndTime ? new Date(rule.effectiveEndTime) : null;

            // 如果有开始时间，检查是否已到开始时间
            if (startTime && startTime > now) {
              return false;
            }

            // 如果有结束时间，检查是否已过结束时间
            if (endTime && endTime < now) {
              return false;
            }

            return true;
          });

        return activeRules;
      } catch (error) {
        console.error('获取间接工时规则失败:', error);
        return [];
      }
    },
  });

  // 获取已生效的挣得工时规则列表
  const { data: earnedRules = [], isLoading: earnedRulesLoading } = useQuery({
    queryKey: ['earnedCalculationRules'],
    queryFn: async () => {
      try {
        // 获取挣得工时规则
        const earnedRes = await request.get('/earned-hours-allocation/configs', {
          params: { pageSize: 1000 },
        });

        // 提取数据 - 支持多种响应格式
        let earnedData: any[] = [];

        if (Array.isArray(earnedRes)) {
          earnedData = earnedRes;
        } else if (earnedRes?.items && Array.isArray(earnedRes.items)) {
          earnedData = earnedRes.items;
        } else if (earnedRes?.data && Array.isArray(earnedRes.data)) {
          earnedData = earnedRes.data;
        } else if (earnedRes?.list && Array.isArray(earnedRes.list)) {
          earnedData = earnedRes.list;
        }

        // 映射并过滤规则 - 只返回已生效的规则
        const now = new Date();
        const activeRules = earnedData
          .map((rule: any) => ({
            id: `earned-${rule.id}`,
            originalId: rule.id,  // 保存原始ID用于API调用
            code: rule.configCode || rule.code,
            name: rule.configName || rule.name,
            displayName: `${rule.configCode || rule.code} - ${rule.configName || rule.name}`,
            type: 'earned' as const,
            status: rule.status,
            effectiveStartTime: rule.effectiveStartTime,
            effectiveEndTime: rule.effectiveEndTime,
            employeeFilter: rule.employeeFilter,  // 保留人员筛选条件
          }))
          .filter((rule) => {
            // 只显示状态为 ACTIVE 的规则
            if (rule.status !== 'ACTIVE') {
              return false;
            }

            // 检查生效时间
            const startTime = rule.effectiveStartTime ? new Date(rule.effectiveStartTime) : null;
            const endTime = rule.effectiveEndTime ? new Date(rule.effectiveEndTime) : null;

            // 如果有开始时间，检查是否已到开始时间
            if (startTime && startTime > now) {
              return false;
            }

            // 如果有结束时间，检查是否已过结束时间
            if (endTime && endTime < now) {
              return false;
            }

            return true;
          });

        return activeRules;
      } catch (error) {
        console.error('获取挣得工时规则失败:', error);
        return [];
      }
    },
  });

  // 间接工时 - 查询员工
  const handleIndirectSearch = async () => {
    try {
      const values = await indirectForm.validateFields();

      // 获取选择的规则对象
      const selectedRule = rules.find((rule: Rule) => rule.id === values.ruleId);

      console.log('=== 间接工时查询 ===');
      console.log('选择的规则ID:', values.ruleId);
      console.log('选择的规则对象:', selectedRule);
      console.log('规则中的人员筛选条件:', selectedRule?.employeeFilter);

      setIndirectSearching(true);
      try {
        const params: any = {
          page: indirectCurrentPage,
          pageSize: indirectPageSize,
          ruleId: values.ruleId,
          employeeFilter: selectedRule?.employeeFilter || null,  // 传递规则中的人员筛选条件
        };

        if (values.organizationId) {
          params.organizationId = values.organizationId;
        }

        if (values.employeeNo) {
          params.employeeNo = values.employeeNo;
        }

        if (values.name) {
          params.name = values.name;
        }

        console.log('查询参数:', params);

        const res = await request.get('/allocation/calculation/employees', { params });
        console.log('查询结果:', res);

        const employees = (res?.data || []).map((emp: any) => ({
          key: emp.id,
          id: emp.id,
          employeeNo: emp.employeeNo,
          name: emp.name,
          organization: emp.organization || '',
          lastCalculationTime: emp.lastCalculationTime || null,
        }));

        setIndirectEmployees(employees);
        message.success(`查询到 ${employees.length} 条员工记录`);
      } catch (error) {
        console.error('查询员工失败:', error);
        message.error('查询员工失败');
      } finally {
        setIndirectSearching(false);
      }
    } catch (error) {
      // 表单验证失败，不需要额外处理，错误会由Form自动显示
    }
  };

  // 挣得工时 - 查询员工
  const handleEarnedSearch = async () => {
    try {
      const values = await earnedForm.validateFields();

      // 获取选择的规则对象
      const selectedRule = earnedRules.find((rule: Rule) => rule.id === values.ruleId);

      console.log('=== 挣得工时查询 ===');
      console.log('选择的规则ID:', values.ruleId);
      console.log('选择的规则对象:', selectedRule);
      console.log('规则中的人员筛选条件:', selectedRule?.employeeFilter);

      setEarnedSearching(true);
      try {
        const params: any = {
          page: earnedCurrentPage,
          pageSize: earnedPageSize,
          ruleId: values.ruleId,
          employeeFilter: selectedRule?.employeeFilter || null,  // 传递规则中的人员筛选条件
        };

        if (values.organizationId) {
          params.organizationId = values.organizationId;
        }

        if (values.employeeNo) {
          params.employeeNo = values.employeeNo;
        }

        if (values.name) {
          params.name = values.name;
        }

        console.log('查询参数:', params);

        const res = await request.get('/earned-hours-allocation/calculation/employees', { params });
        console.log('查询结果:', res);

        const employees = (res?.data || []).map((emp: any) => ({
          key: emp.id,
          id: emp.id,
          employeeNo: emp.employeeNo,
          name: emp.name,
          organization: emp.organization || '',
          lastCalculationTime: emp.lastCalculationTime || null,
        }));

        setEarnedEmployees(employees);
        message.success(`查询到 ${employees.length} 条员工记录`);
      } catch (error) {
        console.error('查询员工失败:', error);
        message.error('查询员工失败');
      } finally {
        setEarnedSearching(false);
      }
    } catch (error) {
      // 表单验证失败，不需要额外处理，错误会由Form自动显示
    }
  };

  // 间接工时 - 执行计算
  const handleIndirectCalculate = async () => {
    if (indirectSelectedRowKeys.length === 0) {
      message.warning('请先选择要计算的人员');
      return;
    }

    const values = indirectForm.getFieldsValue();
    if (!values.ruleId) {
      message.warning('请先选择计算规则');
      return;
    }
    if (!values.dateRange || values.dateRange.length !== 2) {
      message.warning('请先选择计算日期周期');
      return;
    }

    setIndirectCalculating(true);
    try {
      const startDate = values.dateRange[0].format('YYYY-MM-DD');
      const endDate = values.dateRange[1].format('YYYY-MM-DD');

      // 获取选择的规则对象，使用 originalId
      const selectedRule = rules.find((rule: Rule) => rule.id === values.ruleId);
      const ruleId = selectedRule?.originalId;

      await request.post('/allocation/calculate', {
        ruleId: parseInt(ruleId),
        employeeIds: indirectSelectedRowKeys,
        startDate,
        endDate,
      });

      message.success(`成功提交 ${indirectSelectedRowKeys.length} 人的计算任务`);
      setIndirectSelectedRowKeys([]);
    } catch (error) {
      console.error('计算失败:', error);
      message.error('计算失败');
    } finally {
      setIndirectCalculating(false);
    }
  };

  // 间接工时 - 全部计算（不需要选择人员）
  const handleIndirectCalculateAll = async () => {
    const values = indirectForm.getFieldsValue();
    if (!values.ruleId) {
      message.warning('请先选择计算规则');
      return;
    }
    if (!values.dateRange || values.dateRange.length !== 2) {
      message.warning('请先选择计算日期周期');
      return;
    }

    setIndirectCalculating(true);
    try {
      const startDate = values.dateRange[0].format('YYYY-MM-DD');
      const endDate = values.dateRange[1].format('YYYY-MM-DD');

      // 获取选择的规则对象，使用 originalId
      const selectedRule = rules.find((rule: Rule) => rule.id === values.ruleId);
      const ruleId = selectedRule?.originalId;

      await request.post('/allocation/calculate-all', {
        ruleId: parseInt(ruleId),
        startDate,
        endDate,
      });

      message.success('成功提交全部人员的计算任务');
    } catch (error) {
      console.error('全部计算失败:', error);
      message.error('全部计算失败');
    } finally {
      setIndirectCalculating(false);
    }
  };

  // 挣得工时 - 全部计算（不需要选择人员）
  const handleEarnedCalculateAll = async () => {
    const values = earnedForm.getFieldsValue();
    if (!values.ruleId) {
      message.warning('请先选择计算规则');
      return;
    }
    if (!values.dateRange || values.dateRange.length !== 2) {
      message.warning('请先选择计算日期周期');
      return;
    }

    setEarnedCalculating(true);
    try {
      const startDate = values.dateRange[0].format('YYYY-MM-DD');
      const endDate = values.dateRange[1].format('YYYY-MM-DD');

      // 获取选择的规则对象，使用 originalId
      const selectedRule = earnedRules.find((rule: Rule) => rule.id === values.ruleId);
      const ruleId = selectedRule?.originalId;

      await request.post('/earned-hours-allocation/calculate-all', {
        ruleId: parseInt(ruleId),
        startDate,
        endDate,
      });

      message.success('成功提交全部人员的计算任务');
    } catch (error) {
      console.error('全部计算失败:', error);
      message.error('全部计算失败');
    } finally {
      setEarnedCalculating(false);
    }
  };

  // 挣得工时 - 执行计算
  const handleEarnedCalculate = async () => {
    if (earnedSelectedRowKeys.length === 0) {
      message.warning('请先选择要计算的人员');
      return;
    }

    const values = earnedForm.getFieldsValue();
    if (!values.ruleId) {
      message.warning('请先选择计算规则');
      return;
    }
    if (!values.dateRange || values.dateRange.length !== 2) {
      message.warning('请先选择计算日期周期');
      return;
    }

    setEarnedCalculating(true);
    try {
      const startDate = values.dateRange[0].format('YYYY-MM-DD');
      const endDate = values.dateRange[1].format('YYYY-MM-DD');

      // 获取选择的规则对象，使用 originalId
      const selectedRule = earnedRules.find((rule: Rule) => rule.id === values.ruleId);
      const ruleId = selectedRule?.originalId;

      await request.post('/earned-hours-allocation/calculate', {
        ruleId: parseInt(ruleId),
        employeeIds: earnedSelectedRowKeys,
        startDate,
        endDate,
      });

      message.success(`成功提交 ${earnedSelectedRowKeys.length} 人的计算任务`);
      setEarnedSelectedRowKeys([]);
    } catch (error) {
      console.error('计算失败:', error);
      message.error('计算失败');
    } finally {
      setEarnedCalculating(false);
    }
  };

  // 表格列定义
  const columns: ColumnsType<Employee> = [
    {
      title: '员工编号',
      dataIndex: 'employeeNo',
      key: 'employeeNo',
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '组织',
      dataIndex: 'organization',
      key: 'organization',
      width: 250,
    },
    {
      title: '最近计算时间',
      dataIndex: 'lastCalculationTime',
      key: 'lastCalculationTime',
      width: 150,
      render: (text: string | null) => (text ? text : '-'),
    },
  ];

  // 间接工时 - 行选择配置
  const indirectRowSelection = {
    selectedRowKeys: indirectSelectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setIndirectSelectedRowKeys(newSelectedRowKeys);
    },
  };

  // 挣得工时 - 行选择配置
  const earnedRowSelection = {
    selectedRowKeys: earnedSelectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setEarnedSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div style={{
      padding: isIframe ? '16px' : '24px',
      background: isIframe ? '#f8fafc' : '#f0f2f5',
      minHeight: '100vh'
    }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size={isIframe ? 'small' : 'default'}
        items={[
          {
            key: 'indirect',
            label: '间接工时',
            children: (
              <>
                <Card
                  title="间接工时计算"
                  bordered={false}
                  style={{ marginBottom: '16px' }}
                >
                  <Form form={indirectForm} layout="inline" style={{ width: '100%' }}>
                    <Row gutter={[12, 12]} align="middle" style={{ width: '100%' }}>
                      <Col>
                        <Form.Item
                          label="计算规则"
                          name="ruleId"
                          rules={[{ required: true, message: '请选择计算规则' }]}
                          style={{ marginBottom: 0, marginRight: 0 }}
                          labelCol={{ style: { width: 'auto', marginRight: 8 } }}
                        >
                          <Select
                            placeholder="请选择计算规则"
                            size="middle"
                            style={{ width: 200 }}
                            loading={rulesLoading}
                          >
                            {rules.map((rule: Rule) => (
                              <Option key={rule.id} value={rule.id}>
                                {rule.displayName}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col>
                        <Form.Item
                          label="组织"
                          name="organizationId"
                          style={{ marginBottom: 0, marginRight: 0 }}
                          labelCol={{ style: { width: 'auto', marginRight: 8 } }}
                        >
                          <OrganizationTreeSelect
                            placeholder="请选择组织"
                            allowClear
                            size="middle"
                            style={{ width: 200 }}
                            multiple={false}
                            showIncludeChildren={true}
                            showSelectAll={false}
                          />
                        </Form.Item>
                      </Col>
                      <Col>
                        <Form.Item
                          label="工号"
                          name="employeeNo"
                          style={{ marginBottom: 0, marginRight: 0 }}
                          labelCol={{ style: { width: 'auto', marginRight: 8 } }}
                        >
                          <Input
                            placeholder="请输入工号"
                            allowClear
                            size="middle"
                            style={{ width: 150 }}
                          />
                        </Form.Item>
                      </Col>
                      <Col>
                        <Form.Item
                          label="姓名"
                          name="name"
                          style={{ marginBottom: 0, marginRight: 0 }}
                          labelCol={{ style: { width: 'auto', marginRight: 8 } }}
                        >
                          <Input
                            placeholder="请输入姓名"
                            allowClear
                            size="middle"
                            style={{ width: 120 }}
                          />
                        </Form.Item>
                      </Col>
                      <Col>
                        <Form.Item style={{ marginBottom: 0 }}>
                          <Button
                            type="primary"
                            icon={<SearchOutlined />}
                            onClick={handleIndirectSearch}
                            loading={indirectSearching}
                            size="middle"
                            style={{ borderRadius: 6, fontWeight: 500 }}
                          >
                            查询
                          </Button>
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </Card>

                <Card bordered={false} style={{ minHeight: '400px' }}>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Space>
                      <span>日期周期：</span>
                      <RangePicker
                        value={indirectForm.getFieldValue('dateRange')}
                        onChange={(dates) => indirectForm.setFieldValue('dateRange', dates)}
                        disabledDate={(current) => disabledDate(current, indirectForm)}
                        style={{ width: 280 }}
                      />
                      <Dropdown
                        disabled={indirectCalculating}
                        menu={{
                          items: [
                            {
                              key: 'calculateAll',
                              label: '全部计算',
                              icon: <CalculatorOutlined />,
                              onClick: handleIndirectCalculateAll,
                            },
                          ],
                        }}
                        trigger={['click']}
                      >
                        <Button
                          size="middle"
                          style={{ borderRadius: 6, fontWeight: 500 }}
                          loading={indirectCalculating}
                        >
                          <Space>
                            <CalculatorOutlined />
                            <span>计算</span>
                            <DownOutlined />
                          </Space>
                        </Button>
                      </Dropdown>
                    </Space>
                  </div>

                  <Table
                    columns={columns}
                    dataSource={indirectEmployees}
                    rowSelection={indirectRowSelection}
                    loading={indirectSearching}
                    pagination={{
                      current: indirectCurrentPage,
                      pageSize: indirectPageSize,
                      total: indirectEmployees.length,
                      showSizeChanger: true,
                      showTotal: (total) => `共 ${total} 条记录`,
                      onChange: (page, size) => {
                        setIndirectCurrentPage(page);
                        setIndirectPageSize(size || 10);
                      },
                    }}
                    scroll={{ x: 800 }}
                  />
                </Card>
              </>
            ),
          },
          {
            key: 'earned',
            label: '挣得工时',
            children: (
              <>
                <Card
                  title="挣得工时计算"
                  bordered={false}
                  style={{ marginBottom: '16px' }}
                >
                  <Form form={earnedForm} layout="inline" style={{ width: '100%' }}>
                    <Row gutter={[12, 12]} align="middle" style={{ width: '100%' }}>
                      <Col>
                        <Form.Item
                          label="计算规则"
                          name="ruleId"
                          rules={[{ required: true, message: '请选择计算规则' }]}
                          style={{ marginBottom: 0, marginRight: 0 }}
                          labelCol={{ style: { width: 'auto', marginRight: 8 } }}
                        >
                          <Select
                            placeholder="请选择计算规则"
                            size="middle"
                            style={{ width: 200 }}
                            loading={earnedRulesLoading}
                          >
                            {earnedRules.map((rule: Rule) => (
                              <Option key={rule.id} value={rule.id}>
                                {rule.displayName}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col>
                        <Form.Item
                          label="组织"
                          name="organizationId"
                          style={{ marginBottom: 0, marginRight: 0 }}
                          labelCol={{ style: { width: 'auto', marginRight: 8 } }}
                        >
                          <OrganizationTreeSelect
                            placeholder="请选择组织"
                            allowClear
                            size="middle"
                            style={{ width: 200 }}
                            multiple={false}
                            showIncludeChildren={true}
                            showSelectAll={false}
                          />
                        </Form.Item>
                      </Col>
                      <Col>
                        <Form.Item
                          label="工号"
                          name="employeeNo"
                          style={{ marginBottom: 0, marginRight: 0 }}
                          labelCol={{ style: { width: 'auto', marginRight: 8 } }}
                        >
                          <Input
                            placeholder="请输入工号"
                            allowClear
                            size="middle"
                            style={{ width: 150 }}
                          />
                        </Form.Item>
                      </Col>
                      <Col>
                        <Form.Item
                          label="姓名"
                          name="name"
                          style={{ marginBottom: 0, marginRight: 0 }}
                          labelCol={{ style: { width: 'auto', marginRight: 8 } }}
                        >
                          <Input
                            placeholder="请输入姓名"
                            allowClear
                            size="middle"
                            style={{ width: 120 }}
                          />
                        </Form.Item>
                      </Col>
                      <Col>
                        <Form.Item style={{ marginBottom: 0 }}>
                          <Button
                            type="primary"
                            icon={<SearchOutlined />}
                            onClick={handleEarnedSearch}
                            loading={earnedSearching}
                            size="middle"
                            style={{ borderRadius: 6, fontWeight: 500 }}
                          >
                            查询
                          </Button>
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </Card>

                <Card bordered={false} style={{ minHeight: '400px' }}>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Space>
                      <span>日期周期：</span>
                      <RangePicker
                        value={earnedForm.getFieldValue('dateRange')}
                        onChange={(dates) => earnedForm.setFieldValue('dateRange', dates)}
                        disabledDate={(current) => disabledDate(current, earnedForm)}
                        style={{ width: 280 }}
                      />
                      <Dropdown
                        disabled={earnedCalculating}
                        menu={{
                          items: [
                            {
                              key: 'calculateAll',
                              label: '全部计算',
                              icon: <CalculatorOutlined />,
                              onClick: handleEarnedCalculateAll,
                            },
                          ],
                        }}
                        trigger={['click']}
                      >
                        <Button
                          size="middle"
                          style={{ borderRadius: 6, fontWeight: 500 }}
                          loading={earnedCalculating}
                        >
                          <Space>
                            <CalculatorOutlined />
                            <span>计算</span>
                            <DownOutlined />
                          </Space>
                        </Button>
                      </Dropdown>
                    </Space>
                  </div>

                  <Table
                    columns={columns}
                    dataSource={earnedEmployees}
                    rowSelection={earnedRowSelection}
                    loading={earnedSearching}
                    pagination={{
                      current: earnedCurrentPage,
                      pageSize: earnedPageSize,
                      total: earnedEmployees.length,
                      showSizeChanger: true,
                      showTotal: (total) => `共 ${total} 条记录`,
                      onChange: (page, size) => {
                        setEarnedCurrentPage(page);
                        setEarnedPageSize(size || 10);
                      },
                    }}
                    scroll={{ x: 800 }}
                  />
                </Card>
              </>
            ),
          },
        ]}
      />
    </div>
  );
};

export default CalculationManagementPage;
