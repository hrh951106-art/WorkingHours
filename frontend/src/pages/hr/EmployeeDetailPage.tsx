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
  Popconfirm,
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
  List,
  Dropdown,
  Avatar,
  Divider,
  Upload,
  Alert,
} from 'antd';

const { Option } = Select;
import {
  ArrowLeftOutlined,
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  HistoryOutlined,
  SaveOutlined,
  CloseOutlined,
  UserOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
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

  // 异动操作类型状态
  const [changeOperationType, setChangeOperationType] = useState<'TRANSFER' | 'RESIGNATION' | null>(null);

  // 金额系数相关状态
  const [isBasicInfoEdit, setIsBasicInfoEdit] = useState(false);
  const [coefficientModalOpen, setCoefficientModalOpen] = useState(false);
  const [editingCoefficient, setEditingCoefficient] = useState<any>(null);
  const [coefficientForm] = Form.useForm();

  // 考勤规则组相关状态
  const [ruleGroupGrantModalOpen, setRuleGroupGrantModalOpen] = useState(false);
  const [ruleGroupEditModalOpen, setRuleGroupEditModalOpen] = useState(false);
  const [editingRuleGroupRecord, setEditingRuleGroupRecord] = useState<any>(null);
  const [ruleGroupGrantForm] = Form.useForm();
  const [ruleGroupEditForm] = Form.useForm();

  // 照片上传相关状态
  const [photoFileList, setPhotoFileList] = useState<any[]>([]);
  const [photoUploadUrl, setPhotoUploadUrl] = useState<string>('');

  const queryClient = useQueryClient();

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => request.get(`/hr/employees/${id}`).then((res: any) => res),
    enabled: !!id && id !== 'new',
  });

  // 当员工数据加载时，初始化照片上传组件的值
  useEffect(() => {
    if (employee?.photo) {
      setPhotoUploadUrl(employee.photo);
      setPhotoFileList([{
        uid: '-1',
        name: 'photo.jpg',
        status: 'done',
        url: employee.photo,
      }]);
    }
  }, [employee]);

  const { data: accounts } = useQuery({
    queryKey: ['employeeAccounts', id],
    queryFn: () => request.get(`/hr/employees/${id}/accounts`).then((res: any) => res),
    enabled: !!id && id !== 'new',
  });

  // 重新生成账户的mutation
  const regenerateAccountsMutation = useMutation({
    mutationFn: () => {
      console.log('🔄 开始重新生成账户, 员工ID:', id);
      return request.post(`/hr/employees/${id}/accounts/regenerate`);
    },
    onSuccess: (result: any) => {
      console.log('✅ 重新生成账户成功:', result);
      message.success(result?.message || '重新生成账户成功');
      queryClient.invalidateQueries({ queryKey: ['employeeAccounts', id] });
    },
    onError: (error: any) => {
      console.error('❌ 重新生成账户失败:', error);
      console.error('❌ 错误响应:', error?.response);
      console.error('❌ 错误数据:', error?.response?.data);
      const errorMsg = error?.response?.data?.message || error?.message || '重新生成账户失败';
      message.error(errorMsg);
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

  // 确保 infoTabs 是数组
  const infoTabsList = Array.isArray(infoTabs) ? infoTabs : [];

  // 设置默认激活第一个页签
  useEffect(() => {
    if (infoTabsList && infoTabsList.length > 0 && activeTab === 'info') {
      setActiveTab(infoTabsList[0].code);
    }
  }, [infoTabsList]);

  const { data: customFields } = useQuery({
    queryKey: ['customFields'],
    queryFn: () => request.get('/hr/custom-fields').then((res: any) => res || []),
  });

  // 确保 customFields 是数组
  const customFieldsList = Array.isArray(customFields) ? customFields : [];

  const { data: dataSources } = useQuery({
    queryKey: ['dataSources'],
    queryFn: () => request.get('/hr/data-sources').then((res: any) => res || []),
  });

  // 确保 dataSources 是数组
  const dataSourcesList = Array.isArray(dataSources) ? dataSources : [];

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

  // 获取固定的当前版本信息（用于异动记录列表显示，不受选中影响）
  const { data: fixedCurrentWorkInfo } = useQuery({
    queryKey: ['workInfo', id, 'current-fixed'],
    queryFn: () => request.get(`/hr/employees/${id}/work-info/current`).then((res: any) => res),
    enabled: !!id && id !== 'new',
  });

  // 获取指定版本的工作信息（根据选中状态变化）
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
      await queryClient.refetchQueries({ queryKey: ['workInfo', id, 'current-fixed'] }); // 刷新固定的当前版本
      await queryClient.refetchQueries({ queryKey: ['workInfoVersions', id] });

      setEditingTabCode(null);
      form.resetFields();
      setEditingWorkInfoHistoryId(null);
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

  // 金额系数相关查询和变更
  const { data: coefficients, isLoading: coefficientsLoading } = useQuery({
    queryKey: ['employeeCoefficients', id],
    queryFn: async () => {
      const res = await request.get(`/amount/employee-coefficients?employeeId=${id}`);
      // 后端返回 { items, total, page, pageSize, totalPages }
      // 确保返回数组格式
      const data = res.items || res.data || res;
      return Array.isArray(data) ? data : [];
    },
    enabled: !!id && id !== 'new',
  });

  const saveCoefficientMutation = useMutation({
    mutationFn: async (data: any) => {
      // 处理日期字段格式
      const submitData = {
        ...data,
        effectiveDate: data.effectiveDate ? dayjs(data.effectiveDate).format('YYYY-MM-DD') : null,
        expiryDate: data.expiryDate ? dayjs(data.expiryDate).format('YYYY-MM-DD') : null,
      };

      console.log('💰 保存金额系数 - 原始数据:', data);
      console.log('💰 保存金额系数 - 提交数据:', submitData);
      console.log('💰 编辑中的系数:', editingCoefficient);

      if (editingCoefficient) {
        console.log('💰 发送PUT请求到:', `/amount/employee-coefficients/${editingCoefficient.id}`);
        const res = await request.put(`/amount/employee-coefficients/${editingCoefficient.id}`, submitData);
        return res;
      }
      console.log('💰 发送POST请求到:', '/amount/employee-coefficients');
      const res = await request.post('/amount/employee-coefficients', { ...submitData, employeeId: parseInt(id as string) });
      return res;
    },
    onSuccess: () => {
      message.success('保存成功');
      queryClient.invalidateQueries({ queryKey: ['employeeCoefficients', id] });
      setCoefficientModalOpen(false);
      setEditingCoefficient(null);
      coefficientForm.resetFields();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '保存失败');
    },
  });

  const deleteCoefficientMutation = useMutation({
    mutationFn: (coefficientId: number) => {
      const res = request.delete(`/amount/employee-coefficients/${coefficientId}`);
      return res;
    },
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['employeeCoefficients', id] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '删除失败');
    },
  });

  // 考勤规则组相关查询和变更
  const { data: ruleGroupsData, isLoading: ruleGroupsLoading } = useQuery({
    queryKey: ['employeeRuleGroups', id],
    queryFn: async () => {
      const res = await request.get(`/attendance-rule-groups/employee-groups/${id}`);
      return res;
    },
    enabled: !!id && id !== 'new',
  });

  const ruleGroups = ruleGroupsData?.items || [];

  const { data: allRuleGroupsData } = useQuery({
    queryKey: ['allAttendanceRuleGroups'],
    queryFn: async () => {
      const res = await request.get('/attendance-rule-groups?status=ACTIVE');
      return res;
    },
  });

  const allRuleGroups = allRuleGroupsData?.items || [];

  const updateRuleGroupMutation = useMutation({
    mutationFn: async (data: any) => {
      // 处理日期字段：将 dayjs 对象转换为字符串
      // 处理数字字段：将字符串转换为数字（Select 组件返回的是字符串）
      const processedData = {
        ruleGroupId: typeof data.ruleGroupId === 'string' ? Number(data.ruleGroupId) : data.ruleGroupId,
        effectiveDate: data.effectiveDate ? data.effectiveDate.format('YYYY-MM-DD') : undefined,
        expiryDate: data.expiryDate ? data.expiryDate.format('YYYY-MM-DD') : null,
        reason: data.reason,
      };

      console.log('🔍 更新考勤规则组 - 原始表单数据:', JSON.stringify(data, null, 2));
      console.log('🔍 更新考勤规则组 - 处理后数据:', JSON.stringify(processedData, null, 2));
      console.log('🔍 ruleGroupId 类型:', typeof processedData.ruleGroupId, '值:', processedData.ruleGroupId);
      console.log('🔍 请求 URL:', `/attendance-rule-groups/employee-groups/${id}`);

      await request.put(`/attendance-rule-groups/employee-groups/${id}`, processedData);
    },
    onSuccess: () => {
      message.success('更新成功');
      queryClient.invalidateQueries({ queryKey: ['employeeRuleGroups'] });
      setRuleGroupEditModalOpen(false);
      setEditingRuleGroupRecord(null);
      ruleGroupEditForm.resetFields();
    },
    onError: (error: any) => {
      console.error('更新考勤规则组失败:', error);
      const errorMsg = error?.response?.data?.message || error?.message || '更新失败';
      message.error(errorMsg);
    },
  });

  const grantRuleGroupMutation = useMutation({
    mutationFn: async (data: any) => {
      // 处理日期字段：将 dayjs 对象转换为字符串
      // 处理数字字段：将字符串转换为数字（Select 组件返回的是字符串）
      const processedData = {
        ...data,
        ruleGroupId: typeof data.ruleGroupId === 'string' ? Number(data.ruleGroupId) : data.ruleGroupId,
        effectiveDate: data.effectiveDate ? data.effectiveDate.format('YYYY-MM-DD') : undefined,
        expiryDate: data.expiryDate ? data.expiryDate.format('YYYY-MM-DD') : null,
      };

      console.log('处理后的数据:', processedData);
      console.log('员工ID (字符串):', id, '类型:', typeof id);
      console.log('员工ID (数字):', Number(id), '类型:', typeof Number(id));

      await request.post('/attendance-rule-groups/grant-to-employees', {
        ...processedData,
        employeeIds: [Number(id)], // 将字符串转换为数字
      });
    },
    onSuccess: () => {
      message.success('授予成功');
      queryClient.invalidateQueries({ queryKey: ['employeeRuleGroups'] });
      setRuleGroupGrantModalOpen(false);
      ruleGroupGrantForm.resetFields();
    },
    onError: (error: any) => {
      console.error('授予考勤规则组失败:', error);
      const errorMsg = error?.response?.data?.message || error?.message || '授予失败';
      message.error(errorMsg);
    },
  });

  // 删除考勤规则组记录
  const deleteRuleGroupMutation = useMutation({
    mutationFn: async (recordId: number) => {
      return await request.delete(`/attendance-rule-groups/employee-groups/${recordId}`);
    },
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['employeeRuleGroups'] });
    },
    onError: (error: any) => {
      console.error('删除考勤规则组失败:', error);
      const errorMsg = error?.response?.data?.message || error?.message || '删除失败';
      message.error(errorMsg);
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
      title: '劳动力账户',
      dataIndex: 'namePath',
      key: 'namePath',
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

  // 渲染员工金额系数
  // 渲染员工金额系数
  const renderEmployeeCoefficient = () => {
    const columns = [
      {
        title: '数值',
        dataIndex: 'coefficient',
        key: 'coefficient',
        render: (value: number) => (
          <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px' }}>
            {value}
          </Tag>
        ),
      },
      {
        title: '生效日期',
        dataIndex: 'effectiveDate',
        key: 'effectiveDate',
        render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      },
      {
        title: '失效日期',
        dataIndex: 'expiryDate',
        key: 'expiryDate',
        render: (date: string | null) => (date ? dayjs(date).format('YYYY-MM-DD') : '永久'),
      },
      {
        title: '调整原因',
        dataIndex: 'reason',
        key: 'reason',
        ellipsis: true,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (status: string) =>
          status === 'ACTIVE' ? <Tag color="success">启用</Tag> : <Tag color="default">停用</Tag>,
      },
      {
        title: '操作',
        key: 'action',
        width: 150,
        render: (_: any, record: any) => (
          <Space>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingCoefficient(record);
                coefficientForm.setFieldsValue({
                  coefficient: record.coefficient,
                  effectiveDate: dayjs(record.effectiveDate),
                  expiryDate: record.expiryDate ? dayjs(record.expiryDate) : null,
                  reason: record.reason || '',
                  status: record.status || 'ACTIVE',
                });
                setCoefficientModalOpen(true);
              }}
            >
              编辑
            </Button>
            <Popconfirm
              title="确认删除"
              description="删除后不可恢复"
              onConfirm={() => deleteCoefficientMutation.mutate(record.id)}
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ];

    return (
      <Card
        title="金额"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditingCoefficient(null);
            coefficientForm.resetFields();
            setCoefficientModalOpen(true);
          }}>
            新增
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={coefficients || []}
          rowKey="id"
          loading={coefficientsLoading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />

        <Modal
          title={editingCoefficient ? '编辑金额系数' : '新增金额系数'}
          open={coefficientModalOpen}
          onOk={() => coefficientForm.submit()}
          onCancel={() => {
            setCoefficientModalOpen(false);
            setEditingCoefficient(null);
            coefficientForm.resetFields();
          }}
          width={600}
          confirmLoading={saveCoefficientMutation.isPending}
        >
          <Form form={coefficientForm} layout="vertical" style={{ marginTop: 24 }} onFinish={saveCoefficientMutation.mutate}>
            <Form.Item
              label="系数值"
              name="coefficient"
              rules={[{ required: true, message: '请输入系数值' }]}
            >
              <InputNumber min={0} step={0.1} precision={2} style={{ width: '100%' }} placeholder="例如：20" />
            </Form.Item>

            <Form.Item
              label="生效日期"
              name="effectiveDate"
              rules={[{ required: true, message: '请选择生效日期' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="失效日期"
              name="expiryDate"
              tooltip="留空表示永久有效"
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="调整原因"
              name="reason"
            >
              <Input.TextArea rows={3} placeholder="请输入调整原因" maxLength={200} showCount />
            </Form.Item>

            <Form.Item
              label="状态"
              name="status"
              initialValue="ACTIVE"
            >
              <Select
                options={[
                  { label: '启用', value: 'ACTIVE' },
                  { label: '停用', value: 'INACTIVE' },
                ]}
              />
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    );
  };

  // 渲染员工考勤规则组
  const renderEmployeeRuleGroups = () => {
    const columns = [
      {
        title: '规则组名称',
        dataIndex: ['ruleGroup', 'name'],
        key: 'ruleGroupName',
      },
      {
        title: '生效日期',
        dataIndex: 'effectiveDate',
        key: 'effectiveDate',
        render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      },
      {
        title: '失效日期',
        dataIndex: 'expiryDate',
        key: 'expiryDate',
        render: (date: string | null) => (date ? dayjs(date).format('YYYY-MM-DD') : '永久'),
      },
      {
        title: '是否当前',
        dataIndex: 'isCurrent',
        key: 'isCurrent',
        render: (isCurrent: boolean) =>
          isCurrent ? <Tag color="success">当前</Tag> : <Tag>历史</Tag>,
      },
      {
        title: '授予原因',
        dataIndex: 'reason',
        key: 'reason',
        ellipsis: true,
      },
      {
        title: '授予时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      },
      {
        title: '操作',
        key: 'action',
        width: 150,
        render: (_: any, record: any) => (
          <Space>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingRuleGroupRecord(record);
                ruleGroupEditForm.setFieldsValue({
                  ruleGroupId: record.ruleGroupId,
                  effectiveDate: dayjs(record.effectiveDate),
                  expiryDate: record.expiryDate ? dayjs(record.expiryDate) : null,
                  reason: record.reason,
                });
                setRuleGroupEditModalOpen(true);
              }}
            >
              编辑
            </Button>
            <Popconfirm
              title="删除确认"
              description="确定要删除这条考勤规则组记录吗？"
              onConfirm={() => deleteRuleGroupMutation.mutate(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                disabled={record.isCurrent}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ];

    return (
      <Card
        title="考勤规则组历史"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              ruleGroupGrantForm.resetFields();
              setRuleGroupGrantModalOpen(true);
            }}
          >
            授予新规则组
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={ruleGroups}
          rowKey="id"
          loading={ruleGroupsLoading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
        />

        {/* Grant Modal */}
        <Modal
          title="授予考勤规则组"
          open={ruleGroupGrantModalOpen}
          onOk={() => ruleGroupGrantForm.submit()}
          onCancel={() => {
            setRuleGroupGrantModalOpen(false);
            ruleGroupGrantForm.resetFields();
          }}
          width={600}
          confirmLoading={grantRuleGroupMutation.isPending}
        >
          <Form
            form={ruleGroupGrantForm}
            layout="vertical"
            style={{ marginTop: 24 }}
            onFinish={(values) => {
              console.log('授予考勤规则组表单数据:', values);
              grantRuleGroupMutation.mutate(values);
            }}
          >
            <Form.Item
              label="规则组"
              name="ruleGroupId"
              rules={[{ required: true, message: '请选择规则组' }]}
            >
              <Select placeholder="请选择规则组" showSearch optionFilterProp="children">
                {allRuleGroups.map((rg: any) => (
                  <Select.Option key={rg.id} value={rg.id}>
                    {rg.name} ({rg.code})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="生效日期"
              name="effectiveDate"
              rules={[{ required: true, message: '请选择生效日期' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="失效日期" name="expiryDate" tooltip="留空表示永久有效">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="授予原因" name="reason">
              <Input.TextArea rows={3} placeholder="请输入授予原因" maxLength={200} showCount />
            </Form.Item>
          </Form>
        </Modal>

        {/* Edit Modal */}
        <Modal
          title="编辑考勤规则组"
          open={ruleGroupEditModalOpen}
          onOk={() => ruleGroupEditForm.submit()}
          onCancel={() => {
            setRuleGroupEditModalOpen(false);
            setEditingRuleGroupRecord(null);
            ruleGroupEditForm.resetFields();
          }}
          width={600}
          confirmLoading={updateRuleGroupMutation.isPending}
        >
          <Form
            form={ruleGroupEditForm}
            layout="vertical"
            style={{ marginTop: 24 }}
            onFinish={(values) => {
              console.log('🔍 表单提交的原始值:', JSON.stringify(values, null, 2));
              // 明��只提取需要的字段，避免额外的字段
              const { ruleGroupId, effectiveDate, expiryDate, reason } = values;
              const cleanValues = { ruleGroupId, effectiveDate, expiryDate, reason };
              console.log('🔍 清理后的值:', JSON.stringify(cleanValues, null, 2));
              updateRuleGroupMutation.mutate(cleanValues);
            }}
          >
            <Form.Item label="规则组" name="ruleGroupId">
              <Select placeholder="请选择规则组" showSearch optionFilterProp="children" disabled>
                {allRuleGroups.map((rg: any) => (
                  <Select.Option key={rg.id} value={rg.id}>
                    {rg.name} ({rg.code})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="生效日期"
              name="effectiveDate"
              rules={[{ required: true, message: '请选择生效日期' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="失效日期" name="expiryDate" tooltip="留空表示永久有效">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="授予原因" name="reason">
              <Input.TextArea rows={3} placeholder="请输入授予原因" maxLength={200} showCount />
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    );
  };

  // 判断是否为工作信息页签
  const isWorkInfoTab = (tabCode: string) => {
    return tabCode === 'work_info';
  };

  // 加载表单数据
  const loadFormData = (workInfoData: any, type?: string) => {
    // 获取当前工作信息数据
    const data = workInfoData || {};
    setEditingWorkInfoHistoryId(data?.id || null);

    // 加载所有可能的系统字段
    const systemFieldsData: any = {};

    // 优先从 employee 对象加载基本信息
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

    // 从 workInfoData 加载工作信息字段
    const workInfoFieldNames = [
      'orgId', 'position', 'jobLevel', 'employeeType',
      'workLocation', 'workAddress', 'hireDate',
      'probationStart', 'probationEnd', 'probationMonths',
      'regularDate', 'resignationDate', 'resignationReason', 'workYears',
      'costCenter', 'employmentRelation',
    ];

    workInfoFieldNames.forEach(fieldName => {
      const value = data?.[fieldName];
      if (value !== undefined && value !== null) {
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

    // 获取并合并 customFields
    const employeeCustomFields = employee?.customFields ?
      (typeof employee.customFields === 'string' ? JSON.parse(employee.customFields) : employee.customFields) : {};
    const workInfoCustomFields = data?.customFields || {};

    const mergedCustomFields = {
      ...employeeCustomFields,
      ...workInfoCustomFields
    };

    // 将自定义字段展开到表单顶层
    const flattenedCustomFields = {};
    Object.entries(mergedCustomFields).forEach(([key, value]) => {
      if (value && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        flattenedCustomFields[key] = dayjs(value);
      } else {
        flattenedCustomFields[key] = value;
      }
    });

    // 合并所有字段，确保 changeType 在最外层
    const formData = {
      ...flattenedCustomFields,
      ...systemFieldsData,
      changeType: type || data?.changeType || 'EDIT', // 确保异动类型被正确设置
    };

    console.log('设置表单数据:', formData);

    form.setFieldsValue(formData);
  };

  // 处理异动/离职操作
  const handleChangeOperation = (type: 'TRANSFER' | 'RESIGNATION') => {
    setChangeOperationType(type);
    setEditingTabCode('work_info');
    setIsCreatingNewVersion(false);

    // 获取当前工作信息数据
    const workInfoData = currentWorkInfo?.currentWorkInfo || {};

    // 使用 loadFormData 函数加载表单数据
    loadFormData(workInfoData, type);
  };

  // 处理编辑按钮点击
  const handleEditTab = (tabCode: string) => {
    const isWorkInfo = isWorkInfoTab(tabCode);

    if (isWorkInfo) {
      // 工作信息需要选择是创建新版本还是编辑当前版本
      setEditingTabCode(tabCode);
      setEditModalVisible(true);
      // 获取当前工作信息数据
      const workInfoData = currentWorkInfo?.currentWorkInfo || {};
      setEditingWorkInfoHistoryId(workInfoData?.id || null);
      loadFormData(workInfoData, workInfoData?.changeType || 'EDIT');
      setIsCreatingNewVersion(false);
      setChangeOperationType(null);
      setIsBasicInfoEdit(false);  // 标记为非基本信息编辑
      return;
    }

    // 非工作信息页签（基本信息），直接编辑不需要版本控制
    setEditingTabCode(tabCode);
    loadFormData(employee);
    setIsCreatingNewVersion(false);
    setChangeOperationType(null);
    setIsBasicInfoEdit(true);  // 标记为基本信息编辑
    setEditModalVisible(true);
  };

  // 处理异动记录编辑
  const handleEditVersion = async (versionItem: any) => {
    try {
      // 先切换到工作信息页签
      setActiveTab('work_info');

      // 如果是当前版本，先切换选中状态再编辑
      if (versionItem.isCurrent) {
        // 确保当前选中的是 'current'
        setSelectedWorkInfoVersion('current');
        // 等待数据加载
        await refetchWorkInfo();

        // 使用当前版本数据
        const workInfoData = currentWorkInfo?.currentWorkInfo || {};
        if (!workInfoData || !workInfoData.id) {
          message.error('当前版本数据未加载完成，请稍后再试');
          return;
        }
        setEditingWorkInfoHistoryId(workInfoData?.id || null);
        loadFormData(workInfoData, workInfoData?.changeType || 'EDIT');
      } else {
        // 如果是历史版本，需要获取该版本的详细数据
        const versionData = await request.get(`/hr/employees/${id}/work-info/${versionItem.id}`).then((res: any) => res);
        const workInfoData = versionData?.currentWorkInfo || {};
        if (!workInfoData || !workInfoData.id) {
          message.error('历史版本数据加载失败');
          return;
        }
        setEditingWorkInfoHistoryId(workInfoData?.id || parseInt(versionItem.id));
        loadFormData(workInfoData, workInfoData?.changeType || 'EDIT');
      }

      // 打开编辑界面
      setEditingTabCode('work_info');
      setIsCreatingNewVersion(false);
      setChangeOperationType(null);
    } catch (error) {
      console.error('加载版本数据失败:', error);
      message.error(`加载版本数据失败: ${error?.response?.data?.message || error?.message || '未知错误'}`);
    }
  };

  // 处理取消编辑
  const handleCancelEdit = () => {
    setEditingTabCode(null);
    setIsBasicInfoEdit(false);  // 重置基本信息编辑标记
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
    // 如果是异动/离职操作，不需要验证生效日期
    if (!effectiveDate && createNewVersion && !changeOperationType) {
      message.error('请选择生效日期');
      return;
    }

    try {
      const values = await form.validateFields();

      // 如果是基本信息编辑（非工作信息页签），直接更新员工信息
      if (isBasicInfoEdit) {
        console.log('基本信息编辑 - 直接更新员工信息');
        
        // 基本���息字段列表
        const basicInfoFields = ['employeeNo', 'name', 'gender', 'idCard', 'phone', 'email',
                                   'birthDate', 'entryDate', 'status', 'age', 'photo', 'maritalStatus',
                                   'nativePlace', 'politicalStatus', 'householdRegister', 'currentAddress',
                                   'emergencyContact', 'emergencyPhone', 'emergencyRelation',
                                   'homeAddress', 'homePhone'];
        
        // 构建要更新的数据
        const updateData: any = {};
        basicInfoFields.forEach(field => {
          if (values[field] !== undefined && values[field] !== null) {
            if (dayjs.isDayjs(values[field])) {
              updateData[field] = values[field].format('YYYY-MM-DD');
            } else {
              updateData[field] = values[field];
            }
          }
        });
        
        console.log('提交基本信息更新:', updateData);
        
        try {
          await request.put(`/hr/employees/${id}`, updateData);
          message.success('保存成功');
          setIsBasicInfoEdit(false);
          setEditingTabCode(null);
          setEditModalVisible(false);
          form.resetFields();
          await queryClient.refetchQueries({ queryKey: ['employee', id] });
        } catch (error: any) {
          console.error('基本信息更新失败:', error);
          const errorMsg = error?.response?.data?.message || error?.message || '保存失败';
          message.error(errorMsg);
        }
        return;
      }

      // 如果是异动/离职操作，调用专门的API
      if (changeOperationType) {
        // 基本信息字段列表（这些字段不参与异动保存）
        const basicInfoFields = ['employeeNo', 'name', 'gender', 'idCard', 'phone', 'email',
                                   'birthDate', 'entryDate', 'status', 'age', 'photo', 'maritalStatus',
                                   'nativePlace', 'politicalStatus', 'householdRegister', 'currentAddress',
                                   'emergencyContact', 'emergencyPhone', 'emergencyRelation',
                                   'homeAddress', 'homePhone'];

        // 构建自定义字段对象，只包含工作信息相关的自定义字段
        const customFieldsData: any = {};
        const workInfoCustomFieldKeys = ['employmentRelation', 'jobPost', 'positionTitle', 'costCenter',
                                           'usageStartDate', 'serviceYearsStartDate', 'estimatedProbationEndDate'];

        workInfoCustomFieldKeys.forEach(key => {
          if (values[key] !== undefined && values[key] !== null) {
            if (dayjs.isDayjs(values[key])) {
              customFieldsData[key] = values[key].format('YYYY-MM-DD');
            } else {
              customFieldsData[key] = values[key];
            }
          }
        });

        // 构建提交数据
        const changeData: any = {
          changeType: values.changeType,
          effectiveDate: values.effectiveDate?.format('YYYY-MM-DD'),
          customFields: customFieldsData,
        };

        // 根据异动类型添加字段
        if (values.changeType === 'RESIGNATION') {
          changeData.resignationDate = values.resignationDate?.format('YYYY-MM-DD');
          changeData.resignationReason = values.resignationReason;
        }

        // 只添加工作信息字段（系统字段），明确排除基本信息字段
        const workInfoFields = ['orgId', 'position', 'jobLevel', 'employeeType', 'workLocation',
                                 'workAddress', 'hireDate', 'probationStart', 'probationEnd',
                                 'probationMonths', 'regularDate', 'costCenter', 'employmentRelation'];

        workInfoFields.forEach(field => {
          // 跳过基本信息字段
          if (basicInfoFields.includes(field)) {
            return;
          }
          if (values[field] !== undefined && values[field] !== null) {
            if (dayjs.isDayjs(values[field])) {
              changeData[field] = values[field].format('YYYY-MM-DD');
            } else {
              changeData[field] = values[field];
            }
          }
        });

        console.log('提交异动数据:', changeData);

        try {
          await request.post(`/hr/employees/${id}/work-info-changes`, changeData);
          message.success('操作成功');
          setChangeOperationType(null);
          setEditingTabCode(null);
          form.resetFields();
          // 使用正确的查询键重新获取数据
          await queryClient.refetchQueries({ queryKey: ['workInfo', id, 'current'] });
          await queryClient.refetchQueries({ queryKey: ['workInfoVersions', id] });
          await queryClient.refetchQueries({ queryKey: ['employee', id] });
        } catch (error: any) {
          console.error('异动操作失败:', error);
          console.error('错误详情:', error?.response);
          const errorMsg = error?.response?.data?.message || error?.message || '操作失败，请检查后端服务是否正常运行';
          message.error(errorMsg);
        }
        return;
      }

      // 将表单值转换为后端需要的格式
      const customFieldsToSave: any = {};  // 职位信息（支持时间轴）
      const employeeFieldsToSave: any = {}; // 入职信息（不支持时间轴）

      // 基本信息字段（这些字段不属于工作信息，不需要保存）
      const basicInfoFields = ['employeeNo', 'name', 'gender', 'idCard', 'phone', 'email', 'birthDate', 'probationStart', 'probationEnd', 'status'];

      // 职位信息（支持时间轴，保存到 customFields）
      const positionInfoFields = ['position', 'jobLevel', 'employeeType', 'orgId', 'workLocation', 'workAddress', 'costCenter', 'cost_center', 'employmentRelation', 'employment_relation'];

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
  const dropdownFields = customFieldsList.filter((f: any) =>
    f.type === 'SELECT_SINGLE' || f.type === 'SELECT_MULTI' || f.type === 'LOOKUP'
  );

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
    const dataSource = dataSourcesList.find((ds: any) => ds.code === dataSourceCode);
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
      if (fieldCode === 'gender') {
        const options = getOptionsByDataSourceCode('GENDER');
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
        const options = getOptionsByDataSourceCode('EDUCATION_LEVEL');
        const option = options.find((opt: any) => opt.value === value);
        return option?.label || value;
      }
      if (fieldCode === 'educationType' || fieldCode === 'education_type') {
        const options = getOptionsByDataSourceCode('EDUCATION_TYPE');
        const option = options.find((opt: any) => opt.value === value);
        return option?.label || value;
      }
      if (fieldCode === 'maritalStatus' || fieldCode === 'marital_status') {
        const options = getOptionsByDataSourceCode('MARITAL_STATUS');
        const option = options.find((opt: any) => opt.value === value);
        return option?.label || value;
      }
      if (fieldCode === 'politicalStatus' || fieldCode === 'political_status') {
        const options = getOptionsByDataSourceCode('POLITICAL_STATUS');
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
        const options = getOptionsByDataSourceCode('EMPLOYMENT_STATUS');
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
        const options = getOptionsByDataSourceCode('EMERGENCY_CONTACT_RELATION');
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
        const options = getOptionsByDataSourceCode('NATION');
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
      // 工作地点
      if (fieldCode === 'workLocation' || fieldCode === 'work_location') {
        const options = getOptionsByDataSourceCode('WORK_LOCATION');
        if (options && options.length > 0) {
          const option = options.find((opt: any) => opt.value === value);
          return option?.label || value;
        }
        return value;
      }
      // 人员类型（自定义字段A06）
      if (fieldCode === 'A06' || fieldCode === 'person_type') {
        const options = getOptionsByDataSourceCode('EmpType');
        if (options && options.length > 0) {
          const option = options.find((opt: any) => opt.value === value);
          return option?.label || value;
        }
      }
      // 工作关系
      if (fieldCode === 'employmentRelation' || fieldCode === 'employment_relation') {
        const options = getOptionsByDataSourceCode('EMPLOYMENT_RELATION');
        if (options && options.length > 0) {
          const option = options.find((opt: any) => opt.value === value);
          return option?.label || value;
        }
      }
      // 成本中心
      if (fieldCode === 'costCenter' || fieldCode === 'cost_center') {
        const options = getOptionsByDataSourceCode('COST_CENTER');
        if (options && options.length > 0) {
          const option = options.find((opt: any) => opt.value === value);
          return option?.label || value;
        }
      }
      // 岗位
      if (fieldCode === 'jobPost' || fieldCode === 'job_post') {
        const options = getOptionsByDataSourceCode('JOB_POST');
        if (options && options.length > 0) {
          const option = options.find((opt: any) => opt.value === value);
          return option?.label || value;
        }
      }
      // 职务
      if (fieldCode === 'positionTitle' || fieldCode === 'position_title') {
        const options = getOptionsByDataSourceCode('POSITION_TITLE');
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
    // 如果已经是驼峰格式，直接返回
    if (!code.includes('_')) {
      return code;
    }

    const fieldMapping: Record<string, string> = {
      employee_no: 'employeeNo',
      id_card: 'idCard',
      org_id: 'orgId',
      dept_id: 'deptId',
      job_level: 'jobLevel',
      job_post: 'jobPost',
      position_title: 'positionTitle',
      cost_center: 'costCenter',
      employee_type: 'employeeType',
      employment_relation: 'employmentRelation',
      work_location: 'workLocation',
      work_address: 'workAddress',
      entry_date: 'entryDate',
      hire_date: 'hireDate',
      probation_start: 'probationStart',
      probation_end: 'probationEnd',
      probation_months: 'probationMonths',
      regular_date: 'regularDate',
      usage_start_date: 'usageStartDate',
      service_years_start_date: 'serviceYearsStartDate',
      estimated_probation_end_date: 'estimatedProbationEndDate',
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
        positionTitle: '职务',
        jobLevel: '职级',
        jobPost: '岗位',
        costCenter: '成本中心',
        employeeType: '员工类型',
        employmentRelation: '工作关系',
        workLocation: '工作地点',
        workAddress: '办公地址',
        entryDate: '入职日期',
        hireDate: '受雇日期',
        regularDate: '转正日期',
        usageStartDate: '使用开始日期',
        serviceYearsStartDate: '工龄开始日期',
        estimatedProbationEndDate: '预计试用结束日期',
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
        resignationReason: '离职原因',
        workYears: '工作年限',
        probationMonths: '试用期（月）',
        changeType: '异动类型',
        effectiveDate: '生效日期',
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
        const genderOptions = getOptionsByDataSourceCode('GENDER');
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

      case 'photo': {
        return (
          <Form.Item
            name="photo"
            label="照片"
            key={fieldCode}
            getValueProps={(value) => ({
              value: photoUploadUrl,
            })}
          >
            <Upload
              listType="picture-card"
              fileList={photoFileList}
              maxCount={1}
              beforeUpload={(uploadFile) => {
                const isImage = uploadFile.type.startsWith('image/');
                if (!isImage) {
                  message.error('只能上传图片文件');
                  return Upload.LIST_IGNORE;
                }
                const isLt2M = uploadFile.size / 1024 / 1024 < 2;
                if (!isLt2M) {
                  message.error('图片大小不能超过 2MB');
                  return Upload.LIST_IGNORE;
                }
                return true;
              }}
              customRequest={({ onSuccess, file: uploadFile }) => {
                // 这里模拟上传成功，实际项目中需要调用真实的上传接口
                setTimeout(() => {
                  const fileUrl = URL.createObjectURL(uploadFile as File);
                  setPhotoUploadUrl(fileUrl);
                  form.setFieldValue('photo', fileUrl);
                  onSuccess?.({});
                }, 1000);
              }}
              onChange={({ fileList: newFileList }) => {
                setPhotoFileList(newFileList);
              }}
            >
              {photoFileList.length === 0 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上传照片</div>
                </div>
              )}
            </Upload>
          </Form.Item>
        );
      }

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
      case 'regularDate':
      case 'regular_date':
      case 'resignationDate':
      case 'resignation_date':
      case 'usageStartDate':
      case 'serviceYearsStartDate':
      case 'estimatedProbationEndDate':
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
          <Form.Item
            name="age"
            label={label}
            key={fieldCode}
            getValueProps={(value) => ({
              value: employee?.birthDate ? `${dayjs().diff(dayjs(employee.birthDate), 'year')}岁` : '',
            })}
          >
            <Input placeholder="自动计算" disabled />
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
        const educationLevelOptions = getOptionsByDataSourceCode('EDUCATION_LEVEL');
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
        const maritalStatusOptions = getOptionsByDataSourceCode('MARITAL_STATUS');
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
        const politicalStatusOptions = getOptionsByDataSourceCode('POLITICAL_STATUS');
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
        const employmentStatusOptions = getOptionsByDataSourceCode('EMPLOYMENT_STATUS');
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

      case 'nation':
        const nationOptions = getOptionsByDataSourceCode('NATION');
        return (
          <Form.Item name="nation" label={label} rules={createRules()} key={fieldCode}>
            <Select placeholder={`请选择${label}`} allowClear showSearch>
              {nationOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'emergencyRelation':
      case 'emergency_relation':
        const emergencyRelationOptions = getOptionsByDataSourceCode('EMERGENCY_CONTACT_RELATION');
        return (
          <Form.Item name={mapFieldName(fieldCode)} label={label} rules={createRules()} key={fieldCode}>
            <Select placeholder={`请选择${label}`} allowClear showSearch>
              {emergencyRelationOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'jobPost':
      case 'job_post':
        const jobPostOptions = getOptionsByDataSourceCode('JOB_POST');
        return (
          <Form.Item name={mapFieldName(fieldCode)} label={label} rules={createRules()} key={fieldCode}>
            <Select placeholder={`请选择${label}`} allowClear showSearch>
              {jobPostOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'positionTitle':
      case 'position_title':
        const positionTitleOptions = getOptionsByDataSourceCode('POSITION_TITLE');
        return (
          <Form.Item name={mapFieldName(fieldCode)} label={label} rules={createRules()} key={fieldCode}>
            <Select placeholder={`请选择${label}`} allowClear showSearch>
              {positionTitleOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'costCenter':
      case 'cost_center':
        const costCenterOptions = getOptionsByDataSourceCode('COST_CENTER');
        return (
          <Form.Item name={mapFieldName(fieldCode)} label={label} rules={createRules()} key={fieldCode}>
            <Select placeholder={`请选择${label}`} allowClear showSearch>
              {costCenterOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'employmentRelation':
      case 'employment_relation':
        const employmentRelationOptions = getOptionsByDataSourceCode('EMPLOYMENT_RELATION');
        return (
          <Form.Item name={mapFieldName(fieldCode)} label={label} rules={createRules()} key={fieldCode}>
            <Select placeholder={`请选择${label}`} allowClear showSearch>
              {employmentRelationOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'workLocation':
      case 'work_location':
        const workLocationOptions = getOptionsByDataSourceCode('WORK_LOCATION');
        return (
          <Form.Item name={mapFieldName(fieldCode)} label={label} rules={createRules()} key={fieldCode}>
            <Select placeholder={`请选择${label}`} allowClear showSearch>
              {workLocationOptions.map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'workAddress':
      case 'work_address':
      case 'nativePlace':
      case 'native_place':
      case 'householdRegister':
      case 'household_register':
      case 'currentAddress':
      case 'current_address':
      case 'homeAddress':
      case 'home_address':
      case 'emergencyContact':
      case 'emergency_contact':
      case 'emergencyPhone':
      case 'emergency_phone':
      case 'homePhone':
      case 'home_phone':
      case 'resignationReason':
      case 'resignation_reason':
      case 'graduateSchool':
      case 'major':
      case 'probationMonths':
      case 'probation_months':
      case 'workYears':
      case 'work_years':
        return (
          <Form.Item name={mapFieldName(fieldCode)} label={label} rules={createRules()} key={fieldCode}>
            <Input placeholder={`请输入${label}`} />
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
    // 兼容不同的字段属性命名
    const fieldName = field.fieldName || field.name;
    const fieldCode = field.fieldCode || field.code;
    const fieldType = field.type || field.fieldType;

    const commonProps = {
      label: fieldName,
      name: fieldCode,
      rules: field.isRequired ? [{ required: true, message: `请输入${fieldName}` }] : undefined,
      key: fieldCode,
    };

    // 直接使用字段对象中包含的dataSource，而不是从全局列表查找
    const getFieldOptions = () => {
      if (field.dataSource && field.dataSource.options) {
        return field.dataSource.options.map((opt: any) => ({
          id: opt.id,
          value: opt.value,
          label: opt.label,
        }));
      }
      return [];
    };

    switch (fieldType) {
      case 'TEXT':
        return (
          <Form.Item {...commonProps}>
            <Input placeholder={`请输入${fieldName}`} />
          </Form.Item>
        );

      case 'TEXTAREA':
        return (
          <Form.Item {...commonProps}>
            <Input.TextArea rows={4} placeholder={`请输入${fieldName}`} />
          </Form.Item>
        );

      case 'NUMBER':
        return (
          <Form.Item {...commonProps}>
            <Input type="number" placeholder={`请输入${fieldName}`} />
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
            <Select placeholder={`请选择${fieldName}`}>
              {getFieldOptions().map((option: any) => (
                <Select.Option key={option.id} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      case 'SELECT_MULTI':
        return (
          <Form.Item {...commonProps}>
            <Select mode="multiple" placeholder={`请选择${fieldName}`}>
              {getFieldOptions().map((option: any) => (
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
                placeholder={`请选择${fieldName}`}
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
            <Select placeholder={`请选择${fieldName}`}>
              {getFieldOptions().map((option: any) => (
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

  // 渲染工作信息历史记录列表（仅工作信息页签）
  const renderVersionSelector = () => {
    // 如果没有固定的当前工作信息，不显示列表
    if (!fixedCurrentWorkInfo?.currentWorkInfo) {
      return null;
    }

    // 获取异动类型标签
    const getChangeTypeLabel = (changeType: string) => {
      const options = getOptionsByDataSourceCode('CHANGE_TYPE');
      const option = options.find((opt: any) => opt.value === changeType);
      return option?.label || changeType || '-';
    };

    // 合并当前版本和历史版本，按生效日期倒序排列
    // 使用固定的当前版本数据，不受选中状态影响
    const currentVersionData = {
      id: 'current',
      effectiveDate: fixedCurrentWorkInfo?.currentWorkInfo?.effectiveDate,
      changeType: fixedCurrentWorkInfo?.currentWorkInfo?.changeType,
      isCurrent: true
    };

    const allVersions = [
      currentVersionData,
      ...workInfoVersions.map((v: any) => ({ ...v, isCurrent: false }))
    ].sort((a, b) => {
      // 按生效日期倒序排列（最新的在前面）
      const dateA = dayjs(a.effectiveDate);
      const dateB = dayjs(b.effectiveDate);
      return dateB.diff(dateA);
    });

    return (
      <Card
        size="small"
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <HistoryOutlined />
            <span>异动记录</span>
          </Space>
        }
      >
        <List
          size="small"
          dataSource={allVersions}
          renderItem={(item: any) => {
            const isSelected = (item.isCurrent && selectedWorkInfoVersion === 'current') || (!item.isCurrent && selectedWorkInfoVersion === item.id);

            return (
              <List.Item
                style={{
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#e6f7ff' : 'transparent',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  border: isSelected ? '2px solid #1890ff' : '1px solid #f0f0f0',
                  marginBottom: '8px',
                  transition: 'all 0.2s',
                }}
                onClick={(e) => {
                  // 如果点击的是编辑按钮，不触发选中
                  if ((e.target as HTMLElement).closest('.edit-version-btn')) {
                    return;
                  }
                  setSelectedWorkInfoVersion(item.isCurrent ? 'current' : item.id);
                  refetchWorkInfo();
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                  <Space size={12}>
                    {isSelected && <CheckCircleFilled style={{ color: '#1890ff', fontSize: '16px' }} />}
                    {!isSelected && <CheckCircleOutlined style={{ color: '#d9d9d9', fontSize: '16px' }} />}
                    <div>
                      <div style={{ fontWeight: isSelected ? 600 : 400, fontSize: '14px' }}>
                        {dayjs(item.effectiveDate).format('YYYY-MM-DD')}
                      </div>
                      <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '2px' }}>
                        {getChangeTypeLabel(item.changeType)}
                      </div>
                    </div>
                  </Space>
                  <Space>
                    {item.isCurrent && (
                      <Tag color="blue">当前生效</Tag>
                    )}
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      className="edit-version-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditVersion(item);
                      }}
                      style={{ color: '#1890ff' }}
                    >
                      编辑
                    </Button>
                  </Space>
                </div>
              </List.Item>
            );
          }}
        />
      </Card>
    );
  };

  const renderCustomTabs = () => {
    return infoTabsList.map((tab: any) => {
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
    infoTabsList.forEach((tab: any) => {
      const isWorkInfo = isWorkInfoTab(tab.code);
      const isSubRecord = isSubRecordTab(tab.code);
      const isEditing = editingTabCode === tab.code;

      items.push({
        key: tab.code,
        label: tab.name,
        children: (
          <div>
            {/* 工作信息页签：使用左右两列布局 */}
            {isWorkInfo && !isEditing ? (
              <Row gutter={16}>
                <Col span={16}>
                  {/* 左侧：字段内容 */}
                  {tab.groups.map((group: any) => {
                    // 只显示启用的分组
                    if (group.status === 'INACTIVE') {
                      return null;
                    }

                    // 过滤掉隐藏的字段
                    const systemFields = group.fields?.filter((f: any) =>
                      f.isSystem && !f.isHidden
                    ) || [];
                    const groupCustomFields = group.fields?.filter((f: any) =>
                      !f.isSystem && !f.isHidden
                    ) || [];
                    const allFields = [...systemFields, ...groupCustomFields];

                    // 获取数据源（工作信息使用当前版本）
                    const dataSource = currentWorkInfo?.currentWorkInfo;

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
                        <Spin spinning={!dataSource} tip="加载中...">
                          {!dataSource ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                              暂无数据
                            </div>
                          ) : (
                            <Descriptions bordered column={2}>
                              {allFields.map((field: any) => {
                                // 获取字段值
                                let value;

                                // 工���信息字段
                                const positionInfoFields = ['position', 'jobLevel', 'employeeType', 'orgId', 'workLocation', 'workAddress', 'hireDate', 'probationStart', 'probationEnd', 'probationMonths', 'regularDate', 'resignationDate', 'resignationReason', 'workYears', 'changeType', 'effectiveDate', 'costCenter', 'cost_center', 'employmentRelation', 'employment_relation'];

                                // 工作信息存储在 customFields 中的字段
                                const workInfoCustomFieldCodes = ['jobPost', 'positionTitle', 'usageStartDate', 'serviceYearsStartDate', 'estimatedProbationEndDate'];

                                if (field.isSystem) {
                                  // 工作信息页签特殊处理：工号、入职日期和在职状态从employee读取
                                  if (isWorkInfo && (field.fieldCode === 'employee_no' || field.fieldCode === 'employeeNo' || field.fieldCode === 'entry_date' || field.fieldCode === 'entryDate' || field.fieldCode === 'status')) {
                                    value = employee?.[mapFieldName(field.fieldCode)];
                                  } else if (positionInfoFields.includes(field.fieldCode)) {
                                    const fieldName = mapFieldName(field.fieldCode);
                                    value = dataSource?.[fieldName];
                                  } else if (workInfoCustomFieldCodes.includes(field.fieldCode)) {
                                    const customFields = getCustomFields(dataSource);
                                    const employeeCustomFields = getCustomFields(employee);
                                    value = customFields[field.fieldCode] ?? employeeCustomFields[field.fieldCode];
                                  }
                                } else {
                                  const customFields = getCustomFields(dataSource);
                                  const employeeCustomFields = getCustomFields(employee);
                                  value = customFields[field.fieldCode] ?? employeeCustomFields[field.fieldCode];
                                }

                                const formatValue = (val: any, fieldCode: string, fieldObj?: any) => {
                                  if (val === undefined || val === null || val === '') {
                                    return '-';
                                  }

                                  const isSystemField = fieldObj?.isSystem || false;
                                  const actualFieldType = fieldObj?.fieldType || 'TEXT';

                                  // 日期字段列表
                                  const dateFieldCodes = ['entry_date', 'entryDate', 'hire_date', 'hireDate', 'birth_date', 'birthDate', 'probation_start', 'probationStart', 'probation_end', 'probationEnd', 'graduation_date', 'graduationDate', 'regular_date', 'regularDate', 'resignation_date', 'resignationDate', 'effective_date', 'effectiveDate', 'usageStartDate', 'serviceYearsStartDate', 'estimatedProbationEndDate'];
                                  const isDateField = actualFieldType === 'DATE' || dateFieldCodes.includes(fieldCode) || fieldCode.endsWith('_date') || fieldCode.endsWith('Date') || fieldCode.endsWith('Start') || fieldCode.endsWith('End');

                                  // 日期字段格式化
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

                                  // 系统字段中的下拉类型
                                  if (isSystemField) {
                                    const dropdownSystemFields = ['changeType', 'position', 'jobLevel', 'employeeType', 'orgId', 'status'];
                                    if (dropdownSystemFields.includes(fieldCode) || actualFieldType === 'DATASOURCE' || actualFieldType === 'ORG') {
                                      return getLabelByValue(fieldCode, 'SYSTEM', val);
                                    }
                                  }

                                  // 其他字段
                                  return String(val);
                                };

                                return (
                                  <Descriptions.Item label={field.fieldName} key={field.id}>
                                    {formatValue(value, field.fieldCode, field)}
                                  </Descriptions.Item>
                                );
                              })}
                            </Descriptions>
                          )}
                        </Spin>
                      </Card>
                    );
                  })}
                </Col>
                <Col span={8}>
                  {/* 右侧：历史记录列表 */}
                  {renderVersionSelector()}
                </Col>
              </Row>
            ) : isSubRecord ? (
              <>
                {tab.code === 'education_info' && renderEducationTable()}
                {tab.code === 'work_experience' && renderWorkExperienceTable()}
                {tab.code === 'family_info' && renderFamilyMemberTable()}
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
                  f.isSystem && !f.isHidden
                ) || [];
                const groupCustomFields = group.fields?.filter((f: any) =>
                  !f.isSystem && !f.isHidden
                ) || [];
                const allFields = [...systemFields, ...groupCustomFields];

                // 获取数据源（工作信息使用当前版本，其他使用主数据）
                // 注意：currentWorkInfo本身就是包含WorkInfoHistory数据的对象（从API /work-info/:version返回）
                const dataSource = isWorkInfo ? currentWorkInfo : employee;

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
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                          正在加载工作信息...
                          <div style={{ marginTop: '10px', fontSize: '12px' }}>
                            如果长时间未加载，请刷新页面重试
                          </div>
                        </div>
                      ) : !dataSource ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                          暂无数据
                        </div>
                      ) : isEditing ? (
                        <Form form={form} layout="vertical">
                          {/* 编辑历史版本时的提示信息 */}
                          {isWorkInfo && editingWorkInfoHistoryId && !isCreatingNewVersion && !changeOperationType && (
                            <Alert
                              message="您正在编辑历史版本"
                              description="修改历史版本将会更正该版本的数据，不会创建新的异动记录。"
                              type="info"
                              showIcon
                              style={{ marginBottom: 16 }}
                            />
                          )}
                          {/* 工作信息异动/离职操作或创建新版本时显示异动类型和日期字段 */}
                          {(isWorkInfo && (changeOperationType || isCreatingNewVersion)) && (
                            <Card size="small" style={{ backgroundColor: 'var(--color-bg-light)', marginBottom: 16 }}>
                              <Row gutter={16}>
                                <Col span={12}>
                                  <Form.Item
                                    name="changeType"
                                    label="异动类型"
                                    rules={[{ required: true, message: '请选择异动类型' }]}
                                  >
                                    <Select
                                      placeholder="请选择异动类型"
                                      allowClear
                                      showSearch
                                      disabled={changeOperationType === 'RESIGNATION'}
                                    >
                                      {getOptionsByDataSourceCode('CHANGE_TYPE')
                                        .filter((opt: any) => changeOperationType === 'RESIGNATION' ? opt.value === 'RESIGNATION' : opt.value !== 'ENTRY')
                                        .map((option: any) => (
                                          <Select.Option key={option.id} value={option.value}>
                                            {option.label}
                                          </Select.Option>
                                        ))}
                                    </Select>
                                  </Form.Item>
                                </Col>
                                <Col span={12}>
                                  <Form.Item
                                    noStyle
                                    shouldUpdate={(prevValues, currentValues) => prevValues.changeType !== currentValues.changeType}
                                  >
                                    {({ getFieldValue }) => {
                                      const currentChangeType = getFieldValue('changeType');
                                      const isResignation = currentChangeType === 'RESIGNATION' || changeOperationType === 'RESIGNATION';
                                      if (isResignation) {
                                        return (
                                          <Form.Item
                                            name="resignationDate"
                                            label="离职日期"
                                            rules={[{ required: true, message: '请选择离职日期' }]}
                                          >
                                            <DatePicker style={{ width: '100%' }} placeholder="请选择离职日期" />
                                          </Form.Item>
                                        );
                                      }
                                      return null;
                                    }}
                                  </Form.Item>
                                </Col>
                              </Row>
                              <Row gutter={16}>
                                <Col span={12}>
                                  <Form.Item
                                    name="effectiveDate"
                                    label="生效日期"
                                    rules={[{ required: true, message: '请选择生效日期' }]}
                                  >
                                    <DatePicker style={{ width: '100%' }} placeholder="请选择生效日期" />
                                  </Form.Item>
                                </Col>
                                <Col span={12}>
                                  <Form.Item
                                    noStyle
                                    shouldUpdate={(prevValues, currentValues) => prevValues.changeType !== currentValues.changeType}
                                  >
                                    {({ getFieldValue }) => {
                                      const currentChangeType = getFieldValue('changeType');
                                      const isResignation = currentChangeType === 'RESIGNATION' || changeOperationType === 'RESIGNATION';
                                      if (isResignation) {
                                        return (
                                          <Form.Item
                                            name="resignationReason"
                                            label="离职原因"
                                            rules={[{ required: true, message: '请选择离职原因' }]}
                                          >
                                            <Select placeholder="请选择离职原因">
                                              {getOptionsByDataSourceCode('RESIGNATION_REASON').map((option: any) => (
                                                <Select.Option key={option.id} value={option.value}>
                                                  {option.label}
                                                </Select.Option>
                                              ))}
                                            </Select>
                                          </Form.Item>
                                        );
                                      }
                                      return null;
                                    }}
                                  </Form.Item>
                                </Col>
                              </Row>
                            </Card>
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

                          // 职位信息字段（从 currentWorkInfo 读取）
                          const positionInfoFields = ['position', 'jobLevel', 'job_level', 'employeeType', 'employee_type', 'orgId', 'org_id', 'workLocation', 'work_location', 'workAddress', 'work_address', 'changeType', 'change_type', 'effectiveDate', 'effective_date', 'hireDate', 'hire_date', 'probationStart', 'probation_start', 'probationEnd', 'probation_end', 'probationMonths', 'probation_months', 'regularDate', 'regular_date', 'resignationDate', 'resignation_date', 'resignationReason', 'resignation_reason', 'workYears', 'work_years', 'costCenter', 'cost_center', 'employmentRelation', 'employment_relation'];

                          // 工作信息存储在 customFields 中的字段
                          const workInfoCustomFieldCodes = ['jobPost', 'job_post', 'positionTitle', 'position_title', 'usageStartDate', 'usage_start_date', 'serviceYearsStartDate', 'service_years_start_date', 'estimatedProbationEndDate', 'estimated_probation_end_date'];

                          // 基本信息字段（从 employee 读取）
                          const basicInfoFields = ['employeeNo', 'employee_no', 'name', 'gender', 'idCard', 'id_card', 'mobile', 'phone', 'email', 'birthDate', 'birth_date', 'age', 'maritalStatus', 'marital_status', 'nativePlace', 'native_place', 'politicalStatus', 'political_status', 'householdRegister', 'household_register', 'currentAddress', 'current_address', 'photo', 'emergencyContact', 'emergency_contact', 'emergencyPhone', 'emergency_phone', 'emergencyRelation', 'emergency_relation', 'homeAddress', 'home_address', 'homePhone', 'home_phone', 'status'];

                          if (field.isSystem) {
                            // 特殊处理：employeeNo始终从employee读取
                            if (field.fieldCode === 'employee_no' || field.fieldCode === 'employeeNo') {
                              value = employee?.employeeNo;
                            } else if (field.fieldCode === 'entry_date' || field.fieldCode === 'entryDate' || field.fieldCode === 'status') {
                              // entry_date和status也从employee读取
                              value = employee?.[mapFieldName(field.fieldCode)];
                            } else if (positionInfoFields.includes(field.fieldCode)) {
                              // 工作信息字段：从 currentWorkInfo 读取
                              if (isWorkInfo) {
                                const workInfoData = currentWorkInfo || {};
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
                            } else if (workInfoCustomFieldCodes.includes(field.fieldCode)) {
                              // 工作信息的 customFields 字段：需要从 employee.customFields 或 workInfoData.customFields 中读取
                              if (isWorkInfo) {
                                // 工作信息页签：优先从 workInfoData.customFields 读取，如果没有则从 employee.customFields 读取
                                const workInfoData = currentWorkInfo || {};
                                const workInfoCustomFields = getCustomFields(workInfoData);
                                const employeeCustomFields = getCustomFields(employee);

                                // 优先使用 workInfoData 的值，如果没有则使用 employee 的值
                                value = workInfoCustomFields[field.fieldCode] ?? employeeCustomFields[field.fieldCode];
                              } else {
                                // 其他页签：从 employee.customFields 读取
                                const employeeCustomFields = getCustomFields(employee);
                                value = employeeCustomFields[field.fieldCode];
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

                            // 获取字段对象（用于判断是否为系统字段）
                            const isSystemField = fieldObj?.isSystem || false;
                            const actualFieldType = fieldObj?.fieldType || fieldType;

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
                            const dateFieldCodes = ['entry_date', 'entryDate', 'hire_date', 'hireDate', 'birth_date', 'birthDate', 'probation_start', 'probationStart', 'probation_end', 'probationEnd', 'graduation_date', 'graduationDate', 'regular_date', 'regularDate', 'resignation_date', 'resignationDate', 'effective_date', 'effectiveDate', 'usageStartDate', 'serviceYearsStartDate', 'estimatedProbationEndDate'];
                            const isDateField = actualFieldType === 'DATE' || dateFieldCodes.includes(fieldCode) || fieldCode.endsWith('_date') || fieldCode.endsWith('Date') || fieldCode.endsWith('Start') || fieldCode.endsWith('End');

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
                            if (!isSystemField && fieldObj) {
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
                            if (!isSystemField && (actualFieldType === 'SELECT_SINGLE' || actualFieldType === 'LOOKUP')) {
                              return getLabelByValue(fieldCode, actualFieldType, val);
                            }

                            // 多选字段
                            if (!isSystemField && actualFieldType === 'SELECT_MULTI') {
                              return getLabelByValue(fieldCode, actualFieldType, val);
                            }

                            // 系统字段中的下拉类型（DATASOURCE 或 ORG）
                            if (isSystemField) {
                              const dropdownSystemFields = ['gender', 'position', 'jobLevel', 'employeeType', 'educationLevel', 'educationType', 'maritalStatus', 'politicalStatus', 'orgId', 'org_id', 'emergencyRelation', 'emergency_relation', 'nation', 'workLocation', 'work_location', 'employmentRelation', 'costCenter', 'jobPost', 'positionTitle', 'status'];
                              if (dropdownSystemFields.includes(fieldCode) || actualFieldType === 'DATASOURCE' || actualFieldType === 'ORG') {
                                return getLabelByValue(fieldCode, 'SYSTEM', val);
                              }
                            }

                            // 布尔类型
                            if (actualFieldType === 'BOOLEAN') {
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
        )
      })
    });

    // 2. 劳动力账户页签（始终在最后）
    items.push({
      key: 'accounts',
      label: '劳动力账户',
      children: <div>{renderLaborAccounts()}</div>,
    });

    // 3. 金额系数页签（在劳动力账户之后）
    items.push({
      key: 'coefficient',
      label: '金额',
      children: <div>{renderEmployeeCoefficient()}</div>,
    });

    // 4. 考勤规则组页签（在最后）
    items.push({
      key: 'ruleGroups',
      label: '考勤规则组',
      children: <div>{renderEmployeeRuleGroups()}</div>,
    });

    return items;
  };

  const tabItems = buildTabItems();
  const defaultActiveKey = tabItems.length > 0 ? tabItems[0].key : 'info';

  // 获取当前页签信息
  const currentTab = infoTabsList.find((tab: any) => tab.code === activeTab);
  const currentIsWorkInfo = currentTab ? isWorkInfoTab(currentTab.code) : false;
  const currentIsSubRecord = currentTab ? isSubRecordTab(currentTab.code) : false;
  const isEditing = editingTabCode === activeTab;

  return (
    <div>
      <Card>
        {/* 顶部操作栏 */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/hr/employees')}>
            返回列表
          </Button>

          {/* 操作按钮区域 */}
          {currentIsWorkInfo && !isEditing ? (
            <Space>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'transfer',
                      label: '异动',
                      onClick: () => handleChangeOperation('TRANSFER'),
                    },
                    {
                      key: 'resignation',
                      label: '离职',
                      onClick: () => handleChangeOperation('RESIGNATION'),
                    },
                  ],
                }}
              >
                <Button>
                  操作
                </Button>
              </Dropdown>
            </Space>
          ) : !currentIsSubRecord && !isEditing && !currentIsWorkInfo && activeTab !== 'accounts' && activeTab !== 'coefficient' && activeTab !== 'ruleGroups' ? (
            <Button
              icon={<EditOutlined />}
              onClick={() => handleEditTab(activeTab)}
            >
              编辑
            </Button>
          ) : isEditing ? (
            <Space>
              <Button
                icon={<CloseOutlined />}
                onClick={handleCancelEdit}
              >
                取消
              </Button>
              <Button
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={updateEmployeeMutation.isPending || updateWorkInfoMutation.isPending || createWorkInfoVersionMutation.isPending || updateWorkInfoHistoryMutation.isPending}
              >
                保存
              </Button>
            </Space>
          ) : null}
        </div>

        {/* 用户信息展示 */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar
            size={80}
            src={employee?.photo}
            icon={<UserOutlined />}
            style={{ flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
              {employee?.name || '-'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 2 }}>
              工号：{employee?.employeeNo || '-'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              状态：{employee?.status === 'ACTIVE' ? '在职' : '离职'}
            </div>
          </div>
        </div>

        {/* 页签区域 */}
        <Row gutter={16}>
          <Col span={5} style={{ borderRight: '1px solid var(--color-border-1)', paddingRight: '16px' }}>
            <Tabs
              defaultActiveKey={defaultActiveKey}
              activeKey={activeTab}
              onChange={setActiveTab}
              tabPosition="left"
              items={tabItems.map(item => ({
                key: item.key,
                label: (
                  <span style={{ padding: '8px 0', display: 'block' }}>
                    {item.label}
                  </span>
                ),
              }))}
              style={{ borderRight: 'none' }}
            />
          </Col>
          <Col span={19} style={{ paddingLeft: '24px' }}>
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
          <p style={{ marginBottom: '16px', color: 'var(--color-text-secondary)' }}>
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
                'costCenter', 'employmentRelation',
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
