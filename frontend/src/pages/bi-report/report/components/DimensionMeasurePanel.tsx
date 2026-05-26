import { Card, Typography, Empty, Tag, Space, Select, Button } from 'antd';
import { DeleteOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { useState } from 'react';
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

const { Text, Title } = Typography;

interface Field {
  id: number;
  name: string;
  code: string;
  type: string;
  dataType: string;
  description?: string;
}

interface SortableItemProps {
  id: string;
  field: Field;
  onRemove: () => void;
  aggregation?: string;
  onAggregationChange?: (value: string) => void;
}

function SortableItem({ id, field, onRemove, aggregation, onAggregationChange }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        size="small"
        style={{
          borderLeft: `3px solid ${isDimension ? '#1890ff' : '#52c41a'}`,
        }}
        bodyStyle={{ padding: '8px 12px' }}
      >
        <Space size={12} style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space size={8}>
            <Text strong style={{ fontSize: 13 }}>
              {field.name}
            </Text>
            <Tag color={colorMap[field.dataType] || 'default'} style={{ fontSize: 11 }}>
              {field.dataType}
            </Tag>
            {isDimension && (
              <Tag color="blue" style={{ fontSize: 11 }}>
                维度
              </Tag>
            )}
          </Space>

          <Space size={8}>
            {!isDimension && onAggregationChange && (
              <Select
                size="small"
                value={aggregation}
                onChange={onAggregationChange}
                style={{ width: 80 }}
                onClick={(e) => e.stopPropagation()}
              >
                <Select.Option value="sum">求和</Select.Option>
                <Select.Option value="avg">平均</Select.Option>
                <Select.Option value="count">计数</Select.Option>
                <Select.Option value="max">最大</Select.Option>
                <Select.Option value="min">最小</Select.Option>
              </Select>
            )}

            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              danger
              style={{ fontSize: 12 }}
            >
              移除
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
}

interface DimensionMeasurePanelProps {
  fields: Field[];
  selectedFields: {
    dimensions: string[];
    measures: string[];
  };
  onFieldRemove: (fieldCode: string, fieldType: 'dimensions' | 'measures') => void;
  onFieldReorder: (fieldType: 'dimensions' | 'measures', newFields: string[]) => void;
}

const DimensionMeasurePanel: React.FC<DimensionMeasurePanelProps> = ({
  fields,
  selectedFields,
  onFieldRemove,
  onFieldReorder,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [aggregations, setAggregations] = useState<Record<string, string>>({});

  const handleDragEnd = (event: DragEndEvent, fieldType: 'dimensions' | 'measures') => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = selectedFields[fieldType].indexOf(active.id as string);
      const newIndex = selectedFields[fieldType].indexOf(over.id as string);
      onFieldReorder(fieldType, arrayMove(selectedFields[fieldType], oldIndex, newIndex));
    }
  };

  const handleAggregationChange = (fieldCode: string, value: string) => {
    setAggregations((prev) => ({
      ...prev,
      [fieldCode]: value,
    }));
  };

  const dimensionFields = selectedFields.dimensions
    .map((code) => fields.find((f) => f.code === code))
    .filter(Boolean);

  const measureFields = selectedFields.measures
    .map((code) => fields.find((f) => f.code === code))
    .filter(Boolean);

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {/* 维度区域 */}
      <Card
        title={
          <Space>
            <Title level={5} style={{ margin: 0, color: '#1890ff' }}>
              维度
            </Title>
            <Tag color="blue">{selectedFields.dimensions.length}</Tag>
          </Space>
        }
        size="small"
      >
        {selectedFields.dimensions.length === 0 ? (
          <Empty
            description="拖拽字段到此处"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ margin: '20px 0' }}
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => handleDragEnd(event, 'dimensions')}
          >
            <SortableContext
              items={selectedFields.dimensions}
              strategy={verticalListSortingStrategy}
            >
              {dimensionFields.map((field: any) => (
                <SortableItem
                  key={field.code}
                  id={field.code}
                  field={field}
                  onRemove={() => onFieldRemove(field.code, 'dimensions')}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </Card>

      {/* 度量区域 */}
      <Card
        title={
          <Space>
            <Title level={5} style={{ margin: 0, color: '#52c41a' }}>
              度量
            </Title>
            <Tag color="green">{selectedFields.measures.length}</Tag>
          </Space>
        }
        size="small"
      >
        {selectedFields.measures.length === 0 ? (
          <Empty
            description="拖拽字段到此处"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ margin: '20px 0' }}
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => handleDragEnd(event, 'measures')}
          >
            <SortableContext
              items={selectedFields.measures}
              strategy={verticalListSortingStrategy}
            >
              {measureFields.map((field: any) => (
                <SortableItem
                  key={field.code}
                  id={field.code}
                  field={field}
                  onRemove={() => onFieldRemove(field.code, 'measures')}
                  aggregation={aggregations[field.code] || 'sum'}
                  onAggregationChange={(value) => handleAggregationChange(field.code, value)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </Card>
    </Space>
  );
};

export default DimensionMeasurePanel;
