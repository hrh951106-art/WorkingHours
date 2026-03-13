import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Space,
  Tag,
  Row,
  Col,
  Tabs,
  Divider,
  Switch,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DragOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 可拖拽字段项组件
interface DraggableFieldProps {
  field: any;
  index: number;
  onRemove?: () => void;
  onToggleRequired?: () => void;
}

const DraggableField: React.FC<DraggableFieldProps> = ({
  field,
  index,
  onRemove,
  onToggleRequired,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="draggable-field" {...attributes}>
      <Card
        size="small"
        style={{
          marginBottom: 8,
          border: field.isRequired ? '2px solid #1890ff' : '1px solid #d9d9d9',
        }}
        bodyStyle={{ padding: '12px' }}
      >
        <Row align="middle" gutter={16}>
          <Col span={1} {...listeners} style={{ cursor: 'grab' }}>
            <DragOutlined style={{ color: '#999' }} />
          </Col>
          <Col span={6}>
            <strong>{field.fieldName || field.name}</strong>
            <div style={{ fontSize: 12, color: '#999' }}>
              {field.fieldCode || field.code}
            </div>
          </Col>
          <Col span={4}>
            <Tag color={field.fieldType === 'SYSTEM' ? 'blue' : 'green'}>
              {field.fieldType === 'SYSTEM' ? '系统' : '自定义'}
            </Tag>
          </Col>
          <Col span={4}>
            {field.fieldType === 'SYSTEM' && (
              <Tag>{field.type}</Tag>
            )}
            {field.fieldType === 'CUSTOM' && customFieldTypes[field.type as keyof typeof customFieldTypes]}
          </Col>
          <Col span={5}>
            <Space>
              <span>必填:</span>
              <Switch
                size="small"
                checked={field.isRequired}
                onChange={onToggleRequired}
                disabled={!onToggleRequired}
              />
            </Space>
          </Col>
          <Col span={4} style={{ textAlign: 'right' }}>
            {onRemove && (
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                移除
              </Button>
            )}
          </Col>
        </Row>
      </Card>
    </div>
  );
};

// 字段库中的字段项
const FieldLibraryItem: React.FC<{
  field: any;
  onAdd: () => void;
}> = ({ field, onAdd }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `library-${field.code}`,
    disabled: true,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <Card
        size="small"
        style={{
          marginBottom: 8,
          cursor: 'pointer',
        }}
        bodyStyle={{ padding: '12px' }}
        hoverable
        onClick={onAdd}
      >
        <Row align="middle" gutter={16}>
          <Col span={12}>
            <strong>{field.name}</strong>
            <div style={{ fontSize: 12, color: '#999' }}>
              {field.code}
            </div>
          </Col>
          <Col span={6}>
            <Tag color={field.type === 'TEXT' ? 'blue' : 'green'}>
              {field.type}
            </Tag>
          </Col>
          <Col span={6} style={{ textAlign: 'right' }}>
            <Button type="primary" size="small" icon={<PlusOutlined />}>
              添加
            </Button>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

const customFieldTypes: Record<string, string> = {
  TEXT: '文本',
  TEXTAREA: '多行文本',
  NUMBER: '数字',
  DATE: '日期',
  SELECT_SINGLE: '单选',
  SELECT_MULTI: '多选',
  LOOKUP: '查找',
};

const EmployeeInfoConfigPage: React.FC = () => {
  const [isTabModalOpen, setIsTabModalOpen] = useState(false);
  const [editingTab, setEditingTab] = useState<any>(null);
  const [selectedTabId, setSelectedTabId] = useState<number | null>(null);
  const [tabForm] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: tabs, isLoading } = useQuery({
    queryKey: ['employeeInfoTabs'],
    queryFn: () => request.get('/hr/employee-info-tabs').then((res: any) => res || []),
  });

  const { data: customFields } = useQuery({
    queryKey: ['customFields'],
    queryFn: () => request.get('/hr/custom-fields').then((res: any) => res || []),
  });

  // 系统字段列表
  const systemFields = [
    { code: 'employeeNo', name: '工号', type: 'TEXT' },
    { code: 'name', name: '姓名', type: 'TEXT' },
    { code: 'gender', name: '性别', type: 'TEXT' },
    { code: 'idCard', name: '身份证号', type: 'TEXT' },
    { code: 'phone', name: '手机号', type: 'TEXT' },
    { code: 'email', name: '邮箱', type: 'TEXT' },
    { code: 'orgId', name: '所属组织', type: 'TEXT' },
    { code: 'entryDate', name: '入职日期', type: 'DATE' },
    { code: 'status', name: '状态', type: 'TEXT' },
  ];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const createTabMutation = useMutation({
    mutationFn: (data: any) => request.post('/hr/employee-info-tabs', data),
    onSuccess: () => {
      message.success('页签创建成功');
      queryClient.invalidateQueries({ queryKey: ['employeeInfoTabs'] });
      setIsTabModalOpen(false);
      tabForm.resetFields();
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '创建失败';
      message.error(errorMsg);
    },
  });

  const updateTabMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      request.put(`/hr/employee-info-tabs/${id}`, data),
    onSuccess: () => {
      message.success('页签更新成功');
      queryClient.invalidateQueries({ queryKey: ['employeeInfoTabs'] });
      setIsTabModalOpen(false);
      setEditingTab(null);
      tabForm.resetFields();
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '更新失败';
      message.error(errorMsg);
    },
  });

  const deleteTabMutation = useMutation({
    mutationFn: (id: number) => request.delete(`/hr/employee-info-tabs/${id}`),
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['employeeInfoTabs'] });
      if (selectedTabId === id) {
        setSelectedTabId(null);
      }
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '删除失败';
      message.error(errorMsg);
    },
  });

  const addFieldMutation = useMutation({
    mutationFn: ({ tabId, data }: { tabId: number; data: any }) =>
      request.post(`/hr/employee-info-tabs/${tabId}/fields`, data),
    onSuccess: () => {
      message.success('字段添加成功');
      queryClient.invalidateQueries({ queryKey: ['employeeInfoTabs'] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '添加失败';
      message.error(errorMsg);
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: ({ tabId, fieldId }: { tabId: number; fieldId: number }) =>
      request.delete(`/hr/employee-info-tabs/${tabId}/fields/${fieldId}`),
    onSuccess: () => {
      message.success('字段删除成功');
      queryClient.invalidateQueries({ queryKey: ['employeeInfoTabs'] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '删除失败';
      message.error(errorMsg);
    },
  });

  const updateFieldMutation = useMutation({
    mutationFn: ({ tabId, fieldId, data }: { tabId: number; fieldId: number; data: any }) =>
      request.put(`/hr/employee-info-tabs/${tabId}/fields/${fieldId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeInfoTabs'] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '更新失败';
      message.error(errorMsg);
    },
  });

  const reorderFieldsMutation = useMutation({
    mutationFn: ({ tabId, fields }: { tabId: number; fields: any[] }) =>
      request.put(`/hr/employee-info-tabs/${tabId}/fields/reorder`, { fields }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeInfoTabs'] });
    },
  });

  const handleAddTab = () => {
    setEditingTab(null);
    tabForm.resetFields();
    setIsTabModalOpen(true);
  };

  const handleEditTab = (record: any) => {
    setEditingTab(record);
    tabForm.setFieldsValue(record);
    setIsTabModalOpen(true);
  };

  const handleDeleteTab = (id: number) => {
    deleteTabMutation.mutate(id);
  };

  const handleTabSubmit = async () => {
    try {
      const values = await tabForm.validateFields();
      if (editingTab) {
        updateTabMutation.mutate({ id: editingTab.id, data: values });
      } else {
        createTabMutation.mutate(values);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleAddSystemField = (fieldCode: string) => {
    if (!selectedTabId) {
      message.warning('请先选择一个页签');
      return;
    }

    const field = systemFields.find(f => f.code === fieldCode);
    if (!field) return;

    addFieldMutation.mutate({
      tabId: selectedTabId,
      data: {
        fieldCode: field.code,
        fieldName: field.name,
        fieldType: 'SYSTEM',
        isRequired: false,
        sort: 0,
      },
    });
  };

  const handleAddCustomField = (fieldCode: string) => {
    if (!selectedTabId) {
      message.warning('请先选择一个页签');
      return;
    }

    const field = customFields?.find((f: any) => f.code === fieldCode);
    if (!field) return;

    addFieldMutation.mutate({
      tabId: selectedTabId,
      data: {
        fieldCode: field.code,
        fieldName: field.name,
        fieldType: 'CUSTOM',
        isRequired: false,
        sort: 0,
      },
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const selectedTab = tabs?.find((t: any) => t.id === selectedTabId);
    if (!selectedTab) return;

    const oldIndex = selectedTab.fields.findIndex((f: any) => f.id === active.id);
    const newIndex = selectedTab.fields.findIndex((f: any) => f.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedFields = arrayMove(selectedTab.fields, oldIndex, newIndex);

    // 更新本地状态
    queryClient.setQueryData(['employeeInfoTabs'], (old: any[]) => {
      return old?.map((tab: any) => {
        if (tab.id === selectedTabId) {
          return { ...tab, fields: reorderedFields };
        }
        return tab;
      });
    });

    // 保存到后端
    reorderFieldsMutation.mutate({
      tabId: selectedTabId,
      fields: reorderedFields.map((f: any, index: number) => ({
        id: f.id,
        sort: index,
      })),
    });
  };

  const handleToggleRequired = (fieldId: number) => {
    const selectedTab = tabs?.find((t: any) => t.id === selectedTabId);
    if (!selectedTab) return;

    const field = selectedTab.fields.find((f: any) => f.id === fieldId);
    if (!field) return;

    updateFieldMutation.mutate({
      tabId: selectedTabId,
      fieldId,
      data: {
        ...field,
        isRequired: !field.isRequired,
      },
    });
  };

  const selectedTab = tabs?.find((t: any) => t.id === selectedTabId);

  const tabColumns = [
    { title: '页签编码', dataIndex: 'code', key: 'code', width: 200 },
    { title: '页签名称', dataIndex: 'name', key: 'name', width: 200 },
    {
      title: '类型',
      dataIndex: 'isSystem',
      key: 'isSystem',
      width: 100,
      render: (isSystem: boolean) => (
        <Tag color={isSystem ? 'blue' : 'green'}>
          {isSystem ? '系统内置' : '自定义'}
        </Tag>
      ),
    },
    {
      title: '字段数量',
      dataIndex: 'fields',
      key: 'fields',
      width: 100,
      render: (fields: any[]) => fields?.length || 0,
    },
    {
      title: '排序',
      dataIndex: 'sort',
      key: 'sort',
      width: 80,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: any) => (
        <Space size="small">
          {!record.isSystem && (
            <>
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditTab(record)}
              >
                编辑
              </Button>
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteTab(record.id)}
              >
                删除
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="人事信息配置">
        <Row gutter={16}>
          {/* 左侧：字段库 */}
          <Col span={7}>
            <Card
              size="small"
              title={<><AppstoreOutlined /> 字段库</>}
              style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}
            >
              <Tabs
                defaultActiveKey="system"
                items={[
                  {
                    key: 'system',
                    label: '系统字段',
                    children: (
                      <div style={{ maxHeight: 'calc(100vh - 320px)', overflow: 'auto' }}>
                        {systemFields.map((field) => (
                          <FieldLibraryItem
                            key={field.code}
                            field={field}
                            onAdd={() => handleAddSystemField(field.code)}
                          />
                        ))}
                      </div>
                    ),
                  },
                  {
                    key: 'custom',
                    label: '自定义字段',
                    children: (
                      <div style={{ maxHeight: 'calc(100vh - 320px)', overflow: 'auto' }}>
                        {customFields?.map((field: any) => (
                          <FieldLibraryItem
                            key={field.code}
                            field={field}
                            onAdd={() => handleAddCustomField(field.code)}
                          />
                        ))}
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>

          {/* 右侧：页签配置 */}
          <Col span={17}>
            {/* 页签列表 */}
            <Card
              size="small"
              title="页签列表"
              extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTab}>
                  新增页签
                </Button>
              }
              style={{ marginBottom: 16 }}
            >
              <Table
                columns={tabColumns}
                dataSource={tabs || []}
                rowKey="id"
                loading={isLoading}
                pagination={false}
                size="small"
                onRow={(record) => ({
                  onClick: () => setSelectedTabId(record.id),
                  style: {
                    cursor: 'pointer',
                    background: selectedTabId === record.id ? '#e6f7ff' : 'transparent',
                  },
                })}
              />
            </Card>

            {/* 当前选中页签的字段配置 */}
            {selectedTab && (
              <Card
                size="small"
                title={`配置页签：${selectedTab.name}`}
                style={{ minHeight: 400 }}
              >
                <div style={{ marginBottom: 16, color: '#666' }}>
                  从左侧字段库中点击"添加"按钮，将字段添加到此页签。可拖拽字段卡片调整顺序。
                </div>

                {selectedTab.fields && selectedTab.fields.length > 0 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={selectedTab.fields.map((f: any) => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {selectedTab.fields.map((field: any, index: number) => (
                        <DraggableField
                          key={field.id}
                          field={field}
                          index={index}
                          onToggleRequired={() => handleToggleRequired(field.id)}
                          onRemove={() =>
                            deleteFieldMutation.mutate({
                              tabId: selectedTab.id,
                              fieldId: field.id,
                            })
                          }
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '40px',
                      color: '#999',
                      background: '#fafafa',
                      borderRadius: '4px',
                    }}
                  >
                    暂无字段，请从左侧字段库添加
                  </div>
                )}
              </Card>
            )}
          </Col>
        </Row>
      </Card>

      {/* 页签弹窗 */}
      <Modal
        title={editingTab ? '编辑页签' : '新增页签'}
        open={isTabModalOpen}
        onOk={handleTabSubmit}
        onCancel={() => {
          setIsTabModalOpen(false);
          setEditingTab(null);
          tabForm.resetFields();
        }}
        confirmLoading={createTabMutation.isPending || updateTabMutation.isPending}
        width={600}
      >
        <Form form={tabForm} layout="vertical">
          <Form.Item
            name="code"
            label="页签编码"
            rules={[{ required: true, message: '请输入页签编码' }]}
          >
            <Input placeholder="如：basic_info" disabled={editingTab?.isSystem} />
          </Form.Item>

          <Form.Item
            name="name"
            label="页签名称"
            rules={[{ required: true, message: '请输入页签名称' }]}
          >
            <Input placeholder="如：基本信息" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入描述" rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sort"
                label="排序"
                initialValue={0}
                rules={[{ required: true, message: '请输入排序' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                initialValue="ACTIVE"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select>
                  <Select.Option value="ACTIVE">激活</Select.Option>
                  <Select.Option value="INACTIVE">停用</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default EmployeeInfoConfigPage;
