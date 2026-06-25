import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  message,
  Popconfirm,
  Tag,
  Drawer,
  Row,
  Col,
  Divider,
  Empty,
  Steps,
  Alert,
  Tabs,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PlayCircleOutlined, SettingOutlined, LeftOutlined, RightOutlined, StopOutlined, CalculatorOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import dayjs from 'dayjs';
import { EmployeeFieldFilter, WorkHoursFilter } from './components';
import EarnedHoursTab from './components/EarnedHoursTab';

const { TextArea } = Input;

interface AllocationConfig {
  id: number;
  configCode: string;
  configName: string;
  orgId: number;
  status: string;
  effectiveStartTime: string;
  effectiveEndTime: string | null;
  description: string;
  sourceConfig?: any;
  rules?: any[];
  _count?: {
    rules: number;
    results: number;
  };
}

const AllocationConfigPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('indirect');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [isCalcModalVisible, setIsCalcModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AllocationConfig | null>(null);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [calcConfig, setCalcConfig] = useState<AllocationConfig | null>(null);
  const [form] = Form.useForm();
  const [calcForm] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取配置列表
  const { data: configsData, isLoading } = useQuery({
    queryKey: ['allocationConfigs', page, pageSize, keyword, status],
    queryFn: () =>
      request.get('/allocation/configs', {
        params: { page, pageSize, keyword, status },
      }).then((res: any) => res),
  });

  // 获取出勤代码列表
  const { data: attendanceCodes } = useQuery({
    queryKey: ['attendanceCodesForAllocation'],
    queryFn: () =>
      request.get('/allocation/attendance-codes').then((res: any) => res),
  });

  // 创建配置 - 根据当前Tab调用不同的API
  const createMutation = useMutation({
    mutationFn: (data: any) => {
      // 根据当前Tab调用不同的API
      const apiUrl = activeTab === 'earned'
        ? '/earned-hours-allocation/configs'  // 挣得工时规则API
        : '/allocation/configs';               // 间接工时分摊API

      console.log(`createMutation - 发送请求到 ${apiUrl}`);
      console.log('请求数据:', JSON.stringify(data, null, 2));
      return request.post(apiUrl, data);
    },
    onSuccess: () => {
      message.success('创建成功');
      setIsModalVisible(false);
      form.resetFields();
      // 刷新当前Tab的数据
      if (activeTab === 'earned') {
        queryClient.invalidateQueries({ queryKey: ['earnedHourConfigs'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['allocationConfigs'] });
      }
    },
    onError: (error: any) => {
      console.error('创建失败 - 完整错误对象:', error);
      console.error('响应数据:', error.response?.data);
      console.error('响应状态:', error.response?.status);
      console.error('响应消息:', error.response?.data?.message);
      console.error('错误消息:', error.message);

      // 提取更详细的错误信息
      let errorMessage = '创建失败';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data) {
        // 如果有data但没有message，尝试转换为字符串
        try {
          errorMessage = typeof error.response.data === 'string'
            ? error.response.data
            : JSON.stringify(error.response.data);
        } catch (e) {
          errorMessage = '创建失败，请检查输入数据或查看控制台';
        }
      }

      message.error(errorMessage);
    },
  });

  // 更新配置 - 根据当前Tab调用不同的API
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => {
      const apiUrl = activeTab === 'earned'
        ? `/earned-hours-allocation/configs/${id}`
        : `/allocation/configs/${id}`;

      return request.put(apiUrl, data);
    },
    onSuccess: () => {
      message.success('更新成功');
      setIsModalVisible(false);
      setEditingConfig(null);
      form.resetFields();
      // 刷新当前Tab的数据
      if (activeTab === 'earned') {
        queryClient.invalidateQueries({ queryKey: ['earnedHourConfigs'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['allocationConfigs'] });
      }
    },
    onError: (error: any) => {
      console.error('更新失败 - 完整错误对象:', error);
      console.error('响应数据:', error.response?.data);

      // 提取更详细的错误信息
      let errorMessage = '更新失败';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data) {
        try {
          errorMessage = typeof error.response.data === 'string'
            ? error.response.data
            : JSON.stringify(error.response.data);
        } catch (e) {
          errorMessage = '更新失败，请检查输入数据或查看控制台';
        }
      }

      message.error(errorMessage);
    },
  });

  // 删除配置 - 根据当前Tab调用不同的API
  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      const apiUrl = activeTab === 'earned'
        ? `/earned-hours-allocation/configs/${id}`
        : `/allocation/configs/${id}`;

      return request.delete(apiUrl);
    },
    onSuccess: () => {
      message.success('删除成功');
      // 刷新当前Tab的数据
      if (activeTab === 'earned') {
        queryClient.invalidateQueries({ queryKey: ['earnedHourConfigs'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['allocationConfigs'] });
      }
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '删除失败');
    },
  });

  // 启用配置 - 根据当前Tab调用不同的API
  const activateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => {
      const apiUrl = activeTab === 'earned'
        ? `/earned-hours-allocation/configs/${id}/activate`
        : `/allocation/configs/${id}/activate`;

      return request.post(apiUrl, data);
    },
    onSuccess: () => {
      message.success('启用成功');
      // 刷新当前Tab的数据
      if (activeTab === 'earned') {
        queryClient.invalidateQueries({ queryKey: ['earnedHourConfigs'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['allocationConfigs'] });
      }
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '启用失败');
    },
  });

  // 停用配置 - 根据当前Tab调用不同的API
  const deactivateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => {
      const apiUrl = activeTab === 'earned'
        ? `/earned-hours-allocation/configs/${id}/deactivate`
        : `/allocation/configs/${id}/deactivate`;

      return request.post(apiUrl, data);
    },
    onSuccess: () => {
      message.success('停用成功');
      // 刷新当前Tab的数据
      if (activeTab === 'earned') {
        queryClient.invalidateQueries({ queryKey: ['earnedHourConfigs'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['allocationConfigs'] });
      }
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '停用失败');
    },
  });

  // 复制配置 - 根据当前Tab调用不同的API
  const copyMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => {
      const apiUrl = activeTab === 'earned'
        ? `/earned-hours-allocation/configs/${id}/copy`
        : `/allocation/configs/${id}/copy`;

      return request.post(apiUrl, data);
    },
    onSuccess: () => {
      message.success('复制成功，已创建新配置');
      // 刷新当前Tab的数据
      if (activeTab === 'earned') {
        queryClient.invalidateQueries({ queryKey: ['earnedHourConfigs'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['allocationConfigs'] });
      }
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '复制失败');
    },
  });

  const handleCreate = () => {
    setEditingConfig(null);
    form.resetFields();
    form.setFieldsValue({
      sourceConfig: {
        filterGroups: [
          {
            id: 'default_group',
            employeeFilter: { fieldGroups: [] },
            workHoursFilter: { hierarchySelections: [], attendanceCodes: [] },
          },
        ],
      },
      rules: [],
    });
    console.log('handleCreate - 初始化表单值:', JSON.stringify(form.getFieldsValue(), null, 2));
    setIsModalVisible(true);
  };

  const handleEdit = async (config: AllocationConfig) => {
    console.log('开始编辑配置:', config);
    setEditingConfig(config);

    // 重新获取完整的配置详情，确保数据被正确增强
    try {
      const fullConfig = await request.get(`/allocation/configs/${config.id}`);
      console.log('获取的完整配置详情:', JSON.stringify(fullConfig, null, 2));

      // 转换rules数组，将后端的allocationScopeId转换为前端的allocationScope
      const transformedRules = (fullConfig.rules || []).map((rule: any) => {
        console.log('处理规则:', rule);
        return {
          ...rule,
          allocationScope: rule.allocationScopeId || null,  // 将allocationScopeId映射为allocationScope
          allocationScopeId: undefined,  // 删除后端使用的allocationScopeId字段
        };
      });

      console.log('转换后的rules:', transformedRules);

      // 转换sourceConfig结构，从后端格式转换为前端表单格式
      let transformedSourceConfig = null;
      if (fullConfig.sourceConfig) {
        // 转换employeeFilter.fieldGroups结构
        // 后端存储的是: { fieldGroups: [{ id, fieldGroups: [{ id, conditions }] }] }
        // 前端需要的是: [{ id, conditions }]
        let transformedFieldGroups: any[] = [];
        if (fullConfig.sourceConfig.employeeFilter?.fieldGroups) {
          // 扁平化：提取所有嵌套的 fieldGroups
          fullConfig.sourceConfig.employeeFilter.fieldGroups.forEach((outerGroup: any) => {
            if (outerGroup.fieldGroups && Array.isArray(outerGroup.fieldGroups)) {
              transformedFieldGroups = [...transformedFieldGroups, ...outerGroup.fieldGroups];
            }
          });
          console.log('转换后的fieldGroups（扁平化）:', JSON.stringify(transformedFieldGroups, null, 2));
        }

        // 转换attendanceCodes：从对象数组转为字符串数组
        const transformedAttendanceCodes = Array.isArray(fullConfig.sourceConfig.attendanceCodes)
          ? fullConfig.sourceConfig.attendanceCodes.map((code: any) =>
              typeof code === 'object' ? code.code : code
            )
          : [];

        console.log('转换后的attendanceCodes:', transformedAttendanceCodes);

        // 转换hierarchySelections：移除valueAccounts字段，只保留valueIds
        const transformedHierarchySelections = (fullConfig.sourceConfig.accountFilter?.hierarchySelections || [])
          .map((selection: any) => {
            console.log('处理selection:', selection);
            // 如果有valueAccounts，提取ID；否则使用原有的valueIds
            let valueIds: any[] = [];
            if (selection.valueAccounts && Array.isArray(selection.valueAccounts)) {
              // valueAccounts可能包含混合类型：对象（有id字段）和原始值（字符串/数字）
              valueIds = selection.valueAccounts.map((item: any) => {
                if (item && typeof item === 'object' && item.id !== undefined) {
                  return item.id;
                }
                return item; // 原始值（字符串或数字）
              });
            } else {
              valueIds = selection.valueIds || [];
            }

            console.log('转换后的valueIds:', valueIds);

            return {
              levelId: selection.levelId,
              level: selection.level,
              levelName: selection.levelName,
              valueIds,
              // 移除valueAccounts字段，避免前端组件混淆
            };
          });

        console.log('转换后的hierarchySelections:', JSON.stringify(transformedHierarchySelections, null, 2));

        transformedSourceConfig = {
          filterGroups: [
            {
              employeeFilter: {
                fieldGroups: transformedFieldGroups
              },
              workHoursFilter: {
                hierarchySelections: transformedHierarchySelections,
                attendanceCodes: transformedAttendanceCodes
              }
            }
          ]
        };
      }

      console.log('编辑配置 - 原始sourceConfig:', JSON.stringify(fullConfig.sourceConfig, null, 2));
      console.log('编辑配置 - employeeFilter:', JSON.stringify(fullConfig.sourceConfig.employeeFilter, null, 2));
      console.log('编辑配置 - fieldGroups:', JSON.stringify(fullConfig.sourceConfig.employeeFilter?.fieldGroups, null, 2));
      console.log('编辑配置 - 转换后sourceConfig:', JSON.stringify(transformedSourceConfig, null, 2));

      // 设置所有表单字段
      form.setFieldsValue({
        configCode: fullConfig.configCode,
        configName: fullConfig.configName,
        description: fullConfig.description,
        sourceConfig: transformedSourceConfig,
        rules: transformedRules,  // 使用转换后的rules
      });

      console.log('表单值已设置:', form.getFieldsValue(true));
      console.log('employeeFilter.fieldGroups路径的值:', form.getFieldValue(['sourceConfig', 'filterGroups', 0, 'employeeFilter', 'fieldGroups']));

      // 在下一个事件循环中打开模态框，确保表单值已设置完成
      Promise.resolve().then(() => {
        setIsModalVisible(true);
      });
    } catch (error) {
      console.error('获取配置详情失败:', error);
      message.error('获取配置详情失败');
    }
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该规则吗？删除后将无法恢复。',
      icon: null,
      centered: true,
      okText: '确定',
      cancelText: '取消',
      className: 'deactivate-modal',
      onOk: () => {
        return deleteMutation.mutateAsync(id);
      },
    });
  };

  const handleActivate = (config: AllocationConfig) => {
    // 直接调用启用接口，不需要二次确认
    activateMutation.mutate({
      id: config.id,
      data: { approvedById: 1, approvedByName: 'Admin' },
    });
  };

  const handleDeactivate = (config: AllocationConfig) => {
    Modal.confirm({
      title: '确认停用',
      content: '确定要停用该规则吗？停用后将不再执行该分配规则。',
      icon: null,
      centered: true,
      okText: '确定',
      cancelText: '取消',
      className: 'deactivate-modal-single-title',
      onOk: () => {
        return deactivateMutation.mutateAsync({
          id: config.id,
          data: { deactivatedById: 1, deactivatedByName: 'Admin' },
        });
      },
    });
  };

  const handleOpenCalcModal = (config: AllocationConfig) => {
    setCalcConfig(config);
    calcForm.setFieldsValue({
      dateRange: [dayjs().subtract(7, 'day'), dayjs()],
    });
    setIsCalcModalVisible(true);
  };

  // 计算mutation
  const calculateMutation = useMutation({
    mutationFn: (data: any) => {
      return request.post('/allocation/calculate', data);
    },
    onSuccess: () => {
      message.success('分摊计算完成');
      setIsCalcModalVisible(false);
      setCalcConfig(null);
      calcForm.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '计算失败');
    },
  });

  const handleCalcSubmit = async () => {
    try {
      const values = await calcForm.validateFields();

      const data = {
        configId: calcConfig?.id,
        startDate: values.dateRange[0].format('YYYY-MM-DD'),
        endDate: values.dateRange[1].format('YYYY-MM-DD'),
        executeById: 1,
        executeByName: 'Admin',
      };

      calculateMutation.mutate(data);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleCalcCancel = () => {
    setIsCalcModalVisible(false);
    setCalcConfig(null);
    calcForm.resetFields();
  };

  const handleSubmit = async () => {
    try {
      // 获取所有表单字段值（包括未挂载的字段）
      const values = form.getFieldsValue(true);
      console.log('提交的表单数据:', JSON.stringify(values, null, 2));

      // 验证必需字段
      if (!values.configCode) {
        message.error('规则代码不能为空');
        return;
      }

      if (!values.configName) {
        message.error('规则名称不能为空');
        return;
      }

      if (!values.rules || values.rules.length === 0) {
        message.error('请至少添加一条分摊规则');
        return;
      }

      // 从规则中获取生效时间（使用最早的开始时间）
      const rules = values.rules || [];
      let configStartTime = dayjs().format('YYYY-MM-DD');
      let configEndTime = null;

      if (rules.length > 0) {
        const startTimes = rules
          .map((r: any) => r.effectiveStartTime ? dayjs(r.effectiveStartTime) : null)
          .filter(Boolean);
        const endTimes = rules
          .map((r: any) => r.effectiveEndTime ? dayjs(r.effectiveEndTime) : null)
          .filter(Boolean);

        if (startTimes.length > 0) {
          configStartTime = startTimes.sort((a, b) => a.isBefore(b) ? -1 : 1)[0].format('YYYY-MM-DD');
        }
        if (endTimes.length > 0) {
          configEndTime = endTimes.sort((a, b) => a.isAfter(b) ? -1 : 1)[0].format('YYYY-MM-DD');
        }
      }

      // 转换sourceConfig为后端期望的格式
      let transformedSourceConfig = null;
      if (values.sourceConfig && values.sourceConfig.filterGroups) {
        console.log('原始sourceConfig:', JSON.stringify(values.sourceConfig, null, 2));

        // 合并所有filterGroups的条件
        const allFieldGroups = values.sourceConfig.filterGroups
          .map((fg: any) => {
            const fieldGroups = fg.employeeFilter?.fieldGroups || [];
            // 只保留有条件的fieldGroups
            const validFieldGroups = fieldGroups.filter((group: any) =>
              group.conditions && group.conditions.length > 0
            );
            return {
              id: fg.id || `group_${Date.now()}`,
              fieldGroups: validFieldGroups,
            };
          })
          .filter((group: any) => group.fieldGroups.length > 0); // 只保留有效条件的组

        // 收集所有出勤代码
        const allAttendanceCodes: string[] = [];
        values.sourceConfig.filterGroups.forEach((fg: any) => {
          if (fg.workHoursFilter?.attendanceCodes && fg.workHoursFilter.attendanceCodes.length > 0) {
            allAttendanceCodes.push(...fg.workHoursFilter.attendanceCodes);
          }
        });

        // 收集所有工时归属选择
        const allHierarchySelections: any[] = [];
        values.sourceConfig.filterGroups.forEach((fg: any) => {
          if (fg.workHoursFilter?.hierarchySelections && fg.workHoursFilter.hierarchySelections.length > 0) {
            allHierarchySelections.push(...fg.workHoursFilter.hierarchySelections);
          }
        });

        // 构建sourceConfig
        transformedSourceConfig = {
          sourceType: 'EMPLOYEE_HOURS',
          employeeFilter: {
            fieldGroups: allFieldGroups.length > 0 ? allFieldGroups : [],
          },
          accountFilter: {
            hierarchySelections: allHierarchySelections,
          },
          attendanceCodes: allAttendanceCodes,
          description: values.description || '',
        };

        console.log('转换后的sourceConfig:', JSON.stringify(transformedSourceConfig, null, 2));
      } else {
        // 如果没有sourceConfig，创建一个空的
        transformedSourceConfig = {
          sourceType: 'EMPLOYEE_HOURS',
          employeeFilter: {
            fieldGroups: [],
          },
          accountFilter: {
            hierarchySelections: [],
          },
          attendanceCodes: [],
          description: values.description || '',
        };
        console.log('创建空的sourceConfig:', JSON.stringify(transformedSourceConfig, null, 2));
      }

      // 获取当前用户信息以确定组织
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      // 转换rules数组，将allocationScope改为allocationScopeId
      const transformedRules = (values.rules || []).map((rule: any, index: number) => {
        console.log(`处理规则 ${index}:`, JSON.stringify(rule, null, 2));

        // 提取需要的字段
        const {
          ruleName,
          ruleType,
          allocationBasis,
          allocationScope,
          basisFilter,
          targets,
          sortOrder,
          status,
          effectiveStartTime,
          effectiveEndTime,
          description,
        } = rule;

        const transformedRule = {
          ruleName: ruleName || `分配规则${index + 1}`,
          ruleType: ruleType || 'PROPORTIONAL',
          allocationBasis: allocationBasis || 'ACTUAL_HOURS',
          allocationScopeId: allocationScope || null,
          basisFilter: basisFilter || {},
          targets: [],
          sortOrder: sortOrder !== undefined ? sortOrder : index,
          status: status || 'ACTIVE',
          effectiveStartTime: effectiveStartTime || null,
          effectiveEndTime: effectiveEndTime || null,
          description: description || '',
        };

        console.log(`转换后规则 ${index}:`, JSON.stringify(transformedRule, null, 2));

        return transformedRule;
      });

      const data = {
        configCode: values.configCode,
        configName: values.configName,
        description: values.description || '',
        orgId: user?.orgId || 1,  // 添加必需的orgId字段
        orgName: user?.orgName || '默认组织',
        orgPath: user?.orgPath || '/',  // 添加必需的orgPath字段
        effectiveStartTime: configStartTime,
        effectiveEndTime: configEndTime,
        sourceConfig: transformedSourceConfig,
        rules: transformedRules,  // 使用转换后的rules
        createdById: 1,
        createdByName: 'Admin',
      };

      console.log('========== 开始创建分摊规则 ==========');
      console.log('表单所有值:', JSON.stringify(values, null, 2));
      console.log('转换后的sourceConfig:', JSON.stringify(transformedSourceConfig, null, 2));
      console.log('转换后的rules:', JSON.stringify(transformedRules, null, 2));
      console.log('准备发送的完整数据:', JSON.stringify(data, null, 2));
      console.log('========== 结束创建分摊规则 ==========');

      if (editingConfig) {
        // 如果是已启用的配置，只更新规则，不更新数据源
        if (editingConfig.status === 'ACTIVE') {
          const activeConfigUpdateData = {
            rules: transformedRules,  // 只更新规则
            updatedById: 1,
            updatedByName: 'Admin',
          };

          console.log('更新已启用配置 - 只更新规则:', JSON.stringify(activeConfigUpdateData, null, 2));

          updateMutation.mutate({
            id: editingConfig.id,
            data: activeConfigUpdateData,
          });
        } else {
          // 草稿状态可以更新全部
          updateMutation.mutate({
            id: editingConfig.id,
            data: {
              ...data,
              updatedById: 1,
              updatedByName: 'Admin',
            },
          });
        }
      } else {
        console.log('创建分摊规则 - 发送数据到 /allocation/configs');
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error('表单提交失败:', error);
      message.error('请检查表单填写是否完整');
    }
  };

  const showDetailDrawer = (configId: number) => {
    setSelectedConfigId(configId);
    setIsDetailDrawerVisible(true);
  };

  const columns = [
    { title: '规则代码', dataIndex: 'configCode', key: 'configCode', width: 150 },
    { title: '规则名称', dataIndex: 'configName', key: 'configName', width: 200 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { text: string; color: string }> = {
          DRAFT: { text: '草稿', color: 'default' },
          ACTIVE: { text: '生效', color: 'green' },
          INACTIVE: { text: '失效', color: 'red' },
        };
        const statusInfo = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
    {
      title: '规则数',
      key: 'ruleCount',
      width: 80,
      render: (_: any, record: AllocationConfig) => record._count?.rules || 0,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: AllocationConfig) => (
        <Space size={8} split={<div style={{ width: '1px', height: '12px', background: 'var(--color-border-1)' }} />}>
          {record.status === 'DRAFT' ? (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                style={{ padding: '0 4px' }}
              >
                编辑
              </Button>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} style={{ padding: '0 4px' }}>
                删除
                </Button>
              <Button
                type="link"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => handleActivate(record)}
                style={{ padding: '0 4px' }}
              >
                启用
              </Button>
            </>
          ) : record.status === 'ACTIVE' ? (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                style={{ padding: '0 4px' }}
              >
                编辑
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<StopOutlined />}
                onClick={() => handleDeactivate(record)}
                style={{ padding: '0 4px' }}
              >
                停用
              </Button>
              <Button
                type="link"
                size="small"
                icon={<CalculatorOutlined />}
                onClick={() => handleOpenCalcModal(record)}
                style={{ padding: '0 4px', color: '#1890ff' }}
              >
                计算
              </Button>
            </>
          ) : record.status === 'INACTIVE' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
                style={{ padding: '0 4px' }}
              >
                编辑
              </Button>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} style={{ padding: '0 4px' }}>
                删除
                </Button>
              <Button
                type="link"
                size="small"
                icon={<PlayCircleOutlined />}
                onClick={() => handleActivate(record)}
                style={{ padding: '0 4px', color: '#52c41a' }}
              >
                启用
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="规则管理">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'indirect',
              label: '间接工时规则',
              children: (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Space size={8} wrap>
                      <Input.Search
                        placeholder="搜索配置编码、名称"
                        allowClear
                        style={{ width: 240 }}
                        onSearch={(value) => setKeyword(value)}
                        onChange={(e) => !e.target.value && setKeyword('')}
                      />
                      <Select
                        placeholder="选择状态"
                        allowClear
                        style={{ width: 120 }}
                        onChange={setStatus}
                      >
                        <Select.Option value="DRAFT">草稿</Select.Option>
                        <Select.Option value="ACTIVE">生效</Select.Option>
                        <Select.Option value="INACTIVE">失效</Select.Option>
                      </Select>
                    </Space>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                      新增
                    </Button>
                  </div>

                  <Table
                    columns={columns}
                    dataSource={configsData?.items || []}
                    loading={isLoading}
                    rowKey="id"
                    scroll={{ x: 1200 }}
                    pagination={{
                      current: page,
                      pageSize,
                      total: configsData?.total || 0,
                      showSizeChanger: true,
                      showTotal: (total) => `共 ${total} 条`,
                      onChange: (newPage, newPageSize) => {
                        setPage(newPage);
                        setPageSize(newPageSize || 10);
                      },
                    }}
                  />
                </>
              ),
            },
            {
              key: 'earned',
              label: '挣得工时规则',
              children: <EarnedHoursTab />,
            },
          ]}
        />
      </Card>

      {/* 创建/编辑配置模态框 - 向导式 */}
      <Modal
        title={editingConfig ? '编辑' : '新增'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingConfig(null);
          form.resetFields();
        }}
        width={1000}
        centered
        styles={{
          body: {
            height: 'calc(100vh - 120px)',
            display: 'flex',
            flexDirection: 'column',
            padding: '0 !important',
            overflowY: 'hidden'
          },
          content: {
            borderRadius: '4px'
          }
        }}
        destroyOnClose
        footer={null}
      >
        <AllocationWizardForm
          form={form}
          editingConfig={editingConfig}
          attendanceCodes={attendanceCodes || []}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsModalVisible(false);
            setEditingConfig(null);
            form.resetFields();
          }}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>

      {/* 配置详情抽屉 */}
      <Drawer
        title="配置详情"
        placement="right"
        width={560}
        open={isDetailDrawerVisible}
        onClose={() => {
          setIsDetailDrawerVisible(false);
          setSelectedConfigId(null);
        }}
        styles={{
          body: { padding: '24px' }
        }}
        destroyOnClose
      >
        <AllocationConfigDetail configId={selectedConfigId} />
      </Drawer>

      {/* 计算周期弹窗 */}
      <Modal
        title="分配计算"
        open={isCalcModalVisible}
        onCancel={handleCalcCancel}
        width={500}
        centered
        footer={null}
        styles={{
          body: {
            padding: '0'
          }
        }}
      >
        <div style={{ padding: '24px 12px' }}>
          <Form form={calcForm} layout="vertical">
          <Form.Item
            label="规则名称"
          >
            <Input value={calcConfig?.configName} disabled />
          </Form.Item>
          <Form.Item
            label="计算周期"
            name="dateRange"
            rules={[{ required: true, message: '请选择计算周期' }]}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>
          </Form>
          <div style={{ height: '64px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center', flexShrink: 0, padding: '0 20px', margin: '24px 0 0 0' }}>
            <Button onClick={handleCalcCancel}>取消</Button>
            <Button type="primary" onClick={handleCalcSubmit} loading={calculateMutation.isPending}>确定</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// 向导式表单组件
interface AllocationWizardFormProps {
  form: any;
  editingConfig: AllocationConfig | null;
  attendanceCodes: any[];
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const AllocationWizardForm: React.FC<AllocationWizardFormProps> = ({
  form,
  editingConfig,
  attendanceCodes,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: '定义来源',
    },
    {
      title: '分配规则',
    },
  ];

  const next = async () => {
    try {
      if (currentStep === 0) {
        // 验证第一步
        await form.validateFields(['configCode', 'configName']);
        console.log('第一步验证通过，当前form值:', form.getFieldsValue(true));
      } else if (currentStep === 1) {
        // 验证第二步并提交
        const rules = form.getFieldValue('rules');
        if (!rules || rules.length === 0) {
          message.warning('请至少添加一条分摊规则');
          return;
        }

        // 验证每条规则都有生效日期
        const invalidRules = rules.filter((rule: any) => !rule.effectiveStartTime);
        if (invalidRules.length > 0) {
          message.warning('分配规则的生效日期不能为空');
          return;
        }

        console.log('第二步验证通过，当前form值:', form.getFieldsValue(true));
        onSubmit();
        return;
      }
      console.log('从步骤', currentStep, '进入步骤', currentStep + 1);
      console.log('切换前的form值:', form.getFieldsValue(true));
      setCurrentStep(currentStep + 1);
      // 延迟打印，确保状态更新后查看
      setTimeout(() => {
        console.log('切换后的form值:', form.getFieldsValue(true));
      }, 100);
    } catch (error) {
      console.error('验证失败:', error);
      message.error('请填写所有必填字段');
    }
  };

  const prev = () => {
    console.log('从步骤', currentStep, '返回步骤', currentStep - 1);
    console.log('返回前的form值:', form.getFieldsValue(true));
    setCurrentStep(currentStep - 1);
    // 延迟打印，确保状态更新后查看
    setTimeout(() => {
      console.log('返回后的form值:', form.getFieldsValue(true));
    }, 100);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <StepOneDefineSource form={form} attendanceCodes={attendanceCodes} editingConfig={editingConfig} />;
      case 1:
        return <StepTwoAllocationRules
          key={editingConfig?.id || 'new'}
          form={form}
          attendanceCodes={attendanceCodes}
          editingConfig={editingConfig}
        />;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ paddingTop: '24px', paddingBottom: '24px', paddingLeft: '12px', paddingRight: '12px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Steps current={currentStep} items={steps} style={{ marginBottom: 16, flexShrink: 0 }} />

        <Form form={form} layout="vertical" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {renderStepContent()}
          </div>
        </Form>
      </div>

      <div style={{ height: '64px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center', flexShrink: 0, padding: '0 20px', margin: 0, width: '100%' }}>
          {currentStep > 0 && (
            <Button onClick={prev} icon={<LeftOutlined />}>
              上一步
            </Button>
          )}
          {currentStep < steps.length - 1 && (
            <Button type="primary" onClick={next} icon={<RightOutlined />}>
              下一步
            </Button>
          )}
          {currentStep === steps.length - 1 && (
            <>
              <Button onClick={onCancel}>取消</Button>
              <Button type="primary" onClick={next} loading={isSubmitting}>
                完成
              </Button>
            </>
          )}
        </div>
    </div>
  );
};

// 第一步：定义来源
interface StepOneProps {
  form: any;
  attendanceCodes: any[];
  editingConfig?: AllocationConfig | null;
}

const StepOneDefineSource: React.FC<StepOneProps> = ({ form, attendanceCodes, editingConfig }) => {
  // 使用 useState 存储 filterGroups
  const [filterGroups, setFilterGroups] = useState<any[]>([]);
  const [updateCount, setUpdateCount] = useState(0);

  // 监听基本字段值的变化，用于调试
  const configCode = Form.useWatch('configCode', form);
  const configName = Form.useWatch('configName', form);

  // 初始化默认条件组
  useEffect(() => {
    const currentFilterGroups = form.getFieldValue(['sourceConfig', 'filterGroups']);
    console.log('初始化检查 - 当前filterGroups:', currentFilterGroups);
    if (!currentFilterGroups || currentFilterGroups.length === 0) {
      console.log('设置默认条件组');
      form.setFieldValue(['sourceConfig', 'filterGroups'], [
        {
          employeeFilter: { fieldGroups: [{ id: Date.now().toString(), conditions: [] }] },
          workHoursFilter: { hierarchySelections: [], attendanceCodes: [] },
        },
      ]);
    }
    // 设置初始状态
    setFilterGroups(currentFilterGroups || []);
  }, []);

  useEffect(() => {
    console.log('StepOneDefineSource - 组件挂载/更新');
    console.log('当前configCode:', configCode);
    console.log('当前configName:', configName);
    console.log('filterGroups:', filterGroups);
    console.log('filterGroups 数量:', filterGroups.length);
  }, [configCode, configName, filterGroups, updateCount]);

  // 添加条件组
  const addFilterGroup = () => {
    console.log('=== 添加条件组被点击 ===');
    const currentGroups = form.getFieldValue(['sourceConfig', 'filterGroups']) || [];
    console.log('当前条件组数量:', currentGroups.length);

    const newGroups = [
      ...currentGroups,
      {
        id: `group_${Date.now()}`,
        employeeFilter: { fieldGroups: [{ id: Date.now().toString(), conditions: [] }] },
        workHoursFilter: { hierarchySelections: [], attendanceCodes: [] },
      },
    ];

    form.setFieldValue(['sourceConfig', 'filterGroups'], newGroups);

    // 立即更新本地状态
    setFilterGroups(newGroups);
    setUpdateCount(prev => prev + 1);

    console.log('✅ 新条件组数量:', newGroups.length);
  };

  // 删除条件组
  const removeFilterGroup = (index: number) => {
    const currentGroups = form.getFieldValue(['sourceConfig', 'filterGroups']) || [];
    const newGroups = currentGroups.filter((_: any, i: number) => i !== index);
    form.setFieldValue(['sourceConfig', 'filterGroups'], newGroups);
    setFilterGroups(newGroups);
    setUpdateCount(prev => prev + 1);
  };

  // 判断是否禁用数据源编辑（已启用的配置不可修改数据源）
  const isDataSourceDisabled = editingConfig?.status === 'ACTIVE';

  // 判断是否是失效状态（失效状态只能修改规则名称、描述和分配规则的生效/失效日期）
  const isInactiveStatus = editingConfig?.status === 'INACTIVE';

  return (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="规则代码"
            name="configCode"
            rules={[{ required: true, message: '请输入规则代码' }]}
          >
            <Input placeholder="如：ALLOC_001" disabled={!!editingConfig || isDataSourceDisabled} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="规则名称"
            name="configName"
            rules={[{ required: true, message: '请输入规则名称' }]}
          >
            <Input placeholder="如：车间间接工时分摊" disabled={isDataSourceDisabled || isInactiveStatus} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label="规则描述"
        name="description"
      >
        <TextArea rows={2} placeholder="请描述规则的作用和适用范围" disabled={isDataSourceDisabled || isInactiveStatus} />
      </Form.Item>

      <Divider style={{ margin: '24px 0' }}><span style={{ fontWeight: 500, color: 'var(--color-text-secondary)' }}>筛选条件</span></Divider>

      {/* 条件组列表 */}
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        {filterGroups.map((group: any, groupIndex: number) => (
          <Card
            key={groupIndex}
            size="small"
            title={<span style={{ fontWeight: 500 }}>条件组 {groupIndex + 1}</span>}
            extra={
              <Space size={8}>
                {!isDataSourceDisabled && !isInactiveStatus && filterGroups.length > 1 && (
                  <Popconfirm
                    overlayClassName="custom-popconfirm"
                    title="确认删除"
                    description="确定要删除这组条件吗？"
                    onConfirm={() => removeFilterGroup(groupIndex)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button type="link" size="small" danger icon={<DeleteOutlined />} style={{ padding: '0 4px' }}>
                      删除
                    </Button>
                  </Popconfirm>
                )}
                {groupIndex < filterGroups.length - 1 && (
                  <Tag color="orange">OR</Tag>
                )}
                {(isDataSourceDisabled || isInactiveStatus) && (
                  <Tag color="blue" icon={<EditOutlined />}>已锁定</Tag>
                )}
              </Space>
            }
            style={{
              background: (isDataSourceDisabled || isInactiveStatus) ? 'var(--color-bg-disabled)' : 'var(--color-bg-light)',
              border: '1px solid var(--color-border-1)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            {/* 人员筛选区域 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: '2px solid var(--color-primary)'
              }}>
                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--color-primary)'
                }}>
                  人员筛选
                </span>
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  （设置符合条件的人员）
                </span>
              </div>
              <Form.Item
                name={['sourceConfig', 'filterGroups', groupIndex, 'employeeFilter', 'fieldGroups']}
                style={{ marginBottom: 0 }}
              >
                <EmployeeFieldFilter disabled={isDataSourceDisabled || isInactiveStatus} />
              </Form.Item>
            </div>

            {/* 工时筛选区域 */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: '2px solid var(--color-success)'
              }}>
                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--color-success)'
                }}>
                  工时筛选
                </span>
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  （设置工时的归属类型和出勤代码）
                </span>
              </div>

              <Form.Item
                name={['sourceConfig', 'filterGroups', groupIndex, 'workHoursFilter']}
                style={{ marginBottom: 0 }}
              >
                <WorkHoursFilter attendanceCodes={attendanceCodes} disabled={isDataSourceDisabled || isInactiveStatus} />
              </Form.Item>
            </div>
          </Card>
        ))}

        {/* 添加条件组按钮 */}
        {!isDataSourceDisabled && !isInactiveStatus && (
          <Button
            type="dashed"
            onClick={addFilterGroup}
            icon={<PlusOutlined />}
            block
            style={{ height: 32 }}
          >
            添加条件组（OR关系）
          </Button>
        )}
      </Space>
    </div>
  );
};

// 第二步：分摊规则
interface StepTwoProps {
  form: any;
  attendanceCodes: any[];
  editingConfig?: AllocationConfig | null;
}

const StepTwoAllocationRules: React.FC<StepTwoProps> = ({ form, attendanceCodes, editingConfig }) => {
  const [rules, setRules] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // 判断是否是失效状态（失效状态只能修改生效日期和失效日期）
  const isInactiveStatus = editingConfig?.status === 'INACTIVE';

  // 获取层级配置列表（用于分配归属）
  const { data: hierarchyLevels, isLoading: levelsLoading } = useQuery({
    queryKey: ['accountHierarchyLevelsWithDetails'],
    queryFn: () =>
      request.get('/account/hierarchy-config/levels/with-details').then((res: any) => res || []),
  });

  // 监听表单rules字段的变化
  useEffect(() => {
    const currentRules = form.getFieldValue('rules') || [];
    console.log('=== StepTwoAllocationRules useEffect ===');
    console.log('组件挂载或更新');
    console.log('editingConfig:', editingConfig);
    console.log('form.getFieldValue(rules):', currentRules);
    console.log('form.getFieldsValue(true):', form.getFieldsValue(true));
    console.log('当前层级配置:', hierarchyLevels);

    // 如果是编辑模式且有规则数据，直接设置
    if (editingConfig && currentRules && currentRules.length > 0) {
      console.log('编辑模式：设置规则', currentRules);
      setRules(currentRules);
      setIsInitialized(true);
    } else if (!isInitialized) {
      // 首次初始化
      setRules(currentRules);
      setIsInitialized(true);
    }
  }, [form, editingConfig, isInitialized]); // 监听form对象和editingConfig，确保两者变化时都会更新

  // 额外监听：当editingConfig变化时，也要更新rules（使用多个延迟确保表单值已设置）
  useEffect(() => {
    if (editingConfig) {
      console.log('=== editingConfig 变化 ===', editingConfig.id);
      // 使用多个延迟尝试获取表单值
      const delays = [0, 50, 100, 200];

      const timers = delays.map(delay =>
        setTimeout(() => {
          const currentRules = form.getFieldValue('rules') || [];
          console.log(`延迟${delay}ms - 规则:`, currentRules);
          if (currentRules.length > 0) {
            console.log('✅ 成功获取到规则，更新state');
            setRules(currentRules);
          }
        }, delay)
      );

      return () => {
        timers.forEach(timer => clearTimeout(timer));
      };
    }
  }, [editingConfig]);

  // 当层级数据加载完成后，验证并更新rules中的层级ID
  useEffect(() => {
    if (!levelsLoading && hierarchyLevels && hierarchyLevels.length > 0) {
      const currentRules = form.getFieldValue('rules') || [];
      console.log('层级数据已加载，验证规则中的层级ID');
      console.log('可用层级:', hierarchyLevels.map((h: any) => ({ id: h.id, name: h.name })));

      // 验证每个规则的allocationScope是否有效
      const validHierarchyIds = new Set(hierarchyLevels.map((h: any) => h.id));

      currentRules.forEach((rule: any, index: number) => {
        if (rule.allocationScope && !validHierarchyIds.has(rule.allocationScope)) {
          console.warn(`规则${index}的allocationScope ${rule.allocationScope} 不在可用层级中`);
        }
      });
    }
  }, [levelsLoading, hierarchyLevels, form]);

  const allocationBasisOptions = [
    { value: 'ACTUAL_HOURS', label: '实际工时比例', description: '根据各目标的实际工时比例分配间接工时' },
    // { value: 'ACTUAL_HOURS_COEFFICIENT', label: '按实际工时系数比例', description: '根据各目标的实际工时系数（金额）比例分配' },
    { value: 'ACTUAL_YIELDS', label: '实际产量比例', description: '根据各目标的实际产量比例分配间接工时' },
    { value: 'PRODUCTION_LINE_AVERAGE', label: '产线平均', description: '将间接工时平均分配给各生产线' },
    // 隐藏以下两种分配方式，但逻辑保留
    // { value: 'EQUIVALENT_YIELDS', label: '按同效产量比例分配', description: '根据各目标的同效产量比例分配间接工时' },
    // { value: 'STANDARD_HOURS', label: '按标准工时比例分配', description: '根据各目标的标准工时比例分配间接工时' },
  ];

  const handleAddRule = () => {
    const newRule = {
      ruleName: `分摊规则${rules.length + 1}`,
      ruleType: 'PROPORTIONAL',
      allocationBasis: 'ACTUAL_HOURS',
      allocationAttendanceCodes: [],
      allocationHierarchyLevels: [],
      allocationScope: null, // 用户需要从层级列表中选择
      basisFilter: {},
      targets: [],
      sortOrder: rules.length,
      status: 'ACTIVE',
      effectiveStartTime: null,
      effectiveEndTime: null,
      description: '',
    };

    // 新增时不需要验证时间交叉，因为还没有设置时间
    const newRules = [...rules, newRule];
    console.log('新增规则:', newRule);
    console.log('新增后的rules:', newRules);
    setRules(newRules);
    form.setFieldsValue({ rules: newRules });
  };

  const handleRemoveRule = (index: number) => {
    const ruleToRemove = rules[index];

    // 只有已保存的规则（有id）才需要验证日期
    if (ruleToRemove.id) {
      const startDate = ruleToRemove.effectiveStartTime ? dayjs(ruleToRemove.effectiveStartTime).startOf('day') : null;
      const endDate = ruleToRemove.effectiveEndTime ? dayjs(ruleToRemove.effectiveEndTime).startOf('day') : null;
      const currentDate = dayjs().startOf('day');

      // 如果当前日期 >= 生效日期，则不允许删除
      if (startDate && !currentDate.isBefore(startDate)) {
        message.warning('该规则已经生效，不允许删除');
        return;
      }

      // 如果当前日期 > 失效日期，则不允许删除
      if (endDate && currentDate.isAfter(endDate)) {
        message.warning('该规则已过期，不允许删除');
        return;
      }
    }

    const newRules = rules.filter((_, i) => i !== index);

    // 如果删除的不是第一条规则，检查前一条规则的失效日期
    // 如果前一条规则的失效日期刚好是被删除规则生效日期的前一天，清空失效日期
    if (index > 0 && ruleToRemove.effectiveStartTime) {
      const previousRule = newRules[index - 1];
      if (previousRule && previousRule.effectiveEndTime) {
        const removedRuleStartDate = dayjs(ruleToRemove.effectiveStartTime);
        const previousRuleEndDate = dayjs(previousRule.effectiveEndTime);

        // 如果前一条规则的失效日期 = 被删除规则生效日期 - 1天，清空失效日期
        if (previousRuleEndDate.isSame(removedRuleStartDate.subtract(1, 'day'), 'day')) {
          previousRule.effectiveEndTime = null;
        }
      }
    }

    setRules(newRules);
    form.setFieldsValue({ rules: newRules });
  };

  // 辅助函数：执行规则更新逻辑
  const performRuleUpdate = (index: number, field: string, value: any) => {
    console.log('performRuleUpdate 调用:', { index, field, value });

    // 如果更新的是时间字段，需要验证时间交叉
    if (field === 'effectiveStartTime' || field === 'effectiveEndTime') {
      const currentRule = rules[index];
      const newStartTime = field === 'effectiveStartTime' ? value : currentRule.effectiveStartTime;
      const newEndTime = field === 'effectiveEndTime' ? value : currentRule.effectiveEndTime;

      // 验证失效日期必须大于等于生效日期
      if (newStartTime && newEndTime) {
        const startDate = dayjs(newStartTime).startOf('day');
        const endDate = dayjs(newEndTime).startOf('day');

        if (endDate.isBefore(startDate)) {
          message.error('失效日期必须大于或等于生效日期');
          return;
        }
      }

      // 如果修改的是生效日期，先处理自动设置失效日期
      if (field === 'effectiveStartTime' && value && index > 0) {
        // 向前查找最近的一条没有失效日期的规则
        let targetIndex = -1;
        for (let i = index - 1; i >= 0; i--) {
          if (!rules[i].effectiveEndTime) {
            targetIndex = i;
            console.log(`找到未设置失效日期的规则: 规则${i + 1}`);
            break;
          }
        }

        if (targetIndex !== -1) {
          const previousRuleEndDate = dayjs(value).subtract(1, 'day').toISOString();
          console.log(`自动设置规则${targetIndex + 1}的失效日期为:`, dayjs(previousRuleEndDate).format('YYYY-MM-DD'));

          // 创建临时规则数组用于验证
          const tempRules = [...rules];
          tempRules[targetIndex] = {
            ...tempRules[targetIndex],
            effectiveEndTime: previousRuleEndDate,
          };
          tempRules[index] = {
            ...tempRules[index],
            [field]: value,
          };

          // 使用临时规则验证（排除当前正在编辑的规则）
          const hasOverlap = validateRuleTimeOverlapWithRules(newStartTime, newEndTime, index, tempRules);

          if (hasOverlap) {
            message.error('日期区间已有现有规则交叉，请调整日期区间');
            return;
          }

          // 验证通过，应用更改
          setRules(tempRules);
          form.setFieldsValue({ rules: tempRules });
          console.log('已更新所有规则');
          return;
        } else {
          console.log('前面所有规则都已设置失效日期，跳过自动设置');
        }
      }

      // 只有设置了开始时间才进行验证
      if (newStartTime) {
        const hasOverlap = validateRuleTimeOverlap(newStartTime, newEndTime, index);

        if (hasOverlap) {
          message.error('日期区间已有现有规则交叉，请调整日期区间');
          return;
        }
      }
    }

    const newRules = [...rules];
    newRules[index] = {
      ...newRules[index],
      [field]: value,
    };
    setRules(newRules);
    form.setFieldsValue({ rules: newRules });
    console.log('普通更新完成');
  };

  const handleUpdateRule = (index: number, field: string, value: any) => {
    // 如果更新的是生效日期，检查是否小于今天
    if (field === 'effectiveStartTime' && value) {
      const startDate = dayjs(value).startOf('day');
      const today = dayjs().startOf('day');

      if (startDate.isBefore(today)) {
        Modal.confirm({
          title: '提示',
          icon: null,
          content: '当前生效日期为历史日期，请确认是否继续',
          okText: '确定',
          cancelText: '取消',
          centered: true,
          className: 'deactivate-modal-single-title',
          onOk: () => {
            // 用户确认后继续执行原有的逻辑
            performRuleUpdate(index, field, value);
          },
        });
        return; // 等待用户确认，暂时不继续执行
      }
    }

    // 如果更新的是失效日期，检查是否小于今天
    if (field === 'effectiveEndTime' && value) {
      const endDate = dayjs(value).startOf('day');
      const today = dayjs().startOf('day');

      if (endDate.isBefore(today)) {
        Modal.confirm({
          title: '提示',
          icon: null,
          content: '当前失效日期为历史日期，请确认是否继续',
          okText: '确定',
          cancelText: '取消',
          centered: true,
          className: 'deactivate-modal-single-title',
          onOk: () => {
            // 用户确认后继续执行原有的逻辑
            performRuleUpdate(index, field, value);
          },
        });
        return; // 等待用户确认，暂时不继续执行
      }
    }

    // 直接执行更新逻辑
    performRuleUpdate(index, field, value);
  };

  const getAllocationBasisLabel = (basis: string) => {
    const option = allocationBasisOptions.find(opt => opt.value === basis);
    return option?.label || basis;
  };

  // 验证规则时间是否与现有规则交叉（支持传入自定义规则数组）
  const validateRuleTimeOverlapWithRules = (
    newRuleStartTime: string | null,
    newRuleEndTime: string | null,
    excludeIndex: number = -1,
    customRules?: any[]
  ): boolean => {
    const newStart = newRuleStartTime ? dayjs(newRuleStartTime).startOf('day') : null;
    const newEnd = newRuleEndTime ? dayjs(newRuleEndTime).startOf('day') : null;
    const rulesToCheck = customRules || rules;

    // 遍历所有现有规则（除了排除的索引）
    for (let i = 0; i < rulesToCheck.length; i++) {
      if (i === excludeIndex) continue; // 跳过当前正在编辑的规则

      const rule = rulesToCheck[i];
      if (!rule.effectiveStartTime) continue; // 没有开始时间的规则跳过

      const existingStart = dayjs(rule.effectiveStartTime).startOf('day');
      const existingEnd = rule.effectiveEndTime ? dayjs(rule.effectiveEndTime).startOf('day') : null;

      // 检查时间是否交叉
      let hasOverlap = false;

      if (newStart && newEnd) {
        // 新规则有开始和结束时间
        hasOverlap =
          (newStart.isBefore(existingEnd || dayjs().add(100, 'years')) && newEnd.isAfter(existingStart)) ||
          (newStart.isSame(existingStart) || newEnd.isSame(existingEnd));
      } else if (newStart) {
        // 新规则只有开始时间（永久有效）
        hasOverlap = !existingEnd || newStart.isBefore(existingEnd);
      }

      if (hasOverlap) {
        return true; // 有时间交叉
      }
    }

    return false; // 没有时间交叉
  };

  // 验证规则时间是否与现有规则交叉
  const validateRuleTimeOverlap = (newRuleStartTime: string | null, newRuleEndTime: string | null, excludeIndex: number = -1): boolean => {
    return validateRuleTimeOverlapWithRules(newRuleStartTime, newRuleEndTime, excludeIndex, rules);
  };

  const getAllocationBasisColor = (basis: string) => {
    const colors: Record<string, string> = {
      'ACTUAL_HOURS': 'blue',
      'ACTUAL_HOURS_COEFFICIENT': 'cyan',
      'ACTUAL_YIELDS': 'green',
      'PRODUCTION_LINE_AVERAGE': 'orange',
      'EARNED_HOURS': 'purple',
      // 'EQUIVALENT_YIELDS': 'orange',  // 隐藏
      // 'STANDARD_HOURS': 'purple',  // 隐藏
    };
    return colors[basis] || 'default';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* 规则列表区域 - 可滚动 */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {rules.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--color-bg-light)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-border-2)' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无分摊规则，请点击下方按钮添加"
            />
          </div>
        ) : (
          <div>
            {rules.map((rule: any, index: number) => {
              console.log(`渲染规则 ${index}:`, rule);
              return (
              <Card
                key={index}
                size="small"
                style={{ marginBottom: 12, border: '1px solid var(--color-border-1)', borderRadius: 'var(--radius-md)' }}
                title={<span style={{ fontWeight: 500 }}>分配规则 {index + 1}</span>}
                extra={
                  <Button
                    type="link"
                    size="small"
                    danger
                    onClick={() => handleRemoveRule(index)}
                    disabled={
                      rule.id && (
                        isInactiveStatus ||
                        (rule.effectiveStartTime && !dayjs().startOf('day').isBefore(dayjs(rule.effectiveStartTime).startOf('day'))) ||
                        (rule.effectiveEndTime && dayjs().startOf('day').isAfter(dayjs(rule.effectiveEndTime).startOf('day')))
                      )
                    }
                    title={
                      isInactiveStatus
                        ? '失效状态不能删除规则'
                        : rule.id && rule.effectiveStartTime && !dayjs().startOf('day').isBefore(dayjs(rule.effectiveStartTime).startOf('day'))
                        ? '该规则已经生效，不允许删除'
                        : rule.id && rule.effectiveEndTime && dayjs().startOf('day').isAfter(dayjs(rule.effectiveEndTime).startOf('day'))
                        ? '该规则已过期，不允许删除'
                        : '删除此规则'
                    }
                    style={{ padding: '0 4px' }}
                  >
                    删除
                  </Button>
                }
              >
                {/* 第一行：分配方式 */}
                <Row gutter={16} style={{ marginBottom: 12 }}>
                  <Col span={24}>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                        <span style={{ color: '#ff4d4f', marginRight: 4, fontSize: 14 }}>*</span>
                        分配方式
                      </div>
                      <Select
                        value={rule.allocationBasis}
                        onChange={(val) => handleUpdateRule(index, 'allocationBasis', val)}
                        style={{ width: '100%' }}
                        disabled={
                          isInactiveStatus ||
                          (rule.id && rule.effectiveStartTime && dayjs().startOf('day').isAfter(dayjs(rule.effectiveStartTime)))
                        }
                      >
                        {allocationBasisOptions.map(option => (
                          <Select.Option key={option.value} value={option.value}>
                            {option.label}
                          </Select.Option>
                        ))}
                      </Select>
                    </div>
                  </Col>
                </Row>

                {/* 第二行：分配范围 */}
                <Row gutter={16} style={{ marginBottom: 12 }}>
                  <Col span={24}>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                        <span style={{ color: '#ff4d4f', marginRight: 4, fontSize: 14 }}>*</span>
                        分配范围（组织类型层级）
                      </div>
                      <Select
                        placeholder={levelsLoading ? "加载中..." : "请选择分配范围"}
                        value={rule.allocationScope}
                        onChange={(val) => handleUpdateRule(index, 'allocationScope', val)}
                        style={{ width: '100%' }}
                        loading={levelsLoading}
                        disabled={
                          isInactiveStatus ||
                          (rule.id && rule.effectiveStartTime && dayjs().startOf('day').isAfter(dayjs(rule.effectiveStartTime)))
                        }
                        options={hierarchyLevels
                          ?.filter((level: any) => level.mappingType === 'ORG')
                          .map((level: any) => ({
                            label: level.name,
                            value: level.id,
                            description: `分配到${level.name}级别`,
                          })) || []}
                        optionLabelProp="label"
                      >
                        {(option: any) => (
                          <div>
                            <div>{option.label}</div>
                            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{option.description}</div>
                          </div>
                        )}
                      </Select>
                    </div>
                  </Col>
                </Row>

                {/* 第三行：开始日期与失效日期 */}
                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                        <span style={{ color: '#ff4d4f', marginRight: 4, fontSize: 14 }}>*</span>
                        生效日期
                      </div>
                      <DatePicker
                        value={rule.effectiveStartTime ? dayjs(rule.effectiveStartTime) : null}
                        onChange={(date) => handleUpdateRule(index, 'effectiveStartTime', date ? date.toISOString() : null)}
                        style={{ width: '100%' }}
                        placeholder="选择生效日期"
                        popupClassName="hide-today-button"
                        disabled={rule.id && rule.effectiveStartTime && !dayjs().startOf('day').isBefore(dayjs(rule.effectiveStartTime).startOf('day'))}
                        renderExtraFooter={() => (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px', padding: '8px 0' }}>
                            <span
                              style={{ color: '#1890ff', cursor: 'pointer', fontSize: 14 }}
                              onClick={() => handleUpdateRule(index, 'effectiveStartTime', dayjs().toISOString())}
                            >
                              今天
                            </span>
                            <span
                              style={{ color: '#1890ff', cursor: 'pointer', fontSize: 14 }}
                              onClick={() => handleUpdateRule(index, 'effectiveStartTime', dayjs('9999-12-31').toISOString())}
                            >
                              永远
                            </span>
                          </div>
                        )}
                      />
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                        失效日期
                      </div>
                      <DatePicker
                        value={rule.effectiveEndTime ? dayjs(rule.effectiveEndTime) : null}
                        onChange={(date) => handleUpdateRule(index, 'effectiveEndTime', date ? date.toISOString() : null)}
                        style={{ width: '100%' }}
                        placeholder="失效日期（留空表示永久有效）"
                        popupClassName="hide-today-button"
                        renderExtraFooter={() => (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px', padding: '8px 0' }}>
                            <span
                              style={{ color: '#1890ff', cursor: 'pointer', fontSize: 14 }}
                              onClick={() => handleUpdateRule(index, 'effectiveEndTime', dayjs().toISOString())}
                            >
                              今天
                            </span>
                            <span
                              style={{ color: '#1890ff', cursor: 'pointer', fontSize: 14 }}
                              onClick={() => handleUpdateRule(index, 'effectiveEndTime', dayjs('9999-12-31').toISOString())}
                            >
                              永远
                            </span>
                          </div>
                        )}
                      />
                    </div>
                  </Col>
                </Row>
              </Card>
            );
          })}
        </div>
      )}
      </div>

      {/* 固定在底部的添加按钮 */}
      <div style={{ marginTop: 16, textAlign: 'center', flexShrink: 0 }}>
        <Button type="primary" onClick={handleAddRule} icon={<PlusOutlined />}>
          添加分摊规则
        </Button>
      </div>

      <Form.Item name="rules" hidden>
        <Input />
      </Form.Item>
    </div>
  );
};

// 第三步：生效时间
interface StepThreeProps {
  form: any;
}

const StepThreeEffectiveTime: React.FC<StepThreeProps> = ({ form }) => {
  const [conflictCheck, setConflictCheck] = useState<any[]>([]);

  const handleDateChange = () => {
    // 这里应该调用后端API检查时间冲突
    // 模拟冲突检测
    setConflictCheck([]);
  };

  return (
    <div>
      <Alert
        message="设置生效时间"
        description="配置规则的有效期和优先级"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="生效日期"
            name="effectiveStartTime"
            rules={[{ required: true, message: '请选择生效日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              onChange={handleDateChange}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="失效日期"
            name="effectiveEndTime"
          >
            <DatePicker
              style={{ width: '100%' }}
              onChange={handleDateChange}
            />
          </Form.Item>
        </Col>
      </Row>

      {conflictCheck.length > 0 && (
        <Alert
          message="发现时间冲突"
          description={
            <div>
              <p>该时间段内已有以下配置：</p>
              <ul>
                {conflictCheck.map((conflict: any) => (
                  <li key={conflict.id}>
                    {conflict.configName} ({conflict.effectiveStartTime} ~ {conflict.effectiveEndTime || '永久'})
                  </li>
                ))}
              </ul>
              <p>是否要停用这些配置并启用新配置？</p>
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" danger>
              确认覆盖
            </Button>
          }
        />
      )}

      <Form.Item
        label="优先级"
        name="priority"
        tooltip="数字越大优先级越高，当时间重叠时按优先级执行"
        initialValue={0}
      >
        <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="0-100" />
      </Form.Item>
    </div>
  );
};

// 配置详情组件
const AllocationConfigDetail: React.FC<{ configId: number | null }> = ({ configId }) => {
  const { data: configDetail, isLoading } = useQuery({
    queryKey: ['allocationConfigDetail', configId],
    queryFn: () =>
      request.get(`/allocation/configs/${configId}`).then((res: any) => res),
    enabled: !!configId,
  });

  // 获取层级配置列表（用于显示分配归属）
  const { data: hierarchyLevels } = useQuery({
    queryKey: ['accountHierarchyLevelsWithDetails'],
    queryFn: () =>
      request.get('/account/hierarchy-config/levels/with-details').then((res: any) => res || []),
    enabled: !!configId,
  });

  // 获取层级名称的辅助函数
  const getHierarchyLevelName = (levelId: number) => {
    const level = hierarchyLevels?.find((l: any) => l.id === levelId);
    return level?.name || `层级${levelId}`;
  };

  // 获取分摊依据标签的辅助函数
  const getAllocationBasisLabel = (basis: string) => {
    const basisMap: Record<string, string> = {
      'ACTUAL_HOURS': '实际工时比例',
      'ACTUAL_YIELDS': '实际产量比例',
      // 'EQUIVALENT_YIELDS': '按同效产量比例分配',  // 隐藏
      // 'STANDARD_HOURS': '按标准工时比例分配',  // 隐藏
    };
    return basisMap[basis] || basis;
  };

  // 格式化筛选条件显示
  const renderEmployeeFilter = (employeeFilter: any) => {
    if (!employeeFilter || !employeeFilter.fieldGroups || employeeFilter.fieldGroups.length === 0) {
      return <span style={{ color: '#999' }}>未配置人员筛选条件</span>;
    }

    return (
      <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
        {employeeFilter.fieldGroups.map((group: any, groupIdx: number) => (
          <div key={groupIdx} style={{ marginBottom: groupIdx < employeeFilter.fieldGroups.length - 1 ? 8 : 0 }}>
            <Tag color="blue">条件组 {groupIdx + 1}</Tag>
            {group.conditions && group.conditions.length > 0 ? (
              <div style={{ marginTop: 8 }}>
                {group.conditions.map((condition: any, idx: number) => (
                  <Tag key={idx} color="geekblue" style={{ marginBottom: 4 }}>
                    {condition.fieldName} {condition.operator} {condition.value}
                  </Tag>
                ))}
              </div>
            ) : (
              <span style={{ color: '#999', marginLeft: 8 }}>无条件</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) return <div>加载中...</div>;
  if (!configDetail) return <Empty description="无数据" />;

  return (
    <div>
      <Card title="基本信息" size="small" style={{ marginBottom: 16, borderRadius: 'var(--radius-md)' }}>
        <Row gutter={16}>
          <Col span={12}>
            <p style={{ marginBottom: 8 }}><strong style={{ color: 'var(--color-text-secondary)' }}>配置编码：</strong>{configDetail.configCode}</p>
            <p style={{ marginBottom: 8 }}><strong style={{ color: 'var(--color-text-secondary)' }}>配置名称：</strong>{configDetail.configName}</p>
            <p style={{ marginBottom: 8 }}><strong style={{ color: 'var(--color-text-secondary)' }}>状态：</strong>
              <Tag color={configDetail.status === 'ACTIVE' ? 'green' : configDetail.status === 'DRAFT' ? 'default' : 'red'}>
                {configDetail.status === 'DRAFT' ? '草稿' : configDetail.status === 'ACTIVE' ? '生效' : '失效'}
              </Tag>
            </p>
          </Col>
          <Col span={12}>
            <p style={{ marginBottom: 8 }}><strong style={{ color: 'var(--color-text-secondary)' }}>生效时间：</strong>{dayjs(configDetail.effectiveStartTime).format('YYYY-MM-DD')} 至 {configDetail.effectiveEndTime ? dayjs(configDetail.effectiveEndTime).format('YYYY-MM-DD') : '永久'}</p>
            <p style={{ marginBottom: 8 }}><strong style={{ color: 'var(--color-text-secondary)' }}>创建时间：</strong>{dayjs(configDetail.createdAt).format('YYYY-MM-DD HH:mm')}</p>
            <p style={{ marginBottom: 8 }}><strong style={{ color: 'var(--color-text-secondary)' }}>创建人：</strong>{configDetail.createdByName || '-'}</p>
          </Col>
        </Row>
        <div style={{ marginTop: 12 }}>
          <strong style={{ color: 'var(--color-text-secondary)' }}>描述：</strong>
          <p style={{ marginTop: 4, color: 'var(--color-text-secondary)', background: 'var(--color-bg-light)', padding: 8, borderRadius: 'var(--radius-md)' }}>
            {configDetail.description || '无描述'}
          </p>
        </div>
      </Card>

      <Card title={<span><strong>分摊源配置</strong></span>} size="small" style={{ marginBottom: 16, borderRadius: 'var(--radius-md)' }}>
        {configDetail.sourceConfig ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 500, color: 'var(--color-primary)' }}>出勤代码</div>
              <div style={{ minHeight: 32 }}>
                {configDetail.sourceConfig.attendanceCodes && configDetail.sourceConfig.attendanceCodes.length > 0 ? (
                  <Space wrap size={8}>
                    {configDetail.sourceConfig.attendanceCodes.map((code: string, idx: number) => (
                      <Tag key={idx} color="blue" style={{ padding: '4px 12px' }}>{code}</Tag>
                    ))}
                  </Space>
                ) : (
                  <span style={{ color: 'var(--color-text-tertiary)' }}>未配置出勤代码</span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontWeight: 500, color: 'var(--color-success)' }}>人员筛选</div>
              {renderEmployeeFilter(configDetail.sourceConfig.employeeFilter)}
            </div>

            <div>
              <div style={{ marginBottom: 8, fontWeight: 500, color: 'var(--color-warning)' }}>工时归属</div>
              {configDetail.sourceConfig.accountFilter && configDetail.sourceConfig.accountFilter.hierarchySelections && configDetail.sourceConfig.accountFilter.hierarchySelections.length > 0 ? (
                <div style={{ background: 'var(--color-primary-light)', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <Space wrap size={8}>
                    {configDetail.sourceConfig.accountFilter.hierarchySelections.map((selection: any, idx: number) => (
                      <Tag key={idx} color="orange">
                        {selection.hierarchyLevelName || selection.hierarchyLevelId}
                        {selection.accountName && ` > ${selection.accountName}`}
                      </Tag>
                    ))}
                  </Space>
                </div>
              ) : (
                <span style={{ color: 'var(--color-text-tertiary)' }}>未配置工时归属</span>
              )}
            </div>
          </>
        ) : (
          <Empty description="未配置分摊源" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>

      <Card title={<span><strong>分摊规则</strong> <Tag color="blue">{configDetail.rules?.length || 0} 条</Tag></span>} size="small" style={{ borderRadius: 'var(--radius-md)' }}>
        {configDetail.rules && configDetail.rules.length > 0 ? (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            {configDetail.rules.map((rule: any, ruleIdx: number) => (
              <Card
                key={rule.id}
                size="small"
                bordered
                style={{ background: 'var(--color-bg-light)', borderRadius: 'var(--radius-md)' }}
                title={
                  <Space size={8}>
                    <span style={{ fontWeight: 500 }}>分摊规则 {ruleIdx + 1}</span>
                    <Tag color="blue">{getAllocationBasisLabel(rule.allocationBasis)}</Tag>
                    {rule.status === 'ACTIVE' && <Tag color="green">生效中</Tag>}
                  </Space>
                }
              >
                <Row gutter={16} style={{ marginBottom: 12 }}>
                  <Col span={8}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>生效日期</div>
                    <div style={{ fontWeight: 500 }}>
                      {rule.effectiveStartTime ? dayjs(rule.effectiveStartTime).format('YYYY-MM-DD') : '-'}
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>失效日期</div>
                    <div style={{ fontWeight: 500 }}>
                      {rule.effectiveEndTime ? dayjs(rule.effectiveEndTime).format('YYYY-MM-DD') : '永久'}
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>排序</div>
                    <div style={{ fontWeight: 500 }}>{rule.sortOrder || 0}</div>
                  </Col>
                </Row>

                {rule.allocationScope && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>分配范围</div>
                    <Tag color="blue">{getHierarchyLevelName(rule.allocationScope)}</Tag>
                  </div>
                )}

                {rule.description && (
                  <div style={{ marginTop: 12, padding: 8, background: 'var(--color-bg-white)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>规则说明</div>
                    <div style={{ color: 'var(--color-text-secondary)' }}>{rule.description}</div>
                  </div>
                )}
              </Card>
            ))}
          </Space>
        ) : (
          <Empty description="未配置分摊规则" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>
    </div>
  );
};

export default AllocationConfigPage;
