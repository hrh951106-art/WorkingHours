import { useState, useMemo, useEffect } from 'react';
import {
  Button,
  Space,
  Modal,
  Tree,
  Select,
  Input,
  Divider,
  Tag,
  Row,
  Col,
  Spin,
  Empty,
  Checkbox,
  DatePicker,
} from 'antd';

const { RangePicker } = DatePicker;
import { PlusOutlined, MinusCircleOutlined, LoadingOutlined, ApartmentOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';

interface FieldCondition {
  fieldCode: string;
  fieldName: string;
  fieldType: 'organization' | 'select' | 'text' | 'number' | 'date' | 'dateRange';
  operator: 'eq' | 'ne' | 'contains' | 'notContains' | 'gt' | 'lt' | 'in' | 'notIn' | 'between';
  value: string | number | Array<string | number> | any;  // 支持多种类型
}

interface FieldGroup {
  id: string;
  conditions: FieldCondition[];
}

interface EmployeeFieldFilterProps {
  value?: FieldGroup[];
  onChange?: (value: FieldGroup[]) => void;
  disabled?: boolean;
}

const operatorOptions = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'ne' },
  { label: '包含', value: 'contains' },
  { label: '不包含', value: 'notContains' },
  { label: '大于', value: 'gt' },
  { label: '小于', value: 'lt' },
  { label: '属于', value: 'in' },
  { label: '不属于', value: 'notIn' },
  { label: '日期区间', value: 'between' },
];

// 内置字段定义
const builtInFields = [
  {
    code: 'organization',
    name: '产线',
    type: 'organization' as const,
    icon: <ApartmentOutlined />,
  },
  {
    code: 'employeeType',
    name: '员工类型',
    type: 'select' as const,
    configCode: 'employeeType', // 对应人事信息配置中的字段
  },
  {
    code: 'position',
    name: '岗位',
    type: 'select' as const,
    configCode: 'position', // 对应人事信息配置中的字段
  },
];

const EmployeeFieldFilter: React.FC<EmployeeFieldFilterProps> = ({
  value = [],
  onChange,
  disabled = false,
}) => {
  // 简化为只处理单个条件组的情况
  const [conditions, setConditions] = useState<FieldCondition[]>(
    value.length > 0 && value[0]?.conditions ? value[0].conditions : []
  );

  // 监听外部value的变化，更新内部状态
  useEffect(() => {
    const newConditions = value.length > 0 && value[0]?.conditions ? value[0].conditions : [];

    // 只在值确实不同时才更新，避免无限循环
    if (JSON.stringify(newConditions) !== JSON.stringify(conditions)) {
      setConditions(newConditions);
    }
  }, [value]);

  // 获取产线树
  const { data: orgTree, isLoading: orgLoading } = useQuery({
    queryKey: ['hrOrganizationTree'],
    queryFn: () =>
      request.get('/hr/organizations/tree').then((res: any) => res),
  });

  // 获取所有人事信息模版字段（包括页签字段和自定义字段）
  const { data: employeeInfoFields = [], isLoading: fieldsLoading } = useQuery({
    queryKey: ['employeeInfoAllFields'],
    queryFn: () =>
      request.get('/hr/employee-info-all-fields').then((res: any) => {
        console.log('=== API 返回的人事信息字段数据 ===');
        console.log('字段总数:', res?.length || 0);
        console.log('原始数据:', JSON.stringify(res, null, 2));
        return res || [];
      }),
    staleTime: 0, // 禁用缓存，确保每次都获取最新数据
  });

  // 移除旧的数据源查询，现在从字段数据中直接获取
  // const { data: dataSources } = useQuery({
  //   queryKey: ['dataSources'],
  //   queryFn: () =>
  //     request.get('/hr/data-sources').then((res: any) => res || []),
  // });

  // 获取数据源列表（用于 LOOKUP 类型字段）
  const { data: dataSources } = useQuery({
    queryKey: ['dataSources'],
    queryFn: () =>
      request.get('/hr/data-sources').then((res: any) => res || []),
  });

  // 产线选择Modal状态
  const [orgModalVisible, setOrgModalVisible] = useState(false);
  const [currentConditionIndex, setCurrentConditionIndex] = useState<number | null>(null);
  const [selectedOrgKeys, setSelectedOrgKeys] = useState<React.Key[]>([]);
  const [includeChildOrgs, setIncludeChildOrgs] = useState(true);

  // 合并内置字段和人事信息模版字段（去重）
  const allFields = useMemo(() => {
    console.log('=== 开始构建 allFields ===');
    console.log('employeeInfoFields 长度:', employeeInfoFields?.length || 0);

    const fieldMap = new Map<string, any>(); // 使用 Map 去重，key 为 field.code

    // 先添加内置字段（除了产线，产线会从API返回）
    builtInFields.forEach((field) => {
      if (field.code !== 'organization') {
        console.log(`添加内置字段: ${field.code}`);
        fieldMap.set(field.code, { ...field, isBuiltIn: true });
      }
    });

    if (employeeInfoFields && employeeInfoFields.length > 0) {
      employeeInfoFields.forEach((field: any, index: number) => {
        // 判断字段类型 - 优先检查organization类型
        let fieldType: 'organization' | 'select' | 'text' | 'number' | 'date' | 'dateRange' = 'text';

        // 优先检查是否为组织类型
        if (field.fieldType === 'organization' ||
            field.fieldType === 'ORG' ||
            (field.dataSource?.code && field.dataSource.code.toLowerCase().includes('organization'))) {
          fieldType = 'organization';
        } else if (field.hasDataSource) {
          // 如果有数据源，作为下拉类型
          fieldType = 'select';
        } else {
          // 没有数据源时根据原类型判断
          if (field.fieldType === 'SELECT_SINGLE' || field.fieldType === 'SELECT_MULTI' ||
              field.fieldType === 'select' || field.fieldType === 'select_multi' ||
              field.fieldType === 'LOOKUP' || field.fieldType === 'lookup') {
            fieldType = 'select';
          } else if (field.fieldType === 'NUMBER' || field.fieldType === 'number') {
            fieldType = 'number';
          } else if (field.fieldType === 'DATE' || field.fieldType === 'date') {
            fieldType = 'date';
          }
        }

        const fieldInfo = {
          code: field.field,
          name: field.name,
          type: fieldType,
          fieldData: field, // 保存完整的字段数据
          isBuiltIn: false,
        };

        console.log(`[${index}] 添加字段 [${field.field}]:`, {
          name: field.name,
          tabCode: field.tabCode,
          fieldType: field.fieldType,
          hasDataSource: field.hasDataSource,
          dataSourceCode: field.dataSource?.code,
          optionsCount: field.dataSource?.options?.length || 0,
          mappedType: fieldType,
        });

        // API字段优先，直接覆盖内置字段
        fieldMap.set(field.field, fieldInfo);
      });
    }

    const fields = Array.from(fieldMap.values());

    console.log('=== allFields 构建完成 ===');
    console.log('字段总数:', fields.length);
    console.log('字段代码列表:', fields.map((f: any) => f.code));
    console.log('有数据源的字段:', fields.filter((f: any) => f.fieldData?.hasDataSource).map((f: any) => f.code));
    console.log('内置字段:', fields.filter((f: any) => f.isBuiltIn).map((f: any) => f.code));

    return fields;
  }, [employeeInfoFields]);

  // 获取字段的选项数据
  const getFieldOptions = (fieldCode: string) => {
    console.log('=== getFieldOptions 被调用 ===');
    console.log('查找字段代码:', fieldCode);
    console.log('allFields 长度:', allFields.length);
    console.log('allFields 中的字段代码:', allFields.map(f => f.code));

    const field = allFields.find((f) => f.code === fieldCode);
    if (!field) {
      console.error('❌ 字段未找到:', fieldCode);
      return [];
    }

    console.log('✅ 找到字段:', fieldCode);
    console.log('字段类型:', field.type);
    console.log('字段完整对象:', JSON.stringify(field, null, 2));

    // 产线字段特殊处理
    if (field.type === 'organization') {
      console.log('跳过产线字段');
      return [];
    }

    // 从字段数据中获取选项
    const fieldData = (field as any).fieldData;

    if (!fieldData) {
      console.error('❌ 字段没有 fieldData 属性');
      console.log('字段的所有属性:', Object.keys(field));
      return [];
    }

    console.log('✅ fieldData 存在');
    console.log('fieldData.hasDataSource:', fieldData.hasDataSource);
    console.log('fieldData.dataSource:', fieldData.dataSource);

    if (!fieldData.hasDataSource) {
      console.log('❌ 字段没有数据源标记');
      return [];
    }

    if (!fieldData.dataSource) {
      console.log('❌ 字段没有 dataSource 对象');
      return [];
    }

    console.log('✅ 字段有数据源');
    console.log('数据源代码:', fieldData.dataSource.code);
    console.log('数据源名称:', fieldData.dataSource.name);
    console.log('数据源选项数量:', fieldData.dataSource.options?.length || 0);
    console.log('数据源选项:', fieldData.dataSource.options);

    if (!fieldData.dataSource.options || fieldData.dataSource.options.length === 0) {
      console.log('❌ 数据源没有选项');
      return [];
    }

    const options = fieldData.dataSource.options.map((opt: any) => ({
      label: opt.label || opt.name,
      value: opt.value || opt.code,
    }));

    console.log('✅ 返回选项列表:', options);
    return options;
  };

  // 添加条件
  const addCondition = () => {
    const newCondition: FieldCondition = {
      fieldCode: '',
      fieldName: '',
      fieldType: 'text',
      operator: 'eq',
      value: '',
    };
    const newConditions = [...conditions, newCondition];
    setConditions(newConditions);
    onChange?.([{ id: 'default', conditions: newConditions }]);
  };

  // 更新条件
  const updateCondition = (
    conditionIndex: number,
    updates: Partial<FieldCondition>
  ) => {
    const newConditions = [...conditions];
    newConditions[conditionIndex] = { ...newConditions[conditionIndex], ...updates };
    setConditions(newConditions);
    const fieldGroup = [{ id: 'default', conditions: newConditions }];
    onChange?.(fieldGroup);
  };

  // 删除条件
  const removeCondition = (conditionIndex: number) => {
    const newConditions = conditions.filter((_, i) => i !== conditionIndex);
    setConditions(newConditions);
    onChange?.([{ id: 'default', conditions: newConditions }]);
  };

  // 打开组织选择器
  const openOrgSelector = (conditionIndex: number) => {
    const condition = conditions[conditionIndex];

    if (condition) {
      setSelectedOrgKeys((condition.value as string) || []);
      setIncludeChildOrgs(
        (condition as any).includeChildOrgs !== undefined
          ? (condition as any).includeChildOrgs
          : true
      );
      setCurrentConditionIndex(conditionIndex);
      setOrgModalVisible(true);
    }
  };

  // 确认产线选择
  const handleOrgConfirm = () => {
    if (currentConditionIndex !== null) {
      updateCondition(currentConditionIndex, {
        value: selectedOrgKeys as string[],
        includeChildOrgs,
      });
    }
    setOrgModalVisible(false);
    setCurrentConditionIndex(null);
  };

  // 渲染产线树节点
  const renderTreeNodes = (nodes: any[]): any[] => {
    if (!nodes) return [];
    return nodes.map((node) => ({
      title: node.name,
      key: node.id,
      children: node.children && node.children.length > 0 ? renderTreeNodes(node.children) : undefined,
    }));
  };

  // 递归查找产线名称
  const findOrgName = (nodes: any[], id: number): string | null => {
    if (!nodes) return null;
    for (const node of nodes) {
      if (node.id === id) {
        return node.name;
      }
      if (node.children && node.children.length > 0) {
        const result = findOrgName(node.children, id);
        if (result) return result;
      }
    }
    return null;
  };

  // 渲染值输入组件
  const renderValueInput = (
    condition: FieldCondition,
    conditionIndex: number
  ) => {
    const isMulti = condition.operator === 'in' || condition.operator === 'notIn';

    // 产线字段
    if (condition.fieldType === 'organization') {
      const orgIds = (condition.value as Array<string | number>) || [];

      // 获取产线名称显示
      const getOrgNames = () => {
        if (!orgIds || orgIds.length === 0) return '';
        const names = orgIds.map((orgId) => {
          const orgName = findOrgName(orgTree, Number(orgId));
          return orgName || `产线${orgId}`;
        });
        return names.join('、');
      };

      return (
        <div>
          <Input
            placeholder="点击选择产线"
            value={getOrgNames()}
            readOnly
            onClick={() => !disabled && openOrgSelector(conditionIndex)}
            disabled={disabled}
            suffix={<ApartmentOutlined style={{ color: '#999' }} />}
            style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
          />
        </div>
      );
    }

    // Select类型字段
    if (condition.fieldType === 'select') {
      const options = getFieldOptions(condition.fieldCode);

      console.log(`渲染 Select 组件 [${condition.fieldCode}]: 选项数量=${options.length}`);

      if (isMulti) {
        return (
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="选择值"
            value={condition.value as Array<string | number>}
            onChange={(val) => updateCondition(conditionIndex, { value: val })}
            disabled={disabled}
            showSearch
            optionFilterProp="label"
            options={options}
          />
        );
      }

      return (
        <Select
          style={{ width: '100%' }}
          placeholder="选择值"
          value={condition.value as string | number}
          onChange={(val) => updateCondition(conditionIndex, { value: val })}
          disabled={disabled}
          showSearch
          optionFilterProp="label"
          options={options}
        />
      );
    }

    // 日期类型字段
    if (condition.fieldType === 'date') {
      if (condition.operator === 'between') {
        // 日期区间选择器
        return (
          <RangePicker
            style={{ width: '100%' }}
            placeholder={['开始日期', '结束日期']}
            value={condition.value}
            onChange={(dates) => updateCondition(conditionIndex, { value: dates })}
            disabled={disabled}
          />
        );
      }
      // 单个日期选择器
      return (
        <DatePicker
          style={{ width: '100%' }}
          placeholder="选择日期"
          value={condition.value}
          onChange={(date) => updateCondition(conditionIndex, { value: date })}
          disabled={disabled}
        />
      );
    }

    // 文本或数字类型
    if (isMulti) {
      return (
        <Select
          mode="tags"
          style={{ width: '100%' }}
          placeholder="输入值后按回车添加"
          value={condition.value as Array<string | number>}
          onChange={(val) => updateCondition(conditionIndex, { value: val })}
          disabled={disabled}
          tokenSeparators={[',', ' ']}
        />
      );
    }

    return (
      <Input
        placeholder="请输入值"
        value={condition.value as string | number}
        onChange={(e) => updateCondition(conditionIndex, { value: e.target.value })}
        disabled={disabled}
      />
    );
  };

  // 根据字段类型获取可用的操作符
  const getOperatorsForFieldType = (fieldType: string) => {
    if (fieldType === 'organization' || fieldType === 'select') {
      return operatorOptions.filter((op) =>
        ['eq', 'ne', 'in', 'notIn'].includes(op.value)
      );
    }
    if (fieldType === 'number') {
      return operatorOptions;
    }
    if (fieldType === 'date') {
      return operatorOptions.filter((op) =>
        ['eq', 'ne', 'gt', 'lt', 'between'].includes(op.value)
      );
    }
    return operatorOptions.filter((op) =>
      ['eq', 'ne', 'contains', 'notContains'].includes(op.value)
    );
  };

  return (
    <div>
      {/* 条件列表 */}
      <div>
        {conditions.map((condition, conditionIndex) => (
          <Row key={conditionIndex} gutter={8} align="top" style={{ marginBottom: 12 }}>
            <Col span={1}>
              {conditionIndex > 0 && (
                <Tag color="blue" style={{ marginTop: 4 }}>
                  AND
                </Tag>
              )}
            </Col>
            <Col span={6}>
              <Select
                placeholder="选择字段"
                value={condition.fieldCode}
                onChange={(val) => {
                  const field = allFields.find((f) => f.code === val);
                  console.log(`选择字段: ${val}, 类型: ${field?.type}`);

                  updateCondition(conditionIndex, {
                    fieldCode: val,
                    fieldName: field?.name || val,
                    fieldType: field?.type || 'text',
                    value: '',
                    operator: 'eq',
                  });
                }}
                disabled={disabled}
                showSearch
                optionFilterProp="label"
              >
                {allFields.map((field) => (
                  <Select.Option key={field.code} value={field.code} label={field.name}>
                    <Space>
                      {field.icon}
                      {field.name}
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col span={5}>
              <Select
                placeholder="操作符"
                value={condition.operator}
                onChange={(val) => updateCondition(conditionIndex, { operator: val })}
                disabled={disabled}
                options={getOperatorsForFieldType(condition.fieldType)}
              />
            </Col>
            <Col span={10}>
              {renderValueInput(condition, conditionIndex)}
            </Col>
            <Col span={2}>
              {conditions.length > 1 && (
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<MinusCircleOutlined />}
                  onClick={() => removeCondition(conditionIndex)}
                  disabled={disabled}
                >
                  删除
                </Button>
              )}
            </Col>
          </Row>
        ))}

        {conditions.length === 0 && (
          <div style={{ textAlign: 'center', padding: 16, color: '#999' }}>
            暂无条件，请添加条件
          </div>
        )}
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* 添加条件按钮 */}
      <Button
        type="dashed"
        onClick={addCondition}
        icon={<PlusOutlined />}
        block
        size="small"
        disabled={disabled}
      >
        添加条件
      </Button>

      {/* 产线选择Modal */}
      <Modal
        title="选择产线"
        open={orgModalVisible}
        onOk={handleOrgConfirm}
        onCancel={() => {
          setOrgModalVisible(false);
          setCurrentConditionIndex(null);
        }}
        width={600}
      >
        <div style={{ marginBottom: 12 }}>
          <Checkbox
            checked={includeChildOrgs}
            onChange={(e) => setIncludeChildOrgs(e.target.checked)}
          >
            包含子产线
          </Checkbox>
          <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>
            {selectedOrgKeys.length > 0 ? `已选择 ${selectedOrgKeys.length} 个产线` : '请选择产线'}
          </span>
        </div>

        {orgLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
          </div>
        ) : !orgTree || orgTree.length === 0 ? (
          <Empty description="暂无产线数据" />
        ) : (
          <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 4, padding: 8 }}>
            <Tree
              checkable
              checkedKeys={selectedOrgKeys}
              onCheck={(keys) => setSelectedOrgKeys(keys as React.Key[])}
              treeData={renderTreeNodes(orgTree)}
              defaultExpandAll
            />
          </div>
        )}

        {selectedOrgKeys.length > 0 && (
          <div style={{ marginTop: 12, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>已选择的产线：</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {selectedOrgKeys.map((key) => {
                const orgName = findOrgName(orgTree, key as number);
                return (
                  <Tag key={key} color="blue">
                    {orgName || `产线${key}`}
                  </Tag>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EmployeeFieldFilter;
