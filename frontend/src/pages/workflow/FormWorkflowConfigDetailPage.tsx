import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Card,
  Tabs,
  Button,
  Space,
  Form,
  Input,
  Select,
  Checkbox,
  message,
  Row,
  Col,
  Divider,
  Modal,
  Tag,
  InputNumber,
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  SettingOutlined,
  EditOutlined,
  CheckOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  getBezierPath,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import request from '@/utils/request';
import { useAuthStore } from '@/stores/authStore';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;

// 节点类型配置
const NODE_TYPES = {
  start: { label: '开始', color: '#52c41a', type: 'start' },
  approval: { label: '审批', color: '#1890ff', type: 'approval' },
  condition: { label: '条件', color: '#faad14', type: 'condition' },
  cc: { label: '抄送', color: '#722ed1', type: 'cc' },
  end: { label: '结束', color: '#f5222d', type: 'end' },
};

// 条件操作符
const CONDITION_OPERATORS = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'ne' },
  { label: '大于', value: 'gt' },
  { label: '小于', value: 'lt' },
  { label: '大于等于', value: 'gte' },
  { label: '小于等于', value: 'lte' },
  { label: '包含', value: 'contains' },
  { label: '为空', value: 'empty' },
];

// 自定义审批节点组件
const ApprovalNode = ({ data, selected }: { data: any; selected?: boolean }) => {
  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: '8px',
        background: '#fff',
        border: selected ? '3px solid #1890ff' : '2px solid #1890ff',
        minWidth: '180px',
        boxShadow: selected ? '0 0 0 2px rgba(24, 144, 255, 0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#1890ff',
          width: 10,
          height: 10,
        }}
      />
      <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '14px' }}>
        {data.label || '审批节点'}
      </div>
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
        <Tag color="blue" style={{ margin: 0 }}>
          {data.needAllApprove ? '会签' : '或签'}
        </Tag>
      </div>
      <div style={{ fontSize: '12px', color: '#999' }}>
        {data.selectedParticipantIds?.length > 0
          ? `${data.selectedParticipantIds.length}个策略`
          : '未设置审批人'}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#1890ff',
          width: 10,
          height: 10,
        }}
      />
    </div>
  );
};

// 自定义条件节点组件
const ConditionNode = ({ data, selected }: { data: any; selected?: boolean }) => {
  const conditionCount = data.conditions?.length || 0;
  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: '8px',
        background: '#fff',
        border: selected ? '3px solid #faad14' : '2px solid #faad14',
        minWidth: '180px',
        boxShadow: selected ? '0 0 0 2px rgba(250, 173, 20, 0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#faad14',
          width: 10,
          height: 10,
        }}
      />
      <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '14px' }}>
        {data.label || '条件节点'}
      </div>
      <div style={{ fontSize: '12px', color: '#999' }}>
        {conditionCount > 0 ? `${conditionCount} 个条件` : '未配置条件'}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#faad14',
          width: 10,
          height: 10,
        }}
      />
    </div>
  );
};

// 自定义开始节点
const StartNode = ({ data, selected }: { data: any; selected?: boolean }) => (
  <div
    style={{
      padding: '12px 20px',
      borderRadius: '20px',
      background: '#52c41a',
      color: '#fff',
      minWidth: '100px',
      textAlign: 'center',
      border: selected ? '3px solid #389e0d' : '2px solid #389e0d',
      boxShadow: selected ? '0 0 0 2px rgba(82, 196, 26, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
      fontWeight: 'bold',
    }}
  >
    {data.label || '开始'}
    <Handle
      type="source"
      position={Position.Bottom}
      style={{
        background: '#52c41a',
        border: '2px solid #fff',
        width: 10,
        height: 10,
      }}
    />
  </div>
);

// 自定义结束节点
const EndNode = ({ data, selected }: { data: any; selected?: boolean }) => (
  <div
    style={{
      padding: '12px 20px',
      borderRadius: '20px',
      background: '#f5222d',
      color: '#fff',
      minWidth: '100px',
      textAlign: 'center',
      border: selected ? '3px solid #cf1322' : '2px solid #cf1322',
      boxShadow: selected ? '0 0 0 2px rgba(245, 34, 45, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
      fontWeight: 'bold',
    }}
  >
    <Handle
      type="target"
      position={Position.Top}
      style={{
        background: '#f5222d',
        border: '2px solid #fff',
        width: 10,
        height: 10,
      }}
    />
    {data.label || '结束'}
  </div>
);

// 自定义抄送节点
const CcNode = ({ data, selected }: { data: any; selected?: boolean }) => {
  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: '8px',
        background: '#fff',
        border: selected ? '3px solid #722ed1' : '2px solid #722ed1',
        minWidth: '180px',
        boxShadow: selected ? '0 0 0 2px rgba(114, 46, 209, 0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#722ed1',
          width: 10,
          height: 10,
        }}
      />
      <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '14px' }}>
        {data.label || '抄送节点'}
      </div>
      <div style={{ fontSize: '12px', color: '#999' }}>
        {data.selectedCcParticipantIds?.length > 0
          ? `${data.selectedCcParticipantIds.length}个策略`
          : '未设置抄送人'}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#722ed1',
          width: 10,
          height: 10,
        }}
      />
    </div>
  );
};

const nodeTypes = {
  approval: ApprovalNode,
  condition: ConditionNode,
  start: StartNode,
  end: EndNode,
  cc: CcNode,
};

const FormWorkflowConfigDetailPage: React.FC = () => {
  const { formKey } = useParams<{ formKey: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('design');
  const [form] = Form.useForm();

  // 当前选中的流程定义ID（默认选已发布的，如果没有则选最新的草稿）
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<number | null>(null);

  // 标记是否正在创建新版本（从已发布版本复制）
  const [isCreatingNewVersion, setIsCreatingNewVersion] = useState(false);

  // 使用 ref 存储状态，确保 mutationFn 总是能获取最新值
  const selectedDefinitionIdRef = useRef<number | null>(null);
  const isCreatingNewVersionRef = useRef(false);
  const workflowDetailRef = useRef<any>(null);

  // 流程图状态
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // 选中的节点或边
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  // 节点属性编辑抽屉状态
  const [nodeModalVisible, setNodeModalVisible] = useState(false);
  const [nodeForm] = Form.useForm();

  // 获取该表单的所有流程定义（只获取草稿和已发布的，排除已归档的）
  const { data: workflowDefinitions, isLoading: definitionsLoading } = useQuery({
    queryKey: ['workflowDefinitions', formKey],
    queryFn: async () => {
      const allResult = await request.get('/workflow/definitions', {
        params: {
          category: formKey,
          page: 1,
          pageSize: 100
        }
      });
      // 在客户端过滤掉已归档的版本，只保留草稿和已发布的
      return {
        ...allResult,
        items: allResult.items?.filter((item: any) =>
          item.status === 'DRAFT' || item.status === 'PUBLISHED'
        ) || []
      };
    },
    enabled: !!formKey,
  });

  // 获取选中的流程定义详情（包含流程设计）
  const { data: workflowDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['workflowDefinition', selectedDefinitionId],
    queryFn: async () => {
      if (!selectedDefinitionId) return null;
      return request.get(`/workflow/definitions/${selectedDefinitionId}`);
    },
    enabled: !!selectedDefinitionId,
  });

  // 更新 ref 当状态变化时（必须在使用 ref 的 useEffect 之后声明）
  useEffect(() => {
    selectedDefinitionIdRef.current = selectedDefinitionId;
  }, [selectedDefinitionId]);

  useEffect(() => {
    isCreatingNewVersionRef.current = isCreatingNewVersion;
  }, [isCreatingNewVersion]);

  useEffect(() => {
    workflowDetailRef.current = workflowDetail;
  }, [workflowDetail]);

  // 加载流程设计到画布
  useEffect(() => {
    console.log('==== 加载流程设计 ====');
    console.log('workflowDetail:', workflowDetail);
    console.log('workflowDetail?.flowConfig:', workflowDetail?.flowConfig);

    if (workflowDetail?.flowConfig) {
      try {
        const flowConfig = typeof workflowDetail.flowConfig === 'string'
          ? JSON.parse(workflowDetail.flowConfig)
          : workflowDetail.flowConfig;

        console.log('解析后的 flowConfig:', flowConfig);
        console.log('flowConfig.nodes:', flowConfig.nodes);
        console.log('flowConfig.edges:', flowConfig.edges);

        if (flowConfig.nodes && flowConfig.nodes.length > 0) {
          const mappedNodes = flowConfig.nodes.map((n: any, index: number) => {
            // 确保 position 存在且有效，如果无效则使用默认值
            const hasValidPosition = n.position &&
                                   typeof n.position.x === 'number' &&
                                   typeof n.position.y === 'number';

            return {
              ...n,
              position: hasValidPosition
                ? n.position
                : { x: 100 + (index % 3) * 250, y: 100 + Math.floor(index / 3) * 150 },
              data: {
                ...n.data,
                // 将后端的 approverStrategy 转换为前端使用的 selectedParticipantIds
                selectedParticipantIds: n.data.approverStrategy || n.data.selectedParticipantIds || [],
                // 将后端的 ccStrategy 转换为前端使用的 selectedCcParticipantIds
                selectedCcParticipantIds: n.data.ccStrategy || n.data.selectedCcParticipantIds || [],
              }
            };
          });
          console.log('映射后的 nodes:', mappedNodes);
          setNodes(mappedNodes);
        } else {
          console.log('没有节点，设置为空数组');
          setNodes([]);
        }

        if (flowConfig.edges && flowConfig.edges.length > 0) {
          console.log('设置 edges:', flowConfig.edges);
          setEdges(flowConfig.edges);
        } else {
          console.log('没有边，设置为空数组');
          setEdges([]);
        }

        // 设置表单基本信息
        if (workflowDetail.name) {
          form.setFieldValue('name', workflowDetail.name);
        }
        if (workflowDetail.description) {
          form.setFieldValue('description', workflowDetail.description);
        }

        console.log('流程设计加载完成');
      } catch (error) {
        console.error('加载流程设计失败:', error);
        setNodes([]);
        setEdges([]);
      }
    } else {
      // 如果没有流程设计，初始化为空
      console.log('没有 flowConfig，初始化为空');
      setNodes([]);
      setEdges([]);
    }
  }, [workflowDetail, form, setNodes, setEdges]);

  // 自动选中第一个流程定义
  useEffect(() => {
    console.log('==== 自动选择流程定义 ====');
    console.log('workflowDefinitions:', workflowDefinitions);
    console.log('selectedDefinitionId:', selectedDefinitionId);

    if (workflowDefinitions?.items && workflowDefinitions.items.length > 0) {
      console.log('找到流程定义数量:', workflowDefinitions.items.length);
      console.log('流程定义列表:', workflowDefinitions.items);

      if (!selectedDefinitionId) {
        // 优先选已发布的（选择最新的已发布版本，按发布时间倒序）
        const published = workflowDefinitions.items
          .filter((w: any) => w.status === 'PUBLISHED')
          .sort((a: any, b: any) => {
            // 按发布时间倒序，最新的在前
            const timeA = new Date(a.publishedAt || 0).getTime();
            const timeB = new Date(b.publishedAt || 0).getTime();
            return timeB - timeA;
          })[0]; // 取第一个（最新的）

        if (published) {
          console.log('选择已发布的流程:', published);
          setSelectedDefinitionId(published.id);
        } else {
          // 如果没有已发布的，选最新的草稿（按创建时间倒序）
          const drafts = workflowDefinitions.items
            .filter((w: any) => w.status === 'DRAFT')
            .sort((a: any, b: any) => {
              const timeA = new Date(a.createdAt).getTime();
              const timeB = new Date(b.createdAt).getTime();
              return timeB - timeA;
            });
          if (drafts.length > 0) {
            console.log('选择最新的草稿流程:', drafts[0]);
            setSelectedDefinitionId(drafts[0].id);
          }
        }
      } else {
        console.log('已有选中的流程定义ID:', selectedDefinitionId);
      }
    } else {
      console.log('没有找到流程定义');
    }
  }, [workflowDefinitions, selectedDefinitionId]);

  // 创建新版本（从当前版本复制）
  const handleCreateNewVersion = async () => {
    if (!workflowDetail) {
      message.warning('请先选择一个流程版本');
      return;
    }

    // 复制当前流程的节点和边
    const currentNodes = nodes.map(n => ({ ...n }));
    const currentEdges = edges.map(e => ({ ...e }));

    // 清除选中状态，表示要创建新版本
    setSelectedDefinitionId(null);
    setIsCreatingNewVersion(true);

    // 复制表单数据
    const formValues = form.getFieldsValue();
    form.setFieldsValue({
      ...formValues,
      name: `${formValues.name} (新版本)`,
    });

    // 保持节点和边不变
    setNodes(currentNodes);
    setEdges(currentEdges);

    message.success('已创建新版本，您可以基于当前流程进行修改');
  };

  // 切换到其他版本
  const handleSelectVersion = (definitionId: number) => {
    setSelectedDefinitionId(definitionId);
    setIsCreatingNewVersion(false);
  };

  // 获取预定义的参与人配置
  const { data: participantConfigs = [] } = useQuery({
    queryKey: ['workflowParticipants'],
    queryFn: async () => {
      return request.get('/workflow/participants');
    },
  });

  // 保存流程配置
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const currentSelectedId = selectedDefinitionIdRef.current;
      const currentIsCreating = isCreatingNewVersionRef.current;
      const currentWorkflowDetail = workflowDetailRef.current;

      console.log('==== 保存流程配置 ====');
      console.log('selectedDefinitionId:', currentSelectedId);
      console.log('isCreatingNewVersion:', currentIsCreating);
      console.log('workflowDetail?.status:', currentWorkflowDetail?.status);
      console.log('保存的数据:', JSON.stringify(data, null, 2));

      // 判断是否需要创建新版本
      const shouldCreateNew = !currentSelectedId || currentIsCreating ||
        (currentWorkflowDetail?.status === 'PUBLISHED' && currentSelectedId);

      if (shouldCreateNew) {
        // 创建新的流程定义
        console.log('创建���的流程定义');
        const requestData = {
          ...data,
          category: formKey,
          status: 'DRAFT',
        };
        console.log('发送到后端的数据:', JSON.stringify(requestData, null, 2));

        // 检查必需字段
        if (!requestData.name) {
          throw new Error('流程名称不能为空');
        }
        if (!requestData.code) {
          throw new Error('流程编码不能为空');
        }
        if (!requestData.flowConfig) {
          throw new Error('流程配置不能为空');
        }

        return request.post('/workflow/definitions', requestData);
      } else {
        // 更新现有流程定义
        console.log('更新现有流程定义:', currentSelectedId);
        return request.put(`/workflow/definitions/${currentSelectedId}`, data);
      }
    },
    onSuccess: (response) => {
      const currentIsCreating = isCreatingNewVersionRef.current;
      console.log('保存成功，响应:', response);

      message.success(currentIsCreating ? '新版本创建成功' : '保存成功');
      queryClient.invalidateQueries({ queryKey: ['workflowDefinitions'] });
      queryClient.invalidateQueries({ queryKey: ['workflowDefinitions', formKey] });

      // 如果是新建的，自动选中它
      if (currentIsCreating && response?.id) {
        setSelectedDefinitionId(response.id);
        setIsCreatingNewVersion(false);
      }
    },
    onError: (error: any) => {
      console.error('保存失败:', error);
      console.error('错误详情:', JSON.stringify(error.response?.data, null, 2));

      // 显示更详细的错误信息
      let errorMsg = '保存失败';
      if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      } else if (typeof error.response?.data === 'string') {
        errorMsg = error.response.data;
      }
      message.error(errorMsg);
    },
  });

  // 发布流程
  const publishMutation = useMutation({
    mutationFn: async (id: number) => {
      return request.post(`/workflow/definitions/${id}/publish`);
    },
    onSuccess: async (response) => {
      message.success('发布成功');

      // 立即更新本地状态，避免UI闪烁
      // 失效所有相关查询
      queryClient.invalidateQueries({ queryKey: ['workflowDefinitions'] });
      queryClient.invalidateQueries({ queryKey: ['workflowDefinitions', formKey] });

      // 强制重新获取当前定义的最新数据
      if (selectedDefinitionId) {
        await queryClient.refetchQueries({
          queryKey: ['workflowDefinition', selectedDefinitionId],
          type: 'active'
        });
      }

      // 重新获取列表以确保状态同步
      await queryClient.refetchQueries({ queryKey: ['workflowDefinitions', formKey] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '发布失败');
    },
  });

  // 复制流程（创建新版本）
  const duplicateMutation = useMutation({
    mutationFn: async (id: number) => {
      const detail = await request.get(`/workflow/definitions/${id}`);
      return request.post('/workflow/definitions', {
        name: `${detail.name} (副本)`,
        description: detail.description,
        category: detail.category,
        status: 'DRAFT',
        flowConfig: detail.flowConfig,
      });
    },
    onSuccess: (response) => {
      message.success('复制成功');
      queryClient.invalidateQueries({ queryKey: ['workflowDefinitions'] });
      queryClient.invalidateQueries({ queryKey: ['workflowDefinitions', formKey] });
      if (response?.id) {
        setSelectedDefinitionId(response.id);
      }
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '复制失败');
    },
  });

  // 处理发布
  const handlePublish = () => {
    if (!selectedDefinitionId) {
      message.error('请先选择一个流程版本');
      return;
    }
    Modal.confirm({
      title: '确认发布',
      content: '发布后将替换当前生效的版本，确定要发布吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        publishMutation.mutate(selectedDefinitionId);
      },
    });
  };

  // 处理复制
  const handleDuplicate = () => {
    if (!selectedDefinitionId) {
      message.error('请先选择一个流程版本');
      return;
    }
    duplicateMutation.mutate(selectedDefinitionId);
  };

  // 添加节点
  const addNode = (type: string) => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: NODE_TYPES[type as keyof typeof NODE_TYPES].label,
        needAllApprove: false,
        selectedParticipantIds: [],
        selectedCcParticipantIds: [],
      },
    };
    setNodes((nds) => [...nds, newNode]);
    message.success(`已添加${NODE_TYPES[type as keyof typeof NODE_TYPES].label}节点`);
  };

  // 连接节点
  const onConnect = useCallback(
    (params: Connection) => {
      // 检查是否已经存在连接
      const exists = edges.some(
        (edge) => edge.source === params.source && edge.target === params.target
      );
      if (exists) {
        message.warning('这两个节点之间已经存在连接');
        return;
      }

      // 如果是条件节点的输出，需要设置条件标签
      const sourceNode = nodes.find((n) => n.id === params.source);
      const newEdge: Edge = {
        ...params,
        id: `edge_${Date.now()}`,
        animated: false,
        label: '',
      };

      // 如果源节点是条件节点，需要配置条件
      if (sourceNode?.type === 'condition') {
        newEdge.label = '满足条件';
        newEdge.data = {
          conditionType: 'true', // 默认为true分支
          conditionExpression: '',
        };
        setEdges((eds) => [...eds, newEdge]);
        message.success('连接成功，条件节点需要配置条件分支');
      } else {
        setEdges((eds) => addEdge(newEdge, eds));
        message.success('连接成功');
      }
    },
    [setEdges, nodes, edges]
  );

  // 删除节点
  const deleteNode = useCallback(
    (nodeId: string) => {
      Modal.confirm({
        title: '确认删除',
        content: '确定要删除这个节点吗？相关的连线也会被删除。',
        okText: '确定',
        cancelText: '取消',
        onOk: () => {
          setNodes((nds) => nds.filter((n) => n.id !== nodeId));
          setEdges((eds) =>
            eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
          );
          if (selectedNode?.id === nodeId) {
            setSelectedNode(null);
          }
          message.success('节点已删除');
        },
      });
    },
    [setNodes, setEdges, selectedNode]
  );

  // 删除边（连线）
  const deleteEdge = useCallback(
    (edgeId: string) => {
      Modal.confirm({
        title: '确认删除',
        content: '确定要删除这条连线吗？',
        okText: '确定',
        cancelText: '取消',
        onOk: () => {
          setEdges((eds) => eds.filter((e) => e.id !== edgeId));
          if (selectedEdge?.id === edgeId) {
            setSelectedEdge(null);
          }
          message.success('连线已删除');
        },
      });
    },
    [setEdges, selectedEdge]
  );

  // 节点点击事件
  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    setNodeModalVisible(true);
    nodeForm.setFieldsValue(node.data);
  }, [nodeForm]);

  // 边点击事件
  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);

    // 如果是条件节点的输出边，显示条件配置
    if (edge.data?.conditionType) {
      Modal.info({
        title: '条件分支配置',
        content: (
          <div>
            <p>当前条件：{edge.label}</p>
            <p>条件类型：{edge.data.conditionType === 'true' ? '满足条件' : '不满足条件'}</p>
            <Button
              type="link"
              onClick={() => {
                // 可以打开一个编辑条件的模态框
              }}
            >
              编辑条件
            </Button>
          </div>
        ),
      });
    }
  }, []);

  // 画布点击事件（取消选择）
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  // 保存节点属性
  const handleSaveNodeProps = async () => {
    try {
      const values = await nodeForm.validateFields();
      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNode?.id
            ? { ...node, data: { ...node.data, ...values } }
            : node
        )
      );
      setNodeModalVisible(false);
      message.success('节点属性已保存');
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 删除按键处理
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // 确保不是在输入框中按下的
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          if (selectedNode) {
            event.preventDefault();
            deleteNode(selectedNode.id);
          } else if (selectedEdge) {
            event.preventDefault();
            deleteEdge(selectedEdge.id);
          }
        }
      }
    },
    [selectedNode, selectedEdge, deleteNode, deleteEdge]
  );

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onKeyDown]);

  // 保存流程配置
  const handleSave = async (forceCreateNew: boolean = false) => {
    try {
      await form.validateFields();

      // 验证流程
      const hasStart = nodes.some((n) => n.type === 'start');
      const hasEnd = nodes.some((n) => n.type === 'end');

      if (!hasStart) {
        message.error('流程必须包含开始节点');
        return;
      }

      if (!hasEnd) {
        message.error('流程必须包含结束节点');
        return;
      }

      if (edges.length === 0 && nodes.length > 1) {
        message.error('请连接节点');
        return;
      }

      const values = form.getFieldsValue();

      // 判断是否需要创建新版本
      const shouldCreateNew = !selectedDefinitionId || isCreatingNewVersion || forceCreateNew ||
        (workflowDetail?.status === 'PUBLISHED' && selectedDefinitionId);

      // 如果是已发布版本且没有点击创建新版本，提示用户
      if (!forceCreateNew && workflowDetail?.status === 'PUBLISHED' && selectedDefinitionId && !isCreatingNewVersion) {
        Modal.confirm({
          title: '创建新版本',
          content: '当前是已发布的版本，修改将创建为新版本。是否继续？',
          okText: '继续',
          cancelText: '取消',
          onOk: () => {
            // 直接执行保存逻辑，传入 forceCreateNew=true 避免重复检查
            handleSave(true);
          },
        });
        return;
      }

      // 重置创建新版本标记
      if (isCreatingNewVersion) {
        setIsCreatingNewVersion(false);
      }

      // 准备保存数据
      const saveData: any = {
        name: values.name,
        description: values.description,
        flowConfig: {
          nodes: nodes.map((n) => {
            const nodeData: any = {
              label: n.data.label,
              nodeType: n.data.nodeType,
            };

            // 审批节点
            if (n.type === 'approval') {
              nodeData.needAllApprove = n.data.needAllApprove ?? false;
              // 将前端使用的 selectedParticipantIds 转换为后端期望的 approverStrategy
              nodeData.approverStrategy = n.data.selectedParticipantIds || [];
            }

            // 条件节点
            if (n.type === 'condition') {
              nodeData.conditions = n.data.conditions || [];
            }

            // 抄送节点
            if (n.type === 'cc') {
              // 将前端使用的 selectedCcParticipantIds 转换为后端期望的字段
              nodeData.ccStrategy = n.data.selectedCcParticipantIds || [];
            }

            return {
              id: n.id,
              type: n.type,
              position: n.position,
              data: nodeData,
            };
          }),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            type: e.type,
            label: e.label,
            data: e.data,
          })),
        },
      };

      // 将 flowConfig 对象转换为 JSON 字符串（后端要求字符串类型）
      saveData.flowConfig = JSON.stringify(saveData.flowConfig);

      // 如果是创建新版本，添加必需字段
      if (shouldCreateNew) {
        saveData.code = `${formKey}_V${Date.now()}`;
        saveData.createdById = user?.id || 1;
        saveData.createdByName = user?.name || '系统管理员';
      }

      saveMutation.mutate(saveData);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 渲染节点属性编辑表单
  const renderNodeForm = () => {
    if (!selectedNode) return null;

    const nodeType = selectedNode.type;

    return (
      <Form form={nodeForm} layout="vertical">
        <Form.Item label="节点名称" name="label" rules={[{ required: true, message: '请输入节点名称' }]}>
          <Input placeholder="请输入节点名称" />
        </Form.Item>

        {nodeType === 'approval' && (
          <>
            <Form.Item
              label="会签配置"
              name="needAllApprove"
              valuePropName="checked"
              tooltip="勾选后，该节点的所有审批人都需要审批通过才能进入下一节点；不勾选则任意一人审批通过即可"
            >
              <Checkbox>需要所有人都审批通过（会签）</Checkbox>
            </Form.Item>

            <Form.Item
              label="审批人策略"
              name="selectedParticipantIds"
              tooltip="从预定义的参与人配置中选择，可以多选"
              rules={[{ required: true, message: '请至少选择一个审批人策略' }]}
            >
              <Select
                mode="multiple"
                placeholder="请选择审批人策略"
                showSearch
                optionFilterProp="label"
              >
                {participantConfigs
                  .filter((config: any) => config.status === 'ACTIVE')
                  .map((config: any) => (
                    <Option
                      key={config.id}
                      value={config.id}
                      label={`${config.name} (${config.code})`}
                    >
                      <Space>
                        <span>{config.name}</span>
                        <Tag color="blue">{config.code}</Tag>
                      </Space>
                    </Option>
                  ))}
              </Select>
            </Form.Item>
          </>
        )}

        {nodeType === 'condition' && (
          <>
            <Divider orientation="left">条件配置</Divider>
            <Form.List name="conditions">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, 'field']}
                        rules={[{ required: true, message: '请选择字段' }]}
                      >
                        <Select placeholder="字段" style={{ width: 120 }}>
                          <Option value="amount">金额</Option>
                          <Option value="days">天数</Option>
                          <Option value="status">状态</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'operator']}
                        rules={[{ required: true, message: '请选择操作符' }]}
                      >
                        <Select placeholder="操作符" style={{ width: 120 }}>
                          {CONDITION_OPERATORS.map((op) => (
                            <Option key={op.value} value={op.value}>
                              {op.label}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <Form.Item
                        {...restField}
                        name={[name, 'value']}
                        rules={[{ required: true, message: '请输入值' }]}
                      >
                        <Input placeholder="值" style={{ width: 120 }} />
                      </Form.Item>
                      <DeleteOutlined onClick={() => remove(name)} />
                    </Space>
                  ))}
                  <Form.Item>
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      添加条件
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form.List>
          </>
        )}

        {nodeType === 'cc' && (
          <>
            <Form.Item
              label="抄送人策略"
              name="selectedCcParticipantIds"
              tooltip="从预定义的参与人配置中选择，可以多选"
              rules={[{ required: true, message: '请至少选择一个抄送人策略' }]}
            >
              <Select
                mode="multiple"
                placeholder="请选择抄送人策略"
                showSearch
                optionFilterProp="label"
              >
                {participantConfigs
                  .filter((config: any) => config.status === 'ACTIVE')
                  .map((config: any) => (
                    <Option
                      key={config.id}
                      value={config.id}
                      label={`${config.name} (${config.code})`}
                    >
                      <Space>
                        <span>{config.name}</span>
                        <Tag color="blue">{config.code}</Tag>
                      </Space>
                    </Option>
                  ))}
              </Select>
            </Form.Item>

            <Form.Item label="抄送消息" name="ccMessage">
              <TextArea rows={3} placeholder="请输入抄送消息" />
            </Form.Item>
          </>
        )}
      </Form>
    );
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 顶部 */}
      <div style={{
        padding: '8px 16px',
        background: '#fff',
        borderBottom: '1px solid #e8e8e8',
        flexShrink: 0,
      }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/workflow/form-config')}
              >
                返回
              </Button>
              <Divider type="vertical" />
              <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                {formKey === 'SUPPORT_REQUEST' ? '支援申请' :
                 formKey === 'LABOR_HOUR_REPORT' ? '工时报工' : formKey}流程配置
              </span>
            </Space>
          </Col>
          <Col>
            <Space>
              {selectedDefinitionId && (
                <>
                  {workflowDetail?.status === 'PUBLISHED' && (
                    <Tag color="green" icon={<CheckOutlined />}>
                      当前生效版本
                    </Tag>
                  )}
                  {workflowDetail?.status === 'DRAFT' && (
                    <Tag color="blue">草稿版本</Tag>
                  )}
                </>
              )}
              {workflowDetail?.status === 'DRAFT' && selectedDefinitionId && (
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={handlePublish}
                  loading={publishMutation.isPending}
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                >
                  发布
                </Button>
              )}
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saveMutation.isPending}
              >
                {workflowDetail?.status === 'PUBLISHED' && selectedDefinitionId
                  ? '创建新版本并保存'
                  : selectedDefinitionId
                    ? '保存修改'
                    : '保存'
                }
              </Button>
              <Button onClick={() => navigate('/workflow/form-config')}>取消</Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* 配置内容 */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* 版本列表和基本信息 */}
        <div style={{ padding: '16px', flexShrink: 0, borderBottom: '1px solid #e8e8e8' }}>
          <Row gutter={16}>
            <Col span={16}>
              {isCreatingNewVersion && (
                <div style={{
                  marginBottom: '12px',
                  padding: '8px 12px',
                  background: '#e6f7ff',
                  border: '1px solid #91d5ff',
                  borderRadius: '4px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ color: '#1890ff' }}>✎</span>
                  <span>正在基于已发布版本创建新版本，修改后点击保存即可</span>
                </div>
              )}
              <Form form={form} layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="流程名称"
                      name="name"
                      initialValue={`${formKey === 'SUPPORT_REQUEST' ? '支援申请' :
                        formKey === 'LABOR_HOUR_REPORT' ? '工时报工' : formKey}流程`}
                      rules={[{ required: true, message: '请输入流程名称' }]}
                    >
                      <Input
                        placeholder="请输入流程名称"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="流程描述" name="description">
                      <Input
                        placeholder="请输入流程描述"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Col>
            <Col span={8}>
              <div style={{ background: '#fafafa', padding: '12px', borderRadius: '4px', height: '100%' }}>
                <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>版本管理</span>
                  {workflowDefinitions?.items && workflowDefinitions.items.length > 0 && (
                    <Tag color="blue">{workflowDefinitions.items.length} 个版本</Tag>
                  )}
                </div>
                {selectedDefinitionId && workflowDetail?.status === 'PUBLISHED' && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={handleCreateNewVersion}
                    block
                    style={{ marginBottom: '8px' }}
                  >
                    基于此创建新版本
                  </Button>
                )}
                {workflowDefinitions?.items && workflowDefinitions.items.length > 0 ? (
                  <div style={{ maxHeight: '80px', overflowY: 'auto' }}>
                    {workflowDefinitions.items
                      .sort((a: any, b: any) => b.version - a.version)
                      .map((def: any) => (
                      <div
                        key={def.id}
                        onClick={() => handleSelectVersion(def.id)}
                        style={{
                          padding: '6px 8px',
                          marginBottom: '4px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          background: selectedDefinitionId === def.id ? '#e6f7ff' : '#fff',
                          border: selectedDefinitionId === def.id ? '1px solid #1890ff' : '1px solid #d9d9d9',
                          fontSize: '12px',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedDefinitionId !== def.id) {
                            e.currentTarget.style.borderColor = '#1890ff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedDefinitionId !== def.id) {
                            e.currentTarget.style.borderColor = '#d9d9d9';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <Space size={4}>
                            <Tag color={
                              def.status === 'PUBLISHED' ? 'green' :
                              def.status === 'DRAFT' ? 'blue' : 'default'
                            } style={{ margin: 0 }}>
                              {def.status === 'PUBLISHED' ? '已发布' :
                               def.status === 'DRAFT' ? '草稿' : '已归档'}
                            </Tag>
                            <span style={{ fontWeight: 500 }}>v{def.versionString}</span>
                          </Space>
                          <span style={{ fontSize: '11px', color: '#999' }}>
                            {new Date(def.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {def.name}
                        </div>
                        <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {def.status === 'PUBLISHED' && (
                            <Tag color="success" style={{ margin: 0, fontSize: '11px' }}>✓ 生效中</Tag>
                          )}
                          {def.status === 'DRAFT' && selectedDefinitionId === def.id && (
                            <Button
                              type="primary"
                              size="small"
                              icon={<CheckOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePublish();
                              }}
                              loading={publishMutation.isPending}
                              style={{ fontSize: '11px', height: '20px', padding: '0 8px' }}
                            >
                              发布
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#999', textAlign: 'center', padding: '20px 0' }}>
                    暂无版本
                  </div>
                )}
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={handleCreateNewVersion}
                  block
                  style={{ marginTop: '8px' }}
                >
                  创建新版本
                </Button>
              </div>
            </Col>
          </Row>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ flex: 1, overflow: 'hidden' }}>
          <TabPane tab="流程设计" key="design" style={{ height: '100%' }}>
            <div style={{ height: 'calc(100vh - 130px)', display: 'flex', gap: '12px', padding: '0 12px 12px 12px' }}>
              {/* 左侧：节点工具栏 */}
              <div style={{
                width: '180px',
                flexShrink: 0,
                overflowY: 'auto',
                padding: '16px',
                borderRight: '1px solid #e8e8e8',
                background: '#fafafa'
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>添加节点</div>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button
                      icon={<PlusOutlined />}
                      onClick={() => addNode('start')}
                      disabled={nodes.some((n) => n.type === 'start')}
                      block
                    >
                      开始节点
                    </Button>
                    <Button icon={<PlusOutlined />} onClick={() => addNode('approval')} block>
                      审批节点
                    </Button>
                    <Button icon={<PlusOutlined />} onClick={() => addNode('condition')} block>
                      条件节点
                    </Button>
                    <Button icon={<PlusOutlined />} onClick={() => addNode('cc')} block>
                      抄送节点
                    </Button>
                    <Button
                      icon={<PlusOutlined />}
                      onClick={() => addNode('end')}
                      disabled={nodes.some((n) => n.type === 'end')}
                      block
                    >
                      结束节点
                    </Button>
                  </Space>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>操作提示</div>
                  <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.8' }}>
                    <div>• 点击节点：编辑属性</div>
                    <div>• 拖拽连接点：连线</div>
                    <div>• 点击连线：查看/编辑</div>
                    <div>• Delete键：删除选中项</div>
                    <div>• 点击空白：取消选择</div>
                  </div>
                </div>

                {selectedNode && (
                  <div style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold' }}>选中节点</span>
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => deleteNode(selectedNode.id)}
                      >
                        删除
                      </Button>
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      <div>
                        <Tag color={NODE_TYPES[selectedNode.type as keyof typeof NODE_TYPES]?.color}>
                          {NODE_TYPES[selectedNode.type as keyof typeof NODE_TYPES]?.label}
                        </Tag>
                      </div>
                      <div style={{ marginTop: '4px', color: '#666' }}>
                        {selectedNode.data?.label}
                      </div>
                      <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => setNodeModalVisible(true)}
                        style={{ padding: 0, marginTop: '8px' }}
                      >
                        编辑属性
                      </Button>
                    </div>
                  </div>
                )}

                {selectedEdge && (
                  <div style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 'bold' }}>选中连线</span>
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => deleteEdge(selectedEdge.id)}
                      >
                        删除
                      </Button>
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      <div style={{ color: '#666' }}>
                        {nodes.find((n) => n.id === selectedEdge.source)?.data?.label}
                        {' → '}
                        {nodes.find((n) => n.id === selectedEdge.target)?.data?.label}
                      </div>
                      {selectedEdge.label && (
                        <div style={{ marginTop: '4px' }}>
                          <Tag>{selectedEdge.label}</Tag>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 中间：流程图画布 */}
              <div style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden'
              }}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeClick={onNodeClick}
                  onEdgeClick={onEdgeClick}
                  onPaneClick={onPaneClick}
                  nodeTypes={nodeTypes}
                  fitView
                  deleteKeyCode="Delete"
                  nodesDraggable
                  nodesConnectable
                  elementsSelectable
                  selectNodesOnDrag
                  panOnDrag
                  zoomOnScroll
                  zoomOnPinch
                  panOnScroll
                  style={{ width: '100%', height: '100%' }}
                >
                  <Background variant={BackgroundVariant.Dots} />
                  <Controls />
                </ReactFlow>
              </div>
            </div>
          </TabPane>
        </Tabs>
      </div>

      {/* 节点属性编辑模态框 */}
      <Modal
        title={`编辑节点属性 - ${selectedNode?.data?.label || ''}`}
        open={nodeModalVisible}
        onOk={handleSaveNodeProps}
        onCancel={() => setNodeModalVisible(false)}
        width={600}
        destroyOnClose
      >
        {renderNodeForm()}
      </Modal>
    </div>
  );
};

export default FormWorkflowConfigDetailPage;
