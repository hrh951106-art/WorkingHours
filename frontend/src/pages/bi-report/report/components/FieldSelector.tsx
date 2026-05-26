import { Card, Typography, Input, Space, Tag, Empty, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useState, useMemo } from 'react';
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
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const { Text, Title } = Typography;
const { Search } = Input;

interface Field {
  id: number;
  name: string;
  code: string;
  type: string;
  dataType: string;
  description?: string;
}

interface SortableFieldProps {
  field: Field;
  onClick: (fieldCode: string, fieldType: string) => void;
}

function SortableField({ field, onClick }: SortableFieldProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.code,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
    marginBottom: 8,
  };

  const isDimension = field.type === 'dimension';
  const colorMap: Record<string, string> = {
    string: 'blue',
    number: 'green',
    date: 'orange',
    boolean: 'purple',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(field.code, isDimension ? 'dimensions' : 'measures')}
    >
      <Card
        size="small"
        hoverable
        style={{
          borderLeft: `3px solid ${isDimension ? '#1890ff' : '#52c41a'}`,
        }}
        bodyStyle={{ padding: '8px 12px' }}
      >
        <Space size={8} style={{ width: '100%', justifyContent: 'space-between' }}>
          <div>
            <div>
              <Text strong style={{ fontSize: 13 }}>
                {field.name}
              </Text>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {field.code}
            </Text>
          </div>
          <Space size={4}>
            <Tag color={colorMap[field.dataType] || 'default'} style={{ fontSize: 11 }}>
              {field.dataType}
            </Tag>
            <Tag color={isDimension ? 'blue' : 'green'} style={{ fontSize: 11 }}>
              {isDimension ? '维度' : '度量'}
            </Tag>
          </Space>
        </Space>
        {field.description && (
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {field.description}
            </Text>
          </div>
        )}
      </Card>
    </div>
  );
}

interface FieldSelectorProps {
  fields: Field[];
  selectedFields: {
    dimensions: string[];
    measures: string[];
  };
  onFieldSelect: (fieldCode: string, fieldType: 'dimensions' | 'measures') => void;
}

const FieldSelector: React.FC<FieldSelectorProps> = ({ fields, selectedFields, onFieldSelect }) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'dimension' | 'measure'>('all');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredFields = useMemo(() => {
    let result = fields;

    if (searchKeyword) {
      result = result.filter(
        (field) =>
          field.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          field.code.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }

    if (activeTab === 'dimension') {
      result = result.filter((field) => field.type === 'dimension');
    } else if (activeTab === 'measure') {
      result = result.filter((field) => field.type === 'measure');
    }

    return result;
  }, [fields, searchKeyword, activeTab]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      // Handle drag end if needed
    }
  };

  const isFieldSelected = (fieldCode: string) => {
    return (
      selectedFields.dimensions.includes(fieldCode) ||
      selectedFields.measures.includes(fieldCode)
    );
  };

  return (
    <Card
      title="字段列表"
      size="small"
      style={{ height: 'calc(100vh - 280px)', overflow: 'auto' }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <Search
          placeholder="搜索字段"
          allowClear
          size="small"
          prefix={<SearchOutlined />}
          onChange={(e) => setSearchKeyword(e.target.value)}
          value={searchKeyword}
        />

        <Space size="small" style={{ width: '100%' }}>
          <Tag.CheckableTag
            checked={activeTab === 'all'}
            onChange={(checked) => setActiveTab(checked ? 'all' : 'all')}
            style={{ fontSize: 12 }}
          >
            全部 ({fields.length})
          </Tag.CheckableTag>
          <Tag.CheckableTag
            checked={activeTab === 'dimension'}
            onChange={(checked) => setActiveTab(checked ? 'dimension' : 'all')}
            style={{ fontSize: 12 }}
          >
            维度 ({fields.filter((f) => f.type === 'dimension').length})
          </Tag.CheckableTag>
          <Tag.CheckableTag
            checked={activeTab === 'measure'}
            onChange={(checked) => setActiveTab(checked ? 'measure' : 'all')}
            style={{ fontSize: 12 }}
          >
            度量 ({fields.filter((f) => f.type === 'measure').length})
          </Tag.CheckableTag>
        </Space>

        <div style={{ height: 'calc(100% - 80px)', overflowY: 'auto', marginTop: 8 }}>
          {filteredFields.length === 0 ? (
            <Empty
              description={searchKeyword ? '未找到匹配的字段' : '暂无字段'}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ marginTop: 40 }}
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredFields.map((f) => f.code)}
                strategy={verticalListSortingStrategy}
              >
                {filteredFields.map((field) => (
                  <SortableField
                    key={field.code}
                    field={field}
                    onClick={onFieldSelect}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </Space>
    </Card>
  );
};

export default FieldSelector;
