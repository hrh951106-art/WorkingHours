import { useNavigate } from 'react-router-dom';
import {
  Card,
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
  Steps,
  Upload,
  Space,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined, LoadingOutlined, DeleteOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import request from '@/utils/request';
import type { UploadChangeParam, UploadFile, UploadProps } from 'antd';

const { Step } = Steps;

const EmployeeCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [photoFileList, setPhotoFileList] = useState<UploadFile[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);

  const { data: orgTree, isLoading: orgTreeLoading, error: orgTreeError } = useQuery({
    queryKey: ['orgTree'],
    queryFn: () => request.get('/hr/organizations/tree').then((res: any) => res),
  });

  const { data: tabs, isLoading: tabsLoading } = useQuery({
    queryKey: ['employeeInfoTabs'],
    queryFn: () => request.get('/hr/employee-info-tabs/for-display').then((res: any) => res || []),
  });

  const { data: customFields } = useQuery({
    queryKey: ['customFields'],
    queryFn: () => request.get('/hr/custom-fields').then((res: any) => res || []),
  });

  const { data: dataSources } = useQuery({
    queryKey: ['dataSources'],
    queryFn: () => request.get('/hr/data-sources').then((res: any) => res || []),
  });

  // 下拉类型的自定义字段
  const dropdownFields = customFields?.filter((f: any) =>
    f.type === 'SELECT_SINGLE' || f.type === 'SELECT_MULTI' || f.type === 'LOOKUP'
  ) || [];

  // 将数据库字段名映射到表单字段名（提取到组件级别，以便 handleNext 函数使用）
  const mapFieldName = (code: string): string => {
    const fieldMapping: Record<string, string> = {
      employee_no: 'employeeNo',
      id_card: 'idCard',
      org_id: 'orgId',
      job_level: 'jobLevel',
      employee_type: 'employeeType',
      work_location: 'workLocation',
      work_address: 'workAddress',
      entry_date: 'entryDate',
      hire_date: 'hireDate',
      probation_start: 'probationStart',
      probation_end: 'probationEnd',
      probation_months: 'probationMonths',
      birth_date: 'birthDate',
      native_place: 'nativePlace',
      marital_status: 'maritalStatus',
      political_status: 'politicalStatus',
      household_register: 'householdRegister',
      current_address: 'currentAddress',
      change_type: 'changeType',
      emergency_contact: 'emergencyContact',
      emergency_phone: 'emergencyPhone',
      emergency_relation: 'emergencyRelation',
      home_address: 'homeAddress',
      home_phone: 'homePhone',
      education_level: 'educationLevel',
      education_type: 'educationType',
      graduate_school: 'graduateSchool',
      graduation_date: 'graduationDate',
      degree_no: 'degreeNo',
      diploma_no: 'diplomaNo',
      exp_company: 'expCompany',
      exp_position: 'expPosition',
      exp_start: 'expStart',
      exp_end: 'expEnd',
      exp_salary: 'expSalary',
      exp_reason: 'expReason',
      exp_description: 'expDescription',
      member_name: 'memberName',
      member_relation: 'memberRelation',
      member_age: 'memberAge',
      member_work: 'memberWork',
      member_address: 'memberAddress',
      member_phone: 'memberPhone',
    };
    return fieldMapping[code] || code;
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => request.post('/hr/employees', data),
    onSuccess: (result: any) => {
      message.success('人员创建成功');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      // 跳转到新创建员工的详情页面
      if (result?.id) {
        navigate(`/hr/employees/${result.id}`);
      } else {
        navigate('/hr/employees');
      }
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

  // 根据数据源代码获取选项
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
  const renderSystemField = (fieldCode: string, fieldName: string, isRequired: boolean = false) => {
    // 字段标签映射 - 只在 fieldName 未提供时使用
    const getFieldLabel = (code: string, providedFieldName?: string) => {
      // 如果提供了 fieldName，直接使用
      if (providedFieldName) {
        return providedFieldName;
      }

      const labels: Record<string, string> = {
        employeeNo: '工号',
        name: '姓名',
        gender: '性别',
        idCard: '身份证号',
        phone: '手机号',
        mobile: '手机号码',
        email: '邮箱',
        orgId: '所属组织',
        changeType: '异动类型',
        position: '职位',
        jobLevel: '职级',
        employeeType: '员工类型',
        workLocation: '工作地点',
        workAddress: '办公地址',
        entryDate: '入职日期',
        hireDate: '受雇日期',
        probationStart: '试用期开始',
        probationEnd: '试用期结束',
        probationMonths: '试用期月数',
        effectiveDate: '异动生效日期',
        status: '状态',
        age: '年龄',
        birthDate: '出生日期',
        nativePlace: '籍贯',
        maritalStatus: '婚姻状况',
        politicalStatus: '政治面貌',
        householdRegister: '户口所在地',
        currentAddress: '现居住地址',
        photo: '照片',
        emergencyContact: '紧急联系人',
        emergencyPhone: '紧急联系电话',
        emergencyRelation: '紧急联系人关系',
        homeAddress: '家庭住址',
        homePhone: '家庭电话',
        educationLevel: '学历',
        educationType: '学历类型',
        graduateSchool: '毕业院校',
        major: '专业',
        graduationDate: '毕业日期',
        degreeNo: '学位证书号',
        diplomaNo: '毕业证书号',
        expCompany: '公司名称',
        expPosition: '职位',
        expStart: '开始日期',
        expEnd: '结束日期',
        expSalary: '薪资',
        expReason: '离职原因',
        expDescription: '工作描述',
        memberName: '家庭成员姓名',
        memberRelation: '关系',
        memberAge: '年龄',
        memberWork: '工作单位',
        memberAddress: '居住地址',
        memberPhone: '联系电话',
      };
      return labels[code] || code;
    };

    // 根据isRequired动态生成验证规则
    const createRules = (additionalRules: any[] = []) => {
      const baseRules = [...additionalRules];
      if (isRequired) {
        baseRules.unshift({ required: true, message: `请输入${getFieldLabel(fieldCode, fieldName)}` });
      }
      return baseRules.length > 0 ? baseRules : undefined;
    };

    switch (fieldCode) {
      case 'employeeNo':
      case 'employee_no':
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Input placeholder={`请输入${getFieldLabel(fieldCode, fieldName)}`} />
          </Form.Item>
        );

      case 'name':
        return (
          <Form.Item
            name="name"
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Input placeholder={`请输入${getFieldLabel(fieldCode, fieldName)}`} />
          </Form.Item>
        );

      case 'gender':
        const genderOptions = getOptionsByDataSourceCode('gender');
        return (
          <Form.Item
            name="gender"
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Select placeholder={`请选择${getFieldLabel(fieldCode, fieldName)}`}>
              {genderOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'idCard':
      case 'id_card':
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules([
              { pattern: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/, message: '请输入正确的身份证号' }
            ])}
          >
            <Input placeholder={`请输入${getFieldLabel(fieldCode, fieldName)}`} />
          </Form.Item>
        );

      case 'phone':
      case 'mobile':
        return (
          <Form.Item
            name="phone"
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules([
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
            ])}
          >
            <Input placeholder={`请输入${getFieldLabel(fieldCode, fieldName)}`} />
          </Form.Item>
        );

      case 'email':
        return (
          <Form.Item
            name="email"
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules([{ type: 'email', message: '请输入正确的邮箱地址' }])}
          >
            <Input placeholder={`请输入${getFieldLabel(fieldCode, fieldName)}`} />
          </Form.Item>
        );

      case 'orgId':
      case 'org_id':
        const treeData = renderOrgTree(orgTree || []);

        if (orgTreeLoading) {
          return (
            <Form.Item
              name={mapFieldName(fieldCode)}
              label={getFieldLabel(fieldCode, fieldName)}
              rules={createRules()}
            >
              <TreeSelect placeholder="加载组织数据中..." loading={true} disabled />
            </Form.Item>
          );
        }

        if (orgTreeError) {
          return (
            <Form.Item
              name={mapFieldName(fieldCode)}
              label={getFieldLabel(fieldCode, fieldName)}
              rules={createRules()}
            >
              <TreeSelect placeholder="组织数据加载失败" disabled />
            </Form.Item>
          );
        }

        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <TreeSelect
              placeholder={`请选择${getFieldLabel(fieldCode, fieldName)}`}
              showSearch
              treeDefaultExpandAll
              treeData={treeData}
              notFoundContent={orgTree && orgTree.length === 0 ? '暂无组织数据' : '请输入搜索内容'}
            />
          </Form.Item>
        );

      case 'entryDate':
      case 'entry_date':
      case 'hireDate':
      case 'hire_date':
      case 'birthDate':
      case 'birth_date':
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <DatePicker
              style={{ width: '100%' }}
              onChange={(date) => {
                if (date) {
                  // 计算年龄
                  const today = new Date();
                  const birthDate = date.toDate();
                  let age = today.getFullYear() - birthDate.getFullYear();
                  const monthDiff = today.getMonth() - birthDate.getMonth();
                  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                  }
                  // 更新年龄字段
                  form.setFieldValue('age', age);
                } else {
                  form.setFieldValue('age', undefined);
                }
              }}
            />
          </Form.Item>
        );

      case 'probationStart':
      case 'probation_start':
      case 'probationEnd':
      case 'probation_end':
      case 'graduationDate':
      case 'graduation_date':
      case 'expStart':
      case 'exp_start':
      case 'expEnd':
      case 'exp_end':
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        );

      case 'status':
        return (
          <Form.Item
            name="status"
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Select placeholder={`请选择${getFieldLabel(fieldCode, fieldName)}`}>
              <Select.Option value="ACTIVE">在职</Select.Option>
              <Select.Option value="RESIGNED">离职</Select.Option>
            </Select>
          </Form.Item>
        );

      case 'age':
        return (
          <Form.Item
            name="age"
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules([{ type: 'number', min: 0, max: 150, message: '请输入有效的年龄' }])}
          >
            <Input type="number" placeholder={`请输入${getFieldLabel(fieldCode, fieldName)}`} />
          </Form.Item>
        );

      case 'nativePlace':
      case 'native_place':
      case 'currentAddress':
      case 'current_address':
      case 'workLocation':
      case 'work_location':
      case 'workAddress':
      case 'work_address':
      case 'householdRegister':
      case 'household_register':
      case 'homeAddress':
      case 'home_address':
      case 'memberAddress':
      case 'member_address':
      case 'graduateSchool':
      case 'graduate_school':
      case 'major':
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Input placeholder={`请输入${getFieldLabel(fieldCode, fieldName)}`} />
          </Form.Item>
        );

      case 'maritalStatus':
      case 'marital_status':
        const maritalStatusOptions = getOptionsByDataSourceCode('marital_status');
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Select placeholder={`请选择${getFieldLabel(fieldCode, fieldName)}`}>
              {maritalStatusOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'politicalStatus':
      case 'political_status':
        const politicalStatusOptions = getOptionsByDataSourceCode('political_status');
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Select placeholder={`请选择${getFieldLabel(fieldCode, fieldName)}`}>
              {politicalStatusOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'emergencyContact':
      case 'emergency_contact':
      case 'emergencyPhone':
      case 'emergency_phone':
      case 'homePhone':
      case 'home_phone':
      case 'memberPhone':
      case 'member_phone':
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Input placeholder={`请输入${getFieldLabel(fieldCode, fieldName)}`} />
          </Form.Item>
        );

      case 'emergencyRelation':
      case 'emergency_relation':
        const emergencyRelationOptions = getOptionsByDataSourceCode('family_relation');
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Select placeholder={`请选择${getFieldLabel(fieldCode, fieldName)}`}>
              {emergencyRelationOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'memberRelation':
      case 'member_relation':
        const memberRelationOptions = getOptionsByDataSourceCode('family_relation');
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Select placeholder={`请选择${getFieldLabel(fieldCode, fieldName)}`}>
              {memberRelationOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'position':
        const positionOptions = getOptionsByDataSourceCode('POSITION');
        return (
          <Form.Item
            name="position"
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Select placeholder={`请选择${getFieldLabel(fieldCode, fieldName)}`} allowClear showSearch>
              {positionOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'jobLevel':
      case 'job_level':
        const jobLevelOptions = getOptionsByDataSourceCode('JOB_LEVEL');
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Select placeholder={`请选择${getFieldLabel(fieldCode, fieldName)}`} allowClear showSearch>
              {jobLevelOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'employeeType':
      case 'employee_type':
        const employeeTypeOptions = getOptionsByDataSourceCode('EMPLOYEE_TYPE');
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Select placeholder={`请选择${getFieldLabel(fieldCode, fieldName)}`} allowClear showSearch>
              {employeeTypeOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'deptId':
      case 'dept_id':
        // 所属部门字段不显示
        return null;

      case 'changeType':
      case 'change_type':
        // 异动类型从数据源获取选项
        const changeTypeOptions = getOptionsByDataSourceCode('change_type');
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Select placeholder={`请选择${getFieldLabel(fieldCode, fieldName)}`}>
              {changeTypeOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'educationLevel':
      case 'education_level':
        const educationLevelOptions = getOptionsByDataSourceCode('education_level');
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Select placeholder={`请选择${getFieldLabel(fieldCode, fieldName)}`}>
              {educationLevelOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'educationType':
      case 'education_type':
        const educationTypeOptions = getOptionsByDataSourceCode('education_type');
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Select placeholder={`请选择${getFieldLabel(fieldCode, fieldName)}`}>
              {educationTypeOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'degreeNo':
      case 'degree_no':
      case 'diplomaNo':
      case 'diploma_no':
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Input placeholder={`请输入${getFieldLabel(fieldCode, fieldName)}`} />
          </Form.Item>
        );

      case 'expCompany':
      case 'exp_company':
      case 'expPosition':
      case 'exp_position':
      case 'memberWork':
      case 'member_work':
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Input placeholder={`请输入${getFieldLabel(fieldCode, fieldName)}`} />
          </Form.Item>
        );

      case 'expSalary':
      case 'exp_salary':
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Input type="number" placeholder={`请输入${getFieldLabel(fieldCode, fieldName)}`} />
          </Form.Item>
        );

      case 'expReason':
      case 'exp_reason':
      case 'expDescription':
      case 'exp_description':
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Input.TextArea rows={3} placeholder={`请输入${getFieldLabel(fieldCode, fieldName)}`} />
          </Form.Item>
        );

      case 'memberName':
      case 'member_name':
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Input placeholder={`请输入${getFieldLabel(fieldCode, fieldName)}`} />
          </Form.Item>
        );

      case 'memberAge':
      case 'member_age':
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules([{ type: 'number', min: 0, max: 150, message: '请输入有效的年龄' }])}
          >
            <Input type="number" placeholder={`请输入${getFieldLabel(fieldCode, fieldName)}`} />
          </Form.Item>
        );

      case 'probationMonths':
      case 'probation_months':
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules([{ type: 'number', min: 0, max: 120, message: '请输入有效的月数' }])}
          >
            <Input type="number" placeholder={`请输入${getFieldLabel(fieldCode, fieldName)}`} />
          </Form.Item>
        );

      case 'nation':
        const nationOptions = getOptionsByDataSourceCode('nation');
        return (
          <Form.Item
            name="nation"
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Select placeholder={`请选择${getFieldLabel(fieldCode, fieldName)}`} allowClear showSearch>
              {nationOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'photo':
        const uploadButton = (
          <button
            style={{
              border: 0,
              background: 'none',
              cursor: 'pointer',
              width: 128,
              height: 128,
            }}
            type="button"
          >
            {photoUploading ? (
              <LoadingOutlined style={{ fontSize: 32, color: '#22B970' }} />
            ) : (
              <PlusOutlined style={{ fontSize: 32, color: '#999' }} />
            )}
            <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>上传照片</div>
          </button>
        );

        const handlePhotoChange: UploadProps['onChange'] = (info: UploadChangeParam<UploadFile>) => {
          setPhotoFileList(info.fileList.slice(-1)); // 只保留最新的一张图片
          if (info.file.status === 'done') {
            const imageUrl = info.file.response?.url || info.file.response?.data?.url;
            if (imageUrl) {
              form.setFieldValue('photo', imageUrl);
              message.success('照片上传成功');
            }
          } else if (info.file.status === 'error') {
            message.error('图片上传失败');
          }
        };

        const uploadProps: UploadProps = {
          name: 'file',
          listType: 'picture-card',
          fileList: photoFileList,
          className: 'avatar-uploader',
          showUploadList: {
            showPreviewIcon: true,
            showRemoveIcon: true,
          },
          onChange: handlePhotoChange,
          beforeUpload: (file) => {
            const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/jpg';
            if (!isJpgOrPng) {
              message.error('只能上传 JPG/PNG 格式的图片!');
              return Upload.LIST_IGNORE;
            }
            const isLt2M = file.size / 1024 / 1024 < 2;
            if (!isLt2M) {
              message.error('图片大小不能超过 2MB!');
              return Upload.LIST_IGNORE;
            }
            setPhotoUploading(true);
            return true;
          },
          customRequest: async (options) => {
            const { file, onSuccess, onError } = options;

            try {
              // 转换为 base64 格式存储
              const reader = new FileReader();
              reader.onload = (e) => {
                const base64 = e.target?.result as string;
                onSuccess?.({ url: base64 } as any, new XMLHttpRequest());
                setPhotoUploading(false);
              };
              reader.onerror = () => {
                onError?.(new Error('文件读取失败'));
                setPhotoUploading(false);
              };
              reader.readAsDataURL(file as File);
            } catch (error) {
              onError?.(error as Error);
              setPhotoUploading(false);
            }
          },
          onRemove: () => {
            setPhotoFileList([]);
            form.setFieldValue('photo', undefined);
          },
        };

        return (
          <Form.Item
            name="photo"
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Upload {...uploadProps}>
              {photoFileList.length === 0 && uploadButton}
            </Upload>
          </Form.Item>
        );

      default:
        // 对于未知的字段，返回一个通用的文本输入框
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={getFieldLabel(fieldCode, fieldName)}
            rules={createRules()}
          >
            <Input placeholder={`请输入${getFieldLabel(fieldCode, fieldName)}`} />
          </Form.Item>
        );
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

  // 渲染动态列表页签（学历、工作经历、家庭成员）
  const renderDynamicListTab = (tab: any) => {
    // 获取列表字段名称
    const getListName = () => {
      switch (tab.code) {
        case 'education_info': return 'educations';
        case 'work_experience': return 'workExperiences';
        case 'family_info': return 'familyMembers';
        default: return 'items';
      }
    };

    const listName = getListName();

    // 只收集启用分组中的字段
    const fields = tab.groups
      ?.filter((g: any) => g.status === 'ACTIVE')  // 过滤掉禁用的分组
      .flatMap((g: any) => g.fields?.filter((f: any) => !f.isHidden) || []) || [];

    if (fields.length === 0) {
      return <div>该页签暂无可填字段（所有分组已禁用或无可用字段）</div>;
    }

    return (
      <div>
        <Form.List name={listName}>
          {(fieldsList, { add, remove }) => (
            <>
              {fieldsList.map(({ key, name, ...restField }) => (
                <Card
                  key={key}
                  size="small"
                  style={{ marginBottom: 16 }}
                  extra={
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(name)}
                    >
                      删除
                    </Button>
                  }
                >
                  <Row gutter={16}>
                    {fields.map((field: any) => (
                      <Col span={12} key={`${key}-${field.fieldCode}`}>
                        <Form.Item
                          {...restField}
                          name={[name, field.fieldCode]}
                          label={field.fieldName}
                          rules={field.isRequired ? [{ required: true, message: `请输入${field.fieldName}` }] : undefined}
                        >
                          {renderDynamicListField(field)}
                        </Form.Item>
                      </Col>
                    ))}
                  </Row>
                </Card>
              ))}
              <Button
                type="dashed"
                onClick={() => add()}
                block
                icon={<PlusOutlined />}
                style={{ marginBottom: 16 }}
              >
                添加{tab.name.replace('信息', '')}
              </Button>
            </>
          )}
        </Form.List>
      </div>
    );
  };

  // 渲染动态列表中的字段
  const renderDynamicListField = (field: any) => {
    const fieldCode = field.fieldCode;
    const fieldName = field.fieldName;
    const isRequired = field.isRequired;

    // 使用与 renderSystemField 相同的映射逻辑
    const mappedFieldName = mapFieldName(fieldCode);
    const fieldLabel = fieldName || mappedFieldName;

    // 创建验证规则
    const createRules = (additionalRules: any[] = []) => {
      const baseRules = [...additionalRules];
      if (isRequired) {
        baseRules.unshift({ required: true, message: `请输入${fieldLabel}` });
      }
      return baseRules.length > 0 ? baseRules : undefined;
    };

    // 根据字段类型返回不同的控件
    switch (fieldCode) {
      // 日期字段（同时支持驼峰和下划线格式）
      case 'startDate':
      case 'end_date':
      case 'endDate':
      case 'probationStart':
      case 'probation_start':
      case 'probationEnd':
      case 'probation_end':
      case 'graduationDate':
      case 'graduation_date':
      case 'birthDate':
      case 'birth_date':
      case 'entryDate':
      case 'entry_date':
      case 'expStart':
      case 'exp_start':
      case 'expEnd':
      case 'exp_end':
        return (
          <DatePicker style={{ width: '100%' }} placeholder={`请选择${fieldLabel}`} />
        );

      // 学历等级
      case 'educationLevel':
      case 'education_level':
        const educationLevelOptions = getOptionsByDataSourceCode('education_level');
        return (
          <Select placeholder={`请选择${fieldLabel}`}>
            {educationLevelOptions.map((option: any) => (
              <Select.Option key={option.id} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        );

      // 学历类型
      case 'educationType':
      case 'education_type':
        const educationTypeOptions = getOptionsByDataSourceCode('education_type');
        return (
          <Select placeholder={`请选择${fieldLabel}`}>
            {educationTypeOptions.map((option: any) => (
              <Select.Option key={option.id} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        );

      // 关系字段
      case 'relationship':
      case 'memberRelation':
      case 'member_relation':
      case 'emergencyRelation':
      case 'emergency_relation':
        const relationOptions = getOptionsByDataSourceCode('family_relation');
        return (
          <Select placeholder={`请选择${fieldLabel}`}>
            {relationOptions.map((option: any) => (
              <Select.Option key={option.id} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        );

      // 性别
      case 'gender':
        const genderOptions = getOptionsByDataSourceCode('gender');
        return (
          <Select placeholder={`请选择${fieldLabel}`}>
            {genderOptions.map((option: any) => (
              <Select.Option key={option.id} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        );

      // 婚姻状况
      case 'maritalStatus':
      case 'marital_status':
        const maritalStatusOptions = getOptionsByDataSourceCode('marital_status');
        return (
          <Select placeholder={`请选择${fieldLabel}`}>
            {maritalStatusOptions.map((option: any) => (
              <Select.Option key={option.id} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        );

      // 政治面貌
      case 'politicalStatus':
      case 'political_status':
        const politicalStatusOptions = getOptionsByDataSourceCode('political_status');
        return (
          <Select placeholder={`请选择${fieldLabel}`}>
            {politicalStatusOptions.map((option: any) => (
              <Select.Option key={option.id} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        );

      // 是否最高学历
      case 'isHighest':
        return (
          <Select placeholder={`请选择${fieldLabel}`}>
            <Select.Option value={true}>是</Select.Option>
            <Select.Option value={false}>否</Select.Option>
          </Select>
        );

      // 多行文本字段
      case 'description':
      case 'exp_description':
        return <Input.TextArea rows={3} placeholder={`请输入${fieldLabel}`} />;

      // 数字字段
      case 'expSalary':
      case 'exp_salary':
        return <Input type="number" placeholder={`请输入${fieldLabel}`} />;

      // 默认文本输入
      default:
        return <Input placeholder={`请输入${fieldLabel}`} />;
    }
  };

  // 根据字段名获取选项
  const getOptionsByFieldName = (fieldName: string) => {
    const dataSourceMap: Record<string, string> = {
      gender: 'gender',
      politicalStatus: 'political_status',
      maritalStatus: 'marital_status',
      educationLevel: 'education_level',
      educationType: 'education_type',
      memberRelation: 'family_relation',
    };

    const dataSourceCode = dataSourceMap[fieldName];
    if (!dataSourceCode) return [];

    return getOptionsByDataSourceCode(dataSourceCode);
  };

  // 渲染步骤内容
  const renderStepContent = (tab: any) => {
    if (!tab.groups || tab.groups.length === 0) {
      return <div>该页签暂无分组配置</div>;
    }

    // 特殊处理：学历信息、工作经历、家庭信息页签
    if (tab.code === 'education_info' || tab.code === 'work_experience' || tab.code === 'family_info') {
      return renderDynamicListTab(tab);
    }

    return (
      <div>
        {tab.groups.map((group: any) => {
          // 只显示启用的分组
          if (group.status === 'INACTIVE') {
            return null;
          }

          // 过滤掉隐藏的字段（包含SYSTEM、SELECT_SINGLE、SELECT_MULTI类型）
          const systemFields = group.fields?.filter((f: any) =>
            (f.fieldType === 'SYSTEM' || f.fieldType === 'SELECT_SINGLE' || f.fieldType === 'SELECT_MULTI') && !f.isHidden
          ) || [];
          const groupCustomFields = group.fields?.filter((f: any) =>
            f.fieldType === 'CUSTOM' && !f.isHidden
          ) || [];

          // 如果分组内没有可见字段，不显示该分组
          if (systemFields.length === 0 && groupCustomFields.length === 0) {
            return null;
          }

          return (
            <Card
              key={group.id}
              title={group.name}
              style={{ marginBottom: 16 }}
              size="small"
            >
              <Row gutter={16}>
                {systemFields.map((field: any) => (
                  <Col span={12} key={field.fieldCode}>
                    {renderSystemField(field.fieldCode, field.fieldName, field.isRequired)}
                  </Col>
                ))}
                {groupCustomFields.map((field: any) => {
                  const customFieldData = customFields?.find((cf: any) => cf.code === field.fieldCode);
                  // 合并字段配置：使用页签配置中的 isRequired，而不是全局配置
                  const mergedField = {
                    ...customFieldData,
                    isRequired: field.isRequired, // 使用页签配置中的必填设置
                  };
                  return (
                    <Col span={12} key={field.fieldCode}>
                      {mergedField ? renderCustomField(mergedField) : null}
                    </Col>
                  );
                })}
              </Row>
            </Card>
          );
        })}
      </div>
    );
  };


  const handleSubmit = async () => {
    try {
      // 收集所有页签的必填字段进行验证
      const allFieldsToValidate: any[] = [];

      (tabs || []).forEach((tab: any) => {
        // 学历信息、工作经历、家庭信息页签在创建时是可选的，跳过验证
        if (tab.code === 'education_info' || tab.code === 'work_experience' || tab.code === 'family_info') {
          return;
        }

        tab.groups?.forEach((group: any) => {
          if (group.status === 'INACTIVE') return;

          const requiredSystemFields = group.fields?.filter((f: any) =>
            (f.fieldType === 'SYSTEM' || f.fieldType === 'SELECT_SINGLE' || f.fieldType === 'SELECT_MULTI') && !f.isHidden && f.isRequired
          ) || [];
          const requiredCustomFields = group.fields?.filter((f: any) =>
            f.fieldType === 'CUSTOM' && !f.isHidden && f.isRequired
          ) || [];

          allFieldsToValidate.push(
            ...requiredSystemFields.map((f: any) => ({ ...f, fieldType: 'SYSTEM' })),
            ...requiredCustomFields.map((f: any) => ({ ...f, fieldType: 'CUSTOM' }))
          );
        });
      });

      // 构建验证字段列表
      const fieldsToValidate = allFieldsToValidate.map((field: any) => {
        if (field.fieldType === 'SYSTEM') {
          return mapFieldName(field.fieldCode);
        } else {
          return ['customFields', field.fieldCode];
        }
      });

      // 执行验证并获取表单值
      let values;
      if (fieldsToValidate.length > 0) {
        // validateFields 返回验证通过的值
        values = await form.validateFields(fieldsToValidate);
        // 获取所有表单字段的值（不只是验证的字段）
        const allValues = await form.getFieldsValue();
        // 合并：使用 validateFields 返回的必填字段值，加上其他所有字段的值
        values = { ...allValues, ...values };
      } else {
        values = await form.getFieldsValue();
      }

      // 提交所有显示的字段，不做限制
      const formattedValues: any = {};

      // 收集所有在配置中的系统字段代码（用于判断是否为必填字段）
      const configuredSystemFields = new Set<string>();
      (tabs || []).forEach((tab: any) => {
        tab.groups?.forEach((group: any) => {
          if (group.status === 'INACTIVE') return;
          group.fields?.filter((f: any) => (f.fieldType === 'SYSTEM' || f.fieldType === 'SELECT_SINGLE' || f.fieldType === 'SELECT_MULTI') && !f.isHidden)
            .forEach((f: any) => {
              // 同时添加下划线命名和驼峰命名
              configuredSystemFields.add(f.fieldCode);
              const camelCase = mapFieldName(f.fieldCode);
              if (camelCase !== f.fieldCode) {
                configuredSystemFields.add(camelCase);
              }
            });
        });
      });

      // 处理所有表单字段
      Object.keys(values).forEach(key => {
        const value = values[key];

        // 跳过 status 字段（创建时不需要）
        if (key === 'status') return;

        // 将下划线命名字段转换为驼峰命名（后端期望驼峰命名）
        const camelCaseKey = mapFieldName(key);

        // 检查是否为配置中的字段（需要同时检查驼峰和下划线命名）
        const isConfiguredField = configuredSystemFields.has(key) || configuredSystemFields.has(camelCaseKey);

        // 处理日期字段
        if (value && typeof value === 'object' && value.format) {
          // DatePicker 或 TimePicker 对象，格式化为 ISO 8601 格式
          formattedValues[camelCaseKey] = value.format('YYYY-MM-DD');
        }
        // 处理 customFields
        else if (key === 'customFields') {
          if (value && Object.keys(value).length > 0) {
            formattedValues.customFields = JSON.stringify(value);
          } else {
            formattedValues.customFields = '{}';
          }
        }
        // 处理数组字段（educations, workExperiences, familyMembers）
        else if (Array.isArray(value)) {
          // 处理数组中的每一项，格式化日期字段
          const formattedArray = value.map((item: any) => {
            if (!item || typeof item !== 'object') return item;

            const formattedItem: any = {};
            Object.keys(item).forEach(itemKey => {
              const itemValue = item[itemKey];

              // 将数组项中的下划线命名也转换为驼峰命名
              const camelCaseItemKey = mapFieldName(itemKey);

              // 格式化日期字段为 ISO 8601 格式
              if (itemValue && typeof itemValue === 'object' && itemValue.format) {
                formattedItem[camelCaseItemKey] = itemValue.format('YYYY-MM-DD');
              } else if (itemValue !== undefined && itemValue !== null) {
                // 只保留有值的字段，不发送 undefined 和 null
                formattedItem[camelCaseItemKey] = itemValue;
              }
            });

            return formattedItem;
          });

          // 只发送非空数组
          if (formattedArray.length > 0) {
            formattedValues[camelCaseKey] = formattedArray;
          }
        }
        // 处理其他字段
        else if (value !== undefined && value !== null) {
          // 对于配置中的字段，即使值为空字符串也发送（让后端处理验证）
          // 对于未配置的字段，只在有值时发送
          if (isConfiguredField || value !== '') {
            formattedValues[camelCaseKey] = value;
          }
        }
      });

      createMutation.mutate(formattedValues);
    } catch (error) {
      console.error('表单验证失败:', error);
      console.error('错误详情:', error.errorFields);
    }
  };

  // 处理下一步
  const handleNext = async () => {
    try {
      // 验证当前步骤的字段
      const currentTab = tabs?.[currentStep];
      if (!currentTab) return;

      // 获取当前页签所有分组中的字段
      const allSystemFields: any[] = [];
      const allCustomFieldCodes: string[] = [];

      currentTab.groups?.forEach((group: any) => {
        if (group.status === 'INACTIVE') return;

        const systemFields = group.fields?.filter((f: any) =>
          (f.fieldType === 'SYSTEM' || f.fieldType === 'SELECT_SINGLE' || f.fieldType === 'SELECT_MULTI') && !f.isHidden && f.isRequired
        ) || [];
        const customFieldCodes = group.fields?.filter((f: any) =>
          f.fieldType === 'CUSTOM' && !f.isHidden && f.isRequired
        ).map((f: any) => f.fieldCode) || [];

        allSystemFields.push(...systemFields);
        allCustomFieldCodes.push(...customFieldCodes);
      });

      // 构建当前步骤需要验证的字段列表
      const fieldsToValidate = [
        ...allSystemFields.map((f: any) => mapFieldName(f.fieldCode)),
        ...allCustomFieldCodes.map((code: string) => ['customFields', code])
      ];

      if (fieldsToValidate.length > 0) {
        await form.validateFields(fieldsToValidate);
      }

      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error('步骤验证失败:', error);
      console.error('错误详情:', error.errorFields);
      message.warning('请完成当前步骤的必填项');
    }
  };

  // 处理上一步
  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  if (tabsLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  const steps = (tabs || []).map((tab: any) => ({
    title: tab.name,
  }));

  // 获取下一步按钮文本和动作
  const getNextButtonInfo = () => {
    if (currentStep < (tabs || []).length - 1) {
      return { text: '下一步', action: handleNext };
    } else {
      return {
        text: '提交保存',
        action: handleSubmit,
        loading: createMutation.isPending,
        icon: <SaveOutlined />
      };
    }
  };

  const nextButtonInfo = getNextButtonInfo();

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
          <div style={{ display: 'flex', gap: '8px' }}>
            {currentStep > 0 && (
              <Button onClick={handlePrev}>
                上一步
              </Button>
            )}
            <Button
              type="primary"
              icon={nextButtonInfo.icon}
              onClick={nextButtonInfo.action}
              loading={nextButtonInfo.loading}
            >
              {nextButtonInfo.text}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', minHeight: '600px' }}>
          {/* 左侧步骤条 */}
          <div style={{
            width: '280px',
            paddingRight: '24px',
            borderRight: '1px solid #f0f0f0',
            position: 'relative'
          }}>
            {/* 步骤项容器 */}
            <div style={{ position: 'relative', marginTop: '16px' }}>
              {steps.map((step, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (index <= currentStep || index === currentStep + 1) {
                      setCurrentStep(index);
                    }
                  }}
                  style={{
                    marginBottom: '80px',
                    cursor: index <= currentStep || index === currentStep + 1 ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    position: 'relative'
                  }}
                >
                  {/* 连接线 - 只在非最后一个步骤显示，在两个圆点之间居中 */}
                  {index < steps.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      left: '11px',
                      top: '24px',
                      width: '2px',
                      height: '80px',
                      background: index < currentStep ? '#22B970' : '#e2e8f0',
                      zIndex: 0
                    }} />
                  )}

                  {/* 圆点 */}
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: index < currentStep ? '#22B970' : index === currentStep ? '#22B970' : '#fff',
                    border: `2px solid ${index <= currentStep ? '#22B970' : '#e2e8f0'}`,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    color: '#fff',
                    fontWeight: index === currentStep ? 'bold' : 'normal',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    {index < currentStep && '✓'}
                  </div>
                  {/* 标题 */}
                  <span style={{
                    fontSize: '14px',
                    color: index <= currentStep ? '#22B970' : '#64748b',
                    fontWeight: index === currentStep ? 'bold' : 'normal',
                    paddingTop: '2px'
                  }}>
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧内容区域 */}
          <div style={{ flex: 1, paddingLeft: '24px' }}>
            <Form form={form} layout="vertical">
              {renderStepContent((tabs || [])[currentStep])}
            </Form>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EmployeeCreatePage;
