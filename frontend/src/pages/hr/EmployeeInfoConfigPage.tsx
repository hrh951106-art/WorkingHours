import { useState, useRef } from 'react';
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
  Collapse,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DragOutlined,
  AppstoreOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  MoreOutlined,
  SearchOutlined,
  CheckCircleOutlined,
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
  useDroppable,
  useDraggable,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const { Panel } = Collapse;

// Droppable 区域组件
const DroppableZone: React.FC<{
  id: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ id, children, style }) => {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} style={style}>
      {children}
    </div>
  );
};

// 可拖拽控件卡片组件
interface DraggableControlCardProps {
  id: string;
  type: 'tab' | 'group';
  title: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

const DraggableControlCard: React.FC<DraggableControlCardProps> = ({
  id,
  type,
  title,
  icon,
  description,
  color,
  onDragStart,
  onDragEnd,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useDraggable({
    id,
    onDragStart: () => onDragStart?.(),
    onDragEnd: () => onDragEnd?.(),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    cursor: 'grab',
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
          cursor: 'grab',
          border: `1px dashed ${color}`,
          background: `${color}06`,
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        bodyStyle={{ padding: '12px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Space direction="vertical" size={2} style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '24px', color }}>{icon}</span>
          <span style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>{title}</span>
        </Space>
      </Card>
    </div>
  );
};

// 可拖拽字段项组件
interface DraggableFieldProps {
  field: any;
  index: number;
  onRemove?: () => void;
  onToggleRequired?: () => void;
  onToggleHidden?: () => void;
  onMoveToGroup?: (groupId: number | null) => void;
  availableGroups?: any[];
}

const DraggableField: React.FC<DraggableFieldProps> = ({
  field,
  index,
  onRemove,
  onToggleRequired,
  onToggleHidden,
  onMoveToGroup,
  availableGroups = [],
}) => {
  const isSystemField = field.fieldType === 'SYSTEM';

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={{ ...style, width: 'calc(50% - 4px)', display: 'inline-block', verticalAlign: 'top' }} className="draggable-field">
      <Card
        size="small"
        style={{
          marginBottom: 4,
          border: '1px solid #e2e8f0',
          height: '100%',
        }}
        bodyStyle={{ padding: '8px' }}
      >
        <Row align="middle" gutter={[4, 4]}>
          <Col span={2} {...listeners} {...attributes} style={{ cursor: 'grab', paddingTop: '2px' }}>
            <DragOutlined style={{ color: '#999', fontSize: 11 }} />
          </Col>
          <Col span={10}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <strong style={{ fontSize: 12 }}>
                {field.fieldName || field.name}
              </strong>
              {isSystemField && (
                <Tag color="blue" size="small" style={{ fontSize: 10, padding: '0 3px', lineHeight: '16px' }}>
                  系统
                </Tag>
              )}
            </div>
            <div style={{ fontSize: 10, color: '#999', marginTop: 1 }}>
              {field.fieldCode || field.code}
            </div>
          </Col>
          <Col span={7}>
            <Space size={1}>
              {isSystemField && (
                <>
                  <span style={{ fontSize: 10 }}>显示</span>
                  <Switch
                    size="small"
                    checked={!field.isHidden}
                    onChange={(checked) => {
                      if (onToggleHidden) {
                        onToggleHidden();
                      }
                    }}
                  />
                  <span style={{ fontSize: 10, marginLeft: 4 }}>必填</span>
                  <Switch
                    size="small"
                    checked={field.isRequired}
                    onChange={(checked) => {
                      if (onToggleRequired) {
                        onToggleRequired();
                      }
                    }}
                  />
                </>
              )}
              {!isSystemField && (
                <>
                  <span style={{ fontSize: 10 }}>显示</span>
                  <Switch
                    size="small"
                    checked={!field.isHidden}
                    onChange={(checked) => {
                      if (onToggleHidden) {
                        onToggleHidden();
                      }
                    }}
                  />
                  <span style={{ fontSize: 10, marginLeft: 4 }}>必填</span>
                  <Switch
                    size="small"
                    checked={field.isRequired}
                    onChange={(checked) => {
                      if (onToggleRequired) {
                        onToggleRequired();
                      }
                    }}
                  />
                </>
              )}
            </Space>
          </Col>
          <Col span={5} style={{ textAlign: 'right' }}>
            {!isSystemField && onRemove && (
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => onRemove()}
                style={{ padding: '0 2px', fontSize: 11 }}
              >
                删除
              </Button>
            )}
          </Col>
        </Row>
      </Card>
    </div>
  );
};

// 分组组件
interface FieldGroupProps {
  group: any;
  tabId: number;
  queryClient: any;
  onEdit: () => void;
  onDelete: () => void;
  onToggleCollapsed: () => void;
  onToggleActive: () => void;
  availableFields: any[];
  onFieldRemove: (fieldId: number) => void;
  onFieldToggleRequired: (fieldId: number) => void;
  onFieldToggleHidden: (fieldId: number) => void;
  onFieldMoveToGroup: (fieldId: number, groupId: number | null) => void;
  onFieldDragEnd: (event: DragEndEvent, group: any) => void;
  allGroups: any[];
}

const FieldGroup: React.FC<FieldGroupProps> = ({
  group,
  tabId,
  queryClient,
  onEdit,
  onDelete,
  onToggleCollapsed,
  onToggleActive,
  availableFields,
  onFieldRemove,
  onFieldToggleRequired,
  onFieldToggleHidden,
  onFieldMoveToGroup,
  onFieldDragEnd,
  allGroups,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 移动8像素后才激活拖拽
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <Card
      size="small"
      style={{
        marginBottom: 16,
        border: '1px solid #e2e8f0',
        opacity: group.status === 'ACTIVE' ? 1 : 0.6,
        backgroundColor: group.status === 'ACTIVE' ? '#fff' : '#f5f5f5',
        position: 'relative',
        zIndex: 10,
      }}
      title={
        <Row align="middle" justify="space-between">
          <Space>
            {group.collapsed ? <FolderOutlined /> : <FolderOpenOutlined />}
            <strong>{group.name}</strong>
            <Tag color="default">{group.fields?.length || 0} 个字段</Tag>
            <span style={{ fontSize: 11, color: '#999' }} onClick={(e) => e.stopPropagation()}>
              启用:
              <Switch
                size="small"
                checked={group.status === 'ACTIVE'}
                onChange={(checked) => {
                  onToggleActive();
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ marginLeft: 4 }}
              />
            </span>
          </Space>
          <Space size="small">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={onEdit}>
              编辑
            </Button>
            {!group.isSystem && (
              <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={onDelete}>
                删除
              </Button>
            )}
            <Button type="text" size="small" onClick={onToggleCollapsed}>
              {group.collapsed ? '展开' : '折叠'}
            </Button>
          </Space>
        </Row>
      }
    >
      {!group.collapsed && (
        <div style={{ position: 'relative' }}>
          <DroppableZone
            id={`group-drop-zone-${group.id}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />
          {group.fields && group.fields.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => onFieldDragEnd(event, group)}
            >
              <SortableContext
                items={group.fields.map((f: any) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '0 -4px', position: 'relative', zIndex: 2, pointerEvents: 'auto' }}>
                  {group.fields.map((field: any, index: number) => (
                    <DraggableField
                      key={field.id}
                      field={field}
                      index={index}
                      onToggleRequired={() => onFieldToggleRequired(field.id)}
                      onToggleHidden={() => onFieldToggleHidden(field.id)}
                      onRemove={() => onFieldRemove(field.id)}
                      onMoveToGroup={(groupId) => onFieldMoveToGroup(field.id, groupId)}
                      availableGroups={allGroups.filter((g: any) => g.id !== group.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '20px',
                color: '#94a3b8',
                background: '#f8fafc',
                borderRadius: '6px',
                border: '1px dashed #cbd5e1',
                position: 'relative',
                zIndex: 2,
                pointerEvents: 'auto',
              }}
            >
              暂无字段，从左侧拖拽自定义字段到此处
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

// 字段库中的字段项（可拖拽）
const FieldLibraryItem: React.FC<{
  field: any;
  isAdded?: boolean;
}> = ({ field, isAdded = false }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useDraggable({
    id: `custom-${field.code}`,
    data: {
      type: 'custom-field',
      fieldCode: field.code,
    },
    disabled: isAdded,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : isAdded ? 0.5 : 1,
  };

  if (isAdded) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
      >
        <Card
          size="small"
          style={{
            marginBottom: 8,
            border: '1px solid #e2e8f0',
            backgroundColor: '#f5f5f5',
          }}
          bodyStyle={{ padding: '12px' }}
        >
          <Row align="middle" gutter={16}>
            <Col span={2} style={{ padding: '4px 0' }}>
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />
            </Col>
            <Col span={14}>
              <strong style={{ fontSize: 13, color: '#999' }}>{field.name}</strong>
              <div style={{ fontSize: 11, color: '#bbb' }}>
                {field.code}
              </div>
            </Col>
            <Col span={8}>
              <Tag color="default" style={{ fontSize: 11 }}>
                已添加
              </Tag>
            </Col>
          </Row>
        </Card>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        size="small"
        style={{
          marginBottom: 8,
          border: '1px solid #e2e8f0',
        }}
        bodyStyle={{ padding: '12px' }}
      >
        <Row align="middle" gutter={16}>
          <Col span={2} {...listeners} style={{ cursor: 'grab', padding: '4px 0' }}>
            <DragOutlined style={{ color: '#999', fontSize: 12 }} />
          </Col>
          <Col span={14}>
            <strong style={{ fontSize: 13 }}>{field.name}</strong>
            <div style={{ fontSize: 11, color: '#999' }}>
              {field.code}
            </div>
          </Col>
          <Col span={8}>
            <Tag color={field.type === 'TEXT' ? 'blue' : 'green'}>
              {customFieldTypes[field.type] || field.type}
            </Tag>
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
};

const EmployeeInfoConfigPage: React.FC = () => {
  const [isTabModalOpen, setIsTabModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingTab, setEditingTab] = useState<any>(null);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [selectedTabId, setSelectedTabId] = useState<number | null>(null);
  const [customFieldSearch, setCustomFieldSearch] = useState('');
  const [tabForm] = Form.useForm();
  const [groupForm] = Form.useForm();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  // 拖拽传感器 - 增加激活距离，避免误触
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 移动8像素后才激活拖拽
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 处理拖拽开始
  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  // 获取拖拽预览数据（作为函数以避免初始化顺序问题）
  const getDragPreview = () => {
    if (!activeId) return null;

    if (activeId === 'control-tab') {
      return { title: '页签', icon: <AppstoreOutlined />, color: '#1890ff' };
    }

    if (activeId === 'control-group') {
      return { title: '分组', icon: <FolderOutlined />, color: '#52c41a' };
    }

    if (activeId.toString().startsWith('custom-')) {
      const fieldCode = activeId.toString().replace('custom-', '');
      const field = userCustomFields.find((f: any) => f.code === fieldCode);
      if (field) {
        return {
          title: field.name,
          icon: <DragOutlined />,
          color: '#1890ff',
          isField: true,
        };
      }
    }

    return null;
  };

  // 处理拖拽放置
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    console.log('拖拽结束 - active:', active.id, 'over:', over?.id);

    setActiveId(null);

    if (!over) {
      console.log('没有拖拽到任何区域');
      return;
    }

    const draggedId = active.id.toString();
    const dropZone = over.id.toString();

    console.log('Drag end:', { draggedId, dropZone }); // 调试日志

    if (draggedId === 'control-tab' && dropZone === 'tabs-drop-zone') {
      // 拖拽页签到页签区域
      console.log('触发新增页签');
      handleAddTab();
    } else if (draggedId === 'control-group' && dropZone === 'tab-content-drop-zone') {
      // 拖拽分组到页签内容区域
      if (!selectedTabId) {
        message.warning('请先选择一个页签');
        return;
      }
      console.log('触发新增分组');
      handleAddGroup();
    } else if (draggedId.startsWith('custom-') && dropZone.startsWith('group-drop-zone-')) {
      // 拖拽自定义字段到分组
      const fieldCode = draggedId.replace('custom-', '');
      const groupId = parseInt(dropZone.replace('group-drop-zone-', ''));

      console.log('拖拽自定义字段到分组:', { fieldCode, groupId });

      const field = userCustomFields.find((f: any) => f.code === fieldCode);
      if (!field) {
        message.error('字段不存在');
        return;
      }

      // 添加字段到分组
      addFieldMutation.mutate({
        tabId: selectedTabId!,
        data: {
          fieldCode: field.code,
          fieldName: field.name,
          fieldType: 'CUSTOM',
          isRequired: false,
          sort: 0,
          groupId: groupId,
        },
      });
    } else {
      console.log('拖拽不匹配:', { draggedId, dropZone });
    }
  };

  const { data: tabs, isLoading } = useQuery({
    queryKey: ['employeeInfoTabs'],
    queryFn: () => request.get('/hr/employee-info-tabs').then((res: any) => res || []),
    staleTime: 0, // 覆盖全局配置，确保每次都获取最新数据
    refetchOnWindowFocus: true, // 窗口聚焦时重新获取数据
  });

  const { data: customFields } = useQuery({
    queryKey: ['customFields'],
    queryFn: () => request.get('/hr/custom-fields').then((res: any) => res || []),
  });

  // 过滤掉系统自定义字段，只显示用户创建的自定义字段，并支持搜索
  const userCustomFields = customFields
    ?.filter((f: any) => !f.isSystem)
    .filter((f: any) => {
      if (!customFieldSearch) return true;
      const searchLower = customFieldSearch.toLowerCase();
      return (
        f.name?.toLowerCase().includes(searchLower) ||
        f.code?.toLowerCase().includes(searchLower)
      );
    }) || [];

  // 获取当前选中页签中已存在的自定义字段代码
  const selectedTab = tabs?.find((t: any) => t.id === selectedTabId);
  const existingFieldCodes = new Set(
    selectedTab?.groups?.flatMap((g: any) =>
      g.fields?.filter((f: any) => f.fieldType === 'CUSTOM').map((f: any) => f.fieldCode)
    ) || []
  );

  // 控件操作
  const handleAddTab = () => {
    setEditingTab(null);
    tabForm.resetFields();
    setIsTabModalOpen(true);
  };

  const handleEditTab = (tab: any) => {
    setEditingTab(tab);
    tabForm.setFieldsValue(tab);
    setIsTabModalOpen(true);
  };

  const handleDeleteTab = (tabId: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个页签吗？',
      onOk: () => {
        deleteTabMutation.mutate(tabId);
      },
    });
  };

  const handleAddGroup = () => {
    if (!selectedTabId) {
      message.warning('请先选择一个页签');
      return;
    }
    setEditingGroup(null);
    groupForm.resetFields();
    setIsGroupModalOpen(true);
  };

  const handleEditGroup = (group: any) => {
    setEditingGroup(group);
    groupForm.setFieldsValue(group);
    setIsGroupModalOpen(true);
  };

  const handleDeleteGroup = (groupId: number) => {
    deleteGroupMutation.mutate(groupId);
  };

  const handleToggleGroupCollapsed = (groupId: number) => {
    toggleGroupCollapsedMutation.mutate(groupId);
  };

  const handleToggleGroupActive = (groupId: number) => {
    toggleGroupActiveMutation.mutate(groupId);
  };

  const handleGroupSubmit = async () => {
    try {
      const values = await groupForm.validateFields();
      if (editingGroup) {
        updateGroupMutation.mutate({
          groupId: editingGroup.id,
          data: values,
        });
      } else {
        createGroupMutation.mutate({
          tabId: selectedTabId!,
          data: values,
        });
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 处理分组内字段拖拽（排序）
  const handleFieldDragEnd = (event: DragEndEvent, group: any) => {
    const { active, over } = event;

    console.log('[FieldGroup handleDragEnd] active:', active.id, 'over:', over?.id);

    if (!over || active.id === over.id) {
      console.log('[FieldGroup handleDragEnd] No change or no over, returning');
      return;
    }

    const oldIndex = group.fields.findIndex((f: any) => f.id === active.id);
    const newIndex = group.fields.findIndex((f: any) => f.id === over.id);

    console.log('[FieldGroup handleDragEnd] oldIndex:', oldIndex, 'newIndex:', newIndex);

    if (oldIndex === -1 || newIndex === -1) {
      console.log('[FieldGroup handleDragEnd] Invalid index, returning');
      return;
    }

    // 重新排序字段并调用API
    const reorderedFields = arrayMove(group.fields, oldIndex, newIndex).map((field, index) => ({
      id: field.id,
      sort: index,
    }));

    console.log('[FieldGroup handleDragEnd] Calling reorder API with:', reorderedFields.length, 'fields');

    // 调用重新排序API
    request.put(`/hr/employee-info-tabs/${selectedTabId}/fields/reorder`, {
      fields: reorderedFields,
    }).then(() => {
      console.log('[FieldGroup handleDragEnd] Reorder success');
      queryClient.invalidateQueries({ queryKey: ['employeeInfoTabs'] });
    }).catch((error) => {
      console.error('[FieldGroup handleDragEnd] Reorder failed:', error);
      message.error('重新排序失败');
    });
  };

  // Mutations
  const createTabMutation = useMutation({
    mutationFn: (data: any) => {
      // 计算最大的sort值，新页签排在最后
      const maxSort = tabs && tabs.length > 0 ? Math.max(...tabs.map((t: any) => t.sort || 0)) : 0;
      return request.post('/hr/employee-info-tabs', { ...data, sort: maxSort + 1 });
    },
    onSuccess: (response: any) => {
      message.success('页签创建成功');
      queryClient.invalidateQueries({ queryKey: ['employeeInfoTabs'] });
      setIsTabModalOpen(false);
      tabForm.resetFields();
      // 自动选中新创建的页签
      if (response?.id) {
        setSelectedTabId(response.id);
      }
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
    onSuccess: (_, variables) => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['employeeInfoTabs'] });
      if (selectedTabId === variables) {
        // 找到删除的页签在列表中的位置
        const tabIndex = tabs?.findIndex((t: any) => t.id === variables);
        if (tabIndex && tabs && tabs.length > 0) {
          // 优先选中前一个页签，如果删除的是第一个，则选中后一个
          const newSelectedTab = tabs[tabIndex - 1] || tabs[tabIndex + 1] || tabs[0];
          if (newSelectedTab) {
            setSelectedTabId(newSelectedTab.id);
          }
        }
      }
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '删除失败';
      message.error(errorMsg);
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: ({ tabId, data }: { tabId: number; data: any }) => {
      // 获取当前选中的页签
      const currentTab = tabs?.find((t: any) => t.id === tabId);
      // 计算当前页签下最大的分组sort值，新分组排在最后
      const maxSort = currentTab?.groups && currentTab.groups.length > 0
        ? Math.max(...currentTab.groups.map((g: any) => g.sort || 0))
        : 0;
      return request.post(`/hr/employee-info-tabs/${tabId}/groups`, { ...data, sort: maxSort + 1 });
    },
    onSuccess: () => {
      message.success('分组创建成功');
      queryClient.invalidateQueries({ queryKey: ['employeeInfoTabs'] });
      setIsGroupModalOpen(false);
      groupForm.resetFields();
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '创建失败';
      message.error(errorMsg);
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ groupId, data }: { groupId: number; data: any }) =>
      request.put(`/hr/employee-info-tabs/groups/${groupId}`, data),
    onSuccess: () => {
      message.success('分组更新成功');
      queryClient.invalidateQueries({ queryKey: ['employeeInfoTabs'] });
      setIsGroupModalOpen(false);
      setEditingGroup(null);
      groupForm.resetFields();
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '更新失败';
      message.error(errorMsg);
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: number) =>
      request.delete(`/hr/employee-info-tabs/groups/${groupId}`),
    onSuccess: () => {
      message.success('分组删除成功');
      queryClient.invalidateQueries({ queryKey: ['employeeInfoTabs'] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || '删除失败';
      message.error(errorMsg);
    },
  });

  const toggleGroupCollapsedMutation = useMutation({
    mutationFn: (groupId: number) =>
      request.put(`/hr/employee-info-tabs/groups/${groupId}/toggle-collapsed`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeInfoTabs'] });
    },
  });

  const toggleGroupActiveMutation = useMutation({
    mutationFn: (groupId: number) => {
      // 获取当前分组状态
      const group = tabs?.find((t: any) => t.id === selectedTabId)
        ?.groups?.find((g: any) => g.id === groupId);
      const newStatus = group?.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      console.log('[toggleGroupActive] Toggling group', groupId, 'to status:', newStatus);
      return request.put(`/hr/employee-info-tabs/groups/${groupId}`, { status: newStatus });
    },
    onSuccess: (_, groupId) => {
      console.log('[toggleGroupActive] Successfully toggled group', groupId);
      message.success('分组状态更新成功');
      queryClient.invalidateQueries({ queryKey: ['employeeInfoTabs'] });
    },
    onError: (error: any) => {
      console.error('[toggleGroupActive] Failed to toggle group:', error);
      const errorMsg = error?.response?.data?.message || error?.message || '更新分组状态失败';
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
    mutationFn: ({ tabId, fieldId, data }: { tabId: number; fieldId: number; data: any }) => {
      console.log('[updateField] Updating field:', fieldId, 'with data:', data);
      return request.put(`/hr/employee-info-tabs/${tabId}/fields/${fieldId}`, data);
    },
    onSuccess: (_, variables) => {
      console.log('[updateField] Successfully updated field:', variables.fieldId);
      message.success('字段更新成功');
      queryClient.invalidateQueries({ queryKey: ['employeeInfoTabs'] });
    },
    onError: (error: any) => {
      console.error('[updateField] Failed to update field:', error);
      const errorMsg = error?.response?.data?.message || error?.message || '更新失败';
      message.error(errorMsg);
    },
  });

  const moveFieldToGroupMutation = useMutation({
    mutationFn: ({ fieldId, groupId }: { fieldId: number; groupId: number | null }) =>
      request.put(`/hr/employee-info-tabs/fields/${fieldId}/move-to-group`, { groupId }),
    onSuccess: () => {
      message.success('字段移动成功');
      queryClient.invalidateQueries({ queryKey: ['employeeInfoTabs'] });
    },
  });

  const reorderFieldsMutation = useMutation({
    mutationFn: ({ tabId, fields }: { tabId: number; fields: any[] }) =>
      request.put(`/hr/employee-info-tabs/${tabId}/fields/reorder`, { fields }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeInfoTabs'] });
    },
  });

  return (
    <DndContext
      sensors={useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
          coordinateGetter: sortableKeyboardCoordinates,
        })
      )}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Card
        title="人事信息配置"
        extra={
          <Space>
            <span style={{ fontSize: 12, color: '#999' }}>
              提示：拖拽控件卡片到相应区域可快速创建
            </span>
          </Space>
        }
      >
        <Row gutter={16}>
          {/* 左侧：控件库和字段库 */}
          <Col span={6}>
            {/* 控件库 */}
            <Card
              size="small"
              style={{ marginBottom: 16 }}
              title={<><AppstoreOutlined /> 控件库</>}
              bodyStyle={{ padding: '12px' }}
            >
              <Row gutter={8}>
                <Col span={12}>
                  <DraggableControlCard
                    id="control-tab"
                    type="tab"
                    title="页签"
                    icon={<AppstoreOutlined />}
                    description="拖拽到右侧页签区域创建新页签"
                    color="#1890ff"
                    onDragStart={() => setActiveId('control-tab')}
                    onDragEnd={() => setActiveId(null)}
                  />
                </Col>
                <Col span={12}>
                  <DraggableControlCard
                    id="control-group"
                    type="group"
                    title="分组"
                    icon={<FolderOutlined />}
                    description="拖拽到右侧页签内容区域创建新分组"
                    color="#52c41a"
                    onDragStart={() => setActiveId('control-group')}
                    onDragEnd={() => setActiveId(null)}
                  />
                </Col>
              </Row>
            </Card>

            {/* 自定义字段 */}
            <Card
              size="small"
              title={<><AppstoreOutlined /> 自定义字段</>}
              style={{ height: 'calc(100vh - 340px)', overflow: 'visible' }}
              bodyStyle={{ overflow: 'visible' }}
            >
              <Input
                placeholder="搜索自定义字段"
                prefix={<SearchOutlined />}
                value={customFieldSearch}
                onChange={(e) => setCustomFieldSearch(e.target.value)}
                style={{ marginBottom: 12 }}
                allowClear
              />
              <div style={{ maxHeight: 'calc(100vh - 470px)', overflowY: 'auto', overflowX: 'visible' }}>
                {userCustomFields.length > 0 ? (
                  userCustomFields.map((field: any) => (
                    <FieldLibraryItem
                      key={field.code}
                      field={field}
                      isAdded={existingFieldCodes.has(field.code)}
                    />
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                    {customFieldSearch ? '未找到匹配的自定义字段' : '暂无自定义字段，请前往自定义字段配置页面创建'}
                  </div>
                )}
              </div>
            </Card>
          </Col>

          {/* 右侧：页签和配置 */}
          <Col span={18}>
            {/* 横向页签 - 只有Tab条是页签拖放区域 */}
            <div style={{ marginBottom: 16, position: 'relative', overflow: 'visible' }}>
              <DroppableZone
                id="tabs-drop-zone"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '46px',
                  zIndex: 5,
                  pointerEvents: 'none',
                }}
              />
              <div style={{ position: 'relative', zIndex: 10, pointerEvents: 'auto' }}>
                <Tabs
                  activeKey={selectedTabId?.toString() || ''}
                  onChange={(key) => setSelectedTabId(Number(key))}
                  items={(tabs || []).map((tab: any) => {
                    // 创建一个可点击的标签元素
                    const labelElement = (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span>{tab.name}</span>
                        <EditOutlined
                          style={{ fontSize: 12, opacity: 0.6, cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTab(tab);
                          }}
                        />
                        {!tab.isSystem && (
                          <DeleteOutlined
                            style={{ fontSize: 12, opacity: 0.6, cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTab(tab.id);
                            }}
                          />
                        )}
                      </span>
                    );

                    return {
                      key: tab.id.toString(),
                      label: labelElement,
                    };
                  })}
                />
              </div>
            </div>

            {/* 当前选中页签的配置 - 整个区域是分组拖放区域 */}
            {selectedTab ? (
              <div style={{ height: 'calc(100vh - 340px)', overflow: 'auto' }}>
                <Card
                  size="small"
                  title={`${selectedTab.name} - 配置`}
                  extra={
                    <Space>
                      <span style={{ fontSize: 12, color: '#999' }}>
                        可拖拽"分组"控件到此处
                      </span>
                    </Space>
                  }
                  style={{ height: '100%' }}
                  bodyStyle={{ height: 'calc(100% - 57px)', overflow: 'auto', padding: 0, position: 'relative' }}
                >
                  <DroppableZone
                    id="tab-content-drop-zone"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '40%',
                      zIndex: 0,
                      border: '2px dashed transparent',
                      transition: 'all 0.2s',
                      borderRadius: '8px',
                      pointerEvents: 'none',
                    }}
                  />
                  {/* 拖放提示区域 */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      right: 12,
                      height: '60px',
                      background: 'rgba(34, 185, 112, 0.05)',
                      border: '2px dashed rgba(34, 185, 112, 0.3)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(34, 185, 112, 0.6)',
                      fontSize: '13px',
                      zIndex: 0,
                      pointerEvents: 'none',
                    }}
                  >
                    📥 拖拽"分组"控件到此处创建分组
                  </div>
                  <div style={{ padding: '24px', position: 'relative', zIndex: 1, paddingTop: '84px' }}>
                  {selectedTab.groups && selectedTab.groups.length > 0 ? (
                    <>
                      {selectedTab.groups
                        .map((group: any) => (
                        <FieldGroup
                          key={group.id}
                          group={group}
                          tabId={selectedTab.id}
                          queryClient={queryClient}
                          onEdit={() => handleEditGroup(group)}
                          onDelete={() => handleDeleteGroup(group.id)}
                          onToggleCollapsed={() => handleToggleGroupCollapsed(group.id)}
                          onToggleActive={() => handleToggleGroupActive(group.id)}
                          onFieldDragEnd={handleFieldDragEnd}
                          availableFields={[]}
                          onFieldRemove={(fieldId) =>
                            deleteFieldMutation.mutate({
                              tabId: selectedTab.id,
                              fieldId,
                            })
                          }
                          onFieldToggleRequired={(fieldId) => {
                            const field = group.fields.find((f: any) => f.id === fieldId);
                            if (!field) return;
                            updateFieldMutation.mutate({
                              tabId: selectedTab.id,
                              fieldId,
                              data: {
                                ...field,
                                isRequired: !field.isRequired,
                              },
                            });
                          }}
                          onFieldToggleHidden={(fieldId) => {
                            const field = group.fields.find((f: any) => f.id === fieldId);
                            if (!field) return;
                            updateFieldMutation.mutate({
                              tabId: selectedTab.id,
                              fieldId,
                              data: {
                                ...field,
                                isHidden: !field.isHidden,
                              },
                            });
                          }}
                          onFieldMoveToGroup={(fieldId, groupId) =>
                            moveFieldToGroupMutation.mutate({ fieldId, groupId })
                          }
                          allGroups={selectedTab.groups}
                        />
                      ))}
                    </>
                  ) : null}

                  {(!selectedTab.groups || selectedTab.groups.length === 0) && (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '60px 40px',
                        color: '#94a3b8',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px dashed #cbd5e1'
                      }}
                    >
                      <AppstoreOutlined style={{ fontSize: '48px', marginBottom: '16px', color: '#cbd5e1' }} />
                      <div style={{ fontSize: '14px', marginBottom: '8px' }}>暂无内容</div>
                      <div style={{ fontSize: '12px' }}>
                        拖拽"分组"控件到此处创建分组，或从左侧字段库添加字段到此页签
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
            ) : (
              <div style={{ height: 'calc(100vh - 340px)' }}>
                <Card
                  style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                    <AppstoreOutlined style={{ fontSize: '64px', marginBottom: '24px', color: '#cbd5e1' }} />
                    <div style={{ fontSize: '16px', marginBottom: '8px' }}>请选择一个页签</div>
                    <div style={{ fontSize: '12px' }}>从上方页签中选择，或拖拽"页签"控件到页签区域</div>
                  </div>
                </Card>
              </div>
            )}
          </Col>
        </Row>
      </Card>

      {/* 页签弹窗 */}
      <Modal
        title={editingTab ? '编辑页签' : '新增页签'}
        open={isTabModalOpen}
        onOk={() => tabForm.submit()}
        onCancel={() => {
          setIsTabModalOpen(false);
          setEditingTab(null);
          tabForm.resetFields();
        }}
        confirmLoading={createTabMutation.isPending || updateTabMutation.isPending}
        width={600}
      >
        <Form form={tabForm} layout="vertical" onFinish={(values) => {
          if (editingTab) {
            updateTabMutation.mutate({ id: editingTab.id, data: values });
          } else {
            createTabMutation.mutate(values);
          }
        }}>
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

      {/* 分组弹窗 */}
      <Modal
        title={editingGroup ? '编辑分组' : '新增分组'}
        open={isGroupModalOpen}
        onOk={() => groupForm.submit()}
        onCancel={() => {
          setIsGroupModalOpen(false);
          setEditingGroup(null);
          groupForm.resetFields();
        }}
        confirmLoading={createGroupMutation.isPending || updateGroupMutation.isPending}
        width={600}
      >
        <Form form={groupForm} layout="vertical" onFinish={(values) => {
          if (editingGroup) {
            updateGroupMutation.mutate({ groupId: editingGroup.id, data: values });
          } else {
            createGroupMutation.mutate({
              tabId: selectedTabId!,
              data: values,
            });
          }
        }}>
          <Form.Item
            name="code"
            label="分组编码"
            rules={[{ required: true, message: '请输入分组编码' }]}
          >
            <Input placeholder="如：basic_info" />
          </Form.Item>

          <Form.Item
            name="name"
            label="分组名称"
            rules={[{ required: true, message: '请输入分组名称' }]}
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

      {/* 拖拽预览 */}
      <DragOverlay>
        {(() => {
          const dragPreview = getDragPreview();
          if (!activeId || !dragPreview) return null;

          return dragPreview.isField ? (
            // 自定义字段的紧凑预览
            <div
              style={{
                padding: '8px 12px',
                background: '#fff',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                border: `1px solid ${dragPreview.color}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '200px',
              }}
            >
              <span style={{ fontSize: '14px', color: dragPreview.color }}>
                {dragPreview.icon}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>
                {dragPreview.title}
              </span>
            </div>
          ) : (
            // 控件库的预览
            <div
              style={{
                padding: '8px 16px',
                background: '#fff',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                border: `2px solid ${dragPreview.color}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '20px', color: dragPreview.color }}>
                {dragPreview.icon}
              </span>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>
                {dragPreview.title}
              </span>
            </div>
          );
        })()}
      </DragOverlay>
    </DndContext>
  );
};

export default EmployeeInfoConfigPage;
