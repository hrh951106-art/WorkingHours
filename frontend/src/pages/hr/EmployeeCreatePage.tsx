import { useNavigate } from 'react-router-dom';
import {
  Card,
  Tabs,
  Button,
  Form,
  Input,
  Select,
  TreeSelect,
  DatePicker,
  message,
  Row,
  Col,
  Spin,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';

const EmployeeCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: orgTree, isLoading: orgTreeLoading, error: orgTreeError } = useQuery({
    queryKey: ['orgTree'],
    queryFn: () => request.get('/hr/organizations/tree').then((res: any) => {
      console.log('组织树数据:', res);
      return res;
    }),
  });

  const { data: tabs, isLoading: tabsLoading } = useQuery({
    queryKey: ['employeeInfoTabs'],
    queryFn: () => request.get('/hr/employee-info-tabs').then((res: any) => res || []),
  });

  const { data: customFields } = useQuery({
    queryKey: ['customFields'],
    queryFn: () => request.get('/hr/custom-fields').then((res: any) => res || []),
  });

  // 下拉类型的自定义字段
  const dropdownFields = customFields?.filter((f: any) =>
    f.type === 'SELECT_SINGLE' || f.type === 'SELECT_MULTI' || f.type === 'LOOKUP'
  ) || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => request.post('/hr/employees', data),
    onSuccess: () => {
      message.success('人员创建成功');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      navigate('/hr/employees');
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '创建失败';
      message.error(errorMsg);
      console.error('创建人员失败:', error);
    },
  });

  // 获取下拉选项
  const getDropdownOptions = (fieldCode: string) => {
    const field = dropdownFields.find((f: any) => f.code === fieldCode);
    if (!field) return [];

    // 如果是关联数据源，从数据源获取选项
    if (field.dataSource && field.dataSource.options) {
      return field.dataSource.options.map((opt: any) => ({
        id: opt.id,
        value: opt.value,
        label: opt.label,
      }));
    }

    // 如果是内置选项（options 字段是 JSON 字符串）
    if (field.options) {
      try {
        return JSON.parse(field.options);
      } catch (e) {
        console.error('Failed to parse options:', field.options);
        return [];
      }
    }

    return [];
  };

  // 渲染组织选择器（树形）
  const renderOrgTree = (organizations: any[] = []): any[] => {
    if (!organizations || organizations.length === 0) {
      return [];
    }
    return organizations.map((org: any) => ({
      title: org.name,
      value: org.id,
      children: org.children ? renderOrgTree(org.children) : undefined,
    }));
  };

  // 渲染系统字段
  const renderSystemField = (fieldCode: string, isRequired: boolean = false) => {
    // 字段标签映射
    const getFieldLabel = (code: string) => {
      const labels: Record<string, string> = {
        employeeNo: '工号',
        name: '姓名',
        gender: '性别',
        idCard: '身份证号',
        phone: '手机号',
        email: '邮箱',
        orgId: '所属组织',
        entryDate: '入职日期',
        status: '状态',
      };
      return labels[code] || code;
    };

    // 根据isRequired动态生成验证规则
    const createRules = (additionalRules: any[] = []) => {
      const baseRules = [...additionalRules];
      if (isRequired) {
        baseRules.unshift({ required: true, message: `请输入${getFieldLabel(fieldCode)}` });
      }
      return baseRules.length > 0 ? baseRules : undefined;
    };

    switch (fieldCode) {
      case 'employeeNo':
        return (
          <Form.Item
            name="employeeNo"
            label="工号"
            rules={createRules()}
          >
            <Input placeholder="请输入工号" />
          </Form.Item>
        );

      case 'name':
        return (
          <Form.Item
            name="name"
            label="姓名"
            rules={createRules()}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
        );

      case 'gender':
        return (
          <Form.Item
            name="gender"
            label="性别"
            rules={createRules()}
          >
            <Select placeholder="请选择性别">
              <Select.Option value="MALE">男</Select.Option>
              <Select.Option value="FEMALE">女</Select.Option>
            </Select>
          </Form.Item>
        );

      case 'idCard':
        return (
          <Form.Item
            name="idCard"
            label="身份证号"
            rules={createRules([
              { pattern: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/, message: '请输入正确的身份证号' }
            ])}
          >
            <Input placeholder="请输入身份证号" />
          </Form.Item>
        );

      case 'phone':
        return (
          <Form.Item
            name="phone"
            label="手机号"
            rules={createRules([
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
            ])}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>
        );

      case 'email':
        return (
          <Form.Item
            name="email"
            label="邮箱"
            rules={createRules([{ type: 'email', message: '请输入正确的邮箱地址' }])}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
        );

      case 'orgId':
        const treeData = renderOrgTree(orgTree || []);
        console.log('orgId 字段渲染, treeData:', treeData, 'orgTree:', orgTree, 'loading:', orgTreeLoading, 'error:', orgTreeError);

        if (orgTreeLoading) {
          return (
            <Form.Item
              name="orgId"
              label="所属组织"
              rules={createRules()}
            >
              <TreeSelect placeholder="加载组织数据中..." loading={true} disabled />
            </Form.Item>
          );
        }

        if (orgTreeError) {
          console.error('组织数据加载失败:', orgTreeError);
          return (
            <Form.Item
              name="orgId"
              label="所属组织"
              rules={createRules()}
            >
              <TreeSelect placeholder="组织数据加载失败" disabled />
            </Form.Item>
          );
        }

        return (
          <Form.Item
            name="orgId"
            label="所属组织"
            rules={createRules()}
          >
            <TreeSelect
              placeholder="请选择所属组织"
              showSearch
              treeDefaultExpandAll
              treeData={treeData}
              notFoundContent={orgTree && orgTree.length === 0 ? '暂无组织数据' : '请输入搜索内容'}
            />
          </Form.Item>
        );

      case 'entryDate':
        return (
          <Form.Item
            name="entryDate"
            label="入职日期"
            rules={createRules()}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        );

      case 'status':
        return (
          <Form.Item
            name="status"
            label="状态"
            rules={createRules()}
          >
            <Select placeholder="请选择状态">
              <Select.Option value="ACTIVE">在职</Select.Option>
              <Select.Option value="RESIGNED">离职</Select.Option>
            </Select>
          </Form.Item>
        );

      default:
        return null;
    }
  };

  // 渲染自定义字段
  const renderCustomField = (field: any) => {
    const commonProps = {
      label: field.name,
      name: ['customFields', field.code],
      rules: field.isRequired ? [{ required: true, message: `请输入${field.name}` }] : undefined,
    };

    switch (field.type) {
      case 'TEXT':
        return (
          <Form.Item {...commonProps} key={field.code}>
            <Input placeholder={`请输入${field.name}`} />
          </Form.Item>
        );

      case 'TEXTAREA':
        return (
          <Form.Item {...commonProps} key={field.code}>
            <Input.TextArea rows={4} placeholder={`请输入${field.name}`} />
          </Form.Item>
        );

      case 'NUMBER':
        return (
          <Form.Item {...commonProps} key={field.code}>
            <Input type="number" placeholder={`请输入${field.name}`} />
          </Form.Item>
        );

      case 'DATE':
        return (
          <Form.Item {...commonProps} key={field.code}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        );

      case 'SELECT_SINGLE':
        return (
          <Form.Item {...commonProps} key={field.code}>
            <Select placeholder={`请选择${field.name}`}>
              {getDropdownOptions(field.code).map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'SELECT_MULTI':
        return (
          <Form.Item {...commonProps} key={field.code}>
            <Select mode="multiple" placeholder={`请选择${field.name}`}>
              {getDropdownOptions(field.code).map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'LOOKUP':
        // LOOKUP 类型根据数据源类型选择不同的数据源
        // 如果数据源类型是组织，使用组织树
        if (field.dataSource?.type === 'ORG') {
          return (
            <Form.Item {...commonProps} key={field.code}>
              <TreeSelect
                placeholder={`请选择${field.name}`}
                showSearch
                treeDefaultExpandAll
                treeData={renderOrgTree(orgTree)}
              />
            </Form.Item>
          );
        }
        // 否则使用自定义数据源的选项
        return (
          <Form.Item {...commonProps} key={field.code}>
            <Select placeholder={`请选择${field.name}`}>
              {getDropdownOptions(field.code).map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      default:
        return null;
    }
  };

  // 渲染页签内容
  const renderTabContent = (tab: any) => {
    // 分离系统字段和自定义字段
    const systemFields = tab.fields?.filter((f: any) => f.fieldType === 'SYSTEM') || [];
    const tabCustomFields = tab.fields?.filter((f: any) => f.fieldType === 'CUSTOM') || [];

    return (
      <Row gutter={16}>
        {systemFields.map((field: any) => (
          <Col span={12} key={field.fieldCode}>
            {renderSystemField(field.fieldCode, field.isRequired)}
          </Col>
        ))}
        {tabCustomFields.map((field: any) => {
          const customFieldData = customFields?.find((cf: any) => cf.code === field.fieldCode);
          return (
            <Col span={12} key={field.fieldCode}>
              {customFieldData ? renderCustomField(customFieldData) : null}
            </Col>
          );
        })}
      </Row>
    );
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      console.log('表单原始值:', values);

      const formattedValues = {
        ...values,
        entryDate: values.entryDate ? values.entryDate.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]') : undefined,
        customFields: values.customFields ? JSON.stringify(values.customFields) : '{}',
      };

      console.log('格式化后的值:', formattedValues);

      // 移除创建时不允许的字段
      delete formattedValues.status;

      // 清理空字符串的可选字段
      if ('idCard' in formattedValues && !formattedValues.idCard) {
        delete formattedValues.idCard;
      }
      if ('phone' in formattedValues && !formattedValues.phone) {
        delete formattedValues.phone;
      }
      if ('email' in formattedValues && !formattedValues.email) {
        delete formattedValues.email;
      }

      console.log('最终发送的数据:', formattedValues);
      createMutation.mutate(formattedValues);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  if (tabsLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  const tabItems = (tabs || []).map((tab: any) => ({
    key: tab.code,
    label: tab.name,
    children: renderTabContent(tab),
  }));

  return (
    <div>
      <Card
        title={
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/hr/employees')}
          >
            新增人员
          </Button>
        }
        extra={
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSubmit}
            loading={createMutation.isPending}
          >
            保存
          </Button>
        }
      >
        <Form form={form} layout="vertical">
          <Tabs items={tabItems} />
        </Form>
      </Card>
    </div>
  );
};

export default EmployeeCreatePage;
