import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { useEffect } from 'react';
import dayjs from 'dayjs';

const EmployeeEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // 在组件加载时立即弹窗
  React.useEffect(() => {
    alert('EmployeeEditPage 组件已加载!!!');
  }, []);

  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => request.get(`/hr/employees/${id}`).then((res: any) => res),
    enabled: !!id,
  });

  const { data: orgTree, isLoading: orgTreeLoading, error: orgTreeError } = useQuery({
    queryKey: ['orgTree'],
    queryFn: () => request.get('/hr/organizations/tree').then((res: any) => {
      console.log('组织树数据:', res);
      return res;
    }),
  });

  const { data: tabs, isLoading: tabsLoading } = useQuery({
    queryKey: ['employeeInfoTabs'],
    queryFn: () => request.get('/hr/employee-info-tabs/for-display').then((res: any) => {
      console.log('=== tabs 数据加载完成 ===');
      console.log('tabs 数量:', res?.length || 0);
      const basicInfo = res?.find((t: any) => t.code === 'basic_info');
      if (basicInfo) {
        console.log('basic_info 页签存在');
        const allFields = [
          ...(basicInfo.fields || []),
          ...basicInfo.groups?.flatMap((g: any) => g.fields || []) || []
        ];
        console.log('basic_info 所有字段数量:', allFields.length);
        console.log('nation 字段:', allFields.find((f: any) => f.fieldCode === 'nation'));
        console.log('emergencyRelation 字段:', allFields.find((f: any) => f.fieldCode === 'emergencyRelation'));
      }
      return res || [];
    }),
  });

  const { data: dataSources } = useQuery({
    queryKey: ['dataSources'],
    queryFn: () => request.get('/hr/data-sources').then((res: any) => res || []),
  });

  const { data: customFields } = useQuery({
    queryKey: ['customFields'],
    queryFn: () => request.get('/hr/custom-fields').then((res: any) => res || []),
  });

  // 下拉类型的自定义字段
  const dropdownFields = customFields?.filter((f: any) =>
    f.type === 'SELECT_SINGLE' || f.type === 'SELECT_MULTI' || f.type === 'LOOKUP'
  ) || [];

  const updateMutation = useMutation({
    mutationFn: (data: any) => request.put(`/hr/employees/${id}`, data),
    onSuccess: () => {
      message.success('人员更新成功');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      navigate(`/hr/employees/${id}`);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '更新失败';
      message.error(errorMsg);
      console.error('更新人员失败:', error);
    },
  });

  // 当员工数据加载完成后，填充表单
  useEffect(() => {
    if (employee) {
      const customFieldsData = employee.customFields
        ? (typeof employee.customFields === 'string'
            ? JSON.parse(employee.customFields)
            : employee.customFields)
        : {};

      form.setFieldsValue({
        ...employee,
        orgId: employee.orgId,
        entryDate: employee.entryDate ? dayjs(employee.entryDate) : undefined,
        customFields: customFieldsData,
      });
    }
  }, [employee, form]);

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

  // 根据数据源代码获取选项（从 EmployeeCreatePage 复制）
  const getOptionsByDataSourceCode = (dataSourceCode: string) => {
    const dataSource = dataSources?.find((ds: any) => ds.code === dataSourceCode);
    if (!dataSource || !dataSource.options) {
      return [];
    }
    return dataSource.options
      .filter((opt: any) => opt.isActive)
      .map((opt: any) => ({
        id: opt.id,
        value: opt.value,
        label: opt.label,
      }));
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
    // 用 alert 调试
    if (fieldCode === 'nation') {
      alert(`renderSystemField 被调用! fieldCode: ${fieldCode}`);
    }

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
            <Input placeholder="请输入工号" disabled />
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

      case 'nation': {
        const nationOptions = getOptionsByDataSourceCode('nation');
        return (
          <Form.Item
            name="nation"
            label="民族"
            rules={createRules()}
          >
            <Select placeholder="请选择民族" allowClear showSearch>
              {nationOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );
      }

      case 'emergencyRelation': {
        const relationOptions = getOptionsByDataSourceCode('family_relation');
        return (
          <Form.Item
            name="emergencyRelation"
            label="紧急联系人关系"
            rules={createRules()}
          >
            <Select placeholder="请选择关系" allowClear showSearch>
              {relationOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );
      }

      case 'maritalStatus': {
        const maritalOptions = getOptionsByDataSourceCode('marital_status');
        return (
          <Form.Item
            name="maritalStatus"
            label="婚姻状况"
            rules={createRules()}
          >
            <Select placeholder="请选择婚姻状况" allowClear showSearch>
              {maritalOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );
      }

      case 'politicalStatus': {
        const politicalOptions = getOptionsByDataSourceCode('political_status');
        return (
          <Form.Item
            name="politicalStatus"
            label="政治面貌"
            rules={createRules()}
          >
            <Select placeholder="请选择政治面貌" allowClear showSearch>
              {politicalOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );
      }

      default:
        return null;
    }
  };

  // 渲染自定义字段
  const renderCustomField = (field: any) => {
    // 判断是否为系统字段的下拉选择（需要直接保存到 Employee 表，而不是 customFields）
    const isSystemDropdown = field.__isSystemField === true;

    const commonProps = {
      label: field.name,
      name: isSystemDropdown ? field.code : ['customFields', field.code],
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
        // 选项获取逻辑：
        // 1. 系统字段：直接使用 field.dataSource.options
        // 2. 自定义字段：使用 getDropdownOptions
        let options = [];
        if (isSystemDropdown && field.dataSource?.options) {
          // 系统字段：直接使用 dataSource.options
          options = field.dataSource.options;
        } else {
          // 自定义字段：使用 getDropdownOptions
          options = getDropdownOptions(field.code);
        }

        return (
          <Form.Item {...commonProps} key={field.code}>
            <Select placeholder={`请选择${field.name}`}>
              {options.map((option: any) => (
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
    // 收集所有字段（包括未分组的和分组内的）
    const allFields = [
      ...(tab.fields || []),
      ...tab.groups?.flatMap((g: any) => g.fields || []) || []
    ];

    // 分离系统字段和自定义字段
    const systemFields = allFields.filter((f: any) => f.fieldType === 'SYSTEM') || [];
    const tabCustomFields = allFields.filter((f: any) => f.fieldType === 'CUSTOM') || [];

    // 用 alert 调试
    if (tab.code === 'basic_info') {
      const nationField = systemFields.find((f: any) => f.fieldCode === 'nation');
      alert(`basic_info 页签渲染\nsystemFields 数量: ${systemFields.length}\nnation 字段存在: ${!!nationField}`);
      if (nationField) {
        alert(`nation 字段:\nfieldCode: ${nationField.fieldCode}\nfieldType: ${nationField.fieldType}\ntype: ${nationField.type}`);
      }
    }

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

      // 收集所有在 tabs 中配置的系统字段代码（包括分组内的字段）
      const configuredSystemFields = new Set<string>();
      (tabs || []).forEach((tab: any) => {
        // 未分组的字段
        tab.fields?.forEach((f: any) => {
          if (f.fieldType === 'SYSTEM' || f.type === 'SELECT_SINGLE' || f.type === 'SELECT_MULTI') {
            configuredSystemFields.add(f.fieldCode);
          }
        });
        // 分组内的字段
        tab.groups?.forEach((group: any) => {
          group.fields?.forEach((f: any) => {
            if (f.fieldType === 'SYSTEM' || f.type === 'SELECT_SINGLE' || f.type === 'SELECT_MULTI') {
              configuredSystemFields.add(f.fieldCode);
            }
          });
        });
      });

      console.log('配置的系统字段:', Array.from(configuredSystemFields));

      // 构建允许提交的字段
      const allowedFields: any = {
        customFields: values.customFields ? JSON.stringify(values.customFields) : '{}',
      };

      // 添加所有配置的系统字段
      configuredSystemFields.forEach((fieldCode: string) => {
        if (values[fieldCode] !== undefined) {
          allowedFields[fieldCode] = values[fieldCode];
        }
      });

      // 清理空字符串的可选字段
      Object.keys(allowedFields).forEach(key => {
        if (key !== 'customFields' && allowedFields[key] === '') {
          delete allowedFields[key];
        }
      });

      console.log('最终发送的数据:', allowedFields);
      updateMutation.mutate(allowedFields);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  if (employeeLoading || tabsLoading) {
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
            onClick={() => navigate(`/hr/employees/${id}`)}
          >
            编辑人员
          </Button>
        }
        extra={
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSubmit}
            loading={updateMutation.isPending}
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

export default EmployeeEditPage;
// Trigger reload
