import { Card, Typography, Button, Space, Select, Input, DatePicker, InputNumber } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState } from 'react';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

interface Field {
  id: number;
  name: string;
  code: string;
  type: string;
  dataType: string;
  description?: string;
}

interface Filter {
  id: string;
  field: string;
  operator: string;
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

interface FilterConfigPanelProps {
  fields: Field[];
  filters: Filter[];
  onFiltersChange: (filters: Filter[]) => void;
}

const FilterConfigPanel: React.FC<FilterConfigPanelProps> = ({
  fields,
  filters,
  onFiltersChange,
}) => {
  const [nextId, setNextId] = useState(1);

  // 根据字段类型获取可用的操作符
  const getOperatorsForFieldType = (dataType: string) => {
    const operatorMap: Record<string, Array<{ value: string; label: string }>> = {
      string: [
        { value: 'eq', label: '等于' },
        { value: 'ne', label: '不等于' },
        { value: 'contains', label: '包含' },
        { value: 'startsWith', label: '开始于' },
        { value: 'endsWith', label: '结束于' },
        { value: 'in', label: '在列表中' },
        { value: 'notIn', label: '不在列表中' },
      ],
      number: [
        { value: 'eq', label: '等于' },
        { value: 'ne', label: '不等于' },
        { value: 'gt', label: '大于' },
        { value: 'gte', label: '大于等于' },
        { value: 'lt', label: '小于' },
        { value: 'lte', label: '小于等于' },
        { value: 'in', label: '在列表中' },
        { value: 'notIn', label: '不在列表中' },
      ],
      date: [
        { value: 'eq', label: '等于' },
        { value: 'ne', label: '不等于' },
        { value: 'gt', label: '之后' },
        { value: 'gte', label: '不早于' },
        { value: 'lt', label: '之前' },
        { value: 'lte', label: '不晚于' },
        { value: 'between', label: '介于' },
      ],
      boolean: [
        { value: 'eq', label: '等于' },
        { value: 'ne', label: '不等于' },
      ],
    };

    return operatorMap[dataType] || operatorMap.string;
  };

  // 添加过滤条件
  const handleAddFilter = () => {
    const newFilter: Filter = {
      id: `filter-${nextId}`,
      field: '',
      operator: 'eq',
      value: undefined,
      logicalOperator: filters.length > 0 ? 'AND' : undefined,
    };
    setNextId(nextId + 1);
    onFiltersChange([...filters, newFilter]);
  };

  // 删除过滤条件
  const handleRemoveFilter = (filterId: string) => {
    onFiltersChange(filters.filter((f) => f.id !== filterId));
  };

  // 更新过滤条件
  const handleUpdateFilter = (filterId: string, updates: Partial<Filter>) => {
    onFiltersChange(
      filters.map((f) => (f.id === filterId ? { ...f, ...updates } : f))
    );
  };

  // 渲染值输入控件
  const renderValueInput = (filter: Filter) => {
    const field = fields.find((f) => f.code === filter.field);
    if (!field) return null;

    const operators = getOperatorsForFieldType(field.dataType);

    switch (field.dataType) {
      case 'string':
        if (filter.operator === 'in' || filter.operator === 'notIn') {
          return (
            <Select
              mode="tags"
              size="small"
              placeholder="输入值（支持多个）"
              value={filter.value}
              onChange={(value) => handleUpdateFilter(filter.id, { value })}
              style={{ width: '100%' }}
            />
          );
        }
        return (
          <Input
            size="small"
            placeholder="输入值"
            value={filter.value}
            onChange={(e) => handleUpdateFilter(filter.id, { value: e.target.value })}
          />
        );

      case 'number':
        if (filter.operator === 'in' || filter.operator === 'notIn') {
          return (
            <Select
              mode="tags"
              size="small"
              placeholder="输入数值（支持多个）"
              value={filter.value}
              onChange={(value) =>
                handleUpdateFilter(filter.id, { value: value.map(Number) })
              }
              style={{ width: '100%' }}
            />
          );
        }
        return (
          <InputNumber
            size="small"
            placeholder="输入数值"
            value={filter.value}
            onChange={(value) => handleUpdateFilter(filter.id, { value })}
            style={{ width: '100%' }}
          />
        );

      case 'date':
        if (filter.operator === 'between') {
          return (
            <DatePicker.RangePicker
              size="small"
              value={filter.value}
              onChange={(dates) =>
                handleUpdateFilter(filter.id, {
                  value: dates ? [dates[0]?.format('YYYY-MM-DD'), dates[1]?.format('YYYY-MM-DD')] : undefined,
                })
              }
              style={{ width: '100%' }}
            />
          );
        }
        return (
          <DatePicker
            size="small"
            value={filter.value ? dayjs(filter.value) : undefined}
            onChange={(date) =>
              handleUpdateFilter(filter.id, {
                value: date ? date.format('YYYY-MM-DD') : undefined,
              })
            }
            style={{ width: '100%' }}
          />
        );

      case 'boolean':
        return (
          <Select
            size="small"
            placeholder="选择值"
            value={filter.value}
            onChange={(value) => handleUpdateFilter(filter.id, { value })}
            style={{ width: '100%' }}
          >
            <Option value={true}>是</Option>
            <Option value={false}>否</Option>
          </Select>
        );

      default:
        return (
          <Input
            size="small"
            placeholder="输入值"
            value={filter.value}
            onChange={(e) => handleUpdateFilter(filter.id, { value: e.target.value })}
          />
        );
    }
  };

  return (
    <Card
      title="过滤条件"
      size="small"
      extra={
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={handleAddFilter}
        >
          添加条件
        </Button>
      }
    >
      {filters.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
          暂无过滤条件，点击上方按钮添加
        </div>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {filters.map((filter, index) => {
            const field = fields.find((f) => f.code === filter.field);
            const operators = field ? getOperatorsForFieldType(field.dataType) : [];

            return (
              <div key={filter.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {index > 0 && (
                  <Select
                    size="small"
                    value={filter.logicalOperator}
                    onChange={(value) =>
                      handleUpdateFilter(filter.id, { logicalOperator: value })
                    }
                    style={{ width: 60 }}
                  >
                    <Option value="AND">AND</Option>
                    <Option value="OR">OR</Option>
                  </Select>
                )}

                <Select
                  size="small"
                  placeholder="选择字段"
                  value={filter.field || undefined}
                  onChange={(value) => handleUpdateFilter(filter.id, { field: value, value: undefined, operator: 'eq' })}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  style={{ width: 'calc(33% - 40px)' }}
                >
                  {fields.map((f) => (
                    <Option key={f.code} value={f.code} label={f.name}>
                      {f.name}
                    </Option>
                  ))}
                </Select>

                <Select
                  size="small"
                  placeholder="操作符"
                  value={filter.operator}
                  onChange={(value) => handleUpdateFilter(filter.id, { operator: value, value: undefined })}
                  style={{ width: 'calc(33% - 40px)' }}
                  disabled={!filter.field}
                >
                  {operators.map((op) => (
                    <Option key={op.value} value={op.value}>
                      {op.label}
                    </Option>
                  ))}
                </Select>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {renderValueInput(filter)}
                </div>

                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => handleRemoveFilter(filter.id)}
                  danger
                />
              </div>
            );
          })}
        </Space>
      )}
    </Card>
  );
};

export default FilterConfigPanel;
