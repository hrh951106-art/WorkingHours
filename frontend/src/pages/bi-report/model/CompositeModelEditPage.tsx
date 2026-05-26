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
  Table,
  Alert,
  Divider,
  Tag,
  Modal,
  Collapse,
  Tooltip,
  Dropdown,
  Menu,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  EditOutlined,
  CalculatorOutlined,
  Variable,
  DragOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import request from '@/utils/request';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

interface ModelNode {
  id: number;
  name: string;
  code: string;
  sourceTable: string;
  x: number;
  y: number;
  fields?: ModelField[];
}

interface ModelField {
  id: number;
  name: string;
  code: string;
  type: 'dimension' | 'measure';
  dataType: string;
  sourceExpr?: string;
  aggregation?: string;
  description?: string;
}

interface JoinConnection {
  id: string;
  fromModelId: number;
  fromField: string;
  toModelId: number;
  toField: string;
  joinType: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
}

interface SelectedFieldConfig {
  id: string;
  modelId: number;
  modelName: string;
  fieldCode: string;
  fieldName: string;
  alias?: string;
  aggregation?: string;
  expression?: string;
  fieldType: 'source' | 'calculated' | 'variable';
  dataType?: string;
  description?: string;
}

interface VariableField {
  id: string;
  name: string;
  code: string;
  dataType: string;
  defaultValue?: any;
  description?: string;
}

const CompositeModelEditPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const canvasRef = useRef<HTMLDivElement>(null);

  // 状态管理
  const [canvasModels, setCanvasModels] = useState<ModelNode[]>([]);
  const [connections, setConnections] = useState<JoinConnection[]>([]);
  const [selectedFields, setSelectedFields] = useState<SelectedFieldConfig[]>([]);
  const [variableFields, setVariableFields] = useState<VariableField[]>([]);
  const [previewSQL, setPreviewSQL] = useState('');
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [isFieldConfigModalVisible, setIsFieldConfigModalVisible] = useState(false);
  const [isVariableModalVisible, setIsVariableModalVisible] = useState(false);
  const [currentEditingField, setCurrentEditingField] = useState<SelectedFieldConfig | null>(null);
  const [fieldForm] = Form.useForm();
  const [variableForm] = Form.useForm();
  const [draggingModel, setDraggingModel] = useState<ModelNode | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 获取所有基础模型
  const { data: baseModels, isLoading: modelsLoading } = useQuery({
    queryKey: ['biBaseModels'],
    queryFn: async () => {
      const result = await request.get('/bi-report/models', {
        params: { type: 'table', pageSize: 100 },
      });
      return result.items || [];
    },
  });

  // 创建复合模型
  const createMutation = useMutation({
    mutationFn: (data: any) =>
      request.post('/bi-report/models/composite', data),
    onSuccess: () => {
      message.success('复合模型创建成功');
      navigate('/bi-report/models');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '创建失败');
    },
  });

  // 添加模型到画布
  const handleAddModelToCanvas = (model: any) => {
    if (canvasModels.find(m => m.id === model.id)) {
      message.warning('该模型已在画布中');
      return;
    }

    const newNode: ModelNode = {
      ...model,
      x: 100 + canvasModels.length * 50,
      y: 100 + canvasModels.length * 50,
    };

    setCanvasModels([...canvasModels, newNode]);
  };

  // 从画布移除模型
  const handleRemoveModelFromCanvas = (modelId: number) => {
    setCanvasModels(canvasModels.filter(m => m.id !== modelId));
    setConnections(connections.filter(c => c.fromModelId !== modelId && c.toModelId !== modelId));
    setSelectedFields(selectedFields.filter(f => f.modelId !== modelId));
  };

  // 添加连接
  const [pendingConnectionModel, setPendingConnectionModel] = useState<number | null>(null);
  const [joinConfigVisible, setJoinConfigVisible] = useState(false);
  const [pendingFromModel, setPendingFromModel] = useState<number | null>(null);
  const [pendingToModel, setPendingToModel] = useState<number | null>(null);
  const [joinConfigForm] = Form.useForm();

  const handleStartConnection = (modelId: number) => {
    if (pendingConnectionModel === null) {
      setPendingConnectionModel(modelId);
      message.info('请点击要连接的目标模型');
    } else if (pendingConnectionModel === modelId) {
      setPendingConnectionModel(null);
      message.info('已取消连接');
    } else {
      setPendingFromModel(pendingConnectionModel);
      setPendingToModel(modelId);
      setPendingConnectionModel(null);
      setJoinConfigVisible(true);
    }
  };

  const handleAddConnection = () => {
    joinConfigForm.validateFields().then((values) => {
      if (!pendingFromModel || !pendingToModel) {
        return;
      }

      const exists = connections.some(
        c => c.fromModelId === pendingFromModel && c.toModelId === pendingToModel
      );

      if (exists) {
        message.warning('连接已存在');
        return;
      }

      setConnections([
        ...connections,
        {
          id: `${pendingFromModel}-${pendingToModel}`,
          fromModelId: pendingFromModel,
          fromField: values.fromField,
          toModelId: pendingToModel,
          toField: values.toField,
          joinType: values.joinType,
        },
      ]);

      setJoinConfigVisible(false);
      joinConfigForm.resetFields();
      setPendingFromModel(null);
      setPendingToModel(null);
    });
  };

  // 删除连接
  const handleDeleteConnection = (connectionId: string) => {
    setConnections(connections.filter(c => c.id !== connectionId));
  };

  // 添加字段到选中列表
  const handleAddField = (model: ModelNode, field: ModelField) => {
    const newField: SelectedFieldConfig = {
      id: `${model.id}-${field.code}`,
      modelId: model.id,
      modelName: model.name,
      fieldCode: field.code,
      fieldName: field.name,
      alias: `${model.code}_${field.code}`,
      aggregation: field.aggregation,
      fieldType: 'source',
      dataType: field.dataType,
      description: field.description,
    };

    if (selectedFields.some(f => f.id === newField.id)) {
      message.warning('该字段已添加');
      return;
    }

    setSelectedFields([...selectedFields, newField]);
  };

  // 编辑字段配置
  const handleEditField = (field: SelectedFieldConfig) => {
    setCurrentEditingField(field);
    fieldForm.setFieldsValue(field);
    setIsFieldConfigModalVisible(true);
  };

  // 保存字段配置
  const handleSaveFieldConfig = () => {
    fieldForm.validateFields().then((values) => {
      const updatedFields = selectedFields.map(f =>
        f.id === currentEditingField?.id
          ? { ...f, ...values }
          : f
      );
      setSelectedFields(updatedFields);
      setIsFieldConfigModalVisible(false);
      setCurrentEditingField(null);
      fieldForm.resetFields();
    });
  };

  // 删除字段
  const handleDeleteField = (fieldId: string) => {
    setSelectedFields(selectedFields.filter(f => f.id !== fieldId));
  };

  // 添加变量字段
  const handleAddVariableField = () => {
    variableForm.validateFields().then((values) => {
      const newVariable: VariableField = {
        id: `var-${Date.now()}`,
        ...values,
      };
      setVariableFields([...variableFields, newVariable]);

      // 同时添加到字段列表
      const newField: SelectedFieldConfig = {
        id: newVariable.id,
        modelId: 0,
        modelName: '变量',
        fieldCode: newVariable.code,
        fieldName: newVariable.name,
        alias: newVariable.code,
        fieldType: 'variable',
        dataType: newVariable.dataType,
        description: newVariable.description,
      };
      setSelectedFields([...selectedFields, newField]);

      setIsVariableModalVisible(false);
      variableForm.resetFields();
    });
  };

  // 拖拽处理
  const handleMouseDown = (e: React.MouseEvent, model: ModelNode) => {
    e.preventDefault();
    setDraggingModel(model);
    const rect = (e.target as HTMLElement).closest('.model-node')?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggingModel && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const newX = e.clientX - canvasRect.left - dragOffset.x;
      const newY = e.clientY - canvasRect.top - dragOffset.y;

      setCanvasModels(prev =>
        prev.map(m =>
          m.id === draggingModel.id
            ? { ...m, x: Math.max(0, newX), y: Math.max(0, newY) }
            : m
        )
      );
    }
  }, [draggingModel, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setDraggingModel(null);
  }, []);

  // 监听鼠标事件
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // 生成SQL预览
  const generateSQLPreview = () => {
    if (canvasModels.length === 0) {
      message.warning('请先添加模型');
      return;
    }

    let sql = 'SELECT\n';

    // 字段列表
    const fieldClauses = selectedFields.map(f => {
      if (f.fieldType === 'source') {
        const model = canvasModels.find(m => m.id === f.modelId);
        const field = model?.fields?.find(field => field.code === f.fieldCode);
        if (field?.aggregation && field.aggregation !== 'none') {
          return `  ${field.aggregation}(${model?.sourceTable}.${field.sourceExpr}) AS ${f.alias || f.fieldCode}`;
        }
        return `  ${model?.sourceTable}.${f.sourceExpr} AS ${f.alias || f.fieldCode}`;
      } else if (f.fieldType === 'calculated') {
        return `  ${f.expression} AS ${f.alias || f.fieldCode}`;
      } else if (f.fieldType === 'variable') {
        return `  ${f.fieldCode} AS ${f.alias || f.fieldCode}`;
      }
      return '';
    }).filter(f => f).join(',\n');

    sql += fieldClauses || '  *';

    sql += '\nFROM\n';

    // FROM和JOIN子句
    const firstModel = canvasModels[0];
    sql += `  ${firstModel.sourceTable}`;

    connections.forEach(conn => {
      const fromModel = canvasModels.find(m => m.id === conn.fromModelId);
      const toModel = canvasModels.find(m => m.id === conn.toModelId);
      sql += `\n  ${conn.joinType} JOIN ${toModel?.sourceTable} ON ${fromModel?.sourceTable}.${conn.fromField} = ${toModel?.sourceTable}.${conn.toField}`;
    });

    setPreviewSQL(sql);
    setIsPreviewModalVisible(true);
  };

  // 提交创建
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (canvasModels.length === 0) {
        message.error('请至少添加一个模型');
        return;
      }

      if (connections.length === 0 && canvasModels.length > 1) {
        message.error('请配置模型之间的关联关系');
        return;
      }

      if (selectedFields.length === 0) {
        message.error('请至少选择一个字段');
        return;
      }

      // 构建JOIN配置
      const joinsConfig = connections.map(conn => ({
        leftModelId: conn.fromModelId,
        leftField: conn.fromField,
        rightModelId: conn.toModelId,
        rightField: conn.toField,
        joinType: conn.joinType,
      }));

      // 构建字段配置
      const fieldsConfig = selectedFields
        .filter(f => f.fieldType !== 'variable')
        .map(f => ({
          modelId: f.modelId,
          fieldCode: f.fieldCode,
          alias: f.alias,
          aggregation: f.aggregation,
          expression: f.expression,
          fieldType: f.fieldType,
        }));

      createMutation.mutate({
        name: values.name,
        code: values.code,
        description: values.description,
        joins: joinsConfig,
        fields: fieldsConfig,
        variableFields: variableFields,
      });
    } catch (error) {
      // 表单验证失败
    }
  };

  // 模型节点操作菜单
  const getModelNodeMenu = (model: ModelNode) => (
    <Menu>
      <Menu.Item key="add-all-fields" icon={<PlusOutlined />}>
        添加所有字段
      </Menu.Item>
      <Menu.Item key="add-dimensions" icon={<PlusOutlined />}>
        添加所有维度
      </Menu.Item>
      <Menu.Item key="add-measures" icon={<PlusOutlined />}>
        添加所有度量
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item
        key="remove"
        danger
        icon={<DeleteOutlined />}
        onClick={() => handleRemoveModelFromCanvas(model.id)}
      >
        从画布移除
      </Menu.Item>
    </Menu>
  );

  // 字段操作菜单
  const getFieldMenu = (field: SelectedFieldConfig) => (
    <Menu>
      <Menu.Item
        key="edit"
        icon={<EditOutlined />}
        onClick={() => handleEditField(field)}
      >
        编辑配置
      </Menu.Item>
      {field.fieldType === 'source' && (
        <Menu.Item
          key="convert-calculated"
          icon={<CalculatorOutlined />}
        >
          转为计算字段
        </Menu.Item>
      )}
      <Menu.Divider />
      <Menu.Item
        key="delete"
        danger
        icon={<DeleteOutlined />}
        onClick={() => handleDeleteField(field.id)}
      >
        移除字段
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
                创建复合模型
              </Title>
              <Text type="secondary">通过拖拽方式配置模型关联，创建复合数据模型</Text>
            </Space>
          </Col>
          <Col span={6} style={{ textAlign: 'right' }}>
            <Space>
              <Button
                icon={<EyeOutlined />}
                onClick={generateSQLPreview}
              >
                预览SQL
              </Button>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/bi-report/models')}
              >
                返回
              </Button>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleSubmit}
                loading={createMutation.isPending}
              >
                创建模型
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 主要内容区域 */}
      <div style={{ flex: 1, display: 'flex', gap: 16, overflow: 'hidden' }}>
        {/* 左侧：模型列表 */}
        <Card
          title="可用模型"
          style={{ width: 300, overflowY: 'auto' }}
          size="small"
        >
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            {baseModels?.map((model: any) => (
              <Card
                key={model.id}
                size="small"
                hoverable
                style={{ cursor: 'move' }}
                onClick={() => handleAddModelToCanvas(model)}
              >
                <Space direction="vertical" size={0}>
                  <Text strong>{model.name}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {model.code}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {model.fields?.length || 0} 个字段
                  </Text>
                </Space>
              </Card>
            ))}
          </Space>
        </Card>

        {/* 中间：画布区域 */}
        <Card
          title={
            <Space>
              <LinkOutlined />
              模型关联图
              <Text type="secondary">（拖拽模型调整位置）</Text>
            </Space>
          }
          extra={
            canvasModels.length >= 2 && (
              <Alert
                message={
                  <Space>
                    <Text style={{ fontSize: 12 }}>💡 点击模型左右两侧的</Text>
                    <LinkOutlined />
                    <Text style={{ fontSize: 12 }}>绿色圆点创建连接</Text>
                  </Space>
                }
                type="info"
                showIcon={false}
                style={{
                  padding: '4px 12px',
                  fontSize: 12,
                  backgroundColor: '#e6f7ff',
                  border: '1px solid #91d5ff',
                }}
              />
            )
          }
          style={{ flex: 1, position: 'relative' }}
          bodyStyle={{ height: '100%', overflow: 'auto', position: 'relative' }}
        >
          {canvasModels.length === 0 ? (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              <LinkOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
              <div style={{ marginTop: 16, color: '#999' }}>
                点击左侧模型添加到画布
              </div>
            </div>
          ) : (
            <div
              ref={canvasRef}
              style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                minWidth: 800,
                minHeight: 600,
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
                  const fromModel = canvasModels.find(m => m.id === conn.fromModelId);
                  const toModel = canvasModels.find(m => m.id === conn.toModelId);
                  if (!fromModel || !toModel) return null;

                  const fromX = fromModel.x + 200;
                  const fromY = fromModel.y + 80;
                  const toX = toModel.x;
                  const toY = toModel.y + 80;

                  const midX = (fromX + toX) / 2;
                  return (
                    <g key={conn.id}>
                      <path
                        d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
                        stroke="#1890ff"
                        strokeWidth="2"
                        fill="none"
                      />
                      <text x={midX} y={(fromY + toY) / 2 - 5} textAnchor="middle" fill="#666" fontSize="12">
                        {conn.joinType}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* 模型节点 */}
              {canvasModels.map(model => (
                <div
                  key={model.id}
                  className="model-node"
                  style={{
                    position: 'absolute',
                    left: model.x,
                    top: model.y,
                    width: 220,
                    border: `2px solid ${pendingConnectionModel === model.id ? '#1890ff' : '#d9d9d9'}`,
                    borderRadius: 4,
                    backgroundColor: 'white',
                    boxShadow: pendingConnectionModel === model.id ? '0 0 16px rgba(24, 144, 255, 0.5)' : '0 2px 8px rgba(0,0,0,0.1)',
                    cursor: 'move',
                    zIndex: pendingConnectionModel === model.id ? 10 : 1,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, model)}
                >
                  {/* 左侧连接点 */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartConnection(model.id);
                    }}
                    style={{
                      position: 'absolute',
                      left: -8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: pendingConnectionModel === model.id ? '#1890ff' : '#52c41a',
                      border: '2px solid white',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      cursor: 'pointer',
                      zIndex: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="点击连接到其他模型"
                  >
                    <LinkOutlined style={{ fontSize: 10, color: 'white' }} />
                  </div>

                  {/* 右侧连接点 */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartConnection(model.id);
                    }}
                    style={{
                      position: 'absolute',
                      right: -8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: pendingConnectionModel === model.id ? '#1890ff' : '#52c41a',
                      border: '2px solid white',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      cursor: 'pointer',
                      zIndex: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="点击连接到其他模型"
                  >
                    <LinkOutlined style={{ fontSize: 10, color: 'white' }} />
                  </div>

                  {/* 模型头部 */}
                  <div
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #f0f0f0',
                      backgroundColor: pendingConnectionModel === model.id ? '#e6f7ff' : '#fafafa',
                      borderRadius: '4px 4px 0 0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Space>
                      <DragOutlined />
                      <Text strong>{model.name}</Text>
                    </Space>
                    <Dropdown overlay={getModelNodeMenu(model)} trigger={['click']}>
                      <MoreOutlined style={{ cursor: 'pointer' }} />
                    </Dropdown>
                  </div>

                  {/* 提示信息 */}
                  {pendingConnectionModel === model.id && (
                    <Alert
                      message="请点击要连接的目标模型"
                      type="info"
                      showIcon
                      style={{
                        margin: 8,
                        padding: '4px 8px',
                        fontSize: 11,
                      }}
                    />
                  )}

                  {/* 字段列表 */}
                  <div style={{ maxHeight: 200, overflowY: 'auto', padding: '8px' }}>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      {model.fields?.map(field => (
                        <div
                          key={field.code}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 2,
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f5f5f5';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          onDoubleClick={() => handleAddField(model, field)}
                        >
                          <Space size={4}>
                            <Tag
                              color={field.type === 'dimension' ? 'blue' : 'green'}
                              style={{ margin: 0, fontSize: 11 }}
                            >
                              {field.type === 'dimension' ? '维度' : '度量'}
                            </Tag>
                            <Text style={{ fontSize: 12 }}>{field.name}</Text>
                          </Space>
                          <PlusOutlined
                            style={{ fontSize: 12, color: '#999' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddField(model, field);
                            }}
                          />
                        </div>
                      ))}
                    </Space>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 右侧：配置面板 */}
        <Card
          title="配置面板"
          style={{ width: 350, overflowY: 'auto' }}
          size="small"
        >
          <Collapse defaultActiveKey={['basic', 'fields']} size="small">
            {/* 基本信息 */}
            <Panel header="基本信息" key="basic">
              <Form form={form} layout="vertical" size="small">
                <Form.Item
                  label="模型名称"
                  name="name"
                  rules={[{ required: true, message: '请输入模型名称' }]}
                >
                  <Input placeholder="如：员工工时明细" />
                </Form.Item>
                <Form.Item
                  label="模型代码"
                  name="code"
                  rules={[
                    { required: true, message: '请输入模型代码' },
                    { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '只能包含字母、数字和下划线' },
                  ]}
                >
                  <Input placeholder="如：EMPLOYEE_WORK_HOUR_DETAIL" />
                </Form.Item>
                <Form.Item label="描述" name="description">
                  <Input.TextArea rows={3} placeholder="描述此复合模型" />
                </Form.Item>
              </Form>
            </Panel>

            {/* 已选字段 */}
            <Panel header={`已选字段 (${selectedFields.length})`} key="fields">
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Button
                  type="dashed"
                  block
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setIsVariableModalVisible(true)}
                >
                  添加变量字段
                </Button>

                {selectedFields.map(field => (
                  <Card
                    key={field.id}
                    size="small"
                    style={{ backgroundColor: '#fafafa' }}
                  >
                    <Dropdown overlay={getFieldMenu(field)} trigger={['contextMenu']}>
                      <div>
                        <Space direction="vertical" size={0}>
                          <Space>
                            <Tag
                              color={
                                field.fieldType === 'variable' ? 'orange' :
                                field.fieldType === 'calculated' ? 'blue' :
                                field.fieldType === 'dimension' ? 'green' : 'default'
                              }
                              style={{ fontSize: 10 }}
                            >
                              {field.fieldType === 'variable' ? '变量' :
                               field.fieldType === 'calculated' ? '计算' :
                               field.modelName}
                            </Tag>
                            <Text strong style={{ fontSize: 12 }}>
                              {field.fieldName}
                            </Text>
                          </Space>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {field.alias || field.fieldCode}
                          </Text>
                          {field.aggregation && (
                            <Tag color="purple" style={{ fontSize: 10 }}>
                              {field.aggregation}
                            </Tag>
                          )}
                        </Space>
                      </div>
                    </Dropdown>
                  </Card>
                ))}
              </Space>
            </Panel>

            {/* JOIN配置 */}
            <Panel header={`JOIN配置 (${connections.length})`} key="joins">
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {canvasModels.length >= 2 && (
                  <Button
                    type="primary"
                    size="small"
                    block
                    icon={<LinkOutlined />}
                    onClick={() => {
                      // 创建JOIN选择弹窗
                      const joinSelectModal = Modal.confirm({
                        title: '创建JOIN连接',
                        content: (
                          <div>
                            <Form layout="vertical">
                              <Form.Item label="左表模型">
                                <Select
                                  placeholder="选择左表模型"
                                  onChange={(value) => {
                                    const formEl = document.getElementById('right-model-select') as any;
                                    if (formEl) {
                                      // 更新右表可选模型
                                    }
                                  }}
                                >
                                  {canvasModels.map(model => (
                                    <Option key={model.id} value={model.id}>
                                      {model.name}
                                    </Option>
                                  ))}
                                </Select>
                              </Form.Item>
                              <Form.Item label="右表模型">
                                <Select
                                  id="right-model-select"
                                  placeholder="选择右表模型"
                                >
                                  {canvasModels.map(model => (
                                    <Option key={model.id} value={model.id}>
                                      {model.name}
                                    </Option>
                                  ))}
                                </Select>
                              </Form.Item>
                            </Form>
                          </div>
                        ),
                        onOk: () => {
                          const leftSelect = document.querySelector('.ant-modal:not(.hidden) select:first-child') as HTMLSelectElement;
                          const rightSelect = document.querySelector('.ant-modal:not(.hidden) select:last-child') as HTMLSelectElement;

                          const leftModelId = leftSelect?.value ? parseInt(leftSelect.value) : null;
                          const rightModelId = rightSelect?.value ? parseInt(rightSelect.value) : null;

                          if (!leftModelId || !rightModelId) {
                            message.error('请选择两个模型');
                            return false;
                          }

                          if (leftModelId === rightModelId) {
                            message.error('不能连接同一模型');
                            return false;
                          }

                          handleAddConnection(leftModelId, rightModelId);
                          return true;
                        },
                      });
                    }}
                  >
                    手动添加JOIN
                  </Button>
                )}

                {connections.map(conn => {
                  const fromModel = canvasModels.find(m => m.id === conn.fromModelId);
                  const toModel = canvasModels.find(m => m.id === conn.toModelId);
                  return (
                    <Card
                      key={conn.id}
                      size="small"
                      extra={
                        <Button
                          type="link"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteConnection(conn.id)}
                        />
                      }
                    >
                      <Space direction="vertical" size={0}>
                        <div>
                          <Tag color="blue">{fromModel?.name}</Tag>
                          <Text style={{ fontSize: 11 }}>{conn.fromField}</Text>
                        </div>
                        <Tag color="orange">{conn.joinType}</Tag>
                        <div>
                          <Tag color="green">{toModel?.name}</Tag>
                          <Text style={{ fontSize: 11 }}>{conn.toField}</Text>
                        </div>
                      </Space>
                    </Card>
                  );
                })}
                {connections.length === 0 && canvasModels.length < 2 && (
                  <Alert
                    message="请先添加至少两个模型"
                    description="添加多个模型后才能创建JOIN连接"
                    type="info"
                    showIcon
                    style={{ fontSize: 11 }}
                  />
                )}
                {connections.length === 0 && canvasModels.length >= 2 && (
                  <Alert
                    message="创建JOIN连接"
                    description={
                      <div>
                        <div>方式1：点击模型节点的绿色连接点</div>
                        <div>方式2：点击"手动添加JOIN"按钮</div>
                      </div>
                    }
                    type="info"
                    showIcon
                    style={{ fontSize: 11 }}
                  />
                )}
              </Space>
            </Panel>
          </Collapse>
        </Card>
      </div>

      {/* SQL预览弹窗 */}
      <Modal
        title="SQL预览"
        open={isPreviewModalVisible}
        onCancel={() => setIsPreviewModalVisible(false)}
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
        width={800}
      >
        <pre
          style={{
            backgroundColor: '#f5f5f5',
            padding: 16,
            borderRadius: 4,
            overflow: 'auto',
            maxHeight: 400,
            fontSize: 12,
          }}
        >
          {previewSQL}
        </pre>
      </Modal>

      {/* 字段配置弹窗 */}
      <Modal
        title="字段配置"
        open={isFieldConfigModalVisible}
        onOk={handleSaveFieldConfig}
        onCancel={() => {
          setIsFieldConfigModalVisible(false);
          setCurrentEditingField(null);
          fieldForm.resetFields();
        }}
        width={600}
      >
        <Form form={fieldForm} layout="vertical">
          <Form.Item label="别名" name="alias">
            <Input placeholder="设置字段别名" />
          </Form.Item>
          <Form.Item label="聚合函数" name="aggregation">
            <Select placeholder="选择聚合函数" allowClear>
              <Option value="sum">SUM - 求和</Option>
              <Option value="avg">AVG - 平均</Option>
              <Option value="count">COUNT - 计数</Option>
              <Option value="max">MAX - 最大</Option>
              <Option value="min">MIN - 最小</Option>
            </Select>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.fieldType !== curr.fieldType}
          >
            {({ getFieldValue }) =>
              getFieldValue('fieldType') === 'calculated' && (
                <Form.Item
                  label="计算表达式"
                  name="expression"
                  rules={[{ required: true, message: '请输入计算表达式' }]}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="如: workHours * hourlyRate"
                  />
                </Form.Item>
              )
            }
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} placeholder="字段描述" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加变量字段弹窗 */}
      <Modal
        title="添加变量字段"
        open={isVariableModalVisible}
        onOk={handleAddVariableField}
        onCancel={() => {
          setIsVariableModalVisible(false);
          variableForm.resetFields();
        }}
        width={600}
      >
        <Form form={variableForm} layout="vertical">
          <Form.Item
            label="变量名称"
            name="name"
            rules={[{ required: true, message: '请输入变量名称' }]}
          >
            <Input placeholder="如：起始日期" />
          </Form.Item>
          <Form.Item
            label="变量代码"
            name="code"
            rules={[
              { required: true, message: '请输入变量代码' },
              { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '只能包含字母、数字和下划线' },
            ]}
          >
            <Input placeholder="如：startDate" />
          </Form.Item>
          <Form.Item
            label="数据类型"
            name="dataType"
            rules={[{ required: true, message: '请选择数据类型' }]}
          >
            <Select>
              <Option value="string">字符串</Option>
              <Option value="number">数字</Option>
              <Option value="date">日期</Option>
              <Option value="boolean">布尔</Option>
            </Select>
          </Form.Item>
          <Form.Item label="默认值" name="defaultValue">
            <Input placeholder="默认值（可选）" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} placeholder="描述此变量的用途" />
          </Form.Item>
        </Form>
      </Modal>

      {/* JOIN配置弹窗 */}
      <Modal
        title="配置JOIN条件"
        open={joinConfigVisible}
        onOk={handleAddConnection}
        onCancel={() => {
          setJoinConfigVisible(false);
          joinConfigForm.resetFields();
          setPendingFromModel(null);
          setPendingToModel(null);
        }}
        width={600}
      >
        <Alert
          message={`连接：${canvasModels.find(m => m.id === pendingFromModel)?.name} → ${canvasModels.find(m => m.id === pendingToModel)?.name}`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={joinConfigForm} layout="vertical">
          <Form.Item
            label="左表字段"
            name="fromField"
            rules={[{ required: true, message: '请选择左表字段' }]}
          >
            <Select placeholder="选择左表字段">
              {canvasModels
                .find(m => m.id === pendingFromModel)
                ?.fields?.map(f => (
                  <Option key={f.code} value={f.code}>
                    {f.name} ({f.code})
                  </Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="右表字段"
            name="toField"
            rules={[{ required: true, message: '请选择右表字段' }]}
          >
            <Select placeholder="选择右表字段">
              {canvasModels
                .find(m => m.id === pendingToModel)
                ?.fields?.map(f => (
                  <Option key={f.code} value={f.code}>
                    {f.name} ({f.code})
                  </Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="连接方式"
            name="joinType"
            initialValue="LEFT"
            rules={[{ required: true, message: '请选择连接方式' }]}
          >
            <Select>
              <Option value="INNER">INNER JOIN - 内连接（只匹配两边都有的数据）</Option>
              <Option value="LEFT">LEFT JOIN - 左连接（保留左表所有数据）</Option>
              <Option value="RIGHT">RIGHT JOIN - 右连接（保留右表所有数据）</Option>
              <Option value="FULL">FULL JOIN - 全连接（保留所有数据）</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CompositeModelEditPage;
