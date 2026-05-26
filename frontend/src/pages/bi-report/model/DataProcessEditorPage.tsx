import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  message,
  Row,
  Col,
  Typography,
  Form,
  Input,
  Select,
  Alert,
  Divider,
  Modal,
  Collapse,
  Tag,
  Dropdown,
  Menu,
  Tooltip,
  Popconfirm,
  Table,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  SaveOutlined,
  DatabaseOutlined,
  MergeCellsOutlined,
  ColumnWidthOutlined,
  FilterOutlined,
  FunctionOutlined,
  SortAscendingOutlined,
  ApartmentOutlined,
  NodeIndexOutlined,
  DragOutlined,
  SettingOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import request from '@/utils/request';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

// 数据处理节点类型
type NodeType =
  | 'source'      // 数据源
  | 'join'        // JOIN操作
  | 'union'       // UNION合并
  | 'filter'      // 过滤条件
  | 'aggregate'   // 聚合计算
  | 'calculate'   // 衍生计算
  | 'sort'        // 排序
  | 'output';     // 输出

interface ProcessNode {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  config?: any;
  inputs?: string[];  // 输入节点ID列表
}

interface Connection {
  id: string;
  from: string;
  to: string;
}

const DataProcessEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const canvasRef = useRef<HTMLDivElement>(null);

  // 状态管理
  const [nodes, setNodes] = useState<ProcessNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNode, setSelectedNode] = useState<ProcessNode | null>(null);
  const [draggingNode, setDraggingNode] = useState<ProcessNode | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [previewSQL, setPreviewSQL] = useState('');
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewColumns, setPreviewColumns] = useState<any[]>([]);
  const [isDataPreviewVisible, setIsDataPreviewVisible] = useState(false);
  const [isPreviewingData, setIsPreviewingData] = useState(false);
  const [dataSourceSearch, setDataSourceSearch] = useState('');

  // 获取所有基础模型
  const { data: baseModels } = useQuery({
    queryKey: ['biBaseModels'],
    queryFn: async () => {
      const result = await request.get('/bi-report/models', {
        params: { type: 'table', pageSize: 100 },
      });
      return result.items || [];
    },
  });

  // 保存数据处理流程
  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      request.post('/bi-report/models/data-process', data),
    onSuccess: () => {
      message.success('数据处理流程保存成功');
      navigate('/bi-report/models');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '保存失败');
    },
  });

  // 节点类型配置
  const nodeTypes = [
    { type: 'source', name: '数据源', icon: <DatabaseOutlined />, color: '#52c41a' },
    { type: 'join', name: 'JOIN关联', icon: <MergeCellsOutlined />, color: '#1890ff' },
    { type: 'union', name: 'UNION合并', icon: <ColumnWidthOutlined />, color: '#722ed1' },
    { type: 'filter', name: '过滤条件', icon: <FilterOutlined />, color: '#fa8c16' },
    { type: 'aggregate', name: '聚合计算', icon: <ApartmentOutlined />, color: '#eb2f96' },
    { type: 'calculate', name: '衍生计算', icon: <FunctionOutlined />, color: '#13c2c2' },
    { type: 'sort', name: '排序', icon: <SortAscendingOutlined />, color: '#faad14' },
    { type: 'output', name: '输出', icon: <NodeIndexOutlined />, color: '#2f54eb' },
  ];

  // 添加节点
  const handleAddNode = (type: NodeType, modelConfig?: any) => {
    if (type === 'source') {
      if (!modelConfig) {
        message.warning('请从数据源面板选择具体的数据模型');
        return;
      }

      // 检查是否已添加该数据源
      const exists = nodes.some(n => n.type === 'source' && n.config?.modelId === modelConfig.modelId);
      if (exists) {
        message.warning('该数据源已在画布中');
        return;
      }

      const newNode: ProcessNode = {
        id: `source-${modelConfig.modelId}`,
        type: 'source',
        name: modelConfig.name,
        x: 100 + nodes.filter(n => n.type === 'source').length * 150,
        y: 50 + nodes.filter(n => n.type === 'source').length * 100,
        config: {
          modelId: modelConfig.modelId,
          modelName: modelConfig.name,
          modelCode: modelConfig.code,
          sourceTable: modelConfig.sourceTable,
          fieldCount: modelConfig.fields?.length || 0
        },
        inputs: [],
      };

      setNodes([...nodes, newNode]);
      setSelectedNode(newNode);
      return;
    }

    const newNode: ProcessNode = {
      id: `node-${Date.now()}`,
      type,
      name: `${nodeTypes.find(t => t.type === type)?.name} ${nodes.filter(n => n.type === type).length + 1}`,
      x: 400 + nodes.filter(n => n.type !== 'source').length * 50,
      y: 100 + nodes.filter(n => n.type !== 'source').length * 30,
      inputs: [],
    };

    setNodes([...nodes, newNode]);
    setSelectedNode(newNode);
    setIsConfigModalVisible(true);
  };

  // 初始化数据源节点 - 不再自动添加到画布
  // 数据源通过工具箱添加到画布

  // 过滤后的数据源列表
  const filteredDataSources = baseModels?.filter((model: any) => {
    if (!dataSourceSearch) return true;
    const searchLower = dataSourceSearch.toLowerCase();
    return (
      model.name?.toLowerCase().includes(searchLower) ||
      model.code?.toLowerCase().includes(searchLower) ||
      model.sourceTable?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // 删除节点
  const handleDeleteNode = (nodeId: string) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    setConnections(connections.filter(c => c.from !== nodeId && c.to !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  // 配置节点
  const handleConfigureNode = (node: ProcessNode) => {
    setSelectedNode(node);
    setIsConfigModalVisible(true);
  };

  // 连接节点
  const handleConnectNodes = (fromId: string, toId: string) => {
    if (fromId === toId) {
      message.warning('不能连接节点自身');
      return;
    }

    const exists = connections.some(c => c.from === fromId && c.to === toId);
    if (exists) {
      message.warning('连接已存在');
      return;
    }

    const toNode = nodes.find(n => n.id === toId);
    if (toNode && toNode.type === 'source') {
      message.warning('数据源节点不能作为输入目标');
      return;
    }

    setConnections([
      ...connections,
      { id: `conn-${Date.now()}`, from: fromId, to: toId },
    ]);

    // 更新目标节点的输入列表
    setNodes(nodes.map(n =>
      n.id === toId
        ? { ...n, inputs: [...(n.inputs || []), fromId] }
        : n
    ));
  };

  // 删除连接
  const handleDeleteConnection = (connId: string) => {
    const conn = connections.find(c => c.id === connId);
    if (conn) {
      setConnections(connections.filter(c => c.id !== connId));
      setNodes(nodes.map(n =>
        n.id === conn.to
          ? { ...n, inputs: n.inputs?.filter(i => i !== conn.from) }
          : n
      ));
    }
  };

  // 拖拽处理
  const handleMouseDown = (e: React.MouseEvent, node: ProcessNode) => {
    e.preventDefault();
    setDraggingNode(node);
    const rect = (e.target as HTMLElement).closest('.process-node')?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggingNode && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const newX = e.clientX - canvasRect.left - dragOffset.x;
      const newY = e.clientY - canvasRect.top - dragOffset.y;

      setNodes(prev =>
        prev.map(n =>
          n.id === draggingNode.id
            ? { ...n, x: Math.max(0, newX), y: Math.max(0, newY) }
            : n
        )
      );
    }
  }, [draggingNode, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setDraggingNode(null);
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // 生成SQL预览
  const generateSQL = () => {
    if (nodes.length === 0) {
      message.warning('请先添加节点');
      return;
    }

    let sql = '-- 数据处理流程SQL\n\n';

    // 按拓扑顺序处理节点
    const sortedNodes = topologicalSort(nodes, connections);
    if (!sortedNodes) {
      message.error('检测到循环依赖，无法生成SQL');
      return;
    }

    const cteMap: Record<string, string> = {};

    sortedNodes.forEach((node, index) => {
      switch (node.type) {
        case 'source':
          const model = baseModels?.find((m: any) => m.id === node.config?.modelId);
          if (model) {
            cteMap[node.id] = `SELECT * FROM ${model.sourceTable}`;
          }
          break;

        case 'filter':
          if (node.inputs && node.inputs[0]) {
            const inputSQL = cteMap[node.inputs[0]];
            const conditions = node.config?.conditions || [];
            const whereClause = conditions.map((c: any) =>
              `${c.field} ${c.operator} ${formatValue(c.value)}`
            ).join(' AND ');
            cteMap[node.id] = `SELECT * FROM (\n  ${inputSQL}\n) AS t${index}\nWHERE ${whereClause}`;
          }
          break;

        case 'join':
          if (node.inputs && node.inputs.length >= 2) {
            const leftSQL = cteMap[node.inputs[0]];
            const rightSQL = cteMap[node.inputs[1]];
            const joinType = node.config?.joinType || 'INNER';
            const leftField = node.config?.leftField;
            const rightField = node.config?.rightField;
            cteMap[node.id] = `SELECT * FROM (\n  ${leftSQL}\n) AS t${index}_a\n${joinType} JOIN (\n  ${rightSQL}\n) AS t${index}_b\nON t${index}_a.${leftField} = t${index}_b.${rightField}`;
          }
          break;

        case 'union':
          if (node.inputs && node.inputs.length >= 2) {
            const queries = node.inputs.map(inputId => cteMap[inputId]);
            cteMap[node.id] = queries.join('\nUNION\n');
          }
          break;

        case 'aggregate':
          if (node.inputs && node.inputs[0]) {
            const inputSQL = cteMap[node.inputs[0]];
            const groupBy = node.config?.groupBy || [];
            const aggregations = node.config?.aggregations || [];
            const selectFields = [
              ...groupBy.map((f: string) => f),
              ...aggregations.map((a: any) => `${a.function}(${a.field}) AS ${a.alias}`)
            ];
            cteMap[node.id] = `SELECT ${selectFields.join(', ')}\nFROM (\n  ${inputSQL}\n) AS t${index}\nGROUP BY ${groupBy.join(', ')}`;
          }
          break;

        case 'calculate':
          if (node.inputs && node.inputs[0]) {
            const inputSQL = cteMap[node.inputs[0]];
            const calculations = node.config?.calculations || [];
            const calcFields = calculations.map((c: any) => `${c.expression} AS ${c.alias}`);
            cteMap[node.id] = `SELECT *, ${calcFields.join(', ')}\nFROM (\n  ${inputSQL}\n) AS t${index}`;
          }
          break;

        case 'sort':
          if (node.inputs && node.inputs[0]) {
            const inputSQL = cteMap[node.inputs[0]];
            const orderBy = node.config?.orderBy || [];
            const orderClause = orderBy.map((o: any) => `${o.field} ${o.direction}`).join(', ');
            cteMap[node.id] = `SELECT * FROM (\n  ${inputSQL}\n) AS t${index}\nORDER BY ${orderClause}`;
          }
          break;

        case 'output':
          if (node.inputs && node.inputs[0]) {
            cteMap[node.id] = cteMap[node.inputs[0]];
          }
          break;
      }
    });

    // 找到输出节点
    const outputNode = sortedNodes.find(n => n.type === 'output');
    if (outputNode && cteMap[outputNode.id]) {
      sql += cteMap[outputNode.id];
    }

    setPreviewSQL(sql);
    setIsPreviewModalVisible(true);
  };

  // 预览数据
  const handlePreviewData = async () => {
    if (nodes.length === 0) {
      message.warning('请先添加数据处理节点');
      return;
    }

    const outputNode = nodes.find(n => n.type === 'output');
    if (!outputNode) {
      message.warning('请先添加输出节点');
      return;
    }

    setIsPreviewingData(true);
    try {
      const result = await request.post('/bi-report/models/preview-data', {
        nodes,
        connections,
      });

      if (result.data && result.data.length > 0) {
        // 生成列配置
        const columns = Object.keys(result.data[0]).map(key => ({
          title: key,
          dataIndex: key,
          key: key,
          width: 150,
          ellipsis: true,
        }));

        setPreviewColumns(columns);
        setPreviewData(result.data);
        setIsDataPreviewVisible(true);
      } else {
        message.info('查询结果为空');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '预览数据失败');
    } finally {
      setIsPreviewingData(false);
    }
  };

  // 拓扑排序
  const topologicalSort = (nodes: ProcessNode[], connections: Connection[]) => {
    const inDegree: Record<string, number> = {};
    const adjList: Record<string, string[]> = {};

    nodes.forEach(node => {
      inDegree[node.id] = 0;
      adjList[node.id] = [];
    });

    connections.forEach(conn => {
      inDegree[conn.to]++;
      adjList[conn.from].push(conn.to);
    });

    const queue: string[] = [];
    nodes.forEach(node => {
      if (inDegree[node.id] === 0) {
        queue.push(node.id);
      }
    });

    const sorted: ProcessNode[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        sorted.push(node);
      }

      adjList[nodeId].forEach(neighborId => {
        inDegree[neighborId]--;
        if (inDegree[neighborId] === 0) {
          queue.push(neighborId);
        }
      });
    }

    if (sorted.length !== nodes.length) {
      return null; // 存在环
    }

    return sorted;
  };

  // 格式化SQL值
  const formatValue = (value: any): string => {
    if (typeof value === 'string') {
      return `'${value}'`;
    }
    return String(value);
  };

  // 收集上游节点的所有可用字段
  const collectAvailableFields = (nodeId: string): Array<{ code: string; name: string; source: string; type: string }> => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return [];

    let fields: Array<{ code: string; name: string; source: string; type: string }> = [];

    if (node.type === 'source') {
      const model = baseModels?.find((m: any) => m.id === node.config?.modelId);
      if (model?.fields) {
        fields = model.fields.map((f: any) => ({
          code: f.code,
          name: f.name,
          source: model.code,
          type: f.type,
        }));
      }
    } else if (node.inputs && node.inputs.length > 0) {
      // 从所有输入节点递归收集字段
      node.inputs.forEach(inputId => {
        const inputFields = collectAvailableFields(inputId);
        fields = [...fields, ...inputFields];
      });

      // TODO: 根据节点类型处理字段（如聚合节点会改变字段）
      // 这里暂时不去重，让用户自己选择
    }

    return fields;
  };

  // 保存
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      if (nodes.length === 0) {
        message.error('请至少添加一个节点');
        return;
      }

      const outputNode = nodes.find(n => n.type === 'output');
      if (!outputNode) {
        message.error('请添加输出节点');
        return;
      }

      saveMutation.mutate({
        name: values.name,
        code: values.code,
        description: values.description,
        nodes,
        connections,
      });
    } catch (error) {
      // 表单验证失败
    }
  };

  // 渲染节点配置面板
  const renderNodeConfig = () => {
    if (!selectedNode) return null;

    switch (selectedNode.type) {
      case 'source':
        const sourceModel = baseModels?.find((m: any) => m.id === selectedNode.config?.modelId);
        return (
          <Form layout="vertical" size="small">
            <Form.Item label="数据模型">
              <Input value={sourceModel?.name} disabled />
            </Form.Item>
            <Form.Item label="模型代码">
              <Input value={sourceModel?.code} disabled />
            </Form.Item>
            <Form.Item label="源表">
              <Input value={sourceModel?.sourceTable} disabled />
            </Form.Item>
            <Divider style={{ margin: '8px 0' }} />
            <Form.Item label="可用字段">
              <div style={{ maxHeight: 200, overflow: 'auto' }}>
                {sourceModel?.fields?.map((field: any) => (
                  <Tag key={field.code} color={field.type === 'dimension' ? 'blue' : 'green'} style={{ marginBottom: 4 }}>
                    {field.name} ({field.code})
                  </Tag>
                ))}
              </div>
            </Form.Item>
          </Form>
        );

      case 'filter':
        return (
          <Form layout="vertical" size="small">
            <Form.Item label="过滤条件">
              <Alert
                message="配置WHERE条件"
                description="添加过滤条件来筛选数据"
                type="info"
                showIcon
                style={{ fontSize: 11 }}
              />
            </Form.Item>
            <Form.Item label="条件列表">
              <Button type="dashed" block icon={<PlusOutlined />} size="small">
                添加过滤条件
              </Button>
            </Form.Item>
          </Form>
        );

      case 'join':
        return (
          <Form layout="vertical" size="small">
            <Form.Item label="连接类型">
              <Select placeholder="选择连接方式">
                <Option value="INNER">INNER JOIN - 内连接</Option>
                <Option value="LEFT">LEFT JOIN - 左连接</Option>
                <Option value="RIGHT">RIGHT JOIN - 右连接</Option>
                <Option value="FULL">FULL JOIN - 全连接</Option>
              </Select>
            </Form.Item>
            <Alert message="请在画布上连接两个数据节点" type="info" showIcon style={{ fontSize: 11, marginBottom: 8 }} />
            <Form.Item label="左表字段">
              <Select placeholder="选择左表关联字段">
                {/* TODO: 动态加载左表字段 */}
                <Option value="id">id</Option>
              </Select>
            </Form.Item>
            <Form.Item label="右表字段">
              <Select placeholder="选择右表关联字段">
                {/* TODO: 动态加载右表字段 */}
                <Option value="employeeId">employeeId</Option>
              </Select>
            </Form.Item>
          </Form>
        );

      case 'union':
        return (
          <Form layout="vertical" size="small">
            <Alert
              message="UNION合并"
              description="将多个数据源的记录纵向合并（要求字段结构相同）"
              type="info"
              showIcon
              style={{ fontSize: 11 }}
            />
            <Form.Item label="输入源" style={{ marginTop: 8 }}>
              <div>{selectedNode.inputs?.length || 0} 个数据源</div>
            </Form.Item>
          </Form>
        );

      case 'aggregate':
        return (
          <Form layout="vertical" size="small">
            <Form.Item label="分组字段 (GROUP BY)">
              <Select mode="tags" placeholder="选择分组字段">
                {/* TODO: 动态加载可用字段 */}
              </Select>
            </Form.Item>
            <Form.Item label="聚合计算">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button type="dashed" block icon={<PlusOutlined />} size="small">
                  添加聚合字段
                </Button>
                {/* 聚合字段列表 */}
              </Space>
            </Form.Item>
          </Form>
        );

      case 'calculate':
        return (
          <Form layout="vertical" size="small">
            <Form.Item label="计算字段">
              <Button type="dashed" block icon={<PlusOutlined />} size="small">
                添加计算字段
              </Button>
            </Form.Item>
            <Alert
              message="支持窗口函数、CASE WHEN等高级计算"
              type="info"
              showIcon
              style={{ fontSize: 11 }}
            />
          </Form>
        );

      case 'sort':
        return (
          <Form layout="vertical" size="small">
            <Form.Item label="排序字段 (ORDER BY)">
              <Button type="dashed" block icon={<PlusOutlined />} size="small">
                添加排序字段
              </Button>
            </Form.Item>
          </Form>
        );

      case 'output':
        const availableFields = selectedNode.inputs && selectedNode.inputs.length > 0
          ? collectAvailableFields(selectedNode.inputs[0])
          : [];

        return (
          <Form layout="vertical" size="small">
            <Form.Item label="选择输出字段">
              <Alert
                message={`从上游节点找到 ${availableFields.length} 个可用字段`}
                description="勾选要包含在最终输出中的字段"
                type="info"
                showIcon
                style={{ fontSize: 11, marginBottom: 8 }}
              />
              <div style={{ border: '1px solid #d9d9d9', borderRadius: 4, padding: 8, maxHeight: 300, overflow: 'auto' }}>
                {availableFields.length > 0 ? (
                  <Space direction="vertical" style={{ width: '100%' }} size={4}>
                    {availableFields.map((field) => (
                      <div key={`${field.source}-${field.code}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          id={`field-${field.source}-${field.code}`}
                          style={{ cursor: 'pointer' }}
                        />
                        <label
                          htmlFor={`field-${field.source}-${field.code}`}
                          style={{ flex: 1, cursor: 'pointer', fontSize: 12 }}
                        >
                          <Space size={4}>
                            <Tag color={field.type === 'dimension' ? 'blue' : 'green'} style={{ fontSize: 10 }}>
                              {field.type === 'dimension' ? '维度' : '度量'}
                            </Tag>
                            <Text strong>{field.name}</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {field.code}
                            </Text>
                          </Space>
                        </label>
                      </div>
                    ))}
                  </Space>
                ) : (
                  <div style={{ color: '#999', textAlign: 'center', padding: 20 }}>
                    {selectedNode.inputs && selectedNode.inputs.length > 0
                      ? '上游节点没有可用字段'
                      : '请先连接上游节点'}
                  </div>
                )}
              </div>
            </Form.Item>
            <Form.Item label="字段别名设置">
              <Button type="dashed" block size="small" icon={<EditOutlined />}>
                配置字段别名
              </Button>
            </Form.Item>
            <Divider style={{ margin: '8px 0' }} />
            <Button type="primary" block size="small" icon={<SaveOutlined />}>
              保存字段配置
            </Button>
          </Form>
        );

      default:
        return null;
    }
  };

  // 获取节点菜单
  const getNodeMenu = (node: ProcessNode) => (
    <Menu>
      <Menu.Item
        key="configure"
        icon={<SettingOutlined />}
        onClick={() => handleConfigureNode(node)}
      >
        配置节点
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        key="delete"
        danger
        icon={<DeleteOutlined />}
        onClick={() => handleDeleteNode(node.id)}
      >
        删除节点
      </Menu.Item>
    </Menu>
  );

  return (
    <div style={{ padding: '24px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={18}>
            <Space direction="vertical" size={0}>
              <Title level={4} style={{ margin: 0 }}>
                数据处理流程编辑器
              </Title>
              <Text type="secondary">可视化构建数据处理流程，支持JOIN、UNION、聚合、计算等操作</Text>
            </Space>
          </Col>
          <Col span={6} style={{ textAlign: 'right' }}>
            <Space>
              <Button
                icon={<EyeOutlined />}
                onClick={generateSQL}
              >
                预览SQL
              </Button>
              <Button
                type="default"
                icon={<DatabaseOutlined />}
                onClick={handlePreviewData}
                loading={isPreviewingData}
              >
                预览数据
              </Button>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/bi-report/models')}
              >
                返回
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saveMutation.isPending}
              >
                保存
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 基本信息表单 */}
      <Card style={{ marginBottom: 16 }} size="small">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="模型名称"
              name="name"
              rules={[{ required: true, message: '请输入模型名称' }]}
              style={{ marginBottom: 0 }}
            >
              <Input size="small" placeholder="如：员工分析" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="模型代码"
              name="code"
              rules={[{ required: true, message: '请输入模型代码' }]}
              style={{ marginBottom: 0 }}
            >
              <Input size="small" placeholder="如：EMP_ANALYSIS" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="描述" name="description" style={{ marginBottom: 0 }}>
              <Input size="small" placeholder="描述数据处理流程" />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      {/* 主要内容区域 */}
      <div style={{ flex: 1, display: 'flex', gap: 16, overflow: 'hidden' }}>
        {/* 左侧：节点工具箱 */}
        <Card
          title="工具箱"
          style={{ width: 260, overflowY: 'auto' }}
          size="small"
        >
          <Collapse defaultActiveKey={['datasource', 'process', 'basic']} size="small">
            <Panel header="数据源" key="datasource">
              <Input
                size="small"
                placeholder="搜索数据源..."
                prefix={<DatabaseOutlined />}
                allowClear
                value={dataSourceSearch}
                onChange={(e) => setDataSourceSearch(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 4 }}>
                {filteredDataSources.length > 0 ? (
                  <Space direction="vertical" style={{ width: '100%' }} size={4} >
                    {filteredDataSources.map((model: any) => (
                      <Card
                        key={model.id}
                        size="small"
                        hoverable
                        style={{ cursor: 'pointer', backgroundColor: '#f6ffed' }}
                        onClick={() => handleAddNode('source', model)}
                      >
                        <Space direction="vertical" size={0} style={{ width: '100%' }}>
                          <Text strong style={{ fontSize: 12 }}>{model.name}</Text>
                          <Text type="secondary" style={{ fontSize: 10 }}>{model.code}</Text>
                          <Text type="secondary" style={{ fontSize: 10 }}>
                            {model.fields?.length || 0} 个字段
                          </Text>
                        </Space>
                      </Card>
                    ))}
                  </Space>
                ) : (
                  <div style={{ textAlign: 'center', padding: 16, color: '#999', fontSize: 11 }}>
                    {dataSourceSearch ? '未找到匹配的数据源' : '加载数据源...'}
                  </div>
                )}
              </div>
            </Panel>

            <Panel header="数据处理" key="process">
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {nodeTypes.filter(t => !['source', 'output'].includes(t.type)).map(nodeType => (
                  <Button
                    key={nodeType.type}
                    block
                    size="small"
                    icon={nodeType.icon}
                    onClick={() => handleAddNode(nodeType.type)}
                    style={{ textAlign: 'left', borderColor: nodeType.color }}
                  >
                    <Tag color={nodeType.color} style={{ margin: 0, fontSize: 10 }}>
                      {nodeType.name}
                    </Tag>
                  </Button>
                ))}
              </Space>
            </Panel>

            <Panel header="基础节点" key="basic">
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Button
                  block
                  size="small"
                  icon={<NodeIndexOutlined />}
                  onClick={() => handleAddNode('output')}
                  style={{ textAlign: 'left' }}
                >
                  <Tag color="#2f54eb" style={{ margin: 0, fontSize: 10 }}>
                    输出节点
                  </Tag>
                </Button>
              </Space>
            </Panel>
          </Collapse>
        </Card>

        {/* 中间：流程画布 */}
        <Card
          title={
            <Space>
              <ApartmentOutlined />
              处理流程图
              <Text type="secondary" style={{ fontSize: 12 }}>
                （拖拽节点调整位置，连接节点构建流程）
              </Text>
            </Space>
          }
          style={{ flex: 1 }}
          bodyStyle={{ height: '100%', overflow: 'auto', position: 'relative' }}
        >
          {nodes.length === 0 ? (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              <ApartmentOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
              <div style={{ marginTop: 16, color: '#999' }}>
                正在加载数据源...
              </div>
            </div>
          ) : (
            <div
              ref={canvasRef}
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                minWidth: 1000,
                minHeight: 600,
                backgroundColor: '#fafafa',
              }}
            >
              {/* 绘制连接线 */}
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              >
                {connections.map(conn => {
                  const fromNode = nodes.find(n => n.id === conn.from);
                  const toNode = nodes.find(n => n.id === conn.to);
                  if (!fromNode || !toNode) return null;

                  const fromX = fromNode.x + 120;
                  const fromY = fromNode.y + 30;
                  const toX = toNode.x;
                  const toY = toNode.y + 30;

                  const midX = (fromX + toX) / 2;
                  return (
                    <g key={conn.id}>
                      <path
                        d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
                        stroke="#1890ff"
                        strokeWidth="2"
                        fill="none"
                        markerEnd="url(#arrowhead)"
                      />
                      <circle
                        cx={midX}
                        cy={(fromY + toY) / 2}
                        r="8"
                        fill="#fff"
                        stroke="#ff4d4f"
                        strokeWidth="2"
                        style={{ cursor: 'pointer', pointerEvents: 'all' }}
                        onClick={() => handleDeleteConnection(conn.id)}
                      />
                      <text
                        x={midX}
                        y={(fromY + toY) / 2 + 3}
                        textAnchor="middle"
                        fill="#ff4d4f"
                        fontSize="12"
                        style={{ cursor: 'pointer', pointerEvents: 'all', userSelect: 'none' }}
                        onClick={() => handleDeleteConnection(conn.id)}
                      >
                        ×
                      </text>
                    </g>
                  );
                })}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill="#1890ff" />
                  </marker>
                </defs>
              </svg>

              {/* 渲染节点 */}
              {nodes.map(node => {
                const nodeType = nodeTypes.find(t => t.type === node.type);
                const isSourceNode = node.type === 'source';

                return (
                  <div
                    key={node.id}
                    className="process-node"
                    style={{
                      position: 'absolute',
                      left: node.x,
                      top: node.y,
                      width: isSourceNode ? 180 : 240,
                      border: `2px solid ${selectedNode?.id === node.id ? '#1890ff' : nodeType?.color || '#d9d9d9'}`,
                      borderRadius: 8,
                      backgroundColor: 'white',
                      boxShadow: selectedNode?.id === node.id ? '0 0 16px rgba(24, 144, 255, 0.5)' : '0 2px 8px rgba(0,0,0,0.1)',
                      cursor: 'move',
                      zIndex: selectedNode?.id === node.id ? 10 : 1,
                      transition: 'all 0.2s',
                    }}
                    onMouseDown={(e) => handleMouseDown(e, node)}
                    onClick={() => setSelectedNode(node)}
                  >
                    {/* ��点头部 */}
                    <div
                      style={{
                        padding: isSourceNode ? '6px 8px' : '8px 12px',
                        borderBottom: '1px solid #f0f0f0',
                        backgroundColor: nodeType?.color || '#fafafa',
                        borderRadius: '6px 6px 0 0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Space size={isSourceNode ? 4 : 8}>
                        {nodeType?.icon}
                        <Text strong style={{ color: 'white', fontSize: isSourceNode ? 12 : 14 }}>
                          {isSourceNode ? node.name?.substring(0, 12) : node.name}
                        </Text>
                      </Space>
                      {!isSourceNode && (
                        <Dropdown overlay={getNodeMenu(node)} trigger={['click']}>
                          <SettingOutlined style={{ color: 'white', cursor: 'pointer' }} />
                        </Dropdown>
                      )}
                    </div>

                    {/* 节点内容 */}
                    <div style={{ padding: isSourceNode ? '8px' : '12px' }}>
                      {!isSourceNode && (
                        <Tag color={nodeType?.color} style={{ marginBottom: 8 }}>
                          {nodeType?.name}
                        </Tag>
                      )}

                      {node.type === 'source' && (
                        <>
                          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
                            {node.config?.modelCode}
                          </div>
                          <div style={{ fontSize: 11, color: '#999' }}>
                            {node.config?.sourceTable}
                          </div>
                          <Divider style={{ margin: '4px 0' }} />
                          <div style={{ fontSize: 11, color: '#1890ff' }}>
                            {baseModels?.find((m: any) => m.id === node.config?.modelId)?.fields?.length || 0} 个字段
                          </div>
                        </>
                      )}

                      {!isSourceNode && (
                        <div style={{ fontSize: 12, color: '#666' }}>
                          {node.inputs && node.inputs.length > 0 ? (
                            <div>输入: {node.inputs.length} 个节点</div>
                          ) : (
                            <div style={{ color: '#ff4d4f' }}>未连接输入</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 输入连接点 */}
                    {!isSourceNode && (
                      <div
                        style={{
                          position: 'absolute',
                          left: -8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          backgroundColor: selectedNode?.inputs?.includes(node.id) ? '#1890ff' : '#52c41a',
                          border: '2px solid white',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          cursor: 'pointer',
                          zIndex: 10,
                        }}
                        title="输入连接点"
                      />
                    )}

                    {/* 输出连接点 */}
                    {node.type !== 'output' && (
                      <div
                        style={{
                          position: 'absolute',
                          right: -8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          backgroundColor: '#1890ff',
                          border: '2px solid white',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          cursor: 'pointer',
                          zIndex: 10,
                        }}
                        title="输出连接点"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* 右侧：配置面板 */}
        <Card
          title="节点配置"
          style={{ width: 300, overflowY: 'auto' }}
          size="small"
        >
          {selectedNode ? (
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <div>
                <Text strong>{selectedNode.name}</Text>
                <Tag color={nodeTypes.find(t => t.type === selectedNode.type)?.color}>
                  {nodeTypes.find(t => t.type === selectedNode.type)?.name}
                </Tag>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              {renderNodeConfig()}
            </Space>
          ) : (
            <Alert
              message="请选择节点"
              description="点击画布中的节点查看配置"
              type="info"
              showIcon
            />
          )}
        </Card>
      </div>

      {/* SQL预览弹窗 */}
      <Modal
        title="SQL预览"
        open={isPreviewModalVisible}
        onCancel={() => setIsPreviewModalVisible(false)}
        width={1000}
        footer={[
          <Button key="close" onClick={() => setIsPreviewModalVisible(false)}>
            关闭
          </Button>,
          <Button
            key="copy"
            type="primary"
            onClick={() => {
              navigator.clipboard.writeText(previewSQL);
              message.success('SQL已复制到剪贴板');
            }}
          >
            复制SQL
          </Button>,
        ]}
      >
        <pre
          style={{
            backgroundColor: '#f5f5f5',
            padding: 16,
            borderRadius: 4,
            overflow: 'auto',
            maxHeight: 500,
            fontSize: 12,
          }}
        >
          {previewSQL}
        </pre>
      </Modal>

      {/* 数据预览弹窗 */}
      <Modal
        title="数据预览"
        open={isDataPreviewVisible}
        onCancel={() => setIsDataPreviewVisible(false)}
        width={1200}
        footer={[
          <Button key="close" onClick={() => setIsDataPreviewVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        <Alert
          message={`共 ${previewData.length} 条记录`}
          description="预览前100条数据"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Table
          columns={previewColumns}
          dataSource={previewData}
          scroll={{ x: 'max-content', y: 400 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          size="small"
          bordered
        />
      </Modal>

      {/* 节点配置弹窗 */}
      <Modal
        title={`配置 ${selectedNode?.name}`}
        open={isConfigModalVisible}
        onOk={() => {
          setIsConfigModalVisible(false);
          setSelectedNode(null);
        }}
        onCancel={() => {
          setIsConfigModalVisible(false);
          setSelectedNode(null);
        }}
        width={600}
      >
        {renderNodeConfig()}
      </Modal>
    </div>
  );
};

export default DataProcessEditorPage;
