import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Button,
  Descriptions,
  Table,
  Tag,
  Space,
  message,
  Row,
  Col,
  Modal,
  DatePicker,
  Select,
  Form,
  Input,
  InputNumber,
  TreeSelect,
  Spin,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  HistoryOutlined,
  SaveOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import dayjs from 'dayjs';

const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('info');
  const [selectedWorkInfoVersion, setSelectedWorkInfoVersion] = useState<string | undefined>('current');
  const [editingTabCode, setEditingTabCode] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState<any>(null);
  const [isCreatingNewVersion, setIsCreatingNewVersion] = useState(false);
  const [editingWorkInfoHistoryId, setEditingWorkInfoHistoryId] = useState<number | null>(null);
  const [form] = Form.useForm();

  // 子表编辑状态
  const [editingSubRecord, setEditingSubRecord] = useState<any>(null);
  const [subRecordModalVisible, setSubRecordModalVisible] = useState(false);
  const [subRecordType, setSubRecordType] = useState<'education' | 'workExperience' | 'familyMember' | null>(null);
  const queryClient = useQueryClient();

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => request.get(`/hr/employees/${id}`).then((res: any) => res),
    enabled: !!id && id !== 'new',
  });

  const { data: accounts } = useQuery({
    queryKey: ['employeeAccounts', id],
    queryFn: () => request.get(`/hr/employees/${id}/accounts`).then((res: any) => res),
    enabled: !!id && id !== 'new',
  });

  // 重新生成账户的mutation
  const regenerateAccountsMutation = useMutation({
    mutationFn: () => {
      return request.post(`/hr/employees/${id}/accounts/regenerate`);
    },
    onSuccess: () => {
      message.success('重新生成账户成功');
      queryClient.invalidateQueries({ queryKey: ['employeeAccounts', id] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '重新生成账户失败';
      message.error(errorMsg);
      console.error('重新生成账户失败:', error);
    },
  });

  const handleRegenerateAccounts = () => {
    Modal.confirm({
      title: '确认重新生成账户',
      content: '重新生成账户将停用员工原有的所有账户，并根据当前配置创建新账户。是否继续？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        regenerateAccountsMutation.mutate();
      },
    });
  };

  const { data: infoTabs } = useQuery({
    queryKey: ['employeeInfoTabs'],
    queryFn: () => request.get('/hr/employee-info-tabs/for-display').then((res: any) => res),
  });

  // 设置默认激活第一个页签
  useEffect(() => {
    if (infoTabs && infoTabs.length > 0 && activeTab === 'info') {
      setActiveTab(infoTabs[0].code);
    }
  }, [infoTabs]);

  const { data: customFields } = useQuery({
    queryKey: ['customFields'],
    queryFn: () => request.get('/hr/custom-fields').then((res: any) => res || []),
  });

  const { data: dataSources } = useQuery({
    queryKey: ['dataSources'],
    queryFn: () => request.get('/hr/data-sources').then((res: any) => res || []),
  });

  const { data: orgTree } = useQuery({
    queryKey: ['orgTree'],
    queryFn: () => request.get('/hr/organizations/tree').then((res: any) => res || []),
  });

  // 获取员工的工作信息版本列表
  const { data: workInfoVersions = [] } = useQuery({
    queryKey: ['workInfoVersions', id],
    queryFn: () => request.get(`/hr/employees/${id}/work-info-versions`).then((res: any) => res || []),
    enabled: !!id && id !== 'new',
  });

  // 获取指定版本的工作信息
  const { data: currentWorkInfo, refetch: refetchWorkInfo } = useQuery({
    queryKey: ['workInfo', id, selectedWorkInfoVersion],
    queryFn: () => {
      const version = selectedWorkInfoVersion || 'current';
      return request.get(`/hr/employees/${id}/work-info/${version}`).then((res: any) => res);
    },
    enabled: !!id && id !== 'new',
  });

  // 获取学历列表
  const { data: educations, refetch: refetchEducations } = useQuery({
    queryKey: ['educations', id],
    queryFn: () => request.get(`/hr/employees/${id}/educations`).then((res: any) => res || []),
    enabled: !!id && id !== 'new',
  });

  // 获取工作经历列表
  const { data: workExperiences, refetch: refetchWorkExperiences } = useQuery({
    queryKey: ['workExperiences', id],
    queryFn: () => request.get(`/hr/employees/${id}/work-experiences`).then((res: any) => res || []),
    enabled: !!id && id !== 'new',
  });

  // 获取家庭成员列表
  const { data: familyMembers, refetch: refetchFamilyMembers } = useQuery({
    queryKey: ['familyMembers', id],
    queryFn: () => request.get(`/hr/employees/${id}/family-members`).then((res: any) => res || []),
    enabled: !!id && id !== 'new',
  });

  // 更新员工信息
  const updateEmployeeMutation = useMutation({
    mutationFn: (data: any) => request.put(`/hr/employees/${id}`, data),
    onSuccess: async () => {
      message.success('保存成功');

      // 先退出编辑模式
      setEditingTabCode(null);

      // 立即重新获取所有相关数据
      await queryClient.refetchQueries({ queryKey: ['employee', id] });

      // 清空表单
      form.resetFields();
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '保存失败';
      message.error(errorMsg);
      console.error('保存失败:', error);
    },
  });

  // 创建新版本的工作信息
  const createWorkInfoVersionMutation = useMutation({
    mutationFn: (data: any) => request.post(`/hr/employees/${id}/work-info-versions`, data),
    onSuccess: async () => {
      message.success('新版本创建成功');

      // 立即重新获取所有相关数据
      await queryClient.refetchQueries({ queryKey: ['employee', id] });
      await queryClient.refetchQueries({ queryKey: ['workInfoVersions', id] });
      await queryClient.refetchQueries({ queryKey: ['workInfo', id] });

      setEditingTabCode(null);
      form.resetFields();
      setEditModalVisible(false);
      setEffectiveDate(null);
      // 切换回查看当前版本
      setSelectedWorkInfoVersion('current');
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '创建失败';
      message.error(errorMsg);
      console.error('创建版本失败:', error);
    },
  });

  // 更新当前工作信息
  const updateWorkInfoMutation = useMutation({
    mutationFn: (data: any) => request.put(`/hr/employees/${id}/work-info/current`, data),
    onSuccess: async () => {
      message.success('保存成功');

      // 立即重新获取所有相关数据
      await queryClient.refetchQueries({ queryKey: ['employee', id] });
      await queryClient.refetchQueries({ queryKey: ['workInfo', id, 'current'] });
      await queryClient.refetchQueries({ queryKey: ['workInfoVersions', id] });

      setEditingTabCode(null);
      form.resetFields();
      // 确保显示当前版本
      setSelectedWorkInfoVersion('current');
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '保存失败';
      message.error(errorMsg);
      console.error('保存失败:', error);
    },
  });

  // 更新指定的工作信息历史记录（用于更正历史版本）
  const updateWorkInfoHistoryMutation = useMutation({
    mutationFn: ({ historyId, data }: { historyId: number; data: any }) =>
      request.put(`/hr/employees/${id}/work-info/${historyId}`, data),
    onSuccess: async () => {
      message.success('更正成功');

      // 立即重新获取所有相关数据
      await queryClient.refetchQueries({ queryKey: ['employee', id] });
      await queryClient.refetchQueries({ queryKey: ['workInfo', id, selectedWorkInfoVersion] });
      await queryClient.refetchQueries({ queryKey: ['workInfoVersions', id] });

      setEditingTabCode(null);
      form.resetFields();
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '更正失败';
      message.error(errorMsg);
      console.error('更正失败:', error);
    },
  });

  // 学历 CRUD mutations
  const createEducationMutation = useMutation({
    mutationFn: (data: any) => request.post(`/hr/employees/${id}/educations`, data),
    onSuccess: async () => {
      message.success('添加成功');
      await queryClient.refetchQueries({ queryKey: ['educations', id] });
      setSubRecordModalVisible(false);
      setEditingSubRecord(null);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '添加失败');
    },
  });

  const updateEducationMutation = useMutation({
    mutationFn: ({ recordId, data }: { recordId: number; data: any }) =>
      request.put(`/hr/educations/${recordId}`, data),
    onSuccess: async () => {
      message.success('更新成功');
      await queryClient.refetchQueries({ queryKey: ['educations', id] });
      setSubRecordModalVisible(false);
      setEditingSubRecord(null);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '更新失败');
    },
  });

  const deleteEducationMutation = useMutation({
    mutationFn: (recordId: number) => request.delete(`/hr/educations/${recordId}`),
    onSuccess: async () => {
      message.success('删除成功');
      await queryClient.refetchQueries({ queryKey: ['educations', id] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '删除失败');
    },
  });

  // 工作经历 CRUD mutations
  const createWorkExperienceMutation = useMutation({
    mutationFn: (data: any) => request.post(`/hr/employees/${id}/work-experiences`, data),
    onSuccess: async () => {
      message.success('添加成功');
      await queryClient.refetchQueries({ queryKey: ['workExperiences', id] });
      setSubRecordModalVisible(false);
      setEditingSubRecord(null);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '添加失败');
    },
  });

  const updateWorkExperienceMutation = useMutation({
    mutationFn: ({ recordId, data }: { recordId: number; data: any }) =>
      request.put(`/hr/work-experiences/${recordId}`, data),
    onSuccess: async () => {
      message.success('更新成功');
      await queryClient.refetchQueries({ queryKey: ['workExperiences', id] });
      setSubRecordModalVisible(false);
      setEditingSubRecord(null);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '更新失败');
    },
  });

  const deleteWorkExperienceMutation = useMutation({
    mutationFn: (recordId: number) => request.delete(`/hr/work-experiences/${recordId}`),
    onSuccess: async () => {
      message.success('删除成功');
      await queryClient.refetchQueries({ queryKey: ['workExperiences', id] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '删除失败');
    },
  });

  // 家庭成员 CRUD mutations
  const createFamilyMemberMutation = useMutation({
    mutationFn: (data: any) => request.post(`/hr/employees/${id}/family-members`, data),
    onSuccess: async () => {
      message.success('添加成功');
      await queryClient.refetchQueries({ queryKey: ['familyMembers', id] });
      setSubRecordModalVisible(false);
      setEditingSubRecord(null);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '添加失败');
    },
  });

  const updateFamilyMemberMutation = useMutation({
    mutationFn: ({ recordId, data }: { recordId: number; data: any }) =>
      request.put(`/hr/family-members/${recordId}`, data),
    onSuccess: async () => {
      message.success('更新成功');
      await queryClient.refetchQueries({ queryKey: ['familyMembers', id] });
      setSubRecordModalVisible(false);
      setEditingSubRecord(null);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '更新失败');
    },
  });

  const deleteFamilyMemberMutation = useMutation({
    mutationFn: (recordId: number) => request.delete(`/hr/family-members/${recordId}`),
    onSuccess: async () => {
      message.success('删除成功');
      await queryClient.refetchQueries({ queryKey: ['familyMembers', id] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '删除失败');
    },
  });

  if (id === 'new') {
    return (
      <div>
        <Card>
          <p>新增人员功能开发中...</p>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/hr/employees')}>
            返回
          </Button>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <Card loading />;
  }

  const accountColumns = [
    {
      title: '账户编码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '账户名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'MAIN' ? 'blue' : 'green'}>
          {type === 'MAIN' ? '主账户' : '子账户'}
        </Tag>
      ),
    },
    {
      title: '层级',
      dataIndex: 'level',
      key: 'level',
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
    },
    {
      title: '生效日期',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '失效日期',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>
          {status === 'ACTIVE' ? '激活' : '冻结'}
        </Tag>
      ),
    },
  ];

  const renderLaborAccounts = () => (
    <Card
      title="劳动力账户"
      extra={
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={handleRegenerateAccounts}
          loading={regenerateAccountsMutation.isPending}
        >
          重新生成账户
        </Button>
      }
    >
      <Table
        columns={accountColumns}
        dataSource={accounts || []}
        rowKey="id"
        pagination={false}
      />
    </Card>
  );

  // 判断是否为工作信息页签
  const isWorkInfoTab = (tabCode: string) => {
    return tabCode === 'work_info';
  };

  // 处理编辑按钮点击
  const handleEditTab = (tabCode: string) => {
    const isWorkInfo = isWorkInfoTab(tabCode);

    if (isWorkInfo) {
      // 工作信息需要选择是创建新版本还是编辑当前版本
      setEditingTabCode(tabCode);
      setEditModalVisible(true);
    } else {
      // 其他页签直接进入编辑模式
      setEditingTabCode(tabCode);
      // 加载当前数据到表单（包括系统字段和自定义字段）
      const customFields = employee?.customFields ? JSON.parse(employee.customFields) : {};

      // 将自定义字段展开到表单顶层
      const flattenedCustomFields = {};
      Object.entries(customFields).forEach(([key, value]) => {
        // 转换日期字段为 dayjs 对象
        if (value && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
          flattenedCustomFields[key] = dayjs(value);
        } else {
          flattenedCustomFields[key] = value;
        }
      });

      const systemFieldsData = {
        employeeNo: employee?.employeeNo,
        name: employee?.name,
        gender: employee?.gender,
        idCard: employee?.idCard,
        phone: employee?.phone,
        email: employee?.email,
        orgId: employee?.orgId,
        position: employee?.position,
        jobLevel: employee?.jobLevel,
        employeeType: employee?.employeeType,
        workLocation: employee?.workLocation,
        workAddress: employee?.workAddress,
        entryDate: employee?.entryDate ? dayjs(employee.entryDate) : undefined,
        hireDate: employee?.hireDate ? dayjs(employee.hireDate) : undefined,
        birthDate: employee?.birthDate ? dayjs(employee.birthDate) : undefined,
        probationStart: employee?.probationStart ? dayjs(employee.probationStart) : undefined,
        probationEnd: employee?.probationEnd ? dayjs(employee.probationEnd) : undefined,
        // 基本信息页签的其他字段（不包括age，age会自动计算）
        maritalStatus: employee?.maritalStatus,
        nativePlace: employee?.nativePlace,
        politicalStatus: employee?.politicalStatus,
        householdRegister: employee?.householdRegister,
        currentAddress: employee?.currentAddress,
        photo: employee?.photo,
        emergencyContact: employee?.emergencyContact,
        emergencyPhone: employee?.emergencyPhone,
        emergencyRelation: employee?.emergencyRelation,
        homeAddress: employee?.homeAddress,
        homePhone: employee?.homePhone,
        status: employee?.status,
      };
      form.setFieldsValue({
        ...systemFieldsData,
        ...flattenedCustomFields,
      });
      setIsCreatingNewVersion(false);
    }
  };

  // 处理取消编辑
  const handleCancelEdit = () => {
    setEditingTabCode(null);
    form.resetFields();
  };

  // 打开子表编辑模态框
  const handleOpenSubRecordModal = (type: 'education_info' | 'work_experience' | 'family_info' | 'education' | 'workExperience' | 'familyMember', record: any = null) => {
    // 将新的code映射到旧的type
    let mappedType: 'education' | 'workExperience' | 'familyMember';
    if (type === 'education_info' || type === 'education') {
      mappedType = 'education';
    } else if (type === 'work_experience' || type === 'workExperience') {
      mappedType = 'workExperience';
    } else if (type === 'family_info' || type === 'familyMember') {
      mappedType = 'familyMember';
    } else {
      mappedType = type as any;
    }

    setSubRecordType(mappedType);
    setEditingSubRecord(record);
    setSubRecordModalVisible(true);

    if (record) {
      // 编辑模式：填充表单
      const formData = { ...record };
      // 转换日期字段
      if (formData.startDate) formData.startDate = dayjs(formData.startDate);
      if (formData.endDate) formData.endDate = dayjs(formData.endDate);
      if (formData.birthDate) formData.birthDate = dayjs(formData.birthDate);
      form.setFieldsValue(formData);
    } else {
      // 新增模式：清空表单
      form.resetFields();
    }
  };

  // 关闭子表编辑模态框
  const handleCloseSubRecordModal = () => {
    setSubRecordModalVisible(false);
    setEditingSubRecord(null);
    form.resetFields();
  };

  // 保存子表记录
  const handleSaveSubRecord = async () => {
    try {
      const values = await form.validateFields();

      // 转换日期格式
      const formattedValues = {
        ...values,
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : null,
        endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : null,
        birthDate: values.birthDate ? values.birthDate.format('YYYY-MM-DD') : null,
      };

      if (subRecordType === 'education') {
        if (editingSubRecord) {
          updateEducationMutation.mutate({ recordId: editingSubRecord.id, data: formattedValues });
        } else {
          createEducationMutation.mutate(formattedValues);
        }
      } else if (subRecordType === 'workExperience') {
        if (editingSubRecord) {
          updateWorkExperienceMutation.mutate({ recordId: editingSubRecord.id, data: formattedValues });
        } else {
          createWorkExperienceMutation.mutate(formattedValues);
        }
      } else if (subRecordType === 'familyMember') {
        if (editingSubRecord) {
          updateFamilyMemberMutation.mutate({ recordId: editingSubRecord.id, data: formattedValues });
        } else {
          createFamilyMemberMutation.mutate(formattedValues);
        }
      }
    } catch (error) {
      console.error('表单验证失败:', error);
      message.error('保存失败，请检查表单数据');
    }
  };

  // 删除子表记录
  const handleDeleteSubRecord = (type: 'education_info' | 'work_experience' | 'family_info' | 'education' | 'workExperience' | 'familyMember', recordId: number) => {
    // 将新的code映射到旧的type
    let mappedType: 'education' | 'workExperience' | 'familyMember';
    if (type === 'education_info' || type === 'education') {
      mappedType = 'education';
    } else if (type === 'work_experience' || type === 'workExperience') {
      mappedType = 'workExperience';
    } else if (type === 'family_info' || type === 'familyMember') {
      mappedType = 'familyMember';
    } else {
      mappedType = type as any;
    }

    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      onOk: () => {
        if (mappedType === 'education') {
          deleteEducationMutation.mutate(recordId);
        } else if (mappedType === 'workExperience') {
          deleteWorkExperienceMutation.mutate(recordId);
        } else if (mappedType === 'familyMember') {
          deleteFamilyMemberMutation.mutate(recordId);
        }
      },
    });
  };

  // 安全地获取 customFields 对象
  const getCustomFields = (dataSource: any): any => {
    if (!dataSource) return {};
    if (!dataSource.customFields) return {};
    if (typeof dataSource.customFields === 'string') {
      try {
        return JSON.parse(dataSource.customFields);
      } catch {
        return {};
      }
    }
    if (typeof dataSource.customFields === 'object') {
      return dataSource.customFields;
    }
    return {};
  };

  // 安全的日期格式化函数
  const formatFieldValue = (value: any): any => {
    // null 或 undefined 直接返回
    if (value === null || value === undefined) {
      return value;
    }

    // 如果是 dayjs 对象，格式化为字符串
    if (dayjs.isDayjs(value)) {
      try {
        return value.format('YYYY-MM-DD');
      } catch (e) {
        console.error('日期格式化失败:', e, value);
        return value;
      }
    }

    // 如果是数组，递归处理
    if (Array.isArray(value)) {
      return value.map(item => formatFieldValue(item));
    }

    // 如果是普通对象（非 dayjs 对象），递归处理
    if (typeof value === 'object' && value !== null && !dayjs.isDayjs(value)) {
      const result: any = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = formatFieldValue(v);
      }
      return result;
    }

    // 其他类型直接返回
    return value;
  };

  // 处理保存（非工作信息页签）
  const handleSave = async () => {
    // 判断是否是工作信息页签
    if (editingTabCode === 'work_info') {
      // 工作信息页签，判断是更正还是更新
      if (isCreatingNewVersion) {
        // 更新：创建新版本
        await handleWorkInfoEditConfirm(true);
      } else {
        // 更正：更新当前版本
        await handleWorkInfoEditConfirm(false);
      }
      return;
    }

    // 其他页签的保存逻辑
    try {
      const values = await form.validateFields();

      // 将表单值转换为后端需要的格式
      const customFieldsToSave: any = {};
      const systemFieldsToSave: any = {};

      // 处理每个字段
      Object.entries(values).forEach(([key, value]) => {
        // 跳过空值和未定义的值
        if (value === undefined) {
          return;
        }

        // 判断是否是系统字段
        // 基本信息页签的Employee表字段
        const basicInfoSystemFields = ['employeeNo', 'name', 'gender', 'idCard', 'phone', 'email', 'orgId', 'entryDate', 'status', 'birthDate', 'age', 'maritalStatus', 'nativePlace', 'politicalStatus', 'householdRegister', 'currentAddress', 'photo', 'emergencyContact', 'emergencyPhone', 'emergencyRelation', 'homeAddress', 'homePhone', 'probationStart', 'probationEnd'];

        // 工作信息页签的WorkInfoHistory表字段
        const workInfoSystemFields = ['position', 'jobLevel', 'employeeType', 'workLocation', 'workAddress', 'hireDate', 'changeType', 'effectiveDate', 'probationMonths', 'regularDate', 'resignationDate', 'resignationReason', 'workYears'];

        const systemFieldNames = [...basicInfoSystemFields, ...workInfoSystemFields];

        if (systemFieldNames.includes(key)) {
          // 系统字段
          systemFieldsToSave[key] = formatFieldValue(value);
        } else if (key !== 'effectiveDate') {
          // 自定义字段（排除 effectiveDate，它只在工作信息新版本时使用）
          customFieldsToSave[key] = formatFieldValue(value);
        }
      });

      const dataToSave = {
        ...systemFieldsToSave,
        customFields: JSON.stringify(customFieldsToSave),
      };

      updateEmployeeMutation.mutate(dataToSave);
    } catch (error) {
      console.error('表单验证失败:', error);
      message.error('保存失败，请检查表单数据');
    }
  };

  // 处理工作信息编辑确认
  const handleWorkInfoEditConfirm = async (createNewVersion: boolean) => {
    if (!effectiveDate && createNewVersion) {
      message.error('请选择生效日期');
      return;
    }

    try {
      const values = await form.validateFields();

      // 将表单值转换为后端需要的格式
      const customFieldsToSave: any = {};  // 职位信息（支持时间轴）
      const employeeFieldsToSave: any = {}; // 入职信息（不支持时间轴）

      // 基本信息字段（这些字段不属于工作信息，不需要保存）
      const basicInfoFields = ['employeeNo', 'name', 'gender', 'idCard', 'phone', 'email', 'birthDate', 'probationStart', 'probationEnd', 'status'];

      // 职位信息（支持时间轴，保存到 customFields）
      const positionInfoFields = ['position', 'jobLevel', 'employeeType', 'orgId', 'workLocation', 'workAddress'];

      // 入职信息（不支持时间轴，直接更新员工表）
      const entryInfoFields = ['entryDate', 'hireDate'];

      // 处理每个字段
      Object.entries(values).forEach(([key, value]) => {
        // 跳过空值、未定义的值、生效日期和基本信息字段
        if (value === undefined || value === null || key === 'effectiveDate' || basicInfoFields.includes(key)) {
          return;
        }

        if (positionInfoFields.includes(key)) {
          // 职位信息保存到 customFields
          customFieldsToSave[key] = formatFieldValue(value);
        } else if (entryInfoFields.includes(key)) {
          // 入职信息直接保存到员工字段
          employeeFieldsToSave[key] = formatFieldValue(value);
        } else {
          // 其他自定义字段保存到 customFields
          customFieldsToSave[key] = formatFieldValue(value);
        }
      });


      if (createNewVersion) {
        // 创建新版本时，只保存职位信息，入职信息不参与版本管理
        createWorkInfoVersionMutation.mutate({
          effectiveDate: effectiveDate.format('YYYY-MM-DD'),
          customFields: JSON.stringify(customFieldsToSave),
          entryInfo: employeeFieldsToSave, // 入职信息单独传递
        });
      } else {
        // 更新指定的工作信息历史记录
        if (editingWorkInfoHistoryId) {
          // 更正历史版本
          updateWorkInfoHistoryMutation.mutate({
            historyId: editingWorkInfoHistoryId,
            data: {
              customFields: JSON.stringify(customFieldsToSave),
              entryInfo: employeeFieldsToSave,
            },
          });
        } else {
          // 如果没有指定 historyId，则更新当前版本（兼容旧逻辑）
          updateWorkInfoMutation.mutate({
            customFields: JSON.stringify(customFieldsToSave),
            entryInfo: employeeFieldsToSave,
          });
        }
      }
    } catch (error) {
      console.error('表单验证失败:', error);
      message.error('保存失败，请检查表单数据');
    }
  };

  // 下拉类型的自定义字段
  const dropdownFields = customFields?.filter((f: any) =>
    f.type === 'SELECT_SINGLE' || f.type === 'SELECT_MULTI' || f.type === 'LOOKUP'
  ) || [];

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

  // 根据value获取label（用于显示）
  const getLabelByValue = (fieldCode: string, fieldType: string, value: any): string => {
    if (!value) return '-';

    // 系统字段的下拉选项
    if (fieldType === 'SYSTEM') {
      if (fieldCode === 'gender' || fieldCode === 'gender') {
        const options = getOptionsByDataSourceCode('gender');
        const option = options.find((opt: any) => opt.value === value);
        return option?.label || value;
      }
      if (fieldCode === 'position' || fieldCode === 'POSITION') {
        const options = getOptionsByDataSourceCode('POSITION');
        const option = options.find((opt: any) => opt.value === value);
        return option?.label || value;
      }
      if (fieldCode === 'jobLevel' || fieldCode === 'job_level' || fieldCode === 'JOB_LEVEL') {
        const options = getOptionsByDataSourceCode('JOB_LEVEL');
        const option = options.find((opt: any) => opt.value === value);
        return option?.label || value;
      }
      if (fieldCode === 'employeeType' || fieldCode === 'employee_type' || fieldCode === 'EMPLOYEE_TYPE') {
        const options = getOptionsByDataSourceCode('EMPLOYEE_TYPE');
        const option = options.find((opt: any) => opt.value === value);
        return option?.label || value;
      }
      if (fieldCode === 'educationLevel' || fieldCode === 'education_level') {
        const options = getOptionsByDataSourceCode('education_level');
        const option = options.find((opt: any) => opt.value === value);
        return option?.label || value;
      }
      if (fieldCode === 'maritalStatus' || fieldCode === 'marital_status') {
        const options = getOptionsByDataSourceCode('marital_status');
        const option = options.find((opt: any) => opt.value === value);
        return option?.label || value;
      }
      if (fieldCode === 'politicalStatus' || fieldCode === 'political_status') {
        const options = getOptionsByDataSourceCode('political_status');
        const option = options.find((opt: any) => opt.value === value);
        return option?.label || value;
      }
      if (fieldCode === 'orgId' || fieldCode === 'org_id') {
        // 组织需要从 orgTree 中查找
        const findOrg = (orgs: any[], id: any): any => {
          for (const org of orgs) {
            if (org.id === id) return org;
            if (org.children) {
              const found = findOrg(org.children, id);
              if (found) return found;
            }
          }
          return null;
        };
        const org = findOrg(orgTree || [], value);
        return org?.name || value;
      }
      // 在职状态 - employment_status
      if (fieldCode === 'status' || fieldCode === 'employment_status') {
        const options = getOptionsByDataSourceCode('employment_status');
        if (options && options.length > 0) {
          // 大小写不敏感匹配
          const option = options.find((opt: any) => opt.value.toLowerCase() === value.toLowerCase());
          return option?.label || value;
        }
        // 如果没有数据源，返回常见状态的映射
        const statusMap: Record<string, string> = {
          'ACTIVE': '在职',
          'active': '在职',
          'PROBATION': '试用期',
          'probation': '试用期',
          'RESIGNED': '离职',
          'resigned': '离职',
          'UNPAID_LEAVE': '停薪留职',
          'unpaid_leave': '停薪留职',
          'RETIRED': '退休',
          'retired': '退休',
          'TERMINATED': '开除',
          'terminated': '开除',
        };
        return statusMap[value] || value;
      }
      // 紧急联系人关系
      if (fieldCode === 'emergency_relation' || fieldCode === 'emergencyRelation') {
        const options = getOptionsByDataSourceCode('emergency_relation');
        if (options && options.length > 0) {
          const option = options.find((opt: any) => opt.value === value);
          return option?.label || value;
        }
        // 如果没有数据源，返回常见关系的映射
        const relationMap: Record<string, string> = {
          'spouse': '配偶',
          'father': '父亲',
          'mother': '母亲',
          'child': '子女',
          'other': '其他',
        };
        return relationMap[value] || value;
      }
      // 民族
      if (fieldCode === 'nation') {
        const options = getOptionsByDataSourceCode('nation');
        if (options && options.length > 0) {
          const option = options.find((opt: any) => opt.value === value);
          return option?.label || value;
        }
        // 如果没有数据源，返回常见民族的映射
        const nationMap: Record<string, string> = {
          'han': '汉族',
          'zhuang': '壮族',
          'hui': '回族',
          'manchu': '满族',
          'uygur': '维吾尔族',
          'miao': '苗族',
          'yi': '彝族',
          'tujia': '土家族',
          'tibetan': '藏族',
          'mongol': '蒙古族',
        };
        return nationMap[value] || value;
      }
      // 人员类型（自定义字段A06）
      if (fieldCode === 'A06' || fieldCode === 'person_type') {
        const options = getOptionsByDataSourceCode('EmpType');
        if (options && options.length > 0) {
          const option = options.find((opt: any) => opt.value === value);
          return option?.label || value;
        }
      }
      return value;
    }

    // 自定义字段的下拉选项
    if (fieldType === 'SELECT_SINGLE' || fieldType === 'LOOKUP') {
      const options = getDropdownOptions(fieldCode);
      const option = options.find((opt: any) => opt.value === value);
      return option?.label || value;
    }

    if (fieldType === 'SELECT_MULTI') {
      if (Array.isArray(value)) {
        const options = getDropdownOptions(fieldCode);
        return value.map(v => {
          const option = options.find((opt: any) => opt.value === v);
          return option?.label || v;
        }).join(', ');
      }
      return value;
    }

    return value;
  };

  // 将数据库字段名映射到表单字段名
  const mapFieldName = (code: string): string => {
    const fieldMapping: Record<string, string> = {
      employee_no: 'employeeNo',
      id_card: 'idCard',
      org_id: 'orgId',
      dept_id: 'deptId',
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
      mobile: 'phone',  // mobile映射到phone
      // 工作信息页签字段
      change_type: 'changeType',
      effective_date: 'effectiveDate',
      regular_date: 'regularDate',
      resignation_date: 'resignationDate',
      resignation_reason: 'resignationReason',
      work_years: 'workYears',
    };
    return fieldMapping[code] || code;
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

  // 渲染系统字段（参考新增人员页面）
  const renderSystemField = (fieldCode: string, fieldName: string, isRequired: boolean = false) => {
    // 字段标签映射
    const getFieldLabel = (code: string, providedFieldName?: string) => {
      if (providedFieldName) {
        return providedFieldName;
      }

      const labels: Record<string, string> = {
        employeeNo: '工号',
        name: '姓名',
        gender: '性别',
        idCard: '身份证号',
        phone: '手机号',
        email: '邮箱',
        orgId: '所属组织',
        position: '职位',
        jobLevel: '职级',
        employeeType: '员工类型',
        workLocation: '工作地点',
        workAddress: '办公地址',
        entryDate: '入职日期',
        hireDate: '受雇日期',
        birthDate: '出生日期',
        nativePlace: '籍贯',
        maritalStatus: '婚姻状况',
        politicalStatus: '政治面貌',
        householdRegister: '户口所在地',
        currentAddress: '现居住地址',
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

    const label = getFieldLabel(fieldCode, fieldName);

    // 判断是否应该禁用字段：工作信息页签编辑模式下，工号、入职日期、在职状态不可编辑
    const isWorkInfoEditing = editingTabCode === 'work_info';
    const shouldDisable = isWorkInfoEditing && (
      fieldCode === 'employeeNo' || fieldCode === 'employee_no' ||
      fieldCode === 'entryDate' || fieldCode === 'entry_date' ||
      fieldCode === 'status'
    );

    switch (fieldCode) {
      case 'employeeNo':
      case 'employee_no':
        return (
          <Form.Item name={mapFieldName(fieldCode)} label={label} rules={createRules()} key={fieldCode}>
            <Input placeholder={`请输入${label}`} disabled={shouldDisable} />
          </Form.Item>
        );

      case 'name':
        return (
          <Form.Item name="name" label={label} rules={createRules()} key={fieldCode}>
            <Input placeholder={`请输入${label}`} />
          </Form.Item>
        );

      case 'gender':
        const genderOptions = getOptionsByDataSourceCode('gender');
        return (
          <Form.Item name="gender" label={label} rules={createRules()} key={fieldCode}>
            <Select placeholder={`请选择${label}`} disabled={shouldDisable}>
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
            label={label}
            rules={createRules([
              { pattern: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/, message: '请输入正确的身份证号' }
            ])}
            key={fieldCode}
          >
            <Input placeholder={`请输入${label}`} />
          </Form.Item>
        );

      case 'phone':
      case 'mobile':
        return (
          <Form.Item
            name="phone"
            label={label}
            rules={createRules([
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
            ])}
            key={fieldCode}
          >
            <Input placeholder={`请输入${label}`} />
          </Form.Item>
        );

      case 'email':
        return (
          <Form.Item
            name="email"
            label={label}
            rules={createRules([{ type: 'email', message: '请输入正确的邮箱地址' }])}
            key={fieldCode}
          >
            <Input placeholder={`请输入${label}`} />
          </Form.Item>
        );

      case 'orgId':
      case 'org_id':
        const treeData = renderOrgTree(orgTree || []);
        return (
          <Form.Item name={mapFieldName(fieldCode)} label={label} rules={createRules()} key={fieldCode}>
            <TreeSelect
              placeholder={`请选择${label}`}
              showSearch
              treeDefaultExpandAll
              treeData={treeData}
              notFoundContent="暂无组织数据"
            />
          </Form.Item>
        );

      case 'entryDate':
      case 'entry_date':
      case 'hireDate':
      case 'hire_date':
      case 'birthDate':
      case 'birth_date':
      case 'probationStart':
      case 'probation_start':
      case 'probationEnd':
      case 'probation_end':
      case 'graduationDate':
      case 'graduation_date':
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label={label}
            rules={createRules()}
            key={fieldCode}
            getValueProps={(value) => ({
              value: value && dayjs.isDayjs(value) ? value : (value ? dayjs(value) : null),
            })}
            normalize={(value) => value}
          >
            <DatePicker style={{ width: '100%' }} disabled={shouldDisable} />
          </Form.Item>
        );

      case 'position':
        const positionOptions = getOptionsByDataSourceCode('POSITION');
        return (
          <Form.Item name="position" label={label} rules={createRules()} key={fieldCode}>
            <Select placeholder={`请选择${label}`} allowClear showSearch>
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
          <Form.Item name={mapFieldName(fieldCode)} label={label} rules={createRules()} key={fieldCode}>
            <Select placeholder={`请选择${label}`} allowClear showSearch>
              {jobLevelOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'age':
        // 年龄字段：禁用编辑，从出生日期自动计算
        return (
          <Form.Item name="age" label={label} key={fieldCode}>
            <Input
              placeholder="自动计算"
              disabled
              value={employee?.birthDate ? `${dayjs().diff(dayjs(employee.birthDate), 'year')}岁` : undefined}
            />
          </Form.Item>
        );

      case 'employeeType':
      case 'employee_type':
        const employeeTypeOptions = getOptionsByDataSourceCode('EMPLOYEE_TYPE');
        return (
          <Form.Item name={mapFieldName(fieldCode)} label={label} rules={createRules()} key={fieldCode}>
            <Select placeholder={`请选择${label}`} allowClear showSearch>
              {employeeTypeOptions.map((option: any) => (
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
          <Form.Item name={mapFieldName(fieldCode)} label={label} rules={createRules()} key={fieldCode}>
            <Select placeholder={`请选择${label}`}>
              {educationLevelOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'maritalStatus':
      case 'marital_status':
        const maritalStatusOptions = getOptionsByDataSourceCode('marital_status');
        return (
          <Form.Item name={mapFieldName(fieldCode)} label={label} rules={createRules()} key={fieldCode}>
            <Select placeholder={`请选择${label}`}>
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
          <Form.Item name={mapFieldName(fieldCode)} label={label} rules={createRules()} key={fieldCode}>
            <Select placeholder={`请选择${label}`}>
              {politicalStatusOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'status':
        const employmentStatusOptions = getOptionsByDataSourceCode('employment_status');
        return (
          <Form.Item name="status" label={label} rules={createRules()} key={fieldCode}>
            <Select placeholder={`请选择${label}`} disabled={shouldDisable}>
              {employmentStatusOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'changeType':
      case 'change_type':
        // 异动类型字段：从数据源获取选项，仅在创建新版本时必填
        const changeTypeOptions = getOptionsByDataSourceCode('change_type');
        const isChangeTypeRequired = isCreatingNewVersion; // 创建新版本时必填
        return (
          <Form.Item
            name={mapFieldName(fieldCode)}
            label="异动类型"
            rules={isChangeTypeRequired ? [{ required: true, message: '请选择异动类型' }] : undefined}
            key={fieldCode}
          >
            <Select placeholder={`请选择异动类型`} allowClear showSearch>
              {changeTypeOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      default:
        // 文本类型的字段
        return (
          <Form.Item name={mapFieldName(fieldCode)} label={label} rules={createRules()} key={fieldCode}>
            <Input placeholder={`请输入${label}`} />
          </Form.Item>
        );
    }
  };

  // 渲染自定义字段（参考新增人员页面）
  const renderCustomField = (field: any) => {
    const commonProps = {
      label: field.name,
      name: field.code,
      rules: field.isRequired ? [{ required: true, message: `请输入${field.name}` }] : undefined,
      key: field.code,
    };

    switch (field.type) {
      case 'TEXT':
        return (
          <Form.Item {...commonProps}>
            <Input placeholder={`请输入${field.name}`} />
          </Form.Item>
        );

      case 'TEXTAREA':
        return (
          <Form.Item {...commonProps}>
            <Input.TextArea rows={4} placeholder={`请输入${field.name}`} />
          </Form.Item>
        );

      case 'NUMBER':
        return (
          <Form.Item {...commonProps}>
            <Input type="number" placeholder={`请输入${field.name}`} />
          </Form.Item>
        );

      case 'DATE':
        return (
          <Form.Item
            {...commonProps}
            getValueProps={(value) => ({
              value: value && dayjs.isDayjs(value) ? value : (value ? dayjs(value) : null),
            })}
            normalize={(value) => value}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        );

      case 'SELECT_SINGLE':
        return (
          <Form.Item {...commonProps}>
            <Select placeholder={`请选择${field.name}`}>
              {getDropdownOptions(field.code).map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'emergencyRelation':
      case 'emergency_relation':
        const emergencyRelationOptions = getOptionsByDataSourceCode('emergency_relation');
        return (
          <Form.Item name={mapFieldName(fieldCode)} label={label} rules={createRules()} key={fieldCode}>
            <Select placeholder={`请选择${label}`} allowClear>
              {emergencyRelationOptions.length > 0 ? (
                emergencyRelationOptions.map((option: any) => (
                  <Select.Option key={option.id} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))
              ) : (
                <>
                  <Select.Option value="spouse">配偶</Select.Option>
                  <Select.Option value="father">父亲</Select.Option>
                  <Select.Option value="mother">母亲</Select.Option>
                  <Select.Option value="child">子女</Select.Option>
                  <Select.Option value="other">其他</Select.Option>
                </>
              )}
            </Select>
          </Form.Item>
        );

      case 'nation':
        const nationOptions = getOptionsByDataSourceCode('nation');
        return (
          <Form.Item name="nation" label={label} rules={createRules()} key={fieldCode}>
            <Select placeholder={`请选择${label}`} allowClear>
              {nationOptions.length > 0 ? (
                nationOptions.map((option: any) => (
                  <Select.Option key={option.id} value={option.value}>
                    {option.label}
                  </Select.Option>
                ))
              ) : (
                <>
                  <Select.Option value="han">汉族</Select.Option>
                  <Select.Option value="zhuang">壮族</Select.Option>
                  <Select.Option value="hui">回族</Select.Option>
                  <Select.Option value="manchu">满族</Select.Option>
                  <Select.Option value="uygur">维吾尔族</Select.Option>
                  <Select.Option value="miao">苗族</Select.Option>
                </>
              )}
            </Select>
          </Form.Item>
        );

      case 'SELECT_MULTI':
        return (
          <Form.Item {...commonProps}>
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
        if (field.dataSource?.type === 'ORG') {
          return (
            <Form.Item {...commonProps}>
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
          <Form.Item {...commonProps}>
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

  // 渲染版本选择器（仅工作信息页签）
  const renderVersionSelector = () => {
    if (workInfoVersions.length === 0) {
      return null;
    }

    return (
      <Card
        size="small"
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <HistoryOutlined />
            <span>历史版本</span>
          </Space>
        }
      >
        <Select
          style={{ width: '100%' }}
          placeholder="选择查看历史版本"
          allowClear
          value={selectedWorkInfoVersion}
          onChange={(value) => {
            setSelectedWorkInfoVersion(value);
            refetchWorkInfo();
          }}
        >
          <Select.Option value="current">当前版本</Select.Option>
          {workInfoVersions.map((version: any) => (
            <Select.Option key={version.id} value={version.id}>
              {dayjs(version.effectiveDate).format('YYYY-MM-DD')}
              {version.description && ` - ${version.description}`}
            </Select.Option>
          ))}
        </Select>
      </Card>
    );
  };

  const renderCustomTabs = () => {
    return (infoTabs || []).map((tab: any) => {
      const fields = tab.fields || [];

      if (fields.length === 0) {
        return null;
      }

      const getFieldDisplay = (field: any) => {
        const customFields = employee?.customFields ? JSON.parse(employee.customFields) : {};
        const value = customFields[field.fieldCode];

        if (value === undefined || value === null || value === '') {
          return '-';
        }

        // 根据字段类型格式化显示
        switch (field.fieldType) {
          case 'DATE':
            return dayjs(value).format('YYYY-MM-DD');
          case 'SELECT_SINGLE':
          case 'LOOKUP':
            return value;
          case 'SELECT_MULTI':
            return Array.isArray(value) ? value.join(', ') : value;
          case 'BOOLEAN':
            return value ? '是' : '否';
          default:
            return String(value);
        }
      };

      return (
        <Tabs.TabPane tab={tab.name} key={tab.code}>
          <Card>
            <Descriptions bordered column={2}>
              {fields.map((field: any) => (
                <Descriptions.Item label={field.fieldName} key={field.id}>
                  {getFieldDisplay(field)}
                </Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        </Tabs.TabPane>
      );
    });
  };

  // 判断是否为子表页签（支持多条记录的页签）
  const isSubRecordTab = (tabCode: string) => {
    return tabCode === 'education_info' || tabCode === 'work_experience' || tabCode === 'family_info';
  };

  // 渲染学历表格
  const renderEducationTable = () => {
    const columns = [
      { title: '学校', dataIndex: 'school', key: 'school' },
      { title: '专业', dataIndex: 'major', key: 'major' },
      { title: '学位', dataIndex: 'degree', key: 'degree' },
      { title: '学历层次', dataIndex: 'educationLevel', key: 'educationLevel' },
      {
        title: '入学日期',
        dataIndex: 'startDate',
        key: 'startDate',
        render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
      },
      {
        title: '毕业日期',
        dataIndex: 'endDate',
        key: 'endDate',
        render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
      },
      {
        title: '是否最高学历',
        dataIndex: 'isHighest',
        key: 'isHighest',
        render: (isHighest: boolean) => (isHighest ? '是' : '否'),
      },
      {
        title: '操作',
        key: 'action',
        render: (_: any, record: any) => (
          <Space>
            <Button size="small" onClick={() => handleOpenSubRecordModal('education', record)}>
              编辑
            </Button>
            <Button size="small" danger onClick={() => handleDeleteSubRecord('education', record.id)}>
              删除
            </Button>
          </Space>
        ),
      },
    ];

    return (
      <Card
        title="学历信息"
        extra={
          <Button type="primary" onClick={() => handleOpenSubRecordModal('education')}>
            添加学历
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={educations || []}
          rowKey="id"
          pagination={false}
        />
      </Card>
    );
  };

  // 渲染工作经历表格
  const renderWorkExperienceTable = () => {
    const columns = [
      { title: '公司', dataIndex: 'company', key: 'company' },
      { title: '职位', dataIndex: 'position', key: 'position' },
      {
        title: '开始日期',
        dataIndex: 'startDate',
        key: 'startDate',
        render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
      },
      {
        title: '结束日期',
        dataIndex: 'endDate',
        key: 'endDate',
        render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
      },
      { title: '工作描述', dataIndex: 'description', key: 'description', ellipsis: true },
      {
        title: '操作',
        key: 'action',
        render: (_: any, record: any) => (
          <Space>
            <Button size="small" onClick={() => handleOpenSubRecordModal('workExperience', record)}>
              编辑
            </Button>
            <Button size="small" danger onClick={() => handleDeleteSubRecord('workExperience', record.id)}>
              删除
            </Button>
          </Space>
        ),
      },
    ];

    return (
      <Card
        title="工作经历"
        extra={
          <Button type="primary" onClick={() => handleOpenSubRecordModal('workExperience')}>
            添加工作经历
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={workExperiences || []}
          rowKey="id"
          pagination={false}
        />
      </Card>
    );
  };

  // 渲染家庭成员表格
  const renderFamilyMemberTable = () => {
    const columns = [
      { title: '关系', dataIndex: 'relationship', key: 'relationship' },
      { title: '姓名', dataIndex: 'name', key: 'name' },
      { title: '性别', dataIndex: 'gender', key: 'gender' },
      { title: '身份证号', dataIndex: 'idCard', key: 'idCard' },
      { title: '联系电话', dataIndex: 'phone', key: 'phone' },
      { title: '工作单位', dataIndex: 'workUnit', key: 'workUnit' },
      {
        title: '出生日期',
        dataIndex: 'birthDate',
        key: 'birthDate',
        render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD') : '-'),
      },
      {
        title: '是否紧急联系人',
        dataIndex: 'isEmergency',
        key: 'isEmergency',
        render: (isEmergency: boolean) => (isEmergency ? '是' : '否'),
      },
      {
        title: '操作',
        key: 'action',
        render: (_: any, record: any) => (
          <Space>
            <Button size="small" onClick={() => handleOpenSubRecordModal('familyMember', record)}>
              编辑
            </Button>
            <Button size="small" danger onClick={() => handleDeleteSubRecord('familyMember', record.id)}>
              删除
            </Button>
          </Space>
        ),
      },
    ];

    return (
      <Card
        title="家庭成员"
        extra={
          <Button type="primary" onClick={() => handleOpenSubRecordModal('familyMember')}>
            添加家庭成员
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={familyMembers || []}
          rowKey="id"
          pagination={false}
        />
      </Card>
    );
  };

  // 构建页签数组：配置的页签 + 劳动力账户
  const buildTabItems = () => {
    const items: any[] = [];


    // 1. 配置的页签（从人事信息配置读取）
    (infoTabs || []).forEach((tab: any) => {
      const isWorkInfo = isWorkInfoTab(tab.code);
      const isSubRecord = isSubRecordTab(tab.code);
      const isEditing = editingTabCode === tab.code;

      items.push({
        key: tab.code,
        label: tab.name,
        children: (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/hr/employees')}>
                返回列表
              </Button>
              {/* 工作信息页签：显示更新和更正按钮 */}
              {isWorkInfo && !isEditing ? (
                <Space>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      // 更正：直接编辑当前选择的版本
                      setEditingTabCode('work_info');
                      setIsCreatingNewVersion(false);

                      // 获取当前工作信息数据
                      const workInfoData = currentWorkInfo?.currentWorkInfo || {};

                      // 保存当前编辑的工作信息历史记录ID
                      // 如果是 'current'，使用 currentWorkInfo.currentWorkInfo.id
                      // 如果是历史版本，使用该版本的 id
                      if (selectedWorkInfoVersion === 'current' || selectedWorkInfoVersion === undefined) {
                        setEditingWorkInfoHistoryId(workInfoData?.id || null);
                      } else {
                        // 从 workInfoVersions 中找到对应版本的 id
                        const selectedVersion = workInfoVersions.find((v: any) => v.id === selectedWorkInfoVersion);
                        setEditingWorkInfoHistoryId(selectedVersion?.id || null);
                      }

                      // 加载所有可能的系统字段（从 employee 对象加载基本信息，从 currentWorkInfo.currentWorkInfo 加载工作信息）
                      const systemFieldsData: any = {};

                      // 优先从 employee 对象加载基本信息（工号、入职日期等）
                      if (employee) {
                        if (employee.employeeNo) systemFieldsData.employeeNo = employee.employeeNo;
                        if (employee.name) systemFieldsData.name = employee.name;
                        if (employee.gender) systemFieldsData.gender = employee.gender;
                        if (employee.idCard) systemFieldsData.idCard = employee.idCard;
                        if (employee.phone) systemFieldsData.phone = employee.phone;
                        if (employee.email) systemFieldsData.email = employee.email;
                        if (employee.entryDate) {
                          systemFieldsData.entryDate = dayjs(employee.entryDate);
                        }
                        if (employee.status) systemFieldsData.status = employee.status;
                      }

                      // 从 workInfoData (currentWorkInfo.currentWorkInfo) 加载工作信息字段
                      const workInfoFieldNames = [
                        'orgId', 'position', 'jobLevel', 'employeeType',
                        'workLocation', 'workAddress', 'hireDate',
                        'probationStart', 'probationEnd', 'probationMonths',
                        'regularDate', 'resignationDate', 'resignationReason', 'workYears',
                        'changeType', 'effectiveDate'
                      ];

                      workInfoFieldNames.forEach(fieldName => {
                        const value = workInfoData?.[fieldName];
                        if (value !== undefined && value !== null) {
                          // 日期字段转换为 dayjs 对象
                          if (fieldName.endsWith('Date') || fieldName.endsWith('date') ||
                              fieldName.endsWith('Start') || fieldName.endsWith('End')) {
                            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                              systemFieldsData[fieldName] = dayjs(value);
                            } else {
                              systemFieldsData[fieldName] = value;
                            }
                          } else {
                            systemFieldsData[fieldName] = value;
                          }
                        }
                      });

                      // 获取 customFields 并合并（从 employee 和 workInfoData）
                      const employeeCustomFields = employee?.customFields ?
                        (typeof employee.customFields === 'string' ? JSON.parse(employee.customFields) : employee.customFields) : {};
                      const workInfoCustomFields = workInfoData?.customFields || {};

                      const mergedCustomFields = {
                        ...employeeCustomFields,
                        ...workInfoCustomFields
                      };

                      // 将自定义字段展开到表单顶层
                      const flattenedCustomFields = {};
                      Object.entries(mergedCustomFields).forEach(([key, value]) => {
                        // 转换日期字段为 dayjs 对象
                        if (value && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                          flattenedCustomFields[key] = dayjs(value);
                        } else {
                          flattenedCustomFields[key] = value;
                        }
                      });

                      form.setFieldsValue({
                        ...systemFieldsData,
                        ...flattenedCustomFields,
                      });
                    }}
                  >
                    更正
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      // 更新：创建新版本，打开选择生效日期的模态框
                      setEditModalVisible(true);
                    }}
                  >
                    更新
                  </Button>
                </Space>
              ) : !isSubRecord && !isEditing && !isWorkInfo ? (
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => handleEditTab(tab.code)}
                >
                  编辑
                </Button>
              ) : !isSubRecord && isEditing ? (
                <Space>
                  <Button
                    icon={<CloseOutlined />}
                    onClick={handleCancelEdit}
                  >
                    取消
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    loading={updateEmployeeMutation.isPending || updateWorkInfoMutation.isPending || createWorkInfoVersionMutation.isPending}
                  >
                    保存
                  </Button>
                </Space>
              ) : null}
            </div>

            {/* 工作信息页签显示版本选择器（仅在非编辑模式） */}
            {isWorkInfo && !isEditing && renderVersionSelector()}

            {/* 子表页签渲染表格 */}
            {isSubRecord ? (
              <>
                {tab.code === 'education_info' && renderEducationTable()}
                {tab.code === 'work_experience' && renderWorkExperienceTable()}
                {tab.code === 'family_info' && (
                  tab.groups?.filter((g: any) => g.status === 'ACTIVE').length > 0
                    ? renderFamilyMemberTable()
                    : <Card title={tab.name} bordered={false}>该页签的分组已禁用</Card>
                )}
              </>
            ) : (
              <>
                {(!tab.groups || tab.groups.length === 0) ? (
                  <Card title={tab.name} bordered={false}>
                    该页签暂无分组配置
                  </Card>
                ) : (
              tab.groups.map((group: any) => {
                // 只显示启用的分组
                if (group.status === 'INACTIVE') {
                  return null;
                }

                // 过滤掉隐藏的字段
                const systemFields = group.fields?.filter((f: any) =>
                  f.fieldType === 'SYSTEM' && !f.isHidden
                ) || [];
                const groupCustomFields = group.fields?.filter((f: any) =>
                  f.fieldType === 'CUSTOM' && !f.isHidden
                ) || [];
                const allFields = [...systemFields, ...groupCustomFields];

                // 获取数据源（工作信息使用当前版本，其他使用主数据）
                // 注意：currentWorkInfo是API响应对象，真正的WorkInfoHistory数据在currentWorkInfo.currentWorkInfo中
                const dataSource = isWorkInfo ? (currentWorkInfo?.currentWorkInfo || currentWorkInfo) : employee;

                // 如果分组内没有可见字段，不显示该分组
                if (allFields.length === 0) {
                  return null;
                }

                return (
                  <Card
                    key={group.id}
                    title={group.name}
                    bordered={false}
                    style={{ marginBottom: 16 }}
                  >
                    <Spin spinning={!dataSource && isWorkInfo} tip="加载中...">
                      {!dataSource && isWorkInfo ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                          正在加载工作信息...
                          <div style={{ marginTop: '10px', fontSize: '12px' }}>
                            如果长时间未加载，请刷新页面重试
                          </div>
                        </div>
                      ) : !dataSource ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                          暂无数据
                        </div>
                      ) : isEditing ? (
                        <Form form={form} layout="vertical">
                          {/* 工作信息创建新版本时显示生效日期字段 */}
                          {isWorkInfo && isCreatingNewVersion && (
                            <Row gutter={16} style={{ marginBottom: 16 }}>
                              <Col span={24}>
                                <Card size="small" style={{ backgroundColor: '#f0f8ff' }}>
                                  <Form.Item
                                    name="effectiveDate"
                                    label="异动生效日期"
                                    rules={[{ required: true, message: '请选择异动生效日期' }]}
                                    getValueProps={(value) => ({
                                      value: value && dayjs.isDayjs(value) ? value : (value ? dayjs(value) : null),
                                    })}
                                    normalize={(value) => value}
                                  >
                                    <DatePicker style={{ width: '100%' }} placeholder="请选择异动生效日期" />
                                  </Form.Item>
                                </Card>
                              </Col>
                            </Row>
                          )}
                          {/* 工作信息创建新版本时显示异动类型字段 */}
                          {isWorkInfo && isCreatingNewVersion && (
                            <Row gutter={16} style={{ marginBottom: 16 }}>
                              <Col span={12}>
                                <Form.Item
                                  name="changeType"
                                  label="异动类型"
                                  rules={[{ required: true, message: '请选择异动类型' }]}
                                >
                                  <Select placeholder="请选择异动类型" allowClear showSearch>
                                    {getOptionsByDataSourceCode('change_type').map((option: any) => (
                                      <Select.Option key={option.id} value={option.value}>
                                        {option.label}
                                      </Select.Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              </Col>
                            </Row>
                          )}
                          <Row gutter={16}>
                            {systemFields.map((field: any) => (
                              <Col span={12} key={field.id}>
                                {renderSystemField(field.fieldCode, field.fieldName, field.isRequired)}
                              </Col>
                            ))}
                            {groupCustomFields.map((field: any) => (
                              <Col span={12} key={field.id}>
                                {renderCustomField(field)}
                              </Col>
                            ))}
                          </Row>
                        </Form>
                      ) : (
                      <Descriptions bordered column={2}>
                        {allFields.map((field: any) => {
                          // 从系统字段或自定义字段中获取值
                          let value;

                          // 职位信息字段（从 currentWorkInfo 读取）- 使用snake_case匹配fieldCode
                          const positionInfoFields = ['position', 'job_level', 'employee_type', 'org_id', 'work_location', 'work_address', 'change_type', 'effective_date', 'hire_date', 'probation_start', 'probation_end', 'probation_months', 'regular_date', 'resignation_date', 'resignation_reason', 'work_years'];

                          // 基本信息字段（从 employee 读取）- 使用snake_case匹配fieldCode
                          const basicInfoFields = ['employee_no', 'name', 'gender', 'id_card', 'mobile', 'email', 'birth_date', 'age', 'marital_status', 'native_place', 'political_status', 'household_register', 'current_address', 'photo', 'emergency_contact', 'emergency_phone', 'emergency_relation', 'home_address', 'home_phone'];

                          if (field.fieldType === 'SYSTEM') {
                            // 特殊处理：employee_no始终从employee读取
                            if (field.fieldCode === 'employee_no') {
                              value = employee?.employeeNo;
                            } else if (field.fieldCode === 'entry_date' || field.fieldCode === 'status') {
                              // entry_date和status也从employee读取
                              value = employee?.[mapFieldName(field.fieldCode)];
                            } else if (positionInfoFields.includes(field.fieldCode)) {
                              // 工作信息字段：从 currentWorkInfo.currentWorkInfo 读取
                              if (isWorkInfo) {
                                const workInfoData = currentWorkInfo?.currentWorkInfo || {};
                                if (field.fieldCode === 'org_id') {
                                  value = workInfoData?.orgId || employee?.orgId;
                                } else {
                                  const fieldName = mapFieldName(field.fieldCode);
                                  value = workInfoData?.[fieldName];
                                }
                              } else {
                                // 其他页签：从 employee 读取（如果employee中没有则为undefined）
                                const fieldName = mapFieldName(field.fieldCode);
                                value = employee?.[fieldName];
                              }
                            } else if (basicInfoFields.includes(field.fieldCode)) {
                              // 基本信息：优先从 employee 读取，如果没有则从 customFields 读取
                              const fieldName = mapFieldName(field.fieldCode);
                              value = employee?.[fieldName];

                              // 如果employee中没有值，尝试从customFields读取（兼容旧数据）
                              if (value === undefined || value === null) {
                                const customFields = getCustomFields(dataSource);
                                value = customFields[field.fieldCode];
                              }
                            } else {
                              // 其他系统字段从 customFields 获取（如 hireDate）
                              const customFields = getCustomFields(dataSource);
                              value = customFields[field.fieldCode];
                            }
                          } else {
                            // 自定义字段从 customFields 获取
                            const customFields = getCustomFields(dataSource);
                            value = customFields[field.fieldCode];
                          }

                          const formatValue = (val: any, fieldType: string, fieldCode: string, fieldObj?: any) => {
                            if (val === undefined || val === null || val === '') {
                              return '-';
                            }

                            // 年龄字段 - 从出生日期动态计算
                            if (fieldCode === 'age' || fieldCode === 'age') {
                              const birthDate = employee?.birthDate;
                              if (birthDate) {
                                const age = dayjs().diff(dayjs(birthDate), 'year');
                                return `${age}岁`;
                              }
                              return '-';
                            }

                            // 日期字段
                            const dateFieldCodes = ['entry_date', 'hire_date', 'birth_date', 'probation_start', 'probation_end', 'graduation_date', 'regular_date', 'resignation_date', 'effective_date'];
                            const isDateField = fieldType === 'DATE' || dateFieldCodes.includes(fieldCode) || fieldCode.endsWith('_date');

                            if (isDateField) {
                              if (typeof val === 'string') {
                                const formatted = dayjs(val).format('YYYY-MM-DD');
                                return formatted === 'Invalid Date' ? val : formatted;
                              }
                              if (dayjs.isDayjs(val)) {
                                return val.format('YYYY-MM-DD');
                              }
                              try {
                                const formatted = dayjs(val).format('YYYY-MM-DD');
                                return formatted === 'Invalid Date' ? val : formatted;
                              } catch (e) {
                                return val;
                              }
                            }

                            // 自定义字段的下拉选择
                            if (fieldType === 'CUSTOM' && fieldObj) {
                              if (fieldObj.type === 'SELECT_SINGLE' || fieldObj.type === 'LOOKUP') {
                                return getLabelByValue(fieldCode, fieldObj.type, val);
                              }
                              if (fieldObj.type === 'SELECT_MULTI') {
                                if (Array.isArray(val)) {
                                  return getLabelByValue(fieldCode, fieldObj.type, val);
                                }
                                return val;
                              }
                            }

                            // 下拉选择字段 - 显示label而不是value
                            if (fieldType === 'SELECT_SINGLE' || fieldType === 'LOOKUP') {
                              return getLabelByValue(fieldCode, fieldType, val);
                            }

                            // 多选字段
                            if (fieldType === 'SELECT_MULTI') {
                              return getLabelByValue(fieldCode, fieldType, val);
                            }

                            // 系统字段中的下拉类型（使用snake_case格式）
                            if (fieldType === 'SYSTEM') {
                              const dropdownSystemFields = ['gender', 'position', 'job_level', 'employee_type', 'education_level', 'marital_status', 'political_status', 'org_id', 'emergency_relation', 'nation'];
                              if (dropdownSystemFields.includes(fieldCode)) {
                                return getLabelByValue(fieldCode, fieldType, val);
                              }
                            }

                            // 布尔类型
                            if (fieldType === 'BOOLEAN') {
                              return val ? '是' : '否';
                            }

                            // 默认返回字符串
                            return String(val);
                          };

                          return (
                            <Descriptions.Item label={field.fieldName} key={field.id}>
                              {formatValue(value, field.fieldType, field.fieldCode, field)}
                            </Descriptions.Item>
                          );
                        })}
                      </Descriptions>
                    )}
                    </Spin>
                  </Card>
                );
              })
            )}
              </>
            )}
          </div>
        ),
      });
    });

    // 2. 劳动力账户页签（始终在最后）
    items.push({
      key: 'accounts',
      label: '劳动力账户',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/hr/employees')}>
              返回列表
            </Button>
          </div>
          {renderLaborAccounts()}
        </div>
      ),
    });

    return items;
  };

  const tabItems = buildTabItems();
  const defaultActiveKey = tabItems.length > 0 ? tabItems[0].key : 'info';

  return (
    <div>
      <Card title="人员详情">
        <Row gutter={16}>
          <Col span={4} style={{ borderRight: '1px solid #f0f0f0', paddingRight: '16px' }}>
            <Tabs
              defaultActiveKey={defaultActiveKey}
              activeKey={activeTab}
              onChange={setActiveTab}
              tabPosition="left"
              items={tabItems.map(item => ({
                key: item.key,
                label: (
                  <span style={{ padding: '40px 0', display: 'block' }}>
                    {item.label}
                  </span>
                ),
              }))}
              style={{ borderRight: 'none', marginTop: '16px' }}
            />
          </Col>
          <Col span={20} style={{ paddingLeft: '24px' }}>
            {tabItems.find(item => item.key === activeTab)?.children}
          </Col>
        </Row>
      </Card>

      {/* 工作信息更新弹窗 */}
      <Modal
        title="创建新版本 - 选择生效日期"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEffectiveDate(null);
        }}
        footer={null}
        width={500}
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ marginBottom: '16px', color: '#666' }}>
            请输入新版本的异动生效日期：
          </p>
          <DatePicker
            style={{ width: '100%', marginBottom: '16px' }}
            value={effectiveDate}
            onChange={setEffectiveDate}
            placeholder="请选择生效日期"
          />
          <Button
            block
            type="primary"
            onClick={() => {
              setIsCreatingNewVersion(true);
              setEditingTabCode('work_info');
              setEditModalVisible(false);

              // 获取当前工作信息数据
              const workInfoData = currentWorkInfo?.currentWorkInfo || {};

              // 加载所有可能的系统字段（从 employee 对象加载基本信息，从 currentWorkInfo.currentWorkInfo 加载工作信息）
              const systemFieldsData: any = {};

              // 优先从 employee 对象加载基本信息（工号、入职日期等）
              if (employee) {
                if (employee.employeeNo) systemFieldsData.employeeNo = employee.employeeNo;
                if (employee.name) systemFieldsData.name = employee.name;
                if (employee.gender) systemFieldsData.gender = employee.gender;
                if (employee.idCard) systemFieldsData.idCard = employee.idCard;
                if (employee.phone) systemFieldsData.phone = employee.phone;
                if (employee.email) systemFieldsData.email = employee.email;
                if (employee.entryDate) {
                  systemFieldsData.entryDate = dayjs(employee.entryDate);
                }
                if (employee.status) systemFieldsData.status = employee.status;
              }

              // 从 workInfoData (currentWorkInfo.currentWorkInfo) 加载工作信息字段
              const workInfoFieldNames = [
                'orgId', 'position', 'jobLevel', 'employeeType',
                'workLocation', 'workAddress', 'hireDate',
                'probationStart', 'probationEnd', 'probationMonths',
                'regularDate', 'resignationDate', 'resignationReason', 'workYears',
                'changeType'
              ];

              workInfoFieldNames.forEach(fieldName => {
                const value = workInfoData?.[fieldName];
                if (value !== undefined && value !== null) {
                  // 日期字段转换为 dayjs 对象
                  if (fieldName.endsWith('Date') || fieldName.endsWith('date') ||
                      fieldName.endsWith('Start') || fieldName.endsWith('End')) {
                    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                      systemFieldsData[fieldName] = dayjs(value);
                    } else {
                      systemFieldsData[fieldName] = value;
                    }
                  } else {
                    systemFieldsData[fieldName] = value;
                  }
                }
              });

              // 设置生效日期为新选择的日期
              if (effectiveDate) {
                systemFieldsData.effectiveDate = effectiveDate;
              }

              // 获取 customFields 并合并（从 employee 和 workInfoData）
              const employeeCustomFields = employee?.customFields ?
                (typeof employee.customFields === 'string' ? JSON.parse(employee.customFields) : employee.customFields) : {};
              const workInfoCustomFields = workInfoData?.customFields || {};

              const mergedCustomFields = {
                ...employeeCustomFields,
                ...workInfoCustomFields
              };

              // 将自定义字段展开到表单顶层
              const flattenedCustomFields = {};
              Object.entries(mergedCustomFields).forEach(([key, value]) => {
                // 转换日期字段为 dayjs 对象
                if (value && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                  flattenedCustomFields[key] = dayjs(value);
                } else {
                  flattenedCustomFields[key] = value;
                }
              });

              form.setFieldsValue({
                ...systemFieldsData,
                ...flattenedCustomFields,
              });
            }}
            disabled={!effectiveDate}
          >
            确定
          </Button>
        </div>
      </Modal>

      {/* 子表编辑 Modal */}
      <Modal
        title={
          subRecordType === 'education' ? '学历信息' :
          subRecordType === 'workExperience' ? '工作经历' :
          subRecordType === 'familyMember' ? '家庭成员' : ''
        }
        open={subRecordModalVisible}
        onCancel={handleCloseSubRecordModal}
        onOk={handleSaveSubRecord}
        confirmLoading={
          createEducationMutation.isPending ||
          updateEducationMutation.isPending ||
          createWorkExperienceMutation.isPending ||
          updateWorkExperienceMutation.isPending ||
          createFamilyMemberMutation.isPending ||
          updateFamilyMemberMutation.isPending
        }
        width={600}
      >
        <Form form={form} layout="vertical">
          {subRecordType === 'education' && (
            <>
              <Form.Item name="school" label="学校" rules={[{ required: true, message: '请输入学校' }]}>
                <Input placeholder="请输入学校" />
              </Form.Item>
              <Form.Item name="major" label="专业" rules={[{ required: true, message: '请输入专业' }]}>
                <Input placeholder="请输入专业" />
              </Form.Item>
              <Form.Item name="degree" label="学位" rules={[{ required: true, message: '请输入学位' }]}>
                <Input placeholder="如：学士、硕士、博士" />
              </Form.Item>
              <Form.Item name="educationLevel" label="学历层次" rules={[{ required: true, message: '请输入学历层次' }]}>
                <Select placeholder="如：本科、研究生、博士研究生">
                  <Select.Option value="专科">专科</Select.Option>
                  <Select.Option value="本科">本科</Select.Option>
                  <Select.Option value="硕士研究生">硕士研究生</Select.Option>
                  <Select.Option value="博士研究生">博士研究生</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item
                name="startDate"
                label="入学日期"
                rules={[{ required: true, message: '请选择入学日期' }]}
                getValueProps={(value) => ({ value: value && dayjs.isDayjs(value) ? value : (value ? dayjs(value) : null) })}
                normalize={(value) => value}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="endDate"
                label="毕业日期"
                getValueProps={(value) => ({ value: value && dayjs.isDayjs(value) ? value : (value ? dayjs(value) : null) })}
                normalize={(value) => value}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="isHighest" label="是否最高学历" valuePropName="checked">
                <input type="checkbox" />
              </Form.Item>
            </>
          )}

          {subRecordType === 'workExperience' && (
            <>
              <Form.Item name="company" label="公司名称" rules={[{ required: true, message: '请输入公司名称' }]}>
                <Input placeholder="请输入公司名称" />
              </Form.Item>
              <Form.Item name="position" label="职位" rules={[{ required: true, message: '请输入职位' }]}>
                <Input placeholder="请输入职位" />
              </Form.Item>
              <Form.Item
                name="startDate"
                label="开始日期"
                rules={[{ required: true, message: '请选择开始日期' }]}
                getValueProps={(value) => ({ value: value && dayjs.isDayjs(value) ? value : (value ? dayjs(value) : null) })}
                normalize={(value) => value}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="endDate"
                label="结束日期"
                getValueProps={(value) => ({ value: value && dayjs.isDayjs(value) ? value : (value ? dayjs(value) : null) })}
                normalize={(value) => value}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="description" label="工作描述">
                <Input.TextArea rows={4} placeholder="请输入工作描述" />
              </Form.Item>
            </>
          )}

          {subRecordType === 'familyMember' && (
            <>
              <Form.Item name="relationship" label="关系" rules={[{ required: true, message: '请输入关系' }]}>
                <Input placeholder="如：父亲、母亲、配偶等" />
              </Form.Item>
              <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input placeholder="请输入姓名" />
              </Form.Item>
              <Form.Item name="gender" label="性别">
                <Select placeholder="请选择性别" allowClear>
                  <Select.Option value="男">男</Select.Option>
                  <Select.Option value="女">女</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="idCard" label="身份证号">
                <Input placeholder="请输入身份证号" />
              </Form.Item>
              <Form.Item name="phone" label="联系电话">
                <Input placeholder="请输入联系电话" />
              </Form.Item>
              <Form.Item name="workUnit" label="工作单位">
                <Input placeholder="请输入工作单位" />
              </Form.Item>
              <Form.Item
                name="birthDate"
                label="出生日期"
                getValueProps={(value) => ({ value: value && dayjs.isDayjs(value) ? value : (value ? dayjs(value) : null) })}
                normalize={(value) => value}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="isEmergency" label="是否紧急联系人" valuePropName="checked">
                <input type="checkbox" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default EmployeeDetailPage;
