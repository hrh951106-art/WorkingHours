import { useState, useCallback, useRef } from 'react';
import { Card, Button, Space, Drawer, Form, Input, Select, Checkbox, message, Modal, Row, Col, Divider, Tag } from 'antd';
import { SaveOutlined, EyeOutlined, PlusOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
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
  NodeTypes,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import request from '@/utils/request';

// 节点类型
const NODE_TYPES = {
  start: { label: '开始', color: '#52c41a', type: 'start' },
  approval: { label: '审批', color: '#1890ff', type: 'approval' },
  condition: { label: '条件', color: '#faad14', type: 'condition' },
  cc: { label: '抄送', color: '#722ed1', type: 'cc' },
  end: { label: '结束', color: '#f5222d', type: 'end' },
};

// 自定义审批节点
const ApprovalNode = ({ data }: { data: any }) => {
  return (
    <div
      style={{
        padding: '10px 15px',
        borderRadius: '8px',
        background: '#fff',
        border: '2px solid #1890ff',
        minWidth: '150px',
        textAlign: 'center',
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
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{data.label}</div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        {data.needAllApprove ? '会签' : '或签'}
      </div>
      <div style={{ fontSize: '12px', color: '#666' }}>
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

// 自定义条件节点
const ConditionNode = ({ data }: { data: any }) => {
  return (
    <div
      style={{
        padding: '10px 15px',
        borderRadius: '8px',
        background: '#fff',
        border: '2px solid #faad14',
        minWidth: '150px',
        textAlign: 'center',
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
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{data.label}</div>
      <div style={{ fontSize: '12px', color: '#666' }}>
        {data.conditions?.length > 0 ? `${data.conditions.length}个条件` : '未配置条件'}
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
const StartNode = ({ data }: { data: any }) => {
  return (
    <div
      style={{
        padding: '10px 15px',
        borderRadius: '20px',
        background: '#52c41a',
        color: '#fff',
        minWidth: '100px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontWeight: 'bold' }}>{data.label}</div>
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
};

// 自定义结束节点
const EndNode = ({ data }: { data: any }) => {
  return (
    <div
      style={{
        padding: '10px 15px',
        borderRadius: '20px',
        background: '#f5222d',
        color: '#fff',
        minWidth: '100px',
        textAlign: 'center',
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
      <div style={{ fontWeight: 'bold' }}>{data.label}</div>
    </div>
  );
};

// 自定义抄送节点
const CcNode = ({ data }: { data: any }) => {
  return (
    <div
      style={{
        padding: '10px 15px',
        borderRadius: '8px',
        background: '#fff',
        border: '2px solid #722ed1',
        minWidth: '150px',
        textAlign: 'center',
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
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{data.label}</div>
      <div style={{ fontSize: '12px', color: '#666' }}>
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

const nodeTypes: NodeTypes = {
  start: StartNode,
  approval: ApprovalNode,
  condition: ConditionNode,
  cc: CcNode,
  end: EndNode,
};

interface WorkflowDesignerPageProps {
  isEdit?: boolean;
  definitionId?: number;
}

const WorkflowDesignerPage: React.FC<WorkflowDesignerPageProps> = ({
  isEdit = false,
  definitionId,
}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [nodeForm] = Form.useForm();

  // 从URL获取参数
  const categoryId = searchParams.get('category') || 'SUPPORT_REQUEST';

  // 获取预定义的参与人配置
  const { data: participantConfigs = [] } = useQuery({
    queryKey: ['workflowParticipants'],
    queryFn: async () => {
      return request.get('/workflow/participants');
    },
    enabled: drawerVisible,
  });

  // 添加节点
  const addNode = useCallback(
    (type: string) => {
      const newNode: Node = {
        id: `${type}_${Date.now()}`,
        type,
        position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
        data: {
          label: NODE_TYPES[type as keyof typeof NODE_TYPES]?.label || type,
          nodeType: type,
          needAllApprove: false,
          selectedParticipantIds: [],
          conditions: [],
          selectedCcParticipantIds: [],
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes],
  );

  // 连接节点
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        id: `e${params.source}-${params.target}`,
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges],
  );

  // 节点点击事件
  const onNodeClick = useCallback((event: any, node: Node) => {
    setSelectedNode(node);
    nodeForm.setFieldsValue(node.data);
    setDrawerVisible(true);
  }, [nodeForm]);

  // 删除节点
  const deleteNode = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) =>
        eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id),
      );
      setDrawerVisible(false);
      setSelectedNode(null);
    }
  }, [selectedNode, setNodes, setEdges]);

  // 保存节点配置
  const saveNodeConfig = useCallback(() => {
    const values = nodeForm.getFieldsValue();
    if (selectedNode) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNode.id ? { ...node, data: { ...node.data, ...values } } : node,
        ),
      );
      message.success('节点配置保存成功');
      setDrawerVisible(false);
      setSelectedNode(null);
    }
  }, [selectedNode, nodeForm, setNodes]);

  // 保存流程
  const saveWorkflow = useCallback(async () => {
    try {
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

      if (edges.length === 0) {
        message.error('请连接节点');
        return;
      }

      const workflowData = {
        definitionId: definitionId ? parseInt(definitionId) : undefined,
        name: `流程_${new Date().toLocaleString()}`,
        category: categoryId,
        description: '',
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
          })),
        },
      };

      // 调用API保存
      await request.post('/workflow/design', workflowData);
      message.success('保存成功');

      // 清除所有工作流相关的缓存
      queryClient.invalidateQueries({ queryKey: ['workflowDefinitions'] });

      // 导航到列表页
      navigate('/workflow/definitions');
    } catch (error: any) {
      console.error('保存失败:', error);
      message.error(error.response?.data?.message || '保存失败');
    }
  }, [nodes, edges, categoryId, definitionId, navigate, queryClient]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 顶部工具栏 */}
      <div style={{
        padding: '8px 16px',
        background: '#fff',
        borderBottom: '1px solid #e8e8e8',
        flexShrink: 0,
        height: '56px',
      }}>
        <Row justify="space-between" align="middle" style={{ height: '100%' }}>
          <Col>
            <Space wrap>
              <span style={{ fontWeight: 'bold', fontSize: 16 }}>流程设计器</span>
              <Divider type="vertical" />
              <Button
                icon={<PlusOutlined />}
                onClick={() => addNode('start')}
              >
                开始
              </Button>
              <Button
                icon={<PlusOutlined />}
                onClick={() => addNode('approval')}
              >
                审批
              </Button>
              <Button
                icon={<PlusOutlined />}
                onClick={() => addNode('condition')}
              >
                条件
              </Button>
              <Button
                icon={<PlusOutlined />}
                onClick={() => addNode('cc')}
              >
                抄送
              </Button>
              <Button
                danger
                icon={<PlusOutlined />}
                onClick={() => addNode('end')}
              >
                结束
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<EyeOutlined />} onClick={() => setPreviewVisible(true)}>
                预览
              </Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={saveWorkflow}>
                保存
              </Button>
              <Button onClick={() => navigate('/workflow/definitions')}>返回</Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* 流程图画布 */}
      <div ref={reactFlowWrapper} style={{
        position: 'absolute',
        top: '60px',
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden'
      }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
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
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          <Controls />
        </ReactFlow>
      </div>

      {/* 节点配置抽屉 */}
      <Drawer
        title={
          <Space>
            <SettingOutlined />
            {selectedNode?.data?.label} - 节点配置
          </Space>
        }
        placement="right"
        width={500}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        extra={
          <Button type="primary" onClick={saveNodeConfig}>
            保存配置
          </Button>
        }
        styles={{
          body: { paddingTop: '12px' },
        }}
      >
        {selectedNode && (
          <Form form={nodeForm} layout="vertical">
            <Form.Item label="节点名称" name="label" rules={[{ required: true }]}>
              <Input />
            </Form.Item>

            {selectedNode.type === 'approval' && (
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
                        <Select.Option
                          key={config.code}
                          value={config.code}
                          label={`${config.name} (${config.code})`}
                        >
                          <Space>
                            <span>{config.name}</span>
                            <Tag color="blue">{config.code}</Tag>
                          </Space>
                        </Select.Option>
                      ))}
                  </Select>
                </Form.Item>
              </>
            )}

            {selectedNode.type === 'condition' && (
              <Form.Item label="条件配置" name="conditions">
                <Select mode="tags" placeholder="输入条件表达式" />
              </Form.Item>
            )}

            {selectedNode.type === 'cc' && (
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
                      <Select.Option
                        key={config.code}
                        value={config.code}
                        label={`${config.name} (${config.code})`}
                      >
                        <Space>
                          <span>{config.name}</span>
                          <Tag color="blue">{config.code}</Tag>
                        </Space>
                      </Select.Option>
                    ))}
                </Select>
              </Form.Item>
            )}

            <Divider />

            <Button danger block icon={<DeleteOutlined />} onClick={deleteNode}>
              删除节点
            </Button>
          </Form>
        )}
      </Drawer>

      {/* 预览弹窗 */}
      <Modal
        title="流程预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width={900}
        styles={{ body: { padding: '16px' } }}
      >
        <div style={{ height: '500px', background: '#f5f5f5', borderRadius: '8px' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            zoomOnScroll={false}
            panOnScroll={false}
          >
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>
      </Modal>
    </div>
  );
};

export default WorkflowDesignerPage;
