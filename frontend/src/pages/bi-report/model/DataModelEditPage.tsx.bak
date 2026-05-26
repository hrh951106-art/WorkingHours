import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  message,
  Row,
  Col,
  Form,
  Input,
  Select,
  Table,
  Modal,
  Typography,
  Divider,
  Tag,
  Switch,
  Popconfirm,
  Tabs,
  Transfer,
  Alert,
} from 'antd';
import {
  SaveOutlined,
  LeftOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  ImportOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import request from '@/utils/request';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface ModelField {
  id?: number;
  name: string;
  code: string;
  type: 'dimension' | 'measure';
  dataType: 'string' | 'number' | 'date' | 'boolean';
  aggregation?: string;
  description?: string;
  format?: string;
  sourceType?: 'column' | 'sql' | 'calculated';
  sourceExpr?: string;
  isVisible?: boolean;
  isSearchable?: boolean;
  sortNo?: number;
}

interface DataModel {
  id?: number;
  name: string;
  code: string;
  type: string;
  sourceTable?: string;
  description?: string;
  status?: string;
  fields?: ModelField[];
}

interface TableMetadata {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    primary: boolean;
  }>;
}

const DataModelEditPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const isEdit = !!params.id;
  const modelId = params.id ? parseInt(params.id) : undefined;

  const [selectedTable, setSelectedTable] = useState<string>('');
  const [availableFields, setAvailableFields] = useState<any[]>([]);
  const [modelFields, setModelFields] = useState<ModelField[]>([]);
  const [isFieldModalVisible, setIsFieldModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<ModelField | null>(null);
  const [fieldForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('basic');
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [selectedFieldKeys, setSelectedFieldKeys] = useState<string[]>([]);

  // 获取数据库表列表
  const { data: tablesData, isLoading: tablesLoading } = useQuery({
    queryKey: ['databaseTables'],
    queryFn: async () => {
      return request.get('/bi-report/datasource/tables');
    },
  });

  // 获取模型详情（编辑模式）
  const { data: modelData, isLoading: modelLoading } = useQuery({
    queryKey: ['dataModel', modelId],
    queryFn: async () => {
      if (!modelId) return null;
      return request.get(`/bi-report/models/${modelId}`);
    },
    enabled: !!modelId,
  });

  // 获取表结构
  const { data: tableStructure, isLoading: structureLoading } = useQuery({
    queryKey: ['tableStructure', selectedTable],
    queryFn: async () => {
      if (!selectedTable) return null;
      return request.get(`/bi-report/datasource/tables/${selectedTable}/structure`);
    },
    enabled: !!selectedTable,
  });

  // 初始化表单数据（编辑模式）
  useEffect(() => {
    if (modelData) {
      form.setFieldsValue({
        name: modelData.name,
        code: modelData.code,
        type: modelData.type,
        sourceTable: modelData.sourceTable,
        description: modelData.description,
      });
      setSelectedTable(modelData.sourceTable || '');
      setModelFields(modelData.fields || []);
    }
  }, [modelData, form]);

  // 当表结构加载完成时，更新可用字段列表
  useEffect(() => {
    if (tableStructure && tableStructure.columns) {
      const fields = tableStructure.columns.map((col: any) => ({
        code: col.columnName,
        name: col.displayName || col.columnName,
        dataType: mapDataTypeToSystemType(col.dataType),
        fieldType: col.fieldType,
        description: col.description,
        primary: tableStructure.primaryKeys?.some((pk: any) => pk.columnName === col.columnName),
        isRequired: col.isRequired,
      }));
      setAvailableFields(fields);
    }
  }, [tableStructure]);

  // 映射SQLite类型到系统类型
  const mapDataTypeToSystemType = (dbType: string): 'string' | 'number' | 'date' | 'boolean' => {
    const type = dbType.toLowerCase();
    if (type.includes('int') || type.includes('real') || type.includes('float') || type.includes('decimal')) {
      return 'number';
    }
    if (type.includes('date') || type.includes('time')) {
      return 'date';
    }
    if (type.includes('bool')) {
      return 'boolean';
    }
    return 'string';
  };

  // 映射 PostgreSQL 类型到系统类型
  const mapPostgresTypeToDataType = (pgType: string): 'string' | 'number' | 'date' | 'boolean' => {
    if (pgType.includes('int') || pgType.includes('decimal') || pgType.includes('numeric') || pgType.includes('float')) {
      return 'number';
    }
    if (pgType.includes('date') || pgType.includes('timestamp')) {
      return 'date';
    }
    if (pgType.includes('bool')) {
      return 'boolean';
    }
    return 'string';
  };

  // 创建模型
  const createMutation = useMutation({
    mutationFn: (data: any) => request.post('/bi-report/models', data),
    onSuccess: (result) => {
      message.success('模型创建成功');

      // 批量添加字段
      if (modelFields.length > 0) {
        return request.post(`/bi-report/models/${result.id}/fields/batch`, {
          fields: modelFields,
        });
      }
      navigate('/bi-report/models');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '创建失败');
    },
  });

  // 更新模型
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      request.put(`/bi-report/models/${id}`, data),
    onSuccess: () => {
      message.success('模型更新成功');
      queryClient.invalidateQueries({ queryKey: ['dataModel', modelId] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '更新失败');
    },
  });

  // 添加字段
  const addFieldMutation = useMutation({
    mutationFn: ({ modelId, field }: { modelId: number; field: ModelField }) =>
      request.post(`/bi-report/models/${modelId}/fields`, field),
    onSuccess: () => {
      message.success('字段添加成功');
      queryClient.invalidateQueries({ queryKey: ['dataModel', modelId] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '添加失败');
    },
  });

  // 批量导入字段
  const handleBatchImport = () => {
    const newFields: ModelField[] = availableFields.map((field, index) => {
      // 优先使用元数据中的字段类型，否则根据数据类型智能判断
      let type: 'dimension' | 'measure' = 'dimension';
      if (field.fieldType === 'measure' || (field.dataType === 'number' && !field.fieldType)) {
        type = 'measure';
      }

      return {
        name: field.name,
        code: field.code,
        type,
        dataType: field.dataType,
        sourceType: 'column',
        sourceExpr: field.code,
        aggregation: type === 'measure' ? 'sum' : undefined,
        description: field.description,
        isVisible: true,
        isSearchable: false,
        sortNo: modelFields.length + index,
      };
    });

    setModelFields((prev) => {
      const existingCodes = prev.map((f) => f.code);
      const fieldsToAdd = newFields.filter((f) => !existingCodes.includes(f.code));
      return [...prev, ...fieldsToAdd];
    });

    setIsImportModalVisible(false);
    message.success(`成功导入 ${newFields.length} 个字段`);
  };

  // 选择性导入字段
  const handleSelectiveImport = () => {
    if (selectedFieldKeys.length === 0) {
      message.warning('请至少选择一个字段');
      return;
    }

    const selectedFields = availableFields.filter(f => selectedFieldKeys.includes(f.code));
    const newFields: ModelField[] = selectedFields.map((field, index) => {
      let type: 'dimension' | 'measure' = 'dimension';
      if (field.fieldType === 'measure' || (field.dataType === 'number' && !field.fieldType)) {
        type = 'measure';
      }

      return {
        name: field.name,
        code: field.code,
        type,
        dataType: field.dataType,
        sourceType: 'column',
        sourceExpr: field.code,
        aggregation: type === 'measure' ? 'sum' : undefined,
        description: field.description,
        isVisible: true,
        isSearchable: false,
        sortNo: modelFields.length + index,
      };
    });

    setModelFields((prev) => {
      const existingCodes = prev.map((f) => f.code);
      const fieldsToAdd = newFields.filter((f) => !existingCodes.includes(f.code));
      return [...prev, ...fieldsToAdd];
    });

    setIsImportModalVisible(false);
    setSelectedFieldKeys([]);
    message.success(`成功导入 ${newFields.length} 个字段`);
  };

  // 打开字段编辑弹窗
  const handleEditField = (field: ModelField) => {
    setEditingField(field);
    fieldForm.setFieldsValue(field);
    setIsFieldModalVisible(true);
  };

  // 添加新字段
  const handleAddField = () => {
    setEditingField(null);
    fieldForm.resetFields();
    setIsFieldModalVisible(true);
  };

  // 保存字段
  const handleSaveField = async () => {
    try {
      const values = await fieldForm.validateFields();

      if (editingField) {
        // 更新现有字段
        setModelFields((prev) =>
          prev.map((f) => (f.id === editingField.id || f.code === editingField.code ? { ...values } : f))
        );
      } else {
        // 添加新字段
        setModelFields((prev) => [...prev, values]);
      }

      setIsFieldModalVisible(false);
      message.success(editingField ? '字段更新成功' : '字段添加成功');
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 删除字段
  const handleDeleteField = (fieldCode: string) => {
    setModelFields((prev) => prev.filter((f) => f.code !== fieldCode));
    message.success('字段删除成功');
  };

  // 预览数据
  const handlePreviewData = async () => {
    if (!isEdit || !modelId) {
      message.warning('请先保存模型后再预览');
      return;
    }

    if (modelFields.length === 0) {
      message.warning('请先配置字段后再预览');
      return;
    }

    try {
      setIsPreviewLoading(true);
      const result = await request.post(`/bi-report/models/${modelId}/query`, {
        dimensions: modelFields.filter(f => f.type === 'dimension').map(f => f.code),
        measures: modelFields
          .filter(f => f.type === 'measure')
          .map(f => ({
            field: f.code,
            aggregation: f.aggregation || 'sum',
          })),
        limit: 20,
      });
      setPreviewData(result.data || []);
      setActiveTab('preview');
      message.success('数据预览加载成功');
    } catch (error: any) {
      message.error(error.response?.data?.message || '预览失败');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // 保存模型
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      if (!isEdit && modelFields.length === 0) {
        message.warning('请至少添加一个字段');
        return;
      }

      const data = {
        ...values,
        fields: modelFields,
      };

      if (isEdit && modelId) {
        updateMutation.mutate({ id: modelId, data });
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const columns = [
    {
      title: '字段名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '字段代码',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={type === 'dimension' ? 'blue' : 'green'}>
          {type === 'dimension' ? '维度' : '度量'}
        </Tag>
      ),
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 100,
      render: (dataType: string) => {
        const colorMap: Record<string, string> = {
          string: 'blue',
          number: 'green',
          date: 'orange',
          boolean: 'purple',
        };
        return <Tag color={colorMap[dataType] || 'default'}>{dataType}</Tag>;
      },
    },
    {
      title: '聚合函数',
      dataIndex: 'aggregation',
      key: 'aggregation',
      width: 100,
      render: (aggregation: string) => aggregation || '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: ModelField) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditField(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="确定要删除这个字段吗？"
            onConfirm={() => handleDeleteField(record.code)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={18}>
            <Title level={4} style={{ margin: 0 }}>
              {isEdit ? '编辑数据模型' : '创建数据模型'}
            </Title>
            <Text type="secondary">配置数据模型的字段、维度和度量</Text>
          </Col>
          <Col span={6} style={{ textAlign: 'right' }}>
            <Space>
              <Button icon={<LeftOutlined />} onClick={() => navigate('/bi-report/models')}>
                返回
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={createMutation.isPending || updateMutation.isPending}
              >
                保存
              </Button>
            </Space>
          </Col>
        </Row>

        <Divider />

        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="模型名称"
                name="name"
                rules={[{ required: true, message: '请输入模型名称' }]}
              >
                <Input placeholder="请输入模型名称" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="模型代码"
                name="code"
                rules={[{ required: true, message: '请输入模型代码' }]}
              >
                <Input placeholder="请输入模型代码（英文）" disabled={isEdit} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="模型类型"
                name="type"
                rules={[{ required: true, message: '请选择模型类型' }]}
                initialValue="table"
              >
                <Select placeholder="请选择模型类型" disabled={isEdit}>
                  <Option value="table">数据表</Option>
                  <Option value="sql">SQL查询</Option>
                  <Option value="api">API接口</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="源表"
                name="sourceTable"
                rules={[{ required: !isEdit, message: '请选择源表' }]}
              >
                <Select
                  placeholder="请选择源表"
                  loading={tablesLoading}
                  disabled={isEdit}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  onChange={setSelectedTable}
                >
                  {tablesData?.map((table: any) => (
                    <Option key={table.name} value={table.name} label={table.name}>
                      {table.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}></Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="描述" name="description">
                <TextArea rows={2} placeholder="请输入模型描述（可选）" maxLength={500} />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {selectedTable && (
          <Card
            title="字段配置"
            size="small"
            extra={
              <Space>
                {availableFields.length > 0 && (
                  <Button
                    icon={<CheckCircleOutlined />}
                    onClick={handleBatchImport}
                    disabled={isEdit}
                  >
                    批量导入
                  </Button>
                )}
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddField}>
                  添加字段
                </Button>
              </Space>
            }
          >
            <Table
              columns={columns}
              dataSource={modelFields}
              rowKey={(record) => record.code}
              loading={structureLoading}
              pagination={false}
              size="small"
            />
          </Card>
        )}
      </Card>

      {/* 字段编辑弹窗 */}
      <Modal
        title={editingField ? '编辑字段' : '添加字段'}
        open={isFieldModalVisible}
        onOk={handleSaveField}
        onCancel={() => setIsFieldModalVisible(false)}
        width={600}
      >
        <Form form={fieldForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="字段名称"
                name="name"
                rules={[{ required: true, message: '请输入字段名称' }]}
              >
                <Input placeholder="请输入字段名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="字段代码"
                name="code"
                rules={[{ required: true, message: '请输入字段代码' }]}
              >
                <Input placeholder="请输入字段代码（英文）" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="字段类型"
                name="type"
                rules={[{ required: true, message: '请选择字段类型' }]}
              >
                <Select placeholder="请选择字段类型">
                  <Option value="dimension">维度（分组）</Option>
                  <Option value="measure">度量（聚合）</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="数据类型"
                name="dataType"
                rules={[{ required: true, message: '请选择数据类型' }]}
              >
                <Select placeholder="请选择数据类型">
                  <Option value="string">字符串</Option>
                  <Option value="number">数字</Option>
                  <Option value="date">日期</Option>
                  <Option value="boolean">布尔</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}>
            {({ getFieldValue }) =>
              getFieldValue('type') === 'measure' ? (
                <Form.Item label="聚合函数" name="aggregation" initialValue="sum">
                  <Select>
                    <Option value="sum">求和</Option>
                    <Option value="avg">平均</Option>
                    <Option value="count">计数</Option>
                    <Option value="max">最大</Option>
                    <Option value="min">最小</Option>
                  </Select>
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item label="描述" name="description">
            <TextArea rows={3} placeholder="请输入字段描述（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DataModelEditPage;
